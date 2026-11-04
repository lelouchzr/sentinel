"""Explicit Meta configuration. No provider fallback and no automatic paid retries."""

from __future__ import annotations

import os
from urllib.parse import urlparse

from pydantic import Field, SecretStr, ValidationError

from .models import Model
from .security import SentinelError


class AgentConfig(Model):
    api_key: SecretStr
    base_url: str = "https://api.meta.ai/v1"
    model: str = "muse-spark-1.3"
    max_model_calls: int = Field(default=10, ge=3, le=30)
    max_tool_calls: int = Field(default=18, ge=3, le=60)
    request_timeout: float = Field(default=45, ge=1, le=120)
    deadline: float = Field(default=180, ge=5, le=900)

    @classmethod
    def from_env(cls):
        key = os.environ.get("META_API_KEY") or os.environ.get("MODEL_API_KEY")
        if not key:
            raise SentinelError(
                "Meta is not configured. Export META_API_KEY to enable live investigation."
            )
        if not 12 <= len(key) <= 512 or any(c.isspace() for c in key):
            raise SentinelError("Invalid Meta API key format; check the environment value")
        url = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")
        parsed = urlparse(url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise SentinelError(
                "META_BASE_URL must be an HTTPS API URL without credentials, query or fragment"
            )
        model = os.environ.get("META_MODEL", "muse-spark-1.3")
        if not model or len(model) > 128 or any(c.isspace() for c in model):
            raise SentinelError("Invalid META_MODEL value")
        try:
            return cls(
                api_key=key,
                base_url=url,
                model=model,
                **{
                    key: os.environ.get(env, default)
                    for key, env, default in [
                        ("max_model_calls", "SENTINEL_MAX_MODEL_CALLS", 10),
                        ("max_tool_calls", "SENTINEL_MAX_TOOL_CALLS", 18),
                        ("request_timeout", "SENTINEL_REQUEST_TIMEOUT", 45),
                        ("deadline", "SENTINEL_DEADLINE", 180),
                    ]
                },
            )
        except ValidationError as exc:
            raise SentinelError(
                "Invalid Sentinel agent limits; run sentinel doctor and check .env.example"
            ) from exc


def provider_status() -> str:
    try:
        AgentConfig.from_env()
        return "Configured, not yet verified"
    except SentinelError:
        return (
            "Not configured"
            if not (os.environ.get("META_API_KEY") or os.environ.get("MODEL_API_KEY"))
            else "Invalid configuration"
        )
