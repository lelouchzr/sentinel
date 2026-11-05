"""SENTINEL CLI: reproducible demo, ingestion, investigation and case operations."""

from __future__ import annotations

import asyncio
import json
import os
import platform
import sys
import uuid
from importlib.metadata import version
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from .agent import investigate as run_investigation
from .brief import brief_text, case_brief
from .cases import Cases
from .config import AgentConfig, provider_status
from .detection import RuleConfig, detect, load_alerts
from .export import export_case
from .generator import SEED, generate
from .ingest import ingest as import_logs
from .models import SearchFilters
from .presentation import activity_text, output_panel
from .security import SentinelError, atomic_json, plain
from .storage import Store
from .workspace import Workspace

app = typer.Typer(
    no_args_is_help=True, help="SENTINEL · From scattered events to defensible investigations."
)
cases_app = typer.Typer(
    no_args_is_help=True, help="Create, inspect, annotate and reopen persistent investigations."
)
app.add_typer(cases_app, name="cases")
console = Console(markup=False, highlight=False, no_color="NO_COLOR" in os.environ)


def emit(data, as_json=False):
    if as_json:
        typer.echo(json.dumps(data, indent=2, ensure_ascii=True, default=str))
    else:
        console.print(output_panel(data))


@app.callback()
def root(
    ctx: typer.Context,
    workspace: Path = typer.Option(
        None,
        "--workspace",
        "-w",
        help="Generated Sentinel state directory. Default: SENTINEL_WORKSPACE or .sentinel.",
    ),
):
    ctx.obj = workspace or Path(os.environ.get("SENTINEL_WORKSPACE", ".sentinel"))


def ws(ctx, create=True):
    return Workspace(ctx.obj, create=create)


def launch(workspace, case_id=None):
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        raise SentinelError(
            "The TUI needs an interactive terminal. Use --no-tui or JSON commands in scripts."
        )
    from .tui import SentinelApp

    SentinelApp(workspace, case_id).run()


@app.command()
def ingest(
    ctx: typer.Context,
    directory: Path = typer.Argument(..., help="Read-only CSV/JSONL source directory."),
    timezone: str = typer.Option("UTC", help="IANA timezone for timestamps without offsets."),
    as_json: bool = typer.Option(
        False, "--json", help="Emit machine-readable ingestion and detection counts."
    ),
):
    """Import immutable source records, preserve provenance, and run deterministic detection."""
    workspace = ws(ctx)
    summary = import_logs(workspace, directory, timezone)
    summary["alert_count"] = len(detect(Store(workspace)))
    emit(summary, as_json)


@app.command()
def demo(
    ctx: typer.Context,
    no_tui: bool = typer.Option(False, help="Prepare demo data without opening the terminal UI."),
    reset: bool = typer.Option(
        False, help="Archive only this workspace's generated demo state, then start fresh."
    ),
    as_json: bool = typer.Option(
        False, "--json", help="Machine-readable setup summary; implies --no-tui."
    ),
):
    """Prepare 3,542 fictional events, detect signals, and open the interactive workspace."""
    path = Path(ctx.obj)
    if reset and path.exists():
        previous = Workspace(path, create=False)
        if previous.meta().get("demo_seed") != SEED:
            raise SentinelError("Reset is allowed only for a Sentinel-generated demo workspace")
        # Renaming retains cases and never recursively deletes any directory.
        with previous.lock("reset", blocking=False):
            for file in previous.path("cases").glob("C-*.json"):
                with previous.lock(f"run-{file.stem}", blocking=False):
                    pass
            archived = previous.root.with_name(
                previous.root.name + "-archive-" + uuid.uuid4().hex[:8]
            )
        # Windows directory moves require our readiness-check handles to be
        # closed. Other sessions must be closed before reset on every platform.
        previous.root.rename(archived)
        if not as_json:
            console.print(f"Previous demo state archived at {archived}")
    workspace = Workspace(path)
    meta = workspace.meta()
    if meta.get("active_dataset") and meta.get("demo_seed") != SEED:
        raise SentinelError(
            "Use a separate --workspace for demo; this workspace contains a manually imported dataset"
        )
    # The generator is shipped inside the wheel. No repository or browser is required.
    # Generated demo sources stay separate from mutable workspace state.
    source = workspace.root.with_name(workspace.root.name + "-sources")
    if source.exists() and any(source.iterdir()):
        expected = {"identity.csv", "services.jsonl"}
        if {p.name for p in source.iterdir()} != expected:
            raise SentinelError(
                "Demo source directory is not recognized; choose a new workspace path"
            )
    else:
        generate(source)
    summary = import_logs(workspace, source)
    meta = workspace.meta()
    meta["demo_seed"] = SEED
    meta["demo_dataset"] = workspace.dataset_id
    atomic_json(workspace.path("workspace.json"), meta)
    alerts = detect(Store(workspace))
    emit(
        {
            "workspace": str(workspace.root),
            "dataset_id": workspace.dataset_id,
            "events": summary["accepted"],
            "inserted": summary["inserted"],
            "alerts": len(alerts),
            "provider": provider_status(),
        },
        as_json,
    )
    if not no_tui and not as_json:
        launch(workspace)


