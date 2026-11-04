# SENTINEL narration — exactly 180 seconds

This is the optional original narrated format. The current delivered presentation is the
[115.2-second music-only Hyperframes film](../video/README.md), within the three-minute maximum.

The intervals below total **180 seconds**: 18 + 17 + 15 + 70 + 20 + 20 + 20.
Actions and quiet observation are part of each interval. Do not accelerate/fabricate model activity.
The live-operation allocation reflects the measured 66.5-second validation. Rehearse with current
API latency. If it exceeds this allocation, use the explicitly labeled manual fallback in the guide.

| Time | Duration | Screen/action | Narration |
| --- | ---: | --- | --- |
| 00:00–00:18 | 18 s | Terminal, command ready | “Security investigations often start with scattered authentication, application and download logs. SENTINEL brings those records into one terminal workspace, so an analyst can ask what happened, inspect the source, and distinguish evidence from interpretation.” |
| 00:18–00:35 | 17 s | Run `uv run sentinel --workspace .sentinel-record demo`; show header and alerts | “This reproducible dataset has three thousand five hundred forty-two fictional events. The import normalizes timestamps, preserves source positions and hashes, and runs three transparent rules. These fifteen alerts are signals to investigate, not proof of compromise.” |
| 00:35–00:50 | 15 s | Enter first AUTH-002; F2, paste question, Enter | “I will open the authentication signal as a case and ask Meta to trace the session. The case starts with actual triggering events, and its evidence will survive a restart or an interrupted request.” |
| 00:50–02:00 | 70 s | Activity; watch actual MCP calls, counts, review and reporting | “The client discovers tools from a real local MCP subprocess. Meta chooses each next search from the results it receives. Here we can inspect the search arguments, returned counts and saved artifacts. The logs are data, never instructions. The investigator gathers records. The evidence reviewer checks gaps and alternatives. The reporter returns structured findings. Code then validates event references and computes quantitative facts. A successful login can be observed; who operated it and whether it was authorized may still be unknown.” Pause naturally as real operations progress. If the run finishes early, inspect its activity arguments and counts for the remaining interval. |
| 02:00–02:20 | 20 s | F3, `session=session-702`, Enter, Tab, Down twice, Enter; inspect original; Escape | “This session links a recorded successful login, resource access and download. Opening the event reveals its original fields, relative source filename, record position and SHA-256. The timeline and report point back to these records rather than an unsupported narrative.” |
| 02:20–02:40 | 20 s | Case review, then F3 `account=svc-backup`; Enter, Tab, Enter | “The review separates recorded facts from hypotheses and open questions. A large transfer alone does not prove malicious exfiltration. This other account also triggers the size rule, but its job records contain an approved-backup explanation. That is evidence to check, not something the model should ignore.” |
| 02:40–03:00 | 20 s | Escape, F5; show export notification; Cases/reopen if time | “The case exports as Markdown and JSON with evidence, computed queries and the source manifest. It can be reopened after restarting. Meta directs the investigation and reviews interpretations; MCP provides controlled access to the evidence. SENTINEL turns scattered events into an investigation another analyst can inspect.” |

At 03:00, end the recording. No artificial waiting is implemented in the product. Do not claim a
current successful live run if the provider state is failed, unconfigured, or a saved case is open.
A manual fallback uses the same 180-second intervals, with the 70-second activity interval replaced
by visibly manual filtering, event inspection and note-taking. Begin that interval with the exact
API-unavailable disclosure from the guide, and state that no live AI result is being shown.
