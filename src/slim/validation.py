"""Bounded execution and honest per-scenario behavioral comparison."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from uuid import uuid4

from slim.errors import SlimError
from slim.models import CaseResult, Outcome, PlanRequest, ValidationReport

WORKER = Path(__file__).with_name("worker.py")
OUTPUT_LIMIT = 256_000


class Runner:
    def __init__(self, mode: str = "local", timeout: float = 5.0):
        if mode not in {"local", "docker"}:
            raise SlimError(f"Unknown runner: {mode}")
        self.mode = mode
        self.timeout = timeout

    def run(
        self,
        root: Path,
        entry: str,
        args: list,
        kwargs: dict,
        setup: dict,
        *,
        method: str | None = None,
        method_args: list | None = None,
        method_kwargs: dict | None = None,
    ) -> Outcome:
        paths = [str(root / "src"), str(root)]
        command = [sys.executable, "-I", str(WORKER)]
        container_name = f"slim-{uuid4().hex}"
        if self.mode == "docker":
            paths = ["/source/src", "/source"]
            command = [
                "docker",
                "run",
                "--rm",
                "--name",
                container_name,
                "-i",
                "--network=none",
                "--read-only",
                "--cap-drop=ALL",
                "--security-opt=no-new-privileges",
                "--pids-limit=32",
                "--memory=512m",
                "--cpus=1",
                "--user=65534:65534",
                "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
                "--ulimit",
                "fsize=1048576:1048576",
                "-v",
                f"{root.resolve()}:/source:ro",
                "-v",
                f"{WORKER}:/worker.py:ro",
                "python:3.12-slim",
                "python",
                "-I",
                "/worker.py",
            ]
        payload = json.dumps(
            {
                "paths": paths,
                "entry": entry,
                "args": args,
                "kwargs": kwargs,
                "setup": setup,
                "method": method,
                "method_args": method_args or [],
                "method_kwargs": method_kwargs or {},
            }
        ).encode()
        # No inherited API keys, cloud credentials, or Python path configuration.
        env = {
            key: os.environ[key]
            for key in ("PATH", "SYSTEMROOT", "DOCKER_HOST")
            if key in os.environ
        }
        env.update({"PYTHONHASHSEED": "0", "PYTHONDONTWRITEBYTECODE": "1", "LANG": "C.UTF-8"})
        started = time.monotonic()
        with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
            try:
                process = subprocess.Popen(
                    command,
                    stdin=subprocess.PIPE,
                    stdout=stdout,
                    stderr=stderr,
                    cwd=tempfile.gettempdir(),
                    env=env,
                    start_new_session=True,
                )
                process.stdin.write(payload)
                process.stdin.close()
                while process.poll() is None:
                    if time.monotonic() - started > self.timeout:
                        self._kill(process)
                        self._remove_container(container_name, env)
                        return Outcome(
                            status="timeout", message=f"Exceeded {self.timeout:g}s deadline"
                        )
                    if stdout.tell() + stderr.tell() > OUTPUT_LIMIT:
                        self._kill(process)
                        self._remove_container(container_name, env)
                        return Outcome(status="error", message="Worker exceeded output limit")
                    time.sleep(0.02)
            except (OSError, BrokenPipeError) as exc:
                return Outcome(status="error", message=f"Runner unavailable: {exc}")
            stdout.seek(0)
            stderr.seek(0)
            output = stdout.read(OUTPUT_LIMIT)
            error = stderr.read(2000).decode(errors="replace")
            if process.returncode:
                return Outcome(
                    status="error", message=f"Worker exited {process.returncode}: {error}"
                )
            try:
                return Outcome.model_validate_json(output)
            except ValueError:
                return Outcome(status="error", message="Worker did not return a valid result")

    def _remove_container(self, name: str, env: dict) -> None:
        if self.mode == "docker":
            try:
                subprocess.run(
                    ["docker", "rm", "-f", name], env=env, capture_output=True, timeout=5
                )
            except (OSError, subprocess.TimeoutExpired):
                pass

    @staticmethod
    def _kill(process: subprocess.Popen) -> None:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=2)


def compare(original: Outcome, candidate: Outcome) -> str:
    if original.status in {"timeout", "error"} or candidate.status in {"timeout", "error"}:
        return "unverified"
    if original.status != candidate.status:
        return "diverged"
    if original.status == "raised":
        return (
            "matched"
            if (original.exception, original.message) == (candidate.exception, candidate.message)
            else "diverged"
        )
    return "matched" if original.value == candidate.value else "diverged"


def validate(request: PlanRequest, artifact: Path, runner: Runner) -> ValidationReport:
    cases = []
    for scenario in request.scenarios:
        original = runner.run(
            Path(request.source),
            request.entry,
            scenario.args,
            scenario.kwargs,
            scenario.setup,
            method=scenario.method,
            method_args=scenario.method_args,
            method_kwargs=scenario.method_kwargs,
        )
        kwargs = {**scenario.kwargs, **scenario.candidate_kwargs}
        candidate = runner.run(
            artifact,
            f"{request.package_name}:{request.entry.split(':')[1]}",
            scenario.args,
            kwargs,
            {},
            method=scenario.method,
            method_args=scenario.method_args,
            method_kwargs=scenario.method_kwargs,
        )
        cases.append(
            CaseResult(
                name=scenario.name,
                status=compare(original, candidate),
                original=original,
                candidate=candidate,
            )
        )
    matched = sum(case.status == "matched" for case in cases)
    diverged = sum(case.status == "diverged" for case in cases)
    unverified = sum(case.status == "unverified" for case in cases)
    status = "diverged" if diverged else "unverified" if unverified or not cases else "matched"
    return ValidationReport(
        status=status,
        cases=cases,
        matched=matched,
        diverged=diverged,
        unverified=unverified,
        runner=runner.mode,
    )
