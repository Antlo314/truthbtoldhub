/**
 * The Safe House — two storeys, built from the real drawings, then
 * scaled up to live at world size.
 *
 * Source plan: main floor 1,064.3 sqft · upper 1,393.4 sqft · width
 * 44'-7" · depth 50'-2". Every coordinate below is the drawing in
 * plan-metres, passed through u() — one scale knob. At S = 2 the house
 * runs 27.2 × 30.6 m, the same presence as the original safe house,
 * with the drawing's exact proportions.
 *
 * What scales and what doesn't: room coordinates scale; ceilings stay
 * 10 ft (a 20 ft bedroom ceiling is a cathedral, not a home); the
 * player, doors and wall thickness stay human-sized (doors widen 1.5×,
 * not 2×, because a 2.4 m door void reads as a missing wall).
 *
 * Orientation: the street, driveway, garage and front door face +Z.
 * The rear patio faces -Z. Origin is the centre of the footprint.
 *
 * This file is the single source: geometry, colliders, floor heights,
 * the stair ramp, the intro desk and the hotspots all read these tables.
 */
import type { Hotspot } from './houseMap';
import { DESTINATIONS, destCenter, JUNGLE_BOUNDS, JUNGLE_COLLIDERS } from './jungleMap';

const FT = 0.3048;
export const ft = (feet: number, inches = 0) => (feet + inches / 12) * FT;

/** The scale knob. 2 = the drawing, doubled. */
export const S = 2;
/** Plan-metres → world-metres */
export const u = (n: number) => n * S;
/** Door gaps grow slower than rooms */
const DOOR = 1.5;

/* ── Envelope ─────────────────────────────────────────────── */

export const HOME_W = u(ft(44, 7)); // 27.18
export const HOME_D = u(ft(50, 2)); // 30.58

export const SHELL = {
    minX: -HOME_W / 2,
    maxX: HOME_W / 2,
    minZ: -HOME_D / 2,
    maxZ: HOME_D / 2,
    t: 0.24,
} as const;

/** Ceilings stay true to the plan — 10 ft clear per storey */
export const STOREY = ft(10);
export const MAIN_Y = 0;
export const UPPER_Y = STOREY + 0.3;
export const ROOF_Y = UPPER_Y + STOREY;

export const EYE_HEIGHT = 1.62;
export const SIT_HEIGHT = 1.12;
export const PLAYER_R = 0.34;

/* ── Rooms ────────────────────────────────────────────────── */

export type Level = 'main' | 'upper';

export type Room = {
    id: string;
    name: string;
    level: Level;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    solid?: boolean;
    open?: boolean;
};

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;

/* Band edges (plan-metres, scaled) */
const W_E = u(-2.7);
const C_E = u(0.2);

