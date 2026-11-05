"""Deterministic case context, explicitly scoped to attached evidence."""

from collections import Counter

from .cases import Cases
from .detection import load_alerts
from .models import Alert, Model
from .security import one_line, plain
from .storage import Store


class CaseBrief(Model):
    case_id: str
    dataset_id: str
    title: str
    status: str
    provider: str
    signals: list[Alert]
    evidence_count: int
    first_timestamp: str | None
    last_timestamp: str | None
    recorded_bytes: int
    events_with_bytes: int
    action_outcome_counts: dict[str, int]
    entities: dict[str, list[str]]
    source_files: list[str]
    finding_counts: dict[str, int]
    open_issues_count: int
    suggested_question: str
    next_checks: list[str]
    scope: str = "Counts and entities describe attached case evidence, not the full dataset. Recorded bytes do not establish malicious exfiltration."


def case_brief(cases: Cases, case_id: str) -> CaseBrief:
    case = cases.get(case_id)
    store = Store(cases.workspace, case.dataset_id)
    events = store.get_many(case.evidence_ids)
    signals = [alert for alert in load_alerts(store) if alert.alert_id in case.alert_ids]
    rules = {alert.rule_id for alert in signals}
    checks = [
        "Inspect original records and their source positions before interpreting activity.",
        "Verify operator identity and authorization using independent evidence.",
    ]
    if rules & {"AUTH-001", "AUTH-002"}:
        checks.append("Check identity-provider MFA records and the account owner's explanation.")
    if "DATA-001" in rules:
        checks.append(
            "Check the transfer destination, explicit session links and any approved job or change record."
        )
    question = (
        "Investigate the authentication sequence and explicitly linked session activity. "
        "What is recorded, what remains uncertain, and what evidence would verify authorization?"
        if rules & {"AUTH-001", "AUTH-002"}
        else "Investigate the attached activity and any explicitly linked sessions. Distinguish recorded facts, hypotheses and benign alternatives; identify the next evidence to check."
    )
    categories = Counter(finding.category for finding in case.findings)
    timestamps = [event.timestamp for event in events]
    return CaseBrief(
        case_id=case.case_id,
        dataset_id=case.dataset_id,
        title=case.title,
        status=case.status,
        provider=case.provider,
        signals=signals,
        evidence_count=len(events),
        first_timestamp=min(timestamps, default=None),
        last_timestamp=max(timestamps, default=None),
        recorded_bytes=sum(event.bytes or 0 for event in events),
        events_with_bytes=sum(event.bytes is not None for event in events),
        action_outcome_counts=dict(
            sorted(Counter(f"{event.action}/{event.outcome}" for event in events).items())
        ),
        entities={
            field: sorted({getattr(event, field) for event in events if getattr(event, field)})
            for field in ("account", "source_ip", "host", "session_id", "resource")
        },
        source_files=sorted({event.source.filename for event in events}),
        finding_counts={
            category: categories[category]
            for category in ("observed_fact", "hypothesis", "open_question")
        },
        open_issues_count=len(case.open_questions),
        suggested_question=question,
        next_checks=checks,
    )


def brief_text(brief: CaseBrief) -> str:
    lines = [
        f"{brief.case_id} · {brief.status.upper()}",
        one_line(brief.title),
        "Provider: " + one_line(brief.provider),
        "",
        "WHY THIS CASE",
    ]
    lines += [
        f"{alert.severity.upper()} · {alert.rule_id} v{alert.rule_version}\n{alert.explanation}"
        for alert in brief.signals
    ]
    if not brief.signals:
        lines.append("Manual case; no detection signal is associated with it.")
    lines += [
        "",
        "ATTACHED EVIDENCE",
        f"{brief.evidence_count:,} records · {brief.recorded_bytes:,} recorded bytes ({brief.events_with_bytes:,} records with a byte field)",
        f"UTC range: {brief.first_timestamp or '(no events)'} to {brief.last_timestamp or '(no events)'}",
        "Actions: "
        + (
            ", ".join(
                f"{action}: {count:,}" for action, count in brief.action_outcome_counts.items()
            )
            or "None"
        ),
        "Source files: " + (", ".join(one_line(name) for name in brief.source_files) or "None"),
        "",
        "INVOLVED ENTITIES",
    ]
    for field, values in brief.entities.items():
        shown = ", ".join(one_line(value) for value in values[:8]) or "None recorded"
        remaining = f" (+{len(values) - 8} more)" if len(values) > 8 else ""
        lines.append(f"{field.replace('_', ' ').title()} ({len(values)}): {shown}{remaining}")
    lines += [
        "",
        "CURRENT CONCLUSIONS",
        " · ".join(
            f"{category.replace('_', ' ')}: {count}"
            for category, count in brief.finding_counts.items()
        ),
        f"Open questions / validation notes: {brief.open_issues_count}",
        "",
        "NEXT CHECKS",
        *[f"- {check}" for check in brief.next_checks],
        "",
        "SCOPE",
        brief.scope,
        "A detection signal is a reason to investigate, not proof of compromise.",
    ]
    return plain("\n".join(lines), 50000)
