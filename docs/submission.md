# Hackathon submission kit

All form copy below is English. Paste only the answer text into each field. These drafts describe
implemented behavior and the recorded live run; they do not claim production SIEM coverage.

## Which track are you submitting to?

Indie developer track

This recommendation assumes an individual or student submission rather than an established
startup team. Use the exact matching option in the form.

## Which problem statement did you build towards?

Build for Your World

SENTINEL applies Meta models to a practical security administration problem: reconstructing
suspicious activity from scattered logs and producing an investigation another person can review.
The [official event page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) describes this
theme and the Indie developer track. If the form has a separate domain subcategory, select the
closest security or developer productivity option; do not invent an official statement label.

## Most Viral Track: X post link

Leave this field empty unless you are entering that category and have actually published a
project post. No X post has been created by this submission kit.

## Project Description

SENTINEL turns scattered security logs into investigations that another analyst can inspect and resume.

Administrators and small security teams often have authentication failures in one file, application activity in another, and a suspicious export somewhere else. SENTINEL brings them into one terminal workspace: import CSV or JSONL, detect transparent signals, open a case, investigate, inspect original evidence, and export a report.

The application combines Python, Textual, DuckDB, Meta Model API and a real local MCP server. Deterministic rules surface repeated login failures, successful authentication after failures, and large downloads. Meta's Muse Spark model then chooses focused MCP searches from actual tool results, follows accounts, IPs, hosts and sessions, and develops an explanation. Separate investigator, evidence reviewer and reporter stages make the handoffs visible.

Findings distinguish observed facts, hypotheses and open questions. Code validates event references and supplies computed quantities; source filenames, record positions and file hashes remain inspectable. Cases retain evidence, notes, tool activity and summaries across restarts. An alert is a reason to investigate, not proof of compromise, and a download alone does not establish malicious exfiltration.

The included deterministic dataset contains 3,542 fictional events, suspicious sequences and a legitimate batch job that provides an alternative explanation. The 2:24 demo includes a real Meta investigation that completed in 51.26 seconds, made nine actual MCP tool calls and retained 27 evidence events. Its accelerated playback is labeled. Manual browsing, detection, case management and export also work without an API key.

SENTINEL runs as a local terminal application with no browser dashboard, external database or GPU requirement. Selected evidence excerpts are sent to Meta during live AI investigations. The hackathon demo targets macOS and is backed by automated ingestion, detection, MCP subprocess, persistence, safety and terminal navigation tests.

## Public GitHub Repository

https://github.com/lelouchzr/sentinel

## 3-Minute Demo Video

The approved video is 2 minutes 24 seconds, within the three-minute maximum.

- Download: [sentinel-demo.mp4](media/sentinel-demo.mp4).
- Public repository video page: https://github.com/lelouchzr/sentinel/blob/main/docs/media/sentinel-demo.mp4
- Direct public MP4: https://raw.githubusercontent.com/lelouchzr/sentinel/main/docs/media/sentinel-demo.mp4
- YouTube: upload the approved MP4, then paste its real watch URL into the form. This kit does not
  invent a YouTube link or claim the video has been uploaded. Use the GitHub/MP4 link only if the
  submission form accepts that type of video URL.

## Describe your use of Meta products to build the submitted project

SENTINEL uses Meta Model API with muse-spark-1.3 as the live investigation engine. It is integrated into the running application, rather than used only to write a final summary.

The runtime launches a workspace-bound MCP server over stdio, initializes an actual MCP client and discovers the available tool schemas. It retrieves dataset context and alerts, then lets the Meta model choose subsequent investigative tool calls from the returned evidence. Tools provide bounded event searches, original records, entity activity, timelines, evidence attachment and case notes. No unrestricted SQL or shell tool is exposed.

Three sequential roles share the configured Meta model. The investigator selects searches and develops hypotheses. The evidence reviewer checks support, gaps and benign alternatives. The reporter produces a structured case summary through strict JSON-schema output. Pydantic and deterministic code validate that references belong to retrieved events in the active dataset. Observed facts and numerical statements come from canonical records and computed receipts; model interpretations remain explicitly labeled.

The recorded live run used https://api.meta.ai/v1 and muse-spark-1.3, completed ten model requests and nine actual MCP calls, attached 27 events and saved four findings. It completed in 51.26 seconds without automatic paid retries. Source captures, the structured response and verification records are included. Timeouts, request/tool budgets, cancellation and atomic case storage preserve partial work when a run cannot finish.

Storage and deterministic analysis run locally; selected log excerpts and case context are sent to the configured Meta API. The model and base URL are configurable, and the application never silently substitutes another provider. The delivered runtime did not use Muse Code, SAM, Meta image generation, Fireworks, Modal or Baseten.

## Why are Meta's models important to your solution?

