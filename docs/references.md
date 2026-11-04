# Official references

Checked during implementation on 2026-11-04. Dependencies are pinned to the versions actually
installed and tested in pyproject.toml; uv.lock records transitive versions and package hashes.

- [Meta Chat Completions quickstart](https://dev.meta.ai/docs/cookbook/quickstart-chat-completions):
  verified API base `https://api.meta.ai/v1`, model `muse-spark-1.3`, compatible Python SDK and
  `MODEL_API_KEY` convention. Sentinel also accepts the explicitly prioritized `META_API_KEY`.
- [Meta Chat Completions protocol](https://dev.meta.ai/docs/protocols/chat-completions): message roles,
  tool-call replies, structured JSON output and completion limits.
- [Meta reasoning controls](https://dev.meta.ai/docs/reasoning): `reasoning_effort=low` used for bounded
  investigation turns; no raw private reasoning is displayed or saved.
- [Meta structured output](https://dev.meta.ai/docs/structured-output): report requests use
  `response_format.type=json_schema`, `strict=true`, all properties required, and
  `additionalProperties=false`. JSON-object mode alone does not enforce a report schema.
- [Official MCP SDK v1 documentation](https://py.sdk.modelcontextprotocol.io/v1/) and
  [v1 source](https://github.com/modelcontextprotocol/python-sdk/tree/v1.x): maintenance-line pinning,
  FastMCP structured tools, stdio_client and ClientSession. Sentinel uses 1.30.0 only.
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector): optional native-terminal,
  CLI and graphical inspection of a stdio server.
- [Textual workers](https://textual.textualize.io/guide/workers/) and
  [Textual testing](https://textual.textualize.io/guide/testing/): responsive workers and Pilot tests.
- [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview) and
  [concurrency](https://duckdb.org/docs/stable/connect/concurrency): parameterized local queries,
  connection lifetime and serialized multi-process access.
- [uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/): clean installs with
  `uv sync --locked` and committed uv.lock.
- [Typer documentation](https://typer.tiangolo.com/),
  [Pydantic documentation](https://docs.pydantic.dev/latest/),
  [Rich documentation](https://rich.readthedocs.io/en/stable/),
  [pytest documentation](https://docs.pytest.org/en/stable/) and
  [Ruff documentation](https://docs.astral.sh/ruff/): CLI, validation, output and local checks.

- [filelock documentation](https://py-filelock.readthedocs.io/en/stable/): native process locks,
  bounded acquisition and persistent lock-file identity on Unix and Windows.
- [Python zoneinfo data sources](https://docs.python.org/3/library/zoneinfo.html#data-sources):
  explicit tzdata dependency supplies IANA zones on Windows and other systems lacking system data.
- [uv in GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/): pinned official actions,
  locked environments and native runner matrix configuration.
