import asyncio
from contextlib import suppress

import pytest
from textual.widgets import DataTable, Input, Static, TabbedContent
from textual.worker import WorkerCancelled

from sentinel.cases import Cases
from sentinel.tui import EvidenceScreen, HelpScreen, SentinelApp


@pytest.mark.parametrize("size", [(140, 42), (100, 30)])
async def test_terminal_navigation_evidence_notes_export(demo, size):
    app = SentinelApp(demo)
    async with app.run_test(size=size) as pilot:
        await app.workers.wait_for_complete()
        assert app.query_one("#alerts", DataTable).row_count == 15
        assert app.query_one("#events", DataTable).row_count == 100
        await pilot.press("enter")
        await pilot.pause()
        assert app.case_id and Cases(demo).get(app.case_id).evidence_ids
        await pilot.press("enter")
        await pilot.pause()
        assert isinstance(app.screen, EvidenceScreen)
        assert "identity.csv" in str(app.screen.query_one("#event-detail", Static).content)
        await pilot.press("escape", "f1")
        assert isinstance(app.screen, HelpScreen)
        await pilot.press("escape", "f3")
        app.query_one("#filters", Input).value = "account=svc-backup"
        await pilot.press("enter")
        await app.workers.wait_for_complete()
        assert app.total == 6
        app.query_one("#main-tabs", TabbedContent).active = "case-tab"
        app.query_one("#note", Input).value = "Verify approved batch context."
        app.query_one("#note", Input).focus()
        await pilot.press("enter")
        assert Cases(demo).get(app.case_id).notes == ["Verify approved batch context."]
        await pilot.press("f5")
        await app.workers.wait_for_complete()
        assert demo.path(f"reports/{app.case_id}.md").exists()
        await pilot.press("f2")
        assert app.focused.id == "question"
        # Ordinary letters stay in the text input instead of triggering shortcuts.
        await pilot.press("q", "a", "s", "e")
        assert app.query_one("#question", Input).value == "qase"
        case_id = app.case_id
    reopened = SentinelApp(demo, case_id)
    async with reopened.run_test(size=size) as pilot:
        await reopened.workers.wait_for_complete()
        assert reopened.case_id == case_id
        assert "Verify approved batch context" in str(
            reopened.query_one("#case-text", Static).content
        )


@pytest.mark.integration
async def test_tui_stays_responsive_and_cancels_real_mcp_worker(demo, monkeypatch):
    from stub_provider import OfflineProvider

    from sentinel import tui
    from sentinel.agent import investigate as actual_investigate

    provider = OfflineProvider(pause=True)
    monkeypatch.setenv("META_API_KEY", "offline-test-mode-never-a-live-key")

    async def offline(cases, case_id, question, config, on_activity=None):
        return await actual_investigate(cases, case_id, question, config, provider, on_activity)

    monkeypatch.setattr(tui, "investigate", offline)
    app = SentinelApp(demo)
    async with app.run_test(size=(100, 30)) as pilot:
        await app.workers.wait_for_complete()
        await pilot.press("enter", "f2")
        app.query_one("#question", Input).value = "Check the session evidence"
        await pilot.press("enter")
        for _ in range(1000):
            if provider.stage >= 3:
                break
            await asyncio.sleep(0.01)
        assert provider.stage >= 3
        await pilot.press("f1")
        assert isinstance(app.screen, HelpScreen)
        await pilot.press("escape", "ctrl+g")
        # Cancellation includes shutting down the real MCP child. A UI frame is
        # not a completion signal on slower native runners.
        with suppress(WorkerCancelled):
            await asyncio.wait_for(app.agent_worker.wait(), timeout=15)
        assert Cases(demo).get(app.case_id).status == "interrupted"
        assert Cases(demo).get(app.case_id).evidence_ids
        assert provider.closed


async def test_tui_reopening_recovers_stale_investigation(demo):
    cases = Cases(demo)
    case = cases.create()
    cases.note(case.case_id, "Preserved after an abrupt process exit.")
    cases.update(case.case_id, lambda c: setattr(c, "status", "investigating"))
    app = SentinelApp(demo, case.case_id)
    async with app.run_test(size=(100, 30)):
        await app.workers.wait_for_complete()
        assert cases.get(case.case_id).status == "interrupted"
        content = str(app.query_one("#case-text", Static).content)
        assert "INTERRUPTED" in content and "Preserved after an abrupt process exit" in content


async def test_case_brief_guides_without_starting_model_and_keeps_drafts(demo):
    app = SentinelApp(demo)
    async with app.run_test(size=(100, 30)) as pilot:
        await app.workers.wait_for_complete()
        await pilot.press("enter", "f6")
        await app.workers.wait_for_complete()
        assert app.query_one("#main-tabs", TabbedContent).active == "brief-tab"
        brief = str(app.query_one("#brief-text", Static).content)
        assert "WHY THIS CASE" in brief and "24" in brief and "ATTACHED EVIDENCE" in brief
        await pilot.click("#suggest-question")
        assert "authentication sequence" in app.query_one("#question", Input).value
        assert app.agent_worker is None
        app.query_one("#question", Input).value = "Keep my existing draft."
        await pilot.click("#suggest-question")
        assert app.query_one("#question", Input).value == "Keep my existing draft."
        assert app.agent_worker is None


async def test_entity_pivots_and_case_filter_state_are_consistent(demo):
    from sentinel.models import SearchFilters
    from sentinel.storage import Store

    app = SentinelApp(demo)
    async with app.run_test(size=(100, 30)) as pilot:
        await app.workers.wait_for_complete()
        await pilot.press("enter", "enter")
        assert isinstance(app.screen, EvidenceScreen)
        detail = str(app.screen.query_one("#event-detail", Static).content)
        assert "SOURCE REFERENCE" in detail and "ORIGINAL RECORD" in detail
        event = app.screen.event
        await pilot.click("#pivot-account")
        await app.workers.wait_for_complete()
        assert app.filters.account == event.account
        assert app.total == Store(demo).search(SearchFilters(account=event.account)).total
        for action, field in [
            ("source_ip", "source_ip"),
            ("host", "host"),
            ("session", "session_id"),
        ]:
            app.evidence_action((action, event))
            await app.workers.wait_for_complete()
            expected = getattr(event, field)
            assert getattr(app.filters, field) == expected
            assert app.total == Store(demo).search(SearchFilters(**{field: expected})).total
        await pilot.press("f4")
        await app.workers.wait_for_complete()
        assert app.query_one("#filters", Input).value == "" and app.filters == SearchFilters()
        app.query_one("#filters", Input).value = "account=svc-backup"
        app.apply_filters()
        await app.workers.wait_for_complete()
        await app.open_case(app.case_id)
        assert app.query_one("#filters", Input).value == "" and app.filters == SearchFilters()
        assert app.timeline_mode
