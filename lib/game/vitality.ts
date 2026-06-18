import type { GameCharacter } from '@/lib/store/useGameStore';
import { combatRelicBonuses } from '@/lib/game/resonance';
import { skillBonuses } from '@/lib/game/paths';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus } from '@/lib/game/clothing';

// ============================================================
//  VITALITY — one persistent health pool, the same in battle and
//  out. Max grows with relics / skills / founder seal / garment;
//  current hp carries between the overworld and every fight, and
//  is restored by health hearts, tonics, and resting at the Hut.
// ============================================================

export const BASE_VITALITY = 100;

/** The soul's full vitality — base + every permanent bonus. */
export function maxVitality(c: GameCharacter, founderNumber: number | null = null): number {
    return Math.round(
        BASE_VITALITY
        + combatRelicBonuses(c.inventory, c.equipped.relic).hp
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
