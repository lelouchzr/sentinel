# Platform support and reproducible validation

The core application targets macOS, Linux and Windows. Python 3.12 is the reference version.
The native CI matrix is defined in `.github/workflows/sentinel-platforms.yml` and runs only on
Sentinel code changes. No CI job has a Meta credential or makes a paid model request.

## Hackathon priority: macOS demonstration

Linux and Windows follow-up work is on hold at the owner's request. The hackathon recording
targets the owner's Mac and macOS only. Additional platform implementation, performance tuning
and a manual Windows Terminal session are deferred; they are not prerequisites for recording.
Completed validation below remains historical evidence. The existing automated CI matrix is
retained unchanged as regression coverage; no new cross-platform work is planned for the demo.
See [macOS demo readiness](demo-readiness.md) for the remaining recording preparation.

## Executed results

The [completed native matrix](https://github.com/lelouchzr/storyscape/actions/runs/41907686724)
passed on 2026-11-04 for application commit `14e27ce459572ae5dfbe5b3530a837de41333e0a`.
Each job checked the locked installation, formatting, lint, wheel build, an independent
runtime-only wheel installation, the full test suite, Textual Pilot and real MCP subprocesses.

| Actual environment | Python | Full test suite | Runtime-only wheel workflow |
| --- | --- | --- | --- |
| Windows Server 2025, AMD64 | 3.12.10 | 35 passed, 608.60 seconds | Passed, 127.12 seconds |
| Ubuntu 24.04, x86_64 | 3.12.3 | 34 passed, 1 skipped, 84.15 seconds | Passed, 14.65 seconds |
| macOS 15.8.2, arm64 | 3.12.10 | 34 passed, 1 skipped, 93.09 seconds | Passed, 16.56 seconds |
| Linux Docker, `python:3.12-slim`, aarch64 | 3.12.16 | 34 passed, 1 skipped, 60.81 seconds | Passed, 10.11 seconds |

The one Unix skip is the Windows-specific drive-path and junction test; that test passed on
Windows. Every environment imported 3,542 events, detected 15 alerts, inserted zero records on
the repeat import, discovered eight actual MCP tools and retrieved the same event ID and source
hashes. Both export formats, case reopening, note persistence and safe demo reset passed.
These are measured runner timings, not a latency guarantee. Windows validation was substantially
slower; the suite performs fresh ingestion for independent workspaces instead of sharing a database.

Inspect the committed [machine-readable results](verification/platform-results.json), including
the CI job links, source hashes, test counts and clean-wheel checks. Raw JUnit and smoke artifacts
are attached to the workflow run for 14 days. Local copies are in the ignored
`artifacts/platform-validation/verified-native-matrix/` directory. The Linux container results and
real terminal recording are also retained locally under `artifacts/platform-validation/`.
Interrupted Windows Server 2022 diagnostic runs are not counted as successful validation.

## Reproduce the checks

```sh
uv sync --locked --python 3.12
uv run ruff format --check .
uv run ruff check .
uv run pytest -q
uv build
uv run python scripts/platform_smoke.py --output artifacts/platform-smoke.json
```

The smoke script creates an independent environment, installs the built wheel with runtime
dependencies only, runs the demo twice, checks stable source hashes, opens a real alert as a case,
saves a note, reopens it, exports both formats, connects to an actual MCP child, retrieves evidence,
and verifies a demo reset preserves archived notes. The resulting JSON records the actual OS,
interpreter, counts, hashes and elapsed time. It never calls a model.

## Portability contracts

- Native filelock backends replace the POSIX-only workspace import. Stable lock files prevent
  changing lock identity; independent acquisitions conflict even within the same thread.
- Lock waits are bounded; cancellation and duplicate runs preserve completed evidence.
- tzdata provides timezone data independently of the host OS. Tests force package-only lookup.
- JSONL generation explicitly uses LF, CSV retains its original CRLF bytes, and Git attributes
  prevent automatic source conversion. Event IDs and provenance remain reproducible across OSes.
- Path validation rejects Windows drive-relative paths, symlinks and reparse points/junctions.
- Reset checks for active cases and closes its own readiness-check handles before archiving.
  Close other sessions before resetting on every OS; reset is not a live maintenance operation.
- The MCP child uses the current interpreter; virtualenv paths are selected for bin or Scripts.

## Scope of terminal support

Headless Textual tests cover 140×42 and 100×30, focus, input editing, event details, notes, export,
case reopening and responsive cancellation. Real PTY checks were executed on macOS in the initial
delivery and on Linux during platform validation. The installed Linux wheel ran at 140×42:
open alert/case, filter service-account activity, inspect and scroll original evidence, export
25 attached events, then quit with exit code 0. Native Windows runner tests are not a manual
ConPTY/Windows Terminal recording; that interactive validation remains outstanding.
The optional asciicast recorder is POSIX-only and returns a clear error on Windows. External
recorders can capture Windows Terminal. Local-disk workspaces are required; shared network-drive
locking and cloud-synchronized reparse-point directories are outside the supported scope.
