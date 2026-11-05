"""Responsive Textual workspace with real evidence, cases and cancellable workers."""

from __future__ import annotations

import asyncio
import json
import shlex

from rich.text import Text
from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import (
    Button,
    DataTable,
    Footer,
    Input,
    Label,
    RichLog,
    Static,
    TabbedContent,
    TabPane,
)

from .agent import investigate
from .cases import Cases
from .config import AgentConfig, provider_status
from .detection import load_alerts
from .export import export_case
from .models import Event, SearchFilters
from .security import SentinelError, plain
from .storage import Store
from .workspace import Workspace

HELP = """SENTINEL · Investigation workspace

Tab / Shift+Tab: move focus. Arrow keys: navigate tables. Enter: select.
Select an alert with Enter to create a case. Select a case with Enter to reopen it.
Select an evidence row with Enter to inspect the original record and provenance.
The evidence dialog can attach the event or filter by its explicit session.

F3: focus filters. F2: focus the investigation question.
F4: show the selected case evidence in chronological order.
F5: export the selected case as Markdown and JSON into workspace/reports.
Ctrl+G: cancel a running investigation and keep completed evidence.
Ctrl+Q: quit cleanly. F1 / Escape: open / close help.

Filters use exact matches combined with AND:
account=morgan ip=203.0.113.74 action=login outcome=failure
session=session-702 start=2026-10-20T09:00:00Z end=2026-10-20T09:10:00Z
Supported: account, ip, host, action, outcome, resource, session, start, end, min_bytes.
Use quotes for spaces. Submit an empty filter to return to the dataset.
Next / Previous page show bounded pages of 100 events. Counts cover all matches.

Ask a focused question, then press Enter or Investigate. A configured Meta key is
required for live AI. Selected event excerpts are sent to the configured Meta API.
Without a key, manual evidence, notes, cases, deterministic alerts and export work.

Observed facts are rendered from canonical fields and computed query receipts.
Hypotheses remain interpretations, even when their source references are valid.
Alert severity is not certainty. Logs are untrusted data, never instructions.
"""


def parse_filters(text: str) -> SearchFilters:
    values = {}
    aliases = {"ip": "source_ip", "session": "session_id"}
    try:
        for token in shlex.split(text):
            key, value = token.split("=", 1)
            key = aliases.get(key, key)
            if key in values:
                raise ValueError
            values[key] = value
        return SearchFilters.model_validate(values)
    except (ValueError, TypeError) as exc:
        raise SentinelError(
            "Invalid filters. Use account=name ip=address host=name start=ISO_TIME; F1 lists all fields."
        ) from exc


class HelpScreen(ModalScreen):
    BINDINGS = [("escape", "dismiss", "Close"), ("f1", "dismiss", "Close")]

    def compose(self) -> ComposeResult:
        with Vertical(id="help-dialog"):
            with VerticalScroll():
                yield Static(Text(HELP), markup=False)
            yield Button("Close help", id="close-help")

    @on(Button.Pressed, "#close-help")
    def close_help(self):
        self.dismiss()


class EvidenceScreen(ModalScreen):
    BINDINGS = [("escape", "dismiss", "Close")]

    def __init__(self, event: Event):
        super().__init__()
        self.event = event

    def compose(self) -> ComposeResult:
        with Vertical(id="evidence-dialog"):
            yield Label("ORIGINAL EVIDENCE", classes="eyebrow")
            with VerticalScroll(id="event-scroll"):
                yield Static(
                    Text(plain(json.dumps(self.event.model_dump(), indent=2, ensure_ascii=True))),
                    markup=False,
                    id="event-detail",
                )
            with Horizontal(classes="actions"):
                yield Button("Attach to case", id="attach-event", variant="primary")
                yield Button(
                    "Filter session", id="pivot-session", disabled=not bool(self.event.session_id)
                )
                yield Button("Close", id="close-event")

    @on(Button.Pressed)
    def selected(self, event: Button.Pressed):
        actions = {"attach-event": "attach", "pivot-session": "session", "close-event": "close"}
        self.dismiss((actions[event.button.id], self.event))


