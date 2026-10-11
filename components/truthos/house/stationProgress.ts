/**
 * Track house stations visited (no Truth in-world).
 */

import type { HotspotId } from './houseMap';

export type { HotspotId };

const KEY = 'tbth-house-stations-v6';

/** Indoor stations only — completing the house does not require a jungle trek. */
export const HOUSE_CORE: HotspotId[] = [
    'envelope',
    'arcade',
    'wall',
    'library',
    'ledger',
    'computer',
];

export const STATION_ROOM: Partial<Record<HotspotId, string>> = {
    computer: 'Terminal apse',
    envelope: 'threshold',
    arcade: 'Arcade apse',
    wall: 'Mark apse',
    library: 'Library apse',
    ledger: 'Ledger apse',
    fireplace: 'centre of the hall',
    wayfinder: 'Paths apse',
    mailbox: 'porch',
    hall: 'Hall Circle',
    cinema: 'Cinema Isle',
    studio: 'Signal Spire',
    soul_mirror: 'Mirror Well',
    codex: 'Codex apse',
};

export const HOUSE_EXTRA: HotspotId[] = [
    'codex',
    'cinema',
    'studio',
    'wayfinder',
    'mailbox',
    'cineworks',
    'fireplace',
    'soul_mirror',
];

export const STATION_LABELS: Record<HotspotId, string> = {
    computer: 'Truth.OS',
    envelope: 'The Daily Word',
    library: 'Library',
    codex: 'Codex',
    ledger: 'The Ledger',
    cinema: 'Cinema Grove',
    hall: 'The Hall',
    soul_mirror: 'Soul Mirror',
    wayfinder: 'Paths',
    arcade: 'Arcade',
    studio: 'Signal Studio',
    front_door: 'Front door',
    back_door: 'Back door',
    front_bench: 'Porch bench',
    back_gate: 'Garden gate',
    mailbox: 'Offering',
    fireplace: 'Fire',
    wall: 'The Mark',
    cineworks: 'Cineworks',
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
