// ============================================================
//  WORLD EVENTS — one global rhythm per UTC day. Same event for
//  every soul that day; rotates through surge, bounty, truth,
//  and calm. Hooks into shades, loot, hut dispatch, and HUD.
// ============================================================

import type { WildEncounterMods } from '@/lib/game/destinations';

export type WorldEventId = 'shade_surge' | 'bountiful_essence' | 'truth_speaks' | 'still_garden';

export interface WorldEvent {
    id: WorldEventId;
    title: string;
    shortLabel: string;
    hutHeadline: string;
    hutBody: string;
    truthLine: string;
    accent: string;
    /** Extra roaming shades (can be negative on calm days). */
    shadeBonus: number;
    /** Multiplier on material + health pickup quantities. */
    materialMult: number;
    /** Wild shade combat scaling. */
    wildHpMult: number;
    wildDmgMult: number;
    wildEnemyBonus: number;
    /** Wider shade aggro radius multiplier. */
    aggroMult: number;
}

const EVENT_POOL: WorldEvent[] = [
    {
        id: 'shade_surge',
        title: 'Shade Surge',
        shortLabel: 'Shade Surge',
        hutHeadline: 'The cavern stirs — a Shade Surge',
        hutBody: 'More wandering shades drift the roads today. They move with purpose. Arm yourself, dodge well, and do not trade blows you cannot finish.',
        truthLine: 'They thicken because the world is listening. Strike only when you mean to stand.',
        accent: '#ef4444',
        shadeBonus: 2,
        materialMult: 1,
        wildHpMult: 1.15,
        wildDmgMult: 1.1,
        wildEnemyBonus: 1,
        aggroMult: 1.35,
    },
    {
        id: 'bountiful_essence',
        title: 'Bountiful Essence',
        shortLabel: 'Bountiful Essence',
        hutHeadline: 'Essence motes burn brighter',
        hutBody: 'Iron, copper, and cosmic motes yield double today — on the ground and from shades that scatter. Roam far from the Hut; the wide grass remembers abundance.',
        truthLine: 'The garden before the lie knew plenty. Walk — do not merely believe in scarcity.',
        accent: '#34d399',
        shadeBonus: 0,
        materialMult: 2,
        wildHpMult: 1,
        wildDmgMult: 1,
        wildEnemyBonus: 0,
        aggroMult: 1,
    },
    {
        id: 'truth_speaks',
        title: 'Truth Speaks',
        shortLabel: 'Truth Speaks',
        hutHeadline: 'Truth leaves word at the Hut today',
        hutBody: 'No extra danger, no doubled ore — only a clearer voice. Open Ask Truth if you dare. The cavern is quieter so you can hear your own footsteps.',
        truthLine: 'I do not shout every day. When I do, it is because someone is finally close enough to listen.',
        accent: '#f97316',
        shadeBonus: 0,
        materialMult: 1,
        wildHpMult: 1,
        wildDmgMult: 1,
        wildEnemyBonus: 0,
        aggroMult: 1,
    },
    {
        id: 'still_garden',
        title: 'Still Garden',
        shortLabel: 'Still Garden',
        hutHeadline: 'A still garden — the roads rest',
        hutBody: 'Fewer shades roam the cavern. Take the peace to read stones, gather motes, and walk portals without hurry. Not every day must be a trial.',
        truthLine: 'Even Eden had an hour before the voice of another counsel. Use this hour.',
        accent: '#22d3ee',
        shadeBonus: -1,
        materialMult: 1,
        wildHpMult: 0.9,
        wildDmgMult: 0.9,
        wildEnemyBonus: 0,
        aggroMult: 0.85,
    },
];

/** UTC day index — same event worldwide for a given calendar day. */
export function utcDayIndex(date = new Date()): number {
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

export function activeWorldEvent(date = new Date()): WorldEvent {
    const idx = utcDayIndex(date) % EVENT_POOL.length;
    return EVENT_POOL[idx];
}

export function worldEventDayKey(date = new Date()): string {
    const d = date;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function scalePickupQty(qty: number, event: WorldEvent): number {
    if (event.materialMult <= 1) return qty;
    return Math.max(1, Math.round(qty * event.materialMult));
}

export function wildEncounterMods(event: WorldEvent): WildEncounterMods {
    return {
        hpMult: event.wildHpMult,
        dmgMult: event.wildDmgMult,
        enemyBonus: event.wildEnemyBonus,
    };
}

export function effectiveShadeCount(baseShades: number, event: WorldEvent): number {
    return Math.max(0, Math.min(5, baseShades + event.shadeBonus));
}