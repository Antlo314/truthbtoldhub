// ============================================================
//  DESTINATIONS — caverns & portals to old cities and eras.
//  Each overworld portal/cave opens a Destination: a themed
//  chamber with a topic guide (an NPC who goes deep) and relics
//  to claim. Content-as-data so each can be expanded into full
//  depth later without touching the engine.
// ============================================================

import type { Puzzle } from '@/lib/game/puzzles';

export type DestinationKind = 'portal' | 'cave';

export interface RelicPower {
    hp?: number;
    damage?: number;
    reach?: number;
    regen?: number;      // HP restored per second in combat
    lifesteal?: number;  // fraction of damage dealt healed back (0..1)
    crit?: number;       // chance (0..1) a strike lands for double
    knockback?: number;  // extra knockback on hit (world px)
    label: string;
}

export interface Relic {
    id: string;
    name: string;
    desc: string;
    power?: RelicPower;
}

export interface LoreSection {
    heading: string;
    body: string;
}

export interface Guide {
    name: string;
    role: string;
    tile: { col: number; row: number }; // Kenney char sheet tile
    intro: string;
}

export interface CombatConfig {
    challenge: string;   // line shown when the encounter begins
    enemyCount: number;
    enemyHp: number;
    enemyDmg: number;    // contact damage per second
    bossName: string;
    bossHp: number;
    bossDmg: number;
    bossArt?: BossArt;   // which guardian creature to draw
    victory: string;     // line on victory
}

export type BossArt = 'wraith' | 'golem' | 'serpent' | 'sentinel' | 'titan';

export interface Destination {
    poiId: string;       // overworld POI id that opens this
    kind: DestinationKind;
    name: string;
    era: string;
    accent: string;      // theme colour
    bg: [string, string]; // background gradient stops
    guide: Guide;
    lore: LoreSection[];
    /** Unlocked on revisit after the guardian falls */
    deepLore?: LoreSection;
    relics: Relic[];
    combat?: CombatConfig;
    puzzle?: Puzzle;
    clothing?: string;   // garment id (lib/game/clothing.ts) found here
}

