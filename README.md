# SENTINEL

**From scattered events to defensible investigations.**

An interactive terminal workspace for investigating authentication, application and file activity.
Import CSV/JSONL, detect transparent signals, open a case, let Meta choose evidence searches through
a real local MCP subprocess, inspect original records, export a report, and resume later.

No website, external database, Docker, cloud account for storage, or GPU is required.
Live AI requires access to Meta Model API. Manual investigation works without an API key.

## Install and launch

Use macOS, Linux, or Windows with [uv](https://docs.astral.sh/uv/getting-started/installation/) installed.
From a clean checkout of `projet/sentinel`:

```sh
uv sync --locked --python 3.12
uv run sentinel doctor
uv run sentinel demo
```

`demo` is the single demonstration command. It generates 3,542 deterministic fictional records in
`.sentinel-sources`, imports them into `.sentinel`, runs three rules, and opens the Textual workspace.
A repeated launch preserves cases and does not duplicate unchanged events. Allow a few seconds for
first ingestion. The default dataset produces 15 alerts; every displayed value comes from storage.

In the checkout created for this task:

```sh
cd /path/to/sentinel
uv run sentinel demo
```

The original project remains on `main` at `/path/to/original-project`.
See [repository preservation](docs/preservation.md) before changing worktrees.

## Enable live Meta investigation

Set a key in the terminal that launches Sentinel. To avoid entering it into shell history:

```sh
read -rs META_API_KEY
export META_API_KEY
export META_BASE_URL=https://api.meta.ai/v1
export META_MODEL=muse-spark-1.3
uv run sentinel demo
```

Type the key after the first command, then press Enter. In shells where `read -s` is unavailable,
use your preferred environment/secret manager. Sentinel does not automatically load `.env` files.
`META_API_KEY` takes precedence over the documented alias `MODEL_API_KEY`. `.env.example` contains
configuration names only. Never put keys in source, reports or recorded terminal input.

**Selected log excerpts and case context are sent to the configured Meta API during live runs.**
Event storage, deterministic rules and manual browsing run locally; AI processing is remote.
The application never silently switches providers or selects an offline fixture.

In the TUI, select the first `AUTH-002` alert with Enter, press F2 and ask:

> Investigate the successful login after failures and the linked session activity. What is
> recorded, what remains uncertain, and which evidence would establish authorization?

The investigator selects MCP tools from actual results. The evidence reviewer checks support,
gaps and alternatives. The reporter produces structured findings. Code rejects invalid references,
renders observed facts from canonical records, and uses computed receipts for quantitative facts.
Model hypotheses and model-authored notes remain explicitly unverified interpretations.

Provider states distinguish missing configuration, unverified configuration, successful connection
and failure. `doctor` checks local readiness only; it does not spend API credit.
Default bounds: 10 model requests, 18 tool calls, 160 distinct retrieved event records, 45 seconds per request, 180 seconds overall.
Override with `SENTINEL_MAX_MODEL_CALLS`, `SENTINEL_MAX_TOOL_CALLS`,
`SENTINEL_REQUEST_TIMEOUT` and `SENTINEL_DEADLINE`. Paid request retries are disabled.
Private model reasoning is neither requested for display nor persisted.

## Windows and platform checks

The core CLI, DuckDB storage, MCP subprocess client/server and Textual UI use portable APIs.
Native file locks use filelock (Unix flock or Windows LockFileEx); tzdata supplies IANA zones on
systems without a timezone database. Generated CSV/JSONL bytes remain identical across platforms.
See [platform validation](docs/platforms.md) for executed results and remaining terminal limits.

In PowerShell, installation and startup use the same uv commands:

```powershell
uv sync --locked --python 3.12
$env:META_API_KEY = [System.Net.NetworkCredential]::new("", (Read-Host "Meta API key" -AsSecureString)).Password
uv run sentinel demo
```

The key prompt is optional for manual browsing. `META_BASE_URL` and `META_MODEL` use the documented
defaults; PowerShell overrides use `$env:META_BASE_URL` and `$env:META_MODEL`.
GNU Make is optional. On Windows, run its checks directly:

```powershell
uv run ruff format --check .
uv run ruff check .
uv run pytest -q
uv build
uv run python scripts/platform_smoke.py
```

The CI matrix uses native Ubuntu, Windows Server and macOS runners. It tests actual MCP children,
Textual Pilot, clean wheel installation, provenance, reset and persistence without model credentials.
The optional bundled asciicast recorder remains POSIX-only; use an external recorder on Windows.

## Terminal controls

Recommended: **140 columns × 42 rows**. The workspace is also tested at **100 × 30**.

| Key/action | Result |
| --- | --- |
| Tab / Shift+Tab, arrows | Move focus and navigate |
| Enter on an alert | Create a case, or reopen the existing case for that alert |
| Enter on a case | Reopen its original dataset and case timeline |
| Enter on an event | Inspect canonical fields, original record, position and file hash |
| F1 | Help and filter examples |
| F2 | Focus the investigation question |
| F3 | Focus exact search filters |
| F4 | Show attached case evidence chronologically |
| F5 | Export selected case as Markdown and JSON |
| Ctrl+G | Cancel the investigation; keep completed work |
| Ctrl+Q | Shut down cleanly |

Evidence supports exact `account`, `ip`, `host`, `action`, `outcome`, `resource`, `session`, `start`,
`end` and `min_bytes` filters combined with AND. Example:

```text
account=morgan ip=203.0.113.74 start=2026-10-20T09:00:00Z end=2026-10-20T09:10:00Z
```

Submit an empty filter to return to the dataset. Pages contain at most 100 records; counts cover all
matches. Tables scroll vertically and horizontally; open an event for all fields on narrow terminals.
The Case review tab accepts analyst notes. Activity shows actual operations, arguments, result counts
and artifact paths. Function keys keep normal text-entry editing shortcuts available.
On macOS keyboards you may need Fn for function keys. `NO_COLOR` is respected.

## CLI workflow

Global `--workspace` must appear **before** the command. State defaults to `SENTINEL_WORKSPACE` or
`.sentinel`. `--json` emits machine-readable output without ANSI where shown in command help.

```sh
uv run sentinel ingest ./examples/company-logs --json
uv run sentinel investigate ./examples/company-logs
uv run sentinel tui
uv run sentinel alerts --json
uv run sentinel cases create --alert ALERT_ID --json
uv run sentinel cases list
uv run sentinel cases open CASE_ID
uv run sentinel cases open CASE_ID --json
uv run sentinel cases note CASE_ID "Check the identity-provider MFA audit trail."
uv run sentinel run CASE_ID --question "Which session links authentication and resource access?" --json
uv run sentinel search --account svc-backup --limit 10 --json
uv run sentinel event EVENT_ID --json
uv run sentinel export CASE_ID --format markdown
uv run sentinel export CASE_ID --format json
uv run sentinel cases status CASE_ID closed
uv run sentinel --workspace .sentinel mcp --case CASE_ID
```

`ingest` and `investigate` run detection. Rerun explicit thresholds with:

```sh
uv run sentinel detect-rules --failures 8 --window 300 --transfer-bytes 100000000 --json
```

Exit codes: 0 success; 2 invalid input/configuration or an incomplete investigation; 3 local I/O/state
failure; 130 interrupted CLI investigation. Typer also uses 2 for invalid command syntax.
A TUI requires a terminal; use `demo --no-tui`, `investigate --no-tui`, or JSON commands in scripts.

## Reproducible data and reset

The generator uses seed **20261104**; it writes into a new or empty directory and never overwrites it.
`examples/company-logs` is the committed reproducible dataset. Source files are opened read-only.
The demo's generated sources remain separate from its mutable workspace.

```sh
uv run sentinel generate-data /tmp/sentinel-variant --seed 17
uv run sentinel --workspace .sentinel-variant ingest /tmp/sentinel-variant --json
uv run sentinel demo --reset
```

`demo --reset` **archives** a recognized generated demo workspace beside its previous path. It never
recursively deletes a directory, never touches source datasets, and refuses a manually imported
workspace. It preserves old cases in the archive. Close other sessions before resetting.
See [schema and provenance](docs/input-schema.md) and [evaluation material](tests/evaluation.md).
The evaluation key is outside the model-visible source directory and is never sent to the agent.

## Tests and recording

```sh
make check
make integration
uv build
```

`make check` runs Ruff formatting/lint and pytest. `make integration` runs actual disposable local
MCP subprocesses; it opens no network listener and never targets production. Offline model fixtures
are clearly labeled and exist only in tests. Neither command calls Meta or reads a live API key.
An explicit paid validation is available with:

```sh
uv run python scripts/validate_live.py --prompt-key
```

Live Meta investigation was exercised against the included data; see [verification](docs/verification.md).
The [demo guide](docs/demo-guide.md), [180-second narration](docs/demo-script.md) and
[recording checklist](docs/recording-checklist.md) include exact launch, keys and honest API fallback.
Actual Textual captures are in [screenshots](docs/screenshots/).

## Further documentation

- [Architecture and trust boundaries](docs/architecture.md)
- [Canonical input schema and provenance](docs/input-schema.md)
- [MCP tools and client connection](docs/mcp.md)
- [Known limitations](docs/limitations.md)
- [Official references](docs/references.md)

This is an investigative aid with three focused rules. It does not claim complete Sigma support,
production SIEM coverage, legal chain of custody or forensic certification. An alert is a signal,
and a recorded download does not establish malicious exfiltration.