export const ROOMS: Room[] = [
    /* ── MAIN FLOOR ─────────────────────────────── */
    { id: 'rec', name: 'Rec Room', level: 'main', minX: X0, maxX: W_E, minZ: u(2.3), maxZ: Z1 },
    { id: 'foyer', name: 'Foyer', level: 'main', minX: W_E, maxX: C_E, minZ: u(2.3), maxZ: Z1 },
    { id: 'bath', name: 'Bath', level: 'main', minX: X0, maxX: W_E, minZ: u(0.6), maxZ: u(2.3) },
    { id: 'mud', name: 'Mud', level: 'main', minX: W_E, maxX: C_E, minZ: u(0.6), maxZ: u(2.3) },
    { id: 'bed_w', name: 'Bedroom', level: 'main', minX: X0, maxX: u(-3.1), minZ: u(-4.4), maxZ: u(0.6) },
    { id: 'bed_n', name: 'Bedroom', level: 'main', minX: u(-3.1), maxX: u(1.27), minZ: Z0, maxZ: u(-4.4) },
    // The circulation spine: bedrooms -> mud -> foyer. It existed as
    // walkable space but had no room, therefore no floor.
    { id: 'hall_m', name: 'Hall', level: 'main', minX: u(-3.1), maxX: C_E, minZ: u(-4.4), maxZ: u(0.6) },
    { id: 'mech', name: 'Mech', level: 'main', minX: C_E, maxX: u(1.27), minZ: u(-1.0), maxZ: u(0.6), solid: true },
    { id: 'garage', name: 'Garage', level: 'main', minX: u(1.27), maxX: X1, minZ: u(0.4), maxZ: Z1, solid: true },
    { id: 'tandem', name: 'Tandem', level: 'main', minX: u(1.27), maxX: X1, minZ: u(-4.4), maxZ: u(0.4), solid: true },

    /* ── UPPER FLOOR ────────────────────────────── */
    { id: 'master', name: 'Master', level: 'upper', minX: X0, maxX: u(-2.66), minZ: u(2.67), maxZ: Z1 },
    { id: 'ensuite', name: 'Ensuite', level: 'upper', minX: X0, maxX: u(-4.5), minZ: u(-0.4), maxZ: u(2.67) },
    { id: 'wic', name: 'Walk-in', level: 'upper', minX: u(-4.5), maxX: u(-2.66), minZ: u(0.6), maxZ: u(2.67) },
    { id: 'bed_u', name: 'Bedroom', level: 'upper', minX: X0, maxX: u(-3.3), minZ: u(-4.3), maxZ: u(-0.4) },
    { id: 'laundry', name: 'Laundry', level: 'upper', minX: u(-3.3), maxX: u(-0.5), minZ: u(-4.3), maxZ: u(-1.9) },
    { id: 'pwdr', name: 'Powder', level: 'upper', minX: u(-2.66), maxX: u(-0.5), minZ: u(-0.4), maxZ: u(0.6) },
    { id: 'dining', name: 'Dining', level: 'upper', minX: u(-0.5), maxX: u(2.7), minZ: u(0.4), maxZ: u(3.6) },
    { id: 'kitchen', name: 'Kitchen', level: 'upper', minX: u(0.9), maxX: X1, minZ: u(-4.4), maxZ: u(-1.2) },
    { id: 'living', name: 'Living', level: 'upper', minX: u(2.7), maxX: X1, minZ: u(-1.2), maxZ: u(3.6) },
    // The platform the stair arrives on. North of it: the open shaft —
    // no room, therefore no floor, which is what a stairwell IS.
    { id: 'landing', name: 'Landing', level: 'upper', minX: u(-2.66), maxX: u(-0.5), minZ: u(0.6), maxZ: u(1.7) },
    { id: 'balcony', name: 'Covered Balcony', level: 'upper', minX: u(0.9), maxX: X1, minZ: u(3.6), maxZ: Z1, open: true },
    { id: 'patio', name: 'Covered Patio', level: 'upper', minX: u(3.3), maxX: X1, minZ: Z0, maxZ: u(-4.4), open: true },
];

export const roomsOn = (level: Level) => ROOMS.filter((r) => r.level === level);

/* ── The stair ────────────────────────────────────────────── */

export const STAIR = {
    /** Fills the shaft between its two enclosing walls */
    minX: u(-2.57),
    maxX: u(-0.58),
    zBottom: u(5.2),
    zTop: u(1.7),
    yBottom: MAIN_Y,
    yTop: UPPER_Y,
    treads: 18,
} as const;

/**
 * The shaft the stair lives in — the hole in the upper floor.
 * No upper room covers it, so no floor is drawn there.
 */
/** The double-height foyer: upper storey has no floor here */
export const VOID = {
    minX: u(-2.66),
    maxX: u(0.9),
    minZ: u(5.2),
    maxZ: Z1,
} as const;

export const SHAFT = {
    minX: u(-2.66),
    maxX: u(-0.5),
    minZ: u(1.7),
    maxZ: u(5.2),
} as const;

const inStair = (x: number, z: number) =>
    x > STAIR.minX && x < STAIR.maxX && z > STAIR.zTop && z < STAIR.zBottom;

function stairY(z: number): number {
    const t = (STAIR.zBottom - z) / (STAIR.zBottom - STAIR.zTop);
    return STAIR.yBottom + Math.min(1, Math.max(0, t)) * (STAIR.yTop - STAIR.yBottom);
}

/* ── Walkable ground ──────────────────────────────────────── */

const inRoom = (x: number, z: number, r: Room) =>
    x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;

/**
 * Is (x,z) on the upper storey's floor?
 *
 * Deliberately NOT "is there a room here". Rooms describe finishes and
 * they do not tile the plate — the gaps between them (the bedroom
 * corridor, the strip behind the laundry, the space beside the kitchen)
 * were walkable AIR, and you fell through them. The upper storey is one
 * slab with exactly two holes: the stairwell and the foyer void.
 */
