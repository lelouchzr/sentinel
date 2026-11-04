# Executed verification

Verified on 2026-11-04 on macOS (Darwin), CPython 3.12.16. Linux was not executed here.
All checks below were actually run. No check or CI target invokes a paid provider.

| Check | Executed result |
| --- | --- |
| `make check` | Ruff format check, Ruff lint, and 30 pytest tests passed; final full run 87.57 seconds |
| `make integration` | 8 tests passed, 22 deselected; actual disposable MCP stdio subprocesses; 48.55 seconds |
| `uv lock --check` | Lockfile consistent with pinned project requirements |
| `uv build` | Source distribution and installable wheel built successfully |
| Independent clean-source installation | `uv sync --locked --python 3.12`, doctor, demo, reimport all succeeded outside the worktree |
| Clean wheel installation | Runtime dependencies only; imported module from isolated site-packages; demo, case creation/reopen and JSON export succeeded |
| Demo repeat import | 3,542 events / 15 alerts; second launch inserted 0 events |
| Demo reset | Archived generated demo state with its case/notes preserved; refused manual workspace reset |
| Standalone CLI MCP entry | Client launched `sentinel ... mcp`, initialized, discovered eight tools and retrieved the 3,542-event summary |
| TUI Pilot | 140×42 and 100×30 navigation, help, filtering, provenance dialog, note entry, export, reopening, normal text entry |
| TUI worker | Help/navigation remained usable during a real MCP investigation using the labeled offline provider; cancellation retained completed evidence |
| Real PTY, 140×42 | Opened alert/case, filtered svc-backup, opened original event, scrolled to approval context/hash, exported, clean Ctrl+Q exit 0 |
| Real PTY, 100×30 | Opened case, displayed narrow layout, opened/dismissed help, clean Ctrl+Q exit 0 |
| Original repository | Still main at the original SHA; clean tracked/untracked status; all 210 tracked files matched pre-work SHA-256 baselines; 19 ignored status groups remained |

The tests include CSV/JSONL, positions and stable IDs, UTC/DST conversion, malformed/empty input,
reimport, a second seed/account variation, rule thresholds/windows, bounded/parameterized searches,
computed quantities, case integrity, invalid/unseen/foreign evidence references, exports, missing
and invalid configuration, provider HTTP failure without retry, per-request and total deadlines,
cancellation/partial results, control/markup safety and workspace path boundaries.

## Real Meta investigation

An explicitly requested paid run used Meta Model API with `muse-spark-1.3` at
`https://api.meta.ai/v1`. The key was entered through a hidden getpass prompt, used in process
memory and not saved in source, reports, environment files, traces or recordings. No automatic
retry occurred. There was no provider substitution.

- Case: `C-c8e20de558ff`.
- Dataset: `D-5c9f98be2b243b47d24d0964`, generated from the committed demo seed.
- Ten actual model requests; eight actual MCP tool calls; all eight tool schemas discovered.
- Meta selected entity activity, event search, specific event retrieval, evidence attachment and
  note persistence from actual results. Specific event retrieval was called twice.
- Distinct investigator, evidence-review and reporting steps completed.
- Six accepted findings and 27 attached events; status reviewed.
- Approximately 66.2 seconds for the investigation and 66.48 seconds including exports.
- The live API emitted a nested filter object as a JSON string. Final code normalizes that known
  field before typed MCP validation; the offline regression exercises the captured format.
- The saved report was revalidated with the final deterministic checks and summary rendering
  without making another paid model call. That distinction is recorded in its activity.

Inspect [live-run metadata](verification/live-run.json) and the
[self-contained report snapshot](verification/live-report.json). The snapshot contains fictional
source records, hashes, query receipts and visible action summaries. It contains no raw private
reasoning or API key. Local working reports also remain under `.sentinel-live/reports/`.
The snapshot is historical validation evidence, never a live model substitute.

## Recording artifacts

Actual Textual SVG captures are in `docs/screenshots/` at both target sizes, including the case,
activity and original-evidence dialog. They show a saved previously completed live case; the
capturing process has no key configured, as the header honestly indicates. Color captures were
made in a process with NO_COLOR unset; the normal application still respects NO_COLOR.

Output-only real terminal recordings are available locally at `recordings/manual-140.cast` and
`recordings/manual-100.cast`, with parsed frame text for inspection. These are manual UI smoke
sessions, not a three-minute live video. They are deliberately ignored by Git. The exact
180-second narration, recording commands, reset procedure and honest API fallback are complete.
Recording the final narrated video remains the user's optional step.

## Platform and product limits

See [limitations](limitations.md). This is a focused hackathon investigation application, not a
production SIEM or forensic certification. Mechanical reference checks validate provenance and
canonical observations; they do not establish malicious intent or every semantic hypothesis.
