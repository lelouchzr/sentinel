"""Self-contained Markdown/JSON reports with evidence and provenance references."""

from __future__ import annotations

import html
import json
import re

from .cases import Cases, valid_id
from .models import QueryReceipt
from .security import SentinelError, atomic_text, plain
from .storage import Store


def md(value) -> str:
    text = html.escape(plain(value), quote=False)
    for character in "\\`*_{}[]()#+!|":
        text = text.replace(character, "\\" + character)
    return text


def export_case(cases: Cases, case_id: str, format: str = "markdown"):
    if format not in ("markdown", "json"):
        raise SentinelError("Export format must be markdown or json")
    case = cases.get(case_id)
    store = Store(cases.workspace, case.dataset_id)
    ids = list(
        dict.fromkeys([*case.evidence_ids, *[e for f in case.findings for e in f.event_ids]])
    )
    events = sorted(
        [store.get(e).model_dump() for e in ids], key=lambda e: (e["timestamp"], e["event_id"])
    )
    receipt_ids = list(dict.fromkeys(r for f in case.findings for r in f.receipt_ids))
    receipts = []
    for receipt_id in receipt_ids:
        valid_id(receipt_id, "Q")
        receipts.append(
            QueryReceipt.model_validate_json(
                cases.workspace.path(f"receipts/{receipt_id}.json").read_text()
            ).model_dump()
        )
    data = {
        "product": "SENTINEL",
        "case": case.model_dump(),
        "manifest": cases.workspace.manifest(case.dataset_id),
        "evidence": events,
        "computed_queries": receipts,
        "limitations": "Investigative aid, not a forensic certification. SHA-256 identifies imported bytes; it is not legal chain of custody. Live investigations send selected excerpts to the configured Meta API.",
    }
    if format == "json":
        content = json.dumps(data, indent=2, ensure_ascii=True) + "\n"
    else:
        event_anchors = {
            event["event_id"]: f"event-{valid_id(event['event_id'], 'E').lower()}"
            for event in events
        }
        query_anchors = {
            receipt_id: f"query-{valid_id(receipt_id, 'Q').lower()}" for receipt_id in receipt_ids
        }
        known_anchors = {**event_anchors, **query_anchors}

        def linked_text(value):
            # Escape untrusted prose first; only retrieved canonical IDs become links.
            def link(match):
                identifier = match.group()
                if identifier not in known_anchors:
                    return identifier
                return f"[{identifier}](#{known_anchors[identifier]})"

            return re.sub(r"\b(?:E|Q)-[a-f0-9]{8,32}\b", link, md(value))

        def references(identifiers, anchors):
            return (
                ", ".join(f"[{identifier}](#{anchors[identifier]})" for identifier in identifiers)
                or "None"
            )

        sections = [
            ("Investigation summary", "summary"),
            ("Findings", "findings"),
            ("Open questions", "open-questions"),
            ("Analyst notes", "analyst-notes"),
            ("Evidence and original source records", "evidence"),
            ("Computed query receipts", "computed-queries"),
            ("Dataset manifest", "dataset-manifest"),
            ("Activity", "activity"),
            ("Limitations", "limitations"),
        ]
        contents = []
        for title, anchor in sections:
            contents.append(f"- [{title}](#{anchor})")
            if anchor == "findings":
                for number, finding in enumerate(case.findings, 1):
                    title = md(finding.title).replace("\n", " ").replace("\t", " ")
                    contents.append(f"  - [{number}. {title}](#finding-{number})")
        lines = [
            f"# SENTINEL · {md(case.title)}",
            f"Case: {case.case_id} · Status: {case.status}",
            f"Dataset: {case.dataset_id} · Provider: {md(case.provider)}",
            f"Created: {case.created_at} · Updated: {case.updated_at}",
            '<a id="contents"></a>',
            "## Contents",
            "\n".join(contents),
            '<a id="summary"></a>',
            "## Investigation summary",
            linked_text(case.summary),
            '<a id="findings"></a>',
            "## Findings",
        ]
        for number, finding in enumerate(case.findings, 1):
            lines.extend(
                [
                    f'<a id="finding-{number}"></a>',
                    f"### {md(finding.category)} · {md(finding.title)}",
                    linked_text(finding.explanation),
                    f"Evidence: {references(finding.event_ids, event_anchors)}",
                    f"Queries: {references(finding.receipt_ids, query_anchors)}",
                    f"Verification: {md(finding.verification)}",
                    f"Limitations: {linked_text(finding.limitations)}",
                ]
            )
        lines.extend(
            [
                '<a id="open-questions"></a>',
                "## Open questions",
                *[f"- {linked_text(q)}" for q in case.open_questions],
                '<a id="analyst-notes"></a>',
                "## Analyst notes",
                *[f"- {linked_text(n)}" for n in case.notes],
                '<a id="evidence"></a>',
                "## Evidence and original source records",
            ]
        )
        for event in events:
            source = event["source"]
            lines.extend(
                [
                    f'<a id="{event_anchors[event["event_id"]]}"></a>',
                    f"### {event['event_id']}",
                    f"UTC: {event['timestamp']} · {md(event['account'])} · {md(event['action'])} · {md(event['outcome'])}",
                    f"Source: {md(source['filename'])}, record {source['record']}, line {source['line']}",
                    f"SHA-256: {source['sha256']}",
                    md(json.dumps(source["original"], ensure_ascii=True)),
                    "[Back to findings](#findings) · [Contents](#contents)",
                ]
            )
        lines.extend(['<a id="computed-queries"></a>', "## Computed query receipts"])
        for receipt_id, receipt in zip(receipt_ids, receipts, strict=True):
            lines.extend(
                [
                    f'<a id="{query_anchors[receipt_id]}"></a>',
                    f"### {receipt_id}",
                    md(json.dumps(receipt, ensure_ascii=True)),
                    "[Back to findings](#findings) · [Contents](#contents)",
                ]
            )
        lines.extend(
            [
                '<a id="dataset-manifest"></a>',
                "## Dataset manifest",
                md(json.dumps(data["manifest"], ensure_ascii=True)),
                '<a id="activity"></a>',
                "## Activity",
                *[
                    f"- {a.timestamp} · {md(a.role)} · {md(a.action)} · {md(json.dumps(a.details, ensure_ascii=True))}"
                    for a in case.activity
                ],
                '<a id="limitations"></a>',
                "## Limitations",
                data["limitations"],
            ]
        )
        content = "\n\n".join(lines) + "\n"
    path = cases.workspace.path(
        f"reports/{case.case_id}.{'md' if format == 'markdown' else 'json'}"
    )
    atomic_text(path, content)
    return path
