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
    { id: 'mech', name: 'Mech', level: 'main', minX: C_E, maxX: u(1.27), minZ: u(-1.0), maxZ: u(0.6), solid: true },
    { id: 'garage', name: 'Garage', level: 'main', minX: u(1.27), maxX: X1, minZ: u(0.4), maxZ: Z1, solid: true },
    { id: 'tandem', name: 'Tandem', level: 'main', minX: u(1.27), maxX: X1, minZ: u(-4.4), maxZ: u(0.4), solid: true },

    /* ── UPPER FLOOR ────────────────────────────── */
    { id: 'master', name: 'Master', level: 'upper', minX: X0, maxX: u(-2.66), minZ: u(2.67), maxZ: Z1 },
    { id: 'ensuite', name: 'Ensuite', level: 'upper', minX: X0, maxX: u(-4.5), minZ: u(-0.4), maxZ: u(2.67) },
    { id: 'wic', name: 'Walk-in', level: 'upper', minX: u(-4.5), maxX: u(-2.66), minZ: u(0.6), maxZ: u(2.67) },
    { id: 'bed_u', name: 'Bedroom', level: 'upper', minX: X0, maxX: u(-3.3), minZ: u(-4.3), maxZ: u(-0.4) },
    { id: 'laundry', name: 'Laundry', level: 'upper', minX: u(-3.3), maxX: u(-0.5), minZ: u(-4.3), maxZ: u(-1.9) },
    { id: 'pwdr', name: 'Powder', level: 'upper', minX: u(-2.66), maxX: u(-0.5), minZ: u(-0.4), maxZ: u(1.0) },
    { id: 'dining', name: 'Dining', level: 'upper', minX: u(-0.5), maxX: u(2.7), minZ: u(0.4), maxZ: u(3.6) },
    { id: 'kitchen', name: 'Kitchen', level: 'upper', minX: u(0.9), maxX: X1, minZ: u(-4.4), maxZ: u(-1.2) },
    { id: 'living', name: 'Living', level: 'upper', minX: u(2.7), maxX: X1, minZ: u(-1.2), maxZ: u(3.8) },
    { id: 'landing', name: 'Landing', level: 'upper', minX: u(-2.66), maxX: u(-0.5), minZ: u(1.0), maxZ: u(3.4) },
    { id: 'balcony', name: 'Covered Balcony', level: 'upper', minX: u(1.5), maxX: X1, minZ: u(3.8), maxZ: Z1, open: true },
    { id: 'patio', name: 'Covered Patio', level: 'upper', minX: u(3.3), maxX: X1, minZ: Z0, maxZ: u(-4.4), open: true },
    { id: 'void', name: 'Open to Below', level: 'upper', minX: u(-2.66), maxX: u(0.9), minZ: u(3.6), maxZ: Z1, solid: true },
];

export const roomsOn = (level: Level) => ROOMS.filter((r) => r.level === level);

/* ── The stair ────────────────────────────────────────────── */

export const STAIR = {
    minX: u(-2.4),
    maxX: u(-0.7),
    zBottom: u(5.2),
    zTop: u(0.7),
    yBottom: MAIN_Y,
    yTop: UPPER_Y,
    treads: 20,
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

export function onUpperFootprint(x: number, z: number): boolean {
    return ROOMS.some((r) => r.level === 'upper' && !r.solid && inRoom(x, z, r));
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
    if (z <= STAIR.zTop + 0.4) return 'upper';
    if (z >= STAIR.zBottom - 0.4) return 'main';
    return level;
}

/* ── Colliders ────────────────────────────────────────────── */

export type Collider = { x: number; z: number; hx: number; hz: number };

const seg = (x1: number, z1: number, x2: number, z2: number, t = SHELL.t): Collider => ({
    x: (x1 + x2) / 2,
    z: (z1 + z2) / 2,
    hx: Math.max(Math.abs(x2 - x1) / 2, t / 2),
    hz: Math.max(Math.abs(z2 - z1) / 2, t / 2),
});

function withDoor(
    x1: number, z1: number, x2: number, z2: number,
    gapC: number, gapW = DOOR, t = SHELL.t,
): Collider[] {
    const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    if (horizontal) {
        return [
            seg(x1, z1, gapC - gapW / 2, z2, t),
            seg(gapC + gapW / 2, z1, x2, z2, t),
        ].filter((c) => c.hx > t / 2 + 0.01);
    }
    return [
        seg(x1, z1, x2, gapC - gapW / 2, t),
        seg(x1, gapC + gapW / 2, x2, z2, t),
    ].filter((c) => c.hz > t / 2 + 0.01);
}

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
    ...withDoor(W_E, u(2.3), W_E, Z1, u(5.0), DOOR),
    ...withDoor(W_E, u(0.6), W_E, u(2.3), u(1.5), 1.35),
    // Centre / garage dividers
    seg(C_E, u(-1.0), C_E, Z1),
    seg(u(1.27), Z0, u(1.27), Z1),
    // Rec / bath · bath / bedroom
    ...withDoor(X0, u(2.3), W_E, u(2.3), u(-4.0), 1.35),
    ...withDoor(X0, u(0.6), u(-3.1), u(0.6), u(-5.6), 1.35),
    // Bedrooms
    ...withDoor(u(-3.1), u(-4.4), u(1.27), u(-4.4), u(-1.0), 1.35),
    seg(u(-3.1), u(-4.4), u(-3.1), u(0.6)),
    // Mud / mech
    seg(C_E, u(0.6), u(1.27), u(0.6)),
    // The jungle: outdoors the same walls that always held
    ...JUNGLE_COLLIDERS,
];

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
    ...withDoor(u(-2.66), u(1.0), u(-0.5), u(1.0), u(-1.9), 1.2),
    seg(u(-0.5), u(-0.4), u(-0.5), u(1.0)),
    // Kitchen west wall + dining/living divider (open plan, half-walls)
    seg(u(0.9), u(-4.4), u(0.9), u(-1.2)),
    seg(u(2.7), u(0.4), u(2.7), u(3.6)),
    // The void rail
    seg(u(-2.66), u(3.6), u(0.9), u(3.6)),
    // Balcony + patio rails
    seg(u(1.5), Z1, X1, Z1),
    seg(u(1.5), u(3.8), u(1.5), Z1),
    seg(u(3.3), Z0, X1, Z0),
];

export const FURNITURE: (Collider & { level: Level })[] = [
    // Main — the intro desk, rec sofa, beds
    { level: 'main', x: u(-5.9), z: u(6.2), hx: 1.1, hz: 0.5 },
    { level: 'main', x: u(-4.2), z: u(7.2), hx: 1.3, hz: 0.55 },
    { level: 'main', x: u(-5.9), z: u(-2.4), hx: 1.15, hz: 1.25 },
    { level: 'main', x: u(-1.0), z: u(-6.2), hx: 1.25, hz: 1.15 },
    // Upper — island, sofas, dining table, master bed, bookshelf wall
    { level: 'upper', x: u(3.4), z: u(-2.6), hx: 2.2, hz: 0.7 },
    { level: 'upper', x: u(4.6), z: u(1.6), hx: 1.8, hz: 0.6 },
    { level: 'upper', x: u(1.1), z: u(2.0), hx: 1.3, hz: 0.9 },
    { level: 'upper', x: u(-5.2), z: u(5.6), hx: 1.3, hz: 1.4 },
    { level: 'upper', x: u(6.6), z: u(1.3), hx: 0.35, hz: 2.6 },
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

export const DESK = {
    x: u(-5.9),
    z: u(6.2),
    monitorY: 1.35,
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
