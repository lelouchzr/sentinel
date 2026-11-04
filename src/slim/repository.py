"""Confined local source access and public GitHub checkout acquisition."""

import hashlib
import os
import re
import shutil
import subprocess
import threading
from pathlib import Path

from slim.config import Settings
from slim.errors import SlimError


class Repositories:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.cache = settings.data_dir / "repos"
        self.lock = threading.Lock()

    def resolve(self, source: str) -> Path:
        if source.startswith("https://"):
            return self.clone(source)
        path = Path(source).expanduser()
        if not path.is_absolute():
            path = self.settings.workspace / path
        path = path.resolve()
        if not path.is_relative_to(self.settings.workspace) and not path.is_relative_to(
            self.cache.resolve()
        ):
            raise SlimError(
                "Source must be inside SLIM_WORKSPACE or the managed repository cache",
                "path_forbidden",
            )
        if not path.is_dir():
            raise SlimError("Source directory does not exist", "source_missing")
        return path

    def clone(self, url: str) -> Path:
        if not re.fullmatch(
            r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?/?", url
        ):
            raise SlimError(
                "Only public HTTPS github.com/owner/repository URLs are accepted",
                "invalid_repository",
            )
        canonical = url.rstrip("/").removesuffix(".git")
        destination = self.cache / hashlib.sha256(canonical.encode()).hexdigest()[:20]
        with self.lock:
            if (destination / ".git").exists():
                return destination
            self.cache.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_name(destination.name + ".partial")
            shutil.rmtree(temporary, ignore_errors=True)
            env = {
                "PATH": os.environ.get("PATH", ""),
                "GIT_TERMINAL_PROMPT": "0",
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_CONFIG_GLOBAL": os.devnull,
            }
            try:
                result = subprocess.run(
                    [
                        "git",
                        "-c",
                        "core.hooksPath=/dev/null",
                        "-c",
                        "protocol.file.allow=never",
                        "clone",
                        "--depth=1",
                        "--no-tags",
                        "--",
                        canonical + ".git",
                        str(temporary),
                    ],
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                if result.returncode:
                    raise SlimError(
                        "Could not clone this public repository. Check URL and network access.",
                        "clone_failed",
                    )
                temporary.rename(destination)
            except subprocess.TimeoutExpired:
                raise SlimError("Clone exceeded the 120 second deadline", "clone_timeout") from None
            finally:
                shutil.rmtree(temporary, ignore_errors=True)
        return destination
