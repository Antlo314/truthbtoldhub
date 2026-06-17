// ============================================================
//  CLOTHING — found gear that strengthens the soul.
//  Every initiate begins in the same plain garment. Deeper in the
//  world, garments are FOUND (awarded at destinations) that add to
//  your health and might — the same passive-bonus pattern as relics
//  (lib/game/destinations.ts relicBonuses) and skills. A few also
//  grant a one-time skill point when first found ("adds to the
//  skill tree"). Clothing is functional, shown in the wardrobe; it
//  is not a visual sprite layer (Kenney avatars are pre-drawn).
// ============================================================

export interface ClothingPower {
    hp?: number;
    damage?: number;
    reach?: number;
    regen?: number;
    label: string;
}

export interface ClothingItem {
    id: string;
    name: string;
    desc: string;
    from: string;                 // where it's found ('Start' for the default)
    power?: ClothingPower;        // passive combat bonus while worn
    skillPointsOnFind?: number;   // one-time skill points granted when first found
}

export const STARTER_CLOTHING = 'plain';

export const CLOTHING: ClothingItem[] = [
    {
        id: 'plain',
        name: 'Plain Garments',
        desc: 'The simple woven cloth every initiate is given at the threshold. It hides nothing and grants nothing — only a beginning.',
        from: 'Start',
    },
    {
        id: 'eden_leaf',
        name: 'Leafweave Mantle',
        desc: 'Living leaves from the first garden, woven while still green. They never wither, and the body beneath them remembers Eden.',
        from: 'Eden',
        power: { hp: 20, label: '+20 vitality' },
    },
    {
        id: 'fair_coat',
        name: 'Exposition Coat',
        desc: 'A tailored coat from the ivory city of 1904 — cut for a future that never arrived. Wearing it sharpens the will.',
        from: 'St. Louis, 1904',
        power: { hp: 12, damage: 2, label: '+12 vitality, +2 might' },
        skillPointsOnFind: 1,
    },
    {
        id: 'giza_linen',
        name: 'Linen of the Stone',
        desc: 'Funerary linen wound by hands that knew the engine of Giza. Cool as the inner chamber, it steadies the heart against fear.',
        from: 'Giza',
        power: { hp: 25, label: '+25 vitality' },
    },
    {
        id: 'kolbrin_cloak',
        name: 'Bronzebook Cloak',
        desc: 'A Culdee traveller’s cloak, its hem inked with warnings from the Bronzebook. It turns more than weather.',
        from: 'The Kolbrin Vault',
        power: { hp: 18, damage: 3, label: '+18 vitality, +3 might' },
    },
    {
        id: 'emerald_vestment',
        name: 'Hermetic Vestment',
        desc: 'A vestment of the Thrice-Great, green as the Emerald tablet. It draws a steady thread of the Source through the one who wears it.',
        from: 'The Emerald Halls',
        power: { hp: 22, damage: 2, regen: 1, label: '+22 vitality, +2 might, +1 renewal/s' },
    },
    // Supporter garments — granted via Stripe patronage (lib/donationTiers.ts)
    {
        id: 'supporter_frequency',
        name: 'Frequency Vest',
        desc: 'Woven for patrons who keep the 400 frequency alive. The threads hum with the soundtrack of the movement.',
        from: 'Patron Gift',
        power: { hp: 10, damage: 1, label: '+10 vitality, +1 might' },
    },
    {
        id: 'supporter_chronicle',
        name: 'Chronicle Cloak',
        desc: 'A chronicler\'s cloak — inked with storyboard stills and frames the world has not yet seen.',
        from: 'Patron Gift',
        power: { hp: 15, damage: 2, label: '+15 vitality, +2 might' },
    },
    {
        id: 'supporter_oracle',
        name: 'Oracle Mantle',
        desc: 'Gold-threaded mantle of the Vision Supporters. Those who wear it are seen in the sanctum.',
        from: 'Patron Gift',
        power: { hp: 22, damage: 3, label: '+22 vitality, +3 might' },
    },
    {
        id: 'supporter_prophetic',
        name: 'Prophetic Vestment',
        desc: 'The inner-circle weave — prophetic gold and renewal. Truth Circle souls carry this into every fight.',
        from: 'Patron Gift',
        power: { hp: 30, damage: 5, regen: 1, label: '+30 vitality, +5 might, +1 renewal/s' },
    },
];

export const CLOTHING_BY_ID: Record<string, ClothingItem> = CLOTHING.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
}, {} as Record<string, ClothingItem>);

// The passive combat bonus from the garment a soul is wearing.
// Stacks with relicBonuses() / skillBonuses() / founderBonuses().
export function clothingBonus(id: string | null | undefined): { hp: number; damage: number; reach: number; regen: number } {
    const p = id ? CLOTHING_BY_ID[id]?.power : undefined;
    return { hp: p?.hp || 0, damage: p?.damage || 0, reach: p?.reach || 0, regen: p?.regen || 0 };
}
