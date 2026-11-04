"""Reproduce real-repository extraction and install outputs in a clean consumer.

Network is used only to clone public sources, resolve original dependencies and
build/install local wheels. Run: uv sync --extra upstream && make benchmark.
"""

import json
import shutil
import subprocess
from pathlib import Path

from slim.catalog import SPECS
from slim.config import Settings
from slim.models import PlanRequest
from slim.service import ExtractionService

ROOT = Path(__file__).resolve().parents[1]


def run():
    settings = Settings.from_env()
    if not settings.allow_execution:
        raise SystemExit("Set SLIM_ALLOW_EXECUTION=1 after reviewing the upstream sources")
    service = ExtractionService(settings)
    results = []
    artifacts = ROOT / "artifacts" / "upstream"
    artifacts.mkdir(parents=True, exist_ok=True)
    try:
        for name, url, entry, package, scenarios in SPECS:
            request = PlanRequest(
                source=url, entry=entry, package_name=package, scenarios=scenarios
            )
            job = service.create_plan(request)
            job = service.run_sync(job["id"], "extract")
            job = service.run_sync(job["id"], "validate")
            plan, report = job["plan"], job["report"]
            destination = service.artifact(job["id"])
            # Build only Slim's generated setuptools package, never an upstream build script.
            build_source = artifacts / "builds" / job["id"]
            shutil.copytree(destination, build_source)
            subprocess.run(
                [
                    "uv",
                    "build",
                    "--quiet",
                    "--wheel",
                    "--out-dir",
                    str(artifacts / "wheels"),
                    str(build_source),
                ],
                check=True,
            )
            result = {
                "repository": name,
                "url": url,
                "commit": plan["source_commit"],
                "entry": entry,
                "source_files": plan["source_files"],
                "source_lines": plan["original_lines"],
                "selected_lines": plan["selected_lines"],
                "job_id": job["id"],
                "report": report,
                "external_imports": job["manifest"]["external_imports"],
            }
            results.append(result)
            print(
                f"{name}: {report['matched']}/{len(scenarios)} matched; {report['diverged']} diverged; {report['unverified']} unverified",
                flush=True,
            )
        consumer = artifacts / "consumer-venv"
        subprocess.run(["uv", "venv", "--clear", str(consumer)], check=True)
        wheels = sorted((artifacts / "wheels").glob("*.whl"))
        subprocess.run(
            [
                "uv",
                "pip",
                "install",
                "--python",
                str(consumer / "bin/python"),
                "--no-deps",
                *map(str, wheels),
            ],
            check=True,
        )
        subprocess.run(
            [str(consumer / "bin/python"), str(ROOT / "examples/consumer/app.py"), "--upstream"],
            check=True,
            cwd="/tmp",
        )
        output = ROOT / "artifacts" / "benchmark-results.json"
        output.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "results": results,
                    "consumer": "clean venv, wheels installed with --no-deps",
                    "scope": "Executed scenarios only; no general equivalence claim",
                },
                indent=2,
            )
            + "\n"
        )
        print(f"Evidence written to {output}")
        if any(result["report"]["status"] != "matched" for result in results):
            raise SystemExit(2)
    finally:
        service.close()


if __name__ == "__main__":
    run()
