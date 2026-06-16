// ============================================================
//  CUTSCENES — video-first. Onboarding uses *-cinema.mp4 (with
//  ambient audio). No static image fallbacks on title/setup flow.
// ============================================================

export interface CutsceneDef {
    id: string;
    frames: { src: string; durationMs: number; caption?: string }[];
    video?: string;
    line?: string;
}

const BASE = '/assets/cutscenes';

/** Full-screen looping cinema clips with embedded audio (onboarding + title) */
export const CINEMA = {
    landing: `${BASE}/title-cinema.mp4?v=4`,
    awakening: `${BASE}/awakening-cinema.mp4?v=4`,
    forging: `${BASE}/forging-cinema.mp4?v=4`,
    paths: `${BASE}/paths-cinema.mp4?v=4`,
} as const;

/** @deprecated use CINEMA */
export const BROLL = {
    landing: { video: CINEMA.landing },
    awakening: { video: CINEMA.awakening },
    forging: { video: CINEMA.forging },
    paths: { video: CINEMA.paths },
} as const;

function videoOnly(id: string, video: string, line?: string): CutsceneDef {
    return { id, frames: [], video, line };
}

function still(id: string, caption?: string, line?: string, durationMs = 4500): CutsceneDef {
    const src = `${BASE}/${id}.jpg`;
    const video = `${BASE}/${id}.mp4`;
    return {
        id,
        frames: [{ src, durationMs, caption }],
        video,
        line,
    };
}

export const CUTSCENES: Record<string, CutsceneDef> = {
    title: videoOnly('title', CINEMA.landing, 'They built a dream and called it the world.'),
    awakening: videoOnly('awakening', CINEMA.awakening, 'Something in you stirred.'),
    forging: videoOnly('forging', CINEMA.forging, 'Forge the vessel you will carry into the world.'),
    paths: videoOnly('paths', CINEMA.paths, 'Four roads lie before you. Choose with care.'),
    world: {
        id: 'world',
        frames: [],
        video: `${BASE}/world-crossroads.mp4`,
        line: 'Truth waits in the first cavern. Your journey begins.',
    },
    source: {
        id: 'source',
        frames: [],
        video: `${BASE}/source-return.mp4`,
        line: 'The five relics burn as one.',
    },

    dest_eden: still('dest-eden', 'Eden — Before the Fall', 'Walk softly — the ground here still remembers the Garden.'),
    dest_fair: still('dest-fair', 'St. Louis, 1904', 'Twelve hundred palaces of white, raised in a season — and torn down the next.'),
    dest_giza: still('dest-giza', 'Giza — The Engine of Stone', 'It has not stopped humming in five thousand years.'),
    dest_kolbrin: still('dest-kolbrin', 'The Kolbrin Vault', 'The monks hid these books from fire and from kings.'),
    dest_emerald: still('dest-emerald', 'The Emerald Halls', 'Thrice-great — in life, in death, and in what lies beyond both.'),

    combat_eden: still('combat-eden', 'The Cherub of the Flaming Sword', 'The way back is guarded. To pass, you must endure them.', 4000),
    combat_fair: still('combat-fair', 'The Caretaker of the Fair', 'The white halls are not empty. The Erased drift the corridors.', 4000),
    combat_giza: still('combat-giza', 'The Sentinel of Stone', 'Shades of those who died seeking its secret still guard the stone.', 4000),
    combat_kolbrin: still('combat-kolbrin', 'The Ink Shade', 'The Destroyer\'s name still sleeps in the runes.', 4000),
    combat_emerald: still('combat-emerald', 'Hermes Trismegistus', 'The keeper of the emerald threshold awaits.', 4000),
};

const DEST_CUTSCENE: Record<string, keyof typeof CUTSCENES> = {
    dest_eden: 'dest_eden',
    dest_fair: 'dest_fair',
    dest_giza: 'dest_giza',
    dest_kolbrin: 'dest_kolbrin',
    dest_emerald: 'dest_emerald',
};

const COMBAT_CUTSCENE: Record<string, keyof typeof CUTSCENES> = {
    dest_eden: 'combat_eden',
    dest_fair: 'combat_fair',
    dest_giza: 'combat_giza',
    dest_kolbrin: 'combat_kolbrin',
    dest_emerald: 'combat_emerald',
};

export function cutscene(id: keyof typeof CUTSCENES): CutsceneDef {
    return CUTSCENES[id];
}

export function cutsceneForDest(poiId: string): CutsceneDef | null {
    const key = DEST_CUTSCENE[poiId];
    return key ? CUTSCENES[key] : null;
}

export function cutsceneForCombat(poiId: string): CutsceneDef | null {
    const key = COMBAT_CUTSCENE[poiId];
    return key ? CUTSCENES[key] : null;
}