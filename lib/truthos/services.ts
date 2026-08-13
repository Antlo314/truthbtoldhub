/**
 * Truth.OS service registry — one catalog, two doors.
 *
 * Every product service has an OS home (app, folder item, or in-OS browser
 * route) and a map home (house hotspot or jungle destination). System
 * utilities stay OS-only. Architect tools stay off the public map.
 *
 * Launchpad folders, the command palette, and house hotspots all read
 * this file so the two worlds cannot drift.
 */
import type { OsAppId } from '@/components/truthos/truthOsStore';

export type OsFolderId = 'sanctum' | 'community' | 'worlds' | 'studio' | 'tools' | 'system';

export type ServiceLaunch =
    | { kind: 'app'; app: OsAppId }
    | { kind: 'browser'; path: string; name: string };

export type Service = {
    id: string;
    label: string;
    hint: string;
    folder: OsFolderId;
    launch: ServiceLaunch;
    /** Where this service lives in the 3D world. `none` = OS-only. */
    map: 'hotspot' | 'destination' | 'none';
    mapId?: string;
    adminOnly?: boolean;
    gated?: boolean;
};

export const FOLDER_META: Record<OsFolderId, { label: string; hint: string }> = {
    sanctum: { label: 'Sanctum', hint: 'word · guide · memory' },
    community: { label: 'Community', hint: 'souls · the wall' },
    worlds: { label: 'Worlds', hint: 'house · play · vessel' },
    studio: { label: 'Studio', hint: 'film · sound · paint' },
    tools: { label: 'Tools', hint: 'files · notes · time' },
    system: { label: 'System', hint: 'settings · account' },
};

export const FOLDER_ORDER: OsFolderId[] = [
    'sanctum',
    'community',
    'worlds',
    'studio',
    'tools',
    'system',
];

