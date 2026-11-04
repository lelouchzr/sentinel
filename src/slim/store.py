"""Transactional local jobs and append-only progress events."""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from slim.errors import SlimError


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds")


class Store:
    def __init__(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / "slim.sqlite3"
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL, request TEXT NOT NULL, plan TEXT NOT NULL,
                    manifest TEXT, report TEXT, error TEXT, source_hash TEXT NOT NULL,
                    artifact_hash TEXT, provider TEXT NOT NULL DEFAULT 'static'
                );
                CREATE TABLE IF NOT EXISTS events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
                    time TEXT NOT NULL, stage TEXT NOT NULL, message TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(id)
                );
                CREATE INDEX IF NOT EXISTS events_job ON events(job_id, seq);
                CREATE TABLE IF NOT EXISTS advice (
                    id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, payload TEXT NOT NULL
                );
            """)
            columns = {row[1] for row in db.execute("PRAGMA table_info(jobs)")}
            if "owner_pid" not in columns:
                db.execute("ALTER TABLE jobs ADD COLUMN owner_pid INTEGER")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def save_advice(self, source_hash: str, payload: dict) -> dict:
        advice_id = uuid4().hex
        payload = {**payload, "id": advice_id}
        with self.connect() as db:
            db.execute(
                "INSERT INTO advice(id,source_hash,payload) VALUES(?,?,?)",
                (advice_id, source_hash, json.dumps(payload)),
            )
        return payload

    def get_advice(self, advice_id: str, expected_source_hash: str) -> dict:
        with self.connect() as db:
            row = db.execute(
                "SELECT source_hash,payload FROM advice WHERE id=?", (advice_id,)
            ).fetchone()
            if row is None or row["source_hash"] != expected_source_hash:
                raise SlimError("Model advice is missing or belongs to a different source revision")
            return json.loads(row["payload"])

    def create(self, request: dict, plan: dict, source_hash: str) -> dict:
        job_id, timestamp = uuid4().hex, now()
        with self.connect() as db:
            db.execute(
                "INSERT INTO jobs(id,status,created_at,updated_at,request,plan,source_hash) VALUES(?,?,?,?,?,?,?)",
                (
                    job_id,
                    "planned",
                    timestamp,
                    timestamp,
                    json.dumps(request),
                    json.dumps(plan),
                    source_hash,
                ),
            )
            db.execute(
                "INSERT INTO events(job_id,time,stage,message) VALUES(?,?,?,?)",
                (job_id, timestamp, "planned", "Dependency closure ready for review"),
            )
        return self.get(job_id)

    def get(self, job_id: str) -> dict:
        with self.connect() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            if row is None:
                raise SlimError("Extraction not found", "not_found")
            result = dict(row)
            for field in ("request", "plan", "manifest", "report"):
                if result[field] is not None:
                    result[field] = json.loads(result[field])
            result["events"] = [
                dict(event)
                for event in db.execute(
                    "SELECT seq,time,stage,message FROM events WHERE job_id=? ORDER BY seq",
                    (job_id,),
                )
            ]
            return result

    def list(self) -> list[dict]:
        with self.connect() as db:
            return [
                dict(row)
                for row in db.execute(
                    "SELECT id,status,created_at,updated_at,json_extract(plan,'$.entry.name') AS name,json_extract(plan,'$.package_name') AS package_name FROM jobs ORDER BY created_at DESC LIMIT 50"
                )
            ]

    def transition(
        self, job_id: str, allowed: set[str], status: str, message: str, **values
    ) -> None:
        valid = {"manifest", "report", "error", "artifact_hash", "provider", "owner_pid"}
        if not set(values) <= valid:
            raise ValueError("Unknown job fields")
        encoded = {
            key: json.dumps(value) if key in {"manifest", "report"} else value
            for key, value in values.items()
        }
        timestamp = now()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT status FROM jobs WHERE id=?", (job_id,)).fetchone()
            if row is None:
                raise SlimError("Extraction not found", "not_found")
            if row["status"] not in allowed:
                raise SlimError(
                    f"Cannot {status} an extraction in state {row['status']}", "state_conflict"
                )
            fields = {"status": status, "updated_at": timestamp, **encoded}
            db.execute(
                f"UPDATE jobs SET {','.join(f'{key}=?' for key in fields)} WHERE id=?",
                (*fields.values(), job_id),
            )
            db.execute(
                "INSERT INTO events(job_id,time,stage,message) VALUES(?,?,?,?)",
                (job_id, timestamp, status, message),
            )

    def recover(self) -> None:
        with self.connect() as db:
            rows = list(
                db.execute(
                    "SELECT id,owner_pid FROM jobs WHERE status IN ('extracting','validating')"
                )
            )
        for row in rows:
            if row["owner_pid"]:
                try:
                    os.kill(row["owner_pid"], 0)
                    continue
                except ProcessLookupError:
                    pass
                except PermissionError:
                    continue
            self.transition(
                row["id"],
                {"extracting", "validating"},
                "interrupted",
                "Previous process stopped before completing this operation",
                error="Interrupted by server restart",
                owner_pid=None,
            )
