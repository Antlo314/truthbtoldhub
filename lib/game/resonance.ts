import { RELIC_BY_ID, type CombatBonuses } from '@/lib/game/destinations';

// ============================================================
//  RELIC RESONANCE — equipped relic at full power; others hum
//  at 20% in the satchel. More relics = calmer overworld.
// ============================================================

const ECHO = 0.2;

export function combatRelicBonuses(inventory: string[], equippedRelic: string | null): CombatBonuses {
    const b: CombatBonuses = { hp: 0, damage: 0, reach: 0, regen: 0, lifesteal: 0, crit: 0, knockback: 0 };
    for (const id of inventory) {
        const p = RELIC_BY_ID[id]?.power;
        if (!p) continue;
        const mult = id === equippedRelic ? 1 : ECHO;
        b.hp += (p.hp || 0) * mult;
        b.damage += (p.damage || 0) * mult;
        b.reach += (p.reach || 0) * mult;
        b.regen += (p.regen || 0) * mult;
        b.lifesteal += (p.lifesteal || 0) * mult;
        b.crit += (p.crit || 0) * mult;
        b.knockback += (p.knockback || 0) * mult;
    }
    return b;
}

/** 0–5 based on relics gathered — drives overworld shade density. */
export function resonanceTier(inventory: string[]): number {
    return Math.min(5, inventory.length);
}

export function resonanceLabel(tier: number): string {
    if (tier === 0) return 'The world is restless';
    if (tier <= 2) return 'A faint hum begins';
    if (tier <= 4) return 'The relics answer one another';
    return 'Five voices burn as one';
}

/** Fewer wandering shades as resonance rises. */
export function shadeCountForTier(tier: number): number {
    if (tier >= 5) return 0;
    if (tier >= 3) return 1;
    return 2;
}