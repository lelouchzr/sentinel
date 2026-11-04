from pathlib import Path

import httpx
import pytest

from slim.analysis import Codebase
from slim.config import Settings
from slim.errors import SlimError
from slim.providers import LlamaPlanner

ROOT = Path(__file__).resolve().parents[1]


def test_provider_sends_constrained_candidates_and_validates_response(monkeypatch):
    import json

    codebase = Codebase(ROOT / "examples/commerce-monolith")
    symbols = codebase.search("shipping")
    payload = {
        "entry_id": "commerce.shipping:calculate_shipping",
        "explanation": "Inject the database rules.",
        "boundaries": [{"call": "db.load_shipping_rules", "parameter": "shipping_rules"}],
        "warnings": [],
    }
    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(payload)}}]}
        )

    original = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler))
    )
    settings = Settings(workspace=ROOT, data_dir=ROOT / ".slim", model_enabled=True)
    planner = LlamaPlanner(settings)
    advice = planner.advise("shipping", symbols, "def f(): return db.load_shipping_rules()")
    assert advice.boundaries[0].parameter == "shipping_rules"
    schema = requests[0]["response_format"]["json_schema"]["schema"]
    assert "commerce.shipping:calculate_shipping" in schema["properties"]["entry_id"]["enum"]
    payload["entry_id"] = "invented.module:run"
    with pytest.raises(SlimError, match="outside the analyzed candidates"):
        planner.advise("shipping", symbols)


def test_provider_does_not_echo_remote_error_bodies(monkeypatch):
    original = httpx.Client
    monkeypatch.setattr(
        httpx,
        "Client",
        lambda **kwargs: original(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(401, text="secret-token-must-not-leak")
            )
        ),
    )
    settings = Settings(workspace=ROOT, data_dir=ROOT / ".slim", model_enabled=True)
    symbols = Codebase(ROOT / "examples/commerce-monolith").search("shipping")
    with pytest.raises(SlimError) as error:
        LlamaPlanner(settings).advise("shipping", symbols)
    assert "secret-token" not in str(error.value)


def test_boundary_from_another_candidate_is_refined_once(monkeypatch):
    import json

    symbols = Codebase(ROOT / "examples/commerce-monolith").search("shipping")
    attempts = []

    def handler(request):
        attempts.append(json.loads(request.content))
        call = "db.connect" if len(attempts) == 1 else "db.load_shipping_rules"
        payload = {
            "entry_id": "commerce.shipping:calculate_shipping",
            "explanation": "Inject shipping rules.",
            "boundaries": [{"call": call, "parameter": "shipping_rules"}],
            "warnings": [],
        }
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(payload)}}]}
        )

    original = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler))
    )
    planner = LlamaPlanner(Settings(workspace=ROOT, data_dir=ROOT / ".slim", model_enabled=True))
    source = "# commerce.shipping:calculate_shipping\ndef calculate_shipping(): return db.load_shipping_rules()\n\n# commerce.shipping:create_shipping_label\ndef create_shipping_label(): return db.connect()\n"
    advice = planner.advise("shipping", symbols, source)
    assert len(attempts) == 2
    assert advice.boundaries[0].call == "db.load_shipping_rules"
    assert advice.warnings
