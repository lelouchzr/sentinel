from pathlib import Path

import pytest

from slim.analysis import Codebase
from slim.demo import demo_request
from slim.errors import SlimError
from slim.extraction import build_package
from slim.models import PlanRequest

ROOT = Path(__file__).resolve().parents[1]


def test_transitive_closure_and_boundary_removal(tmp_path):
    request = demo_request(ROOT)
    codebase = Codebase(Path(request.source))
    plan = codebase.plan(request)
    ids = {s.id for s in plan.symbols}
    assert "commerce.money:round_money" in ids
    assert "commerce.shipping:MAX_WEIGHT" in ids
    assert not any("payments" in s for s in ids)
    package = tmp_path / "feature"
    manifest = build_package(codebase, request, plan, package)
    generated = (package / "src/shipping_core/commerce/shipping.py").read_text()
    assert "shipping_rules" in generated
    assert "db.load_shipping_rules" not in generated
    assert not (package / "src/shipping_core/commerce/db.py").exists()
    assert manifest["external_imports"] == []
    assert (package / "LICENSES/LICENSE").exists()
    compile(generated, "candidate.py", "exec")


def test_analysis_does_not_execute_source(tmp_path):
    (tmp_path / "danger.py").write_text('raise RuntimeError("must not execute")\ndef safe(x):\n return x + 1\n')
    codebase = Codebase(tmp_path)
    assert codebase.search("safe")[0].name == "safe"
    assert codebase.plan(PlanRequest(source=str(tmp_path), entry="danger:safe")).selected_lines == 2


def test_local_shadowing_does_not_capture_global(tmp_path):
    (tmp_path / "app.py").write_text("value = 123\ndef f(value):\n return value + 1\n")
    plan = Codebase(tmp_path).plan(PlanRequest(source=str(tmp_path), entry="app:f"))
    assert {s.name for s in plan.symbols} == {"f"}


def test_syntax_errors_and_symlinks_are_reported(tmp_path):
    (tmp_path / "bad.py").write_text("def :\n")
    (tmp_path / "good.py").write_text("def f(): return 1\n")
    (tmp_path / "link.py").symlink_to(tmp_path / "good.py")
    codebase = Codebase(tmp_path)
    assert any(d.code == "parse_error" for d in codebase.diagnostics)
    assert "link" not in codebase.modules


def test_bad_boundary_is_rejected(tmp_path):
    request = demo_request(ROOT)
    request.boundaries[0].call = "db.missing"
    codebase = Codebase(Path(request.source))
    with pytest.raises(SlimError, match="not found"):
        build_package(codebase, request, codebase.plan(request), tmp_path / "out")


def test_dynamic_code_is_not_silently_extracted(tmp_path):
    (tmp_path / "app.py").write_text('def f(x): return eval(x)\n')
    request = PlanRequest(source=str(tmp_path), entry="app:f")
    codebase = Codebase(tmp_path)
    with pytest.raises(SlimError, match="Dynamic"):
        build_package(codebase, request, codebase.plan(request), tmp_path / "out")
