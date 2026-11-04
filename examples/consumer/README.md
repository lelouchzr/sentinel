# Independent consumer

This codebase imports installed extracted packages. It does not use `PYTHONPATH`
or import from Slim or the source repositories.

Commerce demo:

```sh
uv run slim demo --output artifacts/shipping-core
uv build --wheel artifacts/shipping-core --out-dir artifacts/wheels
uv venv artifacts/consumer-venv
uv pip install --python artifacts/consumer-venv/bin/python artifacts/wheels/*.whl
artifacts/consumer-venv/bin/python examples/consumer/app.py
```

For Requests, Werkzeug and Django, `make benchmark` builds wheels, creates a clean
virtual environment and runs `app.py --upstream` with no original projects installed.
