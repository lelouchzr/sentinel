# AI and learning behavior

Status: provider adapters, bounded prompts, speech provenance, transcript amendments, disputed feedback, and oral-review rules are implemented and tested locally with fixtures and mocked HTTP. The application also includes scripted local practice. No real provider has been called or evaluated yet.

## Provider responsibilities

| Provider/model | Implemented adapter use | Why |
| --- | --- | --- |
| Meta Muse Spark (`muse-spark-1.3`) | Page extraction, scenario planning, dialogue, evidence-linked feedback | One multimodal model can work with the learner's text and page images |
| Meta Muse Voice Transcribe (`muse-voice-transcribe-1.0`) | Korean audio transcription | The official documentation lists Korean and language switching |
| Azure AI Speech (initial candidate `ko-KR-SunHiNeural`) | Korean reply playback | A documented Korean neural voice to test for clarity and latency |

These are model candidates and documented capabilities, not measured quality claims. Confirm account entitlement, current API contracts, and Korean behavior at the first authorized development experiment. No custom training or fine-tuning is planned.

Meta's model page distinguishes normal and contributor variants; do not silently switch to a variant with different data-use terms because it is cheaper. The initial candidate is the normal `muse-spark-1.3` ID.

## Audio integration facts

The [speech documentation](https://dev.meta.ai/docs/speech-to-text) describes a multipart recording endpoint and a live WebSocket endpoint. Start with the recording endpoint and explicit turn boundaries. Its documented output has turn timestamps, but no word-level timestamps or ASR confidence scores. Design uncertainty handling around user correction, empty/failed recognition, and supported evidence rather than invented confidence fields.

Korean/French language hints may be evaluated. Avoid using target-word bias as proof that a learner pronounced or retrieved those words: bias can influence recognition. A successful transcript is not a pronunciation assessment.

## Bounded model operations

1. **Extract vocabulary:** return proposed fields, source provenance, ambiguous entries, and missing translations. Do not silently invent missing content.
2. **Plan a session:** use the three confirmed targets selected by the learner, a supported scenario family, a goal, and the speaker relationship to propose opportunities. Incompatible vocabulary yields a useful selection explanation.
3. **Respond to a turn:** stay in role, maintain context, react to the learner's meaning, and avoid revealing every target before the learner has tried.
4. **Generate help:** use the requested hint level and mark what was disclosed.
5. **Evaluate evidence:** propose bounded observations with exact learner-text references and an explicit reason. The application validates and persists only supported results.

Keep prompts versioned with a schema version. Use the same Zod contract for runtime validation and provider JSON Schema when the verified API supports it. Do not maintain a second divergent handwritten schema.

## Conversation rules

- Keep responses short enough for a learner to process and for predictable synthesis latency.
- Use the selected Korean relationship/politeness context consistently. Accept correct alternatives appropriate to that context.
- Let the learner take a valid conversational direction; adapt the next opportunity rather than forcing one exact answer.
- Send the bounded session snapshot, with at most eight learner turns, to the model. The database, not the model's memory, is authoritative.
- After assistance, offer another context when appropriate. Record immediate reuse as such, without claiming durable mastery.
- Do not infer the learner's identity, personality, emotion, or ability from their voice.

## Feedback contract

A candidate observation contains `targetId`, `outcome`, `opportunity`, `evidence: [{ turnId, quote }]`, `explanation`, and `nextPractice`. The session stores hint history separately. There must be exactly one observation for each of the three targets. The application rejects unknown targets and ambiguous turn IDs, and neutralizes unsupported quotes or claims without evidence. Absent opportunity becomes `not_observed`; relevant earlier hints or partner-supplied wording downgrade independent use to assisted use.

A valid paraphrase may complete the communication goal without testing the exact expression. Absence of the target string is not failure. Korean particles, conjugations, and polite endings require semantic interpretation; exact string matching alone is insufficient.

Learners can correct a saved learner turn after completion. The correction retains its turn ID, marks it corrected, increments the session revision, and records a private before/after audit. It withdraws the entire dependent feedback snapshot and its oral-review contribution. An explicit request creates a fresh evaluation; correcting text itself makes no provider call. An expired conversation can be evaluated, but cannot receive another turn or hint.

Flagging a target observation as wrong records a private reason and immediately makes that observation `uncertain`, with no evidence or oral-review contribution. Other observations remain available. The flag persists through transcript corrections and later evaluations of that session; another model response cannot silently reinstate the disputed judgment. A new session can produce new evidence.

Neither the private correction audit nor the flag's free-text reason is sent to the model. Evaluation receives the current confirmed text and the IDs of excluded targets. Feedback contains no numerical fluency, pronunciation, or mastery score.

## First oral-review policy

The implemented `oral-v1` policy schedules a supported difficulty after ten minutes, assisted use after one day, and independent use after one, three, seven, then fourteen days as spaced independent sessions accumulate. A second success within twenty-four hours does not increase that count. Replaying the same session cannot count twice, and an older recovered session cannot replace more recent practice state. These are initial application rules, not measured learning-efficacy claims.

Keep oral state independent of written flashcard scheduling. Do not import or reproduce FlashCardStudy's scheduler automatically in this new repository. Historical outcomes, assistance, and policy version must make due-date decisions explainable.

The UI derives review state from the account's loaded session history, so an amendment, dispute, or deletion removes its earlier contribution. If history cannot be loaded completely within the interface's bound, the oral calendar is suspended rather than calculated from a partial history. `not_observed` and `uncertain` never create a penalty.

## Local practice without services

Local mode uses predefined Korean dialogue for the three scenario families and hints drawn from confirmed vocabulary. It is explicitly labeled as scripted practice without AI. It supports written responses, reviewing the transcript, local microphone recording/playback, corrections, and a recap. Local audio stays in browser memory and is not transcribed or uploaded. The recap makes no claim that a response or communication goal was correct, and local sessions never contribute oral-review evidence.

## Content and error handling

Book text, vocabulary, user goals, and transcripts are untrusted input. Wrap them as data and keep the system instructions separate. Do not grant the conversation model filesystem, browser, payment, messaging, or arbitrary execution tools.

Validate model output before persistence. Unsupported claims or uncertain interpretations are withheld from scheduling; malformed JSON never becomes a successful evaluation. There is no automatic paid repair or retry. The durable operation ledger distinguishes confirmed unbilled failure from an ambiguous or billed failure. A new operation is suggested only after a known unbilled failure has been durably saved; an uncertain finalization requires reconciliation. Administrative billing reconciliation does not turn a missing application result into successful feedback.

Read [evaluation](quality-and-demo.md) and [budget controls](budget.md) before real provider experiments. Reference links are collected in [sources](sources.md).

## Implemented request contracts

Meta chat uses `POST /v1/chat/completions`, standard `muse-spark-1.3`, structured JSON output, and a bounded completion budget. Prompts carry version `ko-fr-v2`. The text payload including its output schema is limited to 64 KiB. Image extraction separately limits input and resolution.

Recorded ASR requires RIFF/WAVE mono PCM16 at 16 or 24 kHz. The browser converts its recorded clip to 24 kHz WAV; the server validates the header, sample format, bytes, and actual duration before dispatch. The multipart `request` contains `audioEncoding: WAV`, `mode: PUSH_TO_TALK`, and Korean/French language hints. A browser WebM file is not sent directly to Meta.

An ASR response carries an application operation ID. Before accepting `inputMode: spoken`, the server verifies a successful transcription operation belonging to the same account and session. The recorded text is compared with that verified result; changed text is marked corrected even if the client claims otherwise. A transcription operation can support only one learner turn. Typing an answer or submitting an arbitrary `spoken` flag cannot establish oral provenance.

Typed responses and corrected transcripts can receive conversation feedback, but do not change the oral-review schedule. Only exact evidence from uncorrected spoken turns with a verified transcription operation qualifies. Legacy turns without that provenance, stale feedback revisions, local practice, and disputed targets are excluded. These checks establish traceability, not pronunciation quality or the semantic correctness of a model judgment.
