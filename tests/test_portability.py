"""Portable locking and workspace behavior, executed on native OS runners."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from zoneinfo import ZoneInfo, reset_tzpath

import pytest
from typer.testing import CliRunner

from sentinel import workspace as workspace_module
from sentinel.cases import Cases
from sentinel.cli import app
from sentinel.models import utc_timestamp
from sentinel.security import SentinelError
from sentinel.workspace import Workspace


def test_native_lock_excludes_another_process_and_releases_on_exit(workspace):
    script = """
import sys
from sentinel.workspace import Workspace
from sentinel.security import SentinelError
workspace = Workspace(sys.argv[1], create=False)
try:
    with workspace.lock('run-platform', blocking=False):
        print('acquired')
except SentinelError:
    print('blocked')
"""
    command = [sys.executable, "-c", script, str(workspace.root)]
    with workspace.lock("run-platform", blocking=False):
        child = subprocess.run(command, capture_output=True, text=True, timeout=15, check=True)
        assert child.stdout.strip() == "blocked"
    child = subprocess.run(command, capture_output=True, text=True, timeout=15, check=True)
    assert child.stdout.strip() == "acquired"
    assert workspace.path("locks/run-platform.lock").is_file()


def test_bounded_lock_wait_and_independent_same_thread_runs(workspace, monkeypatch):
    monkeypatch.setattr(workspace_module, "LOCK_TIMEOUT_SECONDS", 0.05)
    with workspace.lock("run-platform", blocking=False):
        with pytest.raises(SentinelError, match="already"):
            with workspace.lock("run-platform", blocking=False):
                pytest.fail("A second independent run acquired an active lock")
        with pytest.raises(SentinelError, match="busy"):
            with workspace.lock("run-platform"):
                pytest.fail("A blocked lock exceeded its configured wait")


def test_timezone_data_without_an_operating_system_database():
    import zoneinfo

    previous = zoneinfo.TZPATH
    try:
        reset_tzpath(())
        ZoneInfo.clear_cache()
        assert utc_timestamp("2026-10-20T12:00:00", "Europe/Paris").startswith("2026-10-20T10:00")
    finally:
        reset_tzpath(previous)
        ZoneInfo.clear_cache()


def test_demo_reset_archives_cases_and_refuses_active_runs(tmp_path):
    runner = CliRunner()
    path = tmp_path / "demo"
    command = ["--workspace", str(path), "demo", "--no-tui", "--json"]
    result = runner.invoke(app, command)
    assert result.exit_code == 0, result.exception
    workspace = Workspace(path, create=False)
    case = Cases(workspace).create(title="Portable reset validation")
    Cases(workspace).note(case.case_id, "Preserve this note in the generated demo archive.")
    with workspace.lock(f"run-{case.case_id}", blocking=False):
        refused = runner.invoke(app, [*command, "--reset"])
        assert isinstance(refused.exception, SentinelError)
    result = runner.invoke(app, [*command, "--reset"])
    assert result.exit_code == 0, result.exception
    assert json.loads(result.output)["inserted"] == 3542
    archived = list(tmp_path.glob("demo-archive-*"))
    assert len(archived) == 1
    assert Cases(Workspace(archived[0], create=False)).get(case.case_id).notes


@pytest.mark.skipif(os.name != "nt", reason="Windows drive and junction semantics")
def test_windows_drive_relative_paths_and_junction_escapes(workspace, tmp_path):
    with pytest.raises(SentinelError):
        workspace.path("C:outside.json")
    outside = tmp_path / "outside"
    outside.mkdir()
    junction = workspace.root / "reports" / "junction"
    subprocess.run(
        ["cmd", "/c", "mklink", "/J", str(junction), str(outside)],
        capture_output=True,
        check=True,
        timeout=15,
    )
    try:
        with pytest.raises(SentinelError, match="reparse"):
            workspace.path("reports/junction/outside.json")
    finally:
        # Remove only the junction, never recursively walk its destination.
        junction.rmdir()
    assert outside.is_dir()
    source = tmp_path / "source"
    source.mkdir()
    linked = source / "linked"
    cycle = outside / "cycle"
    for link, target in [(linked, outside), (cycle, source)]:
        subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link), str(target)],
            capture_output=True,
            check=True,
            timeout=15,
        )
    script = """
import sys
from sentinel.ingest import ingest
from sentinel.workspace import Workspace
from sentinel.security import SentinelError
try:
    ingest(Workspace(sys.argv[1], create=False), __import__('pathlib').Path(sys.argv[2]))
except SentinelError as exc:
    print(str(exc))
    raise SystemExit(2)
"""
    try:
        result = subprocess.run(
            [sys.executable, "-c", script, str(workspace.root), str(source)],
            capture_output=True,
            text=True,
            timeout=15,
        )
        assert result.returncode == 2 and "reparse" in result.stdout
    finally:
        cycle.rmdir()
        linked.rmdir()
