#!/bin/sh
# Container entrypoint: apply migrations (retrying until Postgres accepts connections),
# optionally seed demo data, then start the API server.
set -eu

max_attempts=30
attempt=1
echo "Applying database migrations..."
until alembic upgrade head; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database still unavailable after $max_attempts attempts; giving up." >&2
    exit 1
  fi
  echo "Database not ready (attempt $attempt/$max_attempts); retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  python -m scripts.seed
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