export function onUpperFootprint(x: number, z: number): boolean {
    if (x <= X0 || x >= X1 || z <= Z0 || z >= Z1) return false;
    if (x > SHAFT.minX && x < SHAFT.maxX && z > SHAFT.minZ && z < SHAFT.maxZ) return false;
    if (x > VOID.minX && x < VOID.maxX && z > VOID.minZ && z < VOID.maxZ) return false;
    return true;
}

/** Floor height under the player. See v1 notes: level disambiguates. */
export function groundAt(x: number, z: number, level: Level): number {
    if (inStair(x, z)) return stairY(z);
    if (level === 'upper' && onUpperFootprint(x, z)) return UPPER_Y;
    return MAIN_Y;
}

/** Storey after a move — switches only at the stair's ends. */
export function levelAfter(x: number, z: number, level: Level): Level {
    if (!inStair(x, z)) return level;
    if (z <= STAIR.zTop + 1.4) return 'upper';
    // Hand over to the main floor WELL before the bottom tread, so the
    // rail guarding the foyer void can never block a descent.
    if (z >= STAIR.zBottom - 1.4) return 'main';
    return level;
}

/* ── Colliders ────────────────────────────────────────────── */

export type Collider = { x: number; z: number; hx: number; hz: number };

/**
 * A wall segment. Every run is EXTENDED by half a wall thickness at both
 * ends along its axis, so any two walls whose endpoints share a corner
 * physically overlap instead of kissing at a zero-width line. "Some walls
 * aren't even touching" was exactly this: segments met edge-to-edge and
 * floating-point met daylight. Overlap is invisible; a seam is not.
 */
const seg = (x1: number, z1: number, x2: number, z2: number, t = SHELL.t): Collider => {
    const alongX = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    const ext = t / 2;
    return {
        x: (x1 + x2) / 2,
        z: (z1 + z2) / 2,
        hx: alongX ? Math.abs(x2 - x1) / 2 + ext : t / 2,
        hz: alongX ? t / 2 : Math.abs(z2 - z1) / 2 + ext,
    };
};

/** Every doorway punched by withDoor — casings and thresholds read this */
export type Doorway = { x: number; z: number; w: number; axis: 'x' | 'z' };
export const DOORWAYS: Doorway[] = [];

function withDoor(
    x1: number, z1: number, x2: number, z2: number,
    gapC: number, gapW = DOOR, t = SHELL.t,
): Collider[] {
    const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    if (horizontal) {
        DOORWAYS.push({ x: gapC, z: (z1 + z2) / 2, w: gapW, axis: 'x' });
        // Keep even tiny stubs: the old filter silently DELETED any piece
        // shorter than the wall's own thickness, which left an open gap
        // at the corner wherever a doorway sat near a wall end.
        return [
            seg(x1, z1, gapC - gapW / 2, z2, t),
            seg(gapC + gapW / 2, z1, x2, z2, t),
        ].filter((c) => c.hx > t / 2 + 0.001 && Math.abs(x2 - x1) > 0.02);
    }
    DOORWAYS.push({ x: (x1 + x2) / 2, z: gapC, w: gapW, axis: 'z' });
    return [
        seg(x1, z1, x2, gapC - gapW / 2, t),
        seg(x1, gapC + gapW / 2, x2, z2, t),
    ].filter((c) => c.hz > t / 2 + 0.001 && Math.abs(z2 - z1) > 0.02);
}

/**
 * The stair enclosure — present at EVERY level, which is the fix for
 * walking off the steps. A stair is a corridor: a solid wall on the
 * west, a balustrade on the east. Both are solid to a body; only one
 * is solid to the eye. Without these the climb had open sides and you
 * could step straight out over the foyer.
 */
export const STAIR_WALLS: Collider[] = [
    { x: SHAFT.minX, z: (SHAFT.minZ + SHAFT.maxZ) / 2, hx: 0.12, hz: (SHAFT.maxZ - SHAFT.minZ) / 2 + 0.12 },
    { x: SHAFT.maxX, z: (SHAFT.minZ + SHAFT.maxZ) / 2, hx: 0.12, hz: (SHAFT.maxZ - SHAFT.minZ) / 2 + 0.12 },
];

/** The stair mouth is a cased opening, not a hole */
DOORWAYS.push({ x: (STAIR.minX + STAIR.maxX) / 2, z: STAIR.zBottom, w: STAIR.maxX - STAIR.minX, axis: 'x' });

