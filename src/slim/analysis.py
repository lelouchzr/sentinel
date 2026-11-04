"""Conservative Python dependency analysis. Source code is parsed, never imported."""

from __future__ import annotations

import ast
import builtins
import copy
import importlib.util
import re
import subprocess
import symtable
import sys
import tokenize
from dataclasses import dataclass, field
from pathlib import Path

from slim.errors import SlimError
from slim.models import Diagnostic, Plan, PlanRequest, Symbol

IGNORED = {".git", ".venv", "venv", "node_modules", "__pycache__", ".slim", "dist", "build"}


def bound_names(node: ast.AST) -> set[str]:
    """Names bound by a module statement, excluding inner function/class scopes."""
    if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
        return {node.name}
    if isinstance(node, ast.Import):
        return {alias.asname or alias.name.split(".")[0] for alias in node.names}
    if isinstance(node, ast.ImportFrom):
        return {alias.asname or alias.name for alias in node.names}
    names: set[str] = set()
    for child in ast.iter_child_nodes(node):
        if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Store):
            names.add(child.id)
        elif not isinstance(child, ast.expr):
            names.update(bound_names(child))
        elif isinstance(child, ast.Tuple | ast.List):
            names.update(n.id for n in ast.walk(child) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store))
    return names


def global_references(node: ast.AST) -> set[str]:
    """Use Python's scope rules so a local variable cannot drag in a global."""
    table = symtable.symtable(ast.unparse(node), "<analysis>", "exec")
    names: set[str] = set()

    def collect(scope: symtable.SymbolTable) -> None:
        for symbol in scope.get_symbols():
            if symbol.is_referenced() and (scope.get_type() == "module" or symbol.is_global()):
                names.add(symbol.get_name())
        for child in scope.get_children():
            collect(child)

    collect(table)
    # Annotation scopes differ between supported Python versions. Keeping extra
    # annotation names is conservative and avoids removing imported type aliases.
    for child in ast.walk(node):
        if isinstance(child, ast.arg) and child.annotation:
            names.update(n.id for n in ast.walk(child.annotation) if isinstance(n, ast.Name))
    return names


@dataclass
class Module:
    name: str
    path: Path
    source: str
    tree: ast.Module
    bindings: dict[str, list[int]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for index, statement in enumerate(self.tree.body):
            for name in bound_names(statement):
                self.bindings.setdefault(name, []).append(index)

    def symbol(self, name: str) -> Symbol:
        node = self.tree.body[self.bindings[name][0]]
        kind = "function" if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) else "class" if isinstance(node, ast.ClassDef) else "import" if isinstance(node, ast.Import | ast.ImportFrom) else "constant"
        signature = ""
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            signature = f"{node.name}({ast.unparse(node.args)})"
        return Symbol(
            id=f"{self.name}:{name}", name=name, module=self.name,
            path=str(self.path), line=node.lineno, end_line=node.end_lineno or node.lineno,
            kind=kind, signature=signature,
            docstring=(ast.get_docstring(node) or "") if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef) else "",
        )


