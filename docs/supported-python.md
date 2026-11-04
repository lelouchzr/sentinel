# Supported Python and honest limits

The current implementation is a complete local prototype for a deliberately
bounded extraction contract, not a universal Python compiler or migration service.

| Capability | Contract |
| --- | --- |
| Entry | A module-level function, async function, or class, selected as `module:name` |
| Dependencies | Transitive module-level declarations, constants, decorators and imports |
| Scopes | Python `symtable` distinguishes local parameters from global dependencies |
| Imports | Relative and absolute local imports are relocated; grouped imports are sliced by alias |
| Module imports | Conservative: retain all bound declarations of the imported module |
| Adaptation | Replace reviewed zero-argument calls inside the selected function with required keyword-only values |
| Classes | Package the class and closure; scenarios can construct it and invoke a named public method |
| Scenarios | JSON args/kwargs, original module fixture state, candidate-only injected kwargs |
| Values | Type-tagged primitives, bytes, lists, tuples, mappings, sets, Decimal and nonfinite floats |
| Source | Local repository inside the configured workspace or a public HTTPS GitHub clone |
| Package | Setuptools project, source, scenarios, hashes, root licenses, provenance and ZIP download |

## Unsupported or conservative behavior

* `eval`, `exec`, `__import__`, `globals`, unresolved globals, wildcard-dependent
  lookup and source-relative file resources require manual extraction.
* Reflection, monkey patching, metaclasses, import hooks and framework registries
  can defeat static analysis. Some are detected; others need scenario coverage
  and human review. Diagnostics are not a completeness proof.
* Top-level mutation and initialization that do not bind a declaration are omitted
  and disclosed when detectable. Package initializers are synthesized unless
  declarations in them are actually selected; import side effects may differ.
* External import names are reported, but are not silently treated as PyPI
  distribution names. Review and map them before publishing the package. The three
  curated extraction outputs require only the standard library.
* Value injection rejects argument-taking calls, nested-function entries,
  multiply-defined entries and conflicting parameter names. It does not propagate
  a new parameter through an arbitrary call graph.
* Only return values and exception type/message are compared. Filesystem changes,
  network calls, database writes, timing, stdout and internal state are not a
  behavioral equivalence oracle. Run trusted, deterministic examples.
* Repeated calls each get a fresh process; persistent state and operation sequences
  are outside the current comparison contract.
* AST generation preserves declarations and docstrings, but reformats code and
  removes most comments. Original source ranges and full license copies remain available.
* There is no autonomous model-generated repair loop, private Git authentication,
  multi-user authentication, job cancellation UI, GPU worker pool or hosted deployment.

## Execution

The bundled commerce demo can run by default. Other local execution requires
`SLIM_ALLOW_EXECUTION=1`. The worker removes inherited provider credentials and
Python environment variables, starts a fresh process group, limits CPU/output,
and enforces a wall-clock deadline. This is not a sandbox for malicious code.

`SLIM_RUNNER=docker` adds no-network execution, read-only source mounts, non-root
UID, no capabilities, no-new-privileges, resource limits and a small temporary
filesystem. Pull `python:3.12-slim` before validation. Original projects needing
third-party dependencies will need a prepared image; the default image contains
only the Python standard library. Docker Desktop must be functioning.

## Model

Meta Llama receives candidate signatures, docstrings and bounded source excerpts.
JSON Schema constrains the selected symbol, boundary call and suggested parameter
names. The backend validates the result again and binds advice to a source hash.
Users can edit the specification before extraction. Llama never executes shell
commands or overrides a failed comparison. A configured hosted endpoint receives
the excerpts; the default Ollama endpoint stays on the local machine.
