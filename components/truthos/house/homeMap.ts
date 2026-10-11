/**
 * The Lair — one building, every station of the Hut.
 *
 * The Sanctum: an octagonal hall 32 m across with seven deep apses
 * (Terminal, Library, Codex, Arcade, Ledger, The Mark, Paths) around the
 * Source. Through the south arch, the Processional: an 11 m wide gallery
 * with the Daily Word and the Offering at its head, four chambers off its
 * sides — the Cinema and the Hall Circle, then the Mirror Well and the
 * Signal Studio, each 20 × 16.6 m — and the Overlook at its end, a glass
 * wall onto the cloud sea. There is no outside.
 *
 * Every prop is a SOLID with its real footprint (w × d, turned by its
 * yaw) and, when it is a model, the manifest key and fit that draw it.
 * Collision is exactly that footprint — no circles standing in for
 * rectangles — and `npm run validate` measures every GLB and fails if a
 * model is drawn bigger than the footprint it claims, if two footprints
 * overlap, if one pokes through a wall, or if any station cannot be
 * reached. The renderer, the walker and the validator read this file.
 */
import type { Hotspot } from './houseMap';

export const EYE_HEIGHT = 1.62;
export const SIT_HEIGHT = 1.12;
export const PLAYER_R = 0.34;

/** One storey; the type is kept so old call sites compile. */
export type Level = 'main';
export const MAIN_Y = 0;

/** The roam box — a backstop; the walkable region is the real fence */
export const JUNGLE_BOUNDS = { minX: -32, maxX: 32, minZ: -26, maxZ: 66 } as const;

/* ── The Sanctum ────────────────────────────────────────────── */

export const HALL = {
    /** centre → inner face of each facet */
    apothem: 16,
    wallT: 0.7,
    /** wall height to the eave */
    eave: 8.6,
    oculusR: 3.8,
    oculusY: 13.4,
    facets: 8,
} as const;

/** Half the length of one facet (inner face) */
export const FACET_HALF = HALL.apothem * Math.tan(Math.PI / 8);
/** Centre → a facet's end vertex (inner) */
export const VERTEX_R = HALL.apothem / Math.cos(Math.PI / 8);

export const ALCOVE = { width: 7.4, depth: 6.0, height: 5.2, apseH: 6.8 } as const;
/** The south arch into the Processional */
export const ARCH = { width: 5.0, height: 5.8 } as const;
/** Kept for callers that still say DOOR */
export const DOOR = ARCH;
export const DAIS = { r: 3.4, h: 0.32, rampR: 4.4 } as const;

export type AlcoveId = 'terminal' | 'arcade' | 'ledger' | 'library' | 'codex' | 'mark' | 'paths';
export type Alcove = { id: AlcoveId; name: string; facet: number; soft: boolean };

/** The arch faces +z (south on the map) */
export const ENTRANCE_FACET = 2;

/** facet k faces angle k·45° (0 = +x, 2 = +z) */
export const ALCOVES: Alcove[] = [
    { id: 'terminal', name: 'The Terminal', facet: 6, soft: true },
    { id: 'library', name: 'The Library', facet: 7, soft: true },
    { id: 'codex', name: 'The Codex', facet: 5, soft: true },
    { id: 'arcade', name: 'The Arcade', facet: 0, soft: false },
    { id: 'ledger', name: 'The Ledger', facet: 4, soft: false },
    { id: 'mark', name: 'The Mark', facet: 1, soft: false },
    { id: 'paths', name: 'The Paths', facet: 3, soft: true },
];

export const alcove = (id: AlcoveId): Alcove => ALCOVES.find((a) => a.id === id)!;

export const facetAngle = (facet: number) => (facet * Math.PI) / 4;

/** three.js group rotation.y that points local +z along the facet's outward normal */
export const facetYaw = (facet: number) => Math.PI / 2 - facetAngle(facet);

/**
 * Facet frame: origin at the midpoint of the inner face, local +z OUT
 * through the wall, local +x along the wall (so that a group with
 * `rotation.y = facetYaw(facet)` draws local coordinates in this frame).
 */
export function facetToWorld(facet: number, x: number, z: number): { x: number; z: number } {
    const a = facetAngle(facet);
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { x: c * HALL.apothem + x * s + z * c, z: s * HALL.apothem - x * c + z * s };
}

export function worldToFacet(facet: number, wx: number, wz: number): { x: number; z: number } {
    const a = facetAngle(facet);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = wx - c * HALL.apothem;
    const dz = wz - s * HALL.apothem;
    return { x: dx * s - dz * c, z: dx * c + dz * s };
}

/** Yaw of a camera whose forward points along (nx, nz) — used for spawn and recentre. */
export function yawFacing(nx: number, nz: number): number {
    return Math.atan2(-nx, -nz);
}

/** three.js yaw that turns a prop's local +z (its front) toward (nx, nz) */
export function yawToward(nx: number, nz: number): number {
    return Math.atan2(nx, nz);
}

/* ── The rooms beyond the arch ──────────────────────────────── */

export type Rect = { x0: number; z0: number; x1: number; z1: number };
export type RoomId = 'processional' | 'overlook' | 'cinema' | 'hall' | 'soul_mirror' | 'studio';

export type Room = Rect & {
    id: RoomId;
    name: string;
    blurb: string;
    /** ceiling height */
    h: number;
};

export const WALL_T = 0.7;
/** Corridor walls rise to the tallest chamber so no slit opens above them */
export const CORRIDOR_WALL_H = 10.2;

const SANCTUM_OUTER = HALL.apothem + HALL.wallT; // 16.7

/** Inner rectangles — the floor you stand on. Walls sit OUTSIDE these. */
export const ROOMS: Room[] = [
    { id: 'processional', name: 'The Processional', blurb: 'The long gallery', x0: -5.5, z0: SANCTUM_OUTER, x1: 5.5, z1: 54.3, h: 8.0 },
    { id: 'overlook', name: 'The Overlook', blurb: 'Glass onto the cloud sea', x0: -5.5, z0: 54.3, x1: 5.5, z1: 62.5, h: 8.0 },
    { id: 'cinema', name: 'The Cinema', blurb: 'Films in the dark', x0: 6.2, z0: 20.4, x1: 26.2, z1: 37.0, h: 9.0 },
    { id: 'hall', name: 'The Hall Circle', blurb: 'The community fire', x0: -26.2, z0: 20.4, x1: -6.2, z1: 37.0, h: 10.0 },
    { id: 'soul_mirror', name: 'The Mirror Well', blurb: 'Shape your vessel', x0: 6.2, z0: 37.7, x1: 26.2, z1: 54.3, h: 9.6 },
    { id: 'studio', name: 'The Signal Studio', blurb: 'Broadcast from the lair', x0: -26.2, z0: 37.7, x1: -6.2, z1: 54.3, h: 7.6 },
];

