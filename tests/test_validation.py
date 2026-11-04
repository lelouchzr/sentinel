from pathlib import Path

from slim.analysis import Codebase
from slim.demo import demo_request
from slim.extraction import build_package
from slim.models import Outcome
from slim.validation import Runner, compare, validate

ROOT = Path(__file__).resolve().parents[1]


def test_original_and_decoupled_package_match_all_demo_cases(tmp_path):
    request = demo_request(ROOT)
    codebase = Codebase(Path(request.source))
    artifact = tmp_path / "artifact"
    build_package(codebase, request, codebase.plan(request), artifact)
    report = validate(request, artifact, Runner())
    assert report.matched == 10, report.model_dump()
    assert report.diverged == report.unverified == 0
    assert report.cases[-1].original.status == "raised"


def test_mutation_produces_a_real_divergence(tmp_path):
    request = demo_request(ROOT)
    codebase = Codebase(Path(request.source))
    artifact = tmp_path / "artifact"
    build_package(codebase, request, codebase.plan(request), artifact)
    path = artifact / "src/shipping_core/commerce/shipping.py"
    path.write_text(path.read_text().replace("return 0.0", "return 99.0"))
    report = validate(request, artifact, Runner())
    assert report.diverged == 1
    assert report.status == "diverged"


def test_timeout_and_import_error_are_unverified(tmp_path):
    (tmp_path / "app.py").write_text("def f():\n while True: pass\n")
    outcome = Runner(timeout=0.2).run(tmp_path, "app:f", [], {}, {})
    assert outcome.status == "timeout"
    missing = Runner().run(tmp_path, "missing:f", [], {}, {})
    assert missing.status == "error"
    assert compare(missing, missing) == "unverified"


def test_bytes_and_async_results_are_normalized(tmp_path):
    (tmp_path / "app.py").write_text("async def f(x): return (x, {1, 2})\n")
    outcome = Runner().run(tmp_path, "app:f", [{"$bytes": "ff00"}], {}, {})
    assert outcome.status == "returned"
    assert outcome.value["type"] == "tuple"
    assert outcome.value["value"][0] == {"type": "bytes", "value": "ff00"}


def test_equal_errors_never_count_as_verified():
    assert (
        compare(
            Outcome(status="error", message="missing"), Outcome(status="error", message="missing")
        )
        == "unverified"
    )
    assert (
        compare(
            Outcome(status="raised", exception="ValueError", message="x"),
            Outcome(status="raised", exception="ValueError", message="y"),
        )
        == "diverged"
    )


def test_class_methods_can_be_compared(tmp_path):
    from slim.models import PlanRequest, Scenario

    source = tmp_path / "source"
    source.mkdir()
    (source / "pricing.py").write_text(
        "class Price:\n def __init__(self, amount): self.amount = amount\n def total(self, tax): return round(self.amount * (1 + tax), 2)\n"
    )
    request = PlanRequest(
        source=str(source),
        entry="pricing:Price",
        scenarios=[Scenario(name="tax calculation", args=[100], method="total", method_args=[0.2])],
    )
    codebase = Codebase(source)
    artifact = tmp_path / "artifact"
    build_package(codebase, request, codebase.plan(request), artifact)
    assert validate(request, artifact, Runner()).matched == 1
