import type { GamePath } from '@/lib/store/useGameStore';

// ============================================================
//  THE FOUR PATHS back to the Source.
//  Each has a power, a weakness, a "super perk", and a small
//  skill tree (linear shells for now — they branch later).
// ============================================================

export type PathIcon = 'eye' | 'shield' | 'scroll' | 'spark';

// What a learned skill does in combat. Mirrors RelicPower so the two
// stack on the same axes — plus `regen` (HP restored per second), the
// Mystic's signature channel. `label` is shown on the skill node.
export interface SkillCombat {
    hp?: number;
    damage?: number;
    reach?: number;
    regen?: number;
    label: string;
}

export interface SkillNode {
    id: string;
    name: string;
    desc: string;
    requires?: string[]; // skill ids that must be learned first
    super?: boolean;     // the path's culminating super perk
    combat?: SkillCombat; // how learning this node strengthens you in a fight
}

export interface PathDef {
    id: GamePath;
    name: string;     // "The Seer"
    essence: string;  // one-line identity
    power: string;
    weakness: string;
    color: string;    // accent hex
    icon: PathIcon;
    skills: SkillNode[];
}

export const PATHS: PathDef[] = [
    {
        id: 'seer',
        name: 'The Seer',
        essence: 'Sight beyond sight — the unveiler of lies.',
        power: 'Sees through illusion; reveals hidden caverns and the true form of every enemy.',
        weakness: 'Fragile in direct confrontation.',
        color: '#22d3ee',
        icon: 'eye',
        skills: [
            { id: 'seer_eye', name: 'Inner Eye', desc: 'Perceive the aura of any soul or thing.', combat: { reach: 6, label: 'Inner Eye · +6 reach' } },
            { id: 'seer_pierce', name: 'Pierce the Veil', desc: 'See through disguise and illusion.', requires: ['seer_eye'], combat: { damage: 3, label: 'Pierce · +3 might' } },
            { id: 'seer_hidden', name: 'The Unseen Path', desc: 'Reveal concealed ways and hidden caverns.', requires: ['seer_pierce'], combat: { reach: 6, label: 'Unseen Path · +6 reach' } },
            { id: 'seer_intent', name: 'Read of Intent', desc: 'Know the true purpose behind every word.', requires: ['seer_hidden'], combat: { damage: 3, label: 'Read of Intent · +3 might' } },
            { id: 'seer_super', name: 'The Unveiling', desc: 'Strip the lie from the world — behold all things as they truly are.', requires: ['seer_intent'], super: true, combat: { reach: 8, damage: 5, label: 'The Unveiling · +8 reach, +5 might' } },
        ],
    },
    {
        id: 'sentinel',
        name: 'The Sentinel',
        essence: 'A blade of light against the corrupted.',
        power: 'Spiritual warfare — strongest against entities in their spiritual form.',
        weakness: 'Less wisdom and subtlety; fewer lore unlocks.',
        color: '#fbbf24',
        icon: 'shield',
        skills: [
            { id: 'sen_stance', name: 'Guard Stance', desc: 'Stand unshaken before the dark.', combat: { hp: 15, label: 'Guard Stance · +15 vitality' } },
            { id: 'sen_strike', name: 'Strike of Light', desc: 'Wound that which feeds on shadow.', requires: ['sen_stance'], combat: { damage: 4, label: 'Strike of Light · +4 might' } },
            { id: 'sen_ward', name: 'Ward', desc: 'Shield yourself and those beside you.', requires: ['sen_strike'], combat: { hp: 20, label: 'Ward · +20 vitality' } },
            { id: 'sen_banish', name: 'Banish', desc: 'Cast the corrupted out of a place.', requires: ['sen_ward'], combat: { damage: 5, label: 'Banish · +5 might' } },
            { id: 'sen_super', name: 'Aegis of Light', desc: 'Become a standard the dark cannot cross.', requires: ['sen_banish'], super: true, combat: { hp: 30, damage: 4, label: 'Aegis of Light · +30 vitality, +4 might' } },
        ],
    },
    {
        id: 'scribe',
        name: 'The Scribe',
        essence: 'Keeper of buried knowledge.',
        power: 'Unlocks scrolls of history, science, and scripture; opens sealed puzzles.',
        weakness: 'Weak in combat.',
        color: '#a855f7',
        icon: 'scroll',
        skills: [
            { id: 'scr_letters', name: 'Letters of Light', desc: 'Read the old and hidden scripts.', combat: { hp: 8, label: 'Letters of Light · +8 vitality' } },
            { id: 'scr_cipher', name: 'Cipher Sense', desc: 'Feel the pattern in any code or seal.', requires: ['scr_letters'], combat: { reach: 2, label: 'Cipher Sense · +2 reach' } },
            { id: 'scr_memory', name: 'Memory Palace', desc: 'Hold a library of truth in your mind.', requires: ['scr_cipher'], combat: { hp: 10, label: 'Memory Palace · +10 vitality' } },
            { id: 'scr_history', name: 'Forbidden Histories', desc: 'Recall what the world was made to forget.', requires: ['scr_memory'], combat: { damage: 2, label: 'Forbidden Histories · +2 might' } },
            { id: 'scr_super', name: 'The Living Word', desc: 'Speak a sealed truth and watch every lock and lie fall open.', requires: ['scr_history'], super: true, combat: { hp: 12, damage: 3, label: 'The Living Word · +12 vitality, +3 might' } },
        ],
    },
    {
        id: 'mystic',
        name: 'The Mystic',
        essence: 'A channel for the Source itself.',
        power: 'Channels Source energy — healing and manifestation.',
        weakness: 'Vulnerable until fully attuned.',
        color: '#10b981',
        icon: 'spark',
        skills: [
            { id: 'mys_spring', name: 'Inner Spring', desc: 'Draw a thread of the Source within.', combat: { hp: 10, regen: 1, label: 'Inner Spring · +10 vitality, +1 renewal/s' } },
            { id: 'mys_hands', name: 'Laying of Hands', desc: 'Mend wounds of body and spirit.', requires: ['mys_spring'], combat: { regen: 1.5, label: 'Laying of Hands · +1.5 renewal/s' } },
            { id: 'mys_manifest', name: 'Manifest', desc: 'Call small things into being from will.', requires: ['mys_hands'], combat: { damage: 2, label: 'Manifest · +2 might' } },
            { id: 'mys_attune', name: 'Attunement', desc: 'Quiet the self until the Source flows freely.', requires: ['mys_manifest'], combat: { hp: 15, regen: 2, label: 'Attunement · +15 vitality, +2 renewal/s' } },
            { id: 'mys_super', name: 'Return to Source', desc: 'Become as Adam before the fall — one with the beginning.', requires: ['mys_attune'], super: true, combat: { hp: 25, regen: 3, label: 'Return to Source · +25 vitality, +3 renewal/s' } },
        ],
    },
];

export const PATH_BY_ID: Record<GamePath, PathDef> = PATHS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
}, {} as Record<GamePath, PathDef>);

// Every skill node across all paths, keyed by id (skill ids are unique).
const SKILL_BY_ID: Record<string, SkillNode> = PATHS.reduce((acc, p) => {
    for (const s of p.skills) acc[s.id] = s;
    return acc;
}, {} as Record<string, SkillNode>);

// Sum the passive combat bonuses from the skills a soul has learned.
// Stacks with relicBonuses() on the same axes; `regen` is path-exclusive
// to the Mystic. Mirrors lib/game/destinations.ts relicBonuses().
export function skillBonuses(skills: string[]): { hp: number; damage: number; reach: number; regen: number } {
    let hp = 0;
    let damage = 0;
    let reach = 0;
    let regen = 0;
    for (const id of skills) {
        const c = SKILL_BY_ID[id]?.combat;
        if (c) {
            hp += c.hp || 0;
            damage += c.damage || 0;
            reach += c.reach || 0;
            regen += c.regen || 0;
        }
    }
    return { hp, damage, reach, regen };
}