@app.command()
def investigate(
    ctx: typer.Context,
    directory: Path = typer.Argument(..., help="CSV/JSONL source directory."),
    timezone: str = typer.Option("UTC", help="Timezone for naive timestamps."),
    no_tui: bool = typer.Option(False, help="Import and detect without opening the TUI."),
):
    """Import a directory, detect alerts, and open its terminal investigation workspace."""
    workspace = ws(ctx)
    summary = import_logs(workspace, directory, timezone)
    alerts = detect(Store(workspace))
    console.print(
        f"Imported {summary['accepted']} accepted records; {summary['rejected']} rejected; {len(alerts)} alerts."
    )
    if not no_tui:
        launch(workspace)


@app.command()
def tui(ctx: typer.Context):
    """Reopen the workspace with all persisted cases and evidence."""
    workspace = ws(ctx, False)
    _ = workspace.dataset_id
    launch(workspace)


@cases_app.command("list")
def cases_list(
    ctx: typer.Context, as_json: bool = typer.Option(False, "--json", help="Emit cases as JSON.")
):
    """List saved cases across datasets in this workspace."""
    cases = Cases(ws(ctx, False)).list()
    if as_json:
        emit([c.model_dump() for c in cases], True)
    else:
        table = Table("Case ID", "Title", "Status", "Evidence")
        for case in cases:
            table.add_row(case.case_id, plain(case.title), case.status, str(len(case.evidence_ids)))
        console.print(table)


@cases_app.command("create")
def cases_create(
    ctx: typer.Context,
    alert: str | None = typer.Option(None, help="Alert ID to open as a case."),
    title: str = typer.Option("Manual investigation", help="Title when no alert is specified."),
    as_json: bool = typer.Option(False, "--json"),
):
    """Create a case from a real alert or start a manual investigation."""
    emit(Cases(ws(ctx, False)).create(alert, title).model_dump(), as_json)


@cases_app.command("open")
def cases_open(
    ctx: typer.Context,
    case_id: str,
    no_tui: bool = typer.Option(False, help="Print the case instead of opening the TUI."),
    as_json: bool = typer.Option(False, "--json"),
):
    """Reopen one saved investigation and its original dataset."""
    workspace = ws(ctx, False)
    case = Cases(workspace).reopen(case_id)
    if no_tui or as_json:
        emit(case.model_dump(), as_json)
    else:
        launch(workspace, case_id)


@cases_app.command("brief")
def cases_brief(ctx: typer.Context, case_id: str, as_json: bool = typer.Option(False, "--json")):
    """Explain a case using deterministic counts, signal context and next checks."""
    brief = case_brief(Cases(ws(ctx, False)), case_id)
    if as_json:
        emit(brief.model_dump(), True)
    else:
        console.print(brief_text(brief))


@cases_app.command("note")
def cases_note(
    ctx: typer.Context,
    case_id: str,
    text: str = typer.Argument(..., help="Analyst note, in English."),
):
    """Persist an analyst note without starting a model run."""
    Cases(ws(ctx, False)).note(case_id, text)
    console.print("Analyst note saved.")


@cases_app.command("status")
def cases_status(
    ctx: typer.Context,
    case_id: str,
    status: str = typer.Argument(..., help="open, investigating, reviewed, interrupted, or closed"),
):
    """Update a case status; running investigations retain their process lock."""
    if status not in {"open", "investigating", "reviewed", "interrupted", "closed"}:
        raise SentinelError("Invalid case status")
    Cases(ws(ctx, False)).update(case_id, lambda c: setattr(c, "status", status))
    console.print(f"Case status: {status}")


@app.command("run")
def agent_run(
    ctx: typer.Context,
    case_id: str,
    question: str = typer.Option(..., "--question", "-q", help="Focused investigation request."),
    as_json: bool = typer.Option(
        False, "--json", help="Print the final case as JSON; activity goes to stderr."
    ),
):
    """Run the real Meta-selected MCP investigation loop for a saved case."""
    cases = Cases(ws(ctx, False))
    config = AgentConfig.from_env()

    def changed(role, message):
        if as_json:
            typer.echo(plain(f"{role}: {message}"), err=True)
        else:
            Console(stderr=True, markup=False, no_color="NO_COLOR" in os.environ).print(
                activity_text(role, message)
            )

    try:
        result = asyncio.run(
            run_investigation(cases, case_id, question, config, on_activity=changed)
        )
    except KeyboardInterrupt:
        raise typer.Exit(130) from None
    emit(result.model_dump(), as_json)


