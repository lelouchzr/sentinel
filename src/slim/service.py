"""One orchestration layer shared by HTTP and CLI; durable, guarded transitions."""

import hashlib
import os
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from slim.analysis import Codebase
from slim.config import Settings
from slim.demo import demo_request
from slim.errors import SlimError
from slim.extraction import build_package
from slim.models import Plan, PlanRequest
from slim.providers import LlamaPlanner
from slim.repository import Repositories
from slim.store import Store
from slim.validation import Runner, validate


def source_hash(codebase: Codebase) -> str:
    digest = hashlib.sha256()
    for name, module in sorted(codebase.modules.items()):
        digest.update(name.encode() + b"\0" + module.source.encode() + b"\0")
    return digest.hexdigest()


def artifact_hash(directory: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(directory.rglob("*")):
        if path.is_file() and path.name != "validation.json" and "__pycache__" not in path.parts:
            digest.update(str(path.relative_to(directory)).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


class ExtractionService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.repositories = Repositories(settings)
        self.store = Store(settings.data_dir)
        self.store.recover()
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="slim")
        self.capacity = threading.BoundedSemaphore(4)

    def codebase(self, source: str) -> Codebase:
        return Codebase(
            self.repositories.resolve(source), self.settings.max_files, self.settings.max_file_bytes
        )

    def create_plan(self, request: PlanRequest) -> dict:
        codebase = self.codebase(request.source)
        # Persist the resolved source so a moving URL cannot silently change inputs.
        request = request.model_copy(update={"source": str(codebase.root)})
        plan = codebase.plan(request)
        fingerprint = source_hash(codebase)
        if request.advice_id:
            advice = self.store.get_advice(request.advice_id, fingerprint)
            if advice["entry_id"] != request.entry:
                raise SlimError("Model advice belongs to another entry point")
            plan.provider = f"Meta Llama / {advice['model']}"
            plan.advice = advice["explanation"]
        return self.store.create(request.model_dump(), plan.model_dump(), fingerprint)

    def artifact(self, job_id: str) -> Path:
        self.store.get(job_id)
        return self.settings.data_dir / "artifacts" / job_id

    def submit(self, job_id: str, operation: str) -> dict:
        if operation not in {"extract", "validate"}:
            raise SlimError("Unknown operation")
        if not self.capacity.acquire(blocking=False):
            raise SlimError("Worker queue is full. Try again shortly.", "queue_full")
        try:
            self._begin(job_id, operation)
        except BaseException:
            self.capacity.release()
            raise

        def work():
            try:
                self._perform(job_id, operation)
            except Exception as exc:
                self._fail(job_id, operation, exc)
            finally:
                self.capacity.release()

        self.executor.submit(work)
        return self.store.get(job_id)

    def run_sync(self, job_id: str, operation: str) -> dict:
        self._begin(job_id, operation)
        try:
            self._perform(job_id, operation)
        except Exception as exc:
            self._fail(job_id, operation, exc)
            raise
        return self.store.get(job_id)

    def _begin(self, job_id: str, operation: str) -> None:
        job = self.store.get(job_id)
        if operation == "validate":
            trusted = (
                Path(job["request"]["source"]).resolve()
                == Path(demo_request(self.settings.workspace).source).resolve()
            )
            if self.settings.runner == "local" and not (self.settings.allow_execution or trusted):
                raise SlimError(
                    "Local execution is disabled for this source. Set SLIM_ALLOW_EXECUTION=1 for trusted code, or use SLIM_RUNNER=docker.",
                    "execution_disabled",
                )
        allowed = {"planned"} if operation == "extract" else {"extracted", "completed"}
        self.store.transition(
            job_id,
            allowed,
            "extracting" if operation == "extract" else "validating",
            "Building the dependency slice"
            if operation == "extract"
            else "Running original and candidate in fresh processes",
            owner_pid=os.getpid(),
        )

    def _perform(self, job_id: str, operation: str) -> None:
        job = self.store.get(job_id)
        request = PlanRequest.model_validate(job["request"])
        codebase = self.codebase(request.source)
        if source_hash(codebase) != job["source_hash"]:
            raise SlimError(
                "Source changed after review. Create a new plan before proceeding.",
                "source_changed",
            )
        destination = self.artifact(job_id)
        if operation == "extract":
            staging = destination.with_name(job_id + ".partial")
            shutil.rmtree(staging, ignore_errors=True)
            try:
                manifest = build_package(
                    codebase, request, Plan.model_validate(job["plan"]), staging
                )
                staging.rename(destination)
            finally:
                shutil.rmtree(staging, ignore_errors=True)
            self.store.transition(
                job_id,
                {"extracting"},
                "extracted",
                "Package generated with provenance and upstream licenses",
                manifest=manifest,
                artifact_hash=artifact_hash(destination),
                owner_pid=None,
            )
        else:
            if artifact_hash(destination) != job["artifact_hash"]:
                raise SlimError(
                    "Generated artifact changed. Build a new extraction before validation.",
                    "artifact_changed",
                )
            report = validate(
                request, destination, Runner(self.settings.runner, self.settings.case_timeout)
            )
            (destination / "validation.json").write_text(report.model_dump_json(indent=2) + "\n")
            self.store.transition(
                job_id,
                {"validating"},
                "completed",
                f"{report.matched} matched, {report.diverged} diverged, {report.unverified} unverified",
                report=report.model_dump(),
                owner_pid=None,
            )

    def _fail(self, job_id: str, operation: str, exc: Exception) -> None:
        message = (
            str(exc)
            if isinstance(exc, SlimError)
            else f"Operation failed ({type(exc).__name__}). Check the server log."
        )
        self.store.transition(
            job_id, {"extracting", "validating"}, "failed", message, error=message, owner_pid=None
        )

    def advise(self, source: str, query: str) -> dict:
        codebase = self.codebase(source)
        symbols = codebase.search(query, limit=20)
        if not symbols:
            symbols = codebase.search(limit=20)
        excerpts = []
        for symbol in symbols[:5]:
            module = codebase.modules[symbol.module]
            excerpts.append(
                f"# {symbol.id}\n"
                + "\n".join(module.source.splitlines()[symbol.line - 1 : symbol.end_line])
            )
        advice = LlamaPlanner(self.settings).advise(query, symbols, "\n\n".join(excerpts))
        return self.store.save_advice(
            source_hash(codebase),
            {"provider": "Meta Llama", "model": self.settings.model, **advice.model_dump()},
        )

    def archive(self, job_id: str) -> Path:
        job = self.store.get(job_id)
        if job["status"] not in {"extracted", "completed"}:
            raise SlimError("Extract the package before downloading it", "state_conflict")
        destination = self.artifact(job_id)
        if artifact_hash(destination) != job["artifact_hash"]:
            raise SlimError("Artifact integrity check failed", "artifact_changed")
        archive_dir = self.settings.data_dir / "downloads"
        archive_dir.mkdir(exist_ok=True)
        target = archive_dir / job_id
        shutil.make_archive(str(target), "zip", destination)
        return target.with_suffix(".zip")

    def close(self) -> None:
        self.executor.shutdown(wait=True, cancel_futures=True)
