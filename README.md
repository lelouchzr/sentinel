# Language Speaking App

**Bring your vocabulary. Practise using it in real conversations.**

A standalone language-learning application that turns vocabulary from flashcards and books into personalized speaking practice. `language-speaking-app` is a temporary repository name; the product name will be chosen later.

**Owner:** [lelouchzr](https://github.com/lelouchzr) · **Repository:** private · **Stage:** application implemented and checked locally; live integrations await configuration and validation.

## Why this project exists

I am learning Korean because I want to move to South Korea and hopefully find a job there, or work remotely while living there. That requires practical conversations: meeting people, asking for help, making appointments, and explaining everyday problems.

After building FlashCardStudy, I want to help learners practise using the vocabulary they already study. This is an independent application, with imports from different tools and its own oral-learning history.

## The intended experience

1. **Bring vocabulary:** import an Anki text export, an export from your own Quizlet set, FlashCardStudy JSON, CSV/TSV, or a photo of a printed vocabulary page.
2. **Confirm the content:** choose fields and languages, correct extraction errors, and select useful expressions.
3. **Prepare a situation:** choose a scenario or describe a concrete need; set difficulty and the relationship between speakers.
4. **Speak:** practise a few expressions through a short conversation, requesting progressive hints when needed.
5. **Review evidence:** see the actual sentences supporting feedback, distinguish independent use from assisted use, and correct transcription mistakes.
6. **Practise again:** revisit difficulties in another context and in later sessions.

For example, a learner imports a Korean vocabulary list about borrowing things, practises asking for a charger, receives help with an expression, and later gets an opportunity to use it when asking for a pen. An expression that was never meaningfully tested remains unobserved.

## First release scope

- Korean as the target language, with French explanations.
- Three scenario families: requesting something, arranging an appointment, and explaining a simple problem.
- Three target expressions per session, with a five-minute maximum.
- Alternating spoken turns with an explicit microphone button.
- Text-based imports and one printed vocabulary-page image per import.
- A short recall exercise, progressive help, evidence-linked feedback, and simple spaced oral review.

Direct synchronization with other flashcard services, native Anki package parsing, unrestricted live voice interruption, pronunciation scoring, model training, payments, and a native mobile app are later work. This application's account library is implemented separately. See the [product specification](docs/product.md) for boundaries and acceptance criteria.

## Stack

| Layer | Choice | Purpose |
| --- | --- | --- |
| Application | Next.js App Router, React, TypeScript | UI and server endpoints in one project |
| Styling | Tailwind CSS | Responsive interface |
| Data | Supabase Auth, PostgreSQL, private Storage | Accounts, vocabulary, sessions, and uploads |
| Validation | Zod | Runtime validation and structured model contracts |
| Text and images | Meta Muse Spark | Vocabulary extraction, scenario planning, dialogue, and feedback |
| Speech recognition | Meta Muse Voice Transcribe | Korean speech transcription |
| Speech synthesis | Azure AI Speech | Read replies using a Korean neural voice |
| Delivery | Vercel | Planned application hosting |
| Verification | Vitest and Playwright | Unit and browser checks |

Dependency versions are pinned in `package.json` and `package-lock.json`. The application runs locally. Supabase migrations and provider adapters are implemented; account access, Korean quality, speech latency, and the deployed flow still require real integration checks.

## Current status and local use

Without credentials, the application supports text imports, editable confirmation, collection management, recall, local backup/restore and a complete guided practice journey. This local mode is explicitly labeled: partner replies are predefined, input is typed, and no AI assessment or oral-learning evidence is produced. It is useful for rehearsing the interface and writing responses, without representing a live AI conversation.

The connected implementation includes Meta dialogue, transcription and image extraction, Azure playback, account collections, conversation history, transcript corrections, feedback disputes, review selection, account export/deletion and usage reporting. Device and account libraries are separate: publishing a collection is explicit, and loading account data does not replace browser data. Imported written-review history remains separate from oral observations.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. See [development setup](docs/development.md) for the configuration runbook. AI calls are disabled by default; the interface identifies the local scripted mode and explains what the connected mode still needs.

```sh
npm run check
npm run build
npm run test:e2e
npm run setup:check
```

The test suite uses original fixtures, mocked provider HTTP, and embedded PostgreSQL for access policies, budget operations, privacy and concurrent writes. Real providers are not called by tests. Both SQL migrations are prepared and have not been applied remotely. `setup:check` checks local configuration without contacting services or printing secrets; it cannot prove that credentials or model access work.

The remaining integration work is to connect the intended Supabase/Meta/Azure accounts, validate two-user isolation and Korean speech/feedback, arrange execution of the implemented upload-cleanup endpoint, and verify the deployed journey. No credits have been spent and no deployment has been performed during this implementation.

## Documentation

- [Documentation index](docs/README.md)
- [Product and learning experience](docs/product.md)
- [Architecture and runtime boundaries](docs/architecture.md)
- [Data model and ownership](docs/data-model.md)
- [Models, prompts, and feedback rules](docs/ai-and-learning.md)
- [Imports and vocabulary-page extraction](docs/imports.md)
- [Development setup](docs/development.md)
- [Remaining hackathon roadmap](docs/roadmap.md)
- [Evaluation and demo](docs/quality-and-demo.md)
- [API credit budget](docs/budget.md)
- [Reference sources and unverified assumptions](docs/sources.md)

Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md). Automated contributors should also read [AGENTS.md](AGENTS.md); [agent.md](agent.md) points to the same canonical instructions.

## Hackathon and resources

This project is being prepared for the Meta Global AI Developer Hackathon, indie developer track, under **Build for Your World**. The owner confirmed acceptance and an allocation of **USD 150 in Meta Model API credits** on 29 October 2026. That is an allocation, not a verified current balance. Azure and hosting costs are separate.

The current [event page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) lists submission for **4 November 2026 at 21:00 America/New_York**, equivalent to **5 November at 03:00 Europe/Paris**. Confirm the participant portal requirements before submission. The implementation plan is based on the remaining days, not a fresh ten-day period.

No paid model calls have been made during this implementation. Credit controls and the first development validation are described in [the budget plan](docs/budget.md).

## Ownership and access

Maintained by Adrien Lachambre under the GitHub account `lelouchzr`. This is a private project with no open-source license granted. Access does not grant permission to redistribute the repository. Existing third-party dependencies retain their own licenses when introduced.
