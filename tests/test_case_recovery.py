"""Recovery distinguishes an actual live process lock from a stale case status."""

import json
import subprocess
import sys
import time

import pytest
from typer.testing import CliRunner

from sentinel.cases import Cases
from sentinel.cli import app
from sentinel.detection import load_alerts
from sentinel.storage import Store


@pytest.mark.integration
def test_reopen_preserves_live_run_and_recovers_after_process_kill(demo):
    cases = Cases(demo)
    alert = next(a for a in load_alerts(Store(demo)) if a.rule_id == "AUTH-002")
    case = cases.create(alert.alert_id)
    cases.note(case.case_id, "Retain the original evidence and investigate authorization.")
    ready = demo.path("artifacts/recovery-child-ready.txt")
    script = """
import sys, time
from pathlib import Path
from sentinel.cases import Cases
from sentinel.workspace import Workspace
workspace = Workspace(sys.argv[1], create=False)
cases = Cases(workspace)
with workspace.lock("run-" + sys.argv[2], blocking=False):
    cases.update(sys.argv[2], lambda c: setattr(c, "status", "investigating"))
    cases.activity(sys.argv[2], "Investigator", "Partial evidence saved before interruption")
    Path(sys.argv[3]).write_text("ready")
    time.sleep(60)
"""
    process = subprocess.Popen(
        [sys.executable, "-c", script, str(demo.root), case.case_id, str(ready)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        deadline = time.monotonic() + 20
        while not ready.exists() and process.poll() is None and time.monotonic() < deadline:
            time.sleep(0.02)
        assert ready.exists(), "Investigation test process did not acquire its lock"
        running = cases.get(case.case_id)
        assert running.status == "investigating"
        assert cases.reopen(case.case_id).model_dump() == running.model_dump()
        process.kill()
        process.wait(timeout=10)
        recovered = Cases(demo).reopen(case.case_id)
        assert recovered.status == "interrupted"
        assert recovered.evidence_ids == running.evidence_ids
        assert recovered.notes == running.notes and recovered.summary == running.summary
        assert recovered.findings == running.findings
        assert recovered.activity[:-1] == running.activity
        assert recovered.activity[-1].action.startswith("Recovered interrupted investigation")
        assert cases.reopen(case.case_id).model_dump() == recovered.model_dump()
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=10)
        process.stderr.close()


@pytest.mark.parametrize("status", ["open", "reviewed", "interrupted", "closed"])
def test_reopen_does_not_modify_nonrunning_cases(demo, status):
    cases = Cases(demo)
    case = cases.create()
    saved = cases.update(case.case_id, lambda c: setattr(c, "status", status))
    assert cases.reopen(case.case_id).model_dump() == saved.model_dump()


def test_cli_reopen_recovers_stale_status_without_starting_a_model(demo):
    cases = Cases(demo)
    case = cases.create()
    cases.update(case.case_id, lambda c: setattr(c, "status", "investigating"))
    result = CliRunner().invoke(
        app, ["--workspace", str(demo.root), "cases", "open", case.case_id, "--json"]
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["status"] == "interrupted"
    assert cases.get(case.case_id).provider == "Manual"
