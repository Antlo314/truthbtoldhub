import type { GamePath } from '@/lib/store/useGameStore';

// ============================================================
//  THE FOUR PATHS back to the Source.
//  Each has a power, a weakness, a "super perk", and a small
//  skill tree (linear shells for now — they branch later).
// ============================================================

export type PathIcon = 'eye' | 'shield' | 'scroll' | 'spark';

export interface SkillNode {
    id: string;
    name: string;
    desc: string;
    requires?: string[]; // skill ids that must be learned first
    super?: boolean;     // the path's culminating super perk
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
            { id: 'seer_eye', name: 'Inner Eye', desc: 'Perceive the aura of any soul or thing.' },
            { id: 'seer_pierce', name: 'Pierce the Veil', desc: 'See through disguise and illusion.', requires: ['seer_eye'] },
            { id: 'seer_hidden', name: 'The Unseen Path', desc: 'Reveal concealed ways and hidden caverns.', requires: ['seer_pierce'] },
            { id: 'seer_intent', name: 'Read of Intent', desc: 'Know the true purpose behind every word.', requires: ['seer_hidden'] },
            { id: 'seer_super', name: 'The Unveiling', desc: 'Strip the lie from the world — behold all things as they truly are.', requires: ['seer_intent'], super: true },
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
            { id: 'sen_stance', name: 'Guard Stance', desc: 'Stand unshaken before the dark.' },
            { id: 'sen_strike', name: 'Strike of Light', desc: 'Wound that which feeds on shadow.', requires: ['sen_stance'] },
            { id: 'sen_ward', name: 'Ward', desc: 'Shield yourself and those beside you.', requires: ['sen_strike'] },
            { id: 'sen_banish', name: 'Banish', desc: 'Cast the corrupted out of a place.', requires: ['sen_ward'] },
            { id: 'sen_super', name: 'Aegis of Light', desc: 'Become a standard the dark cannot cross.', requires: ['sen_banish'], super: true },
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
            { id: 'scr_letters', name: 'Letters of Light', desc: 'Read the old and hidden scripts.' },
            { id: 'scr_cipher', name: 'Cipher Sense', desc: 'Feel the pattern in any code or seal.', requires: ['scr_letters'] },
            { id: 'scr_memory', name: 'Memory Palace', desc: 'Hold a library of truth in your mind.', requires: ['scr_cipher'] },
            { id: 'scr_history', name: 'Forbidden Histories', desc: 'Recall what the world was made to forget.', requires: ['scr_memory'] },
            { id: 'scr_super', name: 'The Living Word', desc: 'Speak a sealed truth and watch every lock and lie fall open.', requires: ['scr_history'], super: true },
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
            { id: 'mys_spring', name: 'Inner Spring', desc: 'Draw a thread of the Source within.' },
            { id: 'mys_hands', name: 'Laying of Hands', desc: 'Mend wounds of body and spirit.', requires: ['mys_spring'] },
            { id: 'mys_manifest', name: 'Manifest', desc: 'Call small things into being from will.', requires: ['mys_hands'] },
            { id: 'mys_attune', name: 'Attunement', desc: 'Quiet the self until the Source flows freely.', requires: ['mys_manifest'] },
            { id: 'mys_super', name: 'Return to Source', desc: 'Become as Adam before the fall — one with the beginning.', requires: ['mys_attune'], super: true },
        ],
    },
];

export const PATH_BY_ID: Record<GamePath, PathDef> = PATHS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
}, {} as Record<GamePath, PathDef>);
