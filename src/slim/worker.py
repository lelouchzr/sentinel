"""Standalone worker. Intentionally stdlib-only so it also runs inside Docker."""

import asyncio
import contextlib
import importlib
import inspect
import json
import math
import sys
import time
from decimal import Decimal


class DiscardOutput:
    def write(self, text):
        return len(text)

    def flush(self):
        pass


def decode(value):
    if isinstance(value, dict):
        if set(value) == {"$bytes"}:
            return bytes.fromhex(value["$bytes"])
        return {k: decode(v) for k, v in value.items()}
    if isinstance(value, list):
        return [decode(v) for v in value]
    return value


def encode(value):
    # Tagged values preserve type distinctions: True is not treated as 1, and
    # a tuple is not silently converted into a list.
    if value is None or type(value) in {bool, str, int}:
        return {"type": type(value).__name__, "value": value}
    if isinstance(value, float):
        return {"type": "float", "value": value if math.isfinite(value) else str(value)}
    if isinstance(value, bytes):
        return {"type": "bytes", "value": value.hex()}
    if isinstance(value, Decimal):
        return {"type": "Decimal", "value": str(value)}
    if isinstance(value, list | tuple):
        return {
            "type": "tuple" if isinstance(value, tuple) else "list",
            "value": [encode(v) for v in value],
        }
    if isinstance(value, dict):
        items = [[encode(k), encode(v)] for k, v in value.items()]
        return {
            "type": "dict",
            "value": sorted(items, key=lambda pair: json.dumps(pair[0], sort_keys=True)),
        }
    if isinstance(value, set | frozenset):
        return {
            "type": type(value).__name__,
            "value": sorted(
                [encode(v) for v in value], key=lambda v: json.dumps(v, sort_keys=True)
            ),
        }
    raise TypeError(f"Unsupported return type: {type(value).__name__}")


def main():
    payload = json.load(sys.stdin)
    started = time.monotonic()
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
        resource.setrlimit(resource.RLIMIT_FSIZE, (1_048_576, 1_048_576))
        resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))
        if sys.platform.startswith("linux"):
            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024**2, 512 * 1024**2))
    except (ImportError, OSError, ValueError):
        pass
    sys.path[:0] = payload["paths"]
    outcome = None
    with contextlib.redirect_stdout(DiscardOutput()), contextlib.redirect_stderr(DiscardOutput()):
        try:
            module_name, name = payload["entry"].split(":")
            for path, value in payload.get("setup", {}).items():
                setup_module, _, attribute = path.rpartition(".")
                if not setup_module or not attribute.isidentifier() or attribute.startswith("__"):
                    raise ValueError("Fixture setup must be a module.attribute path")
                setattr(importlib.import_module(setup_module), attribute, decode(value))
            target = getattr(importlib.import_module(module_name), name)
        except BaseException as exc:
            outcome = {
                "status": "error",
                "message": f"Import/setup failed: {type(exc).__name__}: {exc}",
            }
        if outcome is None:
            try:
                result = target(
                    *decode(payload.get("args", [])), **decode(payload.get("kwargs", {}))
                )
                if inspect.isawaitable(result):
                    result = asyncio.run(result)
            except BaseException as exc:
                outcome = {"status": "raised", "exception": type(exc).__name__, "message": str(exc)}
            else:
                try:
                    outcome = {"status": "returned", "value": encode(result)}
                except (TypeError, ValueError, RecursionError) as exc:
                    outcome = {"status": "error", "message": f"Serialization failed: {exc}"}
    outcome["duration_ms"] = round((time.monotonic() - started) * 1000, 2)
    sys.stdout.write(json.dumps(outcome, allow_nan=False))


if __name__ == "__main__":
    main()
