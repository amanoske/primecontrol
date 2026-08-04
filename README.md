# Prime Selector

A GNOME Shell extension that adds a **Prime Selector** tile to Quick Settings for controlling NVIDIA Optimus profiles via `prime-select`.

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

Run **without sudo** from this repo:

```bash
./install.sh
```

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