export const room = (id: RoomId): Room => ROOMS.find((r) => r.id === id)!;
export const roomCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });

/**
 * Floor rectangles. The Overlook is the end of the Processional, not a
 * room with a wall between — one rectangle for the floor, two names.
 */
const FLOOR_RECTS: Rect[] = [
    { x0: -5.5, z0: SANCTUM_OUTER, x1: 5.5, z1: 62.5 },
    room('cinema'),
    room('hall'),
    room('soul_mirror'),
    room('studio'),
];

export type Door = {
    id: string;
    /** the gap through the corridor wall — walkable */
    rect: Rect;
    h: number;
    /** which side of the corridor */
    side: 'e' | 'w';
};

const doorAt = (id: string, side: 'e' | 'w', zc: number): Door => ({
    id,
    side,
    h: 4.6,
    rect: side === 'e' ? { x0: 5.5, z0: zc - 2.1, x1: 6.2, z1: zc + 2.1 } : { x0: -6.2, z0: zc - 2.1, x1: -5.5, z1: zc + 2.1 },
});

/** Doorways from the Processional into the chambers (4.2 m wide, 4.6 m tall), centred on each chamber */
export const DOORS: Door[] = [
    doorAt('cinema', 'e', 28.7),
    doorAt('hall', 'w', 28.7),
    doorAt('soul_mirror', 'e', 46.0),
    doorAt('studio', 'w', 46.0),
];

const inRect = (r: Rect, x: number, z: number, pad = 0) => x >= r.x0 + pad && x <= r.x1 - pad && z >= r.z0 + pad && z <= r.z1 - pad;

/** The chambers, for the compass, the map and the next-line */
export type Chamber = { id: 'cinema' | 'hall' | 'soul_mirror' | 'studio'; name: string; blurb: string; x: number; z: number; r: number };
export const CHAMBERS: Chamber[] = (['cinema', 'hall', 'soul_mirror', 'studio'] as const).map((id) => {
    const r = room(id);
    const c = roomCenter(r);
    return { id, name: r.name, blurb: r.blurb, x: c.x, z: c.z, r: Math.min(r.x1 - r.x0, r.z1 - r.z0) / 2 - 0.5 };
});
/** Older names for the same table */
export const DESTINATIONS = CHAMBERS;
export const destCenter = (d: Chamber) => ({ x: d.x, z: d.z });

const C_CIN = roomCenter(room('cinema'));
const C_HALL = roomCenter(room('hall'));
const C_MIR = roomCenter(room('soul_mirror'));
const C_STU = roomCenter(room('studio'));

/** The council fire at the Hall Circle's heart */
export const FIRE = { x: C_HALL.x, z: C_HALL.z } as const;
/** The reflecting pool, a little east of the Mirror Well's centre so the west lip is a stage */
export const POOL = { x: C_MIR.x + 1.0, z: C_MIR.z, r: 5.0 } as const;
/** The cinema screen hangs on the east wall */
export const SCREEN = { x: room('cinema').x1 - 0.32, y: 3.9, z: C_CIN.z, w: 12, h: 5.6 } as const;

/* ── Solids — every prop that takes floor ───────────────────── */

export type SolidAt = AlcoveId | 'world';

export type Fit = { w?: number; h?: number; d?: number };

export type Solid = {
    name: string;
    /** which frame x/z/yaw are in: an apse, or the world */
    at: SolidAt;
    x: number;
    z: number;
    /** footprint in metres: w along local x, d along local z (before yaw). Collision is exactly this. */
    w: number;
    d: number;
    /** round things (columns, the fire, the pool) collide as a circle of diameter w */
    round?: boolean;
    /** visual height, metres */
    h: number;
    /** yaw in its frame — props face local +z */
    yaw?: number;
    /** A chair pushed under a desk may share its footprint */
    tuck?: string;
    /** HouseProp manifest key that draws it; omitted = procedural */
    model?: string;
    /** how the model is sized (HouseProp fit) — required with model */
    fit?: Fit;
    /** drawn by a bespoke renderer, not the generic prop pass */
    custom?: boolean;
    /** material key for the procedural fallback block */
    mat?: string;
};

const ring = (cx: number, cz: number, a: number, r: number) => ({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });

/** yaw for a prop at bearing a around a centre whose local x runs along the circle */
const tangentX = (a: number) => -a - Math.PI / 2;
/** yaw for a prop whose local z runs along the circle (benches, which are long in z) */
const tangentZ = (a: number) => -a;
/** yaw for a prop whose local z points out from the centre (bedrolls) */
const radialZ = (a: number) => Math.PI / 2 - a;

/** The Fantasy Town stall bench is long in z: 1.6 m × 0.45 m, 0.38 m high */
const bench = (name: string, at: SolidAt, x: number, z: number, yaw = 0): Solid => ({
    name,
    at,
    x,
    z,
    w: 0.5,
    d: 1.65,
    h: 0.4,
    yaw,
    model: 'ftStallBench',
    fit: { d: 1.6 },
    mat: 'wood',
});

const plant = (name: string, at: SolidAt, x: number, z: number, h = 1.1): Solid => ({
    name,
    at,
    x,
    z,
    w: +((0.212 * h) / 0.654 + 0.06).toFixed(2),
    d: +((0.241 * h) / 0.654 + 0.06).toFixed(2),
    h,
    model: 'pottedPlant',
    fit: { h },
    mat: 'leaf',
});

const floorLamp = (name: string, at: SolidAt, x: number, z: number): Solid => ({
    name,
    at,
    x,
    z,
    w: 0.34,
    d: 0.38,
    h: 1.7,
    model: 'floorLamp',
    fit: { h: 1.7 },
    mat: 'metalDark',
});

const VERTEX_BEARING = (k: number) => facetAngle(k) + Math.PI / 8;

