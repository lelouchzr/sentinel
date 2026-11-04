# Storyscape

- Keep all current UI copy, authored stories, documentation and default model output in English. Preserve historical evidence verbatim and compatibility IDs.
- React/TypeScript application using Vinext, Cloudflare D1 and R2.
- App routes are in `app/`, UI in `components/storyscape/`, game rules in `lib/game.ts`, server API in `lib/server.ts`, and Meta adapters in `lib/meta.ts`.
- Validate model proposals with the same deterministic contracts as manual stories. Keep puzzle answers and hidden dependencies on the server.
- Preserve published snapshots, existing play capabilities and the original `frame-play-*` / `frame-creation` browser-storage namespaces.
- Preserve Site project identity and the current owner-private audience unless the user explicitly changes access.
- Keep runtime secrets in Sites or environment variables. Never commit `.env`, credentials, `.wrangler`, `.sites-runtime`, build output or dependency caches.
- Preserve licenses, image hashes, original generation manifests and adaptation provenance. Historical FRAME credits in source evidence describe the original creation.
- Run `make check` before delivery. Use `make integration` against a disposable loopback server for API or rule changes; integration scripts must never target production.
- Do not run paid Meta calls automatically in CI or as a retry. Existing captured Meta evidence is used for regression tests.
- The former Slim project is preserved on `archive/slim-2026-11-04` in GitHub. Do not restore its Python tooling into the main app.
