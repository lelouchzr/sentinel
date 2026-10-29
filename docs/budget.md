# API credits and operating budget

The owner confirmed an allocation of **USD 150 in Meta Model API credits** on 29 October 2026 for subsequent development. This is not a live balance check. The initial documentation preparation makes no billable model calls.

All controls below are **requirements to implement**, not existing runtime protection.

## Proposed allocation

| Envelope | Amount | Purpose |
| --- | --- | --- |
| Development limit | USD 120 | Integration checks, Korean evaluation, and application trials |
| Demo reserve | USD 30 | Rehearsals, recording, and final demonstration |
| Total allocation | USD 150 | Maximum stated Meta credit allocation |

Alert at USD 50 and USD 100 of tracked development usage. Stop automated development calls at the USD 120 envelope. Releasing the reserve requires an explicit budget decision. If the real account balance is lower, use the lower available limit.

Azure speech synthesis, Supabase, Vercel, and any other service are separate costs. Do not assume Meta credits pay for them. Avoid paid plan upgrades or provisioning billable infrastructure without task authorization.

## Default behavior

- Keep `AI_ENABLED=false` until the implementation and a deliberate real-call experiment are ready.
- No provider requests during builds, startup, ordinary tests, CI, or documentation checks.
- Prefer deterministic parsing for exports; reserve model calls for images, dialogue, and semantic feedback.
- Bound targets, turns, audio duration, image size, context length, output length, and concurrent requests.
- Cache reusable synthesized replies where appropriate with bounded retention and user isolation.
- Never imply that a disabled feature flag already enforces these rules before the runtime exists.

## Accounting design

Before a billable operation, atomically reserve a conservative estimate within the user's quota and global envelope. Track the unique operation ID and provider request ID. Settle the reservation using reported tokens/audio duration and verified pricing when available.

If the provider does not report a billed amount, label the amount as estimated. An unknown amount is never zero. Preserve an unresolved reservation after an ambiguous timeout until reconciliation; retrying must not create unbounded duplicate spend.

Record provider, model/version, operation purpose, duration/tokens, latency, status, estimated or actual amount, and pricing verification date. Exclude raw speech, images, keys, signed URLs, and private prompt content from the cost ledger.

Use a configurable price table verified at implementation time. Do not bake a transient marketing price into application logic. The provider dashboard or billing export is the authority for the actual account balance.

## First development experiment

1. Confirm model and region access with credentials in the normal secret store.
2. Verify current prices and remaining credits before the first paid run.
3. Use one short original Korean clip, one brief dialogue, and one small original printed vocabulary page.
4. Set a small explicit experiment ceiling, initially no more than USD 5.
5. Record measured latency, usage, and failures; adjust the next experiment from evidence.

No fine-tuning, training job, bulk evaluation, or speculative multi-agent fan-out is needed for the MVP. Native account usage limits should complement application-side controls when available.

## First implemented controls

The server now enforces `AI_ENABLED`, authentication, bounded request bodies, per-session exclusion, global concurrent-operation limits, idempotent request fingerprints and atomic reservations in PostgreSQL. The initial `META_RUN_LIMIT_USD=5` is cumulative across the database ledger, bounded above by `META_DEVELOPMENT_LIMIT_USD=120`. It is not a daily reset and not the provider's live account balance.

Each operation reserves USD 1. Successful Meta usage settles an **estimate** using standard Muse Spark input USD 1.25/M tokens and output USD 4.25/M tokens, or ASR USD 0.18/hour rounded up to whole processed seconds, checked on 29 October 2026. Cached-input discounts are intentionally not subtracted. Unknown usage and ambiguous failures retain the full reservation. An unambiguous pre-dispatch failure releases it. These rates must be reviewed before real experiments and whenever models/prices change.

Azure uses an independent `AZURE_RUN_LIMIT_USD=5` envelope; without a verified regional price, each successful synthesis conservatively retains its USD 1 reservation. No exact Azure cost is claimed. Browser playback may reuse its current audio; raw audio is not kept in the operation ledger.

No credit has been spent by this implementation. No automatic reconciliation, provider-balance synchronization, or threshold-notification UI is implemented yet. The reservation model limits tracked operations; other tools using the same account can still spend credits outside this ledger.
