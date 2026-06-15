// ============================================================
//  DESTINATIONS — caverns & portals to old cities and eras.
//  Each overworld portal/cave opens a Destination: a themed
//  chamber with a topic guide (an NPC who goes deep) and relics
//  to claim. Content-as-data so each can be expanded into full
//  depth later without touching the engine.
// ============================================================

import type { Puzzle } from '@/lib/game/puzzles';

export type DestinationKind = 'portal' | 'cave';

export interface Relic {
    id: string;
    name: string;
    desc: string;
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
    victory: string;     // line on victory
}

export interface Destination {
    poiId: string;       // overworld POI id that opens this
    kind: DestinationKind;
    name: string;
    era: string;
    accent: string;      // theme colour
    bg: [string, string]; // background gradient stops
    guide: Guide;
    lore: LoreSection[];
    relics: Relic[];
    combat?: CombatConfig;
    puzzle?: Puzzle;
}

export const DESTINATIONS: Destination[] = [
    {
        poiId: 'dest_eden',
        kind: 'portal',
        name: 'Eden — Before the Fall',
        era: 'The First Garden · Before Time',
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
        relics: [{ id: 'relic_eden_leaf', name: 'Leaf of the Tree of Life', desc: 'A leaf that never withers. Carried by those who remember the Garden.' }],
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
        relics: [{ id: 'relic_fair_token', name: 'Fairgrounds Token', desc: 'Brass stamped with a building that no record admits ever stood.' }],
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
        relics: [{ id: 'relic_giza_shard', name: 'Shard of Casing Stone', desc: 'A sliver of the white limestone skin that once made the pyramid blaze like a mirror.' }],
        combat: {
            challenge: 'The chamber is not empty. Shades of those who died seeking its secret still guard the stone. Defend yourself.',
            enemyCount: 3,
            enemyHp: 28,
            enemyDmg: 11,
            bossName: 'The Sentinel of Stone',
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
        relics: [{ id: 'relic_kolbrin_folio', name: 'Folio of the Bronzebook', desc: 'A single page, bronze-leafed, warm to the touch as if recently read.' }],
        puzzle: {
            kind: 'sequence',
            id: 'puz_kolbrin',
            title: 'The Name of the Destroyer',
            prompt: 'Brother Caileph lays eight runes before you. "Scripture named the burning star that turns the waters bitter. Order the runes, and speak it."',
            hint: 'Revelation 8 — a great star fell, burning as a torch, and its name is called…',
            tokens: ['O', 'W', 'O', 'R', 'D', 'W', 'M', 'O'],
            solution: ['W', 'O', 'R', 'M', 'W', 'O', 'O', 'D'],
            solvedText: 'The runes blaze: WORMWOOD. The Bronzebook turns its own page.',
        },
    },
    {
        poiId: 'dest_emerald',
        kind: 'portal',
        name: 'The Emerald Halls',
        era: 'Khem · Thoth the Atlantean',
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
        relics: [{ id: 'relic_emerald_fragment', name: 'Fragment of the Emerald Tablet', desc: 'Green glass that holds light long after the room goes dark.' }],
        puzzle: {
            kind: 'sequence',
            id: 'puz_emerald',
            title: 'As Above, So Below',
            prompt: 'Hermes spreads the seven wanderers. "Order them as the ancients did — from the slowest and highest sphere to the swiftest and nearest. Do this, and you read the pattern of all things."',
            hint: 'Saturn is highest and slowest; the Moon is nearest and swiftest. The Chaldean order.',
            tokens: ['Sun', 'Moon', 'Mars', 'Saturn', 'Venus', 'Jupiter', 'Mercury'],
            solution: ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'],
            solvedText: 'The seven fall into their spheres. “As above,” he says, “so below.”',
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
