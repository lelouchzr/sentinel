# Three-minute demonstration guide

The current delivered presentation is the [115.2-second Hyperframes film](../video/README.md),
with no voiceover. Three minutes is the maximum, not a required duration. The manual narrated
format below and its original 180-second script remain available as an alternative.

The current recording target is the owner's Mac and macOS. Linux and Windows follow-up work
is on hold; their historical test results are retained in [platform validation](platforms.md).
See [demo readiness](demo-readiness.md) for completed capabilities and remaining preparation.

Recommended terminal: **140×42**, dark theme, a readable 16–18 pt monospace font. Minimum tested:
100×30. Keep system notifications and unrelated applications out of the recording. Only fictional
example data should be visible. Do not record key entry or shell history containing credentials.

## Preparation

```sh
cd /path/to/sentinel
uv sync --locked --python 3.12
make check
uv run sentinel doctor --json
```

Export META_API_KEY privately as described in the README. Keep `META_BASE_URL=https://api.meta.ai/v1`
and `META_MODEL=muse-spark-1.3`, unless your account requires a different explicitly selected model.
The key is not saved by Sentinel. `Configured, not yet verified` means configuration exists, not
that the API has connected. Only a successful model response changes that state.

Prepare a separate recording workspace and rehearse a live run before recording:

```sh
uv run sentinel --workspace .sentinel-record demo --no-tui
uv run sentinel --workspace .sentinel-record demo --reset --no-tui
```

The second command archives recognized demo state; it does not delete source data or old cases.
Close other Sentinel sessions before resetting. Reset refuses a manual workspace. A rehearsal is a
real paid investigation, not an automatic retry. Live validation measured about **51.3 seconds** for
the full three-role investigation, excluding first import. Reserve 70 seconds in the timed script;
latency is not guaranteed. If your rehearsal is slower, use the honest manual fallback below.

One command starts the demonstration:

```sh
uv run sentinel --workspace .sentinel-record demo
```

For optional terminal recording, use the included POSIX recorder instead:

```sh
uv run python scripts/record_terminal.py --workspace .sentinel-record --output recordings/sentinel.cast
```

It launches the same application at 140×42 and writes an asciicast v2 file. It records terminal output
and forwards keystrokes, without storing input events or environment secrets. Record the final video
with your preferred capture tool or an optional asciicast player. No recorder/player is needed to run
Sentinel itself. Actual captures of the implemented interface are in `docs/screenshots/`.

## Short keyboard sequence

1. After launch, the Alerts table has focus. Press Enter on the first `HIGH AUTH-002` row to open its
   case. The evidence table shows its real triggering sequence. The status and case ID are visible.
2. Press F2 and paste the question below, then Enter. Activity becomes active. Show actual tool
   discovery, arguments, result counts and Investigator → Evidence reviewer → Reporter handoffs.
3. After completion, select Evidence (F3), replace the filter with `session=session-702`, Enter,
   Tab to the table, Down twice, Enter. This opens the download's original record. Scroll inside
   the dialog to show filename, record/line number, SHA-256 and original fields. Escape closes it.
4. Select Case review to show observed facts, hypotheses, verification limits and open questions.
5. Press F3; replace the filter with `account=svc-backup`, Enter, Tab, Enter. The job-start record
   includes logged approval context. Explain that this is supporting context, not independent approval.
6. Escape, then F5. The notification and Activity show the real report directory. Ctrl+Q exits.

Suggested focused question (use this exact text for a short rehearsal):

> Trace this login and its session activity. Retrieve specific original events. Separate recorded facts from hypotheses and explain what would establish authorization. Use a small number of focused MCP searches and then conclude.

If function keys control macOS media, hold Fn. Use Ctrl+A only inside inputs to replace text.
Tab/Shift+Tab navigate all controls; clicking a tab is also supported. Ctrl+G cancels with completed
work retained. F4 returns to the selected case's attached timeline. Use `cases open CASE_ID` after
restarting to prove persistence. A reopened report must be introduced as previously saved.

## Honest API fallback

If Meta is unavailable, say: **“The Meta request is unavailable in this session. I will show the
local evidence workflow; this is manual investigation, not a simulated AI response.”**

The same demo opens without a key. Select the alert, inspect the chronological failures, then use
`session=session-702` to inspect the successful login, access and download records. Add an analyst
note in Case review. Show `account=svc-backup` and its recorded change context. Press F5 to export
and reopen the saved case. Activity will show no fabricated model response. If a prior live case is
available, label it “a previously completed live investigation” and show its persisted activity.
Do not use the test provider or hide provider status in the recording.

## Reset and repeat

```sh
uv run sentinel --workspace .sentinel-record demo --reset
```

This archives only recognized generated demo state and relaunches it. The original project, the
committed examples and unrelated workspaces are untouched. For a fresh independent dataset:

```sh
uv run sentinel generate-data /tmp/sentinel-second-seed --seed 17
uv run sentinel --workspace .sentinel-variant investigate /tmp/sentinel-second-seed
```

Narration and timings: [demo-script.md](demo-script.md). Final preflight:
[recording-checklist.md](recording-checklist.md).
