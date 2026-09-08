#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -n "${DB_PRIMARY_URL:-}" ]; then
  pnpm db:migrate
fi
exec node dist/main.js
