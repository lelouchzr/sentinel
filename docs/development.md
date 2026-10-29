# Development setup

## Run locally

Use Node `26.13.0` (recorded in `.nvmrc`) and npm `11.20.0`. Dependencies are pinned in `package.json`; `package-lock.json` is the only lockfile.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Without credentials, import the original Korean/French sample or your own text export, correct the draft, confirm it, and prepare a practice session. Vocabulary and oral history are device-local. There is no fake conversation fallback when AI is unavailable.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check:docs
git diff --check
```

`npm run check` generates Next.js route types, checks TypeScript and formatting, then runs unit/integration tests and documentation checks. Use `npm run format` to format source and tests. Unit tests do not contact providers. Database tests run the actual SQL migration in embedded PostgreSQL with Auth/Storage stubs; they verify RLS and budget logic, but do not replace testing a configured Supabase project. Browser tests require Chrome or a Playwright Chromium installation; see `playwright.config.ts`. No separate lint command is claimed.

## Configure services when ready

```sh
cp .env.example .env.local
```

Keep secrets in that ignored file. Never paste them in chat, commits, screenshots or issue bodies. Configure the intended development Supabase project URL, publishable key and server secret key. Review and apply the SQL in `supabase/migrations/` to that project through your normal migration workflow; no migration has been applied automatically. The migration creates a private `vocabulary-pages` bucket. Configure Auth to allow the local app origin and `/auth/callback` redirect URL.

Set `NEXT_PUBLIC_APP_URL` to the actual origin you use, for example `http://127.0.0.1:3000`. Restart the dev server after changing environment variables. `/settings` shows presence checks and email-link sign-in; it does not prove that model access or database setup works.

For paid operations, configure Meta and optionally Azure Speech. Azure is billed separately. Review current prices and remaining credits, then deliberately set `AI_ENABLED=true` for a bounded integration experiment. Defaults enforce a cumulative `$5` Meta experiment envelope within the `$120` development allocation. The application reserves `$1` per pending operation before dispatch and settles known Meta usage at documented estimated rates. Unknown charges keep their reservation. See [budget policy](budget.md).

Text conversation uses Meta and Supabase. Audio input additionally uses Meta transcription. Reply playback requires Azure; the text reply remains available if playback fails. No provider requests run during build or startup.

## Private content and cleanup

Real recordings, book pages and exports belong outside tracked artifacts, for example under ignored `private/`. Audio is transient. Extracted source images are removed after the request where possible, but interrupted uploads need a scheduled cleanup before deployment. Local vocabulary is not backed up to an account. Session deletion clears its transcripts/feedback and operation replay content, while retaining minimal accounting records.

An unresolved provider operation keeps its reservation and session exclusion. Inspect the provider dashboard and the private operation record before reconciling it through a deliberate administrative procedure. No automatic timeout-based unlock or billable retry is implemented.

## Delivery gate

The implementation remains local. Before deployment: test real provider access and Korean quality, run the full authenticated journey, verify two real Supabase users cannot access each other's data, check microphone behavior on intended browsers, implement abandoned-upload retention, review account deletion, and confirm the participant portal submission rules.

Use `feature/<topic>` branches and only the owner's `lelouchzr` Git identity. Do not include tooling attribution or generated build files. Deployment and remote migrations are separate external operations.
