# Product specification

Status: agreed product direction; implementation pending. Updated 2026-10-29.

## Problem and motivation

A learner can remember a translation during review and still struggle to retrieve an expression in a conversation. The application creates occasions to practise the learner's own vocabulary, then uses observed difficulties to choose later practice.

The owner is learning Korean to move to South Korea and seek local employment or work remotely while living there. Everyday requests, appointments, and explaining problems are the first practical situations. FlashCardStudy is an existing completed project and a potential import source; this repository is a new independent application.

## Audience and promise

The initial audience is French-speaking learners of Korean who already collect vocabulary in books or flashcard apps. The promise is: **bring your vocabulary and practise using it in situations that matter to you.**

The product must be useful with an imported file and a microphone. Users do not need to train a model, build a photographic dataset, or change their main flashcard application.

## Three learning loops

1. **Capture -> confirm -> recall:** import text or a page image; confirm the extracted fields; optionally try a short meaning/form recall exercise.
2. **Situation -> speech -> assistance -> another attempt:** choose relevant expressions and a scenario; speak; ask for a hint; try a different opportunity later in the conversation.
3. **Evidence -> next practice -> delayed revisit:** inspect the supporting sentences; choose the next expressions from observed difficulties; revisit them in a later session and another context.

Immediate repetition and delayed independent use are different observations. Spacing is an application rule, not a retention guarantee or a model's guess.

## Main journey

### Import and confirmation

The learner uploads a supported export, pastes text, or submits one photo. A preview shows field mapping, target/explanation languages, proposed translations, and their origins. The learner edits errors and chooses expressions before saving. Failed extraction never silently becomes a valid collection.

### Session preparation

The learner selects a collection, a guided or more autonomous difficulty, and a scenario family. A free-text goal may personalize one of the three supported families. The planner chooses three related expressions and a concrete communication goal. It must explain when the chosen vocabulary does not fit, rather than force unrelated terms into the scene.

Korean speaker roles and politeness context are explicit: for example, a polite request to a stranger. These are teaching choices to verify with proficient speakers, not claims of native-level correctness.

### Conversation

The interface shows the situation, whose turn it is, recording/playback controls, a help button, and an optional transcript. Target expressions are not continuously displayed as a checklist to insert into speech.

For the MVP, each user turn is explicitly started and stopped. Responses are short. A five-minute or eight-learner-turn limit produces a graceful ending. A failed request preserves the session and allows a deliberate retry without duplicating the turn.

Hints progress from a meaning cue to a sentence opening and then a complete example. Each hint records which expression was revealed and when. The session may offer an alternative context later; it does not label a recently supplied phrase as independently mastered.

### Feedback and next practice

Display a few actionable observations with the learner's actual sentences. Allow the learner to correct a transcription or flag feedback as wrong. Invalidate affected observations after corrections and reevaluate explicitly.

Record independently whether the communication goal was achieved, whether a target expression was used correctly, and whether help was used. A valid paraphrase can achieve the goal while leaving exact-expression recall unobserved.

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
| Private account history | Payments, teams, public decks, native apps |

## Acceptance criteria

- A user can confirm an import and start a short conversation with its vocabulary.
- A page photo follows the same confirmation flow as an imported file.
- A completed session contains evidence-linked observations and a next-practice suggestion.
- Correct paraphrases, requested assistance, no opportunity, and uncertain transcripts have distinct outcomes.
- A recording permission failure, provider outage, or exhausted quota leaves the UI recoverable.
- Data belonging to another account cannot be accessed through IDs, storage paths, or exports.
- The demo works with a genuine provider response and clearly identifies any sample content.

## Product success measurements

Measure successful completion of import-to-session journeys, observation validity, speech-turn latency, assistance use, and correct reuse across later opportunities. Early testing can establish usability and boundary correctness. It cannot establish long-term learning gains from one demo or a handful of sessions.
