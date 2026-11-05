"""Atomic case updates, evidence verification, and inspectable run artifacts."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from collections.abc import Callable

from .detection import load_alerts
from .models import Activity, Case, Finding, QueryReceipt, now
from .security import SentinelError, atomic_json, plain
from .storage import Store
from .workspace import Workspace, WorkspaceBusyError


def valid_id(value: str, prefix: str) -> str:
    if not re.fullmatch(prefix + r"-[a-f0-9]{8,32}", value):
        raise SentinelError("Invalid identifier")
    return value


class Cases:
    def __init__(self, workspace: Workspace):
        self.workspace = workspace

    def get(self, case_id: str) -> Case:
        path = self.workspace.path(f"cases/{valid_id(case_id, 'C')}.json")
        if not path.exists():
            raise SentinelError("Case not found")
        try:
            return Case.model_validate_json(path.read_text())
        except ValueError as exc:
            raise SentinelError("Case file is invalid; preserve it for recovery") from exc

    def reopen(self, case_id: str) -> Case:
        """Recover a stale running status only while owning the actual run lock."""
        case = self.get(case_id)
        if case.status != "investigating":
            return case
        try:
            with self.workspace.lock(f"run-{case_id}", blocking=False):
                # A previous run may have completed between the first read and lock.
                if self.get(case_id).status != "investigating":
                    return self.get(case_id)

                def recover(current):
                    if current.status == "investigating":
                        current.status = "interrupted"
                        current.activity.append(
                            Activity(
                                role="System",
                                action="Recovered interrupted investigation; completed work retained",
                                details={"reason": "No active investigation holds the run lock"},
                            )
                        )

                return self.update(case_id, recover)
        except WorkspaceBusyError:
            # A live agent still owns its lock; reopening must never cancel it.
            return self.get(case_id)

    def list(self) -> list[Case]:
        return sorted(
            [self.get(p.stem) for p in self.workspace.path("cases").glob("C-*.json")],
            key=lambda c: c.updated_at,
            reverse=True,
        )

    def create(
        self,
        alert_id: str | None = None,
        title: str = "Untitled investigation",
        dataset_id: str | None = None,
    ) -> Case:
        store = Store(self.workspace, dataset_id)
        evidence, alert_ids = [], []
        if alert_id:
            alert = next((a for a in load_alerts(store) if a.alert_id == alert_id), None)
            if not alert:
                raise SentinelError("Alert not found in the active dataset")
            evidence, alert_ids = alert.event_ids, [alert_id]
            title = f"{alert.rule_id} · {alert.entities['account']}"
        case = Case(
            case_id="C-" + uuid.uuid4().hex[:12],
            title=plain(title, 200),
            dataset_id=store.dataset,
            alert_ids=alert_ids,
            evidence_ids=evidence,
        )
        atomic_json(self.workspace.path(f"cases/{case.case_id}.json"), case.model_dump())
        return case

    def update(self, case_id: str, change: Callable[[Case], None]) -> Case:
        valid_id(case_id, "C")
        with self.workspace.lock(f"case-{case_id}"):
            case = self.get(case_id)
            change(case)
            case.updated_at = now()
            Case.model_validate(case.model_dump())
            atomic_json(self.workspace.path(f"cases/{case_id}.json"), case.model_dump())
            return case

    def activity(self, case_id: str, role: str, action: str, details: dict | None = None) -> Case:
        entry = Activity(role=role, action=action, details=details or {})
        return self.update(case_id, lambda case: case.activity.append(entry))

    def note(self, case_id: str, text: str) -> Case:
        if not text.strip() or len(text) > 8000:
            raise SentinelError("Notes must contain 1–8000 characters")
        return self.update(case_id, lambda case: case.notes.append(plain(text, 8000)))

    def attach(self, case_id: str, event_ids: list[str]) -> Case:
        if len(event_ids) > 100:
            raise SentinelError("Attach at most 100 events per call")
        case = self.get(case_id)
        store = Store(self.workspace, case.dataset_id)
        store.get_many(event_ids)
        return self.update(
            case_id,
            lambda c: setattr(
                c, "evidence_ids", list(dict.fromkeys([*c.evidence_ids, *event_ids]))
            ),
        )

    def artifact(self, case_id: str, name: str, data: dict) -> str:
        valid_id(case_id, "C")
        digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:12]
        filename = f"artifacts/{case_id}-{name}-{digest}.json"
        atomic_json(self.workspace.path(filename), data)
        return filename


def verify_findings(store: Store, findings: list[Finding]) -> tuple[list[Finding], list[str]]:
    verified, warnings = [], []
    for proposed in findings:
        finding = proposed.model_copy(deep=True)
        mentioned = set(
            re.findall(
                r"\bE-[A-Za-z0-9-]+",
                " ".join([finding.title, finding.explanation, finding.limitations]),
            )
        )
        if not mentioned <= set(finding.event_ids):
            warnings.append(
                f"Rejected finding: {plain(finding.title, 100)} (unlisted textual event reference)"
            )
            continue
        try:
            events = store.get_many(finding.event_ids)
            receipts = []
            for receipt_id in finding.receipt_ids:
                valid_id(receipt_id, "Q")
                receipt = QueryReceipt.model_validate_json(
                    store.workspace.path(f"receipts/{receipt_id}.json").read_text()
                )
                if receipt.dataset_id != store.dataset:
                    raise SentinelError("Receipt belongs to another dataset")
                if not set(receipt.returned_event_ids).intersection(finding.event_ids):
                    raise SentinelError("Receipt does not include cited evidence")
                receipts.append(receipt)
        except (SentinelError, OSError, ValueError):
            warnings.append(
                f"Rejected finding: {plain(finding.title, 100)} (invalid event or query reference)"
            )
            continue
        if finding.category == "observed_fact":
            if not events:
                warnings.append(f"Rejected finding: {plain(finding.title, 100)} (no evidence)")
                continue
            # An event ID proves reference validity, not a model's interpretation.
            # Replace observed prose with reproducible canonical facts and exact receipts.
            lines = [
                f"{e.timestamp}: {e.account or '(no account)'} | {e.action} | {e.outcome} | {e.resource} | source IP {e.source_ip or '(not recorded)'} | session {e.session_id or '(not recorded)'} [{e.event_id}]"
                for e in sorted(events, key=lambda e: (e.timestamp, e.event_id))
            ]
            for r in receipts:
                lines.append(
                    f"Computed query {r.receipt_id}: {r.total_count:,} matching events; {r.total_bytes:,} recorded bytes; action/outcome counts {json.dumps(r.action_outcome_counts, sort_keys=True)} (truncated={r.action_counts_truncated}); range {r.first_timestamp} to {r.last_timestamp}; filters {r.filters.model_dump_json(exclude_none=True)}."
                )
            finding.title = (
                "Recorded event sequence"
                if not receipts
                else "Recorded events and computed query results"
            )
            finding.explanation = "\n".join(lines)
            finding.limitations = "These records establish logged activity only. They do not establish operator identity, authorization, compromise, or malicious intent. Counts describe the exact receipt filters; byte sums include only recorded byte fields."
            finding.verification = "Canonical fields and quantitative results verified in code"
        else:
            finding.verification = (
                "References valid; interpretation remains unproven"
                if events
                else "Open issue; no direct supporting events"
            )
            finding.limitations = plain(
                finding.limitations
                or "Requires additional evidence; this interpretation is not established by event references."
            )
            # Numeric interpretations cannot be treated as computed facts.
            if re.search(
                r"\b\d+(?:[.,]\d+)?\s*(?:%|bytes|MB|GB|seconds|minutes|hours|events|logins|exports|downloads|attempts)\b",
                finding.explanation,
                re.I,
            ):
                finding.category = "open_question"
                finding.explanation = "The model proposed a quantitative interpretation that has not been accepted as a verified claim. Review the cited events and computed query receipts."
                finding.verification = (
                    "Quantitative wording withheld; use the attached computed receipts"
                )
        finding.title = re.sub(
            r"\b\d+(?:\.\d+)?\s*%", "[unsupported percentage removed]", plain(finding.title, 200)
        )
        finding.limitations = re.sub(
            r"\b\d+(?:\.\d+)?\s*%",
            "[unsupported percentage removed]",
            plain(finding.limitations, 2000),
        )
        finding.explanation = re.sub(
            r"\b\d+(?:\.\d+)?\s*%", "[unsupported percentage removed]", finding.explanation
        )
        finding.title = plain(finding.title, 200)
        finding.explanation = plain(finding.explanation, 30000)
        verified.append(finding)
    return verified, warnings


def summarize_findings(findings: list[Finding]) -> str:
    """Short code-generated overview; full facts and references remain in findings."""
    observed = [f for f in findings if f.category == "observed_fact"]
    hypotheses = [f for f in findings if f.category == "hypothesis"]
    questions = [f for f in findings if f.category == "open_question"]
    lines = [
        f"Review contains {len(observed)} observed {'finding' if len(observed) == 1 else 'findings'}, {len(hypotheses)} {'hypothesis' if len(hypotheses) == 1 else 'hypotheses'}, and {len(questions)} open {'question' if len(questions) == 1 else 'questions'}."
    ]
    for f in hypotheses:
        lines.append("Hypothesis (unproven): " + f.title)
    for f in questions:
        lines.append("Open question: " + f.title)
    lines.append(
        "Observed findings below contain canonical event fields and exact computed query results. Reference validity does not prove the model's interpretation."
    )
    return "\n".join(lines)
