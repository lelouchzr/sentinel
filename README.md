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

## A complete local workflow

* Search functions and classes in a local or public GitHub Python repository.
* Ask a local Meta Llama model to choose an entry and suggest explicit boundaries.
* Review its dependency closure, adapt zero-argument lookups into injected values,
  and inspect original versus generated code.
* Download an installable package with exact source attribution and license copies.
* Compare values and expected exceptions on supplied input scenarios.

To use Meta Llama locally:

```sh
ollama pull llama3.2:3b
SLIM_MODEL_ENABLED=1 make dev
```

To exercise Requests, Werkzeug and Django, build their extracted wheels, and use
them in an independent consumer without the original frameworks:

```sh
make benchmark
```

The included commerce demo compares 10 scenarios after removing the database
lookup. The upstream benchmark compares 34 more. See the [actual run evidence](evidence/README.md).
Matching these inputs is evidence, not a general proof of equivalence.

## Build and checks

```sh
make check
uv build
```

`make dev` starts the API on port 8000 and Vite on port 5173. After
`cd web && npm run build`, `uv run slim serve` can serve the built workbench
directly on <http://localhost:8000>.

For a container build, use `docker build -t slim .` and
`docker run --rm -p 127.0.0.1:8000:8000 slim`. The Docker execution backend is a
separate optional feature; its local verification limitation is recorded in the evidence.

## License

Slim is MIT licensed. Extracted code keeps the source repository's license and attribution.
Slim does not determine whether a particular reuse is legally permitted.
