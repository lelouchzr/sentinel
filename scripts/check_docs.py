#!/usr/bin/env python3
"""Check repository documentation using only the Python standard library."""

import csv
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md",
    "AGENTS.md",
    "agent.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CHANGELOG.md",
    ".env.example",
    "docs/README.md",
    "docs/product.md",
    "docs/architecture.md",
    "docs/data-model.md",
    "docs/ai-and-learning.md",
    "docs/imports.md",
    "docs/development.md",
    "docs/roadmap.md",
    "docs/quality-and-demo.md",
    "docs/budget.md",
    "docs/sources.md",
    "examples/vocabulary.ko-fr.tsv",
)
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^\s)]+)(?:\s+\"[^\"]*\")?\)")
SECRET_FIELDS = (
    "META_API_KEY",
    "AZURE_SPEECH_KEY",
    "SUPABASE_SECRET_KEY",
    "MAINTENANCE_SECRET",
)


def main():
    errors = []
    for name in REQUIRED:
        path = ROOT / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Missing or empty required file: {name}")

    paths = set(ROOT.glob("*.md"))
    paths.update(ROOT.glob(".*example"))
    for folder in ("docs", ".github", "examples", "scripts"):
        paths.update(
            path
            for path in (ROOT / folder).rglob("*")
            if path.is_file() and "__pycache__" not in path.parts
        )

    for path in sorted(paths):
        relative = path.relative_to(ROOT)
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeError, OSError) as error:
            errors.append(f"Cannot read {relative}: {error}")
            continue
        if not text.endswith("\n"):
            errors.append(f"Missing final newline: {relative}")
        for number, line in enumerate(text.splitlines(), start=1):
            if line != line.rstrip():
                errors.append(f"Trailing whitespace: {relative}:{number}")
        if path.suffix != ".md":
            continue
        # Ignore fenced examples; validate repository-relative file links only.
        prose = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        for match in MARKDOWN_LINK.finditer(prose):
            target = match.group(1).strip("<>")
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            destination = (path.parent / unquote(parsed.path)).resolve()
            if not destination.is_relative_to(ROOT):
                errors.append(f"Non-portable local link in {relative}: {target}")
            elif not destination.exists():
                errors.append(f"Broken local link in {relative}: {target}")

    example = ROOT / ".env.example"
    if example.exists():
        for line in example.read_text(encoding="utf-8").splitlines():
            if "=" not in line or line.lstrip().startswith("#"):
                continue
            key, value = line.split("=", 1)
            if key.strip() in SECRET_FIELDS and value.strip():
                # Report the name only; never print a credential value.
                errors.append(f"Secret field must be empty in .env.example: {key}")

    sample = ROOT / "examples/vocabulary.ko-fr.tsv"
    if sample.exists():
        with sample.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.reader(stream, delimiter="\t"))
        if not rows or rows[0] != [
            "expression", "meaning", "target_language", "explanation_language"
        ]:
            errors.append("Unexpected sample vocabulary header")
        for number, row in enumerate(rows[1:], start=2):
            if len(row) != 4 or any(not field.strip() for field in row):
                errors.append(f"Invalid vocabulary sample row: {number}")

    if errors:
        print("Documentation checks failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Documentation checks passed ({len(paths)} text files checked).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
