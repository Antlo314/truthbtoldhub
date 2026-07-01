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

// ============================================================
//  PATH STAT PROFILE — a 0..100 readout per axis used by the
//  path-selection preview (PathStatPreview). Curated by hand so
//  each road reads with a distinct identity at a glance, derived
//  from each path's base combat modifiers + essence.
// ============================================================
export interface PathStatProfile {
    power: number;
    reach: number;
    vitality: number;
    resilience: number;
}

const BASE_PROFILES: Record<GamePath, PathStatProfile> = {
    // The Seer — fragile but strikes from afar; long reach, low vit.
    seer:     { power: 62, reach: 92, vitality: 40, resilience: 36 },
    // The Sentinel — the front-line bulwark; high vit & mitigation.
    sentinel: { power: 78, reach: 52, vitality: 88, resilience: 80 },
    // The Scribe — knowledge over force; weakest in a straight fight.
    scribe:   { power: 44, reach: 56, vitality: 58, resilience: 64 },
    // The Mystic — balanced channeler; regen & sustain, middle of the road.
    mystic:   { power: 66, reach: 60, vitality: 66, resilience: 78 },
};

export function pathStatProfile(path: GamePath): PathStatProfile {
    return BASE_PROFILES[path] ?? { power: 50, reach: 50, vitality: 50, resilience: 50 };
}