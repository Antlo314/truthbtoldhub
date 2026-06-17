import type { GamePath } from '@/lib/store/useGameStore';

// ============================================================
//  THE FOUR PATHS — attunement trees alternate passives and
//  active abilities (~every 2 nodes). Supers cap each road.
// ============================================================

export type PathIcon = 'eye' | 'shield' | 'scroll' | 'spark';
export type SkillKind = 'passive' | 'ability' | 'super';

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
    kind: SkillKind;
    requires?: string[];
    abilityId?: string;
    super?: boolean;
    combat?: SkillCombat;
}

export interface PathDef {
    id: GamePath;
    name: string;
    essence: string;
    power: string;
    weakness: string;
    color: string;
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
            { id: 'seer_lens', name: 'Lens of Light', kind: 'passive', desc: 'Your sight extends — you strike from farther away.', combat: { reach: 4, label: '+4 reach' } },
            { id: 'seer_mark', name: 'Mark', kind: 'ability', abilityId: 'abl_seer_mark', desc: 'Reveal the guardian\'s weak point on command.', requires: ['seer_lens'] },
            { id: 'seer_pierce', name: 'Pierce the Veil', kind: 'passive', desc: 'Illusion cannot hide from a true strike.', requires: ['seer_mark'], combat: { damage: 4, label: '+4 might' } },
            { id: 'seer_hidden', name: 'The Unseen Path', kind: 'ability', abilityId: 'abl_seer_hidden', desc: 'Hidden groves and sealed places appear on the map.', requires: ['seer_pierce'] },
            { id: 'seer_thread', name: 'Silver Thread', kind: 'passive', desc: 'Intent guides your hand through the veil.', requires: ['seer_hidden'], combat: { reach: 6, label: '+6 reach' } },
            { id: 'seer_pulse', name: 'Veil Pulse', kind: 'ability', abilityId: 'abl_seer_pulse', desc: 'Emit a ring of sight that strikes every shade near you.', requires: ['seer_thread'] },
            { id: 'seer_intent', name: 'Read of Intent', kind: 'passive', desc: 'You know what moves before it moves.', requires: ['seer_pulse'], combat: { damage: 4, label: '+4 might' } },
            { id: 'seer_sight', name: 'True Sight', kind: 'ability', abilityId: 'abl_seer_sight', desc: 'For a breath, every blow lands with devastating clarity.', requires: ['seer_intent'] },
            { id: 'seer_super', name: 'The Unveiling', kind: 'super', abilityId: 'abl_seer_unveil', super: true, desc: 'Strip the lie from the world — the guardian cannot hide.', requires: ['seer_sight'], combat: { reach: 6, damage: 5, label: 'Unveiling · +6 reach, +5 might' } },
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
            { id: 'sen_root', name: 'Rooted Stand', kind: 'passive', desc: 'Plant your feet — the dark cannot move you easily.', combat: { hp: 12, label: '+12 vitality' } },
            { id: 'sen_strike', name: 'Light Strike', kind: 'ability', abilityId: 'abl_sen_strike', desc: 'Lunge in a burst of light through corrupted shades.', requires: ['sen_root'] },
            { id: 'sen_hold', name: 'Iron Will', kind: 'passive', desc: 'Your blows carry the weight of conviction.', requires: ['sen_strike'], combat: { hp: 10, damage: 2, label: '+10 vitality · +2 might' } },
            { id: 'sen_ward', name: 'Ward', kind: 'ability', abilityId: 'abl_sen_ward', desc: 'Raise a ward that softens incoming wounds.', requires: ['sen_hold'] },
            { id: 'sen_bulwark', name: 'Bulwark', kind: 'passive', desc: 'Stand as a wall between shadow and the innocent.', requires: ['sen_ward'], combat: { hp: 15, label: '+15 vitality' } },
            { id: 'sen_banish', name: 'Banish', kind: 'ability', abilityId: 'abl_sen_banish', desc: 'Cast corrupted shades back with holy force.', requires: ['sen_bulwark'] },
            { id: 'sen_oath', name: 'Oathbound', kind: 'passive', desc: 'Your word is a weapon.', requires: ['sen_banish'], combat: { damage: 5, label: '+5 might' } },
            { id: 'sen_rally', name: 'Rally', kind: 'ability', abilityId: 'abl_sen_rally', desc: 'Rally your spirit — wounds land lighter for a moment.', requires: ['sen_oath'] },
            { id: 'sen_super', name: 'Aegis of Light', kind: 'super', abilityId: 'abl_sen_aegis', super: true, desc: 'Become a standard the dark cannot cross.', requires: ['sen_rally'], combat: { hp: 20, damage: 4, label: 'Aegis · +20 vitality · +4 might' } },
        ],
    },
    {
        id: 'scribe',
        name: 'The Scribe',
        essence: 'Keeper of buried knowledge.',
        power: 'Unlocks scrolls of history, science, and scripture; opens sealed puzzles.',
        weakness: 'Weak in direct confrontation.',
        color: '#a855f7',
        icon: 'scroll',
        skills: [
            { id: 'scr_letters', name: 'Letters of Light', kind: 'passive', desc: 'Read the old and hidden scripts.', combat: { hp: 8, label: '+8 vitality' } },
            { id: 'scr_cipher', name: 'Cipher Sense', kind: 'ability', abilityId: 'abl_scr_cipher', desc: 'Feel the pattern in any code or seal — puzzle hints unlock.', requires: ['scr_letters'] },
            { id: 'scr_ink', name: 'Living Ink', kind: 'passive', desc: 'Words you speak carry weight in the spirit realm.', requires: ['scr_cipher'], combat: { reach: 2, damage: 2, label: '+2 reach · +2 might' } },
            { id: 'scr_glyph', name: 'Glyph Bolt', kind: 'ability', abilityId: 'abl_scr_glyph', desc: 'Launch a luminous glyph at the nearest foe.', requires: ['scr_ink'] },
            { id: 'scr_memory', name: 'Memory Palace', kind: 'passive', desc: 'Hold a library of truth in your mind.', requires: ['scr_glyph'], combat: { hp: 12, label: '+12 vitality' } },
            { id: 'scr_seal', name: 'Open Seal', kind: 'ability', abilityId: 'abl_scr_seal', desc: 'Speak a word of opening — deeper riddle insight.', requires: ['scr_memory'] },
            { id: 'scr_history', name: 'Forbidden Histories', kind: 'passive', desc: 'Recall what the world was made to forget.', requires: ['scr_seal'], combat: { damage: 3, label: '+3 might' } },
            { id: 'scr_bind', name: 'Bind Word', kind: 'ability', abilityId: 'abl_scr_bind', desc: 'Speak a slowing seal upon the shades.', requires: ['scr_history'] },
            { id: 'scr_super', name: 'The Living Word', kind: 'super', abilityId: 'abl_scr_living', super: true, desc: 'Unleash the word that opens every lock.', requires: ['scr_bind'], combat: { hp: 10, damage: 4, label: 'Living Word · +10 vitality · +4 might' } },
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
            { id: 'mys_breath', name: 'First Breath', kind: 'passive', desc: 'Draw a thread of the Source within.', combat: { hp: 8, regen: 0.5, label: '+8 vitality · +0.5 renewal/s' } },
            { id: 'mys_spring', name: 'Inner Spring', kind: 'ability', abilityId: 'abl_mys_channel', desc: 'Channel the Source to restore vitality in battle.', requires: ['mys_breath'] },
            { id: 'mys_veil', name: 'Quiet Veil', kind: 'passive', desc: 'Stillness becomes armor.', requires: ['mys_spring'], combat: { hp: 12, label: '+12 vitality' } },
            { id: 'mys_hands', name: 'Laying of Hands', kind: 'ability', abilityId: 'abl_mys_hands', desc: 'Mend wounds of body and spirit with a stronger channel.', requires: ['mys_veil'] },
            { id: 'mys_flow', name: 'Source Flow', kind: 'passive', desc: 'The current runs clearer through you.', requires: ['mys_hands'], combat: { regen: 1.5, label: '+1.5 renewal/s' } },
            { id: 'mys_manifest', name: 'Manifest Orb', kind: 'ability', abilityId: 'abl_mys_manifest', desc: 'Call a sphere of will into being and hurl it.', requires: ['mys_flow'] },
            { id: 'mys_still', name: 'Deep Stillness', kind: 'passive', desc: 'In silence, the Source speaks loudest.', requires: ['mys_manifest'], combat: { hp: 10, regen: 1, label: '+10 vitality · +1 renewal/s' } },
            { id: 'mys_surge', name: 'Source Surge', kind: 'ability', abilityId: 'abl_mys_surge', desc: 'Let renewal and might surge together for a breath.', requires: ['mys_still'] },
            { id: 'mys_super', name: 'Return to Source', kind: 'super', abilityId: 'abl_mys_return', super: true, desc: 'Remember the beginning — restore yourself near to whole.', requires: ['mys_surge'], combat: { hp: 20, regen: 2, label: 'Return · +20 vitality · +2 renewal/s' } },
        ],
    },
];

export const PATH_BY_ID: Record<GamePath, PathDef> = PATHS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
}, {} as Record<GamePath, PathDef>);

const SKILL_BY_ID: Record<string, SkillNode> = PATHS.reduce((acc, p) => {
    for (const s of p.skills) acc[s.id] = s;
    return acc;
}, {} as Record<string, SkillNode>);

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

export function skillNodeById(id: string): SkillNode | undefined {
    return SKILL_BY_ID[id];
}