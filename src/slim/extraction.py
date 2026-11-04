"""Deterministic boundary rewriting and relocatable Python package generation."""

from __future__ import annotations

import ast
import copy
import hashlib
import json
import shutil
from pathlib import Path

from slim.analysis import Codebase, bound_names
from slim.errors import SlimError
from slim.models import Plan, PlanRequest


def dotted_name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = dotted_name(node.value)
        return f"{prefix}.{node.attr}" if prefix else ""
    return ""


def rewrite_entry(codebase: Codebase, request: PlanRequest) -> dict[tuple[str, int], ast.stmt]:
    if not request.boundaries:
        return {}
    module_name, name = request.entry.split(":")
    module = codebase.modules[module_name]
    indices = module.bindings[name]
    if len(indices) != 1:
        raise SlimError("Cannot adapt a multiply-defined entry")
    index = indices[0]
    node = copy.deepcopy(module.tree.body[index])
    if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
        raise SlimError("Boundary injection currently supports functions, not classes")
    if any(
        isinstance(child, ast.FunctionDef | ast.AsyncFunctionDef | ast.Lambda)
        for statement in node.body
        for child in ast.walk(statement)
    ):
        raise SlimError("Boundary injection into nested functions requires manual adaptation")
    used = {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}
    used.update(arg.arg for arg in node.args.posonlyargs + node.args.args + node.args.kwonlyargs)
    calls = {boundary.call: boundary for boundary in request.boundaries}
    if len(calls) != len(request.boundaries) or len(
        {b.parameter for b in request.boundaries}
    ) != len(calls):
        raise SlimError("Boundary calls and injected parameters must be unique")
    for boundary in request.boundaries:
        if boundary.parameter in used:
            raise SlimError(f"Parameter {boundary.parameter} already exists in the entry scope")
    counts = dict.fromkeys(calls, 0)

    class Inject(ast.NodeTransformer):
        def visit_Call(self, call: ast.Call) -> ast.AST:
            key = dotted_name(call.func)
            if key in calls:
                if call.args or call.keywords:
                    raise SlimError(
                        f"{key} takes arguments; use a manual adapter instead of value injection"
                    )
                counts[key] += 1
                return ast.copy_location(ast.Name(id=calls[key].parameter, ctx=ast.Load()), call)
            return self.generic_visit(call)

    node = Inject().visit(node)
    for boundary in request.boundaries:
        if not counts[boundary.call]:
            raise SlimError(f"Call {boundary.call} was not found in the entry function")
        node.args.kwonlyargs.append(ast.arg(arg=boundary.parameter))
        node.args.kw_defaults.append(None)
    ast.fix_missing_locations(node)
    return {(module_name, index): node}


class Relocate(ast.NodeTransformer):
    def __init__(self, package: str, modules: set[str]):
        self.package = package
        self.modules = modules

    def visit_ImportFrom(self, node: ast.ImportFrom) -> ast.AST:
        if node.level == 0 and node.module in self.modules:
            node.module = f"{self.package}.{node.module}"
        return node

    def visit_Import(self, node: ast.Import) -> list[ast.stmt]:
        statements: list[ast.stmt] = []
        for alias in node.names:
            if alias.name not in self.modules:
                statements.append(ast.Import(names=[alias]))
            elif alias.asname:
                statements.append(
                    ast.Import(
                        names=[ast.alias(name=f"{self.package}.{alias.name}", asname=alias.asname)]
                    )
                )
            else:
                if "." in alias.name:
                    statements.append(
                        ast.Import(names=[ast.alias(name=f"{self.package}.{alias.name}")])
                    )
                root = alias.name.split(".")[0]
                statements.append(
                    ast.ImportFrom(
                        module=self.package, names=[ast.alias(name=root, asname=root)], level=0
                    )
                )
        return statements


