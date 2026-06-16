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

export function visibleHiddenPois(c: GameCharacter): HiddenPOI[] {
    if (!canSeeHiddenPlaces(c)) return [];
    return HIDDEN_POIS;
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