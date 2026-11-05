"""Case guidance is computed from its actual attached records, never an answer key."""

import json

from typer.testing import CliRunner

from sentinel.brief import brief_text, case_brief
from sentinel.cases import Cases
from sentinel.cli import app
from sentinel.detection import load_alerts
from sentinel.models import SearchFilters
from sentinel.storage import Store


def test_brief_counts_are_scoped_to_attached_evidence(demo):
    cases = Cases(demo)
    store = Store(demo)
    signal = next(alert for alert in load_alerts(store) if alert.rule_id == "AUTH-002")
    case = cases.create(signal.alert_id)
    brief = case_brief(cases, case.case_id)
    assert brief.evidence_count == 25
    assert brief.action_outcome_counts == {"login/failure": 24, "login/success": 1}
    assert brief.recorded_bytes == 0 and brief.events_with_bytes == 0
    assert brief.entities["account"] == ["morgan"]
    assert brief.signals[0].explanation == signal.explanation
    assert brief.finding_counts == {"observed_fact": 0, "hypothesis": 0, "open_question": 0}
    related = store.search(SearchFilters(account="morgan", source_ip="203.0.113.74"), limit=100)
    cases.attach(case.case_id, [event.event_id for event in related.events])
    expanded = case_brief(cases, case.case_id)
    assert expanded.evidence_count == 27 and expanded.recorded_bytes == 840_000_000
    assert expanded.evidence_count != store.summary()["event_count"]
    assert "not the full dataset" in expanded.scope
    assert "not proof of compromise" in brief_text(expanded)
    assert "What is recorded" in expanded.suggested_question


def test_manual_empty_case_and_machine_readable_brief(demo):
    cases = Cases(demo)
    case = cases.create(title="Manual scope review")
    brief = case_brief(cases, case.case_id)
    assert not brief.signals and brief.evidence_count == 0
    assert brief.first_timestamp is None and brief.last_timestamp is None
    assert "Manual case" in brief_text(brief)
    result = CliRunner().invoke(
        app, ["--workspace", str(demo.root), "cases", "brief", case.case_id, "--json"]
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["evidence_count"] == 0
    assert "\x1b" not in result.output
