#!/usr/bin/env bash
set -euo pipefail

UUID="prime-selector@amanoske.github.io"
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

detect_shell_version() {
  local raw major
  if ! command -v gnome-shell >/dev/null 2>&1; then
    echo ""
    return
  fi

  raw="$(gnome-shell --version 2>/dev/null || true)"
  # Examples: "GNOME Shell 46.0", "GNOME Shell 48.4"
  major="$(printf '%s\n' "${raw}" | grep -oE '[0-9]+' | head -n1 || true)"
  echo "${major}"
}

SHELL_MAJOR="$(detect_shell_version)"
if [[ -z "${SHELL_MAJOR}" ]]; then
  echo "warning: could not detect gnome-shell version; installing stock metadata." >&2
else
  echo "Detected GNOME Shell major version: ${SHELL_MAJOR}"
  if [[ "${SHELL_MAJOR}" -lt 45 ]]; then
    echo "error: this extension requires GNOME Shell 45+ (ESM modules)." >&2
    echo "Your version appears to be ${SHELL_MAJOR}." >&2
    exit 1
  fi
fi

BUILD_DIR="$(mktemp -d)"
cleanup() { rm -rf "${BUILD_DIR}"; }
trap cleanup EXIT

cp "${SOURCE_DIR}/extension.js" "${SOURCE_DIR}/prime.js" "${BUILD_DIR}/"

# Ensure the installed metadata advertises the running Shell version.
# Extension Manager marks the extension incompatible when the major version
# is missing from shell-version[].
python3 - "${SOURCE_DIR}/metadata.json" "${BUILD_DIR}/metadata.json" "${SHELL_MAJOR}" <<'PY'
import json
import sys

src, dst, major = sys.argv[1], sys.argv[2], sys.argv[3]
with open(src, encoding="utf-8") as fh:
    meta = json.load(fh)

versions = [str(v) for v in meta.get("shell-version", [])]
if major and major not in versions:
    versions.append(major)
    versions = sorted(versions, key=lambda v: int(v) if v.isdigit() else v)
meta["shell-version"] = versions

with open(dst, "w", encoding="utf-8") as fh:
    json.dump(meta, fh, indent=2)
    fh.write("\n")

print("shell-version =", ", ".join(meta["shell-version"]))
PY

mkdir -p "${TARGET_DIR}"
install -m 0644 "${BUILD_DIR}/metadata.json" "${TARGET_DIR}/metadata.json"
install -m 0644 "${BUILD_DIR}/extension.js" "${TARGET_DIR}/extension.js"
install -m 0644 "${BUILD_DIR}/prime.js" "${TARGET_DIR}/prime.js"

echo
echo "Installed files:"
ls -la "${TARGET_DIR}"
echo
echo "Installed metadata shell-version:"
python3 -c 'import json,sys; print(", ".join(json.load(open(sys.argv[1]))["shell-version"]))' \
  "${TARGET_DIR}/metadata.json"
echo

if command -v gnome-extensions >/dev/null 2>&1; then
  (
    cd "${BUILD_DIR}"
    gnome-extensions pack --force --extra-source=prime.js
    gnome-extensions install --force ./*.shell-extension.zip
  )
  echo "Registered with gnome-extensions install."
  echo
fi

echo "Next steps:"
echo
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
  echo "  1. Log out and log back in"
else
  echo "  1. Press Alt+F2, type: r , then Enter  (or log out/in)"
fi
echo "  2. gnome-extensions enable ${UUID}"
echo
echo "If Extension Manager still says incompatible, paste:"
echo "  gnome-shell --version"
echo "  cat ${TARGET_DIR}/metadata.json"
