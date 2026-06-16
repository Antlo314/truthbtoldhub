// ============================================================
//  CUTSCENES — cinematic key art + Ken Burns / video clips.
//  Images live in public/assets/cutscenes/. Videos are optional
//  MP4 companions generated from the same frames.
// ============================================================

export interface CutsceneDef {
    id: string;
    /** Still frame(s) for the slideshow player */
    frames: { src: string; durationMs: number; caption?: string }[];
    /** Optional single-file video (browser-native playback) */
    video?: string;
    /** Ambient line shown during playback */
    line?: string;
}

const BASE = '/assets/cutscenes';

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
    title: {
        id: 'title',
        frames: [{ src: `${BASE}/title-bg.jpg`, durationMs: 0 }],
        video: `${BASE}/title-intro.mp4`,
        line: 'They built a dream and called it the world.',
    },
    awakening: {
        id: 'awakening',
        frames: [
            { src: `${BASE}/cutscene-awakening-eyes.jpg`, durationMs: 3200, caption: '…' },
            { src: `${BASE}/cutscene-awakening-truth.jpg`, durationMs: 4800, caption: 'Truth waits in the dark.' },
        ],
        video: `${BASE}/cutscene-awakening.mp4`,
    },
    forging: {
        id: 'forging',
        frames: [{ src: `${BASE}/cutscene-chapter-forging.jpg`, durationMs: 4500, caption: 'Chapter II · The Forging of Self' }],
        video: `${BASE}/chapter-forging.mp4`,
        line: 'Forge the vessel you will carry into the world.',
    },
    paths: {
        id: 'paths',
        frames: [{ src: `${BASE}/cutscene-chapter-paths.jpg`, durationMs: 4500, caption: 'Chapter III · The Four Paths' }],
        video: `${BASE}/chapter-paths.mp4`,
        line: 'Four roads lie before you. Choose with care.',
    },
    world: {
        id: 'world',
        frames: [{ src: `${BASE}/cutscene-world-crossroads.jpg`, durationMs: 5000, caption: 'Enter the Cavern' }],
        video: `${BASE}/world-crossroads.mp4`,
        line: 'Truth waits in the first cavern. Your journey begins.',
    },
    source: {
        id: 'source',
        frames: [{ src: `${BASE}/cutscene-source-return.jpg`, durationMs: 0 }],
        video: `${BASE}/source-return.mp4`,
        line: 'The five relics burn as one.',
    },

    // ---- destination entry (portal / cavern) ----
    dest_eden: still('dest-eden', 'Eden — Before the Fall', 'Walk softly — the ground here still remembers the Garden.'),
    dest_fair: still('dest-fair', 'St. Louis, 1904', 'Twelve hundred palaces of white, raised in a season — and torn down the next.'),
    dest_giza: still('dest-giza', 'Giza — The Engine of Stone', 'It has not stopped humming in five thousand years.'),
    dest_kolbrin: still('dest-kolbrin', 'The Kolbrin Vault', 'The monks hid these books from fire and from kings.'),
    dest_emerald: still('dest-emerald', 'The Emerald Halls', 'Thrice-great — in life, in death, and in what lies beyond both.'),

    // ---- combat preludes (guardian encounters) ----
    combat_eden: still('combat-eden', 'The Cherub of the Flaming Sword', 'The way back is guarded. To pass, you must endure them.', 4000),
    combat_fair: still('combat-fair', 'The Caretaker of the Fair', 'The white halls are not empty. The Erased drift the corridors.', 4000),
    combat_giza: still('combat-giza', 'The Sentinel of Stone', 'Shades of those who died seeking its secret still guard the stone.', 4000),
    combat_kolbrin: still('combat-kolbrin', "The Destroyer's Herald", 'The vault remembers the flood.', 4000),
    combat_emerald: still('combat-emerald', 'The Guardian of the Threshold', 'No one reads the Tablets unchallenged.', 4000),
};

/** Maps destination poiId -> entry cutscene id */
export const DEST_CUTSCENE: Record<string, keyof typeof CUTSCENES> = {
    dest_eden: 'dest_eden',
    dest_fair: 'dest_fair',
    dest_giza: 'dest_giza',
    dest_kolbrin: 'dest_kolbrin',
    dest_emerald: 'dest_emerald',
};

/** Maps destination poiId -> combat prelude cutscene id */
export const COMBAT_CUTSCENE: Record<string, keyof typeof CUTSCENES> = {
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