"""Human output remains literal, useful and independent from machine JSON."""

import io
import json

from rich.console import Console
from typer.testing import CliRunner

from sentinel.cli import app
from sentinel.presentation import activity_text, output_panel, status_color


def test_human_doctor_and_json_are_separate_and_safe(demo, monkeypatch):
    monkeypatch.delenv("META_API_KEY", raising=False)
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    runner = CliRunner()
    human = runner.invoke(app, ["--workspace", str(demo.root), "doctor"])
    assert human.exit_code == 0, human.output
    assert "System check" in human.output and "Not configured" in human.output
    machine = runner.invoke(app, ["--workspace", str(demo.root), "doctor", "--json"])
    assert machine.exit_code == 0, machine.output
    assert json.loads(machine.output)["event_count"] == 3542
    assert "\x1b" not in machine.output and "SENTINEL /" not in machine.output


def test_presentation_does_not_interpret_imported_markup_or_osc():
    data = [
        {
            "rule_id": "AUTH-001",
            "severity": "high",
            "entities": {"account": "[bold]user[/bold]"},
            "event_ids": ["E-example"],
            "explanation": "\x1b]0;injected-title\x07Review literal [red]source[/red]",
        }
    ]
    output = io.StringIO()
    Console(file=output, width=100, no_color=True, force_terminal=False).print(output_panel(data))
    rendered = output.getvalue()
    assert "[bold]user[/bold]" in rendered and "[red]source[/red]" in rendered
    assert "\x1b" not in rendered and "injected-title" not in rendered
    entry = activity_text("MCP", "Calling get_event", {"account": "[bold]source[/bold]"})
    assert "[bold]source[/bold]" in entry.plain and entry.spans


def test_search_results_are_not_labeled_as_demo_readiness():
    output = io.StringIO()
    Console(file=output, width=100, force_terminal=False).print(
        output_panel({"events": [], "total": 0})
    )
    assert "Workspace ready" not in output.getvalue()
    assert status_color("Not ready") != status_color("Ready")
    assert status_color("Configured, not yet verified") != status_color(
        "Connected after a successful call"
    )
