/**
 * The Lair — one building, every station of the Hut.
 *
 * The Sanctum: an octagonal hall with seven apses (Terminal, Library,
 * Codex, Arcade, Ledger, The Mark, Paths) around the Source. Through the
 * south arch, the Processional: a long gallery with the Daily Word and
 * the Offering at its head, four chambers off its sides — the Cinema and
 * the Hall Circle, then the Mirror Well and the Signal Studio — and the
 * Overlook at its end, a glass wall onto the cloud sea. There is no
 * outside. The sky is seen through the oculus, the skylights and the
 * glass.
 *
 * Collision is analytic. `walkable()` says where the floor is (the
 * octagon, the apse pockets, the arch, the rooms, the doorways) and every
 * prop is a circle in SOLIDS. The renderer, the walker and the validator
 * all read these same functions, so a prop cannot stand inside another
 * and a station cannot be sealed off without `npm run validate` saying so.
 */
import type { Hotspot } from './houseMap';

export const EYE_HEIGHT = 1.62;
export const SIT_HEIGHT = 1.12;
export const PLAYER_R = 0.34;

/** One storey; the type is kept so old call sites compile. */
export type Level = 'main';
export const MAIN_Y = 0;

/** The roam box — a backstop; the walkable region is the real fence */
export const JUNGLE_BOUNDS = { minX: -40, maxX: 40, minZ: -30, maxZ: 50 } as const;

/* ── The Sanctum ────────────────────────────────────────────── */

export const HALL = {
    /** centre → inner face of each facet */
    apothem: 11,
    wallT: 0.6,
    /** wall height to the eave */
    eave: 6.2,
    oculusR: 2.8,
    oculusY: 9.4,
    facets: 8,
} as const;

/** Half the length of one facet (inner face) */
export const FACET_HALF = HALL.apothem * Math.tan(Math.PI / 8);
/** Centre → a facet's end vertex (inner) */
export const VERTEX_R = HALL.apothem / Math.cos(Math.PI / 8);

export const ALCOVE = { width: 4.4, depth: 2.8, height: 3.6, apseH: 4.6 } as const;
/** The south arch into the Processional */
export const ARCH = { width: 3.6, height: 4.0 } as const;
/** Kept for callers that still say DOOR */
export const DOOR = ARCH;
export const DAIS = { r: 2.4, h: 0.28, rampR: 3.1 } as const;

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

export const WALL_T = 0.6;

/** Inner rectangles — the floor you stand on. Walls sit OUTSIDE these. */
export const ROOMS: Room[] = [
    { id: 'processional', name: 'The Processional', blurb: 'The long gallery', x0: -3.6, z0: 11.0, x1: 3.6, z1: 31.0, h: 5.6 },
    { id: 'overlook', name: 'The Overlook', blurb: 'Glass onto the cloud sea', x0: -3.6, z0: 31.0, x1: 3.6, z1: 37.0, h: 5.6 },
    { id: 'cinema', name: 'The Cinema', blurb: 'Films in the dark', x0: 4.2, z0: 13.6, x1: 19.6, z1: 25.6, h: 6.0 },
    { id: 'hall', name: 'The Hall Circle', blurb: 'The community fire', x0: -19.6, z0: 13.6, x1: -4.2, z1: 25.6, h: 6.4 },
    { id: 'soul_mirror', name: 'The Mirror Well', blurb: 'Shape your vessel', x0: 4.2, z0: 26.2, x1: 19.6, z1: 38.2, h: 6.5 },
    { id: 'studio', name: 'The Signal Studio', blurb: 'Broadcast from the lair', x0: -19.6, z0: 26.2, x1: -4.2, z1: 38.2, h: 5.2 },
];

export const room = (id: RoomId): Room => ROOMS.find((r) => r.id === id)!;
export const roomCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });

/**
 * Floor rectangles. The Overlook is the end of the Processional, not a
 * room with a wall between — one rectangle for the floor, two names.
 */
const FLOOR_RECTS: Rect[] = [
    { x0: room('processional').x0, z0: room('processional').z0, x1: room('processional').x1, z1: room('overlook').z1 },
    room('cinema'),
    room('hall'),
    room('soul_mirror'),
    room('studio'),
];

