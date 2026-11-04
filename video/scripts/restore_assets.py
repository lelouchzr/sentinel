"""Restore reproducible film inputs from committed captures and official licensed media."""

from __future__ import annotations

import hashlib
import io
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

P = Path(__file__).resolve().parents[1]


def download(url, referrer):
    request = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", "Referer": referrer}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def restore():
    audio = P / "assets/audio"
    captures = P / "assets/captures"
    vendor = P / "assets/vendor"
    for folder in [audio, captures, vendor]:
        folder.mkdir(parents=True, exist_ok=True)
    for source in (P / "source-captures").iterdir():
        if source.is_file():
            shutil.copyfile(source, captures / source.name)
    shutil.copyfile(P / "node_modules/gsap/dist/gsap.min.js", vendor / "gsap.min.js")
    music = audio / "cipher-original.mp3"
    if not music.exists():
        music.write_bytes(
            download(
                "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher2.mp3",
                "https://incompetech.com/music/royalty-free/",
            )
        )
    effect = audio / "switch_003.ogg"
    if not effect.exists():
        archive = download(
            "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
            "https://kenney.nl/assets/interface-sounds",
        )
        # Read the named member only. Never extract an archive's arbitrary paths.
        with zipfile.ZipFile(io.BytesIO(archive)) as source:
            effect.write_bytes(source.read("Audio/switch_003.ogg"))
    manifest = json.loads((P / "data/asset-manifest.json").read_text())
    for relative, expected in manifest["source_assets"].items():
        asset = P / relative
        if hashlib.sha256(asset.read_bytes()).hexdigest() != expected["sha256"]:
            raise RuntimeError(f"A source asset differs from the recorded version: {relative}")
    print(
        "Restored source recordings, pinned animation runtime and licensed audio; hashes verified."
    )


if __name__ == "__main__":
    restore()
