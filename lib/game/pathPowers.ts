import type { GameCharacter, GamePath } from '@/lib/store/useGameStore';
import { skillBonuses } from '@/lib/game/paths';
import { scrollHelpsPuzzle } from '@/lib/game/scrolls';

// ============================================================
//  PATH POWERS — each path changes how the world and fights feel.
//  Seer: hidden places + reach. Sentinel: harder foes, harder hits.
//  Scribe: puzzle insight. Mystic: channel heal in combat.
// ============================================================

export interface PathCombatMods {
    enemyHpMult: number;
    enemyDmgMult: number;
    playerDamageMult: number;
    playerReachBonus: number;
    canChannel: boolean;
    channelHealPct: number;
    channelCooldownSec: number;
}

const DEFAULT_MODS: PathCombatMods = {
    enemyHpMult: 1,
    enemyDmgMult: 1,
    playerDamageMult: 1,
    playerReachBonus: 0,
    canChannel: false,
    channelHealPct: 0,
    channelCooldownSec: 0,
};

export function pathCombatMods(path: GamePath | null, skills: string[]): PathCombatMods {
    if (!path) return DEFAULT_MODS;
    const sb = skillBonuses(skills);

    if (path === 'seer') {
        return {
            ...DEFAULT_MODS,
            playerReachBonus: Math.floor(sb.reach * 0.5) + (skills.includes('seer_eye') ? 4 : 0),
            playerDamageMult: 1 + (skills.includes('seer_pierce') ? 0.08 : 0),
        };
    }
    if (path === 'sentinel') {
        return {
            enemyHpMult: 1.1,
            enemyDmgMult: 1.05,
            playerDamageMult: 1.12 + (skills.includes('sen_strike') ? 0.06 : 0),
            playerReachBonus: 0,
            canChannel: false,
            channelHealPct: 0,
            channelCooldownSec: 0,
        };
    }
    if (path === 'scribe') {
        return {
            ...DEFAULT_MODS,
            playerDamageMult: 1,
            // scribes endure longer in lore-guarded places
            enemyDmgMult: 0.92,
        };
    }
    if (path === 'mystic') {
        return {
            ...DEFAULT_MODS,
            canChannel: skills.includes('mys_spring'),
            channelHealPct: skills.includes('mys_attune') ? 0.35 : 0.25,
            channelCooldownSec: skills.includes('mys_hands') ? 10 : 14,
        };
    }
    return DEFAULT_MODS;
}

/** Seer with The Unseen Path can perceive hidden overworld places. */
export function canSeeHiddenPlaces(c: GameCharacter): boolean {
    return c.path === 'seer' && c.skills.includes('seer_hidden');
}

/** Puzzle hint text if the soul's path or scrolls grant insight. */
export function puzzleHintFor(c: GameCharacter, puzzleId: string, hint?: string): string | null {
    if (!hint) return null;
    if (c.path === 'scribe' && c.skills.includes('scr_cipher')) return hint;
    const scroll = c.equipped.scroll;
    if (scroll && scrollHelpsPuzzle(scroll, puzzleId)) return hint;
    for (const s of c.scrolls) {
        if (scrollHelpsPuzzle(s, puzzleId)) return hint;
    }
    return null;
}