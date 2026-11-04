"""Validated domain contracts shared by CLI, MCP, and the terminal application."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def now() -> str:
    return datetime.now(UTC).isoformat()


def utc_timestamp(value: str, timezone: str = "UTC") -> str:
    from zoneinfo import ZoneInfo

    parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        zone = ZoneInfo(timezone)
        # Reject ambiguous/nonexistent local times rather than guessing a DST fold.
        candidates = [parsed.replace(tzinfo=zone, fold=f) for f in (0, 1)]
        valid = [
            d
            for d in candidates
            if d.astimezone(UTC).astimezone(zone).replace(tzinfo=None) == parsed
        ]
        if not valid or len({d.utcoffset() for d in valid}) > 1:
            raise ValueError("Ambiguous or nonexistent local timestamp; supply a UTC offset")
        parsed = valid[0]
    return parsed.astimezone(UTC).isoformat(timespec="microseconds")


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceRef(Model):
    filename: str
    record: int = Field(ge=1)
    line: int = Field(ge=1)
    sha256: str
    original: dict[str, Any]


class Event(Model):
    event_id: str
    timestamp: str
    source_type: str = Field(min_length=1, max_length=128)
    host: str = Field(default="", max_length=256)
    account: str = Field(default="", max_length=256)
    source_ip: str = Field(default="", max_length=128)
    action: str = Field(min_length=1, max_length=128)
    outcome: str = Field(min_length=1, max_length=128)
    resource: str = Field(default="", max_length=1024)
    session_id: str = Field(default="", max_length=256)
    bytes: int | None = Field(default=None, ge=0, le=9_223_372_036_854_775_807)
    source: SourceRef

    @field_validator("source_type", "action", "outcome", mode="before")
    @classmethod
    def required_labels(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("bytes", mode="before")
    @classmethod
    def byte_count(cls, value):
        if isinstance(value, bool) or isinstance(value, float):
            raise ValueError("Byte count must be a nonnegative integer")
        return value


class SearchFilters(Model):
    account: str | None = Field(default=None, max_length=256)
    source_ip: str | None = Field(default=None, max_length=128)
    host: str | None = Field(default=None, max_length=256)
    action: str | None = Field(default=None, max_length=128)
    outcome: str | None = Field(default=None, max_length=128)
    resource: str | None = Field(default=None, max_length=1024)
    session_id: str | None = Field(default=None, max_length=256)
    start: str | None = None
    end: str | None = None
    min_bytes: int | None = Field(default=None, ge=0, le=9_223_372_036_854_775_807)

    @field_validator("start", "end")
    @classmethod
    def dates(cls, value: str | None) -> str | None:
        return utc_timestamp(value) if value else None

    @model_validator(mode="after")
    def ordered_range(self):
        if self.start and self.end and self.start > self.end:
            raise ValueError("Start time must be no later than end time")
        return self


class QueryReceipt(Model):
    receipt_id: str
    dataset_id: str
    filters: SearchFilters
    total_count: int
    total_bytes: int
    action_outcome_counts: dict[str, int] = Field(default_factory=dict)
    action_counts_truncated: bool = False
    first_timestamp: str | None
    last_timestamp: str | None
    returned_event_ids: list[str]
    description: str = (
        "Exact filtered count and byte sum, computed by DuckDB over all matching events."
    )


class EventPage(Model):
    events: list[Event]
    returned: int
    total: int
    offset: int
    limit: int
    truncated: bool
    receipt: QueryReceipt


class Alert(Model):
    alert_id: str
    rule_id: str
    rule_version: str = "1.0"
    severity: Literal["medium", "high"]
    event_ids: list[str]
    start: str
    end: str
    entities: dict[str, str]
    explanation: str


class AlertsResult(Model):
    alerts: list[Alert]
    total: int
    returned: int
    offset: int
    truncated: bool


class Finding(Model):
    title: str = Field(max_length=200)
    category: Literal["observed_fact", "hypothesis", "open_question"]
    event_ids: list[str] = Field(default_factory=list, max_length=100)
    explanation: str = Field(max_length=30000)
    limitations: str = Field(default="", max_length=2000)
    receipt_ids: list[str] = Field(default_factory=list, max_length=10)
    verification: str = "Pending verification"


class FindingDraft(Model):
    """Model-authored fields only; verification is exclusively owned by Sentinel."""

    title: str = Field(max_length=200)
    category: Literal["observed_fact", "hypothesis", "open_question"]
    event_ids: list[str] = Field(max_length=100)
    explanation: str = Field(max_length=12000)
    limitations: str = Field(max_length=2000)
    receipt_ids: list[str] = Field(max_length=10)


class ReportDraft(Model):
    findings: list[FindingDraft] = Field(min_length=1, max_length=6)
    open_questions: list[str] = Field(max_length=10)


class Activity(Model):
    timestamp: str = Field(default_factory=now)
    role: str
    action: str
    details: dict[str, Any] = Field(default_factory=dict)


class Case(Model):
    case_id: str
    title: str
    dataset_id: str
    created_at: str = Field(default_factory=now)
    updated_at: str = Field(default_factory=now)
    status: Literal["open", "investigating", "reviewed", "interrupted", "closed"] = "open"
    alert_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    activity: list[Activity] = Field(default_factory=list)
    summary: str = "No investigation has been completed."
    provider: str = "Manual"