const SHELL_WALLS: Collider[] = [
    seg(X0, Z0, X1, Z0),
    seg(X0, Z0, X0, Z1),
    seg(X1, Z0, X1, Z1),
];

export const MAIN_COLLIDERS: Collider[] = [
    ...SHELL_WALLS,
    // Front wall — door gap on the foyer axis
    ...withDoor(X0, Z1, X1, Z1, u(-1.2), 1.8),
    // West band / centre divider — doors to rec and mud
    // Rec door sits NORTH of the stair shaft — at u(5.0) it opened
    // straight into the enclosure wall and was unpassable.
    ...withDoor(W_E, u(2.3), W_E, Z1, u(6.2), DOOR),
    ...withDoor(W_E, u(0.6), W_E, u(2.3), u(0.9), 1.35),
    // Centre / garage dividers
    seg(C_E, u(-1.0), C_E, Z1),
    seg(u(1.27), Z0, u(1.27), Z1),
    // Rec / bath · bath / bedroom
    ...withDoor(X0, u(2.3), W_E, u(2.3), u(-4.0), 1.35),
    ...withDoor(X0, u(0.6), W_E, u(0.6), u(-5.6), 1.35),
    // Bedrooms
    ...withDoor(u(-3.1), u(-4.4), u(1.27), u(-4.4), u(-1.0), 1.35),
    seg(u(-3.1), u(-4.4), u(-3.1), u(0.6)),
    // Mud / mech — and mech's south face, which was open to the corridor
    seg(C_E, u(0.6), u(1.27), u(0.6)),
    seg(C_E, u(-1.0), u(1.27), u(-1.0)),
    // Under the stair: the ramp's north end is a wall at ground level.
    // Without it you walk into the underside of the flight and the floor
    // height jumps three metres.
    seg(SHAFT.minX, SHAFT.minZ, SHAFT.maxX, SHAFT.minZ),
    ...STAIR_WALLS,
    // The jungle: outdoors the same walls that always held
    ...JUNGLE_COLLIDERS,
];

/** Doorways pushed so far belong to the main storey (stair mouth included) */
export const MAIN_DOORWAYS_END = DOORWAYS.length;

export const UPPER_COLLIDERS: Collider[] = [
    ...SHELL_WALLS,
    seg(X0, Z1, X1, Z1),
    // Master suite
    ...withDoor(X0, u(2.67), u(-2.66), u(2.67), u(-5.4), 1.35),
    seg(u(-2.66), u(2.67), u(-2.66), Z1),
    // Ensuite / WIC
    ...withDoor(u(-4.5), u(0.6), u(-4.5), u(2.67), u(1.9), 1.2),
    ...withDoor(X0, u(-0.4), u(-2.66), u(-0.4), u(-5.9), 1.25),
    // Bedroom / laundry
    seg(u(-3.3), u(-4.3), u(-3.3), u(-0.4)),
    ...withDoor(u(-3.3), u(-1.9), u(-0.5), u(-1.9), u(-2.4), 1.25),
    // Powder
    ...withDoor(u(-2.66), u(0.6), u(-0.5), u(0.6), u(-1.9), 1.2),
    seg(u(-0.5), u(-0.4), u(-0.5), u(1.0)),
    // Walls the first pass simply never drew — every one of these was a
    // room whose partition stopped short of its neighbour:
    // walk-in's south face (it hung open into the ensuite)
    seg(u(-4.5), u(0.6), u(-2.66), u(0.6)),
    // powder's west face
    seg(u(-2.66), u(-0.4), u(-2.66), u(0.6)),
    // laundry's east face
    seg(u(-0.5), u(-4.3), u(-0.5), u(-1.9)),
    // bedroom + laundry north faces (they were open to the patio corridor)
    seg(X0, u(-4.3), u(-3.3), u(-4.3)),
    seg(u(-3.3), u(-4.3), u(-0.5), u(-4.3)),
    // kitchen's north face, with the door out to the covered patio
    ...withDoor(u(0.9), u(-4.4), X1, u(-4.4), u(4.2), 1.4),
    // Kitchen west wall + dining/living divider (open plan, half-walls)
    seg(u(0.9), u(-4.4), u(0.9), u(-1.2)),
    seg(u(2.7), u(0.4), u(2.7), u(3.6)),
    // Guard the foyer void: dining's north edge, and the balcony's west
    seg(u(-0.5), u(3.6), u(0.9), u(3.6)),
    seg(u(0.9), u(3.6), u(0.9), Z1),
    // Balcony + patio rails
    seg(u(0.9), Z1, X1, Z1),
    seg(u(3.3), Z0, X1, Z0),
    // Same enclosure, upper storey — you arrive between the same walls
    ...STAIR_WALLS,
    // …and the shaft's far end is railed, so an upper-floor walker can
    // never stroll off the landing into the foyer drop.
    seg(SHAFT.minX, SHAFT.maxZ, SHAFT.maxX, SHAFT.maxZ),
    seg(SHAFT.maxX, VOID.minZ, VOID.maxX, VOID.minZ),
];

