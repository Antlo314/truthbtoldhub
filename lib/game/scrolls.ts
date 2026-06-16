// ============================================================
//  SCROLLS — knowledge items that open sealed puzzles and lore.
//  Granted by chained quests; equippable like relics.
// ============================================================

export interface Scroll {
    id: string;
    name: string;
    desc: string;
    /** Puzzle families this scroll illuminates */
    puzzles: string[];
}

export const SCROLLS: Scroll[] = [
    {
        id: 'scroll_measure',
        name: 'Scroll of Measure',
        desc: 'A culled page on the geometry of Giza and the vanished fair — dial-seals yield their order to one who reads it.',
        puzzles: ['puz_giza', 'puz_fair'],
    },
    {
        id: 'scroll_wormwood',
        name: 'Scroll of the Bitter Star',
        desc: 'The Destroyer\'s name, turned in bronze ink. Cipher wheels answer to it.',
        puzzles: ['puz_kolbrin'],
    },
    {
        id: 'scroll_rivers',
        name: 'Scroll of the Four Rivers',
        desc: 'Genesis remembered in the old tongue — the waters of Eden fall into their true order.',
        puzzles: ['puz_eden'],
    },
    {
        id: 'scroll_stars',
        name: 'Scroll of the Seven Wanderers',
        desc: 'The Chaldean ladder from Saturn to Moon, traced for the Emerald Halls.',
        puzzles: ['puz_emerald'],
    },
    {
        id: 'scroll_resonance',
        name: 'Scroll of Resonance',
        desc: 'When relics answer one another, the world grows quieter. Every sealed thing speaks a little clearer.',
        puzzles: ['puz_eden', 'puz_fair', 'puz_giza', 'puz_kolbrin', 'puz_emerald'],
    },
];

export const SCROLL_BY_ID: Record<string, Scroll> = SCROLLS.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
}, {} as Record<string, Scroll>);

export function scrollHelpsPuzzle(scrollId: string | null, puzzleId: string): boolean {
    if (!scrollId) return false;
    const s = SCROLL_BY_ID[scrollId];
    return !!s?.puzzles.includes(puzzleId);
}