/**
 * Track house stations visited (no Truth in-world).
 */

import type { HotspotId } from './houseMap';

export type { HotspotId };

const KEY = 'tbth-house-stations-v5';

export const HOUSE_CORE: HotspotId[] = [
    'front_door',
    'computer',
    'soul_mirror',
    'arcade',
    'fireplace',
    'library',
    'hall',
];

export const HOUSE_EXTRA: HotspotId[] = [
    'envelope',
    'codex',
    'cinema',
    'ledger',
    'studio',
    'wayfinder',
    'back_door',
    'front_bench',
    'back_gate',
];

export const STATION_LABELS: Record<HotspotId, string> = {
    computer: 'Truth.OS computer',
    envelope: 'Offering tray',
    library: 'Library shelves',
    codex: 'Study desk',
    ledger: 'Ledger lectern',
    cinema: 'Film screen',
    hall: 'Hall arch',
    soul_mirror: 'Soul Mirror',
    wayfinder: 'Wall map',
    arcade: 'Controller · Arcade',
    studio: 'Signal Studio',
    front_door: 'Front door',
    back_door: 'Back door',
    front_bench: 'Porch bench',
    back_gate: 'Garden gate',
    fireplace: 'Fireplace',
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
