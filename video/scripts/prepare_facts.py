"""Export film facts and receipts from the actual captured Sentinel workspace."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from sentinel.cases import Cases
from sentinel.detection import load_alerts
from sentinel.export import export_case
from sentinel.models import SearchFilters
from sentinel.storage import Store
from sentinel.workspace import Workspace

PROJECT = Path(__file__).resolve().parents[1]


def prepare(workspace_path, case_id):
    workspace = Workspace(workspace_path, create=False)
    case = Cases(workspace).get(case_id)
    store = Store(workspace, case.dataset_id)
    session = store.search(SearchFilters(session_id="session-702"), 100, 0)
    account = session.events[0].account
    address = session.events[0].source_ip
    activity = store.search(SearchFilters(account=account, source_ip=address), 100, 0)
    backup = store.search(SearchFilters(account="svc-backup"), 100, 0)
    starts = [a for a in case.activity if a.action == "Investigation started"]
    completed = next(
        a for a in case.activity if a.role == "Reporter" and a.action == "Case summary saved"
    )
    elapsed = (
        completed.details.get("elapsed_seconds")
        or (
            datetime.fromisoformat(completed.timestamp)
            - datetime.fromisoformat(starts[-1].timestamp)
        ).total_seconds()
    )
    facts = {
        "dataset": store.summary(),
        "alerts": len(load_alerts(store)),
        "rules": sorted({alert.rule_id for alert in load_alerts(store)}),
        "case_id": case.case_id,
        "case_status": case.status,
        "case_provider": case.provider,
        "findings": [f.model_dump() for f in case.findings],
        "evidence_count": len(case.evidence_ids),
        "model_calls": sum(a.action == "Model request started" for a in case.activity),
        "mcp_calls": sum(
            a.role == "MCP" and a.action.startswith("Calling ") for a in case.activity
        ),
        "mcp_tools": list(
            dict.fromkeys(
                a.action.removeprefix("Calling ")
                for a in case.activity
                if a.role == "MCP" and a.action.startswith("Calling ")
            )
        ),
        "live_elapsed_seconds": round(elapsed, 3),
        "session": session.model_dump(),
        "account_activity": activity.model_dump(),
        "backup": backup.model_dump(),
    }
    assert case.status == "reviewed" and case.provider == "Meta Model API"
    assert facts["mcp_calls"] > 0 and "get_event" in facts["mcp_tools"]
    assert session.total == 3 and activity.receipt.action_outcome_counts["login/failure"] == 24
    assert all(event.source.sha256 for event in session.events)
    output = PROJECT / "data"
    output.mkdir(exist_ok=True)
    (output / "evidence.json").write_text(json.dumps(facts, indent=2) + "\n")
    report = export_case(Cases(workspace), case.case_id, "json")
    (output / "case-report.json").write_bytes(report.read_bytes())
    print(
        json.dumps(
            {
                "case_id": case.case_id,
                "mcp_calls": facts["mcp_calls"],
                "model_calls": facts["model_calls"],
                "live_seconds": facts["live_elapsed_seconds"],
            }
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--case", required=True)
    args = parser.parse_args()
    prepare(args.workspace, args.case)
