// ============================================================
//  DAILY HARVEST — which loot motes have been picked up TODAY.
//  Motes used to be gated on character.discovered (permanent),
//  so once the map was swept it stayed barren forever. Instead
//  we track collected mote ids in a UTC-day-scoped localStorage
//  set: every new day the world refills with essence to reward
//  roaming again. Local-only by design (a per-day roaming nicety,
//  not progress worth cloud-syncing).
// ============================================================

import { worldEventDayKey } from '@/lib/game/worldEvents';

const KEY = 'tbth-harvest';

interface HarvestState {
    day: string;
    ids: string[];
}

let cache: HarvestState | null = null;

function read(): HarvestState {
    const today = worldEventDayKey();
    if (cache && cache.day === today) return cache;
    if (typeof window === 'undefined') {
        cache = { day: today, ids: [] };
        return cache;
    }
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as HarvestState) : null;
        cache = parsed && parsed.day === today ? parsed : { day: today, ids: [] };
    } catch {
        cache = { day: today, ids: [] };
    }
    return cache;
}

export function isHarvested(id: string): boolean {
    return read().ids.includes(id);
}

export function markHarvested(id: string): void {
    const state = read();
    if (state.ids.includes(id)) return;
    state.ids.push(id);
    cache = state;
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        /* storage full / unavailable — motes simply re-show, harmless */
    }
}
