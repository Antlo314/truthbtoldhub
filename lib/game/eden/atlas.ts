// ============================================================
//  EDEN ATLAS — the canonical contract for the whole garden.
//
//  Every Eden subsystem (overworld map, level state, bestiary,
//  cultivation, serpent arc, day cycle, codex, renderer) reads
//  its coordinates, region rectangles, biome palettes and
//  persistence-key conventions from THIS file. If a coordinate
//  or region needs to change, it changes here and nowhere else.
//
//  Coordinate system: tile grid, gx ∈ [0, W), gy ∈ [0, H).
//  North (the Tree of Life / sanctum) is LOW gy. South (the
//  Threshold / spawn) is HIGH gy. Centre column is gx ≈ 48.
//
//  Persistence: Eden has NO tables of its own. All progress is
//  append-only string keys pushed into character.discovered[]
//  via onDiscover(). Use edenKey()/EDEN_KEYS helpers below so
//  every module agrees on the exact strings.
// ============================================================

export const EDEN_MAP_W = 96;
export const EDEN_MAP_H = 72;
export const EDEN_TILE = 16;

/** Hash → [0,1), deterministic. Shared by map gen & decor scatter. */
export function edenHash(c: number, r: number, s = 0): number {
    let x = (c * 374761393 + r * 668265263 + s * 2246822519) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// ------------------------------------------------------------
//  Tile coordinate helper
// ------------------------------------------------------------
export interface Tile { gx: number; gy: number; }
export const tile = (gx: number, gy: number): Tile => ({ gx, gy });
/** World-pixel centre of a tile. */
export const tileCx = (gx: number) => (gx + 0.5) * EDEN_TILE;
export const tileCy = (gy: number) => (gy + 0.5) * EDEN_TILE;

// ============================================================
//  REGIONS — a clean 3×3 grid of biomes + a top sanctum band
//  and a bottom threshold band. Rectangles are inclusive and
//  tile the whole walkable interior (the border is forest).
// ============================================================

export type EdenRegionId =
    | 'threshold'        // S-centre — entry, spawn, the Gardener
    | 'outer_grove'      // SW — orchard, naming the creatures
    | 'eastern_garden'   // SE — abundance, cultivation beds
    | 'pishon'           // W-mid — gold of Havilah (amber)
    | 'verge'            // centre — the Forbidden Verge, Tree of Knowledge
    | 'gihon'            // E-mid — springs of Cush (teal)
    | 'hiddekel'         // NW — the swift water, Assyria (violet-stone)
    | 'antechamber'      // N-centre — Cherub gate + Tree of Life sanctum
    | 'euphrates';       // NE — the great river (golden-green)

export interface EdenBiome {
    /** 3 grass/ground shades for the baked ground layer. */
    grass: [string, string, string];
    dirt: string;
    water: string;
    /** Region accent (UI chrome, markers, particles). */
    accent: string;
    /** Tree canopy + trunk colours for this biome's decor. */
    canopy: string;
    trunk: string;
    /** Decor density 0..1 (chance per open tile to grow a tree/bush). */
    density: number;
    /** Ambient particle tint. */
    motes: string;
}

export interface EdenRegion {
    id: EdenRegionId;
    name: string;
    /** Inclusive tile rect [gx0, gy0, gx1, gy1]. */
    rect: [number, number, number, number];
    /** River this region embodies, if any (drives guardian + fountain). */
    river?: EdenRiverId;
    biome: EdenBiome;
    /** One-line flavour shown when first entering the region. */
    enter: string;
}

// Biome palettes — each region reads visibly distinct.
const BIOME: Record<EdenRegionId, EdenBiome> = {
    threshold: {
        grass: ['#5d9e41', '#6bb04c', '#549238'], dirt: '#b58a52', water: '#1e4d7a',
        accent: '#34d399', canopy: '#2e6a30', trunk: '#6e4a28', density: 0.05, motes: '#fbbf24',
    },
    outer_grove: {
        grass: ['#4f9a3a', '#5fac46', '#478832'], dirt: '#a87f4b', water: '#1e4d7a',
        accent: '#86efac', canopy: '#256b2c', trunk: '#5f3f22', density: 0.14, motes: '#bbf7d0',
    },
    eastern_garden: {
        grass: ['#6fb04a', '#7ec257', '#629c3f'], dirt: '#caa15e', water: '#2a6f8f',
        accent: '#fde68a', canopy: '#3a7d33', trunk: '#7a5128', density: 0.08, motes: '#fde68a',
    },
    pishon: {
        grass: ['#8a8a3e', '#9c9b48', '#7a7a36'], dirt: '#c9a23a', water: '#2f6f7a',
        accent: '#fbbf24', canopy: '#6b7a2e', trunk: '#7a5a24', density: 0.10, motes: '#fcd34d',
    },
    verge: {
        grass: ['#5b6b4a', '#677a54', '#4f5d40'], dirt: '#8a6a4a', water: '#243b52',
        accent: '#ef4444', canopy: '#3a4a2c', trunk: '#4a3320', density: 0.12, motes: '#fca5a5',
    },
    gihon: {
        grass: ['#3f9a86', '#49ac96', '#368877'], dirt: '#6fa18a', water: '#0e7490',
        accent: '#22d3ee', canopy: '#1f6b5e', trunk: '#3f5f4f', density: 0.13, motes: '#67e8f9',
    },
    hiddekel: {
        grass: ['#6a5f8a', '#776b9c', '#5d537a'], dirt: '#7a6a8a', water: '#3b3b7a',
        accent: '#a855f7', canopy: '#4a3f6b', trunk: '#4a3a5a', density: 0.11, motes: '#c4b5fd',
    },
    antechamber: {
        grass: ['#4a7a5a', '#568a66', '#406b50'], dirt: '#9a8a6a', water: '#1e4d7a',
        accent: '#34d399', canopy: '#2e6a45', trunk: '#6e4a28', density: 0.06, motes: '#a7f3d0',
    },
    euphrates: {
        grass: ['#7a9a3e', '#8aac48', '#6c8836'], dirt: '#b5993a', water: '#2a7f6f',
        accent: '#10b981', canopy: '#4a7a2e', trunk: '#6a5224', density: 0.12, motes: '#86efac',
    },
};

export const EDEN_REGIONS: EdenRegion[] = [
    { id: 'hiddekel', name: 'The Swift Water', river: 'hiddekel', rect: [2, 2, 31, 21], biome: BIOME.hiddekel,
        enter: 'The Hiddekel runs swift toward Assyria. Here the garden quickens — and so must you.' },
    { id: 'antechamber', name: 'The Cherub Antechamber', rect: [32, 2, 63, 21], biome: BIOME.antechamber,
        enter: 'The cherub keeps the way back. Beyond it, the Tree of Life still remembers the first morning.' },
    { id: 'euphrates', name: 'The Great River', river: 'euphrates', rect: [64, 2, 93, 21], biome: BIOME.euphrates,
        enter: 'The Euphrates waters the world that came after. Its banks hold the longest memory of all.' },
    { id: 'pishon', name: 'The Land of Havilah', river: 'pishon', rect: [2, 22, 31, 49], biome: BIOME.pishon,
        enter: 'Pishon winds through Havilah, where there is gold — and the gold of that land is good.' },
    { id: 'verge', name: 'The Forbidden Verge', rect: [32, 22, 63, 49], biome: BIOME.verge,
        enter: 'Here stands the tree of knowing good and evil. Tread slowly. This is where the first voice asked its question.' },
    { id: 'gihon', name: 'The Springs of Cush', river: 'gihon', rect: [64, 22, 93, 49], biome: BIOME.gihon,
        enter: 'Gihon compasses the whole land of Cush. Its springs never ran dry — abundance before need.' },
    { id: 'outer_grove', name: 'The Outer Grove', rect: [2, 50, 31, 69], biome: BIOME.outer_grove,
        enter: 'The grove still breathes as it did. The living creatures wait here for their names.' },
    { id: 'threshold', name: 'The Threshold', rect: [32, 50, 63, 69], biome: BIOME.threshold,
        enter: 'You stand where the first man walked beside the Source — before shame, before distance.' },
    { id: 'eastern_garden', name: 'The Eastern Garden', rect: [64, 50, 93, 69], biome: BIOME.eastern_garden,
        enter: 'The eastern beds were planted for abundance. Work them and keep them, as the first man did.' },
];

const REGION_BY_ID: Record<EdenRegionId, EdenRegion> =
    Object.fromEntries(EDEN_REGIONS.map((r) => [r.id, r])) as Record<EdenRegionId, EdenRegion>;

export function edenRegionById(id: EdenRegionId): EdenRegion {
    return REGION_BY_ID[id];
}

/** Which region contains a tile (inclusive rects, first match). */
export function edenRegionAt(gx: number, gy: number): EdenRegion | null {
    for (const reg of EDEN_REGIONS) {
        const [x0, y0, x1, y1] = reg.rect;
        if (gx >= x0 && gx <= x1 && gy >= y0 && gy <= y1) return reg;
    }
    return null;
}

export function edenBiomeAt(gx: number, gy: number): EdenBiome {
    return edenRegionAt(gx, gy)?.biome ?? BIOME.threshold;
}

// ============================================================
//  THE FOUR RIVERS — attuned in the Genesis-2 order. Each is a
//  region with a fountain (attune node) and a guardian arena
//  (a mini-boss that must fall before the fountain will light).
// ============================================================

export type EdenRiverId = 'pishon' | 'gihon' | 'hiddekel' | 'euphrates';

export interface EdenRiver {
    id: EdenRiverId;
    /** Attunement order index (0..3) — Pishon, Gihon, Hiddekel, Euphrates. */
    order: number;
    name: string;
    land: string;
    color: string;
    /** Corner fountain tile (the attune node). */
    fountain: Tile;
    /** Guardian mini-boss arena centre + the combat id. */
    guardian: { at: Tile; combatId: string; name: string; radius: number };
    /** Flavour read when the river is first lit. */
    litLine: string;
}

export const EDEN_RIVERS_V2: Record<EdenRiverId, EdenRiver> = {
    pishon: {
        id: 'pishon', order: 0, name: 'Pishon', land: 'Havilah', color: '#fbbf24',
        fountain: tile(14, 36),
        guardian: { at: tile(14, 30), combatId: 'eden_g_pishon', name: 'The Watcher of Havilah', radius: 26 },
        litLine: 'Pishon flows gold. The first head of the river remembers the land where nothing was scarce.',
    },
    gihon: {
        id: 'gihon', order: 1, name: 'Gihon', land: 'Cush', color: '#22d3ee',
        fountain: tile(82, 36),
        guardian: { at: tile(82, 30), combatId: 'eden_g_gihon', name: 'The Warden of the Springs', radius: 26 },
        litLine: 'Gihon springs clear and cold. The second head compasses the whole land of Cush.',
    },
    hiddekel: {
        id: 'hiddekel', order: 2, name: 'Hiddekel', land: 'Assyria', color: '#a855f7',
        fountain: tile(14, 12),
        guardian: { at: tile(14, 18), combatId: 'eden_g_hiddekel', name: 'The Sentinel of Swift Water', radius: 26 },
        litLine: 'Hiddekel runs swift toward Assyria. The third head moves faster than thought.',
    },
    euphrates: {
        id: 'euphrates', order: 3, name: 'Euphrates', land: 'the world to come', color: '#10b981',
        fountain: tile(82, 12),
        guardian: { at: tile(82, 18), combatId: 'eden_g_euphrates', name: 'The Keeper of the Great River', radius: 26 },
        litLine: 'Euphrates, the great river, waters every age that followed. The fourth head closes the ordering.',
    },
};

/** Rivers in canonical attunement order. */
export const EDEN_RIVER_ORDER: EdenRiverId[] = ['pishon', 'gihon', 'hiddekel', 'euphrates'];

// ============================================================
//  CANONICAL LANDMARK COORDINATES
// ============================================================

export const EDEN_SPAWN = tile(48, 67);
export const EDEN_GARDENER = tile(44, 65);
/** The Tree of Life — the endgame relic, far north sanctum. */
export const EDEN_TREE_OF_LIFE = tile(48, 5);
/** The Tree of Knowledge — the Serpent's climax, centre Verge. */
export const EDEN_TREE_OF_KNOWLEDGE = tile(48, 34);
/** The Cherub boss arena, gating the Tree of Life. */
export const EDEN_CHERUB = { at: tile(48, 16), combatId: 'eden_boss', radius: 28 };

// ============================================================
//  PERSISTENCE KEYS — every Eden discovery string lives here.
//  edenKey('named','lion') -> 'eden_named_lion'
// ============================================================

export type EdenKeyKind =
    | 'lore'        // a lore stone read
    | 'wing'        // a region first entered (Gardener greeting)
    | 'chest'       // a chest opened
    | 'spring'      // a health spring drunk
    | 'fight'       // a shade trial / guardian cleared
    | 'river'       // a river fountain lit
    | 'named'       // a creature named (bestiary)
    | 'fruit'       // a fruit kind harvested at least once (cultivation codex)
    | 'serpent'     // a serpent beat resolved ('<beat>_resisted' | '<beat>_listened')
    | 'secret'      // a hidden secret revealed
    | 'milestone';  // misc one-shot story beats

export function edenKey(kind: EdenKeyKind, id: string): string {
    return `eden_${kind}_${id}`;
}

/** Convenience constants for fixed, non-collection keys. */
export const EDEN_KEYS = {
    treeOfLifeClaimed: 'eden_milestone_leaf_claimed',
    knowledgeResolved: 'eden_milestone_knowledge',          // + '_<outcome>'
    untempted: 'eden_milestone_untempted',                   // resisted every serpent beat
    allNamed: 'eden_milestone_all_named',                    // bestiary complete
    firstHarvest: 'eden_milestone_first_harvest',
} as const;

// ============================================================
//  COOL OF THE DAY — the light cycle (Gen 3:8). Session-time
//  only; nothing here persists. Drives ambient tint + a couple
//  of phase-gated events (the Gardener walks at dusk; some
//  creatures wake only at certain phases).
// ============================================================

export type EdenDayPhase = 'dawn' | 'morning' | 'noon' | 'cool' | 'dusk' | 'night';

export interface EdenDayState {
    /** 0..1 around the full day. */
    t: number;
    phase: EdenDayPhase;
    /** Multiply scene brightness (1 = full day). */
    brightness: number;
    /** rgba() overlay painted over the whole scene for time-of-day. */
    tint: string;
    /** Ambient label for HUD. */
    label: string;
}

/** Full day length in seconds of real in-level time. */
export const EDEN_DAY_SECONDS = 240;

const DAY_STOPS: { at: number; phase: EdenDayPhase; brightness: number; tint: string; label: string }[] = [
    { at: 0.00, phase: 'dawn', brightness: 0.80, tint: 'rgba(255, 183, 94, 0.16)', label: 'Dawn' },
    { at: 0.15, phase: 'morning', brightness: 1.00, tint: 'rgba(255, 255, 255, 0.00)', label: 'Morning' },
    { at: 0.40, phase: 'noon', brightness: 1.06, tint: 'rgba(255, 250, 230, 0.04)', label: 'Noon' },
    { at: 0.60, phase: 'cool', brightness: 0.92, tint: 'rgba(120, 180, 255, 0.10)', label: 'The cool of the day' },
    { at: 0.78, phase: 'dusk', brightness: 0.72, tint: 'rgba(180, 110, 80, 0.22)', label: 'Dusk' },
    { at: 0.90, phase: 'night', brightness: 0.52, tint: 'rgba(30, 40, 90, 0.34)', label: 'Night' },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Cool-of-day state for a normalised day time t∈[0,1). */
export function edenDayState(t: number): EdenDayState {
    const tt = ((t % 1) + 1) % 1;
    let lo = DAY_STOPS[0];
    let hi = DAY_STOPS[DAY_STOPS.length - 1];
    let hiAt = 1;
    for (let i = 0; i < DAY_STOPS.length; i++) {
        const a = DAY_STOPS[i];
        const b = DAY_STOPS[(i + 1) % DAY_STOPS.length];
        const bAt = i + 1 < DAY_STOPS.length ? DAY_STOPS[i + 1].at : 1;
        if (tt >= a.at && tt < bAt) { lo = a; hi = b; hiAt = bAt; break; }
    }
    const span = Math.max(0.0001, hiAt - lo.at);
    const f = (tt - lo.at) / span;
    return {
        t: tt,
        phase: lo.phase,
        brightness: lerp(lo.brightness, hi.brightness, f),
        // tint snaps to the dominant stop (no rgba interpolation needed for feel)
        tint: f < 0.5 ? lo.tint : hi.tint,
        label: lo.label,
    };
}
