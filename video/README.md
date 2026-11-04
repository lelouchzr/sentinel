# SENTINEL — Follow the evidence

The finished film is **115.2 seconds**, 1920×1080, 30 fps, H.264/AAC stereo. It uses English
motion graphics, real macOS terminal output, licensed instrumental music and CC0 effects.
There is no voiceover, avatar, synthetic product UI or generated footage.

## Deliverables

- `renders/sentinel-demo.mp4`: the ready-to-upload film.
- `renders/sentinel-source.zip`: the complete editable project with media, code and licenses.
- `renders/poster.png`: a frame from the exported video, suitable as a thumbnail.
- `renders/review/`: scene, transition and phone-size review sheets.
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
.video-venv/bin/python video/scripts/mix_audio.py
.video-venv/bin/python video/scripts/build_film.py
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

## Capture provenance and live-model disclosure

The final footage is a real PTY session of Textual, at 140×42, recorded as an output-only
asciicast. A VT emulator rasterizes the observed cells; it does not invent screens or progress.
The capture opens the actual alert, explores the case activity, filters the session, selects the
original download, scrolls its provenance, inspects the backup context, exports both formats and
reopens the saved case in a second application process. Both processes exited with status 0.

The Meta sequence is labeled **“Previously completed live investigation”** throughout. Case
`C-c8e20de558ff` is the earlier actual Meta investigation: ten model requests, eight MCP calls,
27 attached events and six findings. Its stored activity is browsed, never replayed as new tool
responses. The current header correctly shows no key configured in that viewing process.

A new recording attempt, case `C-f9698db08d60`, made ten actual Meta requests and nine MCP calls,
then failed final structured-report validation. Its 27 evidence records and review were retained.
No paid retry occurred. That failed attempt is not spliced into the completed case; it remains
locally in `.sentinel-video` and `artifacts/video-live-attempt-1/` for diagnosis. The output film
uses the honestly labeled completed case instead of fabricating a successful new run.

No API key is included in the film, source recordings, case snapshot or source bundle.
Live capture is an explicitly paid operation, separate from rebuilding this existing film.
`capture_terminal.py --manual` rehearses controls without a model. Its default live mode prompts
for the key privately before capture begins; never add that command to CI or automatic retries.

## Timing and review

The eight scenes cover the full workflow in 115.2 seconds; [SPEC.md](SPEC.md) records the shot
timings and [REVIEW.md](REVIEW.md) records executed checks and limits. The original 180-second
narration in `../docs/demo-script.md` is retained as an optional manual demonstration format.
The delivered music-only film is the current hackathon presentation.
