# Planned data model

Status: first migration implemented in `supabase/migrations/202610290001_initial.sql`. No remote migration has been applied. The entity table below describes the broader target model; the first slice uses a session snapshot rather than separate tables for each turn and observation.

## Entities

| Entity | Purpose and key fields |
| --- | --- |
| `profiles` | Auth user ID, explanation language, preferred target language |
| `vocabulary_collections` | Owner, title, languages, source label, creation time |
| `import_jobs` | Owner, source type, object ID when applicable, state, bounded errors |
| `vocabulary_items` | Collection, expression, meaning, optional example, provenance, confirmed timestamp |
| `speaking_sessions` | Owner, goal, scenario, difficulty, roles/politeness context, state, limits |
| `session_targets` | Selected item and immutable expression snapshot for a session |
| `conversation_turns` | Session, role, sequence, transcript/text, client operation ID, status |
| `assistance_events` | Session/target, hint level, disclosed content, associated turn |
| `learning_observations` | Target, outcome, evidence, assistance association, validity state |
| `oral_review_state` | Owner/item, last practice, next due time, review policy version |
| `provider_operations` | Idempotency key, provider request ID, state, usage, reservation, estimated/actual cost |

Current SQL stores collections, session snapshots, provider operations, and private image objects. Vocabulary and oral-review history in the current UI are browser-local. The remaining normalized entities are planned, not deployed.

## Source provenance

Each vocabulary field should retain whether it was imported, extracted from an image, entered/edited by the learner, or suggested by a model. Link an image-derived item to its import job and original page while that source is retained. Do not falsely attribute a generated example to a textbook.

Imported scheduling information is not oral ability. Basic text imports often contain no review history; do not fabricate it. If another format later includes such history, preserve it separately with explicit provenance.

## Evidence model

An observation references existing learner-turn IDs and exact text spans, plus the expression snapshot used during the session. Evidence must belong to the same user and session. Record whether a relevant opportunity existed, what support was disclosed before the attempt, and whether the source transcript was corrected.

Domain outcomes:

- `independent_use`: valid use without previously supplied help for that attempt.
- `assisted_use`: valid use after a relevant hint or example.
- `needs_practice`: a supported misuse or a user-confirmed inability after a meaningful opportunity.
- `not_observed`: insufficient opportunity or no evidence for the target expression.
- `uncertain`: unresolved transcript or interpretation.

Communication-goal success is a separate field. These outcomes are observations, not standardized proficiency scores.

## Invariants and constraints

- Tenant-owned records have an owner or an unambiguous parent ownership chain protected by RLS.
- Enforce unique `(session_id, client_operation_id)` for learner turns and unique provider operation IDs.
- A session can be finalized once; repeated completion returns the existing result.
- A corrected transcript invalidates dependent observations. A rerun creates a new version, preserving why the earlier one was invalidated.
- Editing vocabulary must not rewrite historical session targets; use snapshots.
- Source text and model output are stored as data. Render escaped text, not imported HTML.
- Invalid evidence references prevent an observation from affecting review timing.
- `not_observed` and `uncertain` must not automatically reduce a learner's demonstrated ability.

## Ownership and deletion

Policies must cover reads, writes, parent-child references, and Storage paths. Cross-tenant foreign references must be rejected even if a user knows another record's UUID. Server-side privileged operations must check the complete ownership chain.

Deleting a collection removes or detaches its source image according to a documented shared-reference policy. Deleting a session removes transcripts and feedback while keeping minimal non-content billing records where operationally necessary. Account deletion removes private content and scheduled practice. Retention and legal requirements must be documented before public release; do not promise complete deletion while retaining raw content elsewhere.

Raw speech is transient by default. Store synthesized audio only if caching has a defined retention and deletion path. An object hash is not a substitute for access control.