export const SOLIDS: Solid[] = [
    /* ── Terminal (north) — the desk you wake at ── */
    { name: 'desk', at: 'terminal', x: 0, z: 5.5, w: 2.0, d: 0.9, h: 0.76, yaw: Math.PI, model: 'desk', fit: { w: 2.0, h: 0.76, d: 0.9 }, mat: 'woodDark', custom: false },
    { name: 'desk chair', at: 'terminal', x: 0, z: 4.55, w: 0.64, d: 0.62, h: 1.0, yaw: 0, tuck: 'desk', model: 'deskChair', fit: { w: 0.62, h: 1.0, d: 0.6 }, mat: 'leather' },
    floorLamp('terminal lamp', 'terminal', 3.1, 5.5),
    plant('terminal plant', 'terminal', -3.1, 5.5),
    { name: 'terminal lounge chair', at: 'terminal', x: -2.3, z: 2.6, w: 0.94, d: 0.8, h: 0.85, yaw: 0.5, model: 'accentChair', fit: { w: 0.9 }, mat: 'leather' },

    /* ── Library — four bays on the back wall, a table, two chairs ── */
    ...[-2.625, -0.875, 0.875, 2.625].map((x, i): Solid => ({
        name: `library bay ${i}`,
        at: 'library',
        x,
        z: 5.7,
        w: 1.6,
        d: 0.5,
        h: 2.6,
        yaw: Math.PI,
        model: 'bookcase',
        fit: { w: 1.6, h: 2.6, d: 0.5 },
        mat: 'woodDark',
    })),
    { name: 'library table', at: 'library', x: 0, z: 2.6, w: 1.3, d: 0.8, h: 0.45, model: 'coffeeTable', fit: { w: 1.3, h: 0.45, d: 0.8 }, mat: 'wood' },
    { name: 'reading chair E', at: 'library', x: 2.0, z: 2.5, w: 0.94, d: 0.8, h: 0.85, yaw: yawToward(-1, 0.05), model: 'accentChair', fit: { w: 0.9 }, mat: 'leather' },
    { name: 'reading chair W', at: 'library', x: -2.0, z: 2.5, w: 0.94, d: 0.8, h: 0.85, yaw: yawToward(1, 0.05), model: 'accentChair', fit: { w: 0.9 }, mat: 'leather' },
    floorLamp('library lamp', 'library', -3.2, 4.4),

    /* ── Codex — the scribe's desk, a closed case, a plant ── */
    { name: 'codex desk', at: 'codex', x: 0, z: 5.5, w: 1.8, d: 0.85, h: 0.78, yaw: Math.PI, model: 'desk', fit: { w: 1.8, h: 0.78, d: 0.85 }, mat: 'woodDark' },
    { name: 'codex chair', at: 'codex', x: 0, z: 4.55, w: 0.64, d: 0.62, h: 1.0, yaw: 0, tuck: 'codex desk', model: 'deskChair', fit: { w: 0.62, h: 1.0, d: 0.6 }, mat: 'leather' },
    { name: 'codex case', at: 'codex', x: -2.75, z: 5.7, w: 1.6, d: 0.5, h: 2.0, yaw: Math.PI, model: 'bookcaseClosed', fit: { w: 1.6, h: 2.0, d: 0.5 }, mat: 'woodDark' },
    plant('codex plant', 'codex', 3.1, 5.5),

    /* ── Arcade — four cabinets, two stools, a sofa facing them ── */
    ...[-2.7, -0.9, 0.9, 2.7].map((x, i): Solid => ({ name: `arcade cabinet ${i}`, at: 'arcade', x, z: 5.5, w: 0.8, d: 0.7, h: 1.85, custom: true, mat: 'metalDark' })),
    ...[-1.8, 1.8].map((x, i): Solid => ({ name: `arcade stool ${i}`, at: 'arcade', x, z: 4.4, w: 0.48, d: 0.42, h: 0.72, model: 'barStool', fit: { h: 0.72 }, mat: 'woodDark' })),
    { name: 'arcade sofa', at: 'arcade', x: 0, z: 2.0, w: 2.25, d: 0.96, h: 1.0, yaw: 0, model: 'sofa', fit: { w: 2.2 }, mat: 'fabric' },

    /* ── Ledger — the record on a sideboard, two candle stands, a table for two ── */
    { name: 'ledger sideboard', at: 'ledger', x: 0, z: 5.6, w: 2.2, d: 0.6, h: 0.9, custom: true, mat: 'woodDark' },
    ...[-2.4, 2.4].map((x, i): Solid => ({ name: `ledger candle stand ${i}`, at: 'ledger', x, z: 5.6, w: 0.3, d: 0.3, h: 1.5, custom: true, mat: 'metalDark' })),
    { name: 'ledger table', at: 'ledger', x: 0, z: 2.8, w: 1.4, d: 1.0, h: 0.74, model: 'diningTable', fit: { w: 1.4, h: 0.74, d: 1.0 }, mat: 'wood' },
    { name: 'ledger chair W', at: 'ledger', x: -1.2, z: 2.8, w: 0.42, d: 0.42, h: 0.92, yaw: Math.PI / 2, model: 'diningChair', fit: { h: 0.92 }, mat: 'woodDark' },
    { name: 'ledger chair E', at: 'ledger', x: 1.2, z: 2.8, w: 0.42, d: 0.42, h: 0.92, yaw: -Math.PI / 2, model: 'diningChair', fit: { h: 0.92 }, mat: 'woodDark' },

    /* ── The Mark — one bench to sit and look; the walls stay clear for the marks ── */
    bench('mark bench', 'mark', 0, 2.2, Math.PI / 2),

    /* ── Paths — a bench, a signpost, two plants under the art ── */
    bench('paths bench', 'paths', 0, 2.2, Math.PI / 2),
    { name: 'paths signpost', at: 'paths', x: -2.6, z: 3.9, w: 0.98, d: 0.24, h: 2.0, yaw: 0.4, model: 'skSignpost', fit: { h: 2.0 }, mat: 'woodDark' },
    plant('paths plant W', 'paths', -3.1, 5.5),
    plant('paths plant E', 'paths', 3.1, 5.5),

    /* ── The Sanctum floor — seats at the Source, lanterns, columns at the vertices ── */
    ...[0, 2, 4, 6].map((k): Solid => {
        const a = VERTEX_BEARING(k);
        const p = ring(0, 0, a, 6.2);
        return { name: `source seat ${k}`, at: 'world', ...p, w: 2.2, d: 0.6, h: 0.46, yaw: yawToward(-Math.cos(a), -Math.sin(a)), custom: true, mat: 'basalt' };
    }),
    ...Array.from({ length: 8 }, (_, k): Solid => {
        const p = ring(0, 0, VERTEX_BEARING(k), 11.6);
        return { name: `sanctum lantern ${k}`, at: 'world', ...p, w: 0.42, d: 0.42, h: 2.8, model: 'ftLantern', fit: { h: 2.8 }, mat: 'basalt' };
    }),
    ...Array.from({ length: 8 }, (_, k): Solid => {
        const p = ring(0, 0, VERTEX_BEARING(k), VERTEX_R - 1.0);
        return { name: `column ${k}`, at: 'world', ...p, w: 1.0, d: 1.0, round: true, h: HALL.eave, custom: true, mat: 'basalt' };
    }),

    /* ── The Processional ── */
    ...[21.6, 33.6, 40.0, 51.8, 58.0].flatMap((z, i): Solid[] => [
        { name: `gallery column W${i}`, at: 'world', x: -4.7, z, w: 1.0, d: 1.0, round: true, h: 8.0, custom: true, mat: 'basalt' },
        { name: `gallery column E${i}`, at: 'world', x: 4.7, z, w: 1.0, d: 1.0, round: true, h: 8.0, custom: true, mat: 'basalt' },
    ]),
    { name: 'daily word lectern', at: 'world', x: -2.8, z: 19.6, w: 0.64, d: 0.52, h: 0.95, yaw: 0.6, model: 'bedsideTable', fit: { w: 0.62, h: 0.8, d: 0.5 }, mat: 'wood' },
    { name: 'offering chest', at: 'world', x: 2.8, z: 19.6, w: 0.92, d: 0.92, h: 0.82, yaw: -Math.PI / 2, model: 'pkChest', fit: { w: 0.9 }, mat: 'woodDark' },
    ...[24.4, 32.2, 41.8, 49.8].flatMap((z, i): Solid[] => [
        { name: `gallery planter W${i}`, at: 'world', x: -4.55, z, w: 0.9, d: 0.9, h: 0.6, custom: true, mat: 'basalt' },
        { name: `gallery planter E${i}`, at: 'world', x: 4.55, z, w: 0.9, d: 0.9, h: 0.6, custom: true, mat: 'basalt' },
    ]),
    bench('gallery bench W0', 'world', -2.4, 36.6),
    bench('gallery bench E0', 'world', 2.4, 36.6),
    bench('gallery bench W1', 'world', -2.4, 45.0),
    bench('gallery bench E1', 'world', 2.4, 45.0),

    /* ── The Overlook — two benches facing the glass, plants, the balustrade ── */
    bench('overlook bench W', 'world', -2.6, 59.8, Math.PI / 2),
    bench('overlook bench E', 'world', 2.6, 59.8, Math.PI / 2),
    plant('overlook plant W', 'world', -4.8, 55.4, 1.4),
    plant('overlook plant E', 'world', 4.8, 55.4, 1.4),
    { name: 'balustrade', at: 'world', x: 0, z: 61.95, w: 10.8, d: 0.25, h: 1.0, custom: true, mat: 'metalDark' },

    /* ── The Cinema — five rows of benches on an aisle, a stage, a stall, the catalog table ── */
    ...[10.0, 12.4, 14.8, 17.2, 19.6].flatMap((x, row) =>
        [-5.6, -3.6, -1.6, 1.6, 3.6, 5.6].map((dz, i) => bench(`cinema bench ${row}${i}`, 'world', x, C_CIN.z + dz)),
    ),
    { name: 'cinema stage', at: 'world', x: 25.2, z: C_CIN.z, w: 2.0, d: 13.0, h: 0.45, custom: true, mat: 'basalt' },
    { name: 'cinema stall', at: 'world', x: 7.6, z: 22.4, w: 1.6, d: 2.45, h: 0.9, yaw: Math.PI / 2, model: 'ftStall', fit: { d: 2.4 }, mat: 'woodDark' },
    { name: 'cinema stool A', at: 'world', x: 8.0, z: 24.4, w: 0.5, d: 0.5, h: 0.42, model: 'ftStallStool', fit: { h: 0.42 }, mat: 'woodDark' },
    { name: 'cinema stool B', at: 'world', x: 9.0, z: 24.4, w: 0.5, d: 0.5, h: 0.42, model: 'ftStallStool', fit: { h: 0.42 }, mat: 'woodDark' },
    { name: 'cineworks table', at: 'world', x: 7.8, z: 34.6, w: 1.8, d: 1.3, h: 0.8, model: 'diningTable', fit: { w: 1.8, h: 0.8, d: 1.3 }, mat: 'wood' },
    { name: 'cinema barrel N', at: 'world', x: 25.4, z: 21.3, w: 0.68, d: 0.68, h: 0.95, model: 'skBarrel', fit: { h: 0.95 }, mat: 'woodDark' },
    { name: 'cinema barrel S', at: 'world', x: 6.8, z: 36.3, w: 0.68, d: 0.68, h: 0.95, model: 'skBarrel', fit: { h: 0.95 }, mat: 'woodDark' },

    /* ── The Hall Circle — the fire, nine stones, six benches, a camp, the speaker's stone ── */
    { name: 'council fire', at: 'world', x: FIRE.x, z: FIRE.z, w: 2.4, d: 2.4, round: true, h: 0.9, custom: true, mat: 'basalt' },
    ...Array.from({ length: 9 }, (_, i): Solid => {
        const a = 0.35 + i * ((Math.PI * 2) / 9);
        const h = 2.4 + (i % 3) * 0.5;
        return {
            name: `hall stone ${i}`,
            at: 'world',
            ...ring(FIRE.x, FIRE.z, a, 6.4),
            w: 1.2,
            d: 0.8,
            h,
            yaw: tangentX(a),
            model: i % 2 ? 'nkRockTallA' : 'nkStoneTallA',
            fit: { w: 1.2, h, d: 0.8 },
            mat: 'rockFace',
        };
    }),
    ...[1, 3, 5, 7, 9, 11].map((k, i) => {
        const a = (k * Math.PI) / 6;
        const p = ring(FIRE.x, FIRE.z, a, 3.6);
        return bench(`hall bench ${i}`, 'world', p.x, p.z, tangentZ(a));
    }),
    { name: 'hall chest N', at: 'world', ...ring(FIRE.x, FIRE.z, 2.0, 7.6), w: 0.88, d: 0.92, h: 0.82, yaw: yawToward(-Math.cos(2.0), -Math.sin(2.0)), model: 'skChest', fit: { w: 0.82 }, mat: 'woodDark' },
    { name: 'hall chest S', at: 'world', ...ring(FIRE.x, FIRE.z, 4.3, 7.6), w: 0.88, d: 0.92, h: 0.82, yaw: yawToward(-Math.cos(4.3), -Math.sin(4.3)), model: 'skChest', fit: { w: 0.82 }, mat: 'woodDark' },
    { name: 'hall logs N', at: 'world', x: -24.8, z: 22.6, w: 1.24, d: 1.4, h: 0.66, model: 'nkLogStackLarge', fit: { w: 1.2 }, mat: 'woodDark' },
    { name: 'hall logs S', at: 'world', x: -24.8, z: 34.8, w: 1.24, d: 1.4, h: 0.66, model: 'nkLogStackLarge', fit: { w: 1.2 }, mat: 'woodDark' },
    ...[2.6, 3.7].map((a, i): Solid => ({
        name: `hall bedroll ${i}`,
        at: 'world',
        ...ring(FIRE.x, FIRE.z, a, 5.0),
        w: 0.86,
        d: 1.62,
        h: 0.34,
        yaw: radialZ(a),
        model: 'skBedroll',
        fit: { d: 1.6 },
        mat: 'wool',
    })),
    { name: 'speaker stone', at: 'world', x: -24.6, z: FIRE.z, w: 1.8, d: 1.8, round: true, h: 0.42, custom: true, mat: 'basalt' },

    /* ── The Mirror Well — the pool, its rim, the ring and obelisks, benches on the near lip ── */
    { name: 'pool', at: 'world', x: POOL.x, z: POOL.z, w: POOL.r * 2, d: POOL.r * 2, round: true, h: 0.05, custom: true, mat: 'marble' },
    ...Array.from({ length: 10 }, (_, i): Solid => {
        const a = 0.31 + i * ((Math.PI * 2) / 10);
        return {
            name: `pool rock ${i}`,
            at: 'world',
            ...ring(POOL.x, POOL.z, a, POOL.r + 0.65),
            w: 0.92,
            d: 0.72,
            h: 0.45,
            yaw: tangentX(a),
            model: 'nkRockLargeA',
            fit: { w: 0.9, h: 0.45, d: 0.7 },
            mat: 'rockFace',
        };
    }),
    { name: 'well ring', at: 'world', x: POOL.x + 7.0, z: POOL.z, w: 2.45, d: 1.64, h: 3.2, yaw: -Math.PI / 2, model: 'nkStatueRing', fit: { h: 3.2 }, custom: false, mat: 'basalt' },
    { name: 'well obelisk N', at: 'world', x: POOL.x + 6.4, z: POOL.z - 4.6, w: 1.0, d: 1.0, h: 2.8, model: 'nkStatueObelisk', fit: { h: 2.8 }, mat: 'basalt' },
    { name: 'well obelisk S', at: 'world', x: POOL.x + 6.4, z: POOL.z + 4.6, w: 1.0, d: 1.0, h: 2.8, model: 'nkStatueObelisk', fit: { h: 2.8 }, mat: 'basalt' },
    bench('well bench N', 'world', 9.6, C_MIR.z - 4.6),
    bench('well bench S', 'world', 9.6, C_MIR.z + 4.6),
    plant('well plant NW', 'world', 7.2, 38.7, 1.4),
    plant('well plant SW', 'world', 7.2, 53.3, 1.4),
    plant('well plant NE', 'world', 25.2, 38.7, 1.4),
    plant('well plant SE', 'world', 25.2, 53.3, 1.4),

    /* ── The Signal Studio — the desk, a green room, the mast, a workshop ── */
    { name: 'studio desk', at: 'world', x: C_STU.x, z: C_STU.z - 4.6, w: 3.2, d: 1.0, h: 0.8, yaw: 0, custom: true, mat: 'metalDark' },
    { name: 'studio chair L', at: 'world', x: C_STU.x - 0.7, z: C_STU.z - 3.4, w: 0.64, d: 0.62, h: 1.0, yaw: Math.PI, tuck: 'studio desk', model: 'deskChair', fit: { w: 0.62, h: 1.0, d: 0.6 }, mat: 'leather' },
    { name: 'studio chair R', at: 'world', x: C_STU.x + 0.7, z: C_STU.z - 3.4, w: 0.64, d: 0.62, h: 1.0, yaw: Math.PI, tuck: 'studio desk', model: 'deskChair', fit: { w: 0.62, h: 1.0, d: 0.6 }, mat: 'leather' },
    { name: 'studio sofa', at: 'world', x: C_STU.x, z: C_STU.z + 5.4, w: 2.25, d: 0.96, h: 1.0, yaw: Math.PI, model: 'sofa', fit: { w: 2.2 }, mat: 'fabric' },
    { name: 'studio coffee table', at: 'world', x: C_STU.x, z: C_STU.z + 3.8, w: 1.3, d: 0.8, h: 0.45, model: 'coffeeTable', fit: { w: 1.3, h: 0.45, d: 0.8 }, mat: 'wood' },
    { name: 'studio mast', at: 'world', x: -24.8, z: 52.4, w: 0.8, d: 0.8, round: true, h: 5.2, custom: true, mat: 'metalDark' },
    { name: 'studio workbench', at: 'world', x: -24.6, z: 41.0, w: 1.5, d: 1.05, h: 0.9, yaw: Math.PI / 2, model: 'skWorkbench', fit: { w: 1.5, h: 0.9, d: 1.0 }, mat: 'woodDark' },
    { name: 'studio crate A', at: 'world', x: -8.4, z: 52.6, w: 0.82, d: 0.82, h: 0.7, model: 'skBoxLarge', fit: { w: 0.8, h: 0.7, d: 0.8 }, mat: 'woodDark' },
    { name: 'studio crate B', at: 'world', x: -9.5, z: 52.9, w: 0.82, d: 0.82, h: 0.7, model: 'skBoxLarge', fit: { w: 0.8, h: 0.7, d: 0.8 }, mat: 'woodDark' },
    { name: 'studio crate C', at: 'world', x: -8.6, z: 51.4, w: 0.82, d: 0.82, h: 0.7, model: 'skBoxLarge', fit: { w: 0.8, h: 0.7, d: 0.8 }, mat: 'woodDark' },
    { name: 'studio barrel A', at: 'world', x: -25.4, z: 50.6, w: 0.68, d: 0.68, h: 0.95, model: 'skBarrel', fit: { h: 0.95 }, mat: 'woodDark' },
    { name: 'studio barrel B', at: 'world', x: -25.4, z: 49.6, w: 0.68, d: 0.68, h: 0.95, model: 'skBarrel', fit: { h: 0.95 }, mat: 'woodDark' },
    { name: 'studio lever', at: 'world', x: -22.8, z: 53.4, w: 0.62, d: 0.48, h: 0.64, model: 'pkLever', fit: { w: 0.6 }, mat: 'metalDark' },
];

