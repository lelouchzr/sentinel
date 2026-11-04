"""Explicit configuration; never read or persist provider secrets in job records."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    workspace: Path
    data_dir: Path
    allow_execution: bool = False
    runner: str = "local"
    model_url: str = "http://127.0.0.1:11434/v1"
    model: str = "llama3.2:3b"
    model_key: str = ""
    model_enabled: bool = False
    max_files: int = 10_000
    max_file_bytes: int = 1_000_000
    case_timeout: float = 5.0

    @classmethod
    def from_env(cls) -> "Settings":
        workspace = Path(os.getenv("SLIM_WORKSPACE", Path.cwd())).resolve()
        return cls(
            workspace=workspace,
            data_dir=Path(os.getenv("SLIM_DATA_DIR", workspace / ".slim")).resolve(),
            allow_execution=os.getenv("SLIM_ALLOW_EXECUTION", "0") == "1",
            runner=os.getenv("SLIM_RUNNER", "local"),
            model_url=os.getenv("SLIM_MODEL_URL", "http://127.0.0.1:11434/v1").rstrip("/"),
            model=os.getenv("SLIM_MODEL", "llama3.2:3b"),
            model_key=os.getenv("SLIM_MODEL_KEY", ""),
            model_enabled=os.getenv("SLIM_MODEL_ENABLED", "0") == "1",
        )