class SentinelApp(App):
    TITLE = "SENTINEL"
    SUB_TITLE = "From scattered events to defensible investigations."
    CSS = """
    Screen { background: #0a1119; color: #dbe8ed; }
    #top { height: 4; padding: 0 2; background: #101e2b; border-bottom: solid #1c5c64; }
    #brand { height: 1; color: #69d4cf; text-style: bold; }
    #status { height: 2; color: #acc4cc; }
    #body { height: 1fr; }
    #navigation { width: 34; min-width: 26; border-right: solid #24404d; padding: 0 1; }
    #main { width: 1fr; padding: 0 1; }
    TabbedContent { height: 1fr; }
    ContentSwitcher { height: 1fr; }
    TabPane { padding: 0; }
    DataTable { height: 1fr; background: #0a1119; }
    DataTable > .datatable--header { background: #152937; color: #a0dedc; text-style: bold; }
    DataTable > .datatable--cursor { background: #1c505d; color: #ffffff; }
    #alerts-note { height: 2; color: #d9b365; padding: 0 1; }
    .eyebrow { height: 2; padding: 0 1; color: #69d4cf; text-style: bold; }
    #filters { margin: 0 0 1 0; }
    Input { height: 3; border: solid #284450; background: #101c27; }
    Input:focus { border: solid #54bdb9; }
    #page-info { width: 1fr; padding: 1 1; color: #acc4cc; }
    .actions { height: 3; }
    Button { min-width: 12; height: 3; margin-right: 1; border: solid #284450; background: #142936; }
    Button.-primary { background: #17545d; color: #eaffff; }
    Button.-error { background: #613039; }
    #question-bar { height: 4; padding: 0 1; border-top: solid #24404d; }
    #question { width: 1fr; }
    #investigate { width: 15; }
    #cancel { width: 12; }
    #case-scroll { height: 1fr; padding: 1; }
    #case-text { height: auto; }
    #note { width: 1fr; }
    #activity { height: 1fr; border: solid #24404d; padding: 0 1; }
    Footer { background: #101e2b; }
    HelpScreen, EvidenceScreen { align: center middle; background: #000000 60%; }
    #help-dialog, #evidence-dialog { width: 90%; max-width: 120; height: 90%; padding: 1 2; background: #101e2b; border: solid #54bdb9; }
    #event-scroll { height: 1fr; }
    .narrow #navigation { width: 28; }
    .narrow #top { padding: 0 1; }
    .narrow Button { min-width: 10; }
    """
    BINDINGS = [
        Binding("f1", "help", "Help"),
        Binding("f3", "filter", "Filter"),
        Binding("f2", "question", "Ask"),
        Binding("f4", "timeline", "Case timeline"),
        Binding("f5", "export", "Export"),
        Binding("ctrl+g", "cancel", "Cancel", priority=True),
        Binding("ctrl+q", "quit", "Quit", priority=True),
    ]

    def __init__(self, workspace: Workspace, case_id: str | None = None):
        super().__init__()
        self.workspace = workspace
        self.cases = Cases(workspace)
        self.case_id = case_id
        self.store = Store(workspace, self.cases.get(case_id).dataset_id if case_id else None)
        self.events: dict[str, Event] = {}
        self.filters = SearchFilters()
        self.offset = 0
        self.agent_worker = None
        self.model_state = provider_status()
        self.event_count = 0
        self.total = 0
        self.timeline_mode = bool(case_id)
        self.case_rows = []

    def compose(self) -> ComposeResult:
        with Vertical(id="top"):
            yield Static(
                "SENTINEL   /   From scattered events to defensible investigations.",
                id="brand",
                markup=False,
            )
            yield Static("Loading workspace…", id="status", markup=False)
        with Horizontal(id="body"):
            with Vertical(id="navigation"):
                with TabbedContent(id="nav-tabs"):
                    with TabPane("Alerts", id="alerts-tab"):
                        yield Static(
                            "Signals require investigation.", id="alerts-note", markup=False
                        )
                        yield DataTable(id="alerts", cursor_type="row", zebra_stripes=True)
                    with TabPane("Cases", id="cases-tab"):
                        yield DataTable(id="cases", cursor_type="row", zebra_stripes=True)
            with Vertical(id="main"):
                with TabbedContent(id="main-tabs"):
                    with TabPane("Evidence", id="evidence-tab"):
                        yield Input(
                            placeholder="Exact filters: account=morgan ip=203.0.113.74  ·  Enter to apply",
                            id="filters",
                        )
                        yield DataTable(id="events", cursor_type="row", zebra_stripes=True)
                        with Horizontal(classes="actions"):
                            yield Static("", id="page-info", markup=False)
                            yield Button("Previous", id="previous")
                            yield Button("Next", id="next")
                    with TabPane("Case review", id="case-tab"):
                        with VerticalScroll(id="case-scroll"):
                            yield Static(
                                "Select an alert to open a case, or reopen one from Cases.",
                                id="case-text",
                                markup=False,
                            )
                        with Horizontal(classes="actions"):
                            yield Input(placeholder="Add an analyst note…", id="note")
                            yield Button("Save note", id="save-note")
                    with TabPane("Activity", id="activity-tab"):
                        yield RichLog(
                            id="activity", wrap=True, min_width=20, max_lines=1000, markup=False
                        )
        with Horizontal(id="question-bar"):
            yield Input(
                placeholder="Ask a focused question about the selected case…", id="question"
            )
            yield Button("Investigate", id="investigate", variant="primary")
            yield Button("Cancel", id="cancel", variant="error", disabled=True)
        yield Footer()

    def on_mount(self):
        self.query_one("#alerts", DataTable).add_columns("Priority / rule", "Account")
        self.query_one("#cases", DataTable).add_columns("Case / status", "Title")
        self.query_one("#events", DataTable).add_columns(
            "UTC time", "Account", "Action", "Result", "Source IP", "Resource"
        )
        self.refresh_workspace()
        self.query_one("#alerts", DataTable).focus()

    def on_resize(self, event):
        self.set_class(event.size.width < 115, "narrow")

    def tell(self, message, severity="information"):
        self.notify(plain(message), severity=severity, markup=False)

    def update_header(self):
        selection = self.case_id or "No case selected"
        text = f"{self.workspace.root.name}  ·  {self.store.dataset}  ·  {self.event_count:,} events  ·  {selection}\nMeta: {self.model_state}"
        self.query_one("#status", Static).update(Text(plain(text)))

    @work(exclusive=True, group="refresh")
    async def refresh_workspace(self):
        try:
            if self.case_id:
                await asyncio.to_thread(self.cases.reopen, self.case_id)
            summary, alerts, case_list = await asyncio.to_thread(
                lambda: (self.store.summary(), load_alerts(self.store), self.cases.list())
            )
            self.event_count = summary["event_count"]
            self.query_one("#alerts-note", Static).update(
                Text(f"{len(alerts)} signals · Enter opens a case")
            )
            table = self.query_one("#alerts", DataTable)
            table.clear()
            for alert in alerts:
                table.add_row(
                    Text(
                        f"{'HIGH' if alert.severity == 'high' else 'MED'} {alert.rule_id}",
                        style="#f08383" if alert.severity == "high" else "#e0b668",
                    ),
                    Text(plain(alert.entities["account"])),
                    key=alert.alert_id,
                )
            table = self.query_one("#cases", DataTable)
            table.clear()
            for case in case_list:
                table.add_row(
                    Text(f"{case.case_id}\n{case.status}"),
                    Text(plain(case.title)),
                    key=case.case_id,
                    height=2,
                )
            if self.case_id:
                self.render_case()
                self.render_activity()
            self.update_header()
            await self.load_events()
        except SentinelError as exc:
            self.tell(str(exc), "error")

    async def load_events(self):
        if self.timeline_mode and self.case_id:
            case = self.cases.get(self.case_id)
            events = await asyncio.to_thread(
                lambda: sorted(
                    self.store.get_many(case.evidence_ids),
                    key=lambda e: (e.timestamp, e.event_id),
                )
            )
            self.total = len(events)
            events = events[self.offset : self.offset + 100]
        else:
            page = await asyncio.to_thread(self.store.search, self.filters, 100, self.offset)
            self.total, events = page.total, page.events
        self.events = {e.event_id: e for e in events}
        table = self.query_one("#events", DataTable)
        table.clear()
        for e in events:
            table.add_row(
                *[
                    Text(plain(v))
                    for v in (
                        e.timestamp[11:19],
                        e.account,
                        e.action,
                        e.outcome,
                        e.source_ip,
                        e.resource,
                    )
                ],
                key=e.event_id,
            )
        mode = "Case timeline" if self.timeline_mode else "Dataset search"
        self.query_one("#page-info", Static).update(
            Text(
                f"{mode} · {self.offset + 1 if events else 0}–{self.offset + len(events)} / {self.total:,}"
            )
        )
        self.query_one("#previous", Button).disabled = self.offset == 0
        self.query_one("#next", Button).disabled = self.offset + len(events) >= self.total

    def render_case(self):
        if not self.case_id:
            return
        case = self.cases.get(self.case_id)
        lines = [
            f"{case.case_id}  ·  {case.status.upper()}",
            case.title,
            f"Dataset {case.dataset_id}  ·  {len(case.evidence_ids)} attached events",
            f"Provider: {case.provider}",
            "",
            "LATEST SUMMARY",
            case.summary,
            "",
            "FINDINGS",
        ]
        for f in case.findings:
            lines.extend(
                [
                    "",
                    f"{f.category.replace('_', ' ').upper()} · {f.title}",
                    f.explanation,
                    f"Evidence: {', '.join(f.event_ids)}",
                    f"Verification: {f.verification}",
                    f"Limitations: {f.limitations}",
                ]
            )
        lines.extend(["", "OPEN QUESTIONS", *case.open_questions, "", "ANALYST NOTES", *case.notes])
        self.query_one("#case-text", Static).update(Text(plain("\n".join(lines), 200000)))

    def render_activity(self):
        log = self.query_one("#activity", RichLog)
        log.clear()
        if self.case_id:
            for entry in self.cases.get(self.case_id).activity[-100:]:
                details = plain(json.dumps(entry.details, ensure_ascii=True), 500)
                log.write(Text(f"{entry.timestamp[11:19]}  {entry.role}: {entry.action} {details}"))

    @on(DataTable.RowSelected)
    async def select_row(self, event: DataTable.RowSelected):
        key = str(event.row_key.value)
        if event.data_table.id == "alerts":
            if self.agent_worker and self.agent_worker.is_running:
                self.tell(
                    "Cancel or finish the current investigation before opening another case",
                    "warning",
                )
                return
            # Selecting the same alert reopens its existing case instead of duplicating it.
            existing = next(
                (
                    c
                    for c in self.cases.list()
                    if key in c.alert_ids and c.dataset_id == self.store.dataset
                ),
                None,
            )
            case = existing or self.cases.create(key, dataset_id=self.store.dataset)
            await self.open_case(case.case_id)
        elif event.data_table.id == "cases":
            if self.agent_worker and self.agent_worker.is_running:
                self.tell(
                    "Cancel or finish the current investigation before switching cases", "warning"
                )
                return
            await self.open_case(key)
        elif event.data_table.id == "events" and key in self.events:
            self.push_screen(EvidenceScreen(self.events[key]), self.evidence_action)

    async def open_case(self, case_id):
        self.case_id = case_id
        case = await asyncio.to_thread(self.cases.reopen, case_id)
        self.store = Store(self.workspace, case.dataset_id)
        self.timeline_mode, self.offset = True, 0
        self.render_case()
        self.render_activity()
        summary = await asyncio.to_thread(self.store.summary)
        self.event_count = summary["event_count"]
        self.update_header()
        await self.load_events()
        self.query_one("#main-tabs", TabbedContent).active = "evidence-tab"
        self.query_one("#events", DataTable).focus()
        self.tell(f"Opened {case_id}; showing its attached evidence")
        self.refresh_case_navigation()

    def refresh_case_navigation(self):
        table = self.query_one("#cases", DataTable)
        table.clear()
        for case in self.cases.list():
            table.add_row(
                Text(f"{case.case_id}\n{case.status}"),
                Text(plain(case.title)),
                key=case.case_id,
                height=2,
            )

    def evidence_action(self, result):
        if not result:
            return
        action, event = result
        if action == "attach":
            if not self.case_id:
                self.tell("Open a case before attaching evidence", "warning")
            else:
                self.cases.attach(self.case_id, [event.event_id])
                self.render_case()
                self.tell("Evidence attached with its source reference")
        elif action == "session":
            self.query_one("#filters", Input).value = "session=" + shlex.quote(event.session_id)
            self.apply_filters()

    @work(exclusive=True, group="search")
    async def apply_filters(self):
        try:
            self.filters = parse_filters(self.query_one("#filters", Input).value)
            self.timeline_mode, self.offset = False, 0
            await self.load_events()
        except SentinelError as exc:
            self.tell(str(exc), "error")

    @on(Input.Submitted)
    def submit(self, event: Input.Submitted):
        if event.input.id == "filters":
            self.apply_filters()
        elif event.input.id == "question":
            self.start_investigation()
        elif event.input.id == "note":
            self.save_note()

    @on(Button.Pressed)
    async def button(self, event: Button.Pressed):
        if event.button.id == "investigate":
            self.start_investigation()
        elif event.button.id == "cancel":
            self.action_cancel()
        elif event.button.id == "save-note":
            self.save_note()
        elif event.button.id in ("next", "previous"):
            self.offset = max(0, self.offset + (100 if event.button.id == "next" else -100))
            await self.load_events()

    def save_note(self):
        if not self.case_id:
            self.tell("Open a case before adding notes", "warning")
            return
        note = self.query_one("#note", Input)
        try:
            self.cases.note(self.case_id, note.value)
            note.value = ""
            self.render_case()
            self.tell("Analyst note saved")
        except SentinelError as exc:
            self.tell(str(exc), "error")

    def start_investigation(self):
        if not self.case_id:
            self.tell("Select an alert or reopen a case first", "warning")
            return
        if self.agent_worker and self.agent_worker.is_running:
            self.tell("This case already has a running investigation", "warning")
            return
        try:
            config = AgentConfig.from_env()
            question = self.query_one("#question", Input).value
            if not question.strip():
                raise SentinelError("Enter a focused investigation question")
        except SentinelError as exc:
            self.tell(str(exc), "error")
            return
        self.agent_worker = self.run_agent(config, question, self.case_id)

    @work(group="agent", exclusive=True)
    async def run_agent(self, config, question, case_id):
        self.query_one("#cancel", Button).disabled = False
        self.query_one("#investigate", Button).disabled = True
        self.query_one("#main-tabs", TabbedContent).active = "activity-tab"
        log = self.query_one("#activity", RichLog)

        def changed(role, message):
            entry = self.cases.get(case_id).activity[-1]
            details = plain(json.dumps(entry.details, ensure_ascii=True), 500)
            log.write(Text(f"{entry.timestamp[11:19]}  {role}: {plain(message)} {details}"))
            if role == "Meta" and message == "Model response received":
                self.model_state = "Connected after a successful call"
                self.update_header()

        try:
            await investigate(self.cases, case_id, question, config, on_activity=changed)
            self.tell("Case reviewed; findings and source references saved")
            self.query_one("#main-tabs", TabbedContent).active = "case-tab"
        except asyncio.CancelledError:
            self.tell("Investigation cancelled; completed work retained", "warning")
        except SentinelError as exc:
            self.model_state = "Request failed"
            self.tell(str(exc), "error")
        finally:
            self.query_one("#cancel", Button).disabled = True
            self.query_one("#investigate", Button).disabled = False
            self.render_case()
            self.update_header()
            self.refresh_case_navigation()

    def action_help(self):
        self.push_screen(HelpScreen())

    def action_filter(self):
        self.query_one("#main-tabs", TabbedContent).active = "evidence-tab"
        self.query_one("#filters", Input).focus()

    def action_question(self):
        self.query_one("#question", Input).focus()

    def action_timeline(self):
        if not self.case_id:
            self.tell("Open a case first", "warning")
            return
        self.timeline_mode, self.offset = True, 0
        self.query_one("#main-tabs", TabbedContent).active = "evidence-tab"
        self.run_worker(self.load_events(), group="search", exclusive=True)

    @work(group="export", exclusive=True)
    async def action_export(self):
        if not self.case_id:
            self.tell("Open a case before exporting", "warning")
            return
        paths = await asyncio.to_thread(
            lambda: [export_case(self.cases, self.case_id, f) for f in ("markdown", "json")]
        )
        self.tell(f"Exported Markdown and JSON to {paths[0].parent}")
        self.query_one("#activity", RichLog).write(Text(f"Export saved: {paths[0]}"))

    def action_cancel(self):
        if self.agent_worker and self.agent_worker.is_running:
            self.agent_worker.cancel()
        else:
            self.tell("No investigation is running")

    async def action_quit(self):
        if self.agent_worker and self.agent_worker.is_running:
            self.agent_worker.cancel()
            try:
                await self.agent_worker.wait()
            except Exception:
                pass  # A cancelled Textual worker reports WorkerCancelled to waiters.
        self.exit()
