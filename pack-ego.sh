#!/usr/bin/env bash
# Build the zip archive for upload to extensions.gnome.org.
# Includes only files required by the extension (no install scripts/docs).
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID="$(python3 -c 'import json; print(json.load(open("metadata.json"))["uuid"])' \
  2>/dev/null || true)"

if [[ -z "${UUID}" ]]; then
  UUID="primeval@amanoske.github.io"
fi

cd "${SOURCE_DIR}"

for required in metadata.json extension.js prime.js nvtop.js; do
  if [[ ! -f "${required}" ]]; then
    echo "error: missing ${required}" >&2
    exit 1
  fi
done

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions pack --force \
    --extra-source=prime.js \
    --extra-source=nvtop.js
  echo "Created ${UUID}.shell-extension.zip"
  echo
  echo "Upload this zip at https://extensions.gnome.org/upload/"
  echo "Do not include install.sh, uninstall.sh, README.md, or screenshot.png."
  exit 0
fi

# Fallback when gnome-extensions CLI is unavailable.
ZIP_NAME="${UUID}.shell-extension.zip"
rm -f "${ZIP_NAME}"
zip -q "${ZIP_NAME}" metadata.json extension.js prime.js nvtop.js
echo "Created ${ZIP_NAME}"
echo
echo "Upload this zip at https://extensions.gnome.org/upload/"
echo "Do not include install.sh, uninstall.sh, README.md, or screenshot.png."
