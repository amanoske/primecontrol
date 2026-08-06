# Prime Selector

A GNOME Shell extension that adds a **Prime Selector** tile to Quick Settings for controlling NVIDIA Optimus profiles via `prime-select`.

## Features

- Quick Settings widget modeled after Power Mode
- Subtitle maps `prime-select query` to a short label:
  - `intel` → **Integrated**
  - `nvidia` → **Nvidia**
  - `on-demand` → **Optimus**
- Menu to switch profiles:
  - **Integrated** → `pkexec prime-select intel`
  - **Nvidia** → `pkexec prime-select nvidia`
  - **Optimus** → `pkexec prime-select on-demand`
- Polkit password prompt when switching (same privilege level as `sudo`)
- Notification reminding you to log out or reboot after a successful switch

## Requirements

- GNOME Shell 45+
- [`nvidia-prime`](https://launchpad.net/ubuntu/+source/nvidia-prime) (`prime-select` on `PATH`)
- `pkexec` (polkit)

## Install

Run **without sudo** from this repo:

```bash
git pull
./install.sh
```

The installer detects your `gnome-shell --version` and writes it into `metadata.json` so Extension Manager does not mark it incompatible.

GNOME does not pick up a newly copied extension until the Shell reloads. Do that next:

**X11**
1. Press `Alt+F2`, type `r`, press Enter
2. Then enable:

```bash
gnome-extensions enable prime-selector@amanoske.github.com
```

**Wayland**
1. Log out and log back in
2. Then enable:

```bash
gnome-extensions enable prime-selector@amanoske.github.com
```

Open the system menu (top-right) and look for **Prime Selector** in Quick Settings.

### "Incompatible with current GNOME version"?

Re-run `./install.sh` from an up-to-date checkout. It patches `shell-version` for your running Shell. Then reload/log out and enable again.

Check:

```bash
gnome-shell --version
cat ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com/metadata.json
```

### "Extension does not exist"?

That almost always means the Shell has not rescanned extensions yet. Reload/log out first, then run `enable` again.

Confirm the files landed in your user extensions directory (not root's):

```bash
ls ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com
gnome-extensions list | grep prime
gnome-shell --version
```

## Uninstall

```bash
gnome-extensions disable prime-selector@amanoske.github.com
rm -rf ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com
```

## Notes

- Profile switches rewrite driver configuration and usually need a logout or reboot to take effect.
- The extension uses `pkexec` instead of `sudo` so GNOME can show a graphical authentication dialog.
