"""Browser-free MCP subprocess probe using Sentinel's real SDK client."""

import argparse
import asyncio
import json

from sentinel.mcp_client import connect
from sentinel.workspace import Workspace

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--workspace", default=".sentinel")
parser.add_argument("--case")
args = parser.parse_args()


async def probe():
    async with connect(Workspace(args.workspace, create=False), args.case) as bridge:
        tools = await bridge.discover()
        summary = await bridge.call("get_dataset_summary")
        page = await bridge.call("search_events", {"limit": 1})
        result = {
            "tools": [tool.name for tool in tools],
            "summary": summary,
            "returned": page["returned"],
            "total": page["total"],
        }
        if page["events"]:
            result["event"] = await bridge.call(
                "get_event", {"event_id": page["events"][0]["event_id"]}
            )
        print(json.dumps(result, indent=2, ensure_ascii=True))


asyncio.run(probe())