export const DESTINATIONS: Destination[] = [
    {
        poiId: 'dest_eden',
        kind: 'portal',
        name: 'Eden — Before the Fall',
        era: 'The First Garden · Before Time',
        clothing: 'eden_leaf',
        accent: '#34d399',
        bg: ['#0a1f17', '#04100b'],
        guide: {
            name: 'The Gardener',
            role: 'Keeper of the First Garden',
            tile: { col: 0, row: 8 },
            intro: 'You have come a long way to stand where it began. Walk softly — the ground here still remembers a man who walked with the Source and was not ashamed.',
        },
        lore: [
            { heading: 'The Walk', body: 'Before the fall, Adam did not pray toward the Source — he walked beside it. There was no veil, no distance, no shame. This is the state you are trying to return to.' },
            { heading: 'The Fall', body: 'The fall was not a place you dropped from. It was a frequency you dropped to — from union into separation, from knowing into believing. Every lie of the world is built on that drop.' },
            { heading: 'The Way Back', body: 'You cannot climb back to Eden by effort. You return by laying down the cares of the world, one by one, until nothing stands between you and the Source.' },
        ],
        deepLore: { heading: 'On Second Passing', body: 'The Garden is quieter now. The cherubim do not lower their swords for everyone — only for those who remember that exile was a choice, not a sentence. Carry the leaf. It is the same tree.' },
        relics: [{ id: 'relic_eden_leaf', name: 'Leaf of the Tree of Life', desc: 'A leaf that never withers. Carried by those who remember the Garden.', power: { hp: 25, regen: 2, label: '+25 vitality · renews 2/s' } }],
        combat: {
            challenge: 'The way back is guarded. Cherubim with flaming swords bar the gate, as they have since the first exile. To pass, you must endure them.',
            enemyCount: 3,
            enemyHp: 26,
            enemyDmg: 10,
            bossName: 'The Cherub of the Flaming Sword',
            bossArt: 'sentinel',
            bossHp: 150,
            bossDmg: 19,
            victory: 'The flaming sword lowers. For the first time since the fall, the gate of the Garden stands open to you.',
        },
        puzzle: {
            kind: 'sequence',
            id: 'puz_eden',
            title: 'The Four Rivers',
            prompt: 'A river went out of Eden and parted into four heads. Name them in the order the first book gives them, and the garden will open its memory to you.',
            hint: 'Genesis 2 lists them in order; the last is the great river that waters Babylon.',
            tokens: ['Euphrates', 'Gihon', 'Pishon', 'Hiddekel'],
            solution: ['Pishon', 'Gihon', 'Hiddekel', 'Euphrates'],
            solvedText: 'The four waters run as one again. The way is open.',
        },
    },
    {
        poiId: 'dest_fair',
        kind: 'portal',
        name: 'St. Louis, 1904',
        era: 'Louisiana Purchase Exposition',
        clothing: 'fair_coat',
        accent: '#fbbf24',
        bg: ['#1c1606', '#0a0803'],
        guide: {
            name: 'Mabel Hart',
            role: 'Chronicler of the Fair',
            tile: { col: 0, row: 5 },
            intro: 'Welcome to the grandest city that ever vanished. Twelve hundred palaces of white, raised in a season — and torn down the next. They told you it was plaster. Look closer, child.',
        },
        lore: [
            { heading: 'The Ivory City', body: 'Palace after palace of impossible scale and ornament — and we are asked to believe they were temporary, built and demolished within two years. Ask who builds cathedrals to throw them away.' },
            { heading: 'The Light', body: 'The Fair ran on light no one could fully explain — a luminance the records soften and the photographs cannot quite hold. What was demonstrated there, and quietly retired?' },
            { heading: 'The Orphans', body: 'Children arrived by the trainload in those years, their origins blurred in the ledgers. A history is not only what is built. It is also what is conveniently forgotten.' },
        ],
        deepLore: { heading: 'On Second Passing', body: 'The Erased still drift, but they no longer reach for you. The Caretaker\'s ledger is ash. Walk the marble again — the light that powered this city was never electricity alone.' },
        relics: [{ id: 'relic_fair_token', name: 'Fairgrounds Token', desc: 'Brass stamped with a building that no record admits ever stood.', power: { hp: 15, damage: 2, crit: 0.14, label: '+15 vitality · +2 strike · 14% crit' } }],
        combat: {
            challenge: 'The white halls are not empty. The Erased — those the ledgers forgot — drift the corridors, and the Caretaker comes to keep his secret buried.',
            enemyCount: 4,
            enemyHp: 24,
            enemyDmg: 10,
            bossName: 'The Caretaker of the Fair',
            bossArt: 'wraith',
            bossHp: 165,
            bossDmg: 20,
            victory: 'The Caretaker fades, his ledger spilling burned pages across the marble. What was hidden is yours to read.',
        },
        puzzle: {
            kind: 'dials',
            id: 'puz_fair',
            title: 'The Year of the White City',
            prompt: 'The turnstile is locked to a year — the year the ivory city rose and, within a single season, was gone. Set the four dials.',
            hint: 'The Louisiana Purchase Exposition. Nineteen hundred and four.',
            dials: [
                { label: 'M', values: ['1', '2', '3'] },
                { label: 'C', values: ['7', '8', '9', '0'] },
                { label: 'X', values: ['0', '1', '2'] },
                { label: 'I', values: ['2', '3', '4', '5'] },
            ],
            solution: [0, 2, 0, 2],
            solvedText: 'The turnstile gives way. The gates of the Fair swing wide.',
        },
    },
    {
        poiId: 'dest_giza',
        kind: 'cave',
        name: 'Giza — The Engine of Stone',
        era: 'The Black Land · Age Unknown',
        clothing: 'giza_linen',
        accent: '#22d3ee',
        bg: ['#06181c', '#030c0e'],
        guide: {
            name: 'Khaemwaset',
            role: 'Keeper of the Stone',
            tile: { col: 1, row: 6 },
            intro: 'They call them tombs. No king was ever found within. Press your hand to the granite — feel it? It has not stopped humming in five thousand years.',
        },
        lore: [
            { heading: 'The Precision', body: 'Blocks the weight of locomotives, set with seams too fine for a blade, aligned to true north closer than your modern instruments. This is not a grave. It is a machine.' },
            { heading: 'The Hum', body: 'The King\'s Chamber answers a single note. Strike it and the whole room becomes an instrument. Whatever it was tuned to, the builders meant for it to resonate.' },
            { heading: 'The Question', body: 'The honest question is not how primitive men dragged these stones. It is why we were taught they were primitive at all.' },
        ],
        deepLore: { heading: 'On Second Passing', body: 'Press your palm to the seam again. The hum is steady now — it knows you. Whatever this engine measured, it was never the dead. It was the living frequency of the world before the lie.' },
        relics: [{ id: 'relic_giza_shard', name: 'Shard of Casing Stone', desc: 'A sliver of the white limestone skin that once made the pyramid blaze like a mirror.', power: { reach: 8, damage: 2, knockback: 8, label: '+8 reach · heavy knockback' } }],
        combat: {
            challenge: 'The chamber is not empty. Shades of those who died seeking its secret still guard the stone. Defend yourself.',
            enemyCount: 3,
            enemyHp: 28,
            enemyDmg: 11,
            bossName: 'The Sentinel of Stone',
            bossArt: 'golem',
            bossHp: 170,
            bossDmg: 20,
            victory: 'The guardian dissolves into dust and silence. The hum of the stone steadies — it has accepted you.',
        },
        puzzle: {
            kind: 'dials',
            id: 'puz_giza',
            title: 'The Measure of the Stone',
            prompt: 'Khaemwaset sets his hand on a seam in the wall. "It is a machine of measure. Set its order — the faces, the shafts, the chambers — and it will yield what it guards."',
            hint: 'Four faces. Two air-shafts. Three chambers.',
            dials: [
                { label: 'Faces', values: ['2', '3', '4', '5'] },
                { label: 'Shafts', values: ['1', '2', '3'] },
                { label: 'Chambers', values: ['1', '2', '3', '4'] },
            ],
            solution: [2, 1, 2],
            solvedText: 'The granite slides aside, humming. What it guarded waits within.',
        },
    },
    {
        poiId: 'dest_kolbrin',
        kind: 'cave',
        name: 'The Kolbrin Vault',
        era: 'Egyptian-Celtic Manuscript',
        clothing: 'kolbrin_cloak',
        accent: '#a855f7',
        bg: ['#160a1f', '#0a0410'],
        guide: {
            name: 'Brother Caileph',
            role: 'Culdee Scribe',
            tile: { col: 0, row: 11 },
            intro: 'The monks of my order hid these books from fire and from kings. The Kolbrin remembers what the approved histories were made to forget.',
        },
        lore: [
            { heading: 'The Bronzebook', body: 'Egyptian scribes recorded a flood, a wandering star, and a god of the dawn — accounts that run parallel to scripture yet older than the canon you were handed.' },
            { heading: 'The Destroyer', body: 'A red wanderer that returns in long ages, dragging fire and flood across the sky. The Kolbrin names it where your textbooks leave only silence and superstition.' },
            { heading: 'The Pattern', body: 'Read enough forbidden books and you stop seeing contradictions. You start seeing one story, told in many tongues, guarded by many hands.' },
        ],
        deepLore: { heading: 'On Second Passing', body: 'The water is still. WORMWOOD is not only a name — it is a cycle. The Destroyer returns when the world forgets it came before. You have not forgotten.' },
        relics: [{ id: 'relic_kolbrin_folio', name: 'Folio of the Bronzebook', desc: 'A single page, bronze-leafed, warm to the touch as if recently read.', power: { damage: 4, lifesteal: 0.2, label: '+4 strike · 20% lifesteal' } }],
        combat: {
            challenge: 'The vault remembers the flood. Shades of the drowned rise from the black water to keep the Bronzebook from unworthy hands.',
            enemyCount: 4,
            enemyHp: 28,
            enemyDmg: 11,
            bossName: "The Destroyer's Herald",
            bossArt: 'serpent',
            bossHp: 190,
            bossDmg: 22,
            victory: 'The herald sinks back beneath the still black water. The Bronzebook lies open, and unguarded.',
        },
        puzzle: {
            kind: 'cipher',
            id: 'puz_kolbrin',
            title: 'The Name of the Destroyer',
            prompt: 'Brother Caileph sets a brass wheel before you. "Scripture sealed the name of the burning star behind a turning of the letters. Find the turning, and the name will read true."',
            hint: 'Revelation 8 — the third angel; the great star that falls and makes the waters bitter. Turn the wheel three steps and read.',
            cipherText: 'ZRUPZRRG',
            shift: 3,
            solvedText: 'The letters wheel into place: WORMWOOD. The Bronzebook turns its own page.',
        },
    },
    {
        poiId: 'dest_emerald',
        kind: 'portal',
        name: 'The Emerald Halls',
        era: 'Khem · Thoth the Atlantean',
        clothing: 'emerald_vestment',
        accent: '#10b981',
        bg: ['#04140f', '#020a07'],
        guide: {
            name: 'Hermes Trismegistus',
            role: 'The Thrice-Great',
            tile: { col: 1, row: 11 },
            intro: 'Thrice-great, they named me — in life, in death, and in what lies beyond both. You hold the question every age has carried to these halls. Ask it.',
        },
        lore: [
            { heading: 'As Above', body: '"That which is below is as that which is above." The pattern of the heavens is written in the cell, in the seed, in you. Learn the pattern and you read all things.' },
            { heading: 'The Tablets', body: 'Thirteen tablets of imperishable emerald, recording a science of mind and matter older than the flood. Most who quote them have never stood where they are kept.' },
            { heading: 'The Light Within', body: 'The Source you are walking back toward was never far. It is the light the body was built to house. "Man, know thyself, and thou shalt know the All."' },
        ],
        deepLore: { heading: 'On Second Passing', body: 'The Threshold remembers you. The seven wanderers still hang above — but now you read them as a sentence, not a scatter. As above, so below. So within.' },
        relics: [{ id: 'relic_emerald_fragment', name: 'Fragment of the Emerald Tablet', desc: 'Green glass that holds light long after the room goes dark.', power: { damage: 6, crit: 0.18, label: '+6 strike · 18% crit' } }],
        combat: {
            challenge: 'No one reads the Tablets unchallenged. The thought-forms of every age that ever sought them rise — and the Guardian of the Threshold rises with them.',
            enemyCount: 4,
            enemyHp: 30,
            enemyDmg: 12,
            bossName: 'The Guardian of the Threshold',
            bossArt: 'titan',
            bossHp: 230,
            bossDmg: 24,
            victory: 'The Guardian inclines its head and unmakes itself. "Pass," says Hermes. "You have earned the All."',
        },
        puzzle: {
            kind: 'constellation',
            id: 'puz_emerald',
            title: 'As Above, So Below',
            prompt: 'Hermes lifts his hand to the painted sky. "The seven wanderers hang in no order to the eye. Trace them as the ancients did — from the highest, slowest sphere down to the nearest and swiftest — and you draw the pattern of all things."',
            hint: 'Saturn is highest and slowest; the Moon is nearest and swiftest. The Chaldean order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon.',
            stars: [
                { label: 'Saturn', x: 18, y: 15 },
                { label: 'Jupiter', x: 44, y: 27 },
                { label: 'Mars', x: 73, y: 19 },
                { label: 'Sun', x: 55, y: 48 },
                { label: 'Venus', x: 27, y: 63 },
                { label: 'Mercury', x: 71, y: 67 },
                { label: 'Moon', x: 47, y: 86 },
            ],
            solution: ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'],
            solvedText: 'The seven blaze into their spheres and the line runs true. “As above,” he says, “so below.”',
        },
    },
];

