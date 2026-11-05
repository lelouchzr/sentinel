"""Run telemetry counts real activity, isolates follow-ups and handles old cases."""

from datetime import UTC, datetime

from sentinel.models import Activity, Case
from sentinel.progress import progress_text, run_progress


def entry(role, action, seconds=0, **details):
    return Activity(
        role=role, action=action, timestamp=f"2026-11-05T00:00:{seconds:02d}+00:00", details=details
    )


def test_latest_run_counts_and_limits_do_not_mix_with_previous_runs():
    case = Case(
        case_id="C-12345678",
        dataset_id="D-example",
        title="Telemetry test",
        status="investigating",
        provider="OFFLINE TEST MODE",
        evidence_ids=["E-example", "E-example"],
        activity=[
            entry("Investigator", "Investigation started"),
            entry("Meta", "Model request started"),
            entry(
                "Investigator",
                "Investigation started",
                10,
                limits={"model_calls": 10, "tool_calls": 18, "deadline_seconds": 180},
            ),
            entry("Meta", "Model request started", 11),
            entry("Meta", "Model response received", 12),
            entry("MCP", "Calling search_events", 13),
            entry("MCP", "Completed search_events", 14),
            entry("Evidence reviewer", "Checking support", 15),
            entry("Meta", "Model request started", 16),
        ],
    )
    progress = run_progress(case, at=datetime(2026, 11, 5, 0, 0, 20, tzinfo=UTC))
    assert progress.model_requests == 2 and progress.model_responses == 1
    assert progress.tool_attempts == 1 and progress.tool_completions == 1
    assert progress.phase == "Evidence reviewer" and progress.elapsed_seconds == 10
    assert progress.model_limit == 10 and progress.tool_limit == 18
    assert progress.attached_evidence == 1
    assert "OFFLINE TEST MODE" in progress_text(progress)
    assert "Model 2/10" in progress_text(progress)


def test_finished_and_legacy_cases_do_not_invent_limits_or_elapsed_time():
    case = Case(case_id="C-12345678", dataset_id="D-example", title="Manual case")
    manual = run_progress(case)
    assert not manual.has_run and manual.elapsed_seconds is None
    assert "No model run" in progress_text(manual)
    case.activity = [
        entry("Investigator", "Investigation started"),
        entry("Reporter", "Case summary saved", 8, elapsed_seconds=7.25),
    ]
    case.status = "reviewed"
    progress = run_progress(case)
    assert progress.elapsed_seconds == 7.25 and progress.model_limit is None
    assert progress.phase == "Reporter"
    case.activity[0].details = {
        "limits": {
            "model_calls": True,
            "tool_calls": "secret-debug",
            "deadline_seconds": float("nan"),
        }
    }
    progress = run_progress(case)
    assert (
        progress.model_limit is None
        and progress.tool_limit is None
        and progress.deadline_seconds is None
    )


def test_recovered_process_does_not_claim_unknown_execution_duration():
    case = Case(
        case_id="C-12345678",
        dataset_id="D-example",
        title="Recovered case",
        status="interrupted",
        activity=[
            entry("Investigator", "Investigation started"),
            entry("Meta", "Model request started", 1),
            entry("System", "Recovered interrupted investigation; completed work retained", 30),
        ],
    )
    assert run_progress(case).elapsed_seconds is None


def test_progress_cli_is_read_only_without_model_configuration(demo):
    import json

    from typer.testing import CliRunner

    from sentinel.cases import Cases
    from sentinel.cli import app

    cases = Cases(demo)
    case = cases.create()
    before = cases.get(case.case_id).model_dump()
    result = CliRunner().invoke(
        app, ["--workspace", str(demo.root), "cases", "progress", case.case_id, "--json"]
    )
    assert result.exit_code == 0, result.output
    assert not json.loads(result.output)["has_run"]
    assert cases.get(case.case_id).model_dump() == before
