"""Prepare one plotted point per actual imported event, outside the model runtime."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from sentinel.storage import Store
from sentinel.workspace import Workspace

P = Path(__file__).resolve().parents[1]
workspace = Workspace(".sentinel-video-live-v2", create=False)
facts = json.loads((P / "data/evidence.json").read_text())
case = json.loads((P / "data/case-report.json").read_text())["case"]
events = Store(workspace, case["dataset_id"]).all_events()
hosts = sorted({e.host for e in events})
sources = sorted({e.source_type for e in events})
points = [
    [
        e.event_id,
        datetime.fromisoformat(e.timestamp).timestamp(),
        sources.index(e.source_type),
        hosts.index(e.host),
        int(e.event_id in case["evidence_ids"]),
    ]
    for e in events
]
assert len(points) == facts["dataset"]["event_count"]
assert sum(p[-1] for p in points) == len(case["evidence_ids"])
out = {
    "dataset_id": case["dataset_id"],
    "columns": ["event_id", "utc_epoch", "source_type_index", "host_index", "attached_to_case"],
    "hosts": hosts,
    "source_types": sources,
    "points": points,
    "note": "One point per imported record; positions derive from timestamp, source type and host. This visualization is editorial, not a product graph feature.",
}
(P / "data/event-map.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(f"Prepared {len(points)} actual events and {sum(p[-1] for p in points)} case highlights.")
