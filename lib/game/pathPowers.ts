import type { GameCharacter, GamePath } from '@/lib/store/useGameStore';
import { skillBonuses } from '@/lib/game/paths';
import { scrollHelpsPuzzle } from '@/lib/game/scrolls';
import { hasAbility } from '@/lib/game/abilities';

// ============================================================
//  PATH POWERS — derived from learned attunements + abilities.
// ============================================================

export interface PathCombatMods {
    enemyHpMult: number;
    enemyDmgMult: number;
    playerDamageMult: number;
    playerReachBonus: number;
}

const DEFAULT_MODS: PathCombatMods = {
    enemyHpMult: 1,
    enemyDmgMult: 1,
    playerDamageMult: 1,
    playerReachBonus: 0,
};

export function pathCombatMods(path: GamePath | null, skills: string[]): PathCombatMods {
    if (!path) return DEFAULT_MODS;
    const sb = skillBonuses(skills);
    const charStub = { path, skills } as GameCharacter;

    if (path === 'seer') {
        return {
            ...DEFAULT_MODS,
            playerReachBonus: Math.floor(sb.reach * 0.5) + 2,
            playerDamageMult: 1 + (skills.includes('seer_pierce') ? 0.06 : 0) + (skills.includes('seer_intent') ? 0.04 : 0),
        };
    }
    if (path === 'sentinel') {
        return {
            ...DEFAULT_MODS,
            enemyHpMult: 1.1,
            enemyDmgMult: 1.05,
            playerDamageMult: 1.1 + (skills.includes('sen_oath') ? 0.06 : 0),
        };
    }
    if (path === 'scribe') {
        return {
            ...DEFAULT_MODS,
            playerDamageMult: 1 + (skills.includes('scr_history') ? 0.04 : 0),
            enemyDmgMult: 0.92,
        };
    }
    if (path === 'mystic') {
        return { ...DEFAULT_MODS };
    }
    return DEFAULT_MODS;
}

export function canSeeHiddenPlaces(c: GameCharacter): boolean {
    return hasAbility(c, 'abl_seer_hidden');
}

export function puzzleHintFor(c: GameCharacter, puzzleId: string, hint?: string): string | null {
    if (!hint) return null;
    if (hasAbility(c, 'abl_scr_cipher') || hasAbility(c, 'abl_scr_seal')) return hint;
    const scroll = c.equipped.scroll;
    if (scroll && scrollHelpsPuzzle(scroll, puzzleId)) return hint;
    for (const s of c.scrolls) {
        if (scrollHelpsPuzzle(s, puzzleId)) return hint;
    }
    return null;
}