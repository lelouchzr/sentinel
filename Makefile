.PHONY: check integration demo
check:
	uv run ruff format --check .
	uv run ruff check .
	uv run pytest -q
integration:
	uv run pytest -q -m integration
# No network listener: the integration transport is a disposable local stdio child.
demo:
	uv run sentinel demo