export function solid(name: string): Solid {
    const s = SOLIDS.find((x) => x.name === name);
    if (!s) throw new Error(`homeMap: no solid named "${name}"`);
    return s;
}

export function frameOf(at: SolidAt): number | null {
    return at === 'world' ? null : alcove(at).facet;
}

/** World centre of a solid */
export function solidWorld(s: Solid): { x: number; z: number } {
    const f = frameOf(s.at);
    return f === null ? { x: s.x, z: s.z } : facetToWorld(f, s.x, s.z);
}

/** World yaw of a solid (three.js rotation.y) */
export function solidYaw(s: Solid): number {
    const f = frameOf(s.at);
    return (f === null ? 0 : facetYaw(f)) + (s.yaw ?? 0);
}

type Placed = { s: Solid; x: number; z: number; c: number; sn: number; reach: number };

/** Precomputed world placement — the walker asks every frame */
const PLACED: Placed[] = SOLIDS.map((s) => {
    const w = solidWorld(s);
    const yaw = solidYaw(s);
    return { s, x: w.x, z: w.z, c: Math.cos(yaw), sn: Math.sin(yaw), reach: s.round ? s.w / 2 : Math.hypot(s.w, s.d) / 2 };
});

/** Does a disc of radius r at (x, z) touch this solid's footprint? */
function touches(p: Placed, x: number, z: number, r: number): boolean {
    const dx = x - p.x;
    const dz = z - p.z;
    const reach = p.reach + r;
    if (dx * dx + dz * dz > reach * reach) return false;
    if (p.s.round) return true;
    // world → local (inverse of three's Ry)
    const lx = dx * p.c - dz * p.sn;
    const lz = dx * p.sn + dz * p.c;
    const hx = p.s.w / 2;
    const hz = p.s.d / 2;
    const qx = Math.max(-hx, Math.min(hx, lx));
    const qz = Math.max(-hz, Math.min(hz, lz));
    const ex = lx - qx;
    const ez = lz - qz;
    return ex * ex + ez * ez < r * r;
}

