/**
 * What a soul can carry on the plain. Food heals, water and figs restore
 * breath, oil anoints (Matthew 6:17), what the creatures leave behind can
 * be sold to Lydia — and the armour Paul names in Ephesians 6 is worn.
 *
 * Icons are lucide glyphs on tinted tiles (components/world/ItemIcon.tsx),
 * so every item reads the same way the OS's apps do.
 */

export type ItemKind = 'food' | 'drink' | 'oil' | 'material' | 'weapon' | 'armor';
export type EquipSlot = 'weapon' | 'belt' | 'breastplate' | 'shoes' | 'shield' | 'helmet';

export type ItemDef = {
    id: string;
    name: string;
    kind: ItemKind;
    blurb: string;
    /** lucide icon name, resolved in ItemIcon */
    icon: string;
    /** tile tint */
    tint: string;
    /** buy price at Lydia's stall (0 = not sold) */
    price: number;
    /** what Lydia pays for one */
    sell: number;
    /** food: hp healed (instant), hot: healed over 8 s */
    heal?: number;
    hot?: number;
    /** drink: stamina restored */
    breath?: number;
    /** equipment */
    slot?: EquipSlot;
    /** weapon base damage and reach (m) */
    damage?: number;
    reach?: number;
    /** armour: damage taken reduced by this fraction */
    guard?: number;
    /** flat bonuses */
    maxHp?: number;
    maxStamina?: number;
    speed?: number;
    /** the scripture it carries */
    verse?: string;
};

const T = {
    food: '#f59e0b',
    drink: '#38bdf8',
    oil: '#eab308',
    mat: '#a8a29e',
    weapon: '#fbbf24',
    armor: '#a78bfa',
};