export const DEST_BY_POI: Record<string, Destination> = DESTINATIONS.reduce((acc, d) => {
    acc[d.poiId] = d;
    return acc;
}, {} as Record<string, Destination>);

export const RELIC_BY_ID: Record<string, Relic & { from: string }> = DESTINATIONS.reduce((acc, d) => {
    for (const r of d.relics) acc[r.id] = { ...r, from: d.name };
    return acc;
}, {} as Record<string, Relic & { from: string }>);

// Every relic in the world — the full set a soul must gather before the
// way to the Source opens (the endgame gate).
export const ALL_RELIC_IDS: string[] = DESTINATIONS.flatMap((d) => d.relics.map((r) => r.id));

export function hasAllRelics(inventory: string[]): boolean {
    return ALL_RELIC_IDS.length > 0 && ALL_RELIC_IDS.every((id) => inventory.includes(id));
}

export interface CombatBonuses {
    hp: number; damage: number; reach: number;
    regen: number; lifesteal: number; crit: number; knockback: number;
}

/**
 * @deprecated Use combatRelicBonuses(inventory, equippedRelic) in resonance.ts instead.
 * This is left here to prevent circular dependencies.
 */
export function relicBonuses(inventory: string[]): CombatBonuses {
    const b: CombatBonuses = { hp: 0, damage: 0, reach: 0, regen: 0, lifesteal: 0, crit: 0, knockback: 0 };
    for (const id of inventory) {
        const p = RELIC_BY_ID[id]?.power;
        if (!p) continue;
        b.hp += p.hp || 0;
        b.damage += p.damage || 0;
        b.reach += p.reach || 0;
        b.regen += p.regen || 0;
        b.lifesteal += p.lifesteal || 0;
        b.crit += p.crit || 0;
        b.knockback += p.knockback || 0;
    }
    return b;
}
