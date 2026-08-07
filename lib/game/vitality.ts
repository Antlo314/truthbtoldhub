import type { GameCharacter } from '@/lib/store/useGameStore';
import { skillBonuses } from '@/lib/game/paths';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus } from '@/lib/game/clothing';

// ============================================================
//  VITALITY — one persistent health pool. Max grows with skills /
//  founder seal / garment. (Relic bonuses were removed with the
//  destination catalog — nothing grants a relic any more.)
// ============================================================

export const BASE_VITALITY = 100;

/** The soul's full vitality — base + every permanent bonus. */
export function maxVitality(c: GameCharacter, founderNumber: number | null = null): number {
    return Math.round(
        BASE_VITALITY
        + skillBonuses(c.skills).hp
        + founderBonuses(founderNumber).hp
        + clothingBonus(c.equipped.clothing).hp,
    );
}

/** Current vitality, clamped to the live max (legacy saves w/o hp read as full). */
export function currentVitality(c: GameCharacter, founderNumber: number | null = null, max?: number): number {
    const m = max ?? maxVitality(c, founderNumber);
    return Math.min(typeof c.hp === 'number' ? c.hp : m, m);
}
