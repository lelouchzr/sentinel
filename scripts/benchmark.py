"""Reproduce real-repository extraction and install outputs in a clean consumer.

Network is used only to clone public sources, resolve original dependencies and
build/install local wheels. Run: uv sync --extra upstream && make benchmark.
"""

import json
import shutil
import subprocess
from pathlib import Path

from slim.config import Settings
from slim.models import PlanRequest, Scenario
from slim.service import ExtractionService

ROOT = Path(__file__).resolve().parents[1]


def cases(prefix, values):
    return [Scenario(name=f"{prefix} {i + 1:02d}", args=args) for i, args in enumerate(values)]


SPECS = [
    ("Requests", "https://github.com/psf/requests", "requests.utils:guess_json_utf", "json_encoding", cases("Encoding", [
        [{"$bytes": value}] for value in ["7b226122", "efbbbf7b", "fffe0000", "0000feff", "fffe7b00", "feff007b", "007b0022", "7b002200", "0000007b", "7b000000", "00010001", ""]
    ])),
    ("Werkzeug", "https://github.com/pallets/werkzeug", "werkzeug.security:safe_join", "safe_paths", cases("Path", [
        ["/srv/uploads", "image.png"], ["/srv/uploads", "a", "b.txt"], ["/srv/uploads", "../secret"], ["/srv/uploads", "/etc/passwd"], ["/srv/uploads", "a/../../secret"], ["/srv/uploads", "a/../b.txt"], ["", "hello.txt"], ["/srv/uploads", ".."], ["/srv/uploads", "."], ["/srv/uploads", ""]
    ])),
    ("Django", "https://github.com/django/django", "django.utils.ipv6:is_valid_ipv6_address", "ipv6_check", cases("IPv6", [
        ["::1"], ["::"], ["2001:db8::1"], ["::ffff:192.0.2.1"], ["127.0.0.1"], ["not-an-ip"], [""], [None], [42], ["f" * 80], ["2001:db8::g"], ["fe80::1"]
    ])),
]


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
            request = PlanRequest(source=url, entry=entry, package_name=package, scenarios=scenarios)
            job = service.create_plan(request)
            job = service.run_sync(job["id"], "extract")
            job = service.run_sync(job["id"], "validate")
            plan, report = job["plan"], job["report"]
            destination = service.artifact(job["id"])
            # Build only Slim's generated setuptools package, never an upstream build script.
            build_source = artifacts / "builds" / job["id"]
            shutil.copytree(destination, build_source)
            subprocess.run(["uv", "build", "--quiet", "--wheel", "--out-dir", str(artifacts / "wheels"), str(build_source)], check=True)
            result = {"repository": name, "url": url, "commit": plan["source_commit"], "entry": entry,
                      "source_files": plan["source_files"], "source_lines": plan["original_lines"],
                      "selected_lines": plan["selected_lines"], "job_id": job["id"], "report": report,
                      "external_imports": job["manifest"]["external_imports"]}
            results.append(result)
            print(f"{name}: {report['matched']}/{len(scenarios)} matched; {report['diverged']} diverged; {report['unverified']} unverified", flush=True)
        consumer = artifacts / "consumer-venv"
        subprocess.run(["uv", "venv", "--clear", str(consumer)], check=True)
        wheels = sorted((artifacts / "wheels").glob("*.whl"))
        subprocess.run(["uv", "pip", "install", "--python", str(consumer / "bin/python"), "--no-deps", *map(str, wheels)], check=True)
        subprocess.run([str(consumer / "bin/python"), str(ROOT / "examples/consumer/app.py"), "--upstream"], check=True, cwd="/tmp")
        output = ROOT / "artifacts" / "benchmark-results.json"
        output.write_text(json.dumps({"schema_version": 1, "results": results, "consumer": "clean venv, wheels installed with --no-deps", "scope": "Executed scenarios only; no general equivalence claim"}, indent=2) + "\n")
        print(f"Evidence written to {output}")
        if any(result["report"]["status"] != "matched" for result in results):
            raise SystemExit(2)
    finally:
        service.close()


if __name__ == "__main__":
    run()
