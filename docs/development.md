# Development setup

## What exists now

The baseline contains documentation, repository metadata, a small original vocabulary fixture, and a Python standard-library documentation checker. No Node dependencies, application server, database schema, provider keys, or deployed services exist yet.

Run the checks that are available:

```sh
python3 scripts/check_docs.py
git diff --check
```

GitHub Actions runs the same documentation checker without application secrets or paid provider calls. The workflow uses a commit-pinned official checkout action.

## Application setup sequence

During the first implementation task:

1. Select compatible stable Next.js, React, and TypeScript releases, and a supported Node LTS release. Record the exact versions and package manager in the manifest/runtime files.
2. Scaffold the minimal application and feature directories described in [architecture](architecture.md). Pin one package-manager version and commit one lockfile.
3. Add lint, typecheck, unit-test, browser-test, build, and development scripts; update this file with the commands that actually run.
4. Add Zod contracts and provider interfaces. Ordinary tests use deterministic fixtures.
5. Create database migrations and RLS tests before storing learner data. Apply remote migrations only to the intended, explicitly configured development project.
6. Add the authenticated microphone-to-transcript-to-reply path and perform a bounded real-provider experiment when development is authorized and credentials are configured.

There is no `npm install`, `pnpm dev`, or build command to run before the application manifest is created. Do not fabricate a lockfile or install unspecified latest packages during documentation-only work.

## Environment configuration

The tracked [`.env.example`](../.env.example) is a proposed variable contract. Copy it to an ignored `.env.local` when implementing the runtime. Keep `AI_ENABLED=false` until the authorization, quota, and provider boundaries are implemented and a real experiment is deliberately started.

Public variables contain only the app origin and appropriate Supabase public configuration. Provider API keys and privileged Supabase credentials are server-only. Never request or paste credentials into an issue, PR, or chat transcript; configure them in the normal local or hosting secret store.

The example's limits are intended policy values, not currently enforced behavior. Model identifiers and the voice candidate must be confirmed against the owner's actual account and region. Azure usage is separate from the Meta credits.

## Local experiments

Use `examples/` for original, non-personal fixtures. Keep real textbook scans, audio, exports, and provider responses under ignored `private/` or `evals/private/`. A fixture's presence does not mean a real provider or hosted Auth/Storage has been verified.

Record each real experiment's purpose, model, prompt/schema version, latency, usage, and result in an appropriate private log. Publish only aggregate non-sensitive evidence to the repository. Unknown billing values remain unknown.

## Git workflow

Before committing or pushing, inspect:

```sh
git status --short --branch
git remote -v
git config --get user.name
git config --get user.email
gh api user --jq .login
```

The remote must belong to `lelouchzr`, remain private, and receive commits authored/committed using that owner's configured identity. Use local configuration changes only when needed. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for branch and commit conventions.

## First deployment checklist

- Verify the app build and the complete provider-free browser flow.
- Validate Supabase policies using two independent accounts.
- Check allowed microphone origins, callback URLs, upload size limits, and actual hosting request durations.
- Configure separate development and production secrets intentionally.
- Confirm model access and the current available budget before enabling paid calls.
- Confirm raw-audio handling, image cleanup, account deletion, and logs.
- Deploy only within an explicit implementation/deployment task; the initial repository publication does not deploy the product.
