"""Explicit paid validation; never invoked by CI or make check. No retries."""

import argparse
import asyncio
import getpass
import json
import os
import time

from sentinel.agent import investigate
from sentinel.cases import Cases
from sentinel.config import AgentConfig
from sentinel.detection import detect
from sentinel.export import export_case
from sentinel.generator import generate
from sentinel.ingest import ingest
from sentinel.security import SentinelError
from sentinel.storage import Store
from sentinel.workspace import Workspace

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--workspace", default=".sentinel-live")
parser.add_argument(
    "--prompt-key", action="store_true", help="Read the key without echoing or saving it"
)
args = parser.parse_args()
if args.prompt_key:
    os.environ["META_API_KEY"] = getpass.getpass("Meta API key (hidden, process memory only): ")
config = AgentConfig.from_env()
workspace = Workspace(args.workspace)
source = workspace.root.with_name(workspace.root.name + "-sources")
if not source.exists():
    generate(source)
ingest(workspace, source)
alerts = detect(Store(workspace))
cases = Cases(workspace)
case = cases.create(next(a.alert_id for a in alerts if a.rule_id == "AUTH-002"))
started = time.monotonic()
print("Starting an actual Meta investigation through a local MCP subprocess.", flush=True)


def activity(role, message):
    print(f"{time.monotonic() - started:6.1f}s {role}: {message}", flush=True)


try:
    result = asyncio.run(
        investigate(
            cases,
            case.case_id,
            "Investigate the successful authentication after failures. Retrieve the related session and export evidence. Separate recorded facts from hypotheses and explain what would establish authorization. Use a small number of focused searches, then conclude.",
            config,
            on_activity=activity,
        )
    )
except SentinelError as exc:
    print(str(exc))
    print(
        json.dumps(
            {
                "case_id": case.case_id,
                "status": cases.get(case.case_id).status,
                "elapsed_seconds": round(time.monotonic() - started, 2),
            }
        )
    )
    raise SystemExit(2) from None
paths = [export_case(cases, result.case_id, format) for format in ("markdown", "json")]
print(
    json.dumps(
        {
            "case_id": result.case_id,
            "status": result.status,
            "provider": result.provider,
            "elapsed_seconds": round(time.monotonic() - started, 2),
            "findings": len(result.findings),
            "event_ids": result.evidence_ids,
            "reports": [str(p) for p in paths],
        },
        indent=2,
    )
)
