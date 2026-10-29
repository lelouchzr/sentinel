# Language Speaking App

**Bring your vocabulary. Practise using it in real conversations.**

A standalone language-learning application that turns vocabulary from flashcards and books into personalized speaking practice. `language-speaking-app` is a temporary repository name; the product name will be chosen later.

**Owner:** [lelouchzr](https://github.com/lelouchzr) · **Repository:** private · **Stage:** project documentation, before application implementation.

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

Direct account synchronization, native Anki package parsing, unrestricted live voice interruption, pronunciation scoring, model training, payments, and a native mobile app are later work. See the [product specification](docs/product.md) for boundaries and acceptance criteria.

## Planned stack

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
| Verification | Vitest and Playwright | Planned unit and browser checks |

These are implementation decisions, not installed or deployed components. Versions will be selected and pinned during application setup. Model access, Korean quality, audio formats, and latency must be validated with real calls when development begins.

## Current status and local use

This repository currently contains documentation, repository guidance, and original sample vocabulary. There is no application runtime, dependency manifest, database migration, configured cloud service, or deployed demo yet.

Check the documentation with Python 3:

```sh
python3 scripts/check_docs.py
git diff --check
```

Read [development setup](docs/development.md) before starting implementation. Do not run nonexistent application commands or claim that planned tests have already passed.

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

No paid model calls are part of this documentation setup. Credit controls and the first development validation are described in [the budget plan](docs/budget.md).

## Ownership and access

Maintained by Adrien Lachambre under the GitHub account `lelouchzr`. This is a private project with no open-source license granted. Access does not grant permission to redistribute the repository. Existing third-party dependencies retain their own licenses when introduced.
