#!/bin/sh
set -eu

# Docker WORKDIR is /app; Compose supplies the application's environment.
if [ -n "${DB_PRIMARY_URL:-}" ]; then
    python -m alembic -c /app/alembic.ini upgrade head
fi

exec python -m template_api.run
