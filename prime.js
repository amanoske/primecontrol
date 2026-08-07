import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// Single source of truth for UI naming.
// id  = prime-select query / switch argument
// label = text shown in the Quick Settings tile subtitle AND selection menu
export const PROFILES = Object.freeze([
    {
        id: 'intel',
        label: 'Integrated',
        description: 'Use the integrated GPU for power saving',
    },
    {
        id: 'nvidia',
        label: 'Dedicated',
        description: 'Use the discrete NVIDIA GPU',
    },
    {
        id: 'on-demand',
        label: 'Optimus',
        description: 'Integrated by default, NVIDIA on demand',
    },
]);

/**
 * Locate an executable on PATH.
 *
 * @param {string} command
 * @returns {string|null}
 */
export function findCommand(command) {
    return GLib.find_program_in_path(command);
}

/**
 * Run `prime-select query` and return the active profile id.
 *
 * @returns {string} intel|nvidia|on-demand|unknown
 */
export function queryProfile() {
    const primeSelect = findCommand('prime-select');
    if (!primeSelect)
        return 'unknown';

    try {
        const subprocess = Gio.Subprocess.new(
            [primeSelect, 'query'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
        const [, stdout, stderr] = subprocess.communicate_utf8(null, null);
        if (subprocess.get_exit_status() !== 0)
            return 'unknown';

        const result = (stdout || stderr || '').trim().toLowerCase();
        if (PROFILES.some(profile => profile.id === result))
            return result;

        return result || 'unknown';
    } catch (_error) {
        return 'unknown';
    }
}

/**
 * Map a prime-select query id to the UI label.
 * intel → Integrated, nvidia → Dedicated, on-demand → Optimus
 *
 * @param {string} profileId
 * @returns {string}
 */
export function profileLabel(profileId) {
    const normalized = (profileId || '').trim().toLowerCase();
    const match = PROFILES.find(profile => profile.id === normalized);
    return match ? match.label : profileId;
}

/**
 * Switch GPU profile via pkexec (polkit password prompt).
 * Equivalent to: sudo prime-select <profile>
 *
 * @param {string} profileId
 * @param {(result: {ok: boolean, profileId: string, error?: string}) => void} callback
 */
export function switchProfile(profileId, callback) {
    const pkexec = findCommand('pkexec');
    const primeSelect = findCommand('prime-select');

    if (!pkexec) {
        callback({
            ok: false,
            profileId,
            error: 'pkexec was not found. Install polkit to switch profiles.',
        });
        return;
    }

    if (!primeSelect) {
        callback({
            ok: false,
            profileId,
            error: 'prime-select was not found. Install nvidia-prime.',
        });
        return;
    }

    if (!PROFILES.some(profile => profile.id === profileId)) {
        callback({
            ok: false,
            profileId,
            error: `Unknown profile: ${profileId}`,
        });
        return;
    }

    try {
        const subprocess = Gio.Subprocess.new(
            [pkexec, primeSelect, profileId],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        subprocess.communicate_utf8_async(null, null, (proc, result) => {
            try {
                const [, , stderr] = proc.communicate_utf8_finish(result);
                const status = proc.get_exit_status();
                if (status === 0) {
                    callback({ok: true, profileId});
                } else {
                    callback({
                        ok: false,
                        profileId,
                        error: (stderr || `prime-select exited with status ${status}`).trim(),
                    });
                }
            } catch (error) {
                callback({
                    ok: false,
                    profileId,
                    error: error.message || String(error),
                });
            }
        });
    } catch (error) {
        callback({
            ok: false,
            profileId,
            error: error.message || String(error),
        });
    }
}

/**
 * Watch /etc/prime-discrete for external profile changes.
 *
 * @param {(profileId: string) => void} onChange
 * @returns {{monitor: Gio.FileMonitor, handlerId: number}|null}
 */
export function monitorProfile(onChange) {
    try {
        const file = Gio.File.new_for_path('/etc/prime-discrete');
        const monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
        const handlerId = monitor.connect('changed', () => {
            onChange(queryProfile());
        });
        return {monitor, handlerId};
    } catch (_error) {
        return null;
    }
}
