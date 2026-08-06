# Prime Control
![Prime Control Screenshot](screenshot.png)

Prime Control is a Gnome Extension that uses the _prime-select_ feature in Nvidia's proprietary drivers to switch between GPU output profiles. Similar to older tools like envycontrol, Prime Control allows you to quickly change output modes in pursuit of performance optimization and power conservation.  

## Profiles

Prime Control allows you to swap between three different output profiles:

**Integrated**: Your computer will use your integrated graphics and disable your dedicated graphics. Ideal for strict battery conservation or for environments with low/minimal access to power (e.g.: running on airplane power ports). In prime-select query, the name of this mode is 'intel.'

**Nvidia**: Your computer will use only your dedicated Nvidia GPU and disable your integrated graphics. Ideal for maximizing performance and latency in gaming and AI operations. 

**Optimus**: Your computer will use Nvidia's Optimus feature, outputting via your integrated GPU and switching dynamically to your dGPU during certain types of operations (e.g.: serving LLMs, playing games). While distributions like Ubuntu may be automatic, forcing the use of a dGPU may require you to use "prime-run" command when starting a process. In prime-select query, the name of this mode is 'on-demand.'

**Note:** For some GPUs (e.g.: Ampere/RTX 30-series) you may be required to restart your system after selecting a new profile.

## Requirements 
- GNOME Shell 45+
- nvidia-prime (prime-select on PATH)
- pkexec (polkit)

## Installation

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

### What happens if I get the error "Incompatible with current GNOME version"?

Re-run `./install.sh` from an up-to-date checkout. It patches `shell-version` for your running Shell. Then reload/log out and enable again.

Check:

```bash
gnome-shell --version
cat ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com/metadata.json
```

### What happens if I get the error "Extension does not exist"?

That almost always means the Shell has not rescanned extensions yet. Reload/log out first, then run `enable` again.

Confirm the files landed in your user extensions directory (not root's):

```bash
ls ~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com
gnome-extensions list | grep prime
gnome-shell --version
```

## Removing Prime Control

Run **without sudo** from this repo:

```bash
./uninstall.sh
```

This disables the extension (when `gnome-extensions` is available) and removes:

```text
~/.local/share/gnome-shell/extensions/prime-selector@amanoske.github.com
```

Then reload GNOME Shell (Alt+F2 → `r` on X11, or log out on Wayland) so the GPU tile disappears.

## License

Wildfire and its source code are licensed under the [MIT License](https://en.wikipedia.org/wiki/MIT_License). 