/* ── Where the floor is ─────────────────────────────────────── */

function insideOctagon(x: number, z: number, apothem: number): boolean {
    for (let k = 0; k < HALL.facets; k++) {
        const a = facetAngle(k);
        if (x * Math.cos(a) + z * Math.sin(a) > apothem) return false;
    }
    return true;
}

/** The apse whose pocket this point is in (pad shrinks the pocket) */
export function alcoveAt(x: number, z: number, pad = 0): Alcove | null {
    for (const a of ALCOVES) {
        const l = worldToFacet(a.facet, x, z);
        if (Math.abs(l.x) <= ALCOVE.width / 2 - pad && l.z >= -0.4 && l.z <= ALCOVE.depth - pad) return a;
    }
    return null;
}

/** Inside the arch (and a step either side of it) */
export function inDoorway(x: number, z: number, pad = 0): boolean {
    const l = worldToFacet(ENTRANCE_FACET, x, z);
    return Math.abs(l.x) <= ARCH.width / 2 - pad && l.z >= -1.2 && l.z <= HALL.wallT + 1.2;
}

/** The Sanctum proper: the octagon, its apses, the arch to its midpoint */
export function inSanctum(x: number, z: number): boolean {
    if (insideOctagon(x, z, HALL.apothem) || alcoveAt(x, z) !== null) return true;
    const l = worldToFacet(ENTRANCE_FACET, x, z);
    return Math.abs(l.x) <= ARCH.width / 2 && l.z >= -1.2 && l.z <= HALL.wallT / 2;
}

