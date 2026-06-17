import type { POI } from '@/lib/game/overworld';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';

// ============================================================
//  HIDDEN PLACES — Seer-only overworld POIs revealed by
//  The Unseen Path. One-time discovery rewards.
// ============================================================

export interface HiddenPOI extends POI {
    /** character.discovered id */
    discoverId: string;
    lore: string;
    rewardSkillPoints: number;
}

export const HIDDEN_POIS: HiddenPOI[] = [
    {
        id: 'seer_grove',
        type: 'npc',
        x: 30,
        y: 44,
        name: 'The Unseen Grove',
        discoverId: 'seer_grove',
        detail: 'A clearing that was not on any map — until your inner eye opened it.',
        npcTile: { col: 0, row: 8 },
        lore: 'You stand where no path was carved. The Seer does not find new roads — they remember roads the world paved over. Truth left this grove for those who see.',
        rewardSkillPoints: 1,
    },
    {
        id: 'seer_pool',
        type: 'npc',
        x: 58,
        y: 62,
        name: 'Pool of First Light',
        discoverId: 'seer_pool',
        detail: 'Still water that reflects not your face, but your intent.',
        npcTile: { col: 1, row: 8 },
        lore: 'The pool shows what you came here believing. Change the belief, and the reflection changes. That is the whole war.',
        rewardSkillPoints: 1,
    },
];

export const PATH_HIDDEN_POIS: HiddenPOI[] = [
    {
        id: 'sentinel_wall',
        type: 'npc',
        x: 72,
        y: 38,
        name: 'The Ancient Wall',
        discoverId: 'sentinel_wall',
        detail: 'Stone older than the forest. The Sentinel path remembers how to hold a line.',
        npcTile: { col: 1, row: 6 },
        lore: 'You stand where others broke. The wall did not move — and neither will you, when the dark comes.',
        rewardSkillPoints: 1,
    },
    {
        id: 'scribe_archive',
        type: 'npc',
        x: 18,
        y: 68,
        name: 'Buried Archive',
        discoverId: 'scribe_archive',
        detail: 'Pages sealed in clay. The Scribe path reads what empires tried to bury.',
        npcTile: { col: 0, row: 6 },
        lore: 'Every empire writes its own epitaph. The archive keeps the rough drafts.',
        rewardSkillPoints: 1,
    },
    {
        id: 'mystic_stone',
        type: 'npc',
        x: 48,
        y: 18,
        name: 'Meditation Stone',
        discoverId: 'mystic_stone',
        detail: 'Warm to the touch. The Mystic path channels what the stone still holds.',
        npcTile: { col: 1, row: 9 },
        lore: 'Sit long enough and the stone stops being stone. It becomes a door.',
        rewardSkillPoints: 1,
    },
];

function pathHiddenFor(c: GameCharacter): HiddenPOI[] {
    if (!c.path || c.path === 'seer') return [];
    const map: Record<Exclude<GameCharacter['path'], null | 'seer'>, string> = {
        sentinel: 'sentinel_wall',
        scribe: 'scribe_archive',
        mystic: 'mystic_stone',
    };
    const id = map[c.path];
    return PATH_HIDDEN_POIS.filter((p) => p.discoverId === id);
}

export function visibleHiddenPois(c: GameCharacter): HiddenPOI[] {
    const seer = canSeeHiddenPlaces(c) ? HIDDEN_POIS : [];
    return [...seer, ...pathHiddenFor(c)];
}

export function allVisiblePois(base: POI[], c: GameCharacter): POI[] {
    return [...base, ...visibleHiddenPois(c)];
}

export function hiddenPoiById(id: string): HiddenPOI | undefined {
    return HIDDEN_POIS.find((p) => p.id === id);
}

/** Carve walkable clearings where hidden places sit (called once on map build). */
export function applyHiddenClears(ow: { solid: boolean[][]; decor: number[][]; width: number; height: number }) {
    const inB = (c: number, r: number) => c >= 0 && r >= 0 && c < ow.width && r < ow.height;
    for (const h of HIDDEN_POIS) {
        for (let r = h.y - 2; r <= h.y + 2; r++) {
            for (let c = h.x - 2; c <= h.x + 2; c++) {
                if (!inB(c, r)) continue;
                ow.decor[r][c] = 0;
                ow.solid[r][c] = false;
            }
        }
    }
}