#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${PACKAGE_ROOT}/../.." && pwd)"
DIST_DIR="${PACKAGE_ROOT}/dist"

echo "[fonts] Building fonts derivation..."
out_path="$({
	nix --extra-experimental-features "nix-command flakes" \
		build "path:${WORKSPACE_ROOT}#fonts" \
		--no-link \
		--print-out-paths
})"

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"
cp -R "${out_path}/files" "${DIST_DIR}/files"

echo "[fonts] Copied ${out_path} -> ${DIST_DIR}"
