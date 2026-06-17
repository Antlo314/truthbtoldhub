import type { GameCharacter } from '@/lib/store/useGameStore';

// ============================================================
//  HUT CONSUMABLES — craft at Truth's Hut, carry in satchel,
//  drink before the next fight for one-shot combat bonuses.
// ============================================================

export const MAX_CONSUMABLE_STACK = 5;
export const MAX_FIGHT_BONUS_HP = 60;
export const MAX_FIGHT_BONUS_DAMAGE = 18;

export interface MaterialCost {
    iron?: number;
    copper?: number;
    cosmic?: number;
}

export interface ConsumableEffect {
    hp?: number;
    damage?: number;
}

export interface ConsumableDef {
    id: string;
    name: string;
    desc: string;
    effect: ConsumableEffect;
    cost: MaterialCost;
    accent: string;
    /** Minimum guardians cleared before this recipe appears. */
    minClears?: number;
}

export const HUT_CONSUMABLES: ConsumableDef[] = [
    {
        id: 'vigor_draught',
        name: 'Vigor Draught',
        desc: 'Herbs steeped in hut-spring water. Steadies the body before the road.',
        effect: { hp: 12 },
        cost: { iron: 1 },
        accent: '#34d399',
    },
    {
        id: 'fair_tonic',
        name: 'Fairgrounds Tonic',
        desc: 'A pale distillate — memory of the ivory city in a swallow.',
        effect: { hp: 16 },
        cost: { copper: 2 },
        accent: '#fbbf24',
    },
    {
        id: 'ward_balm',
        name: 'Ward Balm',
        desc: 'Giza iron dust in copper oil. Truth rubs it on wandering souls before hard gates.',
        effect: { hp: 22 },
        cost: { iron: 2, copper: 1 },
        accent: '#22d3ee',
    },
    {
        id: 'strike_unguent',
        name: 'Strike Unguent',
        desc: 'Edge-oil for the weapon hand. The next fight bites deeper.',
        effect: { damage: 5 },
        cost: { iron: 2, copper: 1 },
        accent: '#f97316',
    },
    {
        id: 'cosmic_ember',
        name: 'Cosmic Ember',
        desc: 'A dissolved shard from the Emerald road — fire and renewal in one sip.',
        effect: { hp: 10, damage: 4 },
        cost: { cosmic: 1, iron: 1 },
        accent: '#a855f7',
        minClears: 2,
    },
];

export const CONSUMABLE_BY_ID: Record<string, ConsumableDef> = HUT_CONSUMABLES.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
}, {} as Record<string, ConsumableDef>);

export function consumableStock(c: GameCharacter, id: string): number {
    return c.consumables?.[id] ?? 0;
}

export function consumableUnlocked(def: ConsumableDef, c: GameCharacter): boolean {
    return (c.cleared?.length ?? 0) >= (def.minClears ?? 0);
}

export function canAffordCost(c: GameCharacter, cost: MaterialCost): boolean {
    const m = c.materials || { iron: 0, copper: 0, cosmic: 0 };
    return (m.iron ?? 0) >= (cost.iron ?? 0)
        && (m.copper ?? 0) >= (cost.copper ?? 0)
        && (m.cosmic ?? 0) >= (cost.cosmic ?? 0);
}

export function canCraftConsumable(c: GameCharacter, id: string): boolean {
    const def = CONSUMABLE_BY_ID[id];
    if (!def || !consumableUnlocked(def, c)) return false;
    if (consumableStock(c, id) >= MAX_CONSUMABLE_STACK) return false;
    return canAffordCost(c, def.cost);
}

export function formatMaterialCost(cost: MaterialCost): string {
    const parts: string[] = [];
    if (cost.iron) parts.push(`${cost.iron} iron`);
    if (cost.copper) parts.push(`${cost.copper} copper`);
    if (cost.cosmic) parts.push(`${cost.cosmic} cosmic`);
    return parts.join(' · ');
}

export function formatConsumableEffect(effect: ConsumableEffect): string {
    const parts: string[] = [];
    if (effect.hp) parts.push(`+${effect.hp} vitality`);
    if (effect.damage) parts.push(`+${effect.damage} might`);
    return parts.join(' · ');
}

export function visibleConsumables(c: GameCharacter): ConsumableDef[] {
    return HUT_CONSUMABLES.filter((d) => consumableUnlocked(d, c));
}