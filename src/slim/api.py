"""Loopback-only HTTP interface for the Slim workbench."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from slim import __version__
from slim.catalog import SPECS
from slim.config import Settings
from slim.demo import demo_request
from slim.errors import SlimError
from slim.models import AnalyzeRequest, PlanRequest
from slim.service import ExtractionService

ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    service = ExtractionService(settings)

    @asynccontextmanager
    async def lifespan(app):
        yield
        service.close()

    app = FastAPI(title="Slim", version=__version__, lifespan=lifespan)
    app.state.service = service
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(ORIGINS),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def local_boundary(request: Request, call_next):
        if request.headers.get("origin") and request.headers["origin"] not in ORIGINS:
            return JSONResponse(
                {"error": "origin_forbidden", "message": "Use the local Slim workbench"},
                status_code=403,
            )
        try:
            if int(request.headers.get("content-length", "0")) > 512_000:
                return JSONResponse(
                    {"error": "request_too_large", "message": "Request exceeds 512 KB"},
                    status_code=413,
                )
        except ValueError:
            return JSONResponse(
                {"error": "invalid_length", "message": "Invalid content length"}, status_code=400
            )
        return await call_next(request)

    @app.exception_handler(SlimError)
    async def slim_error(request, exc: SlimError):
        status = (
            404
            if exc.code == "not_found"
            else 409
            if exc.code in {"state_conflict", "source_changed", "artifact_changed"}
            else 403
            if exc.code in {"path_forbidden", "execution_disabled"}
            else 400
        )
        return JSONResponse({"error": exc.code, "message": str(exc)}, status_code=status)

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "version": __version__,
            "model_enabled": settings.model_enabled,
            "model": settings.model,
            "runner": settings.runner,
            "execution_enabled": settings.allow_execution,
            "workspace": str(settings.workspace),
        }

    @app.get("/api/demo")
    def demo():
        return demo_request(settings.workspace)

    @app.get("/api/catalog")
    def catalog():
        return [
            {
                "name": name,
                "spec": PlanRequest(
                    source=url, entry=entry, package_name=package, scenarios=scenarios
                ).model_dump(),
            }
            for name, url, entry, package, scenarios in SPECS
        ]

    @app.post("/api/analyze")
    def analyze(request: AnalyzeRequest):
        codebase = service.codebase(request.source)
        return {
            "source": str(codebase.root),
            "files": len(codebase.modules),
            "lines": codebase.total_lines,
            "symbols": codebase.search(request.query),
            "diagnostics": codebase.diagnostics,
        }

    @app.post("/api/advise")
    def advise(request: AnalyzeRequest):
        return service.advise(request.source, request.query)

    @app.post("/api/plans", status_code=201)
    def plan(request: PlanRequest):
        return service.create_plan(request)

    @app.get("/api/jobs")
    def jobs():
        return service.store.list()

    @app.get("/api/jobs/{job_id}")
    def job(job_id: str):
        return service.store.get(job_id)

    @app.post("/api/jobs/{job_id}/extract", status_code=202)
    def extract(job_id: str):
        return service.submit(job_id, "extract")

    @app.post("/api/jobs/{job_id}/validate", status_code=202)
    def validate(job_id: str):
        return service.submit(job_id, "validate")

    @app.get("/api/jobs/{job_id}/download")
    def download(job_id: str):
        return FileResponse(
            service.archive(job_id), filename=f"slim-{job_id[:8]}.zip", media_type="application/zip"
        )

    @app.get("/api/jobs/{job_id}/files")
    def files(job_id: str):
        record = service.store.get(job_id)
        root = service.artifact(job_id)
        generated = (
            [
                str(path.relative_to(root))
                for path in sorted(root.rglob("*"))
                if path.is_file() and "__pycache__" not in path.parts
            ]
            if root.is_dir()
            else []
        )
        return {
            "source": sorted({s["path"] for s in record["plan"]["symbols"]}),
            "generated": generated,
        }

    @app.get("/api/jobs/{job_id}/file")
    def file(job_id: str, path: str, side: str = "generated"):
        record = service.store.get(job_id)
        if side not in {"source", "generated"}:
            raise SlimError("Choose source or generated side")
        root = Path(record["request"]["source"]) if side == "source" else service.artifact(job_id)
        target = (root / path).resolve()
        if (
            not target.is_relative_to(root.resolve())
            or not target.is_file()
            or target.stat().st_size > 1_000_000
        ):
            raise SlimError("File is unavailable or outside this extraction", "path_forbidden")
        try:
            return {"path": path, "content": target.read_text()}
        except (UnicodeError, OSError):
            raise SlimError("File is not readable text") from None

    return app
