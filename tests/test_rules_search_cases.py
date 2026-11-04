import json
from datetime import UTC, datetime, timedelta

import pytest
from conftest import record, write_jsonl

from sentinel.cases import Cases, verify_findings
from sentinel.detection import RuleConfig, detect, load_alerts
from sentinel.export import export_case
from sentinel.generator import SEED, generate
from sentinel.ingest import ingest
from sentinel.models import Finding, SearchFilters
from sentinel.security import SentinelError
from sentinel.storage import Store


def test_threshold_and_correlation_windows(workspace, tmp_path):
    base = datetime(2026, 1, 1, tzinfo=UTC)
    rows = [record(timestamp=(base + timedelta(seconds=i * 10)).isoformat()) for i in range(3)]
    rows.extend(
        [
            record(timestamp=(base + timedelta(seconds=30)).isoformat(), outcome="success"),
            record(timestamp=(base + timedelta(seconds=400)).isoformat(), outcome="success"),
            record(action="export", outcome="success", bytes=100),
        ]
    )
    source = tmp_path / "source"
    write_jsonl(source, rows)
    ingest(workspace, source)
    alerts = detect(
        Store(workspace),
        RuleConfig(failure_threshold=3, window_seconds=60, transfer_threshold_bytes=100),
    )
    assert sorted(a.rule_id for a in alerts) == ["AUTH-001", "AUTH-002", "DATA-001"]
    auth = next(a for a in alerts if a.rule_id == "AUTH-002")
    assert len(auth.event_ids) == 4 and auth.rule_version == "1.0"
    assert not detect(
        Store(workspace), RuleConfig(failure_threshold=4, transfer_threshold_bytes=101)
    )


@pytest.mark.parametrize(
    "seed,account,ip", [(SEED, "morgan", "203.0.113.74"), (17, "taylor", "203.0.113.91")]
)
def test_demo_ground_truth_variation(workspace, tmp_path, seed, account, ip):
    # Expectations are outside the agent-visible source directory.
    source = tmp_path / "source"
    assert generate(source, seed)["events"] == 3542
    ingest(workspace, source)
    store = Store(workspace)
    alerts = detect(store)
    assert len(alerts) == 15
    assert any(a.rule_id == "AUTH-002" and a.entities["account"] == account for a in alerts)
    page = store.search(
        SearchFilters(account=account, source_ip=ip, action="login", outcome="failure")
    )
    assert page.total == 24
    assert (
        store.search(SearchFilters(account="svc-indexer", action="export")).receipt.total_bytes
        == 1_308_000_000
    )
    benign = store.search(SearchFilters(session_id="batch-920"))
    assert any("Approved" in e.source.original.get("context", "") for e in benign.events)
    assert benign.receipt.total_bytes == 840_000_000


def test_search_typed_bounded_exact_quantities(demo):
    store = Store(demo)
    page = store.search(
        SearchFilters(account="morgan", source_ip="203.0.113.74"), limit=3, offset=1
    )
    assert page.returned == 3 and page.total == 27 and page.truncated and page.offset == 1
    assert page.receipt.total_bytes == 840_000_000
    assert page.receipt.total_count == 27
    assert page.events == sorted(page.events, key=lambda e: (e.timestamp, e.event_id))
    assert store.search(SearchFilters(account="' OR 1=1 --")).total == 0
    assert (
        store.search(
            SearchFilters(
                host="identity-01",
                action="login",
                outcome="failure",
                start="2026-10-20T09:00:00Z",
                end="2026-10-20T09:03:10Z",
            )
        ).total
        >= 24
    )
    for limit, offset in [(101, 0), (0, 0), (10, -1)]:
        with pytest.raises(SentinelError):
            store.search(limit=limit, offset=offset)


def test_case_persistence_notes_references_and_export(demo):
    cases = Cases(demo)
    alert = next(a for a in load_alerts(Store(demo)) if a.rule_id == "AUTH-002")
    case = cases.create(alert.alert_id)
    cases.note(case.case_id, "Verify the identity provider MFA audit trail.")
    cases.attach(case.case_id, alert.event_ids)
    loaded = Cases(demo).get(case.case_id)
    assert loaded.dataset_id == demo.dataset_id and len(loaded.evidence_ids) == 25
    assert loaded.notes
    with pytest.raises(SentinelError):
        cases.attach(case.case_id, ["E-nonexistent"])
    rejected, warnings = verify_findings(
        Store(demo),
        [
            Finding(
                title="Unsupported",
                category="observed_fact",
                event_ids=["E-no"],
                explanation="Compromised",
            )
        ],
    )
    assert not rejected and warnings
    page = Store(demo).search(
        SearchFilters(
            account="morgan", source_ip="203.0.113.74", action="login", outcome="failure"
        ),
        limit=1,
    )
    verified, _ = verify_findings(
        Store(demo),
        [
            Finding(
                title="Account definitely compromised",
                category="observed_fact",
                event_ids=[page.events[0].event_id],
                receipt_ids=[page.receipt.receipt_id],
                explanation="999 logins",
            )
        ],
    )
    assert "24 matching events" in verified[0].explanation
    assert "999" not in verified[0].explanation and "compromised" not in verified[0].title
    cases.update(case.case_id, lambda c: setattr(c, "findings", verified))
    markdown = export_case(cases, case.case_id).read_text()
    exported = json.loads(export_case(cases, case.case_id, "json").read_text())
    assert "SHA-256:" in markdown and "identity.csv" in markdown
    assert exported["computed_queries"][0]["total_count"] == 24
    assert exported["evidence"][0]["source"]["original"]
    assert exported["manifest"]["dataset_id"] == case.dataset_id
    with pytest.raises(SentinelError):
        export_case(cases, case.case_id, "html")


def test_case_mutation_validation_preserves_previous_file(demo):
    cases = Cases(demo)
    case = cases.create(title="Validation boundary")
    before = demo.path(f"cases/{case.case_id}.json").read_bytes()
    with pytest.raises(ValueError):
        cases.update(case.case_id, lambda c: setattr(c, "status", "invalid-status"))
    assert demo.path(f"cases/{case.case_id}.json").read_bytes() == before


def test_old_dataset_case_and_receipt_isolation(workspace, tmp_path):
    source = tmp_path / "source"
    write_jsonl(source, [record(bytes=4)])
    ingest(workspace, source)
    old = Store(workspace).search()
    cases = Cases(workspace)
    case = cases.create(title="Old dataset")
    cases.attach(case.case_id, [old.events[0].event_id])
    write_jsonl(source, [record(account="quinn", bytes=8)])
    ingest(workspace, source)
    new = Store(workspace).search()
    findings, warnings = verify_findings(
        Store(workspace, case.dataset_id),
        [
            Finding(
                title="Cross-dataset receipt",
                category="observed_fact",
                event_ids=[old.events[0].event_id],
                receipt_ids=[new.receipt.receipt_id],
                explanation="Invalid query attribution",
            )
        ],
    )
    assert not findings and warnings
    assert Store(workspace, case.dataset_id).get(old.events[0].event_id).bytes == 4
    assert (
        json.loads(export_case(cases, case.case_id, "json").read_text())["evidence"][0]["bytes"]
        == 4
    )
