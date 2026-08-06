#!/usr/bin/env bash
set -euo pipefail

UUID="prime-selector@amanoske.github.io"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if [[ "${EUID}" -eq 0 ]] || [[ -n "${SUDO_USER:-}" ]]; then
  echo "error: do not run this uninstaller with sudo." >&2
  echo "GNOME looks for extensions under your user home:" >&2
  echo "  ~/.local/share/gnome-shell/extensions/" >&2
  exit 1
fi

if command -v gnome-extensions >/dev/null 2>&1; then
  if gnome-extensions list 2>/dev/null | grep -Fxq "${UUID}"; then
    gnome-extensions disable "${UUID}" >/dev/null 2>&1 || true
    echo "Disabled ${UUID}"
  else
    echo "Extension ${UUID} is not currently listed by gnome-extensions."
  fi
else
  echo "warning: gnome-extensions not found; skipping disable step." >&2
fi

if [[ -d "${TARGET_DIR}" ]]; then
  rm -rf "${TARGET_DIR}"
  echo "Removed ${TARGET_DIR}"
else
  echo "No installed files found at ${TARGET_DIR}"
fi

echo
echo "Uninstall complete."
echo
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
  echo "Log out and log back in so GNOME Shell drops the tile."
else
  echo "Press Alt+F2, type: r , then Enter  (or log out/in)"
  echo "so GNOME Shell drops the tile."
fi
