# macOS demonstration readiness

The hackathon demonstration targets the owner's Mac. Linux and Windows follow-up work is on
hold. Existing test evidence and the automated regression matrix remain available, but additional
platform work is not part of recording preparation.

## Functional readiness

No missing application component currently blocks the core demonstration. The implemented
workflow covers deterministic source generation, real ingestion and alerts, opening a case,
Meta-selected searches through an actual MCP subprocess, source inspection, structured review,
exports and persistent reopening. Tests and real macOS terminal sessions have exercised these
capabilities. A historical live Meta run completed with ten model requests, eight MCP tool calls,
six findings and 27 attached events. That run is evidence of integration, not a guarantee of
current API availability or latency.

The English [180-second script](demo-script.md), [keyboard guide](demo-guide.md),
[recording checklist](recording-checklist.md) and honest manual fallback already exist.

## Remaining preparation before recording

1. **Rehearse the exact complete route on the recording Mac.** A single uninterrupted timed
   rehearsal of the full narration, current investigation question, evidence inspection, benign
   alternative and export has not been recorded. Prior terminal checks exercised real controls,
   but were not a narrated three-minute dress rehearsal. Confirm focus, Fn/function keys,
   scroll positions, font size and the final exported report during that rehearsal.
2. **Measure the live run with that exact question.** The script gives the investigation
   70 seconds; the historical run took approximately 66.5 seconds, leaving about 3.5 seconds.
   That margin is too small to rely on without a current rehearsal. If timing is unsuitable,
   adjust the narration before capture or use the clearly disclosed manual fallback. Do not
   add fake progress, automatically repeat paid requests or present a saved case as a new run.
   A new live rehearsal is an explicit paid model run; no such request was made while writing
   this readiness assessment.
3. **Prepare and inspect the capture.** Preinstall dependencies, prepare `.sentinel-record`,
   configure the key off-camera and use 140×42. Keep the question and two evidence filters ready
   to paste. Record a short sample with the intended screen/audio tools and check readability,
   narration volume and notifications. The optional output-only terminal recorder is available;
   a final narrated video has not been produced.

The recorded facts, uncertainty and source reference must be understandable within the available
screen time. Show one session link, one original record and one explicit benign alternative rather
than trying to read every attached event or finding aloud. The normal guide already provides the
exact session and service-account filters for the committed fictional dataset.

## Optional interface polish

These are possible improvements, not missing controls or prerequisites:

- A compact case-review overview could make one recorded fact, one hypothesis and one open
  question visible together before scrolling through the detailed findings.
- A human-readable evidence summary above the existing full JSON source could make timestamp,
  account, action, resource, filename and source position faster to explain.
- Shorter activity summaries with expandable technical details could make real MCP operations
  easier for an audience to follow. Preserve access to actual arguments, receipts and artifacts.

The current interface already exposes those details. These proposed presentation changes have
not been implemented. Do not expand scope into new integrations or platform work before the
timed macOS rehearsal identifies a concrete obstacle.