/** The rec-room desk — the anchor of the intro and of the FURNITURE table below */
export const DESK = {
    x: u(-5.9),
    z: u(6.2),
    monitorY: 1.35,
} as const;

/**
 * Every solid prop in the house, as a footprint.
 *
 * This table is the reason you cannot walk through the furniture: it is
 * concatenated onto the wall colliders in collidersFor(). One entry per
 * prop that HomeDecor/HomeInterior actually place, half-extents taken
 * from the prop's real size (props are human-scale metres even though
 * the ROOMS ride the u() doubling).
 *
 * Two deliberate omissions:
 *   · rugs — flat, you walk on them;
 *   · the rec-room desk chair — every session SPAWNS seated in it, and a
 *     collider you start inside blocks both slide axes, i.e. you wake up
 *     unable to move.
 *
 * scripts/validate-house.mjs asserts nothing here sits in a doorway or
 * on the stair, and that every room is still reachable from the seat.
 */
export const FURNITURE: (Collider & { level: Level; name: string })[] = [
    /* ── MAIN: rec room ───────────────────────────────── */
    { name: 'desk', level: 'main', x: DESK.x, z: DESK.z, hx: 1.0, hz: 0.45 },
    { name: 'rec sofa', level: 'main', x: u(-4.2), z: u(7.2), hx: 1.25, hz: 0.5 },
    { name: 'rec coffee table', level: 'main', x: u(-4.2), z: u(5.4), hx: 0.58, hz: 0.36 },
    { name: 'floor lamp', level: 'main', x: u(-6.4), z: u(7.3), hx: 0.22, hz: 0.22 },
    { name: 'arcade cabinet', level: 'main', x: u(-2.95), z: u(7.2), hx: 0.42, hz: 0.37 },
    { name: 'rec side table', level: 'main', x: u(-1.6), z: u(6.9), hx: 0.46, hz: 0.36 },
    { name: 'rec plant', level: 'main', x: u(-6.6), z: u(3.0), hx: 0.3, hz: 0.3 },

    /* ── MAIN: bedrooms + bath ────────────────────────── */
    { name: 'bed (west)', level: 'main', x: u(-5.9), z: u(-2.4), hx: 1.15, hz: 1.25 },
    // Was at z u(-0.6), standing squarely in the bedroom doorway
    { name: 'nightstand', level: 'main', x: u(-6.4), z: u(-3.9), hx: 0.3, hz: 0.3 },
    { name: 'bed (north)', level: 'main', x: u(-1.0), z: u(-6.2), hx: 1.25, hz: 1.15 },
    { name: 'dresser', level: 'main', x: u(0.6), z: u(-6.9), hx: 0.58, hz: 0.32 },
    { name: 'bath vanity', level: 'main', x: u(-6.2), z: u(1.4), hx: 0.88, hz: 0.42 },

    /* ── UPPER: kitchen ───────────────────────────────── */
    { name: 'island', level: 'upper', x: u(3.4), z: u(-2.6), hx: 2.2, hz: 0.7 },
    { name: 'counter run', level: 'upper', x: u(3.2), z: -SHELL.maxZ + 0.9, hx: 3.85, hz: 0.4 },
    { name: 'fridge', level: 'upper', x: u(1.6), z: u(-6.9), hx: 0.42, hz: 0.37 },
    { name: 'stove', level: 'upper', x: u(4.4), z: u(-6.9), hx: 0.47, hz: 0.34 },

    /* ── UPPER: dining + the Ledger ───────────────────── */
    { name: 'dining table', level: 'upper', x: u(1.1), z: u(2.0), hx: 1.3, hz: 0.9 },
    // Was at x u(-0.3), overhanging the stair's top landing
    { name: 'sideboard (Ledger)', level: 'upper', x: u(0.2), z: u(3.3), hx: 0.98, hz: 0.28 },

    /* ── UPPER: living + the Library wall ─────────────── */
    { name: 'bookshelf wall', level: 'upper', x: u(6.6), z: u(1.3), hx: 0.35, hz: 2.6 },
    { name: 'living sofa', level: 'upper', x: u(4.6), z: u(1.6), hx: 1.8, hz: 0.6 },
    { name: 'living coffee table', level: 'upper', x: u(4.6), z: u(-0.1), hx: 0.68, hz: 0.42 },
    { name: 'accent chair', level: 'upper', x: u(6.2), z: u(3.2), hx: 0.46, hz: 0.46 },
    { name: 'media wall', level: 'upper', x: SHELL.maxX - 0.45, z: u(-0.9), hx: 0.38, hz: 0.82 },
    { name: 'codex desk', level: 'upper', x: u(2.6), z: u(-4.0), hx: 0.58, hz: 0.28 },

    /* ── UPPER: master + bedroom ──────────────────────── */
    { name: 'master bed', level: 'upper', x: u(-5.2), z: u(5.6), hx: 1.3, hz: 1.4 },
    { name: 'bedside (west)', level: 'upper', x: u(-6.7), z: u(6.8), hx: 0.3, hz: 0.3 },
    { name: 'bedside (east)', level: 'upper', x: u(-3.7), z: u(6.8), hx: 0.3, hz: 0.3 },
    { name: 'upper bed', level: 'upper', x: u(-3.6), z: u(-2.8), hx: 1.05, hz: 1.0 },

    /* ── UPPER: balcony ───────────────────────────────── */
    { name: 'balcony chair (w)', level: 'upper', x: u(4.6), z: u(5.6), hx: 0.46, hz: 0.46 },
    { name: 'balcony chair (e)', level: 'upper', x: u(5.9), z: u(5.6), hx: 0.46, hz: 0.46 },
];

