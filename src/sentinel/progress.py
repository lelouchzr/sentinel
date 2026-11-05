"""Latest-run telemetry derived from persisted operations, never model reasoning."""

import math
from datetime import UTC, datetime

from .models import Case, Model
from .security import plain


class RunProgress(Model):
    case_id: str
    status: str
    provider: str
    has_run: bool
    phase: str | None
    model_requests: int
    model_responses: int
    tool_attempts: int
    tool_completions: int
    model_limit: int | None
    tool_limit: int | None
    deadline_seconds: float | None
    elapsed_seconds: float | None
    attached_evidence: int
    last_action: str


def run_progress(case: Case, at: datetime | None = None) -> RunProgress:
    starts = [
        index
        for index, activity in enumerate(case.activity)
        if activity.action == "Investigation started" and activity.role == "Investigator"
    ]
    activities = case.activity[starts[-1] :] if starts else []
    limits = activities[0].details.get("limits", {}) if activities else {}
    if not isinstance(limits, dict):
        limits = {}

    def number(value):
        return (
            value
            if isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            and value >= 0
            else None
        )

    def positive_limit(key):
        value = limits.get(key)
        return (
            value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None
        )

    elapsed = None
    if activities:
        saved = next(
            (
                entry.details.get("elapsed_seconds")
                for entry in reversed(activities)
                if entry.action == "Case summary saved"
            ),
            None,
        )
        elapsed = number(saved) if case.status != "investigating" else None
        recovered = any(
            entry.action.startswith("Recovered interrupted investigation") for entry in activities
        )
        if elapsed is None and not recovered:
            try:
                start = datetime.fromisoformat(activities[0].timestamp.replace("Z", "+00:00"))
                end = (
                    (at or datetime.now(UTC))
                    if case.status == "investigating"
                    else datetime.fromisoformat(activities[-1].timestamp.replace("Z", "+00:00"))
                )
                if start.tzinfo is not None and end.tzinfo is not None:
                    elapsed = round(max(0.0, (end - start).total_seconds()), 1)
            except (TypeError, ValueError, OverflowError):
                pass
    phases = [
        entry.role
        for entry in activities
        if entry.role in {"Investigator", "Evidence reviewer", "Reporter"}
    ]
    return RunProgress(
        case_id=case.case_id,
        status=case.status,
        provider=case.provider,
        has_run=bool(activities),
        phase=phases[-1] if phases else None,
        model_requests=sum(entry.action == "Model request started" for entry in activities),
        model_responses=sum(entry.action == "Model response received" for entry in activities),
        tool_attempts=sum(
            entry.role == "MCP" and entry.action.startswith("Calling ") for entry in activities
        ),
        tool_completions=sum(
            entry.role == "MCP" and entry.action.startswith("Completed ") for entry in activities
        ),
        model_limit=positive_limit("model_calls"),
        tool_limit=positive_limit("tool_calls"),
        deadline_seconds=number(limits.get("deadline_seconds")),
        elapsed_seconds=elapsed,
        attached_evidence=len(set(case.evidence_ids)),
        last_action=plain(activities[-1].action, 180)
        if activities
        else "No model investigation has started",
    )


def progress_text(progress: RunProgress) -> str:
    if not progress.has_run:
        return "No model run · Manual investigation is available\nInspect evidence and add notes; F6 suggests the next checks."
    provider = (
        "RECORDED META RUN"
        if progress.provider.startswith("RECORDED")
        else "OFFLINE TEST MODE"
        if "OFFLINE TEST" in progress.provider
        else progress.provider
    )
    models = str(progress.model_requests) + (
        f"/{progress.model_limit}" if progress.model_limit else ""
    )
    tools = str(progress.tool_attempts) + (f"/{progress.tool_limit}" if progress.tool_limit else "")
    elapsed = f" · {progress.elapsed_seconds:.1f}s" if progress.elapsed_seconds is not None else ""
    return plain(
        f"{provider} · {progress.phase or 'Investigation'} · {progress.status.upper()}\n"
        f"Model {models} ({progress.model_responses} replies) · Tools {tools} ({progress.tool_completions} completed){elapsed}\n"
        f"{progress.attached_evidence} attached records · {progress.last_action}"
    )
