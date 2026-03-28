#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_WASM_PATH="${SCRIPT_DIR}/../src/wasm/typst_wasm_bg.wasm"
DIST_WASM_PATH="${SCRIPT_DIR}/../dist/typst_wasm_bg.wasm"

[[ -f "${SRC_WASM_PATH}" ]] || {
	echo "Error: ${SRC_WASM_PATH} not found" >&2
	exit 1
}

mkdir -p "$(dirname "${DIST_WASM_PATH}")"
cp "${SRC_WASM_PATH}" "${DIST_WASM_PATH}"
