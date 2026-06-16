// ============================================================
//  WEAPONS — a tier ladder. You begin with a Wooden Staff; each
//  guardian you defeat tempers your weapon up a tier, until it
//  becomes the Sword of Light. Weapons strike the spirit, not the
//  flesh (enemies are shades).
// ============================================================

export type WeaponKind = 'staff' | 'blade' | 'sword';

export interface Weapon {
    id: string;
    name: string;
    kind: WeaponKind;
    damage: number;
    reach: number;     // attack radius in world px
    flavor: string;
    forge: string;     // how it comes to you
    cost?: {
        iron?: number;
        copper?: number;
        cosmic?: number;
    };
}

// Ordered, lowest -> highest. Your tier = how many guardians you've felled.
export const WEAPON_TIERS: Weapon[] = [
    {
        id: 'wood_staff', name: 'Wooden Staff', kind: 'staff', damage: 12, reach: 30,
        flavor: 'A branch from a tree that has touched the Source. It strikes the spirit, not the flesh.',
        forge: 'Cut a living branch, strip it bare, and speak your true name into the wood.',
        cost: {}
    },
    {
        id: 'ironwood_stave', name: 'Ironwood Stave', kind: 'staff', damage: 17, reach: 31,
        flavor: 'The same branch, hardened by your grip and your first victory.',
        forge: 'Forge using Giza Iron Ore to harden your staff.',
        cost: { iron: 3 }
    },
    {
        id: 'bronze_cudgel', name: 'Bronze Cudgel', kind: 'blade', damage: 22, reach: 29,
        flavor: 'Heavier, surer — it bites deeper into the dark.',
        forge: 'Forge using St. Louis Copper Sheets to cast a bronze edge.',
        cost: { copper: 2 }
    },
    {
        id: 'iron_blade', name: 'Iron Blade', kind: 'blade', damage: 28, reach: 29,
        flavor: 'A true edge now. It cuts what binds a soul, never what breathes.',
        forge: 'Tempered at the anvil using both Giza Iron and St. Louis Copper.',
        cost: { iron: 4, copper: 2 }
    },
    {
        id: 'sword_light', name: 'Sword of Light', kind: 'sword', damage: 36, reach: 32,
        flavor: 'A blade of pure conviction. The dark cannot abide its edge.',
        forge: 'Ignite the ultimate steel at the anvil using Cosmic Shards from the Emerald Halls.',
        cost: { cosmic: 5 }
    },
];

export const WEAPON_BY_ID: Record<string, Weapon> = WEAPON_TIERS.reduce((acc, w) => {
    acc[w.id] = w;
    return acc;
}, {} as Record<string, Weapon>);

export const STARTER_WEAPON = WEAPON_TIERS[0];
export const STARTER_WEAPONS = [WEAPON_TIERS[0]];

/**
 * @deprecated Auto-tempering has been deprecated. Use character.equipped.weapon instead.
 */
export function weaponForTier(tier: number): Weapon {
    return WEAPON_TIERS[Math.max(0, Math.min(WEAPON_TIERS.length - 1, tier))];
}
