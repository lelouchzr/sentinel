# MCP server and client

Sentinel uses the official MCP Python SDK **1.30.0**, pinned with the v1 API surface:
`mcp.server.fastmcp.FastMCP`, `mcp.ClientSession`, `StdioServerParameters` and `stdio_client`.
The application's agent is an actual stdio protocol client. Discovery and every tool invocation
cross a child-process protocol boundary; direct storage calls are not relabeled as MCP.

## Start or connect

Prepare a workspace, then start the server:

```sh
uv run sentinel demo --no-tui
uv run sentinel --workspace .sentinel mcp
```

The process waits for MCP JSON-RPC on stdin. Stdout contains protocol traffic only. Technical output
uses stderr. The application's own client redirects child stderr to `artifacts/mcp-transport.log`.
For case-writing tools, create a case and bind it explicitly:

```sh
uv run sentinel cases create --title "Manual investigation" --json
uv run sentinel --workspace .sentinel mcp --case CASE_ID
```

The server binds the dataset once at startup: the selected case's dataset, or the active dataset
when no case is specified. Tool parameters do not contain workspace paths, database paths or a
case selector. No server accepts an arbitrary filesystem read or SQL string. A child does not
inherit `META_API_KEY`, `MODEL_API_KEY` or `OPENAI_API_KEY` from Sentinel's agent client.

Any compatible stdio client can launch the command above. A native SDK probe requires no Node or
browser and is included:

```sh
uv run python scripts/mcp_probe.py --workspace .sentinel
```

Optional MCP Inspector (a separate developer tool, not a Sentinel dependency):

```sh
npx @modelcontextprotocol/inspector --tui uv --directory /absolute/path/to/sentinel run sentinel --workspace /absolute/path/to/workspace mcp
```

Or omit `--tui` for Inspector's graphical client. Follow the
[official Inspector instructions](https://modelcontextprotocol.io/docs/tools/inspector) for its
own runtime prerequisites. A conventional client configuration is:

```json
{
  "mcpServers": {
    "sentinel": {
      "command": "/absolute/path/to/sentinel/.venv/bin/sentinel",
      "args": ["--workspace", "/absolute/path/to/workspace", "mcp"]
    }
  }
}
```

No API key is required to browse data through MCP. Do not place keys in this client configuration.

## Tools

Every output is validated by a Pydantic return model and advertised with an output schema.

| Tool | Input | Structured output |
| --- | --- | --- |
| get_dataset_summary | None | Dataset ID, event count, UTC range, source/account distribution |
| list_alerts | limit 1–100, offset | Versioned deterministic alerts, total, returned, truncated |
| search_events | optional typed filters, limit 1–100, offset | Chronological events and exact query receipt |
| get_event | event_id | Canonical fields, source filename/position/hash/original record |
| get_entity_activity | entity_type, value, limit, offset | Exact account/IP/host/session/resource activity and receipt |
| build_timeline | filters, limit, offset | Chronological events, totals and receipt |
| attach_evidence | up to 100 event_ids | Bound case ID, validated evidence IDs, note count |
| save_case_notes | note, 1–8000 characters | Bound case ID, evidence IDs, note count; model interpretation label |

Without `--case`, the two mutation tools return an actionable tool error. They cannot create,
select or modify another case. Event IDs must exist in the bound dataset.

Filters are exact matches combined with AND: account, source_ip, host, action, outcome, resource,
session_id, start, end, min_bytes. UTC range boundaries are inclusive. Example tool arguments:

```json
{
  "filters": {"account": "morgan", "source_ip": "203.0.113.74", "action": "login", "outcome": "failure"},
  "limit": 10,
  "offset": 0
}
```

An EventPage contains `events`, `returned`, `total`, `offset`, `limit`, `truncated` and `receipt`.
The receipt includes a stable Q- ID, dataset ID, exact filters, total_count, total_bytes,
action_outcome_counts, action_counts_truncated, first/last UTC timestamp and returned_event_ids. Aggregates cover all
matches; the record page may be truncated. The original source record travels with each event.
Query receipts are persisted for report inspection. The native manual client may search without a
filter; the model runtime additionally requires focused filters and limits each run to 160 distinct
retrieved records.

## Lifecycle and test

The client opens stdio, initializes a ClientSession, discovers tools and calls them while both SDK
async contexts remain in the same task. Cancellation closes these contexts and shuts down the child.
Per-tool read timeouts and the overall investigation deadline bound failures. Database connections
are closed between operations; the child does not inherit a live DuckDB handle.

```sh
make integration
```

This launches disposable local stdio children, discovers all tools, searches actual ingested records,
retrieves original evidence, exercises writes and rejects invalid filters. It opens no network
listener, connects to no production service, and makes no paid model requests.