/** The room beyond the arch this point is in (the Overlook before the gallery it ends) */
export function roomIn(x: number, z: number, pad = 0): Room | null {
    const over = room('overlook');
    if (inRect(over, x, z, pad)) return over;
    for (const r of ROOMS) if (r.id !== 'overlook' && inRect(r, x, z, pad)) return r;
    return null;
}

function onRoomFloor(x: number, z: number, pad = 0): boolean {
    for (const r of FLOOR_RECTS) if (inRect(r, x, z, pad)) return true;
    return false;
}

export function doorIn(x: number, z: number, pad = 0): Door | null {
    for (const d of DOORS) {
        const r = d.rect;
        if (x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 + pad && z <= r.z1 - pad) return d;
    }
    return null;
}

/** Everything is under a roof now; kept for callers. */
export function underRoof(_x: number, _z: number): boolean {
    return true;
}

/** Is there floor here for a body of radius pad? */
export function onFloor(x: number, z: number, pad = 0): boolean {
    if (insideOctagon(x, z, HALL.apothem - pad)) return true;
    if (alcoveAt(x, z, pad) !== null) return true;
    if (inDoorway(x, z, pad)) return true;
    if (onRoomFloor(x, z, pad)) return true;
    if (doorIn(x, z, pad) !== null) return true;
    return false;
}

export function indoors(x: number, z: number, pad = 0): boolean {
    return onFloor(x, z, pad);
}

/**
 * "Outdoors" now means beyond the Sanctum — the Processional and the
 * chambers. The tour's "step through", the compass and the narrator all
 * key on this transition, as they did at the old front door.
 */
export function isOutdoors(x: number, z: number): boolean {
    return !inSanctum(x, z);
}

/** The building as a solid (there is nothing outside it, but the backdrop asks) */
export function inBuilding(x: number, z: number, pad = 0): boolean {
    if (insideOctagon(x, z, HALL.apothem + HALL.wallT + pad)) return true;
    for (const a of ALCOVES) {
        const l = worldToFacet(a.facet, x, z);
        if (Math.abs(l.x) <= ALCOVE.width / 2 + HALL.wallT + pad && l.z >= -0.1 && l.z <= ALCOVE.depth + HALL.wallT + pad) return true;
    }
    for (const r of ROOMS) if (inRect(r, x, z, -WALL_T - pad)) return true;
    return false;
}

export const clearOfHouse = (x: number, z: number) => !inBuilding(x, z, 1.6);

function hitsSolid(x: number, z: number, r: number): boolean {
    for (const p of PLACED) if (touches(p, x, z, r)) return true;
    return false;
}

/** Can a body of radius r stand here? Floor under it, nothing solid in it. */
export function walkable(x: number, z: number, r = PLAYER_R): boolean {
    if (x < JUNGLE_BOUNDS.minX || x > JUNGLE_BOUNDS.maxX || z < JUNGLE_BOUNDS.minZ || z > JUNGLE_BOUNDS.maxZ) return false;
    if (!onFloor(x, z, r)) return false;
    return !hitsSolid(x, z, r);
}

