// ============================================================
//  WEAPONS — your first is found or forged under Truth's guidance.
//  Weapons strike the spirit, not the flesh (enemies are shades).
// ============================================================

export type WeaponKind = 'staff' | 'sling' | 'blade';

export interface Weapon {
    id: string;
    name: string;
    kind: WeaponKind;
    damage: number;
    reach: number;     // attack radius in world px
    flavor: string;    // Truth's framing
    forge: string;     // how you find / build it
}

export const STARTER_WEAPONS: Weapon[] = [
    {
        id: 'staff_awakened',
        name: 'Staff of the Awakened',
        kind: 'staff',
        damage: 15,
        reach: 30,
        flavor: 'A branch from a tree that has touched the Source. It strikes the spirit, not the flesh.',
        forge: 'Cut a living branch, strip it bare, and speak your true name into the wood.',
    },
    {
        id: 'sling_shepherd',
        name: "The Shepherd's Sling",
        kind: 'sling',
        damage: 13,
        reach: 38,
        flavor: 'The weapon of a boy who felled a giant with five smooth stones and no fear at all.',
        forge: 'Braid a cord, cradle a stone, and let the Source guide what your hand releases.',
    },
    {
        id: 'blade_light',
        name: 'Blade of Light',
        kind: 'blade',
        damage: 18,
        reach: 26,
        flavor: 'A blade quenched in conviction. It cuts what binds a soul, never what breathes.',
        forge: 'Temper iron in still water, and carry it only ever for the defense of the weak.',
    },
];

export const WEAPON_BY_ID: Record<string, Weapon> = STARTER_WEAPONS.reduce((acc, w) => {
    acc[w.id] = w;
    return acc;
}, {} as Record<string, Weapon>);
