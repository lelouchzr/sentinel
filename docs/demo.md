# Demo and filming guide

## Prepare

```sh
uv sync --frozen --extra upstream
cd web && npm ci && npm run build && cd ..
ollama pull llama3.2:3b
SLIM_MODEL_ENABLED=1 make dev
```

Open <http://localhost:5173>. The default demo is offline after setup; the first
Llama call can take longer while the model loads. The source code is real and the
comparison runs when clicked. There are no mocked success states in the interface.

For the upstream benchmark, review the public repositories and run:

```sh
SLIM_ALLOW_EXECUTION=1 uv run python scripts/benchmark.py
```

This clones Requests, Werkzeug and Django, records their exact commits, extracts
three standard-library-only features, compares 34 scenarios, builds three wheels,
installs them with `--no-deps` in a fresh environment, and runs the independent
application in `examples/consumer/app.py`. Raw evidence is in
`artifacts/benchmark-results.json`; the source checkouts and generated packages
are inside `.slim/`. Both are ignored by Git.

The UI's repository presets include the same input scenarios. Arbitrary local
execution remains disabled unless explicitly enabled. Open source samples can be
inspected and extracted with default settings; to compare them from the UI, start
with `SLIM_ALLOW_EXECUTION=1 SLIM_MODEL_ENABLED=1 make dev` after reviewing the code.

## Two-minute recording

| Time | Screen/action | Narration |
| --- | --- | --- |
| 00:00–00:15 | Open commerce demo; show original dependency closure | “You found a useful feature in a large codebase. Copying the function is easy. Bringing its hidden dependencies is the hard part.” |
| 00:15–00:35 | Edit specification → Ask Meta Llama → review selected function | “Slim uses Meta Llama to interpret the request and propose an extraction boundary. Python's parser follows the actual dependencies.” |
| 00:35–00:55 | Point to `db.load_shipping_rules` → `shipping_rules`; click Extract feature | “Here the shipping calculator reads from a database. Slim turns that hidden lookup into an explicit argument. The database code disappears from the package.” |
| 00:55–01:15 | Source & output → Extracted → show signature and package files | “This is an installable Python package with source attribution, exact hashes, scenarios and the original license.” |
| 01:15–01:35 | Compare behavior → expand free-shipping and invalid-weight rows | “Both versions run in fresh processes. Ten scenarios agree, including expected exceptions. These are tested examples, not a mathematical proof.” |
| 01:35–01:50 | Open latest Django result; show source footprint and 12 matches | “We also exercised real repositories: Requests, Werkzeug and Django. Django's IPv6 validator was extracted from a codebase with more than half a million Python lines.” |
| 01:50–02:00 | Terminal: independent consumer output from benchmark | “The extracted wheels run together in a clean application without their original frameworks. Slim helps useful code travel.” |

## Useful commands during filming

```sh
# Run the local demonstration through the same backend as the UI.
uv run slim demo --output artifacts/new-shipping-core

# Run the three already-installed extracted packages from outside the source tree.
artifacts/upstream/consumer-venv/bin/python examples/consumer/app.py --upstream

# Inspect the full generated provenance and per-case evidence.
cat artifacts/benchmark-results.json
```

Use a new output directory for each CLI demo; Slim refuses to overwrite one.
The web workbench assigns a new ID to each extraction. Keep the original JSON
reports available during editing so claims in the recording stay traceable.

## Meta positioning

Meta Llama is the semantic planner: it selects a candidate and proposes boundary
adaptations. The AST engine is the structural authority. Execution produces the
behavioral evidence. Record an actual Llama-assisted plan; the footer saying a
model is available is not evidence that a particular extraction used it.

No submission-specific requirements were supplied. Confirm the event's length,
deadline, attribution, permitted models and required links before submitting.
