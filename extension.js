import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {
    PROFILES,
    findCommand,
    monitorProfile,
    profileLabel,
    queryProfile,
    switchProfile,
} from './prime.js';
import {
    NVTOP_REFRESH_MS,
    queryNvtopSnapshotAsync,
} from './nvtop.js';

const ICON_NAME = 'video-display-symbolic';
const TOGGLE_TITLE = 'GPU';

const PrimeSelectorToggle = GObject.registerClass(
class PrimeSelectorToggle extends QuickSettings.QuickMenuToggle {
    _init() {
        super._init({
            title: TOGGLE_TITLE,
            iconName: ICON_NAME,
            toggleMode: false,
        });

        this._items = new Map();
        this._switching = false;
        this._monitor = null;
        this._statsRefreshId = 0;
        this._statsRequestToken = 0;
        this._currentProfile = queryProfile();

        this.menu.setHeader(ICON_NAME, TOGGLE_TITLE, 'Choose a GPU profile');
        this._buildMenu();
        this._refresh();

        this._monitor = monitorProfile(profileId => {
            this._currentProfile = profileId;
            this._refresh();
        });

        this._menuOpenId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this._startStatsRefresh();
            else
                this._stopStatsRefresh();
        });
    }

    _buildMenu() {
        this._statsSection = new PopupMenu.PopupMenuSection();
        this._statsPlaceholder = new PopupMenu.PopupMenuItem('GPU stats unavailable', {
            reactive: false,
        });
        this._statsPlaceholder.setSensitive(false);
        this._statsSection.addMenuItem(this._statsPlaceholder);
        this._statsRows = [];
        this.menu.addMenuItem(this._statsSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._itemsSection = new PopupMenu.PopupMenuSection();

        // Selection options use the same mapped labels as the tile subtitle.
        for (const profile of PROFILES) {
            const item = new PopupMenu.PopupMenuItem(profileLabel(profile.id));
            item.connect('activate', () => this._onProfileSelected(profile.id));
            this._itemsSection.addMenuItem(item);
            this._items.set(profile.id, item);
        }

        this.menu.addMenuItem(this._itemsSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._statusItem = new PopupMenu.PopupMenuItem(
            'Log out or reboot to apply changes',
            {reactive: false}
        );
        this._statusItem.setSensitive(false);
        this._statusItem.visible = false;
        this.menu.addMenuItem(this._statusItem);
    }

    _clearStatsRows() {
        for (const row of this._statsRows)
            row.destroy();
        this._statsRows = [];
    }

    _addStatsLabel(text) {
        const item = new PopupMenu.PopupMenuItem(text, {reactive: false});
        item.setSensitive(false);
        this._statsSection.addMenuItem(item);
        this._statsRows.push(item);
        return item;
    }

    _renderStats(result) {
        this._clearStatsRows();

        if (!result.ok || result.devices.length === 0) {
            this._statsPlaceholder.label.text = result.error || 'GPU stats unavailable';
            this._statsPlaceholder.visible = true;
            return;
        }

        this._statsPlaceholder.visible = false;

        result.devices.forEach((device, index) => {
            if (index > 0)
                this._addStatsLabel(' ');

            this._addStatsLabel(`${device.title}: ${device.name}`);
            if (device.memoryOutput)
                this._addStatsLabel(`Memory ${device.memoryOutput}`);
            this._addStatsLabel(
                `GPU Utilization ${device.gpuUtil} · VRAM Utilization ${device.memUtil}`
            );
        });
    }

    _refreshStats() {
        const token = ++this._statsRequestToken;
        queryNvtopSnapshotAsync(result => {
            if (token !== this._statsRequestToken)
                return;
            this._renderStats(result);
        });
    }

    _startStatsRefresh() {
        this._refreshStats();
        this._stopStatsRefreshTimer();
        this._statsRefreshId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, NVTOP_REFRESH_MS, () => {
            this._refreshStats();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopStatsRefreshTimer() {
        if (this._statsRefreshId) {
            GLib.Source.remove(this._statsRefreshId);
            this._statsRefreshId = 0;
        }
    }

    _stopStatsRefresh() {
        this._statsRequestToken++;
        this._stopStatsRefreshTimer();
    }

    _refresh() {
        const available = Boolean(findCommand('prime-select'));
        const canSwitch = available && !this._switching && Boolean(findCommand('pkexec'));

        if (!available) {
            this.subtitle = 'Unavailable';
            this.checked = false;
            this.menu.setHeader(ICON_NAME, TOGGLE_TITLE, 'prime-select not found');
        } else if (this._switching) {
            this.subtitle = 'Switching…';
            this.menu.setHeader(ICON_NAME, TOGGLE_TITLE, 'Switching GPU profile…');
        } else {
            this.subtitle = profileLabel(this._currentProfile);
            this.checked = this._currentProfile === 'nvidia' ||
                this._currentProfile === 'on-demand';
            this.menu.setHeader(
                ICON_NAME,
                TOGGLE_TITLE,
                profileLabel(this._currentProfile)
            );
        }

        for (const [profileId, item] of this._items) {
            const isActive = profileId === this._currentProfile;
            item.setOrnament(
                isActive ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE
            );
            item.setSensitive(canSwitch && !isActive);
        }
    }

    _onProfileSelected(profileId) {
        if (this._switching || profileId === this._currentProfile)
            return;

        this._switching = true;
        this._statusItem.visible = false;
        this._refresh();

        switchProfile(profileId, result => {
            this._switching = false;
            this._currentProfile = queryProfile();
            this._refresh();

            if (!result.ok) {
                const message = result.error || 'Failed to switch GPU profile';
                Main.notify('Primeval', message);
                this._statusItem.label.text = message;
                this._statusItem.visible = true;
                return;
            }

            Main.notify(
                'Primeval',
                `Switched to ${profileLabel(result.profileId)}. Log out or reboot to apply.`
            );
            this._statusItem.label.text = 'Log out or reboot to apply changes';
            this._statusItem.visible = true;
        });
    }

    destroy() {
        this._stopStatsRefresh();

        if (this._menuOpenId) {
            this.menu.disconnect(this._menuOpenId);
            this._menuOpenId = 0;
        }

        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }

        super.destroy();
    }
});

const PrimeSelectorIndicator = GObject.registerClass(
class PrimeSelectorIndicator extends QuickSettings.SystemIndicator {
    _init() {
        super._init();

        this._indicator = this._addIndicator();
        this._indicator.icon_name = ICON_NAME;
        this._indicator.visible = false;

        this._toggle = new PrimeSelectorToggle();
        this.quickSettingsItems.push(this._toggle);
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

export default class PrimeSelectorExtension extends Extension {
    enable() {
        this._indicator = new PrimeSelectorIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
