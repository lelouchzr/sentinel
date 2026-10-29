# Architecture

Status: the local application, connected API paths, provider adapters and two SQL migrations are implemented. Automated checks use local fixtures, mocked HTTP and embedded PostgreSQL. No remote database migration, provider call or deployment has been performed.

## Decisions and layout

The application uses Next.js App Router, React, strict TypeScript, Tailwind CSS and Zod. Supabase provides the planned runtime Auth, PostgreSQL and private Storage; Meta supplies text, image extraction and transcription; Azure supplies Korean speech synthesis. Vercel is the intended deployment target, pending validation.

`src/app` contains routes and thin HTTP handlers; `src/features` contains imports, vocabulary, speaking and feedback UI; `src/lib` contains shared contracts, local guided practice and pure learning mutations; `src/server` contains verified authentication, data access, learning validation, provider adapters and usage enforcement. Versioned SQL is under `supabase/migrations`.

Short recorded turns use ordinary HTTP requests. The MVP has no vector database, background queue, voice relay or general agent framework.

## Local and connected boundaries

The local guided mode runs on the device with predefined Korean partner replies and typed input. It identifies itself explicitly, does not call providers and does not judge language proficiency. Its results cannot contribute spoken evidence or oral-review progress. Local collections, archives and guided history remain in browser storage.

Account collections and connected conversation history are separate from device data. Copying a device collection to the account is an explicit action; loading account data does not overwrite the local library. Changes use optimistic revisions, and the server preserves each conversation's original target-expression snapshot.

Sensitive modules import `server-only`. Provider credentials and the Supabase secret key never reach the browser. The server obtains identity through verified Auth, checks complete ownership chains and uses RLS for user reads. Privileged writes are scoped to that verified identity. Mutation endpoints validate origin, size and schemas before work.

## Import and confirmation

Text exports are parsed in the browser without a model. Mapping, editing and explicit confirmation produce practice-ready entries with per-field provenance. Canonical expression/meaning IDs and deterministic deduplication preserve separate meanings.

Images upload to an owned path in the private `vocabulary-pages` bucket. Extraction accepts that path, never an arbitrary remote URL. The server checks ownership, actual format, dimensions and size, strips metadata by re-encoding, and resizes to at most 1600 pixels per edge. Extracted source text remains distinct from generated examples. The learner confirms the proposed vocabulary before using it.

Client and server attempt source removal after extraction. The implemented maintenance endpoint removes abandoned images older than 24 hours in bounded batches; configuring its periodic invocation is a deployment task. Storage policies and a database trigger prevent new or late uploads during account deletion, including uploads attempted with a stale token after the Auth account has gone.

## Connected speaking and learning

1. Snapshot three selected confirmed entries and the learner's scenario.
2. Reserve an operation before dispatching a paid request.
3. Record and validate a short WAV clip, then request transcription.
4. Show the transcript for confirmation or correction. The turn carries its transcription operation ID.
5. Verify that the completed transcription belongs to the same owner and conversation, then persist the reply, transcript and assistance state.
6. Synthesize only an existing owned partner turn. Text remains available if audio playback fails.
7. On completion, validate model observations against actual turns, opportunity and assistance before updating review selection.

Typed input remains available and is labeled separately. A client-supplied “spoken” label cannot establish oral evidence. Unsupported feedback and uncertain transcription remain uncertain; absent opportunities remain unobserved. There is no fabricated pronunciation score.

Transcript amendments and feedback disputes run without a paid call, check revisions and invalidate affected observations. Audit history records the reason. Corrections clear stale provider replay content; replaying an old request returns current session state rather than resurrecting invalidated feedback. A deliberate feedback reevaluation, when requested, remains a separately budgeted operation.

## Implemented HTTP surface

| Routes | Responsibility |
| --- | --- |
| `GET /api/status` | Configuration booleans and verified account identity; no secrets |
| `GET /api/collections`, `POST /api/collections` | Read or create confirmed account collections |
| `PATCH /api/collections/:id`, `DELETE /api/collections/:id` | Revision-checked editing and deletion |
| `POST /api/imports/extract` | Extract an already-uploaded owned image |
| `GET /api/sessions`, `POST /api/sessions` | Paginated history or bounded scenario creation |
| `GET /api/sessions/:id`, `DELETE /api/sessions/:id` | Recover or delete an owned conversation |
| `POST /api/transcribe` | Validate bounded audio and return transcript provenance |
| `POST /api/sessions/:id/turns` | Process confirmed typed or verified transcribed input |
| `PATCH /api/sessions/:id/turns/:turnId` | Amend a transcript with revision and audit checks |
| `POST /api/sessions/:id/hints`, `POST /api/sessions/:id/complete` | Progressive assistance and evidence validation |
| `POST /api/sessions/:id/feedback/flags` | Dispute an observation and invalidate affected review evidence |
| `POST /api/speech` | Synthesize an existing owned partner turn |
| `GET /api/account`, `GET /api/account/export`, `DELETE /api/account` | Account state, bounded complete export and recoverable deletion |
| `GET /api/usage` | Separate Meta/Azure estimates, pending reservations and unknown charges |
| `POST /api/maintenance/uploads` | Private dry-run or bounded upload cleanup |
| `POST /api/maintenance/reconcile` | Private documented billing reconciliation |

Text preview and confirmation are browser operations; they do not require separate import-preview APIs. Maintenance requires a dedicated server bearer secret, never the anonymous browser key.

## State, recovery and privacy

PostgreSQL serializes reservations, corrections, deletion barriers and upload metadata changes. Operation IDs and request fingerprints prevent duplicate billing; session revisions prevent lost edits. Unresolved paid requests retain their reservation and exclusion until a documented administrative reconciliation. The application never silently retries an ambiguous billable timeout.

Reconciliation records a reason, external billing reference and explicit amount. A reconciled charge does not prove that the application received a usable result: replay is marked and refused as a business success. Minimal accounting can remain after account deletion while owner links and private replay content are scrubbed.

Account deletion first blocks new work, removes owned Storage objects in batches, then deletes Auth. A partial failure leaves a recoverable deletion state visible in settings. Account export pages owned records and fails explicitly if its per-table limit is exceeded; no partial download is presented as complete.

Raw microphone recordings and synthesized audio are transient. Browser playback may cache audio for the current view. Full transcripts are private conversation data, not telemetry. Provider status, request IDs and measured token/audio usage may be retained for accounting without logging secrets or media. See [the budget policy](budget.md) and [connection runbook](development.md).
