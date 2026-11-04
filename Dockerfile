FROM node:22-bookworm-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock README.md ./
COPY src/ src/
RUN uv sync --frozen --no-dev --no-editable
COPY examples/ examples/
COPY --from=frontend /web/dist web/dist/
RUN useradd --create-home --uid 10001 slim && mkdir .slim && chown slim:slim .slim
USER slim
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
# The container has its own network namespace; publish only to host loopback.
CMD ["uvicorn", "slim.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
