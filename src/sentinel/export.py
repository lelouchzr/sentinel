"""Self-contained Markdown/JSON reports with evidence and provenance references."""

from __future__ import annotations

import html
import json

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
        lines = [
            f"# SENTINEL · {md(case.title)}",
            f"Case: {case.case_id} · Status: {case.status}",
            f"Dataset: {case.dataset_id} · Provider: {md(case.provider)}",
            f"Created: {case.created_at} · Updated: {case.updated_at}",
            "## Investigation summary",
            md(case.summary),
            "## Findings",
        ]
        for finding in case.findings:
            lines.extend(
                [
                    f"### {md(finding.category)} · {md(finding.title)}",
                    md(finding.explanation),
                    f"Evidence: {', '.join(finding.event_ids) or 'None'}",
                    f"Queries: {', '.join(finding.receipt_ids) or 'None'}",
                    f"Verification: {md(finding.verification)}",
                    f"Limitations: {md(finding.limitations)}",
                ]
            )
        lines.extend(
            [
                "## Open questions",
                *[f"- {md(q)}" for q in case.open_questions],
                "## Analyst notes",
                *[f"- {md(n)}" for n in case.notes],
                "## Evidence and original source records",
            ]
        )
        for event in events:
            source = event["source"]
            lines.extend(
                [
                    f"### {event['event_id']}",
                    f"UTC: {event['timestamp']} · {md(event['account'])} · {md(event['action'])} · {md(event['outcome'])}",
                    f"Source: {md(source['filename'])}, record {source['record']}, line {source['line']}",
                    f"SHA-256: {source['sha256']}",
                    md(json.dumps(source["original"], ensure_ascii=True)),
                ]
            )
        lines.extend(
            [
                "## Computed query receipts",
                *[md(json.dumps(r, ensure_ascii=True)) for r in receipts],
                "## Dataset manifest",
                md(json.dumps(data["manifest"], ensure_ascii=True)),
                "## Activity",
                *[
                    f"- {a.timestamp} · {md(a.role)} · {md(a.action)} · {md(json.dumps(a.details, ensure_ascii=True))}"
                    for a in case.activity
                ],
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
