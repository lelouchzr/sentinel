import csv
import hashlib
from datetime import datetime

import pytest
from conftest import record, write_jsonl

from sentinel.ingest import ingest
from sentinel.models import utc_timestamp
from sentinel.security import SentinelError
from sentinel.storage import Store


def test_csv_jsonl_provenance_ids_reimport(workspace, tmp_path):
    source = tmp_path / "source"
    write_jsonl(source, [record(), record()])
    with (source / "auth.csv").open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(record()))
        writer.writeheader()
        writer.writerow(record(timestamp="2026-10-20T10:00:00+02:00"))
    summary = ingest(workspace, source)
    assert (summary["accepted"], summary["rejected"], summary["inserted"]) == (3, 0, 3)
    page = Store(workspace).search()
    assert len({e.event_id for e in page.events}) == 3
    assert page.events[0].timestamp.startswith("2026-10-20T08:00")
    event = page.events[-1]
    assert event.source.original == record()
    assert (
        event.source.sha256
        == hashlib.sha256((source / event.source.filename).read_bytes()).hexdigest()
    )
    assert event.source.record == event.source.line
    again = ingest(workspace, source)
    assert again["inserted"] == 0 and again["already_present"] == 3
    assert {e.event_id for e in Store(workspace).search().events} == {
        e.event_id for e in page.events
    }


def test_malformed_empty_unsupported_and_optional(workspace, tmp_path):
    source = tmp_path / "source"
    write_jsonl(
        source, [record(), record(timestamp="not-a-date"), record(bytes=-1), {"action": "login"}]
    )
    with (source / "events.jsonl").open("a") as f:
        f.write("{broken}\n[]\n\n")
    (source / "empty.csv").write_text("")
    (source / "notes.txt").write_text("Fictional source description")
    summary = ingest(workspace, source)
    assert summary["accepted"] == 1 and summary["rejected"] == 5 and summary["skipped"] == 3
    assert len(summary["issues"]) == 8
    event = Store(workspace).search().events[0]
    assert event.host == "" and event.bytes is None
    assert len(workspace.manifest()["files"]) == 2


def test_empty_dataset_and_no_supported_input(workspace, tmp_path):
    source = tmp_path / "empty"
    source.mkdir()
    with pytest.raises(SentinelError, match="No supported"):
        ingest(workspace, source)
    (source / "empty.jsonl").write_text("")
    summary = ingest(workspace, source)
    assert summary["accepted"] == 0
    assert Store(workspace).summary()["event_count"] == 0


def test_timezone_mixed_order_and_dst(workspace, tmp_path):
    source = tmp_path / "source"
    write_jsonl(
        source, [record(timestamp="2026-10-20T12:00:00"), record(timestamp="2026-10-20T09:00:00Z")]
    )
    ingest(workspace, source, "Europe/Paris")
    events = Store(workspace).search().events
    assert [datetime.fromisoformat(e.timestamp).hour for e in events] == [9, 10]
    assert utc_timestamp("2026-10-20T12:00:00").startswith("2026-10-20T12")
    with pytest.raises(ValueError, match="Ambiguous"):
        utc_timestamp("2026-10-25T02:30:00", "Europe/Paris")
    with pytest.raises(ValueError, match="nonexistent"):
        utc_timestamp("2026-03-29T02:30:00", "Europe/Paris")
    with pytest.raises(SentinelError, match="timezone"):
        ingest(workspace, source, "Not/AZone")


def test_csv_multiline_and_invalid_cells(workspace, tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    with (source / "multi.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[*record(), "context"])
        writer.writeheader()
        writer.writerow({**record(), "context": "first line\nsecond line"})
        writer.writerow({**record(), "context": "normal"})
    summary = ingest(workspace, source)
    events = sorted(Store(workspace).search().events, key=lambda e: e.source.record)
    assert summary["accepted"] == 2
    assert [(e.source.record, e.source.line) for e in events] == [(1, 2), (2, 4)]
    (source / "bad.csv").write_text(
        "timestamp,source_type,action,outcome\n2026-01-01T00:00:00Z,auth,login,success,extra\n"
    )
    assert ingest(workspace, source)["rejected"] == 1


def test_dataset_versions_preserve_old_events(workspace, tmp_path):
    source = tmp_path / "source"
    write_jsonl(source, [record()])
    first = ingest(workspace, source)["dataset_id"]
    old_event = Store(workspace).search().events[0]
    write_jsonl(source, [record(account="quinn")])
    second = ingest(workspace, source)["dataset_id"]
    assert first != second
    assert Store(workspace, first).get(old_event.event_id).account == "riley"
    with pytest.raises(SentinelError):
        Store(workspace, second).get(old_event.event_id)


def test_committed_dataset_reproducibility(tmp_path):
    from pathlib import Path

    from sentinel.generator import generate

    generated = tmp_path / "generated"
    generate(generated)
    committed = Path(__file__).resolve().parents[1] / "examples/company-logs"
    for name in ("identity.csv", "services.jsonl"):
        assert (generated / name).read_bytes() == (committed / name).read_bytes()


def test_malformed_fixture_and_strict_bytes(workspace, tmp_path):
    import shutil
    from pathlib import Path

    source = tmp_path / "source"
    source.mkdir()
    shutil.copyfile(Path(__file__).parent / "fixtures/malformed.jsonl", source / "malformed.jsonl")
    summary = ingest(workspace, source)
    assert summary["accepted"] == 1 and summary["rejected"] == 4
    write_jsonl(
        source, [record(bytes=True), record(bytes=1.5), record(source_type=" ")], "strict.jsonl"
    )
    assert ingest(workspace, source)["rejected"] == 7
