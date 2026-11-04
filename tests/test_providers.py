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
