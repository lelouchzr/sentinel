"""The optional recorded example is genuine, explicit and locally revalidated."""

import json

import pytest
from typer.testing import CliRunner

from sentinel.cases import Cases
from sentinel.cli import app
from sentinel.export import export_case
from sentinel.models import Case
from sentinel.progress import run_progress
from sentinel.recorded import restore_recorded_case
from sentinel.security import SentinelError, atomic_json
from sentinel.storage import Store
from sentinel.workspace import Workspace


def test_recorded_case_validates_evidence_and_never_overwrites_notes(demo):
    case = restore_recorded_case(demo)
    assert case.provider.startswith("RECORDED META RUN") and case.title.startswith("RECORDED")
    progress = run_progress(case)
    assert progress.model_requests == 10 and progress.tool_attempts == 9
    assert progress.elapsed_seconds == 51.26 and len(case.evidence_ids) == 27
    cases = Cases(demo)
    cases.note(case.case_id, "Keep this analyst note when reopening the recorded example.")
    saved = cases.get(case.case_id)
    assert restore_recorded_case(demo).model_dump() == saved.model_dump()
    exported = json.loads(export_case(cases, case.case_id, "json").read_text())
    assert len(exported["evidence"]) == 27 and len(exported["case"]["findings"]) == 4
    assert "RECORDED" in export_case(cases, case.case_id).read_text()
    assert all(event["source"]["sha256"] for event in exported["evidence"])
    assert demo.path("artifacts/recorded-case-import.json").exists()


def test_recorded_import_preserves_a_conflicting_existing_case(demo):
    existing = Case(
        case_id="C-6648e4baf12a", dataset_id=demo.dataset_id, title="Preserve this existing case"
    )
    path = demo.path(f"cases/{existing.case_id}.json")
    atomic_json(path, existing.model_dump())
    before = path.read_bytes()
    with pytest.raises(SentinelError, match="already exists"):
        restore_recorded_case(demo)
    assert path.read_bytes() == before


@pytest.mark.parametrize("change", ["canonical_record", "quantitative_columns"])
def test_recorded_example_rejects_modified_evidence_or_counts(demo, change):
    from importlib.resources import files

    capture = json.loads(files("sentinel").joinpath("data", "recorded-case.json").read_text())
    event = next(event for event in capture["evidence"] if event["action"] == "download")
    store = Store(demo)
    with store.connection() as connection:
        if change == "canonical_record":
            changed = dict(event, resource="/changed-record")
            connection.execute(
                "UPDATE events SET payload=? WHERE dataset_id=? AND event_id=?",
                [json.dumps(changed), demo.dataset_id, event["event_id"]],
            )
        else:
            connection.execute(
                "UPDATE events SET bytes=bytes+1 WHERE dataset_id=? AND event_id=?",
                [demo.dataset_id, event["event_id"]],
            )
    with pytest.raises(SentinelError, match="does not match|do not match|quantitative"):
        restore_recorded_case(demo)
    assert not demo.path("cases/C-6648e4baf12a.json").exists()


def test_recorded_demo_cli_requires_no_model_and_is_idempotent(tmp_path, monkeypatch):
    from sentinel.agent import MetaProvider

    def no_provider(*args, **kwargs):
        pytest.fail("Loading a recorded case must not construct a model provider")

    monkeypatch.setattr(MetaProvider, "__init__", no_provider)
    state = tmp_path / "recorded-demo"
    runner = CliRunner()
    command = ["--workspace", str(state), "demo", "--recorded-case", "--json"]
    first = runner.invoke(app, command)
    assert first.exit_code == 0, first.output
    result = json.loads(first.output)
    assert result["case_provider"].startswith("RECORDED") and result["events"] == 3542
    second = runner.invoke(app, command)
    assert second.exit_code == 0, second.output
    assert json.loads(second.output)["inserted"] == 0
    assert len(Cases(Workspace(state, create=False)).list()) == 1