class Codebase:
    def __init__(self, root: Path, max_files: int = 10_000, max_bytes: int = 1_000_000):
        self.root = root.resolve()
        self.modules: dict[str, Module] = {}
        self.diagnostics: list[Diagnostic] = []
        self.total_lines = 0
        paths = sorted(p for p in self.root.rglob("*.py") if not any(part in IGNORED for part in p.relative_to(self.root).parts))
        if len(paths) > max_files:
            raise SlimError(f"Repository exceeds {max_files} Python files", "repository_too_large")
        source_root = self.root / "src" if (self.root / "src").is_dir() else self.root
        for path in paths:
            if path.is_symlink() or not path.resolve().is_relative_to(self.root):
                continue
            if path.stat().st_size > max_bytes:
                self.diagnostics.append(Diagnostic(level="warning", code="file_too_large", message=f"Skipped {path.relative_to(self.root)}"))
                continue
            try:
                with tokenize.open(path) as handle:
                    source = handle.read()
                tree = ast.parse(source, filename=str(path))
            except (SyntaxError, UnicodeError, OSError) as exc:
                self.diagnostics.append(Diagnostic(level="warning", code="parse_error", message=f"{path.relative_to(self.root)}: {exc}"))
                continue
            relative = path.relative_to(source_root) if path.is_relative_to(source_root) else path.relative_to(self.root)
            parts = list(relative.with_suffix("").parts)
            if parts[-1] == "__init__":
                parts.pop()
            name = ".".join(parts)
            if not name:
                continue
            self.modules[name] = Module(name, path, source, tree)
            self.total_lines += len(source.splitlines())
        if not self.modules:
            raise SlimError("No parseable Python modules found", "no_python")

    def search(self, query: str = "", limit: int = 100) -> list[Symbol]:
        tokens = re.findall(r"[a-z0-9_]+", query.lower())
        results: list[tuple[int, Symbol]] = []
        for module in self.modules.values():
            for name in module.bindings:
                symbol = module.symbol(name)
                if symbol.kind not in {"function", "class"} or name.startswith("_"):
                    continue
                text = f"{symbol.id} {symbol.docstring}".lower()
                score = sum(1 + (4 if token in name.lower() else 0) for token in tokens if token in text)
                if not tokens or score:
                    results.append((score, symbol))
        return [s for _, s in sorted(results, key=lambda item: (-item[0], item[1].id))[:limit]]

    def resolve_from(self, module: Module, node: ast.ImportFrom) -> str:
        if not node.level:
            return node.module or ""
        package = module.name if module.path.name == "__init__.py" else module.name.rpartition(".")[0]
        try:
            return importlib.util.resolve_name("." * node.level + (node.module or ""), package)
        except (ImportError, ValueError):
            raise SlimError(f"Cannot resolve relative import in {module.name}") from None

    def closure(self, entry: str, overrides: dict[tuple[str, int], ast.stmt] | None = None) -> tuple[dict[tuple[str, int], ast.stmt], set[str], list[tuple[str, str]], list[Diagnostic]]:
        module_name, separator, name = entry.partition(":")
        if not separator or module_name not in self.modules or name not in self.modules[module_name].bindings:
            raise SlimError(f"Unknown entry {entry}. Select module:function from analysis.", "unknown_symbol")
        selected: dict[tuple[str, int], ast.stmt] = {}
        visited: set[tuple[str, str]] = set()
        external: set[str] = set()
        edges: set[tuple[str, str]] = set()
        diagnostics: list[Diagnostic] = []
        pending = [(module_name, name)]
        overrides = overrides or {}
        while pending:
            current_module, current_name = pending.pop()
            if (current_module, current_name) in visited:
                continue
            visited.add((current_module, current_name))
            module = self.modules[current_module]
            for index in module.bindings.get(current_name, []):
                key = (current_module, index)
                node = overrides.get(key, module.tree.body[index])
                if isinstance(node, ast.Import | ast.ImportFrom):
                    node = copy.deepcopy(node)
                    node.names = [alias for alias in node.names if (alias.asname or (alias.name.split('.')[0] if isinstance(node, ast.Import) else alias.name)) == current_name]
                    previous = selected.get(key)
                    if isinstance(previous, ast.Import | ast.ImportFrom):
                        existing = {alias.asname or alias.name for alias in previous.names}
                        merged = copy.deepcopy(previous)
                        merged.names.extend(alias for alias in node.names if (alias.asname or alias.name) not in existing)
                        selected[key] = merged
                    else:
                        selected[key] = node
                elif key in selected:
                    continue
                else:
                    selected[key] = node
                refs = global_references(node)
                missing = refs - module.bindings.keys() - set(vars(builtins)) - {"__name__", "__file__", "__package__", "__doc__", "__annotations__"}
                for ref in sorted(missing):
                    diagnostics.append(Diagnostic(level="error", code="unresolved_global", message=f"Unresolved global {ref} in {current_module}:{current_name}", symbol=f"{current_module}:{current_name}"))
                if "__file__" in refs:
                    diagnostics.append(Diagnostic(level="error", code="file_resource", message=f"{current_module}:{current_name} depends on its original file location; resource relocation requires manual adaptation"))
                for ref in sorted(refs & module.bindings.keys()):
                    if ref != current_name:
                        edges.add((f"{current_module}:{current_name}", f"{current_module}:{ref}"))
                        pending.append((current_module, ref))
                for imported in ast.walk(node):
                    if isinstance(imported, ast.ImportFrom):
                        target = self.resolve_from(module, imported)
                        if target == "__future__":
                            continue
                        for alias in imported.names:
                            if alias.name == "*":
                                diagnostics.append(Diagnostic(level="error", code="star_import", message=f"Wildcard import in {current_module} cannot be sliced safely"))
                            elif target in self.modules and alias.name in self.modules[target].bindings:
                                pending.append((target, alias.name))
                                edges.add((f"{current_module}:{current_name}", f"{target}:{alias.name}"))
                            elif f"{target}.{alias.name}" in self.modules:
                                self._include_module(f"{target}.{alias.name}", pending)
                            elif target not in self.modules and target.split(".")[0] not in sys.stdlib_module_names:
                                external.add(target.split(".")[0])
                            elif target in self.modules:
                                diagnostics.append(Diagnostic(level="error", code="unresolved_import", message=f"Cannot resolve {target}:{alias.name}"))
                    elif isinstance(imported, ast.Import):
                        for alias in imported.names:
                            if alias.name in self.modules:
                                self._include_module(alias.name, pending)
                                diagnostics.append(Diagnostic(level="warning", code="module_import", message=f"Retained all declarations of imported module {alias.name}"))
                            elif alias.name.split(".")[0] not in sys.stdlib_module_names:
                                external.add(alias.name.split(".")[0])
                if any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in {"eval", "exec", "__import__", "globals"} for n in ast.walk(node)):
                    diagnostics.append(Diagnostic(level="error", code="dynamic_code", message=f"Dynamic lookup or execution in {current_module}:{current_name} requires manual extraction"))
                if isinstance(node, ast.If | ast.Try | ast.With | ast.For | ast.While):
                    diagnostics.append(Diagnostic(level="warning", code="compound_statement", message=f"Retained complete conditional/compound declaration in {current_module}"))
        for module_name in {m for m, _ in selected}:
            module = self.modules[module_name]
            omitted = [statement.lineno for index, statement in enumerate(module.tree.body) if (module_name, index) not in selected and not isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef | ast.Import | ast.ImportFrom) and not bound_names(statement) and not (isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Constant))]
            if omitted:
                diagnostics.append(Diagnostic(level="warning", code="omitted_initialization", message=f"Top-level effects at {module_name} lines {omitted[:10]} are omitted. Review initialization and supply representative scenarios."))
        return selected, external, sorted(edges), diagnostics

    def _include_module(self, name: str, pending: list[tuple[str, str]]) -> None:
        pending.extend((name, binding) for binding in self.modules[name].bindings)

    def plan(self, request: PlanRequest) -> Plan:
        selected, external, edges, diagnostics = self.closure(request.entry)
        module_name, name = request.entry.split(":")
        entry = self.modules[module_name].symbol(name)
        if entry.kind not in {"function", "class"}:
            raise SlimError("Entry must be a module-level function or class")
        symbols: dict[str, Symbol] = {}
        for module_name, index in sorted(selected):
            module = self.modules[module_name]
            for binding in sorted(bound_names(selected[(module_name, index)])):
                symbol = module.symbol(binding)
                symbol.path = str(module.path.relative_to(self.root))
                symbol.dependencies = [b for a, b in edges if a == symbol.id]
                symbols[symbol.id] = symbol
        entry.path = str(self.modules[entry.module].path.relative_to(self.root))
        try:
            commit = subprocess.run(["git", "-C", str(self.root), "rev-parse", "HEAD"], capture_output=True, text=True, timeout=3).stdout.strip() or None
        except (OSError, subprocess.TimeoutExpired):
            commit = None
        licenses = sorted(p.name for p in self.root.iterdir() if p.is_file() and p.name.upper().startswith(("LICENSE", "COPYING", "NOTICE")))
        repository_url = None
        if (self.root / ".git").exists():
            try:
                repository_url = subprocess.run(["git", "-C", str(self.root), "config", "--get", "remote.origin.url"], capture_output=True, text=True, timeout=3).stdout.strip() or None
            except (OSError, subprocess.TimeoutExpired):
                pass
        if not licenses:
            diagnostics.append(Diagnostic(level="warning", code="no_license", message="No root license found. Verify reuse rights before distributing."))
        return Plan(
            source=str(self.root), entry=entry, package_name=request.package_name,
            symbols=list(symbols.values()), edges=edges, external_dependencies=sorted(external),
            diagnostics=diagnostics, boundaries=request.boundaries,
            original_lines=self.total_lines,
            selected_lines=sum((self.modules[m].tree.body[i].end_lineno or 0) - self.modules[m].tree.body[i].lineno + 1 for m, i in selected),
            source_files=len(self.modules), source_commit=commit, licenses=licenses,
            repository_url=repository_url,
            source_name=(repository_url.rsplit('/', 1)[-1].removesuffix('.git') if repository_url else self.root.name),
        )
