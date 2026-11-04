"""Workspace ownership, atomic metadata and native cross-platform process locks."""

from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path

from filelock import FileLock, Timeout

from .security import SentinelError, atomic_json, inside, no_symlinks

LOCK_TIMEOUT_SECONDS = 30


class Workspace:
    def __init__(self, path: Path | str, *, create: bool = True):
        self.root = no_symlinks(Path(path))
        marker = self.root / "workspace.json"
        if not marker.exists():
            if not create:
                raise SentinelError("Workspace does not exist; run sentinel demo or ingest first")
            if self.root.exists() and any(self.root.iterdir()):
                raise SentinelError(
                    "Refusing to initialize a nonempty directory without a Sentinel marker"
                )
            self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
            atomic_json(marker, {"product": "SENTINEL", "schema": 1, "active_dataset": None})
        self.meta()  # Validate ownership before creating any child state.
        ignored = self.path(".gitignore")
        if not ignored.exists():
            ignored.write_text("*\n", encoding="utf-8")
        for name in ("cases", "manifests", "receipts", "reports", "artifacts", "locks"):
            self.path(name).mkdir(exist_ok=True, mode=0o700)

    def path(self, relative: str) -> Path:
        return inside(self.root, relative)

    def meta(self) -> dict:
        try:
            data = json.loads(self.path("workspace.json").read_text())
            if data.get("product") != "SENTINEL" or data.get("schema") != 1:
                raise ValueError
            return data
        except (ValueError, OSError) as exc:
            raise SentinelError("Invalid Sentinel workspace marker") from exc

    @property
    def dataset_id(self) -> str:
        value = self.meta().get("active_dataset")
        if not value:
            raise SentinelError("No dataset imported; run sentinel demo or ingest")
        return value

    @contextmanager
    def lock(self, name: str, *, blocking: bool = True):
        path = self.path(f"locks/{name}.lock")
        # Each acquisition owns a separate instance: an independent run in the
        # same thread must conflict rather than reenter another run's lock.
        lock = FileLock(
            path,
            timeout=LOCK_TIMEOUT_SECONDS if blocking else 0,
            mode=0o600,
            fallback_to_soft=False,
            preserve_lock_file=True,
        )
        try:
            lock.acquire(blocking=blocking)
        except Timeout as exc:
            message = (
                "This case already has an active investigation"
                if not blocking
                else "Workspace is busy; another Sentinel operation holds its lock"
            )
            raise SentinelError(message) from exc
        try:
            yield
        finally:
            lock.release()

    def activate(self, dataset_id: str) -> None:
        with self.lock("metadata"):
            data = self.meta()
            if data.get("demo_dataset") and data["demo_dataset"] != dataset_id:
                data.pop("demo_seed", None)
                data.pop("demo_dataset", None)
            data["active_dataset"] = dataset_id
            atomic_json(self.path("workspace.json"), data)

    def manifest(self, dataset_id: str | None = None) -> dict:
        return json.loads(self.path(f"manifests/{dataset_id or self.dataset_id}.json").read_text())
