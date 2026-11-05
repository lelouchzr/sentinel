"""Explicit, validated replay of the genuine Meta case recorded for the product film."""

import hashlib
import json
from importlib.resources import files

from .cases import Cases, summarize_findings, valid_id, verify_findings
from .models import Activity, Case, Event, QueryReceipt, now
from .progress import run_progress
from .security import SentinelError, atomic_json
from .storage import Store
from .workspace import Workspace


def restore_recorded_case(workspace: Workspace) -> Case:
    """Import only the packaged recorded case, with no provider or model request."""
    data = files("sentinel").joinpath("data")
    payload = data.joinpath("recorded-case.json").read_bytes()
    provenance = json.loads(
        data.joinpath("recorded-case-manifest.json").read_text(encoding="utf-8")
    )
    digest = hashlib.sha256(payload).hexdigest()
    if digest != provenance["sha256"]:
        raise SentinelError("The packaged recorded investigation failed its integrity check")
    exported = json.loads(payload)
    case = Case.model_validate(exported["case"])
    valid_id(case.case_id, "C")
    if case.case_id != provenance["case_id"] or case.dataset_id != workspace.dataset_id:
        raise SentinelError("The recorded case requires its unchanged demonstration dataset")
    cases = Cases(workspace)
    store = Store(workspace, case.dataset_id)
    metadata_path = workspace.path("artifacts/recorded-case-import.json")
    with workspace.lock("recorded-case-import"):
        case_path = workspace.path(f"cases/{case.case_id}.json")
        if case_path.exists():
            if not metadata_path.exists():
                raise SentinelError(
                    "This case ID already exists; its current contents were preserved"
                )
            metadata = json.loads(metadata_path.read_text())
            if (
                metadata.get("source_sha256") != digest
                or metadata.get("dataset_id") != case.dataset_id
            ):
                raise SentinelError(
                    "The existing recorded-case metadata does not match; files were preserved"
                )
            return cases.get(case.case_id)
        expected = [Event.model_validate(event) for event in exported["evidence"]]
        actual = {
            event.event_id: event
            for event in store.get_many([event.event_id for event in expected])
        }
        if any(actual[event.event_id] != event for event in expected):
            raise SentinelError("Recorded evidence does not match the imported original records")
        referenced = set(case.evidence_ids) | {
            event for finding in case.findings for event in finding.event_ids
        }
        if referenced != set(actual):
            raise SentinelError("The recorded case has inconsistent evidence references")
        receipts = []
        for value in exported["computed_queries"]:
            receipt = QueryReceipt.model_validate(value)
            valid_id(receipt.receipt_id, "Q")
            if receipt.dataset_id != case.dataset_id:
                raise SentinelError("A recorded query belongs to another dataset")
            checked = store.search(receipt.filters, limit=100)
            for field in (
                "total_count",
                "total_bytes",
                "first_timestamp",
                "last_timestamp",
                "action_outcome_counts",
                "action_counts_truncated",
            ):
                if getattr(receipt, field) != getattr(checked.receipt, field):
                    raise SentinelError("A recorded quantitative claim could not be reproduced")
            if checked.total > 10000:
                raise SentinelError("The recorded query exceeds the replay validation bound")
            matching = {event.event_id for event in checked.events}
            for offset in range(100, checked.total, 100):
                matching.update(
                    event.event_id
                    for event in store.search(receipt.filters, limit=100, offset=offset).events
                )
            if not set(receipt.returned_event_ids) <= matching:
                raise SentinelError("A recorded query includes events outside its filters")
            path = workspace.path(f"receipts/{receipt.receipt_id}.json")
            if path.exists() and QueryReceipt.model_validate_json(path.read_text()) != receipt:
                raise SentinelError("An existing query receipt differs; it was preserved")
            receipts.append(receipt)
        progress = run_progress(case)
        if (
            progress.model_requests != provenance["model_requests"]
            or progress.tool_attempts != provenance["tool_attempts"]
        ):
            raise SentinelError("Recorded operation counts do not match the captured run")
        # Only validated receipts are installed; original case files remain untouched.
        for receipt in receipts:
            atomic_json(workspace.path(f"receipts/{receipt.receipt_id}.json"), receipt.model_dump())
        findings, warnings = verify_findings(store, case.findings)
        if warnings or len(findings) != len(case.findings):
            raise SentinelError(
                "Recorded findings failed evidence validation; no case was imported"
            )
        case.findings = findings
        case.summary = summarize_findings(findings)
        case.title = ("RECORDED · " + case.title)[:200]
        case.provider = f"RECORDED META RUN · {provenance['model']} · {provenance['captured_on']}"
        case.status = "reviewed"
        case.updated_at = now()
        case.notes.append(
            f"Recorded example: real Meta investigation captured on {provenance['captured_on']}. Loading this case made no model request. Event records, source references and quantitative receipts were verified against the imported fictional dataset. Historical per-tool runtime files are not bundled; their paths are retained only as recorded references."
        )
        for activity in case.activity:
            if "artifact" in activity.details:
                activity.details["recorded_artifact_reference"] = activity.details.pop("artifact")
        validation = cases.artifact(
            case.case_id,
            "recorded-validation",
            {
                "source_sha256": digest,
                "recording": provenance,
                "event_ids": sorted(actual),
                "validated_receipts": [receipt.receipt_id for receipt in receipts],
                "new_model_requests": 0,
            },
        )
        case.activity.append(
            Activity(
                role="System",
                action="Loaded recorded Meta investigation; no new model requests made",
                details={"artifact": validation, "captured_on": provenance["captured_on"]},
            )
        )
        atomic_json(
            metadata_path,
            {
                "case_id": case.case_id,
                "dataset_id": case.dataset_id,
                "source_sha256": digest,
                "imported_at": now(),
            },
        )
        atomic_json(case_path, case.model_dump())
        return case
