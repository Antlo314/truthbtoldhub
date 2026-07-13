/**
 * Track house stations visited (no Truth / no Hut / no chamber).
 */

import type { HotspotId } from './houseMap';

export type { HotspotId };

const KEY = 'tbth-house-stations-v2';

export const HOUSE_CORE: HotspotId[] = [
    'computer',
    'soul_mirror',
    'wayfinder',
    'library',
    'hall',
];

export const HOUSE_EXTRA: HotspotId[] = [
    'envelope',
    'codex',
    'cinema',
    'ledger',
];

export const STATION_LABELS: Record<HotspotId, string> = {
    computer: 'Truth.OS computer',
    envelope: 'The Offering',
    library: 'Library shelves',
    codex: 'Codex desk',
    ledger: 'The Ledger',
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
    return HOUSE_CORE.filter((id) => !v.has(id));
}

export function hutCompletion(): { seen: number; total: number } {
    const v = loadVisited();
    const seen = HOUSE_CORE.filter((id) => v.has(id)).length;
    return { seen, total: HOUSE_CORE.length };
}
