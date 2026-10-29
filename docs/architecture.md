# Architecture

Status: planned. No application, database, or provider connection is provisioned in this baseline.

## Decisions

Use one Next.js App Router application with React, strict TypeScript, and Tailwind CSS. Use Supabase for Auth, PostgreSQL, and private Storage. Deploy to Vercel after runtime validation. Use Zod for input and model-output contracts, Vitest for meaningful domain tests, and Playwright for browser journeys.

This keeps UI and server work in one codebase familiar to the owner. Start with HTTP requests for short recorded turns. A long-lived voice relay, vector database, background queue, or general agent framework is not needed for the agreed MVP.

## Planned layout

```text
src/
  app/                  Routes, layouts, and thin HTTP handlers
  features/
    imports/            Preview, correction, and confirmation
    vocabulary/         Collections and short recall exercises
    speaking/           Session preparation, recording, and playback
    feedback/           Evidence and next-practice UI
  lib/                  Shared pure types, schemas, and utilities
  server/
    auth/               Verified session and ownership checks
    data/               Database operations
    learning/           Selection, assistance, and review rules
    providers/          Meta and Azure adapters
    usage/              Reservations, limits, and reconciliation
supabase/migrations/    Versioned SQL schema and policies
tests/                  Unit, integration, and browser fixtures
```

This is a target layout, not a list of directories already implemented.

## Boundaries

The browser records microphone audio after user interaction and renders validated results. It never receives provider keys or a privileged Supabase credential. Authentication and ownership are checked before accepting any collection, session, upload, or turn ID.

Server modules import `server-only`. Only non-sensitive public configuration may use `NEXT_PUBLIC_`. Prefer the authenticated user's database context and RLS; use privileged access only for a narrowly justified operation with an explicit ownership check.

## Text and image import flow

1. Validate size and type before parsing or uploading.
2. Parse supported text formats deterministically; do not spend model credits to split CSV rows.
3. Upload permitted images directly to a private Storage location scoped to the user. The extraction endpoint receives an owned object ID, not an arbitrary URL to fetch.
4. Extract a proposed list server-side and validate the model response.
5. Store a draft with source information. Only explicit user confirmation creates practice-ready vocabulary.
6. Remove abandoned uploads after a documented retention interval.

The image flow avoids proxying a large upload through an application route. Verify the current hosting limits before implementation.

## Spoken-turn flow

```text
Microphone clip
  -> authenticated request + session ID + unique turn ID
  -> validate ownership, duration, bytes, and quota
  -> reserve operation budget
  -> speech transcription
  -> show/validate transcript and generate response
  -> persist transcript, reply, assistance, and usage
  -> synthesize the reply
  -> play audio and allow the next learner turn
```

For the MVP, the UI is explicit about `recording`, `transcribing`, `responding`, `playing`, and `retryable_error`. Finish the durable state update before acknowledging completion. Never start unawaited work that a serverless runtime can discard.

Model output proposes a reply and observations. Domain validation checks IDs, evidence, enums, assistance state, and whether an opportunity occurred. Keep session goals and completed turns in PostgreSQL; do not depend on a provider retaining conversation memory.

## Proposed HTTP responsibilities

| Route family | Responsibility |
| --- | --- |
| `POST /api/imports/preview` | Parse a bounded text import |
| `POST /api/imports/extract` | Extract from an already-uploaded owned image |
| `POST /api/imports/confirm` | Save corrected entries once |
| `POST /api/sessions` | Plan a bounded session from owned vocabulary |
| `POST /api/sessions/:id/turns` | Process one recorded learner turn |
| `POST /api/sessions/:id/hints` | Reveal and record progressive help |
| `POST /api/sessions/:id/complete` | Finalize evidence and next practice |
| `DELETE /api/sessions/:id` | Delete the session and associated content |

Exact routes may change during implementation. They are not a published API contract yet.

## Failure recovery

- Use unique client operation IDs and database constraints to prevent double processing.
- Reject microphone clips over the configured duration or byte limit before billing a provider.
- If transcription is empty or visibly wrong, allow rerecording or correction; do not create a failure grade.
- If speech synthesis fails after a valid reply, show the text and offer a playback retry. Reuse the stored reply rather than generating it again.
- Reject invalid structured output. At most one bounded repair attempt may be introduced when it has an explicit cost reservation.
- Apply short, bounded retries only where outcomes are known. Treat an ambiguous billable timeout as unresolved until reconciled.
- When an operation exceeds hosting constraints, add a durable execution mechanism explicitly; do not hide it in a detached promise.

## Visibility

Record status, model/version when available, prompt/schema version, latency, token/audio usage, estimated cost, and provider request IDs. Do not log raw media, secrets, temporary download links, or full learner conversations. See [the budget policy](budget.md).
