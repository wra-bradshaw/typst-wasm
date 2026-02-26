#!/usr/bin/env bash
set -euxo pipefail

# Configuration
FONT_URL="https://download.gnu.org.ua/release/newcm/newcm-7.1.1.txz"
FONTS_TO_EXTRACT=("NewCMMath-Regular.otf" "NewCMMath-Bold.otf" "NewCMMath-Book.otf")

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FONTS_DIR="${SCRIPT_DIR}/../src/fonts/files"

# Create fonts directory if it doesn't exist
mkdir -p "${FONTS_DIR}"

# Create temp directory
temp_dir=$(mktemp -d -t typst-fonts-XXXXXX)
trap 'rm -rf "${temp_dir}"' EXIT

archive_path="${temp_dir}/fonts.txz"

# Download archive
echo "[fonts] Downloading from ${FONT_URL}"
curl -fsSL -o "${archive_path}" "${FONT_URL}"

# Extract archive
echo "[fonts] Extracting fonts..."
tar -xf "${archive_path}" -C "${temp_dir}"

# Find the extracted font directory
font_dir=$(find "${temp_dir}" -maxdepth 1 -type d -name 'newcm-*' | head -n 1)
if [[ -z "${font_dir}" ]]; then
  echo "[fonts] Error: Could not find extracted font directory" >&2
  exit 1
fi

# Copy fonts
for font_file in "${FONTS_TO_EXTRACT[@]}"; do
  src_path="${font_dir}/otf/${font_file}"
  dest_path="${FONTS_DIR}/${font_file}"

  if [[ -f "${src_path}" ]]; then
    cp "${src_path}" "${dest_path}"
  else
    echo "[fonts] Warning: Font file not found in archive: ${font_file}" >&2
  fi
done
