"""Versioned contracts for analysis, extraction, and observable evidence."""

import keyword
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Symbol(Contract):
    id: str
    name: str
    module: str
    path: str
    line: int
    end_line: int
    kind: Literal["function", "class", "constant", "import"]
    signature: str = ""
    docstring: str = ""
    dependencies: list[str] = Field(default_factory=list)


class Diagnostic(Contract):
    level: Literal["info", "warning", "error"]
    code: str
    message: str
    symbol: str | None = None


class Boundary(Contract):
    call: str = Field(min_length=1, max_length=200, description="Exact dotted call name WITHOUT parentheses or arguments, e.g. db.load_shipping_rules")
    parameter: str = Field(min_length=1, max_length=80)
    description: str = ""

    @field_validator("call")
    @classmethod
    def valid_call(cls, value: str) -> str:
        if not all(part.isidentifier() for part in value.split(".")):
            raise ValueError("Boundary must be a dotted name such as db.load_rules")
        return value

    @field_validator("parameter")
    @classmethod
    def valid_parameter(cls, value: str) -> str:
        if not value.isidentifier() or keyword.iskeyword(value):
            raise ValueError("Parameter must be a valid Python identifier")
        return value


class Scenario(Contract):
    name: str = Field(min_length=1, max_length=120)
    args: list[Any] = Field(default_factory=list)
    kwargs: dict[str, Any] = Field(default_factory=dict)
    candidate_kwargs: dict[str, Any] = Field(default_factory=dict)
    setup: dict[str, Any] = Field(default_factory=dict)
    # JSON values only; bytes are represented with {"$bytes": "hex"}.


class AnalyzeRequest(Contract):
    source: str = Field(min_length=1, max_length=2000)
    query: str = Field(default="", max_length=2000)


class PlanRequest(Contract):
    source: str = Field(min_length=1, max_length=2000)
    entry: str = Field(min_length=1, max_length=300)
    package_name: str = "slim_feature"
    boundaries: list[Boundary] = Field(default_factory=list, max_length=10)
    scenarios: list[Scenario] = Field(default_factory=list, max_length=100)
    advice_id: str | None = Field(default=None, max_length=32)

    @field_validator("package_name")
    @classmethod
    def valid_package(cls, value: str) -> str:
        if not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", value) or keyword.iskeyword(value):
            raise ValueError("Use a lowercase Python package name (2–64 characters)")
        return value


class Plan(Contract):
    schema_version: int = 1
    source: str
    entry: Symbol
    package_name: str
    symbols: list[Symbol]
    edges: list[tuple[str, str]]
    external_dependencies: list[str]
    diagnostics: list[Diagnostic]
    boundaries: list[Boundary]
    original_lines: int
    selected_lines: int
    source_files: int
    source_commit: str | None = None
    licenses: list[str] = Field(default_factory=list)
    provider: str = "static"
    advice: str = ""


class Outcome(Contract):
    status: Literal["returned", "raised", "timeout", "error"]
    value: Any = None
    exception: str | None = None
    message: str = ""
    duration_ms: float = 0


class CaseResult(Contract):
    name: str
    status: Literal["matched", "diverged", "unverified"]
    original: Outcome
    candidate: Outcome


class ValidationReport(Contract):
    schema_version: int = 1
    status: Literal["matched", "diverged", "unverified"]
    cases: list[CaseResult]
    matched: int
    diverged: int
    unverified: int
    runner: str
    scope: str = "Evidence applies only to the executed scenarios; it is not a proof of equivalence."