export const ITEMS: Record<string, ItemDef> = {
    bread: { id: 'bread', name: 'Bread', kind: 'food', blurb: 'A barley loaf. Restores 35 vitality.', icon: 'Wheat', tint: T.food, price: 6, sell: 2, heal: 35, verse: 'Give us this day our daily bread. — Matthew 6:11' },
    fish: { id: 'fish', name: 'Fish', kind: 'food', blurb: 'Salted, from the Still Water. Restores 55 vitality.', icon: 'Fish', tint: T.food, price: 10, sell: 3, heal: 55 },
    figs: { id: 'figs', name: 'Figs', kind: 'food', blurb: 'Sweet and quick. Restores 18 vitality and 40 breath.', icon: 'Cherry', tint: T.food, price: 4, sell: 1, heal: 18, breath: 40 },
    honey: { id: 'honey', name: 'Wild honey', kind: 'food', blurb: 'Locusts optional. Restores 80 vitality over eight seconds.', icon: 'Hexagon', tint: T.food, price: 14, sell: 5, hot: 80, verse: 'His meat was locusts and wild honey. — Matthew 3:4' },
    water: { id: 'water', name: 'Water skin', kind: 'drink', blurb: 'Fills your lungs again — restores all breath. Allowed while fasting.', icon: 'Droplets', tint: T.drink, price: 3, sell: 1, breath: 999 },
    oil: { id: 'oil', name: 'Olive oil', kind: 'oil', blurb: 'Anoint your head. Used early in a fast, the fast is kept in secret — double its reward.', icon: 'FlaskConical', tint: T.oil, price: 12, sell: 4, verse: 'But thou, when thou fastest, anoint thine head, and wash thy face. — Matthew 6:17' },

    pelt: { id: 'pelt', name: 'Wolf pelt', kind: 'material', blurb: 'From a hollow wolf. Lydia pays well.', icon: 'PawPrint', tint: T.mat, price: 0, sell: 9 },
    gel: { id: 'gel', name: 'Mire gel', kind: 'material', blurb: 'What a slime leaves. Faintly warm.', icon: 'Droplet', tint: '#f472b6', price: 0, sell: 3 },
    spore: { id: 'spore', name: 'Spore cap', kind: 'material', blurb: 'From the spore-kin of the hollow.', icon: 'Sprout', tint: '#86efac', price: 0, sell: 4 },
    essence: { id: 'essence', name: 'Shade essence', kind: 'material', blurb: 'Cold to the touch. Gone by morning if you let it.', icon: 'Ghost', tint: '#c4b5fd', price: 0, sell: 12 },
    wisp: { id: 'wisp', name: 'Wisp light', kind: 'material', blurb: 'A glow from the summit wisps.', icon: 'Sparkle', tint: '#67e8f9', price: 0, sell: 10 },
    horn: { id: 'horn', name: 'Bull horn', kind: 'material', blurb: 'Only from a bull you angered.', icon: 'Triangle', tint: T.mat, price: 0, sell: 18 },

    staff_shepherd: { id: 'staff_shepherd', name: "Shepherd's staff", kind: 'weapon', slot: 'weapon', blurb: 'Plain wood with a crook. It has guided more than it has struck.', icon: 'Wand', tint: T.weapon, price: 0, sell: 0, damage: 11, reach: 2.4, verse: 'Thy rod and thy staff they comfort me. — Psalm 23:4' },
    staff_oak: { id: 'staff_oak', name: 'Oak staff', kind: 'weapon', slot: 'weapon', blurb: 'Heavier, truer. +damage.', icon: 'Wand', tint: '#d97706', price: 45, sell: 15, damage: 16, reach: 2.5 },
    staff_iron: { id: 'staff_iron', name: 'Iron-shod staff', kind: 'weapon', slot: 'weapon', blurb: 'Bound in iron at both ends.', icon: 'WandSparkles', tint: '#94a3b8', price: 110, sell: 35, damage: 22, reach: 2.6 },
    sword_spirit: { id: 'sword_spirit', name: 'Sword of the Spirit', kind: 'weapon', slot: 'weapon', blurb: 'Light as a word and sharper. Earned, not bought.', icon: 'Sword', tint: '#fde68a', price: 0, sell: 0, damage: 30, reach: 2.7, verse: 'And the sword of the Spirit, which is the word of God. — Ephesians 6:17' },

    belt_truth: { id: 'belt_truth', name: 'Belt of Truth', kind: 'armor', slot: 'belt', blurb: '+30 breath.', icon: 'CircleDot', tint: T.armor, price: 60, sell: 20, maxStamina: 30, verse: 'Having your loins girt about with truth. — Ephesians 6:14' },
    breastplate: { id: 'breastplate', name: 'Breastplate of Righteousness', kind: 'armor', slot: 'breastplate', blurb: 'Takes 15% of every blow.', icon: 'ShieldHalf', tint: T.armor, price: 130, sell: 40, guard: 0.15, verse: 'And having on the breastplate of righteousness. — Ephesians 6:14' },
    shoes_peace: { id: 'shoes_peace', name: 'Shoes of Peace', kind: 'armor', slot: 'shoes', blurb: 'You walk 8% faster.', icon: 'Footprints', tint: T.armor, price: 70, sell: 22, speed: 0.08, verse: 'Your feet shod with the preparation of the gospel of peace. — Ephesians 6:15' },
    shield_faith: { id: 'shield_faith', name: 'Shield of Faith', kind: 'armor', slot: 'shield', blurb: 'Hold C to raise it: blows from the front lose 70% of their force.', icon: 'Shield', tint: T.armor, price: 120, sell: 38, verse: 'Taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked. — Ephesians 6:16' },
    helmet: { id: 'helmet', name: 'Helmet of Salvation', kind: 'armor', slot: 'helmet', blurb: '+30 vitality.', icon: 'HardHat', tint: T.armor, price: 110, sell: 35, maxHp: 30, verse: 'And take the helmet of salvation. — Ephesians 6:17' },
};

export const item = (id: string): ItemDef | null => ITEMS[id] ?? null;

/** Lydia's shelf, in the order she lays it out */
export const SHOP_STOCK = ['bread', 'fish', 'figs', 'water', 'oil', 'honey', 'staff_oak', 'staff_iron', 'belt_truth', 'shoes_peace', 'helmet', 'shield_faith', 'breastplate'];

export const EQUIP_SLOTS: { slot: EquipSlot; label: string }[] = [
    { slot: 'weapon', label: 'Hand' },
    { slot: 'shield', label: 'Shield' },
    { slot: 'helmet', label: 'Helmet' },
    { slot: 'breastplate', label: 'Breastplate' },
    { slot: 'belt', label: 'Belt' },
    { slot: 'shoes', label: 'Shoes' },
];

export const isConsumable = (d: ItemDef | null) => !!d && (d.kind === 'food' || d.kind === 'drink' || d.kind === 'oil');
export const isEquipment = (d: ItemDef | null) => !!d && !!d.slot;

/** What a fresh soul walks out with */
export const STARTING_BAG: Record<string, number> = { staff_shepherd: 1, bread: 3, water: 2 };
