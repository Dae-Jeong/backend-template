#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "${1:-}" in
  fastapi)
    implementation_dir="$repo_dir/python/fastapi"
    BACKEND_PYTHON_VERSION=$(cat "$implementation_dir/.python-version")
    export BACKEND_PYTHON_VERSION
    BACKEND_HOST_PORT=18081
    BACKEND_CONTAINER_PORT=8000
    ;;
  nestjs)
    implementation_dir="$repo_dir/ts/nestjs"
    BACKEND_NODE_VERSION=$(cat "$implementation_dir/.node-version")
    export BACKEND_NODE_VERSION
    BACKEND_HOST_PORT=18084
    BACKEND_CONTAINER_PORT=3000
    ;;
  spring-boot)
    implementation_dir="$repo_dir/java/spring-boot"
    BACKEND_JAVA_VERSION=$(cat "$implementation_dir/.java-version")
    export BACKEND_JAVA_VERSION
    BACKEND_HOST_PORT=18086
    BACKEND_CONTAINER_PORT=8080
    ;;
  *)
    printf '%s\n' 'Usage: ./scripts/compose.sh {fastapi|nestjs|spring-boot} [docker compose options] COMMAND [args...]' >&2
    exit 2
    ;;
esac
export BACKEND_IMPLEMENTATION="$1"
export BACKEND_BUILD_CONTEXT="$implementation_dir"
export BACKEND_HOST_PORT BACKEND_CONTAINER_PORT
export BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$implementation_dir/.env.example}"
shift

exec docker compose --project-directory "$repo_dir" \
  --env-file "$BACKEND_ENV_FILE" \
  -f "$repo_dir/compose.yaml" "$@"
