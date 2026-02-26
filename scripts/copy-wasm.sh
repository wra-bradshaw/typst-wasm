#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_WASM_DIR="${SCRIPT_DIR}/../src/wasm"
DIST_WASM_DIR="${SCRIPT_DIR}/../dist/wasm"

[[ -d "${SRC_WASM_DIR}" ]] || {
  echo "Error: src/wasm not found" >&2
  exit 1
}

rm -rf "${DIST_WASM_DIR}"
cp -r "${SRC_WASM_DIR}" "${DIST_WASM_DIR}"
