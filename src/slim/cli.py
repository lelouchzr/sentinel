"""Human-readable CLI backed by the same service as the workbench."""

import json
import shutil
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Table

from slim.config import Settings
from slim.demo import demo_request
from slim.errors import SlimError
from slim.models import PlanRequest
from slim.service import ExtractionService

app = typer.Typer(
    no_args_is_help=True, help="Move a Python feature, adapt its boundary, verify its behavior."
)
console = Console()


@app.command()
def serve(host: str = "127.0.0.1", port: int = 8000):
    """Start the local HTTP service (API docs at /docs)."""
    import uvicorn

    if host not in {"127.0.0.1", "localhost"}:
        raise typer.BadParameter("Slim's unauthenticated workbench binds to loopback only")
    from slim.api import create_app

    uvicorn.run(create_app(), host=host, port=port)


@app.command()
def analyze(
    source: str, query: str = "", json_output: Annotated[bool, typer.Option("--json")] = False
):
    """List candidate functions/classes without executing source code."""
    service = ExtractionService(Settings.from_env())
    try:
        codebase = service.codebase(source)
        symbols = codebase.search(query)
        if json_output:
            console.print_json(json.dumps([symbol.model_dump() for symbol in symbols]))
        else:
            table = Table(
                title=f"{len(codebase.modules)} Python files · {codebase.total_lines:,} lines"
            )
            for column in ("Symbol", "Location", "Signature"):
                table.add_column(column)
            for symbol in symbols:
                table.add_row(symbol.id, f"{symbol.path}:{symbol.line}", symbol.signature)
            console.print(table)
    except SlimError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from None
    finally:
        service.close()


def run_request(request: PlanRequest, output: Path, validate: bool) -> dict:
    if output.exists():
        raise SlimError(f"Output already exists: {output}")
    service = ExtractionService(Settings.from_env())
    try:
        job = service.create_plan(request)
        console.print(
            f"[bold]Plan[/bold] {job['id'][:8]} · {len(job['plan']['symbols'])} declarations"
        )
        job = service.run_sync(job["id"], "extract")
        if validate:
            job = service.run_sync(job["id"], "validate")
            report = job["report"]
            console.print(
                f"Evidence: {report['matched']} matched / {report['diverged']} diverged / {report['unverified']} unverified"
            )
        shutil.copytree(service.artifact(job["id"]), output)
        console.print(f"Package: {output.resolve()}")
        return job
    finally:
        service.close()


@app.command()
def extract(spec: Path, output: Path = Path("artifacts/feature"), validate: bool = False):
    """Build a reviewed JSON extraction specification. Refuse existing output."""
    try:
        request = PlanRequest.model_validate_json(spec.read_text())
        job = run_request(request, output, validate)
        if validate and job["report"]["status"] != "matched":
            raise typer.Exit(2)
    except (SlimError, ValueError, OSError) as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from None


@app.command()
def demo(output: Path = Path("artifacts/shipping-core"), validate: bool = True):
    """Extract the commerce feature, remove its DB dependency and compare 10 cases."""
    try:
        job = run_request(demo_request(Settings.from_env().workspace), output, validate)
        if validate and job["report"]["status"] != "matched":
            raise typer.Exit(2)
    except (SlimError, OSError) as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from None


if __name__ == "__main__":
    app()