/** Is a point inside something solid (or off the world)? For the third-person boom. */
export function blockedAt(x: number, z: number, r = 0.2): boolean {
    return !walkable(x, z, r);
}

/** Try the move; slide along one axis if the full step is blocked. */
export function moveOn(
    _level: Level,
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    r = PLAYER_R,
): { x: number; z: number } {
    if (walkable(toX, toZ, r)) return { x: toX, z: toZ };
    if (walkable(toX, fromZ, r)) return { x: toX, z: fromZ };
    if (walkable(fromX, toZ, r)) return { x: fromX, z: toZ };
    return { x: fromX, z: fromZ };
}

/** Floor height — the dais rises at the Source, with a ramp you can walk up. */
export function groundAt(x: number, z: number, _level?: Level): number {
    const d = Math.hypot(x, z);
    if (d <= DAIS.r) return DAIS.h;
    if (d < DAIS.rampR) return DAIS.h * (1 - (d - DAIS.r) / (DAIS.rampR - DAIS.r));
    return MAIN_Y;
}

/** True if a saved pose is still walkable. */
export function poseClear(x: number, z: number): boolean {
    return walkable(x, z, PLAYER_R);
}

/** Soft floor: the rug apses, the cinema's carpet, the gallery runner */
export function onSoftFloor(x: number, z: number): boolean {
    const a = alcoveAt(x, z, 0.2);
    if (a) return a.soft && worldToFacet(a.facet, x, z).z > 0.8;
    const r = roomIn(x, z);
    if (r?.id === 'cinema') return true;
    if (r?.id === 'processional' && Math.abs(x) < 1.4) return true;
    return false;
}

/* ── Spawn, recentre, landmarks ─────────────────────────────── */

const terminal = alcove('terminal');
const seatL = solid('desk chair');
const seatW = facetToWorld(terminal.facet, seatL.x, seatL.z);
const standW = facetToWorld(terminal.facet, 0, 3.6);
const tn = { x: Math.cos(facetAngle(terminal.facet)), z: Math.sin(facetAngle(terminal.facet)) };

export const INTRO = {
    seat: { x: seatW.x, z: seatW.z },
    /** facing the desk — along the apse's outward normal */
    lookYaw: yawFacing(tn.x, tn.z),
    stand: { x: standW.x, z: standW.z },
    holdS: 1.1,
    riseS: 1.6,
} as const;

export const SPAWN: [number, number, number] = [INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z];
export const SPAWN_YAW = INTRO.lookYaw;

const archW = facetToWorld(ENTRANCE_FACET, 0, HALL.wallT / 2);
/** The arch — "home" for anyone lost beyond it */
export const FRONT_DOOR = { x: archW.x, z: archW.z };

const recenterW = facetToWorld(ENTRANCE_FACET, 0, -3.0);
const en = { x: Math.cos(facetAngle(ENTRANCE_FACET)), z: Math.sin(facetAngle(ENTRANCE_FACET)) };
/** Just inside the arch, facing the Source. */
export const RECENTER = { x: recenterW.x, z: recenterW.z, yaw: yawFacing(-en.x, -en.z) } as const;

/** "Face home" in the Sanctum turns you to the Source. */
export const HALL_SPINE = { x: 0, z: 0 } as const;

/* ── Stations ───────────────────────────────────────────────── */

export type HomeHotspot = Hotspot & { level: Level };

function at(atId: SolidAt, x: number, z: number, y = 1.2): [number, number, number] {
    const f = frameOf(atId);
    const w = f === null ? { x, z } : facetToWorld(f, x, z);
    return [w.x, y, w.z];
}

export const HOME_HOTSPOTS: HomeHotspot[] = [
    { id: 'computer', label: 'Truth.OS', hint: 'Sit back down at the terminal', level: 'main', position: at('terminal', 0, 3.6), radius: 1.8, action: { type: 'os' } },
    { id: 'arcade', label: 'Arcade', hint: 'Four cabinets · play', level: 'main', position: at('arcade', 0, 3.4), radius: 1.7, action: { type: 'panel', panel: 'arcade' } },
    { id: 'library', label: 'Library', hint: 'Take one down', level: 'main', position: at('library', 0, 4.0), radius: 1.7, action: { type: 'panel', panel: 'library' } },
    { id: 'codex', label: 'Codex', hint: 'Memory and whispers', level: 'main', position: at('codex', 0, 3.6), radius: 1.7, action: { type: 'panel', panel: 'codex' } },
    { id: 'ledger', label: 'The Ledger', hint: 'The record · the Word', level: 'main', position: at('ledger', 0, 4.3), radius: 1.5, action: { type: 'panel', panel: 'ledger' } },
    { id: 'wall', label: 'The Mark', hint: 'Choose a face · leave a mark', level: 'main', position: at('mark', 0, 3.8), radius: 1.9, action: { type: 'panel', panel: 'wall' } },
    { id: 'wayfinder', label: 'Paths', hint: 'The map of the lair', level: 'main', position: at('paths', 0, 3.8), radius: 1.7, action: { type: 'panel', panel: 'wayfinder' } },
    { id: 'fireplace', label: 'The Source', hint: 'Sit at the Source', level: 'main', position: [0, 1.3, 0], radius: DAIS.rampR + 0.2, action: { type: 'sit' } },
    { id: 'envelope', label: 'The Daily Word', hint: "This morning's paper", level: 'main', position: [-2.0, 1.1, 20.4], radius: 1.4, action: { type: 'panel', panel: 'news' } },
    { id: 'mailbox', label: 'Offering', hint: 'Keep the lair open', level: 'main', position: [2.0, 1.0, 20.4], radius: 1.4, action: { type: 'panel', panel: 'offering' } },
    { id: 'cinema', label: 'The Cinema', hint: 'Choose a film · the screen is live', level: 'main', position: [11.2, 1.2, C_CIN.z], radius: 2.6, action: { type: 'panel', panel: 'cinema' } },
    { id: 'cineworks', label: 'Cineworks table', hint: 'The catalog · posters', level: 'main', position: [8.0, 1.1, 33.2], radius: 1.6, action: { type: 'panel', panel: 'cineworks' } },
    { id: 'hall', label: 'The Hall Circle', hint: 'The community fire', level: 'main', position: [FIRE.x, 1.25, FIRE.z], radius: 3.2, action: { type: 'panel', panel: 'hall' } },
    { id: 'soul_mirror', label: 'The Mirror Well', hint: 'Look down · shape your vessel', level: 'main', position: [POOL.x - POOL.r - 1.6, 1.2, POOL.z], radius: 2.0, action: { type: 'panel', panel: 'soul' } },
    { id: 'studio', label: 'The Signal Studio', hint: 'Broadcast from the lair', level: 'main', position: [C_STU.x, 1.2, C_STU.z - 1.6], radius: 2.2, action: { type: 'panel', panel: 'studio' } },
];

