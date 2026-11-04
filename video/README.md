# SENTINEL — Follow the evidence

The revised product film is **144 seconds (2:24)**, 1920×1080, 30 fps, H.264/AAC stereo. It uses English
motion graphics, continuous object transitions, large animated type, an actual-event data plane, an expanded architecture diagram and real macOS terminal output, licensed instrumental music and CC0 effects.
There is no voiceover, avatar, synthetic product UI or generated footage.

## Deliverables

- `renders/sentinel-demo-v3.mp4`: the versioned ready-to-upload film.
- `renders/sentinel-demo.mp4`: the same current film under the standard output name.
- `renders/sentinel-source.zip`: the complete editable project with media, code and licenses.
- `renders/poster.png`: a frame from the exported video, suitable as a thumbnail.
- `renders/review-v3-delivery/`: scene, transition and phone-size review sheets.
- `PUBLICATION.txt`: ready-to-copy description with music attribution and recording disclosure.
- `data/delivery-verification.json`: executed codec, frame, duration, sound and evidence checks.

Large generated audio, MP4s, caches and renders stay out of Git. Small output-only terminal source
recordings, their timestamps, the detached fictional case report, fonts and authoring code are
committed so the film can be rebuilt. The complete ZIP also includes generated local media.
It also contains the two original fictional CSV/JSONL source files, so source positions and
hashes can be inspected independently. Publish with the attribution in `PUBLICATION.txt`.

## Edit or render the supplied complete bundle

Requirements: Node.js 22 or newer and FFmpeg/FFprobe. The production used Node 26.13.0,
Hyperframes 0.9.13 and FFmpeg 9.0.2 on macOS. No HeyGen account, GPU purchase, voice service
or model request is needed to edit or render the existing composition.

Inside this directory:

```sh
npm ci --ignore-scripts
npm run preview
```

Open the local preview at `http://127.0.0.1:3015`. Text, timing and media remain editable in
Hyperframes. This is video authoring tooling, separate from Sentinel's Python runtime.

```sh
npm run check
npm run render
```

The render writes `renders/sentinel-demo.mp4`. To stop only this project's preview:

```sh
npx hyperframes preview --stop
```

## Rebuild generated inputs from a clean Git checkout

From the Sentinel repository root, after installing the normal application environment:

```sh
uv venv .video-venv --python 3.12
uv pip install --python .video-venv/bin/python -r video/requirements.txt
npm ci --prefix video --ignore-scripts
.video-venv/bin/python video/scripts/restore_assets.py
.video-venv/bin/python video/scripts/render_recordings.py video/assets/captures/workflow.cast video/assets/captures/reopen.cast
.video-venv/bin/python video/scripts/build_film.py
.video-venv/bin/python video/scripts/mix_audio.py
cd video
npm run check
npm run render
```

`restore_assets.py` restores the committed terminal output, copies the pinned GSAP runtime and
downloads the official music/effect assets if absent. It verifies their recorded SHA-256 values.
An upstream file changing fails explicitly instead of silently changing the soundtrack.
The bundled fonts have retained OFL licenses. See [CREDITS.md](CREDITS.md).

The detached `data/evidence.json` contains actual computed counts and query receipts from the
captured workspace. `build_film.py` derives event counts, transfer bytes, timestamps, session,
source position, source hash and the backup change reference from those records.
Preparing a new dataset's facts uses `prepare_facts.py` in Sentinel's application environment.
`prepare_event_map.py` produces one point per actual imported record, with positions derived
from timestamp, source type and host. Its 27 case highlights match attached evidence IDs.
The data plane, architecture and session ribbon are editorial explanations, not additional
interactive graph features in the application.

## Capture provenance and live-model disclosure

The final footage is a real PTY session of Textual, at 140×42, recorded as an output-only
asciicast. A VT emulator rasterizes the observed cells; it does not invent screens or progress.
The capture opens the actual alert, explores the case activity, filters the session, selects the
original download, scrolls its provenance, inspects the backup context, exports both formats and
reopens the saved case in a second application process. Both processes exited with status 0.

The film uses **the verified live Meta investigation recorded on 2026-11-04**, case
`C-6648e4baf12a`. This editing revision makes no additional paid model request.
It completed in **51.26 seconds** with ten model requests, nine actual MCP calls,
27 attached events and four findings. The on-screen disclosure says **“Recorded live · 2.03×
playback”**. The investigator selected searches from actual tool results; reviewer and reporter
handoffs derive from persisted timestamps. No deterministic model fixture was used in this take.

The report request uses Meta's documented `json_schema` response format with `strict=true`.
All model-authored fields are required; system-owned verification is excluded. Pydantic,
retrieved-reference checks and deterministic quantitative verification still run locally.
The answer-only response is retained before validation, with credential redaction, a size bound,
finish reason and safe diagnostic paths. Refusals and truncated reports preserve partial work.
`data/meta-report-response.json` captures this successful fictional-data response for offline
regression tests; it does not contain private model reasoning or a key.

The prior failed attempt `C-f9698db08d60` remains documented in `data/capture-attempts.json`.
Its raw final response was not retained by the old implementation, so its exact schema violation
cannot be reconstructed. Earlier completed films and source bundles are preserved locally under
`renders/revisions/v1/` and `renders/revisions/v2/`. A new user request authorized this fresh run; no automatic paid retry
was made. The previous saved-case segment has been replaced, not mixed with the new results.

No API key is included in the film, source recordings, case snapshot or source bundle.
Live capture is an explicitly paid operation, separate from rebuilding this existing film.
`capture_terminal.py --manual` rehearses controls without a model. Its default live mode prompts
for the key privately before capture begins; never add that command to CI or automatic retries.

## Timing and review

The twelve scenes cover the full workflow in 144 seconds; [SPEC.md](SPEC.md) records the shot
timings and [REVIEW.md](REVIEW.md) records executed checks and limits. The original 180-second
narration in `../docs/demo-script.md` is retained as an optional manual demonstration format.
The delivered music-only film is the current hackathon presentation.

## Reopen this captured investigation locally

The recording workspace remains available on the production Mac:

```sh
uv run sentinel --workspace .sentinel-video-live-v2 cases open C-6648e4baf12a
```

Run that from the Sentinel repository root. No key is needed to browse the saved case.
The generated workspace is intentionally ignored by Git; a clean clone can inspect the
detached fictional case and evidence in `data/case-report.json` or start a fresh `sentinel demo`.

## Reference-driven motion revision

The owner supplied the official Storyboard First and Everything Was Written films. Both
were inspected as actual video frames. Revision 3 uses their product → detail → return camera
logic, large masked/slammed type, moving carrier objects and contrast in scale. It adds a
16-second explicit architecture passage: Python runtime, MCP child process over stdio,
DuckDB and JSON cases locally; selected excerpts and tool decisions cross HTTPS to Meta.
Blue/cyan stages link these passages. The live activity chapter uses a contrasting dark ground.
No footage, music, mascot or branding from either reference is reused in the delivered files.
The exact 144-second plan is in STORYBOARD.md and SPEC.md.
