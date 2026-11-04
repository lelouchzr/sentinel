# Slim

**A feature belongs in your product. Its entire repository doesn't.**

Slim finds a Python feature, follows its dependencies, replaces explicit external
boundaries, builds an installable package, and compares it with the original on
the scenarios you provide. A React workbench makes every decision visible.

This is a local developer tool. Static analysis never imports the source repository.
Executing a source repository is a separate, explicitly enabled operation.

## Quick start

```sh
uv sync --frozen
cd web && npm ci && cd ..
make dev
```

Open <http://localhost:5173>. The included commerce example works offline.
See [architecture](docs/architecture.md), [demo guide](docs/demo.md), and
[supported Python](docs/supported-python.md) for the precise contract.

## License

Slim is MIT licensed. Extracted code keeps the source repository's license and attribution.
Slim does not determine whether a particular reuse is legally permitted.
