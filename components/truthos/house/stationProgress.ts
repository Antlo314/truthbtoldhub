/**
 * Track which house/hut stations a soul has visited.
 * Used for subtle reminders — not a spammy checklist.
 */

import type { HotspotId } from './houseMap';

export type { HotspotId };

const KEY = 'tbth-house-stations-v1';

/** Core Hut stations that must be discovered for "full hut" */
export const HUT_CORE: HotspotId[] = [
    'truth',
    'soul_mirror',
    'wayfinder',
    'ledger',
    'chamber',
];

/** Extended house features (sanctum hub) */
export const HOUSE_EXTRA: HotspotId[] = [
    'computer',
    'envelope',
    'library',
    'codex',
    'cinema',
    'hall',
];

export const STATION_LABELS: Record<HotspotId, string> = {
    computer: 'Truth.OS computer',
    truth: 'Ask Truth',
    envelope: 'The Offering',
    library: 'Library shelves',
    codex: 'Codex desk',
    ledger: 'The Ledger',
    chamber: 'Sanctum chamber',
    cinema: 'Cinema screen',
    hall: 'The Hall arch',
    soul_mirror: 'Soul Mirror',
    wayfinder: 'Wayfinder map',
};

export function loadVisited(): Set<string> {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch {
        return new Set();
    }
}

export function markVisited(id: HotspotId) {
    try {
        const s = loadVisited();
        if (s.has(id)) return;
        s.add(id);
        localStorage.setItem(KEY, JSON.stringify(Array.from(s)));
    } catch {
        /* */
    }
}

export function unvisitedCore(): HotspotId[] {
    const v = loadVisited();
    return HUT_CORE.filter((id) => !v.has(id));
}

export function unvisitedAny(): HotspotId[] {
    const v = loadVisited();
    return [...HUT_CORE, ...HOUSE_EXTRA].filter((id) => !v.has(id));
}

export function hutCompletion(): { seen: number; total: number } {
    const v = loadVisited();
    const seen = HUT_CORE.filter((id) => v.has(id)).length;
    return { seen, total: HUT_CORE.length };
}
