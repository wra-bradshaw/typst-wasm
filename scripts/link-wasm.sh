#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_DIR="${REPO_ROOT}/src/wasm"

echo "[wasm] Building wasm derivation..."
out_path="$(
  nix --extra-experimental-features "nix-command flakes" \
    build "path:${REPO_ROOT}#wasm" \
    --no-link \
    --print-out-paths
)"

rm -rf "${TARGET_DIR}"
ln -s "${out_path}" "${TARGET_DIR}"

echo "[wasm] Linked ${TARGET_DIR} -> ${out_path}"