export type Door = {
    id: string;
    /** the gap through the wall — walkable */
    rect: Rect;
    /** the wall this door pierces runs along z (x is constant) */
    h: number;
    /** which side of the corridor */
    side: 'e' | 'w';
};

/** Doorways from the Processional into the chambers (3 m wide, 3.2 m tall) */
export const DOORS: Door[] = [
    { id: 'cinema', rect: { x0: 3.6, z0: 18.1, x1: 4.2, z1: 21.1 }, h: 3.2, side: 'e' },
    { id: 'hall', rect: { x0: -4.2, z0: 18.1, x1: -3.6, z1: 21.1 }, h: 3.2, side: 'w' },
    { id: 'soul_mirror', rect: { x0: 3.6, z0: 27.6, x1: 4.2, z1: 30.6 }, h: 3.2, side: 'e' },
    { id: 'studio', rect: { x0: -4.2, z0: 27.6, x1: -3.6, z1: 30.6 }, h: 3.2, side: 'w' },
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

/* ── Solids — every prop that takes floor ───────────────────── */

export type SolidAt = AlcoveId | 'world';

export type Solid = {
    name: string;
    /** which frame x/z are in: an apse, or the world */
    at: SolidAt;
    x: number;
    z: number;
    /** collision radius, metres */
    r: number;
    /** visual height, metres */
    h: number;
    /** yaw in the local frame (props face local +z) */
    yaw?: number;
    /** A chair pushed under a desk may share its circle — name the solid it tucks into */
    tuck?: string;
};

const ringAt = (cx: number, cz: number, a: number, r: number) => ({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });

const C_HALL = roomCenter(room('hall'));
const C_CIN = roomCenter(room('cinema'));
const C_MIR = roomCenter(room('soul_mirror'));
const C_STU = roomCenter(room('studio'));
/** The pool sits a little east of the Mirror Well's centre so the west lip is a stage */
export const POOL = { x: C_MIR.x + 1.0, z: C_MIR.z, r: 3.8 } as const;
export const FIRE = { x: C_HALL.x, z: C_HALL.z } as const;

export const SOLIDS: Solid[] = [
    // ── Terminal (north) — desk against the back wall, chair facing it
    { name: 'desk', at: 'terminal', x: 0, z: 2.3, r: 0.95, h: 0.76, yaw: Math.PI },
    { name: 'desk chair', at: 'terminal', x: 0, z: 1.42, r: 0.3, h: 0.9, yaw: 0, tuck: 'desk' },
    { name: 'terminal lamp', at: 'terminal', x: 1.75, z: 2.25, r: 0.2, h: 1.6 },
    { name: 'terminal plant', at: 'terminal', x: -1.75, z: 2.25, r: 0.26, h: 1.0 },
    // ── Library — three bays on the back wall, a chair to read in
    { name: 'library bay W', at: 'library', x: -1.25, z: 2.5, r: 0.55, h: 2.4, yaw: Math.PI },
    { name: 'library bay C', at: 'library', x: 0, z: 2.5, r: 0.55, h: 2.4, yaw: Math.PI },
    { name: 'library bay E', at: 'library', x: 1.25, z: 2.5, r: 0.55, h: 2.4, yaw: 2.9 },
    { name: 'reading chair', at: 'library', x: 1.35, z: 0.85, r: 0.42, h: 0.9, yaw: Math.PI + 0.7 },
    { name: 'library lamp', at: 'library', x: -1.7, z: 1.0, r: 0.2, h: 1.6 },
    // ── Codex — scribe's desk
    { name: 'codex desk', at: 'codex', x: 0, z: 2.35, r: 0.8, h: 0.78, yaw: Math.PI },
    { name: 'codex chair', at: 'codex', x: 0, z: 1.5, r: 0.3, h: 0.9, yaw: 0, tuck: 'codex desk' },
    { name: 'codex plant', at: 'codex', x: 1.7, z: 2.25, r: 0.26, h: 1.0 },
    // ── Arcade — two cabinets, screens toward the hall
    { name: 'arcade cabinet L', at: 'arcade', x: -0.78, z: 2.4, r: 0.46, h: 1.85 },
    { name: 'arcade cabinet R', at: 'arcade', x: 0.78, z: 2.4, r: 0.46, h: 1.85 },
    { name: 'arcade stool', at: 'arcade', x: 1.8, z: 1.55, r: 0.22, h: 0.72 },
    // ── Ledger — the record on a sideboard
    { name: 'ledger sideboard', at: 'ledger', x: 0, z: 2.4, r: 0.78, h: 0.9 },
    // ── The Mark — a bench to sit and look
    { name: 'mark bench', at: 'mark', x: -1.55, z: 0.7, r: 0.32, h: 0.5, yaw: Math.PI / 2 },
    // ── Paths — the map, two artworks, a bench and a plant
    { name: 'paths bench', at: 'paths', x: 1.55, z: 0.7, r: 0.32, h: 0.5, yaw: -Math.PI / 2 },
    { name: 'paths plant', at: 'paths', x: -1.75, z: 2.25, r: 0.26, h: 1.0 },
    // ── The Source — four low seats on the marble around the dais
    { name: 'source seat S', at: 'world', x: 0, z: 3.7, r: 0.42, h: 0.46, yaw: Math.PI },
    { name: 'source seat N', at: 'world', x: 0, z: -3.7, r: 0.42, h: 0.46, yaw: 0 },
    { name: 'source seat E', at: 'world', x: 3.7, z: 0, r: 0.42, h: 0.46, yaw: -Math.PI / 2 },
    { name: 'source seat W', at: 'world', x: -3.7, z: 0, r: 0.42, h: 0.46, yaw: Math.PI / 2 },
    // ── Eight columns at the hall's vertices, between the apses
    ...Array.from({ length: 8 }, (_, k) => {
        const a = facetAngle(k) + Math.PI / 8;
        const r = VERTEX_R - 0.75;
        return { name: `column ${k}`, at: 'world' as const, x: Math.cos(a) * r, z: Math.sin(a) * r, r: 0.5, h: HALL.eave };
    }),

    // ── The Processional — columns clear of every doorway, the Word and the Offering at its head
    ...[13.2, 16.4, 23.2, 26.0].flatMap((z, i) => [
        { name: `gallery column W${i}`, at: 'world' as const, x: -3.0, z, r: 0.42, h: 5.6 },
        { name: `gallery column E${i}`, at: 'world' as const, x: 3.0, z, r: 0.42, h: 5.6 },
    ]),
    { name: 'daily word lectern', at: 'world', x: -2.3, z: 15.0, r: 0.34, h: 0.95, yaw: 0.9 },
    { name: 'offering chest', at: 'world', x: 2.3, z: 15.0, r: 0.46, h: 0.6, yaw: -Math.PI / 2 },
    { name: 'gallery planter W', at: 'world', x: -2.9, z: 20.0, r: 0.45, h: 0.6 },
    { name: 'gallery planter E', at: 'world', x: 2.9, z: 20.0, r: 0.45, h: 0.6 },
    { name: 'gallery planter W2', at: 'world', x: -2.9, z: 29.0, r: 0.45, h: 0.6 },
    { name: 'gallery planter E2', at: 'world', x: 2.9, z: 29.0, r: 0.45, h: 0.6 },

    // ── The Overlook — two benches at the glass, a balustrade you cannot pass
    { name: 'overlook bench W', at: 'world', x: -2.0, z: 34.6, r: 0.6, h: 0.5, yaw: 0 },
    { name: 'overlook bench E', at: 'world', x: 2.0, z: 34.6, r: 0.6, h: 0.5, yaw: 0 },
    ...[-3, -2, -1, 0, 1, 2, 3].map((x) => ({ name: `balustrade ${x}`, at: 'world' as const, x, z: 36.35, r: 0.32, h: 1.0 })),

    // ── The Cinema — four rows of benches either side of the aisle, screen on the east wall
    ...[8.6, 11.0, 13.4, 15.8].flatMap((x, row) =>
        [-3.2, -1.6, 1.6, 3.2].map((dz, i) => ({
            name: `cinema bench ${row}${i}`,
            at: 'world' as const,
            x,
            z: C_CIN.z + dz,
            r: 0.6,
            h: 0.5,
            yaw: -Math.PI / 2,
        })),
    ),
    { name: 'cineworks table', at: 'world', x: 6.4, z: 15.2, r: 0.9, h: 0.8 },
    { name: 'cinema stall', at: 'world', x: 6.4, z: 24.0, r: 1.15, h: 1.8, yaw: Math.PI },
    { name: 'cinema stool A', at: 'world', x: 8.3, z: 24.4, r: 0.3, h: 0.5 },
    { name: 'cinema stool B', at: 'world', x: 9.4, z: 24.9, r: 0.3, h: 0.5 },
    { name: 'cinema barrel', at: 'world', x: 5.0, z: 25.0, r: 0.3, h: 0.95 },
    { name: 'cinema barrel 2', at: 'world', x: 18.8, z: 14.4, r: 0.3, h: 0.95 },

    // ── The Hall Circle — the fire, nine stones, six benches, a camp
    { name: 'council fire', at: 'world', x: FIRE.x, z: FIRE.z, r: 1.15, h: 0.9 },
    ...Array.from({ length: 9 }, (_, i) => {
        const a = 0.35 + i * ((Math.PI * 2) / 9);
        return { name: `hall stone ${i}`, at: 'world' as const, ...ringAt(FIRE.x, FIRE.z, a, 5.0), r: 0.55, h: 2.4 + (i % 3) * 0.5, yaw: -a };
    }),
    ...[0.7, 1.75, 2.6, 3.7, 4.55, 5.6].map((a, i) => ({
        name: `hall bench ${i}`,
        at: 'world' as const,
        ...ringAt(FIRE.x, FIRE.z, a, 3.0),
        r: 0.6,
        h: 0.5,
        yaw: -a - Math.PI / 2,
    })),
    { name: 'hall chest', at: 'world', ...ringAt(FIRE.x, FIRE.z, 2.2, 6.6), r: 0.45, h: 0.6, yaw: -2.2 - Math.PI },
    { name: 'hall chest 2', at: 'world', ...ringAt(FIRE.x, FIRE.z, 4.1, 6.6), r: 0.45, h: 0.6, yaw: -4.1 - Math.PI },
    { name: 'hall logs', at: 'world', ...ringAt(FIRE.x, FIRE.z, 1.3, 5.6), r: 0.5, h: 0.7, yaw: -1.3 },
    { name: 'hall logs 2', at: 'world', ...ringAt(FIRE.x, FIRE.z, 2.7, 6.5), r: 0.5, h: 0.7, yaw: -2.7 },
    { name: 'hall logs 3', at: 'world', ...ringAt(FIRE.x, FIRE.z, 5.0, 5.6), r: 0.5, h: 0.7, yaw: -5.0 },
    { name: 'hall bedroll', at: 'world', ...ringAt(FIRE.x, FIRE.z, 2.0, 4.1), r: 0.45, h: 0.14, yaw: -2.0 + Math.PI / 2 },
    { name: 'hall bedroll 2', at: 'world', ...ringAt(FIRE.x, FIRE.z, 4.3, 4.1), r: 0.45, h: 0.14, yaw: -4.3 + Math.PI / 2 },
    { name: 'speaker stone', at: 'world', x: C_HALL.x - 6.6, z: C_HALL.z, r: 1.0, h: 0.42 },

    // ── The Mirror Well — the pool itself, its rim, the ring and the obelisks behind it
    { name: 'pool', at: 'world', x: POOL.x, z: POOL.z, r: POOL.r, h: 0.05 },
    ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return { name: `pool rock ${i}`, at: 'world' as const, ...ringAt(POOL.x, POOL.z, a, POOL.r + 0.5), r: 0.4, h: 0.45, yaw: a };
    }),
    { name: 'well ring', at: 'world', x: POOL.x + POOL.r + 1.4, z: POOL.z, r: 0.6, h: 2.8, yaw: -Math.PI / 2 },
    { name: 'well obelisk N', at: 'world', x: POOL.x + POOL.r + 0.9, z: POOL.z - 3.6, r: 0.35, h: 2.4 },
    { name: 'well obelisk S', at: 'world', x: POOL.x + POOL.r + 0.9, z: POOL.z + 3.6, r: 0.35, h: 2.4 },
    { name: 'well bench N', at: 'world', x: C_MIR.x - 5.4, z: C_MIR.z - 3.4, r: 0.6, h: 0.5, yaw: Math.PI / 2 },
    { name: 'well bench S', at: 'world', x: C_MIR.x - 5.4, z: C_MIR.z + 3.4, r: 0.6, h: 0.5, yaw: Math.PI / 2 },

    // ── The Signal Studio — the desk, its chairs, the mast, the workshop
    { name: 'studio desk', at: 'world', x: C_STU.x, z: C_STU.z - 3.2, r: 1.4, h: 0.8, yaw: Math.PI },
    { name: 'studio chair L', at: 'world', x: C_STU.x - 0.7, z: C_STU.z - 2.0, r: 0.3, h: 0.9, yaw: Math.PI, tuck: 'studio desk' },
    { name: 'studio chair R', at: 'world', x: C_STU.x + 0.7, z: C_STU.z - 2.0, r: 0.3, h: 0.9, yaw: Math.PI, tuck: 'studio desk' },
    { name: 'studio mast', at: 'world', x: C_STU.x - 5.6, z: C_STU.z + 4.6, r: 0.3, h: 5.2 },
    { name: 'studio workbench', at: 'world', x: C_STU.x - 5.5, z: C_STU.z - 3.0, r: 0.75, h: 0.9, yaw: Math.PI / 2 },
    { name: 'studio crate', at: 'world', x: C_STU.x + 5.8, z: C_STU.z + 4.6, r: 0.45, h: 0.8, yaw: 0.3 },
    { name: 'studio crate 2', at: 'world', x: C_STU.x + 4.9, z: C_STU.z + 4.0, r: 0.4, h: 0.7, yaw: 1.2 },
    { name: 'studio crate 3', at: 'world', x: C_STU.x + 5.6, z: C_STU.z + 3.4, r: 0.4, h: 0.7, yaw: 0.8 },
    { name: 'studio barrel', at: 'world', x: C_STU.x - 5.7, z: C_STU.z - 4.8, r: 0.3, h: 0.95 },
    { name: 'studio barrel 2', at: 'world', x: C_STU.x - 4.9, z: C_STU.z - 4.3, r: 0.3, h: 0.9 },
    { name: 'studio lever', at: 'world', x: C_STU.x - 4.4, z: C_STU.z + 4.8, r: 0.35, h: 0.7 },
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
 * chambers. The tour's "step out", the compass and the narrator all key
 * on this transition, as they did at the old front door.
 */
