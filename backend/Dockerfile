FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

RUN pip install --no-cache-dir . \
    && addgroup --system app \
    && adduser --system --ingroup app app \
    && mkdir -p /app/.runtime \
    && chown -R app:app /app

ENV XDG_RUNTIME_DIR=/app/.runtime

USER app

EXPOSE 8000

CMD ["sh", "-c", "gunicorn app.main:app -w ${GUNICORN_WORKERS:-1} -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000}"]