def build_package(codebase: Codebase, request: PlanRequest, plan: Plan, destination: Path) -> dict:
    """Create a complete package in a fresh directory; never alter the source tree."""
    overrides = rewrite_entry(codebase, request)
    selected, external, _, diagnostics = codebase.closure(request.entry, overrides)
    blockers = [d.message for d in diagnostics if d.level == "error"]
    if blockers:
        raise SlimError("; ".join(blockers), "unsupported_python")
    if destination.exists():
        raise SlimError("Artifact destination already exists", "artifact_exists")
    destination.mkdir(parents=True)
    package_root = destination / "src" / request.package_name
    package_root.mkdir(parents=True)
    retained: dict[str, list[int]] = {}
    for module_name, index in sorted(selected):
        retained.setdefault(module_name, []).append(index)
    file_records = []
    for module_name, indices in retained.items():
        module = codebase.modules[module_name]
        body: list[ast.stmt] = []
        # Future imports and module docstrings affect semantics and attribution.
        for statement in module.tree.body:
            if isinstance(statement, ast.ImportFrom) and statement.module == "__future__":
                body.append(copy.deepcopy(statement))
        if (
            module.tree.body
            and isinstance(module.tree.body[0], ast.Expr)
            and isinstance(module.tree.body[0].value, ast.Constant)
            and isinstance(module.tree.body[0].value.value, str)
        ):
            body.insert(0, copy.deepcopy(module.tree.body[0]))
        for index in indices:
            statement = selected[(module_name, index)]
            if isinstance(statement, ast.ImportFrom) and statement.module == "__future__":
                continue
            body.append(copy.deepcopy(statement))
        tree = ast.Module(body=body, type_ignores=[])
        tree = Relocate(request.package_name, set(codebase.modules)).visit(tree)
        ast.fix_missing_locations(tree)
        generated = (
            f"# Extracted by Slim from {module.path.relative_to(codebase.root)}\n# See PROVENANCE.json and LICENSES/ for source attribution.\n\n"
            + ast.unparse(tree)
            + "\n"
        )
        relative = Path(*module_name.split("."))
        relative = (
            relative / "__init__.py"
            if module.path.name == "__init__.py"
            else relative.with_suffix(".py")
        )
        output = package_root / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(generated)
        parent = output.parent
        while parent != package_root:
            (parent / "__init__.py").touch(exist_ok=True)
            parent = parent.parent
        file_records.append(
            {
                "source": str(module.path.relative_to(codebase.root)),
                "source_sha256": hashlib.sha256(module.source.encode()).hexdigest(),
                "generated": str(output.relative_to(destination)),
                "generated_sha256": hashlib.sha256(generated.encode()).hexdigest(),
                "source_ranges": [
                    [module.tree.body[i].lineno, module.tree.body[i].end_lineno] for i in indices
                ],
            }
        )
    entry_module, entry_name = request.entry.split(":")
    (package_root / "__init__.py").write_text(
        f'"""Extracted feature. See PROVENANCE.json for attribution."""\nfrom .{entry_module} import {entry_name} as {entry_name}\n\n__all__ = ["{entry_name}"]\n'
    )
    # Import names are not reliably distribution names. Require an explicit map
    # rather than silently publishing an incorrect dependency specification.
    dependencies = sorted(external)
    (destination / "pyproject.toml").write_text(
        '[build-system]\nrequires = ["setuptools>=75"]\nbuild-backend = "setuptools.build_meta"\n\n'
        f'[project]\nname = "{request.package_name.replace("_", "-")}"\nversion = "0.1.0"\nrequires-python = ">=3.12"\n'
        'description = "Python feature extracted with Slim"\n'
        'readme = "README.md"\nlicense-files = ["LICENSES/*"]\n'
        'dependencies = []\n\n[tool.setuptools.packages.find]\nwhere = ["src"]\n'
        f'\n[tool.setuptools.package-data]\n{request.package_name} = ["_slim/*.json"]\n'
    )
    license_dir = destination / "LICENSES"
    license_dir.mkdir()
    for name in plan.licenses:
        source = codebase.root / name
        if source.is_file() and not source.is_symlink():
            shutil.copyfile(source, license_dir / name)
    manifest = {
        "schema_version": 1,
        "entry": request.entry,
        "package": request.package_name,
        "source_commit": plan.source_commit,
        "files": file_records,
        "repository_url": plan.repository_url,
        "boundaries": [b.model_dump() for b in request.boundaries],
        "external_imports": dependencies,
        "dependency_resolution": "manual_required" if dependencies else "stdlib_only",
        "licenses": plan.licenses,
        "planner": plan.provider,
        "retained_symbols": sorted(
            f"{m}:{name}" for (m, _), node in selected.items() for name in bound_names(node)
        ),
        "removed_symbols": sorted(
            {symbol.id for symbol in plan.symbols}
            - {f"{m}:{name}" for (m, _), node in selected.items() for name in bound_names(node)}
        ),
        "generated_lines": sum(
            len(path.read_text().splitlines()) for path in package_root.rglob("*.py")
        ),
    }
    (destination / "PROVENANCE.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (destination / "scenarios.json").write_text(
        json.dumps([s.model_dump() for s in request.scenarios], indent=2) + "\n"
    )
    metadata_dir = package_root / "_slim"
    metadata_dir.mkdir()
    for filename in ("PROVENANCE.json", "scenarios.json"):
        shutil.copyfile(destination / filename, metadata_dir / filename)
    (destination / "README.md").write_text(
        f"# {request.package_name}\n\nExtracted from `{request.entry}` with Slim.\n\n"
        f"```python\nfrom {request.package_name} import {entry_name}\n```\n\n"
        "Install with `pip install .` (or `uv pip install .`). See PROVENANCE.json for hashes,\n"
        "source ranges, boundary adaptations, and license files in LICENSES/.\n\n"
        f"External imports requiring manual dependency mapping: {', '.join(dependencies) or 'none'}.\n"
        "Generated dependencies are intentionally empty until reviewed; import names may differ from distribution names.\n\n"
        "Validation evidence covers only scenarios in scenarios.json, not all possible inputs.\n"
    )
    return manifest
