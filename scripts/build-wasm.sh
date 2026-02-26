#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

MODE="${1:-}"

if [[ -z "${MODE}" ]]; then
  echo "Usage: scripts/build-wasm.sh <dev|release>" >&2
  exit 1
fi

WASM_FLAGS=(--target web --out-dir src/wasm . -- -Z build-std=std,panic_abort)

if [[ "${MODE}" == "dev" ]]; then
  BUILD_FLAG="--dev"
elif [[ "${MODE}" == "release" ]]; then
  BUILD_FLAG="--release"
else
  echo "Invalid mode: ${MODE}. Expected 'dev' or 'release'." >&2
  exit 1
fi

cd "${ROOT_DIR}"

wasm-pack build "${BUILD_FLAG}" "${WASM_FLAGS[@]}"
bun run scripts/patch-wasm-bindgen.ts

if grep -q 'from "bridge"' "src/wasm/typst_wasm.js"; then
  echo "[build-wasm] patch check failed: unresolved bridge import remains" >&2
  exit 1
fi

echo "[build-wasm] ${MODE} build complete"
