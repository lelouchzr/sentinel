# Slim

- Python engine in `src/slim`, React/TypeScript workbench in `web/src`.
- Source repositories are read-only. Static analysis must never import source code.
- Model output is advisory and must pass the same deterministic contracts as manual input.
- Preserve upstream licenses, source commits, hashes and adaptation provenance.
- Reports must distinguish matched, diverged and unverified cases. Do not claim general equivalence.
- Local subprocess execution is for trusted repositories; it is not a security sandbox.
- Never commit `.env`, `.slim`, build artifacts, credentials or source checkout caches.
- Run `make check` before delivery. Use the real-repository benchmark when changing slicing or packaging.
- Keep changes focused and commit actual work at its real creation time.
