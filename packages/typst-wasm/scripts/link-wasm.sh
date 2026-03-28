#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${PACKAGE_ROOT}/../.." && pwd)"
TARGET_DIR="${PACKAGE_ROOT}/src/wasm"

echo "[wasm] Building wasm derivation..."
out_path="$(
	nix --extra-experimental-features "nix-command flakes" \
		build "path:${WORKSPACE_ROOT}#wasm" \
		--no-link \
		--print-out-paths
)"

rm -rf "${TARGET_DIR}"
ln -s "${out_path}" "${TARGET_DIR}"

echo "[wasm] Linked ${TARGET_DIR} -> ${out_path}"