Rules can identify a repeated login failure or a large download, but they do not decide which related records an analyst should inspect next or explain what is still uncertain. Meta's model supplies that adaptive investigation layer.

Muse Spark reads the current case context and actual MCP results, chooses targeted searches, follows session and entity relationships across log sources, and proposes explanations and follow-up questions. A reviewer stage challenges unsupported conclusions and considers alternatives, such as a legitimate batch job that also triggers a volume alert. A reporter stage turns the evidence and review into a structured, persistent handoff.

This makes the workflow useful beyond a fixed detection script: the analyst can ask a focused question and the next searches depend on the evidence already returned. The interface shows the real operations, while event IDs and source references let the analyst inspect what each conclusion relies on.

The model is important because it interprets context and directs the inquiry; the application remains responsible for storage, counts, timestamps, reference validation and displaying evidential limits. This division keeps model-generated hypotheses separate from observed facts. It does not guarantee that every interpretation is correct.

The completed live investigation demonstrates this integration with actual Meta requests and MCP calls. We have not benchmarked this workflow against other providers and do not claim that Meta is the only model family that could support the architecture.

## Provide feedback from your experience using partner technologies

No partner inference platforms were used; we integrated Meta Model API directly. Strict JSON-schema output made case reporting more reliable.

This answer is under the 150-character limit. Do not claim experience with Fireworks, Modal or
Baseten: they were not part of the delivered runtime.

## Additional questions shown in the screenshots

These are suggested selections grounded in this project. Personal recommendation scores and
future plans belong to the submitter; change them to reflect your own opinion. Nothing in this
kit submits the form or accepts promotional terms on your behalf.

| Form question | Suggested response | Basis or caveat |
| --- | --- | --- |
| How likely are you to build with Meta Model API? | Very likely | Suggested intention, for you to confirm. |
| Overall opinion of Meta Model API | Somewhat favorable | The live workflow worked; structured-output integration required debugging. This is a suggested personal assessment. |
| Recommend Meta Model API, 0–5 | 4 | Suggested score, not a measured benchmark or a rating you have already given. |
| Recommend Muse Code, 0–5 | Leave unanswered if optional | Muse Code was not used for this project. If required, ask the organizer for a not-applicable option; a numeric rating would imply experience we do not have. |
| Biggest obstacle | Something else (please specify) | Use the text immediately below. |
| Compared with other models for this work | We haven't used other models for this kind of work | No comparative investigation benchmark was run. Coding assistance is a different task. |
| What matters most when choosing a model/tool? | Agent abilities such as tool calling and multi-step tasks | This is the central model responsibility in SENTINEL; change if your personal priority differs. |
| Hardest part of switching model/tool | Our product is tuned to our current model's behavior and prompts | APIs are configurable, but structured output and investigative behavior need revalidation. |
| What could stop production adoption? | How our data and our users' data would be stored or used | Real security logs can be sensitive; the demo uses fictional data and does not establish production suitability. |
| Permission to use, publish, share and promote submitted materials | Read the terms and choose personally | Public repository sharing does not itself accept this separate promotional permission. |

Biggest obstacle, free-text answer:

Making multi-step tool use produce a strictly validated, evidence-backed report. We fixed JSON-schema handling, retained partial results on failure, and added regression coverage for captured Meta response formats.

## YouTube publication package

Suggested title:

SENTINEL: From Logs to Evidence | Meta AI + MCP | Hackathon Demo

Thumbnail: [sentinel-youtube-thumbnail.png](media/sentinel-youtube-thumbnail.png).

Suggested opening description:

SENTINEL is a terminal-native security investigation workspace powered by Meta Model API and real MCP tools. Import logs, investigate signals, inspect original evidence, export a report and resume a case.

Built for the Meta Global AI Developer Hackathon 2026. Repository: https://github.com/lelouchzr/sentinel

This 2:24 edited macOS demo uses fictional logs and a real recorded Meta investigation. The live segment is shown at the labeled 2.03x playback rate. Selected evidence excerpts are sent to Meta during live investigations. Alerts are investigative signals, not proof of compromise.

Append the complete [publication credits](../video/PUBLICATION.txt), especially the required
music attribution, to the uploaded video's description. No voiceover service was used.

Suggested hashtags: #MetaHackathon #MetaAI #MCP #Cybersecurity #SENTINEL.

Before submitting:

1. Confirm the GitHub link opens while logged out.
2. Upload the approved MP4 to YouTube as public or unlisted and add the thumbnail and full credits.
3. Check the video link in a logged-out window, including sound and legible terminal footage.
4. Paste the actual YouTube watch URL, the repository URL and the form answers above.
5. Review the subjective survey choices, eligibility, team details and promotional permission.
6. Submit once and retain the submission confirmation.