@app.command()
def alerts(ctx: typer.Context, as_json: bool = typer.Option(False, "--json")):
    """List deterministic detection signals from imported records."""
    emit([a.model_dump() for a in load_alerts(Store(ws(ctx, False)))], as_json)


@app.command()
def detect_rules(
    ctx: typer.Context,
    failures: int = typer.Option(8, min=2, help="Failure threshold."),
    window: int = typer.Option(300, min=1, help="Correlation window in seconds."),
    transfer_bytes: int = typer.Option(
        100_000_000, min=1, help="Large transfer threshold in bytes."
    ),
    as_json: bool = typer.Option(False, "--json"),
):
    """Rerun the three rules with explicit thresholds."""
    try:
        config = RuleConfig(
            failure_threshold=failures,
            window_seconds=window,
            transfer_threshold_bytes=transfer_bytes,
        )
    except ValueError:
        raise SentinelError("Invalid rule thresholds") from None
    emit([a.model_dump() for a in detect(Store(ws(ctx, False)), config)], as_json)


@app.command()
def search(
    ctx: typer.Context,
    account: str | None = None,
    ip: str | None = None,
    host: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    session: str | None = None,
    start: str | None = None,
    end: str | None = None,
    limit: int = typer.Option(30, min=1, max=100),
    offset: int = typer.Option(0, min=0, max=1000000),
    as_json: bool = typer.Option(False, "--json"),
):
    """Query exact filters with chronological results, source references and computed totals."""
    try:
        filters = SearchFilters(
            account=account,
            source_ip=ip,
            host=host,
            action=action,
            outcome=outcome,
            session_id=session,
            start=start,
            end=end,
        )
    except ValueError:
        raise SentinelError("Invalid search filter or timestamp") from None
    emit(Store(ws(ctx, False)).search(filters, limit, offset).model_dump(), as_json)


@app.command()
def event(ctx: typer.Context, event_id: str, as_json: bool = typer.Option(False, "--json")):
    """Inspect one imported event and its original source record."""
    emit(Store(ws(ctx, False)).get(event_id).model_dump(), as_json)


@app.command("export")
def export_command(
    ctx: typer.Context,
    case_id: str,
    format: str = typer.Option("markdown", help="markdown or json"),
    as_json: bool = typer.Option(False, "--json", help="Emit the output path as JSON."),
):
    """Export a saved case, evidence, query receipts and source manifest into workspace/reports."""
    path = export_case(Cases(ws(ctx, False)), case_id, format)
    emit({"path": str(path), "format": format}, as_json)


@app.command()
def doctor(
    ctx: typer.Context,
    as_json: bool = typer.Option(
        False, "--json", help="Emit readiness diagnostics without ANSI or secrets."
    ),
):
    """Report dependency, Meta configuration and workspace readiness. Never contacts the API."""
    checks = {
        "python": platform.python_version(),
        "platform": platform.system(),
        "dependencies": {
            p: version(p)
            for p in (
                "typer",
                "textual",
                "rich",
                "duckdb",
                "pydantic",
                "mcp",
                "openai",
                "filelock",
                "tzdata",
            )
        },
        "meta": provider_status(),
        "workspace": str(Path(ctx.obj).absolute()),
        "workspace_ready": False,
        "dataset_ready": False,
    }
    try:
        workspace = ws(ctx, False)
        checks["workspace_ready"] = True
        checks["dataset_id"] = workspace.dataset_id
        checks["dataset_ready"] = True
        checks["event_count"] = Store(workspace).summary()["event_count"]
    except SentinelError as exc:
        checks["workspace_message"] = str(exc)
    checks["live_connection"] = "Not checked; only a successful investigation verifies connectivity"
    emit(checks, as_json)
    if checks["meta"] == "Invalid configuration":
        raise typer.Exit(2)


@app.command()
def mcp(
    ctx: typer.Context,
    case: str | None = typer.Option(None, help="Bind case-writing tools to this case ID."),
):
    """Run the standalone MCP stdio server. Stdout is reserved for protocol traffic."""
    from .mcp_server import create_server

    create_server(ws(ctx, False), case).run(transport="stdio")


@app.command()
def generate_data(
    directory: Path,
    seed: int = typer.Option(SEED, help="Deterministic dataset seed."),
    as_json: bool = typer.Option(False, "--json"),
):
    """Generate fictional CSV/JSONL sources into a new or empty directory."""
    emit(generate(directory, seed), as_json)


def main():
    try:
        app()
    except SentinelError as exc:
        typer.echo("Error: " + plain(str(exc)), err=True)
        raise SystemExit(2) from None
    except (OSError, ValueError):
        typer.echo(
            "Error: local state could not be read or written. Check paths, permissions and file integrity.",
            err=True,
        )
        raise SystemExit(3) from None


if __name__ == "__main__":
    main()
