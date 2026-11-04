"""Three transparent deterministic signals; severity never implies compromise."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from datetime import datetime, timedelta

from pydantic import Field

from .models import Alert, Model
from .security import atomic_json
from .storage import Store


class RuleConfig(Model):
    failure_threshold: int = Field(default=8, ge=2, le=10000)
    window_seconds: int = Field(default=300, ge=1, le=86400)
    transfer_threshold_bytes: int = Field(default=100_000_000, ge=1)


def detect(store: Store, config: RuleConfig | None = None) -> list[Alert]:
    config = config or RuleConfig()
    alerts = []
    failures = defaultdict(list)
    last_emitted = {}

    def emit(rule, severity, events, text):
        identity = (
            rule
            + json.dumps(config.model_dump(), sort_keys=True)
            + "".join(e.event_id for e in events)
        )
        alerts.append(
            Alert(
                alert_id="A-" + hashlib.sha256(identity.encode()).hexdigest()[:16],
                rule_id=rule,
                severity=severity,
                event_ids=[e.event_id for e in events],
                start=events[0].timestamp,
                end=events[-1].timestamp,
                entities={
                    "account": events[-1].account,
                    "source_ip": events[-1].source_ip,
                    "host": events[-1].host,
                    "session_id": events[-1].session_id,
                },
                explanation=text,
            )
        )

    for event in store.all_events():
        key = (event.account, event.source_ip)
        if event.action == "login" and event.account and event.source_ip:
            stamp = datetime.fromisoformat(event.timestamp)
            failures[key] = [
                e
                for e in failures[key]
                if stamp - datetime.fromisoformat(e.timestamp)
                <= timedelta(seconds=config.window_seconds)
            ]
            if event.outcome == "failure":
                failures[key].append(event)
                if len(failures[key]) >= config.failure_threshold and (
                    key not in last_emitted
                    or (stamp - last_emitted[key]).total_seconds() > config.window_seconds
                ):
                    emit(
                        "AUTH-001",
                        "medium",
                        list(failures[key]),
                        f"At least {config.failure_threshold} failed logins for the same account and source IP within {config.window_seconds} seconds. Investigate the cause.",
                    )
                    last_emitted[key] = stamp
            elif event.outcome == "success" and len(failures[key]) >= config.failure_threshold:
                emit(
                    "AUTH-002",
                    "high",
                    [*failures[key], event],
                    f"A successful login followed {len(failures[key])} failed logins for the same account and source IP within {config.window_seconds} seconds. This sequence does not establish account compromise.",
                )
        if (
            event.action in ("download", "export")
            and event.outcome == "success"
            and (event.bytes or 0) >= config.transfer_threshold_bytes
        ):
            emit(
                "DATA-001",
                "high",
                [event],
                f"A recorded {event.action} transferred {event.bytes} bytes, meeting the {config.transfer_threshold_bytes}-byte threshold. Authorization and destination require investigation.",
            )
    alerts.sort(key=lambda a: (a.severity != "high", a.start, a.alert_id))
    atomic_json(
        store.workspace.path(f"artifacts/alerts-{store.dataset}.json"),
        {
            "dataset_id": store.dataset,
            "config": config.model_dump(),
            "alerts": [a.model_dump() for a in alerts],
        },
    )
    return alerts


def load_alerts(store: Store) -> list[Alert]:
    path = store.workspace.path(f"artifacts/alerts-{store.dataset}.json")
    if not path.exists():
        return detect(store)
    return [Alert.model_validate(a) for a in json.loads(path.read_text())["alerts"]]
