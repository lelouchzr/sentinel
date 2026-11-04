"""Edit licensed music and CC0 effects; normalize the finished instrumental mix."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

P = Path(__file__).resolve().parents[1]
A = P / "assets/audio"
STORY = json.loads((P / "storyboard.json").read_text())
DURATION = STORY["duration"]


def run(args):
    return subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", *args], check=True, capture_output=True, text=True
    )


def mix():
    # These effects are placed on authored transitions, never used to imply an
    # application interaction that is absent from the recorded terminal.
    taps = [scene["start"] for scene in STORY["scenes"] if scene["start"]] + [139.2]
    source_start = 6.4
    source_end = source_start + DURATION
    chains = [
        f"[0:a]atrim=start={source_start}:end={source_end},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d=0.25,afade=t=out:st={DURATION - 3.6}:d=3.6,volume=0.78[bed]",
        f"[1:a]asplit={len(taps)}" + "".join(f"[tap{i}]" for i in range(len(taps))),
    ]
    for i, time in enumerate(taps):
        chains.append(
            f"[tap{i}]volume=0.65,adelay={round(time * 1000) + 33}|{round(time * 1000) + 33}[s{i}]"
        )
    chains.append(
        "[bed]"
        + "".join(f"[s{i}]" for i in range(len(taps)))
        + f"amix=inputs={len(taps) + 1}:duration=first:normalize=0[mix]"
    )
    run(
        [
            "-i",
            str(A / "cipher-original.mp3"),
            "-i",
            str(A / "switch_003.ogg"),
            "-filter_complex",
            ";".join(chains),
            "-map",
            "[mix]",
            "-t",
            str(DURATION),
            "-ar",
            "48000",
            "-ac",
            "2",
            str(A / "mix-unmastered.wav"),
        ]
    )
    measured = run(
        [
            "-i",
            str(A / "mix-unmastered.wav"),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json",
            "-f",
            "null",
            "-",
        ]
    )
    stats = json.loads(re.findall(r"\{[^{}]+\}", measured.stderr, re.S)[-1])
    filter = (
        f"loudnorm=I=-16:TP=-1.5:LRA=8:measured_I={stats['input_i']}:"
        f"measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:"
        f"measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
    )
    run(
        [
            "-i",
            str(A / "mix-unmastered.wav"),
            "-af",
            filter,
            "-ar",
            "48000",
            "-ac",
            "2",
            "-c:a",
            "pcm_s24le",
            str(A / "master.wav"),
        ]
    )
    (P / "data/audio-mix.json").write_text(
        json.dumps(
            {
                "duration": DURATION,
                "music": "Cipher by Kevin MacLeod",
                "license": "CC BY 4.0",
                "source_start_seconds": source_start,
                "source_end_seconds": source_end,
                "effects": "Kenney Interface Sounds, CC0",
                "effects_at_seconds": taps,
                "normalization_target_lufs": -16,
                "true_peak_target_dbtp": -1.5,
                "voiceover": False,
                "measured_before_normalization": stats,
                "review_note": "Audio levels are measured, not subjectively heard by the authoring agent.",
            },
            indent=2,
        )
        + "\n"
    )
    print("Prepared the licensed instrumental mix at 48 kHz; no voice or paid audio service used.")


if __name__ == "__main__":
    mix()