export function isOutdoors(x: number, z: number): boolean {
    return !inSanctum(x, z);
}

/** The building as a solid (there is nothing outside it, but the shards and clouds ask) */
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
    for (const s of SOLIDS) {
        const w = solidWorld(s);
        const dx = x - w.x;
        const dz = z - w.z;
        const rr = s.r + r;
        if (dx * dx + dz * dz < rr * rr) return true;
    }
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

/** Rugs: the soft apses, the cinema's carpet, the gallery runner */
export function onSoftFloor(x: number, z: number): boolean {
    const a = alcoveAt(x, z, 0.2);
    if (a) return a.soft && worldToFacet(a.facet, x, z).z > 0.3;
    const r = roomIn(x, z);
    if (r?.id === 'cinema') return true;
    if (r?.id === 'processional' && Math.abs(x) < 1.1) return true;
    return false;
}

/* ── Spawn, recentre, landmarks ─────────────────────────────── */

const terminal = alcove('terminal');
const seatL = solid('desk chair');
const seatW = facetToWorld(terminal.facet, seatL.x, seatL.z);
const standW = facetToWorld(terminal.facet, 0, 0.55);
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

const recenterW = facetToWorld(ENTRANCE_FACET, 0, -2.4);
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
    { id: 'computer', label: 'Truth.OS', hint: 'Sit back down at the terminal', level: 'main', position: at('terminal', 0, 1.1), radius: 1.6, action: { type: 'os' } },
    { id: 'arcade', label: 'Arcade', hint: 'Two cabinets · play', level: 'main', position: at('arcade', 0, 1.3), radius: 1.7, action: { type: 'panel', panel: 'arcade' } },
    { id: 'library', label: 'Library', hint: 'Take one down', level: 'main', position: at('library', 0, 1.3), radius: 1.7, action: { type: 'panel', panel: 'library' } },
    { id: 'codex', label: 'Codex', hint: 'Memory and whispers', level: 'main', position: at('codex', 0, 1.2), radius: 1.6, action: { type: 'panel', panel: 'codex' } },
    { id: 'ledger', label: 'The Ledger', hint: 'The record · the Word', level: 'main', position: at('ledger', 0, 1.4), radius: 1.6, action: { type: 'panel', panel: 'ledger' } },
    { id: 'wall', label: 'The Mark', hint: 'Choose a face · leave a mark', level: 'main', position: at('mark', 0, 1.2), radius: 1.8, action: { type: 'panel', panel: 'wall' } },
    { id: 'wayfinder', label: 'Paths', hint: 'The map of the lair', level: 'main', position: at('paths', 0, 1.2), radius: 1.7, action: { type: 'panel', panel: 'wayfinder' } },
    { id: 'fireplace', label: 'The Source', hint: 'Sit at the Source', level: 'main', position: [0, 1.3, 0], radius: DAIS.rampR + 0.2, action: { type: 'sit' } },
    { id: 'envelope', label: 'The Daily Word', hint: "This morning's paper", level: 'main', position: [-1.7, 1.1, 15.4], radius: 1.3, action: { type: 'panel', panel: 'news' } },
    { id: 'mailbox', label: 'Offering', hint: 'Keep the lair open', level: 'main', position: [1.7, 1.0, 15.4], radius: 1.3, action: { type: 'panel', panel: 'offering' } },
    { id: 'cinema', label: 'The Cinema', hint: 'Choose a film · the screen is live', level: 'main', position: [10.2, 1.2, C_CIN.z], radius: 2.6, action: { type: 'panel', panel: 'cinema' } },
    { id: 'cineworks', label: 'Cineworks table', hint: 'The catalog · posters', level: 'main', position: [6.9, 1.1, 15.9], radius: 1.7, action: { type: 'panel', panel: 'cineworks' } },
    { id: 'hall', label: 'The Hall Circle', hint: 'The community fire', level: 'main', position: [FIRE.x, 1.25, FIRE.z], radius: 3.1, action: { type: 'panel', panel: 'hall' } },
    { id: 'soul_mirror', label: 'The Mirror Well', hint: 'Look down · shape your vessel', level: 'main', position: [POOL.x - POOL.r - 1.1, 1.2, POOL.z], radius: 2.1, action: { type: 'panel', panel: 'soul' } },
    { id: 'studio', label: 'The Signal Studio', hint: 'Broadcast from the lair', level: 'main', position: [C_STU.x, 1.2, C_STU.z - 1.1], radius: 2.4, action: { type: 'panel', panel: 'studio' } },
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
        if (Math.hypot(x, z) < DAIS.rampR + 0.4) return { kind: 'room', id: 'source', name: 'The Source' };
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
        if (Math.hypot(x, z) < DAIS.rampR + 0.8) return 'hearth';
        return 'main';
    }
    const r = roomIn(x, z) ?? (doorIn(x, z) ? room(doorIn(x, z)!.id as RoomId) : null);
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
    fire: { x: FIRE.x, z: FIRE.z, r: 5.2 },
    /** the terminal desk — fans */
    pc: (() => {
        const w = solidWorld(solid('desk'));
        return { x: w.x, z: w.z, r: 3.2 };
    })(),
    /** the arcade cabinets — static */
    tv: (() => {
        const w = facetToWorld(alcove('arcade').facet, 0, 2.0);
        return { x: w.x, z: w.z, r: 3.4 };
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
    };
}
