"""MCP client lifecycle stays in one async task, including subprocess shutdown."""

from __future__ import annotations

import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import timedelta

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from .security import SentinelError
from .workspace import Workspace


class Bridge:
    def __init__(self, session: ClientSession, timeout: float):
        self.session = session
        self.timeout = timeout
        self.tools = []

    async def discover(self):
        self.tools = (await self.session.list_tools()).tools
        return self.tools

    async def call(self, name: str, arguments: dict | None = None) -> dict:
        if name not in {tool.name for tool in self.tools}:
            raise SentinelError("Tool was not discovered through MCP")
        result = await self.session.call_tool(
            name, arguments or {}, read_timeout_seconds=timedelta(seconds=self.timeout)
        )
        if result.isError:
            raise SentinelError(
                "MCP tool rejected the request; check typed filters and evidence identifiers"
            )
        if result.structuredContent is not None:
            return result.structuredContent
        for block in result.content:
            if block.type == "text":
                return json.loads(block.text)
        raise SentinelError("MCP tool returned no structured result")


@asynccontextmanager
async def connect(workspace: Workspace, case_id: str | None = None, timeout: float = 20):
    args = ["-m", "sentinel.mcp_server", "--workspace", str(workspace.root)]
    if case_id:
        args.extend(["--case", case_id])
    # The tool server needs no API credential. Do not inherit one into its process.
    environment = {
        k: v
        for k, v in os.environ.items()
        if k not in {"META_API_KEY", "MODEL_API_KEY", "OPENAI_API_KEY"}
    }
    params = StdioServerParameters(command=sys.executable, args=args, env=environment)
    with workspace.path("artifacts/mcp-transport.log").open("a", encoding="utf-8") as errlog:
        async with stdio_client(params, errlog=errlog) as (reader, writer):
            async with ClientSession(
                reader, writer, read_timeout_seconds=timedelta(seconds=timeout)
            ) as session:
                await session.initialize()
                yield Bridge(session, timeout)
