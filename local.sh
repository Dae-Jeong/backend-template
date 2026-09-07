#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "${1:-}" in
  fastapi) implementation_dir="$repo_dir/python/fastapi" ;;
  *)
    printf '%s\n' 'Usage: ./local.sh fastapi [docker compose options] COMMAND [args...]' >&2
    exit 2
    ;;
esac
export BACKEND_IMPLEMENTATION="$1"
export BACKEND_BUILD_CONTEXT="$implementation_dir"
shift

exec docker compose --project-directory "$repo_dir" \
  --env-file "$implementation_dir/.env.example" \
  -f "$repo_dir/compose.yaml" "$@"
