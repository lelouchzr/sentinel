# Quality, evaluation, and demonstration

Status: local verification is underway with deterministic fixtures, provider mocks, and an embedded PostgreSQL database. Real provider benchmarks and cloud end-to-end verification are pending.

## What the first release must demonstrate

- A user can bring vocabulary and confirm its meaning.
- A short conversation creates meaningful opportunities to use selected expressions.
- Help is available, and the application remembers when it was supplied.
- Feedback is grounded in actual learner turns and can remain uncertain.
- Later practice follows observed needs without claiming mastery from one attempt.

## Offline checks

Use original fixtures and test doubles for routine checks. No paid calls in CI.

| Area | Meaningful cases |
| --- | --- |
| Imports | BOM/CRLF, quoted CSV, multi-column mapping, malformed JSON, duplicate meanings, unsafe HTML, limits |
| Page extraction | Missing translation, ambiguous Hangul, generated vs extracted content, unconfirmed draft |
| Evidence | Missing or foreign turn IDs, invented quotes, changed transcripts, contradictory outcomes |
| Learning | Correct paraphrase, assisted reuse, absent opportunity, explicit inability, uncertain recognition |
| Requests | Duplicate submit, interrupted audio, TTS failure after saved reply, ambiguous provider timeout |
| Access | Other account's collection/session/upload ID, signed-link expiry, deletion and orphan cleanup |
| Budget | Simultaneous reservations near the cap, unknown cost, failed reconciliation, disabled providers |

## Small real-provider evaluation

When development is authorized, begin with a bounded set of original short recordings and vocabulary pages. Record the actual model, prompt version, language context, input type, latency, usage, and observed failure. Do not call synthetic transcripts an audio test.

For each sampled conversation, review whether the reply is relevant, whether the requested politeness is appropriate, whether there was a real opportunity to use the target, and whether the evaluation quotes valid evidence. A Korean-speaking reviewer is desirable before making language-quality claims; label unreviewed material clearly.

Measure median and high-percentile turn latency once there are enough real turns. Report the sample size. Track the fraction of schema-valid outputs and evidence-valid observations separately from pedagogical correctness. Test speech on the intended desktop and mobile browser rather than assuming microphone/audio support is identical.

No numeric accuracy or learning-gain result is claimed before measurement. A successful demo does not establish durable retention or CEFR proficiency.

## Error states to see in the browser

- Microphone permission denied or unavailable.
- Empty recording or a clip over the duration/byte limit.
- Unsupported source format or unreadable image.
- No relevant vocabulary for the selected situation.
- Provider unavailable, malformed output, or exhausted quota.
- A saved text reply whose playback failed.
- Session interrupted and subsequently resumed without duplicate turns.

## Demonstration script

1. State the personal motivation: learning Korean to live and work in South Korea.
2. Import the original Korean/French sample or photograph an original printed vocabulary list.
3. Show the confirmation preview and select three expressions.
4. Start a polite everyday request scenario with a genuine provider connection.
5. Request a hint on one expression and continue the conversation.
6. Show another meaningful opportunity, accepting whichever valid wording the learner uses.
7. Open the report: exact sentences, assistance status, and an unobserved or uncertain item if that is what happened.
8. Show the proposed next practice and explain what was built during the hackathon.

Record a backup demonstration for delivery reliability. If showing a recording or a fixture, identify it as such. Do not stage a false improvement or claim a pre-recorded response is a live provider call.

## Release gate

Before declaring the MVP complete, verify the actual end-to-end flow, tenant isolation, secret boundaries, bounded spending, known failure states, and deployment. Record what was checked and what remains uncertain. Preserve enough schedule margin to submit without last-minute feature additions.

## Local verification — 29 October 2026

- 85 unit/integration cases passed, including actual PostgreSQL migration/RLS/accounting behavior, provider HTTP contract fixtures, WAV bytes, evidence validation, review scheduling and route authorization.
- 6 Playwright browser journeys passed in local Chrome, with API mutations blocked and live AI disabled.
- Production build, TypeScript checks, and documentation checks passed.
- Import editing, persistence after reload, recall, configuration states and responsive layout were also inspected in the browser.

These results do not cover live Meta/Azure calls, a hosted Supabase instance, physical microphone quality, speech latency, or semantic correctness of generated Korean.
