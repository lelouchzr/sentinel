import os
import shutil
from pathlib import Path

import pytest

from slim.config import Settings
from slim.demo import demo_request
from slim.errors import SlimError
from slim.models import PlanRequest
from slim.repository import Repositories
from slim.service import ExtractionService
from slim.store import Store

ROOT = Path(__file__).resolve().parents[1]


def test_source_drift_blocks_a_previously_reviewed_plan(tmp_path):
    shutil.copytree(ROOT / "examples/commerce-monolith", tmp_path / "source")
    request = demo_request(ROOT).model_copy(update={"source": str(tmp_path / "source")})
    service = ExtractionService(
        Settings(workspace=tmp_path, data_dir=tmp_path / ".slim", allow_execution=True)
    )
    try:
        job = service.create_plan(request)
        with (tmp_path / "source/commerce/shipping.py").open("a") as handle:
            handle.write("\n# changed after review\n")
        with pytest.raises(SlimError, match="Source changed"):
            service.run_sync(job["id"], "extract")
        assert service.store.get(job["id"])["status"] == "failed"
    finally:
        service.close()


def test_untrusted_local_execution_requires_explicit_opt_in(tmp_path):
    (tmp_path / "app.py").write_text("def f(): return 1\n")
    service = ExtractionService(Settings(workspace=tmp_path, data_dir=tmp_path / ".slim"))
    try:
        job = service.create_plan(PlanRequest(source=str(tmp_path), entry="app:f"))
        service.run_sync(job["id"], "extract")
        with pytest.raises(SlimError, match="Local execution is disabled"):
            service.run_sync(job["id"], "validate")
    finally:
        service.close()


def test_artifact_tampering_blocks_validation(tmp_path):
    service = ExtractionService(Settings(workspace=ROOT, data_dir=tmp_path))
    try:
        job = service.create_plan(demo_request(ROOT))
        service.run_sync(job["id"], "extract")
        (service.artifact(job["id"]) / "src/shipping_core/__init__.py").write_text("# tampered")
        with pytest.raises(SlimError, match="artifact changed"):
            service.run_sync(job["id"], "validate")
    finally:
        service.close()


def test_restart_marks_active_jobs_interrupted(tmp_path):
    store = Store(tmp_path)
    job = store.create({}, {}, "hash")
    store.transition(job["id"], {"planned"}, "extracting", "started")
    store.recover()
    assert store.get(job["id"])["status"] == "interrupted"


def test_another_service_does_not_interrupt_a_live_worker(tmp_path):
    store = Store(tmp_path)
    job = store.create({}, {}, "hash")
    store.transition(job["id"], {"planned"}, "validating", "started", owner_pid=os.getpid())
    Store(tmp_path).recover()
    assert store.get(job["id"])["status"] == "validating"


def test_clone_url_cannot_address_local_network(tmp_path):
    repo = Repositories(Settings(workspace=tmp_path, data_dir=tmp_path / ".slim"))
    with pytest.raises(SlimError, match="Only public HTTPS"):
        repo.clone("https://127.0.0.1/repo.git")
