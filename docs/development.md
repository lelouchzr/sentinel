# Development setup

## Run without service credentials

Use Node `26.13.0` from `.nvmrc` and npm `11.20.0`. Dependencies are pinned in `package.json`; `package-lock.json` is the only lockfile.

    npm ci
    npm run dev

Open `http://127.0.0.1:3000`. Import the original Korean/French sample or your own export, confirm it, manage collections and try a guided conversation. The local mode uses predefined replies and typed input, clearly identifies itself, and produces no AI evaluation or oral-learning evidence. Local archives can be exported and restored without an account.

Device collections and guided history stay in this browser. Account collections and connected conversations use a separate scope; selecting an account does not replace device data.

## Local verification

    npm run setup:check
    npm run check
    npm run build
    npm run test:e2e
    git diff --check

`setup:check` loads local configuration, prints variable names and presence/format checks, and lists the two migrations in order. It never contacts services or prints secret values. Missing services are expected during local-only development. `npm run setup:check -- --strict` fails when required service groups are absent; this still does not validate credentials, provider entitlements or applied schema.

`npm run check` generates Next.js route types, checks TypeScript and formatting, then runs tests and documentation checks. Focused commands are `npm run typecheck`, `npm test` and `npm run check:docs`. Formatting uses `npm run format`. No separate lint command is claimed.

Tests use original fixtures, mocked provider HTTP and the actual migration SQL in embedded PostgreSQL with Auth/Storage stubs. They exercise ownership, budget, revision, privacy and retry boundaries, but cannot establish live Supabase or Korean model quality. Browser tests require Chrome or a Playwright Chromium installation; see `playwright.config.ts`.

## Future connection runbook

No service credentials have been configured by this implementation. No remote migrations, paid calls or deployment have run.

1. Copy the safe template to the ignored local configuration file:

       cp .env.example .env.local

   Add credentials through the normal secret setup. Never paste them into chat, screenshots, commits or issue bodies.

2. Set `NEXT_PUBLIC_APP_URL` to the exact app origin, such as `http://127.0.0.1:3000`. Configure the intended development Supabase URL, publishable key and server secret key. Keep `AI_ENABLED=false`.

3. Review and apply both migrations through the normal migration workflow, in this order:
   - `supabase/migrations/202610290001_initial.sql`
   - `supabase/migrations/202610290002_cloud_library_privacy.sql`

   The first creates the core schema, private bucket and accounting operations. The second adds collection revisions, session mutation tracking, deletion barriers, Storage upload guards and administrative reconciliation. Both exist locally and remain unapplied remotely. Verify functions, grants, RLS policies and the Storage trigger on the intended project.

4. Configure Supabase email-link Auth with the app origin and its `/auth/callback` redirect. Restart the development server after configuration changes. Run `setup:check`, then sign in through settings. Configuration indicators report presence; they do not establish working model access.

5. Use two test accounts while AI remains disabled. Verify separate collections, revision conflicts, explicit device-to-account copying, account switching, exports, private image paths and deletion recovery. Attempt cross-user reads and writes with known foreign IDs. Verify that a deleted user's old token cannot create new private objects. Include a partial Storage failure so deletion can be retried safely.

6. Configure Meta and, for playback, Azure Speech. Confirm model/region entitlements and current prices in the actual accounts. Check the remaining balance, keep the initial cumulative Meta envelope at no more than USD 5, and deliberately enable `AI_ENABLED=true` only for the bounded experiment in [budget.md](budget.md).

7. Validate an original short Korean clip, a complete vocabulary-to-conversation journey, and one original vocabulary-page image. Check transcription confirmation, progressive help, uncertain evidence, amendments, disputes, playback failure and costs. Record actual Korean quality and latency; mock tests cannot supply those results.

8. Before deployment, test intended desktop/mobile microphones and complete the same authenticated journey on the target origin. Configure production Auth redirects, server secrets and cleanup invocation deliberately. Confirm hosting limits and submission requirements before recording the final demonstration.

Text dialogue needs Meta and Supabase. Audio input also uses Meta transcription. Azure is a separate service and cost for reply playback; text remains usable when synthesis fails. No provider calls run at build or startup.

## Account privacy and local data

Settings exposes account export/deletion and local backup/restore separately. Account export includes owned collections, conversation snapshots and minimal operation metadata. It omits raw provider replay payloads and temporary images, and refuses an export exceeding 10,000 rows in one table rather than silently truncating it.

Deletion places a durable barrier, removes only the account's private files, then deletes Auth and expires browser sign-in. Pending paid work blocks the start of deletion. Storage or Auth failures leave a visible state that can be retried; normal writes remain blocked. Session deletion and account deletion scrub private transcripts/feedback from replay records while preserving minimal accounting.

Real recordings, book pages and exports belong outside tracked artifacts, for example in ignored `private/`. Raw audio is transient. Account deletion does not claim to delete an independently retained local archive; the interface provides separate device-data management.

## Private maintenance runbook

Set a random `MAINTENANCE_SECRET` of at least 32 characters through the server secret setup. Use it only as `Authorization: Bearer <secret>` from a trusted administrative client, with `Content-Type: application/json`. Never place it in browser code or a public scheduler URL.

| Endpoint | JSON body | Behavior |
| --- | --- | --- |
| `POST /api/maintenance/uploads` | `{"dryRun":true,"limit":100}` | Reports the bounded candidate count without removing files |
| `POST /api/maintenance/uploads` | `{"dryRun":false,"limit":100}` | Removes the selected batch of abandoned private images older than 24 hours |
| `POST /api/maintenance/reconcile` | `{"operationId":"<UUID>","billedUsd":0.02,"reason":"Verified charge in the provider dashboard.","reference":"<billing reference>"}` | Records a deliberate billing decision without replaying the provider request |

Upload cleanup defaults to dry-run, accepts 1–200 files per request, returns counts and `hasMore`, and never accepts a caller-selected bucket or cutoff. Repeat bounded runs as needed. The endpoint is implemented; recurring invocation, monitoring and an initial dry-run still need configuration before deployment. Do not assume a schedule exists.

For reconciliation, inspect the provider dashboard and operation record first. Confirm the request is no longer executing; the server also refuses reservations younger than 15 minutes. Supply an explicitly verified amount from USD 0–1000, a 20–500 character reason and a 3–300 character reference. Do not include transcripts, image content or credentials in those fields. An unknown charge is not zero.

Reconciliation retains an audit and the billed budget, clears the operation's content result and marks future replay as reconciled. It does not assert that a conversation response was successfully saved, and it does not automatically retry the action. Reload current conversation state before choosing any new action.

Use `feature/<topic>` branches and only the owner's `lelouchzr` identity for Git work. Remote migrations, deployment and billable infrastructure remain separate deliberate operations.
