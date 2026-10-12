/**
 * Truth.OS catalog — every program and sanctum page, listed once.
 *
 * The App Library groups it, Spotlight searches it, the phone home screen
 * lays it out. Each entry opens exactly one thing: an app, or a sanctum
 * page in the Browser for the few pages that have no app of their own.
 * Pages that DO have an app (the Hall, the Library, the Cinema) are not
 * listed twice.
 */
import type { OsAppId } from '@/components/truthos/truthOsStore';

export type OsGroupId = 'sanctum' | 'community' | 'play' | 'create' | 'tools' | 'system';

export type ServiceLaunch =
    | { kind: 'app'; app: OsAppId }
    | { kind: 'browser'; path: string; name: string };

export type Service = {
    id: string;
    label: string;
    hint: string;
    group: OsGroupId;
    launch: ServiceLaunch;
    adminOnly?: boolean;
};

export const GROUP_META: Record<OsGroupId, { label: string }> = {
    sanctum: { label: 'Sanctum' },
    community: { label: 'Community' },
    play: { label: 'Play & watch' },
    create: { label: 'Create' },
    tools: { label: 'Tools' },
    system: { label: 'System' },
};

export const GROUP_ORDER: OsGroupId[] = ['sanctum', 'community', 'play', 'create', 'tools', 'system'];

const app = (id: string, label: string, hint: string, group: OsGroupId, a: OsAppId, adminOnly = false): Service => ({
    id,
    label,
    hint,
    group,
    launch: { kind: 'app', app: a },
    adminOnly,
});
const page = (id: string, label: string, hint: string, group: OsGroupId, path: string): Service => ({
    id,
    label,
    hint,
    group,
    launch: { kind: 'browser', path, name: label },
});

export const SERVICES: Service[] = [
    app('guide', 'Guide', 'Ask Truth', 'sanctum', 'truth'),
    app('ledger', 'Ledger', 'Dispatches · the Daily Word', 'sanctum', 'ledger'),
    app('library', 'Library', 'Scrolls', 'sanctum', 'library'),
    page('codex', 'Codex', 'Memory and whispers', 'sanctum', '/codex'),

    app('hall', 'The Hall', 'Gather and talk', 'community', 'archive'),
    app('wall', 'The Mark', 'One mark a year', 'community', 'wall'),
    app('offering', 'Offering', 'Keep the house open', 'community', 'offering'),
    page('profile', 'Your Page', 'Profile and history', 'community', '/self'),
    page('treasury', 'Treasury', 'The pool', 'community', '/treasury'),

    app('arcade', 'Arcade', 'Four games · seasonal crown', 'play', 'arcade'),
    app('soul', 'Soul', 'Shape your vessel', 'play', 'soul'),
    app('cinema', 'Cinema', 'House films', 'play', 'media'),
    page('cineworks', 'Cineworks', 'Prophetic breakdowns', 'play', '/cineworks'),

    app('music', 'Music', 'The sanctum score', 'create', 'music'),
    app('photos', 'Photos', 'Stills and wallpapers', 'create', 'photos'),
    app('paint', 'Paint', 'A canvas', 'create', 'paint'),

    app('browser', 'Browser', 'Sanctum pages', 'tools', 'browser'),
    app('files', 'Files', 'Documents', 'tools', 'files'),
    app('notes', 'Notes', 'Plain text', 'tools', 'notepad'),
    app('tasks', 'To-Do', 'Today’s list', 'tools', 'tasks'),
    app('calculator', 'Calculator', 'Sums', 'tools', 'calculator'),
    app('clock', 'Clock', 'World clocks · stopwatch', 'tools', 'clock'),
    app('terminal', 'Terminal', 'soulsh', 'tools', 'terminal'),

    app('settings', 'Settings', 'Account · look · sound', 'system', 'settings'),
    app('activity', 'Activity', 'Windows and frame rate', 'system', 'taskmgr'),
    app('admin', 'Console', 'Architect tools', 'system', 'admin', true),
];

export function servicesIn(group: OsGroupId, opts?: { admin?: boolean }): Service[] {
    return SERVICES.filter((s) => s.group === group && (!s.adminOnly || opts?.admin));
}

export function searchableServices(opts?: { admin?: boolean }): Service[] {
    return SERVICES.filter((s) => !s.adminOnly || opts?.admin);
}
