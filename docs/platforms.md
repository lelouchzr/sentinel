# Platform support and reproducible validation

The core application targets macOS, Linux and Windows. Python 3.12 is the reference version.
The native CI matrix is defined in `.github/workflows/sentinel-platforms.yml` and runs only on
Sentinel code changes. No CI job has a Meta credential or makes a paid model request.

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
delivery. Native Windows runner tests are not a manual ConPTY/Windows Terminal recording.
The optional asciicast recorder is POSIX-only and returns a clear error on Windows. External
recorders can capture Windows Terminal. Local-disk workspaces are required; shared network-drive
locking and cloud-synchronized reparse-point directories are outside the supported scope.

Executed results and CI evidence are recorded after the native matrix completes.
