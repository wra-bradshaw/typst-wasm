#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FONTS_DIR="${PACKAGE_ROOT}/src/fonts"
WASM_DIR="${PACKAGE_ROOT}/src/wasm"

if [[ -e "${FONTS_DIR}" && -e "${WASM_DIR}" ]]; then
	echo "[inputs] Using existing src/fonts and src/wasm"
	exit 0
fi

if ! command -v nix >/dev/null 2>&1; then
	echo "Error: src/fonts or src/wasm is missing and nix is not available to materialize them." >&2
	echo "Hint: run in nix develop, or populate src/fonts and src/wasm before building." >&2
	exit 1
fi

echo "[inputs] Materializing missing build inputs via nix"

if [[ ! -e "${FONTS_DIR}" ]]; then
	bash "${SCRIPT_DIR}/link-fonts.sh"
fi

if [[ ! -e "${WASM_DIR}" ]]; then
	bash "${SCRIPT_DIR}/link-wasm.sh"
fi
