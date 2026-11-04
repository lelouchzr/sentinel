# Architecture

SENTINEL is a Python 3.12 application with a Typer CLI and a Textual terminal workspace. Rich formats
noninteractive output. DuckDB stores immutable normalized records. Pydantic validates records,
filters, findings and MCP output. The official MCP Python SDK v1.30.0 provides both protocol ends;
no v2 APIs are mixed into the implementation. AsyncOpenAI is used only as an async compatible
transport to the explicitly configured Meta Model API.

## Workflow and module boundaries

| Module | Responsibility |
| --- | --- |
| generator.py | Reproducible, fictional CSV/JSONL source generation |
| ingest.py | Read-only parsing, UTC conversion, provenance, manifest, rejection accounting |
| models.py | Shared validated contracts |
| workspace.py / security.py | Workspace ownership, path boundaries, locks, atomic writes, display sanitization |
| storage.py | Parameterized DuckDB operations, typed filters, bounded pages, computed receipts |
| detection.py | Three deterministic rule implementations and configurable thresholds |
| cases.py | Atomic case lifecycle, evidence validation, finding verification |
| mcp_server.py | Eight typed tools over stdio, bound to a workspace and optional case |
| mcp_client.py | Actual SDK client discovery and calls; same-task async context lifecycle |
| config.py / agent.py | Explicit Meta configuration, limits, tool loop and role handoffs |
| export.py | Self-contained Markdown and JSON evidence reports |
| tui.py / cli.py | Keyboard workflow, workers, noninteractive commands |

The CLI imports and detects before opening the TUI. Search and export run on background threads;
API/MCP investigation runs in a cancellable async Textual worker. The event loop remains available
for navigation, evidence inspection and cancellation. The model never runs blocking terminal input.

## State and dataset identity

A workspace contains `workspace.json`, `events.duckdb`, `manifests/`, `cases/`, `receipts/`,
`artifacts/`, `reports/`, `locks/` and a generated ignore file. Sources live outside this directory.
A workspace initializes only in an empty directory or one with a valid SENTINEL marker.

Dataset identity hashes sorted relative filenames, source SHA-256 values, the naive-timestamp timezone
and the schema version. An unchanged reimport inserts no duplicate events. Changed sources create a
new dataset identity; old records remain available to cases bound to the old identity. Identical-looking
rows at different positions have different stable event IDs. Inputs are not edited or copied from
another project. The manifest has no absolute source path and every event stores its original record.

DuckDB access uses a short `flock` critical section and closes each connection before releasing it.
This avoids sharing a live database handle across the CLI/TUI and the MCP child. Cases use separate
mutation locks and atomic JSON replacement. A nonblocking per-case run lock prevents concurrent
agents while permitting analyst notes and MCP evidence attachment. Completed tool results are saved
before another model call. Cancellation/failure marks the case interrupted and retains its evidence,
notes and artifacts. A later question starts a new bounded run using saved case context.

## Agent responsibilities

1. Investigator: discovers the actual MCP schema, retrieves dataset context through MCP, then chooses
   subsequent tools from returned evidence. The only fixed retrieval is the initial summary.
2. Evidence reviewer: receives the actual investigation/tool history and audits support, missing
   evidence, alternative explanations and uncertain links. Its concise output is saved separately.
3. Reporter: receives the history and review, returns a Pydantic-validated structured report, and
   supplies real event/query references. Its proposal is saved as explicitly unverified.

These are sequential calls to one configured model with separate instructions, not a multi-agent
framework. Activity records contain action summaries, safe arguments, result counts, artifact paths,
call counters and measured elapsed time. Reasoning fields are dropped; no private chain-of-thought
is loaded or displayed. The offline provider is an explicit test dependency and cannot be selected
silently from a failed live request.

## Evidence validity versus claim support

Every proposed event must have been retrieved in this run and must exist in the case dataset. Every
query reference must belong to that dataset and intersect the finding's cited records. Missing,
guessed and foreign references are rejected. An ID existing is not treated as proof of interpretation.

For observed facts, code discards the model's proposed title/prose and constructs canonical chronological
records plus exact query receipts. DuckDB computes filtered counts, sums, action/outcome counts and
UTC range. A successful record establishes recorded success, not actual operator identity or intent.
Hypotheses remain unproven even with valid references. Unsupported quantitative interpretation is
withheld for manual review; percentage confidence is not accepted. Model notes have an explicit
unverified-interpretation label. Analyst-authored notes remain distinguishable.

## Bounds and failure behavior

Default limits are 10 model requests, 18 tool invocations, 45 seconds per request and a 180-second
investigation deadline. Two model requests are reserved for evidence review and reporting. There are
zero automatic paid retries. Model searches require at least one focused filter and cap each investigation at 160 distinct retrieved event records. Tool pages cap at 100 rows. Individual source files cap at 25 MiB,
accepted datasets at 200,000 records, and original record JSON at 16,000 characters. The model receives
bounded excerpts rather than unrestricted file access. Failure of Meta leaves every manual feature
available. A malformed final response retains retrieval and review artifacts and marks the run
interrupted instead of presenting fabricated results.

## Trust boundaries

Source content and tool results are untrusted. Prompts explicitly prohibit executing instructions
inside logs. There is no shell, scanning, exploitation or infrastructure mutation tool. The model
cannot choose a workspace/database path or another case. Typed exact filters are converted to
parameterized SQL; no arbitrary SQL endpoint exists. Symlink paths and traversal are rejected.

Terminal data is displayed as literal Rich Text or with markup disabled after removing control,
OSC/CSI and bidi sequences. Original bytes/records remain available in normalized provenance;
display sanitization does not change source hashes. Markdown escapes imported content and JSON
exports encode control characters. Reports and artifacts are written only under the workspace.
The MCP child does not inherit Meta credentials. Technical transport output goes to a workspace
log, never into the TUI or MCP stdout. The standalone server reserves stdout for protocol traffic.
Local workspace files are trusted application state; they are not cryptographically signed.