export const SERVICES: Service[] = [
    /* ── Sanctum ── */
    { id: 'guide', label: 'Guide', hint: 'Truth', folder: 'sanctum', launch: { kind: 'app', app: 'truth' }, map: 'hotspot', mapId: 'computer' },
    { id: 'ledger', label: 'Ledger', hint: 'daily word', folder: 'sanctum', launch: { kind: 'app', app: 'ledger' }, map: 'hotspot', mapId: 'ledger', gated: true },
    { id: 'library', label: 'Library', hint: 'scrolls', folder: 'sanctum', launch: { kind: 'app', app: 'library' }, map: 'hotspot', mapId: 'library' },
    { id: 'codex', label: 'Codex', hint: 'memory', folder: 'sanctum', launch: { kind: 'browser', path: '/codex', name: 'Codex' }, map: 'hotspot', mapId: 'codex' },
    { id: 'updates', label: 'Updates', hint: 'dispatches', folder: 'sanctum', launch: { kind: 'app', app: 'updates' }, map: 'hotspot', mapId: 'envelope' },

    /* ── Community ── */
    { id: 'hall', label: 'The Hall', hint: 'gather', folder: 'community', launch: { kind: 'app', app: 'archive' }, map: 'destination', mapId: 'hall' },
    { id: 'wall', label: 'The Wall', hint: 'one mark a year', folder: 'community', launch: { kind: 'app', app: 'wall' }, map: 'hotspot', mapId: 'wall', gated: true },
    { id: 'profile', label: 'Profiles', hint: 'your page', folder: 'community', launch: { kind: 'browser', path: '/self', name: 'Soul page' }, map: 'destination', mapId: 'soul_mirror' },
    { id: 'offering', label: 'Offering', hint: 'sustain', folder: 'community', launch: { kind: 'app', app: 'offering' }, map: 'hotspot', mapId: 'mailbox', gated: true },
    { id: 'treasury', label: 'Treasury', hint: 'the pool', folder: 'community', launch: { kind: 'browser', path: '/treasury', name: 'Treasury' }, map: 'hotspot', mapId: 'mailbox' },

    /* ── Worlds ── */
    { id: 'house', label: 'The House', hint: 'leave terminal', folder: 'worlds', launch: { kind: 'app', app: 'chamber' }, map: 'none' },
    { id: 'arcade', label: 'Arcade', hint: 'play', folder: 'worlds', launch: { kind: 'app', app: 'arcade' }, map: 'hotspot', mapId: 'arcade', gated: true },
    { id: 'soul', label: 'Soul', hint: 'vessel', folder: 'worlds', launch: { kind: 'app', app: 'soul' }, map: 'destination', mapId: 'soul_mirror', gated: true },
    { id: 'studio', label: 'Studio', hint: 'signal', folder: 'worlds', launch: { kind: 'app', app: 'studio' }, map: 'destination', mapId: 'studio' },
    { id: 'cinema', label: 'Cinema', hint: 'films', folder: 'worlds', launch: { kind: 'app', app: 'media' }, map: 'destination', mapId: 'cinema' },

    /* ── Studio ── */
    { id: 'paint', label: 'Paint', hint: 'canvas', folder: 'studio', launch: { kind: 'app', app: 'paint' }, map: 'none' },
    { id: 'photos', label: 'Photos', hint: 'images', folder: 'studio', launch: { kind: 'app', app: 'photos' }, map: 'none' },
    { id: 'music', label: 'Music', hint: 'sound', folder: 'studio', launch: { kind: 'app', app: 'music' }, map: 'none' },
    { id: 'media', label: 'Media', hint: 'player', folder: 'studio', launch: { kind: 'app', app: 'media' }, map: 'destination', mapId: 'cinema' },
    { id: 'cineworks', label: 'Cineworks', hint: 'catalog', folder: 'studio', launch: { kind: 'browser', path: '/cineworks', name: 'Cineworks' }, map: 'destination', mapId: 'cinema' },

    /* ── Tools ── */
    { id: 'browser', label: 'Browser', hint: 'sanctum://', folder: 'tools', launch: { kind: 'app', app: 'browser' }, map: 'none' },
    { id: 'files', label: 'Files', hint: 'documents', folder: 'tools', launch: { kind: 'app', app: 'files' }, map: 'none' },
    { id: 'notepad', label: 'Notepad', hint: 'notes', folder: 'tools', launch: { kind: 'app', app: 'notepad' }, map: 'none' },
    { id: 'tasks', label: 'To-Do', hint: 'list', folder: 'tools', launch: { kind: 'app', app: 'tasks' }, map: 'none' },
    { id: 'calculator', label: 'Calculator', hint: 'sums', folder: 'tools', launch: { kind: 'app', app: 'calculator' }, map: 'none' },
    { id: 'clock', label: 'Clock', hint: 'time', folder: 'tools', launch: { kind: 'app', app: 'clock' }, map: 'none' },
    { id: 'terminal', label: 'Terminal', hint: 'console', folder: 'tools', launch: { kind: 'app', app: 'terminal' }, map: 'none' },

    /* ── System ── */
    { id: 'settings', label: 'Settings', hint: 'preferences', folder: 'system', launch: { kind: 'app', app: 'settings' }, map: 'none' },
    { id: 'account', label: 'Account', hint: 'identity', folder: 'system', launch: { kind: 'app', app: 'account' }, map: 'none', gated: true },
    { id: 'taskmgr', label: 'Task Manager', hint: 'system', folder: 'system', launch: { kind: 'app', app: 'taskmgr' }, map: 'none' },
    { id: 'admin', label: 'Admin', hint: 'architect', folder: 'system', launch: { kind: 'app', app: 'admin' }, map: 'none', adminOnly: true, gated: true },
];

export function servicesIn(folder: OsFolderId, opts?: { admin?: boolean }): Service[] {
    return SERVICES.filter((s) => s.folder === folder && (!s.adminOnly || opts?.admin));
}

export function serviceById(id: string): Service | undefined {
    return SERVICES.find((s) => s.id === id);
}

export function searchableServices(opts?: { admin?: boolean }): Service[] {
    return SERVICES.filter((s) => !s.adminOnly || opts?.admin);
}
