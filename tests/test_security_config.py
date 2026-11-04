import json

import pytest
from typer.testing import CliRunner

from sentinel.cases import Cases
from sentinel.cli import app
from sentinel.config import AgentConfig, provider_status
from sentinel.ingest import ingest
from sentinel.security import SentinelError, inside, plain
from sentinel.tui import parse_filters
from sentinel.workspace import Workspace


def test_control_sequences_and_literal_markup():
    dirty = "\x1b[31m[bold]login[/bold]\x1b[0m\x1b]0;evil\x07\u202e\x00"
    clean = plain(dirty)
    assert clean == "[bold]login[/bold]"
    # UI uses rich.text.Text and markup=False, so bracketed source stays literal.
    from rich.text import Text

    assert Text(clean).plain == clean


def test_workspace_boundaries_and_symlinks(workspace, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    with pytest.raises(SentinelError):
        inside(workspace.root, "../outside")
    with pytest.raises(SentinelError):
        inside(workspace.root, str(outside))
    (workspace.root / "reports" / "escape").symlink_to(outside, target_is_directory=True)
    with pytest.raises(SentinelError):
        workspace.path("reports/escape/report.md")
    source = tmp_path / "source"
    source.mkdir()
    (source / "data.jsonl").symlink_to(outside / "anything")
    with pytest.raises(SentinelError, match="symlink"):
        ingest(workspace, source)
    arbitrary = tmp_path / "arbitrary"
    arbitrary.mkdir()
    (arbitrary / "keep.txt").write_text("Preserve this")
    with pytest.raises(SentinelError, match="nonempty"):
        Workspace(arbitrary)
    with pytest.raises(SentinelError):
        Cases(workspace).get("../../outside")


def test_meta_missing_invalid_precedence(monkeypatch):
    for name in (
        "META_API_KEY",
        "MODEL_API_KEY",
        "META_BASE_URL",
        "META_MODEL",
        "SENTINEL_MAX_MODEL_CALLS",
    ):
        monkeypatch.delenv(name, raising=False)
    assert provider_status() == "Not configured"
    with pytest.raises(SentinelError, match="not configured"):
        AgentConfig.from_env()
    monkeypatch.setenv("MODEL_API_KEY", "offline-test-alias")
    monkeypatch.setenv("META_API_KEY", "offline-test-primary")
    assert AgentConfig.from_env().api_key.get_secret_value() == "offline-test-primary"
    assert "offline-test-primary" not in repr(AgentConfig.from_env())
    monkeypatch.setenv("META_BASE_URL", "http://example.com")
    with pytest.raises(SentinelError, match="HTTPS"):
        AgentConfig.from_env()
    monkeypatch.setenv("META_BASE_URL", "https://api.meta.ai/v1")
    monkeypatch.setenv("SENTINEL_MAX_MODEL_CALLS", "invalid")
    with pytest.raises(SentinelError, match="limits"):
        AgentConfig.from_env()
    monkeypatch.delenv("SENTINEL_MAX_MODEL_CALLS")
    monkeypatch.setenv("META_API_KEY", "bad key")
    assert provider_status() == "Invalid configuration"


def test_filters_and_cli_json(demo, monkeypatch):
    assert parse_filters('account="fictional user" ip=203.0.113.2 min_bytes=20').min_bytes == 20
    for text in ("sql=delete", "account=a account=b", "start=invalid", "missing-equals"):
        with pytest.raises(SentinelError):
            parse_filters(text)
    monkeypatch.setenv("META_API_KEY", "offline-test-redaction-canary")
    result = CliRunner().invoke(app, ["--workspace", str(demo.root), "doctor", "--json"])
    assert result.exit_code == 0, result.output
    assert "offline-test-redaction-canary" not in result.output
    assert "\x1b" not in result.output
    assert json.loads(result.output)["event_count"] == 3542
