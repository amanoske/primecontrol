import Gio from 'gi://Gio';

import {findCommand} from './prime.js';

/**
 * Repair common nvtop -s JSON quirks (missing commas between fields).
 *
 * @param {string} text
 * @returns {string}
 */
function repairSnapshotJson(text) {
    return text.replace(
        /("(?:\\.|[^"\\])*"|null|-?\d+(?:\.\d+)?)\s*\n(\s*")/g,
        '$1,\n$2'
    );
}

/**
 * Format byte counts from nvtop (string/number) as MiB.
 *
 * @param {string|number|null|undefined} value
 * @returns {string|null}
 */
function formatMib(value) {
    if (value === null || value === undefined || value === '')
        return null;

    const bytes = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(bytes) || bytes < 0)
        return null;

    const mib = bytes / (1024 * 1024);
    if (mib >= 1024)
        return `${(mib / 1024).toFixed(1)} GiB`;

    return `${Math.round(mib)} MiB`;
}

/**
 * Normalize one nvtop device object into UI-friendly fields.
 *
 * @param {object} device
 * @param {number} index
 * @returns {{index: number, title: string, name: string, memoryOutput: string, gpuUtil: string, memUtil: string}}
 */
function normalizeDevice(device, index) {
    const name = device?.device_name ? String(device.device_name) : 'Unknown GPU';
    const used = formatMib(device?.mem_used);
    const total = formatMib(device?.mem_total);
    let memoryOutput = 'Memory N/A';
    if (used && total)
        memoryOutput = `${used} / ${total}`;
    else if (total)
        memoryOutput = `Total ${total}`;
    else if (used)
        memoryOutput = `Used ${used}`;

    return {
        index,
        title: `Device ${index}`,
        name,
        memoryOutput,
        gpuUtil: device?.gpu_util ? String(device.gpu_util) : 'N/A',
        memUtil: device?.mem_util ? String(device.mem_util) : 'N/A',
    };
}

/**
 * Query GPU stats via `nvtop -s`.
 *
 * @returns {{ok: boolean, devices: object[], error?: string}}
 */
export function queryNvtopSnapshot() {
    const nvtop = findCommand('nvtop');
    if (!nvtop) {
        return {
            ok: false,
            devices: [],
            error: 'nvtop not found',
        };
    }

    try {
        const subprocess = Gio.Subprocess.new(
            [nvtop, '-s'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
        const [, stdout, stderr] = subprocess.communicate_utf8(null, null);
        if (subprocess.get_exit_status() !== 0) {
            return {
                ok: false,
                devices: [],
                error: (stderr || 'nvtop -s failed').trim(),
            };
        }

        const raw = (stdout || '').trim();
        if (!raw) {
            return {
                ok: false,
                devices: [],
                error: 'nvtop returned no data',
            };
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (_firstError) {
            parsed = JSON.parse(repairSnapshotJson(raw));
        }

        if (!Array.isArray(parsed)) {
            return {
                ok: false,
                devices: [],
                error: 'Unexpected nvtop snapshot format',
            };
        }

        return {
            ok: true,
            devices: parsed.map((device, index) => normalizeDevice(device, index)),
        };
    } catch (error) {
        return {
            ok: false,
            devices: [],
            error: error.message || String(error),
        };
    }
}

/**
 * Async variant of queryNvtopSnapshot.
 *
 * @param {(result: {ok: boolean, devices: object[], error?: string}) => void} callback
 */
export function queryNvtopSnapshotAsync(callback) {
    const nvtop = findCommand('nvtop');
    if (!nvtop) {
        callback({
            ok: false,
            devices: [],
            error: 'nvtop not found',
        });
        return;
    }

    try {
        const subprocess = Gio.Subprocess.new(
            [nvtop, '-s'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        subprocess.communicate_utf8_async(null, null, (proc, result) => {
            try {
                const [, stdout, stderr] = proc.communicate_utf8_finish(result);
                if (proc.get_exit_status() !== 0) {
                    callback({
                        ok: false,
                        devices: [],
                        error: (stderr || 'nvtop -s failed').trim(),
                    });
                    return;
                }

                const raw = (stdout || '').trim();
                if (!raw) {
                    callback({
                        ok: false,
                        devices: [],
                        error: 'nvtop returned no data',
                    });
                    return;
                }

                let parsed;
                try {
                    parsed = JSON.parse(raw);
                } catch (_firstError) {
                    parsed = JSON.parse(repairSnapshotJson(raw));
                }

                if (!Array.isArray(parsed)) {
                    callback({
                        ok: false,
                        devices: [],
                        error: 'Unexpected nvtop snapshot format',
                    });
                    return;
                }

                callback({
                    ok: true,
                    devices: parsed.map((device, index) => normalizeDevice(device, index)),
                });
            } catch (error) {
                callback({
                    ok: false,
                    devices: [],
                    error: error.message || String(error),
                });
            }
        });
    } catch (error) {
        callback({
            ok: false,
            devices: [],
            error: error.message || String(error),
        });
    }
}

export const NVTOP_REFRESH_MS = 2000;
