# Product specification

Status: the application interface, local practice, cloud APIs/migrations, and provider adapters are implemented and tested locally. Supabase and AI services still require configuration and real integration checks; no live provider quality or deployed behavior is claimed. Updated 2026-10-29.

## Problem and motivation

A learner can remember a translation during review and still struggle to retrieve an expression in a conversation. The application creates occasions to practise the learner's own vocabulary, then uses observed difficulties to choose later practice.

The owner is learning Korean to move to South Korea and seek local employment or work remotely while living there. Everyday requests, appointments, and explaining problems are the first practical situations. FlashCardStudy is an existing completed project and a potential import source; this repository is a new independent application.

## Audience and promise

The initial audience is French-speaking learners of Korean who already collect vocabulary in books or flashcard apps. The promise is: **bring your vocabulary and practise using it in situations that matter to you.**

The product must be useful with an imported file and a microphone. Users do not need to train a model, build a photographic dataset, or change their main flashcard application.

Before services are connected, users can import/edit vocabulary, manage their device library, use recall exercises, and practise with explicitly labeled scripted Korean dialogues. They can record and replay their voice locally; that recording is neither transcribed nor assessed. This mode never claims AI feedback or grants oral-review credit.

## Three learning loops

1. **Capture -> confirm -> recall:** import text or a page image; confirm the extracted fields; optionally try a short meaning/form recall exercise.
2. **Situation -> speech -> assistance -> another attempt:** choose relevant expressions and a scenario; speak; ask for a hint; try a different opportunity later in the conversation.
3. **Evidence -> next practice -> delayed revisit:** inspect the supporting sentences; choose the next expressions from observed difficulties; revisit them in a later session and another context.

Immediate repetition and delayed independent use are different observations. Spacing is an application rule, not a retention guarantee or a model's guess.

## Main journey

### Import and confirmation

The learner uploads a supported export, pastes text, or submits one photo. A preview shows field mapping, target/explanation languages, proposed translations, and their origins. The learner edits errors and chooses expressions before saving. Failed extraction never silently becomes a valid collection.

Collections can be created, renamed, edited, and deleted on the device or, after connection, in the account. Device data and account data are separate; copying confirmed vocabulary between them is an explicit action. Local backup export/restoration, account export/deletion, and device reset are available. Editing or deleting a collection does not rewrite the vocabulary snapshots of earlier conversations.

### Session preparation

The learner selects a collection, three expressions, beginner or intermediate difficulty, a speaker relationship, and a scenario family. A free-text goal may personalize one of the three supported families. In connected mode, the planner proposes a situation using those choices and explains when the vocabulary does not fit. Local mode uses a predefined dialogue for the selected family and relationship without making a semantic compatibility judgment.

Korean speaker roles and politeness context are explicit: for example, a polite request to a stranger. These are teaching choices to verify with proficient speakers, not claims of native-level correctness.

### Conversation

The interface shows the situation, whose turn it is, recording/playback controls, a help button, and an optional transcript. Target expressions are not continuously displayed as a checklist to insert into speech.

For the MVP, each user turn is explicitly started and stopped, with at most thirty seconds of recording per turn. Responses are short. A five-minute or eight-learner-turn limit ends further turns and hints while still allowing the learner to request the recap or feedback. Written responses remain available when the microphone is unavailable.

A failed request preserves the conversation. Repeating the same confirmed action retrieves current state without duplicating a turn. An uncertain provider outcome or unconfirmed billing update requires reconciliation before another paid request; the interface does not silently retry. A stale editor can reload the conversation before continuing.

Hints progress from a meaning cue to a sentence opening and then a complete example. Each hint records which expression was revealed and when. The session may offer an alternative context later; it does not label a recently supplied phrase as independently mastered.

### Feedback and next practice

Connected feedback displays a few actionable observations with the learner's actual sentences. Correcting a saved transcription withdraws the previous feedback and its review contribution, retains a private correction history, and allows explicit reevaluation. Flagging a target's feedback as wrong immediately excludes it from oral review. The flag persists through reevaluation of that session. Corrections and flags themselves make no AI request.

Record independently whether the communication goal was achieved, whether a target expression was used correctly, and whether help was used. A valid paraphrase can achieve the goal while leaving exact-expression recall unobserved.

Only exact evidence from unchanged, server-verified spoken transcripts can contribute to oral scheduling. Written replies, edited ASR text, local scripted practice, uncertain judgments, and expressions without an opportunity do not establish oral ability. No pronunciation score, fluency percentage, or mastery claim is produced.

Local practice ends with a clearly labeled recap of the transcript and hints, without judging response correctness or communication success. Both modes support revisiting saved sessions and correcting text; live account history is available only after the account services are connected.

## First-release boundaries

| Included | Later |
| --- | --- |
| Korean target, French explanations | Broad language catalogue |
| CSV, TSV, pasted text, FlashCardStudy JSON | Direct app account synchronization |
| Anki plain-text export | Native `.apkg` / `.colpkg` parsing |
| One printed vocabulary page at a time | Books, multi-page PDFs, handwriting |
| Three scenario families | Unbounded scenario marketplace |
| Alternating short voice turns | Full-duplex interruption and live calls |
| Meaning and vocabulary feedback | Phoneme-level pronunciation assessment |
| Three expressions and simple oral review | Calibrated proficiency certification |
| Device library, account CRUD/history, export/deletion | Payments, teams, public decks, native apps |

## Acceptance criteria and validation status

Local tests exercise imports, scripted practice, session corrections, feedback evidence, server ownership, concurrency, budget recovery, and the browser flow. Provider HTTP is mocked; access policies are tested in embedded PostgreSQL. Requirements below still need live integration or quality validation where they involve Supabase, a model, or a real microphone/device.

- A user can confirm an import and start a short conversation with its vocabulary.
- A page photo follows the same confirmation flow as an imported file.
- A completed session contains evidence-linked observations and a next-practice suggestion.
- Scripted local practice clearly identifies its predefined content and makes no oral-learning claim.
- Correct paraphrases, requested assistance, no opportunity, and uncertain transcripts have distinct outcomes.
- Correcting or disputing feedback immediately removes the affected oral-review contribution without a paid call.
- A recording permission failure, provider outage, or exhausted quota leaves the UI recoverable.
- Data belonging to another account cannot be accessed through IDs, storage paths, or exports.
- The demo works with a genuine provider response and clearly identifies any sample content.

## Product success measurements

Measure successful completion of import-to-session journeys, observation validity, speech-turn latency, assistance use, and correct reuse across later opportunities. Early testing can establish usability and boundary correctness. It cannot establish long-term learning gains from one demo or a handful of sessions.
