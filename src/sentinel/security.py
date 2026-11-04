"""Local path boundaries and safe presentation for untrusted log records."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any


class SentinelError(Exception):
    """An actionable error safe to display without raw exception details."""


def plain(value: Any, limit: int = 20000) -> str:
    text = str(value)
    # Strip OSC, CSI, other escape sequences, C0/C1 controls and bidi overrides.
    text = re.sub(r"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)", "", text)
    text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", text)
    text = re.sub(r"\x1b[@-_]", "", text)
    return "".join(
        c
        for c in text
        if c in "\n\t"
        or (
            ord(c) >= 32
            and not 127 <= ord(c) <= 159
            and c not in "\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069"
        )
    )[:limit]


def no_symlinks(path: Path) -> Path:
    path = path.expanduser().absolute()
    # macOS aliases /tmp and /var are allowed as OS-owned ancestors only.
    for part in [path, *path.parents]:
        if part.is_symlink() and str(part) not in ("/tmp", "/var"):
            raise SentinelError("Symlink paths are not allowed")
    return path.resolve()


def inside(root: Path, relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise SentinelError("Path must remain inside the Sentinel workspace")
    target = no_symlinks(root / candidate)
    if not target.is_relative_to(root.resolve()):
        raise SentinelError("Path escapes the Sentinel workspace")
    return target


def atomic_json(path: Path, data: Any) -> None:
    atomic_text(path, json.dumps(data, indent=2, ensure_ascii=True) + "\n")


def atomic_text(path: Path, content: str) -> None:
    no_symlinks(path)
    fd, temporary = tempfile.mkstemp(prefix=".write-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
