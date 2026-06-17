import type { GameCharacter, GamePath } from '@/lib/store/useGameStore';
import { PATH_BY_ID } from '@/lib/game/paths';

// ============================================================
//  ATTUNEMENT ABILITIES — active powers unlocked every ~2 nodes.
//  Passives stay on skill nodes; abilities are buttons in combat
//  or powers in the overworld / puzzles.
// ============================================================

export type AbilityScope = 'combat' | 'world' | 'puzzle';

export type AbilityEffect =
    | 'weakPointReveal'
    | 'veilPulse'
    | 'trueSight'
    | 'unveiling'
    | 'lightStrike'
    | 'ward'
    | 'banish'
    | 'rally'
    | 'aegis'
    | 'glyphBolt'
    | 'bindWord'
    | 'livingWord'
    | 'channel'
    | 'layingHands'
    | 'manifestOrb'
    | 'sourceSurge'
    | 'returnSource'
    | 'unseenPath'
    | 'cipherSense'
    | 'openSeal';

export interface AbilityDef {
    id: string;
    name: string;
    desc: string;
    scope: AbilityScope;
    effect: AbilityEffect;
    cooldownSec: number;
    /** Combat tuning passed to the fight loop */
    potency?: number;
    durationSec?: number;
}

export const ABILITIES: AbilityDef[] = [
    // —— Seer ——
    { id: 'abl_seer_mark', name: 'Mark', desc: 'Reveal the guardian\'s weak point for 5 seconds.', scope: 'combat', effect: 'weakPointReveal', cooldownSec: 10, durationSec: 5 },
    { id: 'abl_seer_hidden', name: 'Unseen Path', desc: 'Perceive hidden groves and sealed places on the overworld.', scope: 'world', effect: 'unseenPath', cooldownSec: 0 },
    { id: 'abl_seer_pulse', name: 'Veil Pulse', desc: 'Emit a ring of sight — strikes all shades around you.', scope: 'combat', effect: 'veilPulse', cooldownSec: 8, potency: 0.65 },
    { id: 'abl_seer_sight', name: 'True Sight', desc: 'For 5 seconds, every strike has a chance to land as a critical blow.', scope: 'combat', effect: 'trueSight', cooldownSec: 14, durationSec: 5, potency: 0.55 },
    { id: 'abl_seer_unveil', name: 'The Unveiling', desc: 'Strip the lie from the guardian — weak points stay exposed.', scope: 'combat', effect: 'unveiling', cooldownSec: 28, durationSec: 8 },

    // —— Sentinel ——
    { id: 'abl_sen_strike', name: 'Light Strike', desc: 'Lunge forward in a burst of light, striking what you pass through.', scope: 'combat', effect: 'lightStrike', cooldownSec: 6, potency: 1.35 },
    { id: 'abl_sen_ward', name: 'Ward', desc: 'Raise a ward — incoming wounds are greatly reduced.', scope: 'combat', effect: 'ward', cooldownSec: 8, potency: 0.55, durationSec: 1.2 },
    { id: 'abl_sen_banish', name: 'Banish', desc: 'Cast corrupted shades back — heavy knockback on all foes.', scope: 'combat', effect: 'banish', cooldownSec: 12, potency: 22 },
    { id: 'abl_sen_rally', name: 'Rally', desc: 'Stand unshaken — take less damage for 3 seconds.', scope: 'combat', effect: 'rally', cooldownSec: 10, durationSec: 3, potency: 0.4 },
    { id: 'abl_sen_aegis', name: 'Aegis of Light', desc: 'Become a standard the dark cannot cross — near-total protection.', scope: 'combat', effect: 'aegis', cooldownSec: 22, durationSec: 2.5, potency: 0.78 },

    // —— Scribe ——
    { id: 'abl_scr_cipher', name: 'Cipher Sense', desc: 'Feel the pattern in sealed riddles — puzzle hints unlock.', scope: 'puzzle', effect: 'cipherSense', cooldownSec: 0 },
    { id: 'abl_scr_glyph', name: 'Glyph Bolt', desc: 'Launch a luminous glyph at the nearest shade.', scope: 'combat', effect: 'glyphBolt', cooldownSec: 7, potency: 1.1 },
    { id: 'abl_scr_seal', name: 'Open Seal', desc: 'Speak a word of opening — deeper insight on any riddle.', scope: 'puzzle', effect: 'openSeal', cooldownSec: 0 },
    { id: 'abl_scr_bind', name: 'Bind Word', desc: 'Speak a slowing seal — shades move sluggishly.', scope: 'combat', effect: 'bindWord', cooldownSec: 9, durationSec: 3, potency: 0.45 },
    { id: 'abl_scr_living', name: 'Living Word', desc: 'Unleash the word that opens locks — devastating glyph burst.', scope: 'combat', effect: 'livingWord', cooldownSec: 24, potency: 2.2 },

    // —— Mystic ——
    { id: 'abl_mys_channel', name: 'Channel', desc: 'Draw the Source inward — restore a portion of vitality.', scope: 'combat', effect: 'channel', cooldownSec: 14, potency: 0.25 },
    { id: 'abl_mys_hands', name: 'Laying of Hands', desc: 'Mend body and spirit — a stronger healing channel.', scope: 'combat', effect: 'layingHands', cooldownSec: 10, potency: 0.38 },
    { id: 'abl_mys_manifest', name: 'Manifest Orb', desc: 'Call a sphere of will into being and hurl it at a foe.', scope: 'combat', effect: 'manifestOrb', cooldownSec: 8, potency: 1.15 },
    { id: 'abl_mys_surge', name: 'Source Surge', desc: 'Let the Source flow freely — renewal and might surge.', scope: 'combat', effect: 'sourceSurge', cooldownSec: 12, durationSec: 4, potency: 1.5 },
    { id: 'abl_mys_return', name: 'Return to Source', desc: 'Remember the beginning — restore most of your vitality once.', scope: 'combat', effect: 'returnSource', cooldownSec: 40, potency: 0.8 },
];

export const ABILITY_BY_ID: Record<string, AbilityDef> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

/** Map legacy skill ids from older saves to the expanded attunement tree. */
export const SKILL_ID_MIGRATION: Record<string, string> = {
    seer_eye: 'seer_lens',
    sen_stance: 'sen_root',
};

export function migrateSkillIds(skills: string[]): string[] {
    const out = new Set<string>();
    for (const id of skills) {
        out.add(SKILL_ID_MIGRATION[id] || id);
    }
    return Array.from(out);
}

export function learnedAbilities(character: GameCharacter): AbilityDef[] {
    if (!character.path) return [];
    const path = PATH_BY_ID[character.path];
    const out: AbilityDef[] = [];
    for (const node of path.skills) {
        if (!character.skills.includes(node.id)) continue;
        if ((node.kind === 'ability' || node.kind === 'super') && node.abilityId) {
            const ab = ABILITY_BY_ID[node.abilityId];
            if (ab) out.push(ab);
        }
    }
    return out;
}

export function combatAbilities(character: GameCharacter): AbilityDef[] {
    return learnedAbilities(character).filter((a) => a.scope === 'combat');
}

export function hasAbility(character: GameCharacter, abilityId: string): boolean {
    return learnedAbilities(character).some((a) => a.id === abilityId);
}

export function abilityForSkill(skillId: string, path: GamePath | null): AbilityDef | null {
    if (!path) return null;
    const node = PATH_BY_ID[path].skills.find((s) => s.id === skillId);
    if (!node?.abilityId) return null;
    return ABILITY_BY_ID[node.abilityId] || null;
}