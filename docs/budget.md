# API credits and operating budget

The owner confirmed **USD 150 in Meta Model API credits** on 29 October 2026. This is an allocation, not a verified remaining balance. No paid provider calls have been made during this implementation.

Budget enforcement, usage reporting and administrative reconciliation are implemented locally. Live billing verification and the first paid experiment remain future work.

## Allocation and current limits

| Envelope | Amount | Purpose |
| --- | --- | --- |
| Development ceiling | USD 120 | Integration checks, Korean evaluation and application trials |
| Demo reserve | USD 30 | Rehearsals, recording and final demonstration |
| Total stated allocation | USD 150 | Owner-confirmed Meta allocation |
| Initial Meta experiment | USD 5 | Cumulative limit before deliberate expansion |
| Initial Azure envelope | USD 5 | Separate conservative accounting for synthesis |

The Meta runtime uses the lower of `META_RUN_LIMIT_USD` and `META_DEVELOPMENT_LIMIT_USD`, with a hard upper bound of USD 120. The initial USD 5 limit is cumulative across the database ledger, not a daily reset. Releasing the USD 30 demo reserve requires an explicit budget decision. If the provider's available credit is lower, use the lower limit.

Azure Speech, Supabase, Vercel and other services are separate costs. Meta credits do not cover them. Paid plan upgrades and billable provisioning require their own authorization.

The usage UI is implemented. Threshold alerts at USD 50 and USD 100 remain unimplemented; no email, push or background warning is promised. The provider dashboard is the authority for remaining credit, and spending outside this application is not captured by its ledger.

## Implemented runtime controls

- `AI_ENABLED=false` is the default. Builds, startup, ordinary tests and CI make no provider requests.
- Deterministic text imports and local scripted practice make no paid calls.
- Authentication, ownership, body limits, session bounds and schema validation precede paid work.
- PostgreSQL atomically reserves budget, checks the provider's cumulative envelope and limits concurrent operations to at most two.
- Session exclusion and unique operation IDs with request fingerprints prevent overlapping state writes and duplicate dispatch.
- The system distinguishes pre-dispatch failure, known unbilled failure and ambiguous dispatched failure.
- Unknown or ambiguous charges keep their full reservation until reconciliation; they are never treated as zero.
- No automatic billable retry or automatic timeout-based release is implemented.

These are application controls, not a substitute for provider account limits. They constrain requests processed by this database ledger.

## Estimation and honest usage reporting

Each operation reserves USD 1 before dispatch. Where Meta returns usable usage, successful requests settle a local estimate. The current estimator in `src/server/usage/run-operation.ts` uses standard Muse Spark input USD 1.25 per million tokens, output USD 4.25 per million tokens and transcription USD 0.18 per hour, rounded up to whole processed seconds. Those recorded rates were checked on 29 October 2026; reverify them against the selected models and actual account before any live experiment. Changing prices requires updating the code and tests; there is no remote price-table synchronization.

Cached-input discounts are intentionally not subtracted. Without a verified Azure regional price, successful synthesis retains its USD 1 reservation as an unknown held cost. No exact Azure charge is invented.

`GET /api/usage` and settings display Meta and Azure separately: tracked estimated cost, held amounts, pending operations and unresolved/unknown charges. They explicitly report that the provider balance has not been verified. The UI can therefore show zero recorded use without claiming that the real account still contains the full allocation.

The ledger records operation kind, provider, state, reservations and available measured usage/request metadata. Idempotent results may contain private application content and are server-only; corrections and deletion scrub stale or deleted content. Exported accounting excludes raw replay payloads. Raw microphone recordings, synthesized audio, images and secrets are not billing telemetry.

## Ambiguous requests and reconciliation

If a request may have been billed, preserve its reservation and session exclusion. Do not create a fresh operation ID to bypass uncertainty. After a failure to finalize the ledger, retry advice remains conservative because successful provider execution cannot be ruled out.

The private `POST /api/maintenance/reconcile` endpoint accepts a verified billed amount, a reason and an external billing reference. It requires the dedicated maintenance bearer secret and records an immutable audit. Recent reservations cannot be reconciled while they may still be executing. A known zero charge releases the reservation; a positive charge remains counted. Reconciliation clears the content result and exposes a replay marker so billing settlement cannot be presented as a successfully delivered conversation response.

This procedure never calls the provider again. Reload current session state and investigate the application result separately before deliberately starting another action. See [the maintenance runbook](development.md) for request bounds and operational steps.

## First paid experiment, still to perform

1. Configure credentials normally and verify actual model/region access.
2. Check current rates and remaining Meta credits; keep Azure costs separate.
3. Apply and validate both SQL migrations, including ownership and accounting procedures.
4. Use one short original Korean clip, one brief dialogue and one small original printed vocabulary page.
5. Keep the Meta experiment ceiling at no more than USD 5 and limit each run deliberately.
6. Record measured latency, usage, costs and failures, then adjust from evidence.

No fine-tuning, training jobs, bulk evaluation or speculative parallel provider calls are needed for the MVP. Additional automated alerts and provider-balance synchronization remain future enhancements.
