# AI and learning behavior

Status: server adapters, bounded prompts, response validation, evidence guards, and oral-review rules implemented and tested with fixtures. No real provider has been called or evaluated yet.

## Provider responsibilities

| Provider/model | Planned use | Why |
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
2. **Plan a session:** select three confirmed targets, a supported scenario family, a goal, roles, and opportunities to elicit the expressions. Incompatible vocabulary yields a useful selection explanation.
3. **Respond to a turn:** stay in role, maintain context, react to the learner's meaning, and avoid revealing every target before the learner has tried.
4. **Generate help:** use the requested hint level and mark what was disclosed.
5. **Evaluate evidence:** propose bounded observations with exact learner-text references and an explicit reason. The application validates and persists only supported results.

Keep prompts versioned with a schema version. Use the same Zod contract for runtime validation and provider JSON Schema when the verified API supports it. Do not maintain a second divergent handwritten schema.

## Conversation rules

- Keep responses short enough for a learner to process and for predictable synthesis latency.
- Use the selected Korean relationship/politeness context consistently. Accept correct alternatives appropriate to that context.
- Let the learner take a valid conversational direction; adapt the next opportunity rather than forcing one exact answer.
- Preserve a small state summary and a bounded set of recent turns. The database, not the model's memory, is authoritative.
- After assistance, offer another context when appropriate. Record immediate reuse as such, without claiming durable mastery.
- Do not infer the learner's identity, personality, emotion, or ability from their voice.

## Feedback contract

A candidate observation includes `target_id`, `outcome`, `learner_turn_ids`, exact evidence text, the associated opportunity, relevant assistance IDs, a short explanation in French, and an optional suggested formulation. The application rejects references outside the session, text that does not occur in the transcript, and impossible state combinations.

A valid paraphrase may complete the communication goal without testing the exact expression. Absence of the target string is not failure. Korean particles, conjugations, and polite endings require semantic interpretation; exact string matching alone is insufficient.

Allow users to correct the transcript and flag feedback. Invalidate affected observations and review state updates before reevaluating. Do not display an arbitrary percentage of fluency, pronunciation, or language mastery.

## First oral-review policy

Use a simple, versioned policy rather than fitting a new model. A supported difficulty is prioritized in the next session; an assisted success gets another later opportunity; independent use can be revisited after a longer interval. Choose actual initial intervals during implementation and test them as scheduling rules, not as established learning efficacy.

Keep oral state independent of written flashcard scheduling. Do not import or reproduce FlashCardStudy's scheduler automatically in this new repository. Historical outcomes, assistance, and policy version must make due-date decisions explainable.

## Content and error handling

Book text, vocabulary, user goals, and transcripts are untrusted input. Wrap them as data and keep the system instructions separate. Do not grant the conversation model filesystem, browser, payment, messaging, or arbitrary execution tools.

Validate model output before persistence. Schema failure produces a recoverable state. A bounded repair can be added only with explicit quota accounting. Unsupported claims or uncertain interpretations are withheld from scoring; malformed JSON must never become a successful evaluation.

Read [evaluation](quality-and-demo.md) and [budget controls](budget.md) before real provider experiments. Reference links are collected in [sources](sources.md).

## Implemented request contracts

Meta chat uses `POST /v1/chat/completions`, standard `muse-spark-1.3`, structured JSON output, and a bounded completion budget. Prompts carry version `ko-fr-v1`. The text payload including its output schema is limited to 64 KiB. Image extraction separately limits input and resolution.

Recorded ASR requires RIFF/WAVE mono PCM16 at 16 or 24 kHz. The browser converts its recorded clip to 24 kHz WAV; the server validates the header, sample format, bytes, and actual duration before dispatch. The multipart `request` contains `audioEncoding: WAV`, `mode: PUSH_TO_TALK`, and Korean/French language hints. A browser WebM file is not sent directly to Meta.

Feedback quotes must be exact substrings of existing learner turns. Missing or invalid evidence becomes uncertain; absent opportunity becomes unobserved. Relevant earlier help downgrades independent use to assisted use. These checks protect traceability, but do not establish the semantic correctness of a model judgment. Transcript editing is supported before submission; amendments after evaluation are pending.

Typed responses and corrected transcripts can receive conversation feedback, but do not change the oral-review schedule. Only exact evidence from uncorrected spoken turns qualifies. This is a conservative provenance rule, not a pronunciation assessment.
