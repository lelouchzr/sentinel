"""DuckDB storage: parameterized typed searches, exact aggregates, bounded pages."""

from __future__ import annotations

import hashlib
import json
from contextlib import contextmanager

import duckdb

from .models import Event, EventPage, QueryReceipt, SearchFilters
from .security import SentinelError, atomic_json
from .workspace import Workspace


class Store:
    def __init__(self, workspace: Workspace, dataset_id: str | None = None):
        self.workspace = workspace
        self.dataset_id = dataset_id

    @property
    def dataset(self) -> str:
        return self.dataset_id or self.workspace.dataset_id

    @contextmanager
    def connection(self):
        # Close each connection before releasing the process lock. No live DB handle
        # crosses an MCP subprocess boundary.
        with self.workspace.lock("database"):
            connection = duckdb.connect(
                str(self.workspace.path("events.duckdb")), config={"threads": 2}
            )
            try:
                connection.execute("""CREATE TABLE IF NOT EXISTS events (
                    dataset_id VARCHAR, event_id VARCHAR, timestamp VARCHAR,
                    source_type VARCHAR, host VARCHAR, account VARCHAR, source_ip VARCHAR,
                    action VARCHAR, outcome VARCHAR, resource VARCHAR, session_id VARCHAR,
                    bytes BIGINT, payload VARCHAR, PRIMARY KEY(dataset_id, event_id))""")
                yield connection
            finally:
                connection.close()

    def insert(self, dataset_id: str, events: list[Event]) -> int:
        with self.connection() as connection:
            before = connection.execute(
                "SELECT count(*) FROM events WHERE dataset_id=?", [dataset_id]
            ).fetchone()[0]
            rows = [
                (
                    dataset_id,
                    e.event_id,
                    e.timestamp,
                    e.source_type,
                    e.host,
                    e.account,
                    e.source_ip,
                    e.action,
                    e.outcome,
                    e.resource,
                    e.session_id,
                    e.bytes,
                    e.model_dump_json(),
                )
                for e in events
            ]
            connection.execute("BEGIN TRANSACTION")
            try:
                if rows:
                    connection.executemany(
                        "INSERT OR IGNORE INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows
                    )
                connection.execute("COMMIT")
            except Exception:
                connection.execute("ROLLBACK")
                raise
            after = connection.execute(
                "SELECT count(*) FROM events WHERE dataset_id=?", [dataset_id]
            ).fetchone()[0]
            return after - before

    def search(
        self, filters: SearchFilters | None = None, limit: int = 50, offset: int = 0
    ) -> EventPage:
        if not 1 <= limit <= 100 or not 0 <= offset <= 1_000_000:
            raise SentinelError("Search limit must be 1–100 and offset 0–1000000")
        filters = filters or SearchFilters()
        clauses, params = ["dataset_id = ?"], [self.dataset]
        for field, value in filters.model_dump(exclude_none=True).items():
            column, operator = {
                "start": ("timestamp", ">="),
                "end": ("timestamp", "<="),
                "min_bytes": ("bytes", ">="),
            }.get(field, (field, "="))
            clauses.append(f"{column} {operator} ?")
            params.append(value)
        where = " AND ".join(clauses)
        with self.connection() as connection:
            count, size, first, last = connection.execute(
                f"SELECT count(*), coalesce(sum(bytes),0), min(timestamp), max(timestamp) FROM events WHERE {where}",
                params,
            ).fetchone()
            action_rows = connection.execute(
                f"SELECT action || '/' || outcome, count(*) FROM events WHERE {where} GROUP BY action,outcome ORDER BY action,outcome LIMIT 101",
                params,
            ).fetchall()
            action_counts = dict(action_rows[:100])
            rows = connection.execute(
                f"SELECT payload FROM events WHERE {where} ORDER BY timestamp,event_id LIMIT ? OFFSET ?",
                [*params, limit, offset],
            ).fetchall()
        events = [Event.model_validate_json(row[0]) for row in rows]
        identity = json.dumps([self.dataset, filters.model_dump(), limit, offset], sort_keys=True)
        receipt = QueryReceipt(
            receipt_id="Q-" + hashlib.sha256(identity.encode()).hexdigest()[:20],
            dataset_id=self.dataset,
            filters=filters,
            total_count=count,
            total_bytes=size,
            action_outcome_counts=action_counts,
            action_counts_truncated=len(action_rows) > 100,
            first_timestamp=first,
            last_timestamp=last,
            returned_event_ids=[e.event_id for e in events],
        )
        atomic_json(
            self.workspace.path(f"receipts/{receipt.receipt_id}.json"), receipt.model_dump()
        )
        return EventPage(
            events=events,
            returned=len(events),
            total=count,
            offset=offset,
            limit=limit,
            truncated=offset + len(events) < count,
            receipt=receipt,
        )

    def get(self, event_id: str) -> Event:
        with self.connection() as connection:
            row = connection.execute(
                "SELECT payload FROM events WHERE dataset_id=? AND event_id=?",
                [self.dataset, event_id],
            ).fetchone()
        if not row:
            raise SentinelError("Event not found in the bound dataset")
        return Event.model_validate_json(row[0])

    def get_many(self, event_ids: list[str]) -> list[Event]:
        if len(event_ids) > 10000:
            raise SentinelError("Too many evidence references in a single operation")
        if not event_ids:
            return []
        with self.connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM events WHERE dataset_id=? AND event_id IN (SELECT unnest(?)) ORDER BY timestamp,event_id",
                [self.dataset, list(set(event_ids))],
            ).fetchall()
        events = [Event.model_validate_json(row[0]) for row in rows]
        if {e.event_id for e in events} != set(event_ids):
            raise SentinelError("An evidence reference was not found in the bound dataset")
        return events

    def all_events(self) -> list[Event]:
        with self.connection() as connection:
            rows = connection.execute(
                "SELECT payload FROM events WHERE dataset_id=? ORDER BY timestamp,event_id",
                [self.dataset],
            ).fetchall()
        return [Event.model_validate_json(row[0]) for row in rows]

    def summary(self) -> dict:
        with self.connection() as connection:
            count, first, last = connection.execute(
                "SELECT count(*), min(timestamp), max(timestamp) FROM events WHERE dataset_id=?",
                [self.dataset],
            ).fetchone()
            sources = dict(
                connection.execute(
                    "SELECT source_type,count(*) FROM events WHERE dataset_id=? GROUP BY source_type ORDER BY source_type LIMIT 21",
                    [self.dataset],
                ).fetchall()
            )
            accounts = dict(
                connection.execute(
                    "SELECT account,count(*) FROM events WHERE dataset_id=? GROUP BY account ORDER BY count(*) DESC,account LIMIT 21",
                    [self.dataset],
                ).fetchall()
            )
        return {
            "dataset_id": self.dataset,
            "event_count": count,
            "first_timestamp": first,
            "last_timestamp": last,
            "sources": dict(list(sources.items())[:20]),
            "sources_truncated": len(sources) > 20,
            "top_accounts": dict(list(accounts.items())[:20]),
            "accounts_truncated": len(accounts) > 20,
            "provenance": "Every event includes a relative file, position, SHA-256, and original record.",
        }
