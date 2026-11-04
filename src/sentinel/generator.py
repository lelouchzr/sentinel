"""Reproducible fictional events. Scenario expectations live only in tests."""

from __future__ import annotations

import csv
import json
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .security import SentinelError, no_symlinks

SEED = 20261104
FIELDS = [
    "timestamp",
    "source_type",
    "host",
    "account",
    "source_ip",
    "action",
    "outcome",
    "resource",
    "session_id",
    "bytes",
    "context",
]


def generate(directory: Path, seed: int = SEED) -> dict:
    directory = no_symlinks(directory)
    if directory.exists() and any(directory.iterdir()):
        raise SentinelError(
            "Generator requires a new or empty directory; it never overwrites source files"
        )
    directory.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    base = datetime(2026, 10, 20, 8, tzinfo=UTC)
    names = (
        ["morgan", "riley", "jordan", "casey", "avery", "drew"]
        if seed == SEED
        else ["taylor", "quinn", "parker", "reese", "sage", "rowan"]
    )
    rows = []

    def add(
        seconds,
        source,
        account,
        ip,
        action,
        outcome="success",
        resource="/portal",
        session="",
        size="",
        context="",
        host="",
    ):
        rows.append(
            dict(
                zip(
                    FIELDS,
                    [
                        (base + timedelta(seconds=seconds)).isoformat(),
                        source,
                        host
                        or {
                            "auth": "identity-01",
                            "application": "portal-02",
                            "file": "storage-01",
                        }[source],
                        account,
                        ip,
                        action,
                        outcome,
                        resource,
                        session,
                        size,
                        context,
                    ],
                    strict=True,
                )
            )
        )

    for i in range(3500):
        account = names[rng.randrange(len(names))]
        ip = f"192.0.2.{10 + names.index(account)}"
        seconds = rng.randrange(0, 28800)
        kind = rng.choice(["application", "application", "auth", "file"])
        if kind == "auth":
            add(
                seconds,
                kind,
                account,
                ip,
                "login",
                "failure" if rng.random() < 0.035 else "success",
                "/sso",
                f"normal-{account}-{i // 20}",
            )
        elif kind == "file":
            add(
                seconds,
                kind,
                account,
                ip,
                "download",
                resource=f"/documents/guide-{i % 40}.pdf",
                session=f"normal-{account}-{i // 20}",
                size=rng.randrange(1000, 200000),
            )
        else:
            add(
                seconds,
                kind,
                account,
                ip,
                "view",
                resource=f"/projects/{i % 12}",
                session=f"normal-{account}-{i // 20}",
            )

    target, ip = names[0], "203.0.113.74" if seed == SEED else "203.0.113.91"
    for i in range(24):
        add(
            3600 + i * 8,
            "auth",
            target,
            ip,
            "login",
            "failure",
            "/sso",
            "request-701",
            context="Password authentication rejected",
        )
    add(
        3800,
        "auth",
        target,
        ip,
        "login",
        resource="/sso",
        session="session-702",
        context="Password authentication accepted; MFA not recorded",
    )
    add(
        3820,
        "application",
        target,
        ip,
        "access",
        resource="/restricted/customer-export",
        session="session-702",
        context="Permission check accepted by application",
    )
    add(
        3860,
        "file",
        target,
        ip,
        "download",
        resource="/restricted/customer-export/accounts.csv",
        session="session-702",
        size=840_000_000,
    )
    for i in range(8):
        add(
            10800 + i * 19,
            "file",
            "svc-indexer",
            "198.51.100.46",
            "export",
            resource=f"/restricted/archive/part-{i}.zip",
            session="job-811",
            size=160_000_000 + i * 1_000_000,
            context="Caller token indexer-v2; job authorization not present in these logs",
        )
    add(
        10770,
        "application",
        "svc-indexer",
        "198.51.100.46",
        "token_use",
        resource="/api/archive",
        session="job-811",
        context="Service token used outside the recorded maintenance window",
    )
    add(
        18000,
        "application",
        "svc-backup",
        "192.0.2.220",
        "job_start",
        resource="/jobs/backup",
        session="batch-920",
        context="Approved nightly backup; change CHG-2041; owner Operations; window 13:00–13:30 UTC",
    )
    for i in range(4):
        add(
            18030 + i * 45,
            "file",
            "svc-backup",
            "192.0.2.220",
            "export",
            resource=f"/backup/segment-{i}.tar",
            session="batch-920",
            size=210_000_000,
            context="Scheduled backup destination vault-internal",
        )
    add(
        18300,
        "application",
        "svc-backup",
        "192.0.2.220",
        "job_complete",
        resource="/jobs/backup",
        session="batch-920",
        context="Job completed under change CHG-2041",
    )
    rng.shuffle(rows)
    auth = [r for r in rows if r["source_type"] == "auth"]
    other = [r for r in rows if r["source_type"] != "auth"]
    with (directory / "identity.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(auth)
    (directory / "services.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=True) + "\n" for r in other),
        encoding="utf-8",
        newline="\n",
    )
    return {"seed": seed, "events": len(rows), "files": ["identity.csv", "services.jsonl"]}
