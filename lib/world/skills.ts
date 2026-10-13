/**
 * The skill tree — three branches, one per discipline of Matthew 6. A node
 * costs grace (earned by levelling on the plain and by deepening the
 * disciplines) and asks for a level in its branch's discipline. Every
 * effect is read through `has(world, id)` in stats.ts and the combat code.
 */
import type { Discipline } from './disciplines';

export type SkillNode = {
    id: string;
    branch: Discipline;
    name: string;
    effect: string;
    /** discipline level required */
    needs: number;
    /** grace cost */
    cost: number;
    /** must hold this node first */
    after?: string;
    /** row in its branch, top to bottom */
    tier: number;
    icon: string;
};

export const SKILLS: SkillNode[] = [
    // Prayer — The Secret Place
    { id: 'quiet_breath', branch: 'prayer', tier: 0, name: 'Quiet Breath', effect: 'Breath returns 25% faster.', needs: 1, cost: 1, icon: 'Wind' },
    { id: 'daily_bread', branch: 'prayer', tier: 1, after: 'quiet_breath', name: 'Daily Bread', effect: 'Food heals 40% more. A prayer at dawn leaves bread in your bag.', needs: 2, cost: 1, icon: 'Wheat' },
    { id: 'deliver_us', branch: 'prayer', tier: 2, after: 'daily_bread', name: 'Deliver Us', effect: 'For three minutes after a prayer, the creatures of the plain notice you at half the distance.', needs: 3, cost: 1, icon: 'Feather' },
    { id: 'thy_will', branch: 'prayer', tier: 3, after: 'deliver_us', name: 'Thy Will', effect: 'Rolling costs 30% less breath and keeps you untouchable longer.', needs: 4, cost: 2, icon: 'Sparkles' },
    { id: 'the_light', branch: 'prayer', tier: 4, after: 'thy_will', name: 'The Light', effect: 'Press X: a burst of light that harms and staggers everything around you. Costs spirit.', needs: 6, cost: 2, icon: 'Sun' },

    // Fasting — The Hidden Fast
    { id: 'lean_strength', branch: 'fasting', tier: 0, name: 'Lean Strength', effect: 'Every blow +10%.', needs: 1, cost: 1, icon: 'Swords' },
    { id: 'anointed', branch: 'fasting', tier: 1, after: 'lean_strength', name: 'Anointed', effect: 'While fasting: +20% damage and breath returns faster.', needs: 2, cost: 1, icon: 'FlaskConical' },
    { id: 'iron_will', branch: 'fasting', tier: 2, after: 'anointed', name: 'Iron Will', effect: 'Heavy strikes cost 25% less breath and stagger anything.', needs: 3, cost: 1, icon: 'Hammer' },
    { id: 'not_by_bread', branch: 'fasting', tier: 3, after: 'iron_will', name: 'Not by Bread Alone', effect: 'While fasting, vitality slowly returns on its own.', needs: 4, cost: 2, icon: 'BookOpen' },
    { id: 'mountain_mover', branch: 'fasting', tier: 4, after: 'not_by_bread', name: 'Mountain Mover', effect: 'The third strike of a combo lands double and throws the enemy back.', needs: 6, cost: 2, icon: 'Mountain' },

    // Giving — Treasure in Heaven
    { id: 'open_hand', branch: 'giving', tier: 0, name: 'Open Hand', effect: '+20 vitality.', needs: 1, cost: 1, icon: 'Hand' },
    { id: 'left_hand', branch: 'giving', tier: 1, after: 'open_hand', name: 'Left Hand Unknowing', effect: '+10% chance for a strike to land true (double damage).', needs: 2, cost: 1, icon: 'Target' },
    { id: 'cheerful', branch: 'giving', tier: 2, after: 'left_hand', name: 'Cheerful Giver', effect: 'Lydia sells 20% cheaper; creatures drop more coin.', needs: 3, cost: 1, icon: 'Coins' },
    { id: 'store_up', branch: 'giving', tier: 3, after: 'cheerful', name: 'Store Up', effect: 'You keep all your coin when you fall.', needs: 4, cost: 2, icon: 'Gem' },
    { id: 'heart_is', branch: 'giving', tier: 4, after: 'store_up', name: 'Where Your Heart Is', effect: '+1 vitality for every 10 treasure in heaven (up to +80).', needs: 6, cost: 2, icon: 'Heart' },
];

export const skill = (id: string) => SKILLS.find((s) => s.id === id) ?? null;

export const BRANCHES: { id: Discipline; name: string; motto: string }[] = [
    { id: 'prayer', name: 'The Secret Place', motto: 'Enter into thy closet' },
    { id: 'fasting', name: 'The Hidden Fast', motto: 'Anoint thine head' },
    { id: 'giving', name: 'Treasure in Heaven', motto: 'Where neither moth nor rust' },
];
