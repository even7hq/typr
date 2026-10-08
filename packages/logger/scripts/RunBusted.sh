#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LUA_PATH="${ROOT}/src/lua/?.lua;;"

run_busted() {
    cd "${ROOT}"
    busted tests/lua/
}

ensure_local_busted() {
    if command -v busted >/dev/null 2>&1; then
        return 0
    fi

    if ! command -v luarocks >/dev/null 2>&1; then
        return 1
    fi

    luarocks install --local busted >/dev/null 2>&1 || luarocks install --local busted
    export PATH="${HOME}/.luarocks/bin:${PATH}"

    command -v busted >/dev/null 2>&1
}

run_busted_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi

    if ! docker info >/dev/null 2>&1; then
        return 1
    fi

    docker run --rm \
        -v "${ROOT}:/work" \
        -w /work \
        -e "LUA_PATH=/work/src/lua/?.lua;;" \
        debian:bookworm-slim \
        bash -ec '
            apt-get update -qq
            apt-get install -y -qq lua5.4 luarocks
            luarocks install busted
            export PATH="${HOME}/.luarocks/bin:${PATH}"
            busted tests/lua/
        '
}

if ensure_local_busted; then
    run_busted
    exit 0
fi

echo "busted not found locally; trying Docker (debian:bookworm-slim + luarocks)..." >&2

if run_busted_docker; then
    exit 0
fi

echo "Could not run Lua tests. Install busted (luarocks install busted) or start Docker." >&2
exit 1
