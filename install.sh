#!/usr/bin/env bash
set -euo pipefail

UUID="prime-selector@amanoske.github.com"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if [[ "${EUID}" -eq 0 ]] || [[ -n "${SUDO_USER:-}" ]]; then
  echo "error: do not run this installer with sudo." >&2
  echo "GNOME looks for extensions under your user home:" >&2
  echo "  ~/.local/share/gnome-shell/extensions/" >&2
  exit 1
fi

for required in metadata.json extension.js prime.js; do
  if [[ ! -f "${SOURCE_DIR}/${required}" ]]; then
    echo "error: missing ${required} in ${SOURCE_DIR}" >&2
    echo "Make sure you checked out the branch that contains the extension files." >&2
    exit 1
  fi
done

mkdir -p "${TARGET_DIR}"
install -m 0644 "${SOURCE_DIR}/metadata.json" "${TARGET_DIR}/metadata.json"
install -m 0644 "${SOURCE_DIR}/extension.js" "${TARGET_DIR}/extension.js"
install -m 0644 "${SOURCE_DIR}/prime.js" "${TARGET_DIR}/prime.js"

echo "Installed files:"
ls -la "${TARGET_DIR}"
echo

# Prefer the official pack/install path when available so GNOME registers
# the extension the same way Extensions app does.
if command -v gnome-extensions >/dev/null 2>&1; then
  BUILD_DIR="$(mktemp -d)"
  cleanup() { rm -rf "${BUILD_DIR}"; }
  trap cleanup EXIT

  cp "${SOURCE_DIR}/metadata.json" "${SOURCE_DIR}/extension.js" "${SOURCE_DIR}/prime.js" "${BUILD_DIR}/"
  (
    cd "${BUILD_DIR}"
    gnome-extensions pack --force --extra-source=prime.js
    gnome-extensions install --force ./*.shell-extension.zip
  )
  echo "Registered with gnome-extensions install."
  echo
fi

echo "Files are in place at:"
echo "  ${TARGET_DIR}"
echo
echo "GNOME will not see a brand-new extension until the Shell reloads."
echo "Do this BEFORE enabling:"
echo
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
  echo "  1. Log out and log back in (Wayland cannot restart the Shell in-place)"
else
  echo "  1. Press Alt+F2, type: r"
  echo "     then press Enter  (or log out/in)"
fi
echo "  2. gnome-extensions enable ${UUID}"
echo
echo "If enable still fails, check:"
echo "  ls ~/.local/share/gnome-shell/extensions/${UUID}"
echo "  gnome-extensions list | grep prime"
echo "  gnome-shell --version"
