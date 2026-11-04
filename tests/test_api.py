import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from slim.api import create_app
from slim.config import Settings

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(Settings(workspace=ROOT, data_dir=tmp_path))) as client:
        yield client


def wait_job(client, job_id):
    for _ in range(100):
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] not in {"extracting", "validating"}:
            return job
        time.sleep(0.05)
    pytest.fail("Background job did not complete")


def test_full_http_workflow_and_download(client):
    spec = client.get("/api/demo").json()
    response = client.post("/api/plans", json=spec)
    assert response.status_code == 201
    job_id = response.json()["id"]
    assert client.post(f"/api/jobs/{job_id}/extract").status_code == 202
    assert wait_job(client, job_id)["status"] == "extracted"
    assert client.post(f"/api/jobs/{job_id}/extract").status_code == 409
    assert client.post(f"/api/jobs/{job_id}/validate").status_code == 202
    result = wait_job(client, job_id)
    assert result["report"]["matched"] == 10
    assert len(result["events"]) == 5
    download = client.get(f"/api/jobs/{job_id}/download")
    assert download.status_code == 200
    assert download.content[:2] == b"PK"
    files = client.get(f"/api/jobs/{job_id}/files").json()
    assert "PROVENANCE.json" in files["generated"]


def test_path_traversal_and_cross_origin_are_blocked(client):
    assert client.post("/api/analyze", json={"source": "/etc"}).status_code == 403
    assert client.get("/api/health", headers={"Origin": "https://hostile.example"}).status_code == 403
    spec = client.get("/api/demo").json()
    job_id = client.post("/api/plans", json=spec).json()["id"]
    assert client.get(f"/api/jobs/{job_id}/file", params={"path": "../../pyproject.toml", "side": "source"}).status_code == 403
    assert client.post("/api/analyze", json={"source": "http://127.0.0.1"}).status_code >= 400


def test_invalid_spec_and_unknown_job_are_clear(client):
    spec = client.get("/api/demo").json()
    spec["package_name"] = "../../outside"
    assert client.post("/api/plans", json=spec).status_code == 422
    assert client.get("/api/jobs/unknown").status_code == 404
    assert client.post("/api/advise", json={"source": "examples/commerce-monolith", "query": "shipping"}).json()["error"] == "model_disabled"
