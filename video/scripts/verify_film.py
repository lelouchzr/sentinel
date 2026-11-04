"""Validate the delivered file, its captured evidence and its publication inputs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

P = Path(__file__).resolve().parents[1]


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def verify(path):
    info = json.loads(
        run(
            [
                "ffprobe",
                "-v",
                "error",
                "-count_frames",
                "-show_streams",
                "-show_format",
                "-of",
                "json",
                str(path),
            ]
        ).stdout
    )
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = next(s for s in info["streams"] if s["codec_type"] == "audio")
    assert (video["width"], video["height"]) == (1920, 1080)
    assert video["codec_name"] == "h264" and video["avg_frame_rate"] == "30/1"
    assert int(video["nb_read_frames"]) == 3456
    assert abs(float(info["format"]["duration"]) - 115.2) < 0.1
    assert audio["codec_name"] == "aac" and int(audio["channels"]) == 2
    # Decode the entire file, not only a thumbnail or container header.
    run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"])
    loudness = run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json",
            "-f",
            "null",
            "-",
        ]
    )
    levels = json.loads(re.findall(r"\{[^{}]+\}", loudness.stderr, re.S)[-1])
    assert -18 <= float(levels["input_i"]) <= -14
    assert float(levels["input_tp"]) <= -0.5
    facts = json.loads((P / "data/evidence.json").read_text())
    report = json.loads((P / "data/case-report.json").read_text())
    capture = json.loads((P / "source-captures/capture.json").read_text())
    assert capture["real_terminal"] and capture["application_exit_codes"] == [0, 0]
    assert capture["saved_live_case"] and capture["new_model_calls_during_capture"] == 0
    assert facts["case_id"] == capture["case_id"] == report["case"]["case_id"]
    assert facts["dataset"]["event_count"] == report["manifest"]["accepted"]
    assert facts["case_provider"] == "Meta Model API" and facts["case_status"] == "reviewed"
    known = {event["event_id"] for event in report["evidence"]}
    for finding in report["case"]["findings"]:
        assert set(finding["event_ids"]) <= known
    originals = P / "evidence-sources"
    if not originals.exists():
        originals = P.parent / "examples/company-logs"
    records = {}
    for source in originals.iterdir():
        if source.suffix == ".csv":
            with source.open(newline="") as stream:
                records[source.name] = list(csv.DictReader(stream))
        elif source.suffix == ".jsonl":
            records[source.name] = [json.loads(line) for line in source.read_text().splitlines()]
    assert sum(len(rows) for rows in records.values()) == facts["dataset"]["event_count"]
    for event in [*report["evidence"], *facts["backup"]["events"]]:
        source = event["source"]
        original = originals / source["filename"]
        assert original.resolve().is_relative_to(originals.resolve())
        assert hashlib.sha256(original.read_bytes()).hexdigest() == source["sha256"]
        assert records[source["filename"]][source["record"] - 1] == source["original"]
    assert facts["session"]["receipt"]["total_bytes"] == sum(
        event["bytes"] or 0 for event in facts["session"]["events"]
    )
    assert "Previously completed live investigation" in (P / "compositions/agent.html").read_text()
    scanned = []
    for folder in [P / "source-captures", P / "data", P / "compositions"]:
        for source in folder.iterdir():
            if source.is_file():
                content = source.read_text()
                assert not re.search(r"LLM_[A-Za-z0-9_]{15,}", content), (
                    "Credential pattern in a publication input"
                )
                scanned.append(str(source.relative_to(P)))
    manifest = json.loads((P / "data/asset-manifest.json").read_text())
    for relative, expected in manifest["source_assets"].items():
        assert hashlib.sha256((P / relative).read_bytes()).hexdigest() == expected["sha256"]
    result = {
        "file": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "duration_seconds": float(info["format"]["duration"]),
        "dimensions": [video["width"], video["height"]],
        "fps": video["avg_frame_rate"],
        "frames": int(video["nb_read_frames"]),
        "video_codec": video["codec_name"],
        "audio_codec": audio["codec_name"],
        "audio_channels": audio["channels"],
        "integrated_lufs": float(levels["input_i"]),
        "true_peak_dbtp": float(levels["input_tp"]),
        "full_decode": "passed",
        "publication_input_scan": "passed",
        "scanned_files": scanned,
        "evidence_reference_validation": "passed",
        "original_source_hashes_and_records": "passed",
        "case_id": facts["case_id"],
        "saved_live_case_disclosed": True,
        "voiceover": False,
        "audio_review": "Measured, not subjectively heard by the authoring agent",
    }
    (P / "data/delivery-verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, nargs="?", default=P / "renders/sentinel-demo.mp4")
    verify(parser.parse_args().file)
