"""Exercise an installed wheel on the current OS without credentials or model calls."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("artifacts/platform-smoke.json"))
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    wheels = list((project / "dist").glob("sentinel_investigation-*.whl"))
    if len(wheels) != 1:
        parser.error("Build exactly one Sentinel wheel with uv build before running this check")
    environment = {
        key: value
        for key, value in os.environ.items()
        if key not in {"META_API_KEY", "MODEL_API_KEY", "OPENAI_API_KEY", "PYTHONPATH"}
    }
    environment["PYTHONUTF8"] = "1"
    environment["NO_COLOR"] = "1"
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="sentinel-wheel-") as temporary:
        root = Path(temporary)

        def run(command: list[str]) -> str:
            result = subprocess.run(
                command,
                cwd=root,
                env=environment,
                encoding="utf-8",
                capture_output=True,
                timeout=180,
                check=False,
            )
            if result.returncode:
                # No inherited credentials or paid API request can enter this subprocess.
                raise RuntimeError(
                    f"Validation command failed ({result.returncode}): {command[0]}\n"
                    f"{result.stdout[-6000:]}\n{result.stderr[-6000:]}"
                )
            return result.stdout

        virtualenv = root / "venv"
        run(["uv", "venv", str(virtualenv), "--python", sys.executable])
        python = virtualenv / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        run(["uv", "pip", "install", "--python", str(python), str(wheels[0])])

        def cli(*arguments: str) -> dict:
            return json.loads(run([str(python), "-m", "sentinel.cli", *arguments]))

        imported = cli("demo", "--no-tui", "--json")
        repeated = cli("demo", "--no-tui", "--json")
        assert imported["events"] == 3542 and imported["alerts"] == 15
        assert repeated["inserted"] == 0 and repeated["dataset_id"] == imported["dataset_id"]
        alerts = cli("alerts", "--json")
        alert = next(item for item in alerts if item["rule_id"] == "AUTH-002")
        case = cli("cases", "create", "--alert", alert["alert_id"], "--json")
        run(
            [
                str(python),
                "-m",
                "sentinel.cli",
                "cases",
                "note",
                case["case_id"],
                "Native platform wheel validation; no model request made.",
            ]
        )
        reopened = cli("cases", "open", case["case_id"], "--json")
        assert reopened["notes"] and reopened["evidence_ids"] == alert["event_ids"]
        for format in ("json", "markdown"):
            exported = cli("export", case["case_id"], "--format", format, "--json")
            assert Path(exported["path"]).is_file()
        probe = """
import asyncio, json, sentinel
from sentinel.workspace import Workspace
from sentinel.mcp_client import connect
async def probe():
    async with connect(Workspace('.sentinel', create=False)) as bridge:
        tools = await bridge.discover()
        page = await bridge.call('search_events', {'filters': {'account': 'svc-backup'}, 'limit': 1})
        event = await bridge.call('get_event', {'event_id': page['events'][0]['event_id']})
        assert page['total'] == 6 and event['source']['sha256']
        print(json.dumps({'tool_count': len(tools), 'matching_events': page['total'],
            'event_id': event['event_id'], 'module_origin': sentinel.__file__}))
asyncio.run(probe())
"""
        mcp = json.loads(run([str(python), "-c", probe]))
        assert mcp["tool_count"] == 8
        assert Path(mcp["module_origin"]).resolve().is_relative_to(virtualenv.resolve())
        hashes = {
            name: hashlib.sha256((root / ".sentinel-sources" / name).read_bytes()).hexdigest()
            for name in ("identity.csv", "services.jsonl")
        }
        for name, digest in hashes.items():
            expected = hashlib.sha256(
                (project / "examples/company-logs" / name).read_bytes()
            ).hexdigest()
            assert digest == expected, (
                f"Generated source bytes differ on {platform.system()}: {name}"
            )
        cli("demo", "--reset", "--no-tui", "--json")
        archives = list(root.glob(".sentinel-archive-*"))
        assert len(archives) == 1
        archived = json.loads(
            (archives[0] / "cases" / f"{case['case_id']}.json").read_text(encoding="utf-8")
        )
        assert archived["notes"] == reopened["notes"]
        result = {
            "platform": platform.platform(),
            "system": platform.system(),
            "machine": platform.machine(),
            "python": platform.python_version(),
            "dataset_id": imported["dataset_id"],
            "events": imported["events"],
            "alerts": imported["alerts"],
            "repeat_inserted": repeated["inserted"],
            "case_reopened": True,
            "exports": ["markdown", "json"],
            "demo_archive_preserved_notes": True,
            "mcp": mcp,
            "source_sha256": hashes,
            "model_calls": 0,
            "elapsed_seconds": round(time.monotonic() - started, 2),
        }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
