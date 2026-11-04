"""Package the complete editable film, without caches, credentials or failed takes."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

P = Path(__file__).resolve().parents[1]


def package():
    output = P / "renders/sentinel-source.zip"
    names = []
    roots = [
        "compositions",
        "scripts",
        "licenses",
        "data",
        "source-captures",
        "assets/fonts",
        "assets/vendor",
        "assets/captures",
        "renders/review",
        "renders/final-details",
        "renders/mcp-refinement",
    ]
    files = [
        "index.html",
        "package.json",
        "package-lock.json",
        "requirements.txt",
        "README.md",
        "CREDITS.md",
        "PUBLICATION.txt",
        "STORYLINES.md",
        "SPEC.md",
        "REVIEW.md",
        "storyboard.json",
        "assets/audio/master.wav",
        "assets/audio/cipher-original.mp3",
        "assets/audio/switch_003.ogg",
        "renders/poster.png",
    ]
    for root in roots:
        files.extend(
            str(p.relative_to(P))
            for p in (P / root).rglob("*")
            if p.is_file() and "__pycache__" not in p.parts
        )
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in sorted(set(files)):
            source = P / name
            if not source.is_file() or source.is_symlink():
                raise RuntimeError(f"A required source file is missing or unsafe: {name}")
            archive.write(source, f"sentinel-film/{name}")
            names.append(name)
        for source in sorted((P.parent / "examples/company-logs").iterdir()):
            if source.suffix in {".csv", ".jsonl"}:
                archive.write(source, f"sentinel-film/evidence-sources/{source.name}")
                names.append(f"evidence-sources/{source.name}")
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert not any(
            name.startswith("/") or ".." in Path(name).parts for name in archive.namelist()
        )
        assert not any(
            part in {"node_modules", ".env", ".venv", ".git"}
            for name in archive.namelist()
            for part in Path(name).parts
        )
    result = {
        "file": output.name,
        "bytes": output.stat().st_size,
        "members": len(names),
        "archive_integrity": "passed",
        "includes_original_fictional_sources": True,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    package()
