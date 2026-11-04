"""Read-only CSV/JSONL ingestion with immutable dataset identities and rejection accounting."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from .models import Event, SourceRef, now, utc_timestamp
from .security import SentinelError, atomic_json, no_symlinks
from .storage import Store
from .workspace import Workspace

MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_RECORDS = 200_000


def source_files(root: Path) -> list[Path]:
    """Validate directory entries before recursion, including Windows junctions."""
    candidates = []

    def unreadable(error: OSError) -> None:
        raise error

    for current, directories, filenames in os.walk(root, followlinks=False, onerror=unreadable):
        for name in [*directories, *filenames]:
            try:
                no_symlinks(Path(current) / name)
            except SentinelError as exc:
                raise SentinelError("Source symlinks and reparse points are not allowed") from exc
        candidates.extend(Path(current) / name for name in filenames)
    return sorted(candidates)


def ingest(workspace: Workspace, directory: Path, timezone: str = "UTC") -> dict:
    try:
        ZoneInfo(timezone)
    except (KeyError, ValueError) as exc:
        raise SentinelError(
            "Unknown timezone; use an IANA name such as UTC or Europe/Paris"
        ) from exc
    root = no_symlinks(directory)
    if not root.is_dir():
        raise SentinelError("Input must be a directory containing CSV or JSONL files")
    if root == workspace.root or root.is_relative_to(workspace.root):
        raise SentinelError("Keep source datasets outside generated workspace state")
    files, issues, events = [], [], []
    rejected = skipped = 0
    candidates = source_files(root)
    for path in candidates:
        if path.is_symlink():
            raise SentinelError("Source symlinks are not allowed, including directory symlinks")
        if not path.is_file():
            continue
        no_symlinks(path)
        name = path.relative_to(root).as_posix()
        if path.suffix.lower() not in (".csv", ".jsonl"):
            skipped += 1
            issues.append(
                {"filename": name, "reason": "Unsupported format; expected .csv or .jsonl"}
            )
            continue
        if path.stat().st_size > MAX_FILE_BYTES:
            raise SentinelError("Source file exceeds the 25 MiB per-file limit")
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        entry = {
            "filename": name,
            "sha256": digest,
            "size_bytes": len(raw),
            "accepted": 0,
            "rejected": 0,
        }
        files.append(entry)
        try:
            content = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            entry["rejected"] += 1
            rejected += 1
            issues.append({"filename": name, "reason": "Source is not UTF-8"})
            continue
        if not content.strip():
            skipped += 1
            issues.append({"filename": name, "reason": "Empty file"})
            continue
        records = []
        if path.suffix.lower() == ".jsonl":
            for number, line in enumerate(content.splitlines(), 1):
                if not line.strip():
                    skipped += 1
                    issues.append({"filename": name, "line": number, "reason": "Blank JSONL line"})
                    continue
                try:
                    record = json.loads(line)
                    if not isinstance(record, dict):
                        raise ValueError
                    records.append((number, number, record))
                except (ValueError, TypeError, RecursionError):
                    rejected += 1
                    entry["rejected"] += 1
                    issues.append(
                        {"filename": name, "line": number, "reason": "Invalid JSON object"}
                    )
        else:
            reader = csv.DictReader(io.StringIO(content, newline=""), strict=True)
            try:
                if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames):
                    raise csv.Error("Missing or duplicate CSV header")
                line = reader.line_num + 1
                for number, record in enumerate(reader, 1):
                    records.append((number, line, record))
                    line = reader.line_num + 1
            except csv.Error:
                rejected += 1
                entry["rejected"] += 1
                issues.append(
                    {
                        "filename": name,
                        "line": reader.line_num,
                        "reason": "Invalid CSV structure; remaining records not imported",
                    }
                )
        for number, line, record in records:
            reason = "Invalid record"
            try:
                reason = "Record exceeds the 16000-character limit"
                if len(json.dumps(record, ensure_ascii=True)) > 16000:
                    raise ValueError("Record exceeds the 16000-character limit")
                reason = "Missing or extra CSV cells"
                if None in record or any(value is None for value in record.values()):
                    raise ValueError("Missing or extra CSV cells")
                reason = "Invalid timestamp or ambiguous local time; supply an explicit UTC offset"
                stamp = utc_timestamp(record.get("timestamp", ""), timezone)
                event_id = (
                    "E-" + hashlib.sha256(f"{name}\0{digest}\0{number}".encode()).hexdigest()[:24]
                )
                canonical = {
                    key: record[key]
                    for key in (
                        "source_type",
                        "host",
                        "account",
                        "source_ip",
                        "action",
                        "outcome",
                        "resource",
                        "session_id",
                    )
                    if key in record
                }
                reason = (
                    "Invalid required field, field type, field length, or nonnegative byte count"
                )
                event = Event(
                    event_id=event_id,
                    timestamp=stamp,
                    **canonical,
                    bytes=record.get("bytes") if record.get("bytes") not in (None, "") else None,
                    source=SourceRef(
                        filename=name, record=number, line=line, sha256=digest, original=record
                    ),
                )
                events.append(event)
                entry["accepted"] += 1
                if len(events) > MAX_RECORDS:
                    raise SentinelError("Dataset exceeds the 200000 accepted-record limit")
            except (ValueError, TypeError, ValidationError, OverflowError):
                rejected += 1
                entry["rejected"] += 1
                issues.append(
                    {
                        "filename": name,
                        "record": number,
                        "line": line,
                        "reason": reason,
                    }
                )
    if not files:
        raise SentinelError("No supported CSV/JSONL files found")
    identity = json.dumps(
        {"files": [(f["filename"], f["sha256"]) for f in files], "timezone": timezone, "schema": 1},
        sort_keys=True,
    )
    dataset_id = "D-" + hashlib.sha256(identity.encode()).hexdigest()[:24]
    inserted = Store(workspace).insert(dataset_id, events)
    manifest = {
        "dataset_id": dataset_id,
        "schema": 1,
        "timezone_for_naive_timestamps": timezone,
        "files": files,
        "accepted": len(events),
        "rejected": rejected,
        "skipped": skipped,
        "issues": issues,
    }
    atomic_json(workspace.path(f"manifests/{dataset_id}.json"), manifest)
    summary = {
        **manifest,
        "imported_at": now(),
        "inserted": inserted,
        "already_present": len(events) - inserted,
    }
    atomic_json(workspace.path("last-ingestion.json"), summary)
    workspace.activate(dataset_id)
    return summary
