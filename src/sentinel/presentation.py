"""Literal, color-aware terminal presentation shared by the CLI and workspace."""

import json

from rich import box
from rich.console import Group
from rich.json import JSON
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .security import plain

CYAN = "#69d4cf"
MUTED = "#8fa8b8"
AMBER = "#edc477"
GREEN = "#83d9a4"
RED = "#f28b91"
ROLES = {
    "Investigator": CYAN,
    "MCP": "#87b6ff",
    "Meta": CYAN,
    "Evidence reviewer": AMBER,
    "Reporter": "#c5a5f5",
    "System": MUTED,
    "Offline test mode": AMBER,
}


def status_color(value):
    text = str(value).lower()
    if any(word in text for word in ("failed", "failure", "invalid", "high")):
        return RED
    if any(
        word in text
        for word in (
            "not configured",
            "not ready",
            "not yet verified",
            "interrupted",
            "medium",
            "unverified",
            "offline",
        )
    ):
        return AMBER
    if any(word in text for word in ("success", "connected", "reviewed", "ready")):
        return GREEN
    return CYAN


def activity_text(role, action, details=None, timestamp=""):
    text = Text()
    if timestamp:
        text.append(plain(timestamp[11:19]) + "  ", style=MUTED)
    text.append(plain(role) + "  ", style="bold " + ROLES.get(role, MUTED))
    text.append(plain(action))
    if details:
        text.append("  " + plain(json.dumps(details, ensure_ascii=True), 500), style=MUTED)
    return text


def output_panel(data):
    """Keep structured JSON for scripts and make human summaries easy to scan."""
    if (
        isinstance(data, list)
        and data
        and all(isinstance(item, dict) and "rule_id" in item for item in data)
    ):
        table = Table(box=box.SIMPLE, header_style="bold " + CYAN, expand=True)
        for column in ("Priority", "Rule", "Account", "Evidence", "Why it triggered"):
            table.add_column(column)
        for alert in data:
            severity = alert["severity"]
            table.add_row(
                Text(plain(severity).upper(), style="bold " + status_color(severity)),
                Text(plain(alert["rule_id"]), style=CYAN),
                Text(plain(alert.get("entities", {}).get("account", ""))),
                str(len(alert.get("event_ids", []))),
                Text(plain(alert.get("explanation", ""))),
            )
        return Panel(
            table,
            title=Text(f"SENTINEL / {len(data)} signals", style="bold " + CYAN),
            subtitle="Signals require investigation; severity is not certainty",
            border_style=CYAN,
        )
    demo_summary = (
        isinstance(data, dict) and isinstance(data.get("events"), int) and "alerts" in data
    )
    if isinstance(data, dict) and (demo_summary or "workspace_ready" in data or "path" in data):
        title = (
            "Workspace ready"
            if demo_summary
            else "System check"
            if "workspace_ready" in data
            else "Report exported"
        )
        table = Table.grid(padding=(0, 2), expand=False)
        table.add_column(style=MUTED, no_wrap=True)
        table.add_column()
        for key, value in data.items():
            if key == "dependencies":
                value = " · ".join(f"{name} {version}" for name, version in value.items())
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=True)
            if isinstance(value, bool):
                value = "Ready" if value else "Not ready"
            table.add_row(
                Text(key.replace("_", " ").capitalize()),
                Text(
                    plain(value),
                    style=status_color(value)
                    if key in {"meta", "provider", "workspace_ready", "dataset_ready"}
                    else "",
                ),
            )
        hint = (
            "Enter on an alert to open a case · F1 help · F5 export"
            if demo_summary
            else "Run sentinel demo to open the investigation workspace"
            if "workspace_ready" in data
            else "Saved inside your Sentinel workspace"
        )
        return Panel(
            Group(table, Text("\n" + hint, style=MUTED)),
            title=Text("SENTINEL / " + title, style="bold " + CYAN),
            border_style=CYAN,
            box=box.ROUNDED,
            padding=(1, 2),
        )
    return Panel(
        JSON.from_data(data, ensure_ascii=True, default=str),
        title=Text("SENTINEL", style="bold " + CYAN),
        border_style=CYAN,
        box=box.ROUNDED,
    )
