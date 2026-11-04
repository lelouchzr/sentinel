from pathlib import Path

import pytest

from sentinel.detection import detect
from sentinel.generator import generate
from sentinel.ingest import ingest
from sentinel.storage import Store
from sentinel.workspace import Workspace


@pytest.fixture
def workspace(tmp_path):
    return Workspace(tmp_path / "state")


@pytest.fixture(scope="session")
def demo_sources(tmp_path_factory):
    path = tmp_path_factory.mktemp("sources") / "company"
    generate(path)
    return path


@pytest.fixture
def demo(workspace, demo_sources):
    ingest(workspace, demo_sources)
    detect(Store(workspace))
    return workspace


def write_jsonl(root: Path, records: list[dict], name="events.jsonl"):
    import json

    root.mkdir(exist_ok=True)
    (root / name).write_text("".join(json.dumps(r) + "\n" for r in records))


def record(**changes):
    return {
        "timestamp": "2026-10-20T09:00:00Z",
        "source_type": "auth",
        "account": "riley",
        "source_ip": "203.0.113.9",
        "action": "login",
        "outcome": "failure",
        **changes,
    }
