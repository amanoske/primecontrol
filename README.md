# Prime Selector

A GNOME Shell extension that adds a **Prime Selector** tile to Quick Settings for controlling NVIDIA PRIME profiles via `prime-select`.

## Features

- Quick Settings widget modeled after Power Mode
- Subtitle shows the current `prime-select query` result (`intel`, `nvidia`, or `on-demand`)
- Menu to switch profiles:
  - **Integrated Graphics** → `pkexec prime-select intel`
  - **NVIDIA** → `pkexec prime-select nvidia`
  - **On-Demand** → `pkexec prime-select on-demand`
- Polkit password prompt when switching (same privilege level as `sudo`)
- Notification reminding you to log out or reboot after a successful switch

## Requirements

- GNOME Shell 45+
- [`nvidia-prime`](https://launchpad.net/ubuntu/+source/nvidia-prime) (`prime-select` on `PATH`)
- `pkexec` (polkit)

## Install

```bash
./install.sh
gnome-extensions enable prime-selector@amanoske.github.com
```

Then log out and back in (or on X11: Alt+F2 → `r` → Enter).

Open the system menu (top-right) and look for **Prime Selector** in Quick Settings.

## Uninstall

```bash
gnome-extensions disable prime-selector@amanoske.github.com
rm -rf ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com
```

## Notes

- Profile switches rewrite driver configuration and usually need a logout or reboot to take effect.
- The extension uses `pkexec` instead of `sudo` so GNOME can show a graphical authentication dialog.