export function collidersFor(level: Level): Collider[] {
    return [
        ...(level === 'upper' ? UPPER_COLLIDERS : MAIN_COLLIDERS),
        ...FURNITURE.filter((f) => f.level === level),
    ];
}

/* ── Movement ─────────────────────────────────────────────── */

function hits(x: number, z: number, cs: Collider[], r: number): boolean {
    for (const c of cs) {
        if (x > c.x - c.hx - r && x < c.x + c.hx + r && z > c.z - c.hz - r && z < c.z + c.hz + r) {
            return true;
        }
    }
    return false;
}

export function moveOn(
    level: Level,
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    r = PLAYER_R,
): { x: number; z: number } {
    const cs = collidersFor(level);
    let x = toX;
    let z = toZ;
    if (hits(x, z, cs, r)) {
        if (!hits(toX, fromZ, cs, r)) { x = toX; z = fromZ; }
        else if (!hits(fromX, toZ, cs, r)) { x = fromX; z = toZ; }
        else { x = fromX; z = fromZ; }
    }
    // The jungle's outer fence still stands
    x = Math.max(JUNGLE_BOUNDS.minX, Math.min(JUNGLE_BOUNDS.maxX, x));
    z = Math.max(JUNGLE_BOUNDS.minZ, Math.min(JUNGLE_BOUNDS.maxZ, z));
    return { x, z };
}

/* ── The intro: every session starts at the desk ──────────── */

/**
 * You were always at the terminal — the 3D world opens with you
 * SITTING at the rec-room desk in front of the monitor. The controller
 * plays seat → stand → free, and the monitor is the room's light source
 * so the first thing you see is the thing you just left.
 */
export const INTRO = {
    /** Where the player sits (world coords, main floor) */
    seat: { x: u(-5.9), z: u(5.05) },
    /** Facing the monitor: desk sits at +z of the seat, and in three a
        yaw of 0 looks down -z — so the seated gaze is a half turn. */
    lookYaw: Math.PI,
    /** Where they end up standing */
    stand: { x: u(-5.9), z: u(4.55) },
    /** Seconds: hold on the glow, then rise */
    holdS: 1.1,
    riseS: 1.6,
} as const;

/* ── Spawn (used if the intro is skipped) ─────────────────── */

export const SPAWN: [number, number, number] = [INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z];
export const SPAWN_YAW = INTRO.lookYaw;

