import asyncio

import httpx
import pytest
from openai import AsyncOpenAI
from stub_provider import OfflineProvider

from sentinel.agent import MetaProvider, investigate
from sentinel.cases import Cases
from sentinel.config import AgentConfig
from sentinel.detection import load_alerts
from sentinel.mcp_client import connect
from sentinel.security import SentinelError
from sentinel.storage import Store


def setup_case(demo):
    cases = Cases(demo)
    alert = next(a for a in load_alerts(Store(demo)) if a.rule_id == "AUTH-002")
    return cases, cases.create(alert.alert_id)


def configuration(**changes):
    return AgentConfig(api_key="offline-test-not-a-live-key", deadline=90, **changes)


@pytest.mark.integration
async def test_real_mcp_subprocess_discovery_search_event(demo):
    cases, case = setup_case(demo)
    async with connect(demo, case.case_id) as bridge:
        tools = await bridge.discover()
        assert {t.name for t in tools} == {
            "get_dataset_summary",
            "list_alerts",
            "search_events",
            "get_event",
            "get_entity_activity",
            "build_timeline",
            "attach_evidence",
            "save_case_notes",
        }
        assert all(t.outputSchema for t in tools)
        summary = await bridge.call("get_dataset_summary")
        assert summary["event_count"] == 3542
        page = await bridge.call(
            "search_events",
            {"filters": {"account": "morgan", "source_ip": "203.0.113.74"}, "limit": 2},
        )
        assert page["returned"] == 2 and page["total"] == 27 and page["truncated"]
        event = await bridge.call("get_event", {"event_id": page["events"][0]["event_id"]})
        assert event["source"]["filename"] and event["source"]["original"]
        await bridge.call("attach_evidence", {"event_ids": [event["event_id"]]})
        await bridge.call(
            "save_case_notes", {"note": "Source record inspected through the real MCP protocol."}
        )
        with pytest.raises(SentinelError):
            await bridge.call("search_events", {"filters": {"sql": "SELECT *"}})
    assert cases.get(case.case_id).notes


@pytest.mark.integration
async def test_offline_orchestration_uses_actual_mcp(demo):
    cases, case = setup_case(demo)
    provider = OfflineProvider()
    completed = await investigate(
        cases,
        case.case_id,
        "Check the authentication sequence and linked export.",
        configuration(),
        provider,
    )
    assert completed.status == "reviewed" and "OFFLINE TEST MODE" in completed.provider
    assert provider.closed
    assert "24 matching events" in "\n".join(f.explanation for f in completed.findings)
    assert any(a.role == "MCP" and a.action == "Calling get_event" for a in completed.activity)
    assert {"Investigator", "Evidence reviewer", "Reporter"} <= {a.role for a in completed.activity}
    assert len(completed.evidence_ids) == 27
    assert all(f.verification != "Pending verification" for f in completed.findings)
    assert Cases(demo).get(case.case_id).summary == completed.summary


@pytest.mark.integration
async def test_cancel_retains_completed_work_and_prevents_duplicate_runs(demo):
    cases, case = setup_case(demo)
    provider = OfflineProvider(pause=True)
    task = asyncio.create_task(
        investigate(cases, case.case_id, "Inspect activity.", configuration(), provider)
    )
    for _ in range(1000):
        if provider.stage >= 3:
            break
        await asyncio.sleep(0.01)
    assert provider.stage >= 3
    duplicate = OfflineProvider()
    with pytest.raises(SentinelError, match="already"):
        await investigate(cases, case.case_id, "Second run", configuration(), duplicate)
    assert cases.get(case.case_id).status == "investigating"
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    saved = cases.get(case.case_id)
    assert saved.status == "interrupted" and len(saved.evidence_ids) >= 24
    assert any(a.action.startswith("Completed search_events") for a in saved.activity)
    assert provider.closed and duplicate.closed


async def test_meta_transport_failure_is_safe_and_no_retry():
    requests = []

    async def handler(request):
        requests.append(request)
        return httpx.Response(401, json={"error": {"message": "sensitive-provider-debug"}})

    provider = MetaProvider(configuration())
    await provider.client.close()
    provider.client = AsyncOpenAI(
        api_key="offline-test-not-a-live-key",
        base_url="https://api.meta.ai/v1",
        max_retries=0,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(SentinelError, match="Meta request failed") as error:
        await provider.complete([{"role": "user", "content": "test"}])
    assert "sensitive" not in str(error.value) and len(requests) == 1
    await provider.close()


@pytest.mark.integration
async def test_model_timeout_retains_case(demo):
    cases, case = setup_case(demo)

    class Slow(OfflineProvider):
        async def complete(self, *args, **kwargs):
            await asyncio.Event().wait()

    with pytest.raises(SentinelError, match="timed out"):
        await investigate(
            cases, case.case_id, "Investigate", configuration(request_timeout=1), Slow()
        )
    saved = cases.get(case.case_id)
    assert saved.status == "interrupted"
    assert any(a.action == "Completed get_dataset_summary" for a in saved.activity)


@pytest.mark.integration
async def test_unseen_references_are_flagged(demo):
    cases, case = setup_case(demo)
    result = await investigate(
        cases, case.case_id, "Inspect references", configuration(), OfflineProvider(invalid=True)
    )
    assert result.status == "reviewed"
    assert all("E-" + "0" * 24 not in f.event_ids for f in result.findings)
    assert any("not retrieved" in warning for warning in result.open_questions)


@pytest.mark.integration
async def test_standalone_mcp_cannot_write_unbound_case(demo):
    async with connect(demo) as bridge:
        await bridge.discover()
        with pytest.raises(SentinelError, match="rejected"):
            await bridge.call("save_case_notes", {"note": "Must not select a case implicitly"})


@pytest.mark.integration
async def test_total_deadline_retains_context(demo):
    cases, case = setup_case(demo)

    class DeadlineProvider(OfflineProvider):
        async def complete(self, *args, **kwargs):
            await asyncio.Event().wait()

    config = configuration().model_copy(update={"deadline": 5, "request_timeout": 45})
    with pytest.raises(SentinelError):
        await investigate(cases, case.case_id, "Bound the total run", config, DeadlineProvider())
    assert cases.get(case.case_id).status == "interrupted"
    assert any(
        a.action == "Completed get_dataset_summary" for a in cases.get(case.case_id).activity
    )
