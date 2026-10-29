# Data model and ownership

Status: migrations `202610290001_initial.sql` and `202610290002_cloud_library_privacy.sql` implement the schema and procedures described below. They are tested locally with embedded PostgreSQL; no remote migration or live Supabase integration has been verified. Session content remains a bounded JSON snapshot rather than a separate table for every turn and observation.

## Implemented storage

| Record | Purpose and key fields |
| --- | --- |
| Supabase Auth user | Verified account identity; the server derives ownership from Auth, never a request body |
| `vocabulary_collections` | Owner, title, explicit Korean/French languages, confirmed vocabulary JSON, revision, creation/update times |
| `speaking_sessions` | Owner, bounded session snapshot, creation/update times |
| `session_mutations` | Non-billable correction/dispute operation ID, owner/session composite reference, payload fingerprint, creation time |
| `provider_operations` | Operation ID, owner/session association, provider/kind, fingerprint, state, budget reservation, returned usage, cost estimate, cached result |
| `provider_operation_reconciliations` | Administrative billing decision, amount, reason, reference, reconciliation time |
| `account_deletion_requests` | Account deletion barrier and request time, retained until deletion completes |
| Private `vocabulary-pages` Storage bucket | Temporary page images under an owner-prefixed key |

A session snapshot contains the selected vocabulary as historical copies, the goal and speaker relationship, turns, hints, feedback, revision, and optional correction/dispute audits. A learner turn records whether it was typed or spoken, whether its text was corrected, and a verified transcription operation ID for spoken input. There are no separate profile, import-job, observation, or oral-review tables in this version.

The browser library stores local collections and scripted practice history. A separate local practice store records operation fingerprints for safe retries. Local sessions are explicitly marked `mode: local`; cloud sessions are `mode: live` or legacy snapshots without that field. Local backups restore local sessions only. Cloud history is loaded from the verified account and is excluded from the anonymous browser library.

Cloud collection CRUD uses revision checks, supports at most thirty collections with one to five hundred items each, and normalizes/deduplicates items on the server. An expression's content identity changes when its expression or meaning changes. Historical session targets remain unchanged. Users explicitly copy confirmed content between device and account collections; another flashcard application's account or review history is not synchronized.

## Source provenance

Each vocabulary field records whether it was imported, extracted, generated, or edited. Image extraction returns drafts; the learner confirms them before saving. Generated translations are distinct from source text. This version does not create generated textbook examples or retain a permanent link to the uploaded page: the extraction route attempts to remove its temporary image after processing.

Imported scheduling information is not oral ability. Written review history is not imported or fabricated. Oral scheduling is derived from eligible session observations, with the versioned policy described in [AI and learning](ai-and-learning.md).

## Evidence and revisions

An observation references existing learner-turn IDs and exact quotes, plus one of the session's target snapshots. It records opportunity, outcome, explanation, and next practice. Communication-goal success is stored separately. Outcomes are `independent_use`, `assisted_use`, `needs_practice`, `not_observed`, and `uncertain`; they are observations, not standardized proficiency scores.

The server verifies an ASR operation's ID, owner, session, successful state, and recorded text before saving spoken input. Changed text is marked corrected; the same transcription cannot be consumed by another turn. Typed, corrected, unverified legacy, local, disputed, and stale evidence cannot update oral review.

Each saved turn, hint, evaluation, amendment, or dispute advances the session revision. Feedback records its corresponding revision. A transcript amendment preserves turn IDs and historical partner replies, appends its private before/after audit, marks the learner text corrected, and removes the previous feedback. An explicit completion request reevaluates the current transcript. A dispute neutralizes its target observation and remains excluded through later evaluations of that session.

Private audits are returned only through owned session access and account exports. They are not provider prompt content. Review state is recomputed from loaded account history rather than maintained as an independently mutable score, so withdrawn evidence can be removed without leaving a stale progress claim.

## Atomic writes and operation recovery

- Collection changes and session mutations use optimistic revisions and a shared PostgreSQL transaction lock. Stale editors receive a conflict instead of overwriting newer data.
- Non-provider session mutations are blocked while the session has a reserved or unresolved provider operation. Mutation IDs cannot collide with provider-operation IDs.
- Repeating a confirmed mutation returns the latest session snapshot. Provider replays also reload current owned state; cached results invalidated by an amendment cannot restore older feedback.
- Provider reservations bind an operation ID to owner, session, kind, provider, and payload fingerprint. Ambiguous outcomes retain their reservation until explicitly reconciled; deletion does not reset the development budget.
- Administrative reconciliation records verified billing separately from application success. A reconciled operation with no recoverable business result is not replayed as a successful conversation action.

The usage API reports cost estimates and held reservations per provider. It explicitly reports that the provider-account balance is unverified. The USD 150 credit allocation is not a measured remaining balance.

## Ownership, export, and deletion

RLS limits authenticated collection/session reads to their owner. Validated writes and ledger procedures are server-only; anonymous/authenticated roles cannot invoke privileged mutation or billing procedures. The non-provider mutation table uses a composite session/owner foreign key. Storage paths are owner-scoped, and upload checks require an existing account that is not being deleted. An upload trigger takes the same lock as account deletion, covering in-flight uploads and stale tokens from a deleted account.

Account export includes owned collections, session snapshots, and selected operation/accounting fields. It excludes provider cached results, raw speech, and temporary image files. Local browser export and reset are separate actions.

Deleting a collection leaves historical session targets intact. Deleting a session removes its transcript, feedback, correction/dispute audit, and mutation rows, and clears corresponding cached provider results. Minimal non-content operation records remain for accounting. Session deletion waits for a currently reserved provider operation to finish.

Account deletion first installs a barrier against new work, removes exact owned Storage keys in bounded batches, then deletes the Auth user. Private collections, sessions, and associated mutation records cascade; provider result and usage payloads are cleared, and the retained accounting rows lose their owner reference. A partial storage/Auth failure leaves the barrier in place and can be retried. This application behavior does not claim deletion from provider retention systems or infrastructure backups.

Raw speech is transient; local recordings and synthesized playback use browser memory rather than persistent server audio storage. Temporary image removal can fail or an upload can be abandoned. The protected `/api/maintenance/uploads` endpoint selects images older than twenty-four hours for bounded cleanup, with a dry-run default. Deployment and scheduling of that cleanup remain external setup work.