export const FRONT_DOOR = { x: u(-1.2), z: Z1 };
export const GARAGE_DOOR = { x: u(4.0), z: Z1 };

/* ── Hotspots ─────────────────────────────────────────────── */

/**
 * Same Hotspot shape the panel pipeline has always consumed, plus a
 * level. The four world destinations are generated from jungleMap, so
 * the map, the paths and the interaction points can never disagree.
 */
export type HomeHotspot = Hotspot & { level: Level };

const DEST_PANEL: Record<string, { label: string; hint: string; panel: string }> = {
    cinema: { label: 'The Cinema Grove', hint: 'Films under the canopy', panel: 'cinema' },
    hall: { label: 'The Hall Stones', hint: 'The community circle', panel: 'hall' },
    soul_mirror: { label: 'The Mirror Pool', hint: 'Shape your vessel', panel: 'soul' },
    studio: { label: 'The Signal Studio', hint: 'Broadcast from the wild', panel: 'studio' },
};

export const HOME_HOTSPOTS: HomeHotspot[] = [
    /* House — main floor */
    { id: 'computer', label: 'Truth.OS', hint: 'Sit back down at the terminal', level: 'main', position: [u(-5.9), 1.2, u(5.6)], radius: 1.6, action: { type: 'os' } },
    { id: 'arcade', label: 'Arcade', hint: 'Rec room · play', level: 'main', position: [u(-4.2), 1.1, u(7.2)], radius: 1.5, action: { type: 'panel', panel: 'arcade' } },
    { id: 'envelope', label: 'Mail tray', hint: 'Word from outside', level: 'main', position: [u(-1.6), 1.1, u(6.9)], radius: 1.3, action: { type: 'panel', panel: 'news' } },
    { id: 'front_door', label: 'Front door', hint: 'The clearing · the paths', level: 'main', position: [u(-1.2), 1.2, Z1 - 0.6], radius: 1.5, action: { type: 'soon', message: 'The door is open. The jungle holds four paths — the wall map upstairs shows them.' } },

    /* House — upper floor */
    { id: 'library', label: 'Bookshelves', hint: 'The Library · take one down', level: 'upper', position: [u(6.3), 1.3, u(1.3)], radius: 1.7, action: { type: 'panel', panel: 'library' } },
    { id: 'ledger', label: 'The Ledger', hint: 'Daily Word', level: 'upper', position: [u(-0.3), 1.1, u(2.9)], radius: 1.35, action: { type: 'panel', panel: 'ledger' } },
    { id: 'fireplace', label: 'Fireplace', hint: 'Living · warmth', level: 'upper', position: [u(6.5), 1.2, u(-0.9)], radius: 1.6, action: { type: 'soon', message: 'The fire is lit. Sit a while — the Word reads better warm.' } },
    { id: 'codex', label: 'Codex', hint: 'Speak with Truth', level: 'upper', position: [u(2.6), 1.1, u(-3.9)], radius: 1.5, action: { type: 'panel', panel: 'codex' } },
    { id: 'wayfinder', label: 'Wall map', hint: 'World map · the paths are open', level: 'upper', position: [u(-2.45), 1.3, u(2.2)], radius: 1.4, action: { type: 'panel', panel: 'wayfinder' } },

    /* The world — destinations, generated from the worldplan */
    ...DESTINATIONS.map((d): HomeHotspot => {
        const c = destCenter(d);
        const meta = DEST_PANEL[d.id];
        return {
            id: d.id as HomeHotspot['id'],
            label: meta.label,
            hint: meta.hint,
            level: 'main',
            position: [c.x, 1.25, c.z],
            radius: 2.4,
            action: { type: 'panel', panel: meta.panel } as Hotspot['action'],
        };
    }),
];

export function hotspotWorldY(h: HomeHotspot): number {
    return (h.level === 'upper' ? UPPER_Y : MAIN_Y) + h.position[1];
}

export function nearestHomeHotspot(x: number, z: number, level: Level): HomeHotspot | null {
    let best: HomeHotspot | null = null;
    let bestD = Infinity;
    for (const h of HOME_HOTSPOTS) {
        if (h.level !== level) continue;
        const d = Math.hypot(x - h.position[0], z - h.position[2]);
        if (d < h.radius && d < bestD) {
            bestD = d;
            best = h;
        }
    }
    return best;
}

export function isOutdoors(x: number, z: number): boolean {
    return x < X0 || x > X1 || z < Z0 || z > Z1;
}
