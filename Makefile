.PHONY: setup dev api test check demo benchmark web-build

setup:
	uv sync --frozen
	cd web && npm ci

dev:
	uv run python scripts/dev.py

api:
	uv run slim serve

test:
	uv run pytest

check:
	uv run ruff check src tests scripts
	uv run pytest
	cd web && npm run build

demo:
	uv run slim demo

benchmark:
	SLIM_ALLOW_EXECUTION=1 uv run --extra upstream python scripts/benchmark.py

web-build:
	cd web && npm run build
