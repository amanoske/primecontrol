#!/usr/bin/env bash
set -euo pipefail

UUID="prime-selector@amanoske.github.com"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

mkdir -p "${TARGET_DIR}"
install -m 0644 "${SOURCE_DIR}/metadata.json" "${TARGET_DIR}/metadata.json"
install -m 0644 "${SOURCE_DIR}/extension.js" "${TARGET_DIR}/extension.js"
install -m 0644 "${SOURCE_DIR}/prime.js" "${TARGET_DIR}/prime.js"

echo "Installed ${UUID} to ${TARGET_DIR}"
echo
echo "Enable with:"
echo "  gnome-extensions enable ${UUID}"
echo
echo "Then log out and back in (or press Alt+F2, type 'r', and Enter on X11)"
echo "so GNOME Shell reloads the extension."
