# Contributing

This is a private project maintained by `lelouchzr`. Coordinate changes with the owner and preserve the current hackathon scope.

## Understand the task

Read the [README](README.md), [repository instructions](AGENTS.md), and the relevant [focused document](docs/README.md). Identify the user-visible result, acceptance criteria, and any required external operation before editing.

The initial repository is documentation only. Application scaffolding, service provisioning, and provider calls are separate development work.

## Branches and commits

- Default branch: `main`.
- Use `feature/<topic>`, `fix/<topic>`, or `docs/<topic>` for focused follow-up work.
- Commit only task-related files. Never include local credentials, imported personal data, or generated build output.
- Use a short imperative subject such as `Add vocabulary import validation` or `Document oral feedback states`.
- Commits and pushes must use the owner's `lelouchzr` account and configured email. No assistant branding, generator signatures, or automated co-author attribution.
- Preserve history; do not force-push without explicit authorization.

## Implementation conventions

Use strict TypeScript, validate untrusted input at boundaries, and keep provider SDK details out of the learning domain. Prefer the existing feature layout and small pure functions. Add comments for non-obvious invariants rather than narrating obvious code.

Use Zod contracts for model outputs and HTTP payloads. Reject missing ownership, invalid evidence references, unsupported enum values, and oversized inputs. Allow uncertainty and incomplete observations as normal product states.

Provide loading, empty, error, retry, and narrow-screen states. Microphone access must follow a user action. A speech failure must leave the conversation recoverable without duplicating turns or bills.

## Checks

Current documentation checks:

```sh
python3 scripts/check_docs.py
git diff --check
```

When the app exists, add and document scripts for lint, type checking, unit tests, browser tests, and production build. Run focused checks for the changed risk. Normal checks use deterministic fixtures and do not call paid providers.

Real provider experiments are explicit development actions with a recorded purpose and bounded budget. Keep credentials and personal content outside tracked artifacts. See [budget controls](docs/budget.md) and [evaluation](docs/quality-and-demo.md).

## Reviews and pull requests

Explain the problem, resulting behavior, and verification in the PR. Include screenshots only when they clarify a visible change, and never include private learner data. Note schema migrations, environment changes, and deployment steps separately. A PR does not authorize running those operations against production.

## Reporting problems

Use a private issue for ordinary defects, including expected behavior, actual behavior, and a minimal reproduction. Follow [SECURITY.md](SECURITY.md) for security reports. Do not upload access keys or personal recordings to issues.