export function hotspotWorldY(h: HomeHotspot): number {
    return MAIN_Y + h.position[1];
}

export function nearestHomeHotspot(x: number, z: number, _level?: Level): HomeHotspot | null {
    let best: HomeHotspot | null = null;
    let bestD = Infinity;
    for (const h of HOME_HOTSPOTS) {
        const d = Math.hypot(x - h.position[0], z - h.position[2]);
        if (d < h.radius && d < bestD) {
            bestD = d;
            best = h;
        }
    }
    return best;
}

/* ── Naming where you are ───────────────────────────────────── */

export type Place =
    | { kind: 'room'; id: string; name: string }
    | { kind: 'clearing'; name: string }
    | { kind: 'grove'; id: string; name: string; dist: number }
    | { kind: 'path'; name: string };

export function roomAt(x: number, z: number): Place {
    if (inSanctum(x, z)) {
        const a = alcoveAt(x, z, -0.2);
        if (a) return { kind: 'room', id: a.id, name: a.name };
        if (Math.hypot(x, z) < DAIS.rampR + 0.6) return { kind: 'room', id: 'source', name: 'The Source' };
        if (inDoorway(x, z)) return { kind: 'room', id: 'arch', name: 'The Arch' };
        return { kind: 'room', id: 'sanctum', name: 'The Sanctum' };
    }
    const d = doorIn(x, z);
    if (d) return { kind: 'room', id: `${d.id}_door`, name: `${room(d.id as RoomId).name} · door` };
    const r = roomIn(x, z);
    if (r) {
        if (r.id === 'cinema' || r.id === 'hall' || r.id === 'soul_mirror' || r.id === 'studio') {
            const c = roomCenter(r);
            return { kind: 'grove', id: r.id, name: r.name, dist: Math.hypot(x - c.x, z - c.z) };
        }
        return { kind: 'room', id: r.id, name: r.name };
    }
    return { kind: 'path', name: 'The Lair' };
}

export function nearestGrove(x: number, z: number): { id: string; name: string; dist: number; dx: number; dz: number } | null {
    let best: { id: string; name: string; dist: number; dx: number; dz: number } | null = null;
    for (const d of CHAMBERS) {
        const dx = d.x - x;
        const dz = d.z - z;
        const dist = Math.hypot(dx, dz);
        if (!best || dist < best.dist) best = { id: d.id, name: d.name, dist, dx, dz };
    }
    return best;
}

/* ── Sound zones ────────────────────────────────────────────── */

export type SoundZone = 'main' | 'bedroom' | 'library' | 'arcade' | 'os' | 'hearth' | 'studio' | 'soul' | 'living' | 'offering';

/** Which music bed belongs here */
export function zoneAt(x: number, z: number): SoundZone {
    if (inSanctum(x, z)) {
        const a = alcoveAt(x, z, -0.2);
        if (a?.id === 'library') return 'library';
        if (a?.id === 'arcade') return 'arcade';
        if (a?.id === 'terminal') return 'os';
        if (Math.hypot(x, z) < DAIS.rampR + 1.2) return 'hearth';
        return 'main';
    }
    const d = doorIn(x, z);
    const r = roomIn(x, z) ?? (d ? room(d.id as RoomId) : null);
    switch (r?.id) {
        case 'cinema':
            return 'living';
        case 'hall':
            return 'hearth';
        case 'soul_mirror':
            return 'soul';
        case 'studio':
            return 'studio';
        case 'overlook':
            return 'bedroom';
        default:
            return 'main';
    }
}

/** Where the looping ambiences sit */
export const AUDIO_ANCHORS = {
    /** the council fire in the Hall Circle — crackle */
    fire: { x: FIRE.x, z: FIRE.z, r: 7.5 },
    /** the terminal desk — fans */
    pc: (() => {
        const w = solidWorld(solid('desk'));
        return { x: w.x, z: w.z, r: 3.6 };
    })(),
    /** the arcade cabinets — static */
    tv: (() => {
        const w = facetToWorld(alcove('arcade').facet, 0, 4.6);
        return { x: w.x, z: w.z, r: 3.8 };
    })(),
} as const;

/* ── Truth's arrival lines, by place ────────────────────────── */

/** Voice line ids (public/voice/manifest.json) spoken once when you first enter a place */
export const PLACE_LINE: Record<string, string> = {
    processional: 'world_leave',
    overlook: 'aether_shelf',
    cinema: 'dest_cinema',
    hall: 'dest_hall',
    soul_mirror: 'dest_soul_mirror',
    studio: 'dest_studio',
};

/* ── The map ────────────────────────────────────────────────── */

export type MapOutline = {
    octagon: [number, number][];
    apses: { id: AlcoveId; name: string; pts: [number, number][] }[];
    arch: [number, number][];
    rooms: Room[];
    doors: Door[];
    bounds: { x0: number; z0: number; x1: number; z1: number };
};

/** Everything the wayfinder draws, in world metres */
export function mapOutline(): MapOutline {
    const octagon: [number, number][] = Array.from({ length: 8 }, (_, k) => {
        const a = facetAngle(k) + Math.PI / 8;
        return [Math.cos(a) * VERTEX_R, Math.sin(a) * VERTEX_R];
    });
    const quad = (facet: number, hw: number, z0: number, z1: number): [number, number][] =>
        (
            [
                [-hw, z0],
                [hw, z0],
                [hw, z1],
                [-hw, z1],
            ] as [number, number][]
        ).map(([x, z]) => {
            const w = facetToWorld(facet, x, z);
            return [w.x, w.z];
        });
    return {
        octagon,
        apses: ALCOVES.map((a) => ({ id: a.id, name: a.name, pts: quad(a.facet, ALCOVE.width / 2, 0, ALCOVE.depth) })),
        arch: quad(ENTRANCE_FACET, ARCH.width / 2, 0, HALL.wallT),
        rooms: ROOMS,
        doors: DOORS,
        bounds: { x0: -28, z0: -24, x1: 28, z1: 64 },
    };
}
