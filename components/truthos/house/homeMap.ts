/**
 * The Safe House — two storeys, built from the real drawings.
 *
 * Source: main floor 1,064.3 sqft · upper floor 1,393.4 sqft ·
 * width 44'-7" · depth 50'-2". Every dimension below is that plan
 * converted to metres (ft × 0.3048) and snapped to the centimetre.
 *
 * Orientation matches the renders: the street, the driveway, the garage
 * door and the front door all face +Z. North (the rear patio) is -Z.
 * Origin is the centre of the footprint.
 *
 * Small jogs in the plan's outline are squared off. A game floorplan has
 * to give a walker clean rooms and clean colliders; the headline room
 * dimensions, the band structure and the circulation are faithful, the
 * decorative wall kinks are not.
 *
 * This file is the single source: geometry, colliders, floor heights,
 * the stair ramp and the hotspots all read from the same tables.
 */

const FT = 0.3048;
export const ft = (feet: number, inches = 0) => (feet + inches / 12) * FT;

/* ── Envelope ─────────────────────────────────────────────── */

export const HOME_W = ft(44, 7); // 13.59
export const HOME_D = ft(50, 2); // 15.29

export const SHELL = {
    minX: -HOME_W / 2,
    maxX: HOME_W / 2,
    minZ: -HOME_D / 2,
    maxZ: HOME_D / 2,
    /** Wall thickness (exterior) */
    t: 0.22,
} as const;

/** Storey heights — 10 ft clear on both principal levels */
export const STOREY = ft(10);          // 3.05
export const MAIN_Y = 0;
export const UPPER_Y = STOREY + 0.3;   // + floor assembly ≈ 3.35
export const ROOF_Y = UPPER_Y + STOREY;

export const EYE_HEIGHT = 1.62;
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
    /** Rooms you cannot walk into (garage bays are scenery here) */
    solid?: boolean;
    /** Open to the sky / open to below */
    open?: boolean;
};

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;

/* Vertical bands, main floor: west living | centre circulation | east garage */
const W_E = -2.70; // west band east edge
const C_E = 0.20;  // centre band east edge

export const ROOMS: Room[] = [
    /* ── MAIN FLOOR ─────────────────────────────── */
    // Rec room 13'-6" x 17'-5", 10 ft ceiling
    { id: 'rec', name: 'Rec Room', level: 'main', minX: X0, maxX: W_E, minZ: 2.30, maxZ: Z1 },
    // Foyer 9'-6" x 17'-8", 21'-2" ceiling — double height, open to the upper landing
    { id: 'foyer', name: 'Foyer', level: 'main', minX: W_E, maxX: C_E, minZ: 2.30, maxZ: Z1 },
    // Bath 11'-6" x 5'-6"
    { id: 'bath', name: 'Bath', level: 'main', minX: X0, maxX: W_E, minZ: 0.60, maxZ: 2.30 },
    // Mud 5'-4" x 10'-9"
    { id: 'mud', name: 'Mud', level: 'main', minX: W_E, maxX: C_E, minZ: 0.60, maxZ: 2.30 },
    // Bedroom 11'-6" x 12'-2"
    { id: 'bed_w', name: 'Bedroom', level: 'main', minX: X0, maxX: -3.10, minZ: -4.40, maxZ: 0.60 },
    // Bedroom 14'-4" x 10'-8"
    { id: 'bed_n', name: 'Bedroom', level: 'main', minX: -3.10, maxX: 1.27, minZ: Z0, maxZ: -4.40 },
    // Mech 5'-0" x 10'-8"
    { id: 'mech', name: 'Mech', level: 'main', minX: C_E, maxX: 1.27, minZ: -1.00, maxZ: 0.60, solid: true },
    // Garage 19'-6" x 24'-0" + tandem 13'-4" x 15'-6" behind it
    { id: 'garage', name: 'Garage', level: 'main', minX: 1.27, maxX: X1, minZ: 0.40, maxZ: Z1, solid: true },
    { id: 'tandem', name: 'Tandem', level: 'main', minX: 1.27, maxX: X1, minZ: -4.40, maxZ: 0.40, solid: true },

    /* ── UPPER FLOOR ────────────────────────────── */
    // Master 13'-7" x 16'-4", 10 ft ceiling
    { id: 'master', name: 'Master', level: 'upper', minX: X0, maxX: -2.66, minZ: 2.67, maxZ: Z1 },
    // Ensuite 7'-6" x 12'-9" · WIC 6'-8" x 7'-2"
    { id: 'ensuite', name: 'Ensuite', level: 'upper', minX: X0, maxX: -4.50, minZ: -0.40, maxZ: 2.67 },
    { id: 'wic', name: 'Walk-in', level: 'upper', minX: -4.50, maxX: -2.66, minZ: 0.60, maxZ: 2.67 },
    // Bedroom 11'-6" x 10'-8" · Laundry 9'-0" x 6'-6"
    { id: 'bed_u', name: 'Bedroom', level: 'upper', minX: X0, maxX: -3.30, minZ: -4.30, maxZ: -0.40 },
    { id: 'laundry', name: 'Laundry', level: 'upper', minX: -3.30, maxX: -0.50, minZ: -4.30, maxZ: -1.90 },
    // Powder / WC
    { id: 'pwdr', name: 'Powder', level: 'upper', minX: -2.66, maxX: -0.50, minZ: -0.40, maxZ: 1.00 },
    // Dining 10'-7" x 11'-2"
    { id: 'dining', name: 'Dining', level: 'upper', minX: -0.50, maxX: 2.70, minZ: 0.40, maxZ: 3.60 },
    // Kitchen 19'-0" x 9'-9"
    { id: 'kitchen', name: 'Kitchen', level: 'upper', minX: 0.90, maxX: X1, minZ: -4.40, maxZ: -1.20 },
    // Living 20'-0" x 16'-4", 10 ft ceiling
    { id: 'living', name: 'Living', level: 'upper', minX: 2.70, maxX: X1, minZ: -1.20, maxZ: 3.80 },
    // Landing over the foyer — the double-height void is its west edge
    { id: 'landing', name: 'Landing', level: 'upper', minX: -2.66, maxX: -0.50, minZ: 1.00, maxZ: 3.40 },
    // Outdoor rooms
    { id: 'balcony', name: 'Covered Balcony', level: 'upper', minX: 1.50, maxX: X1, minZ: 3.80, maxZ: Z1, open: true },
    { id: 'patio', name: 'Covered Patio', level: 'upper', minX: 3.30, maxX: X1, minZ: Z0, maxZ: -4.40, open: true },
    // The void: foyer below, railed on the upper level
    { id: 'void', name: 'Open to Below', level: 'upper', minX: -2.66, maxX: 0.90, minZ: 3.60, maxZ: Z1, solid: true },
];

export const roomsOn = (level: Level) => ROOMS.filter((r) => r.level === level);

/* ── The stair ────────────────────────────────────────────── */

/**
 * Straight run in the centre band, climbing north out of the foyer.
 * 4.50 m of run for 3.35 m of rise ≈ 36°. The walker reads its height
 * from `groundAt`, so the ramp IS the stair as far as movement goes;
 * the treads are geometry drawn on top of the same numbers.
 */
export const STAIR = {
    minX: -2.40,
    maxX: -0.70,
    /** bottom (foyer side, +Z) → top (landing side, -Z) */
    zBottom: 5.20,
    zTop: 0.70,
    yBottom: MAIN_Y,
    yTop: UPPER_Y,
    treads: 17,
} as const;

const inStair = (x: number, z: number) =>
    x > STAIR.minX && x < STAIR.maxX && z > STAIR.zTop && z < STAIR.zBottom;

/** Height of the stair ramp at z (clamped to the run) */
function stairY(z: number): number {
    const t = (STAIR.zBottom - z) / (STAIR.zBottom - STAIR.zTop);
    return STAIR.yBottom + Math.min(1, Math.max(0, t)) * (STAIR.yTop - STAIR.yBottom);
}

/* ── Walkable ground ──────────────────────────────────────── */

const inRoom = (x: number, z: number, r: Room) =>
    x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;

/** Is (x,z) inside the upper storey's walkable footprint? */
export function onUpperFootprint(x: number, z: number): boolean {
    return ROOMS.some((r) => r.level === 'upper' && !r.solid && inRoom(x, z, r));
}

/**
 * The floor height under the player.
 *
 * `level` is the storey the player is currently on — a two-storey house
 * needs it, because the same (x,z) has a floor at 0 AND at 3.35 and the
 * only honest answer depends on where you already are. The stair is the
 * one place both are reachable, and it hands the walker a continuous
 * ramp between them.
 */
export function groundAt(x: number, z: number, level: Level): number {
    if (inStair(x, z)) return stairY(z);
    if (level === 'upper' && onUpperFootprint(x, z)) return UPPER_Y;
    return MAIN_Y;
}

/**
 * Which storey the player belongs to after moving. Switches only on the
 * stair, at the ends of the run — so you can never phase between floors
 * by walking into a wall.
 */
export function levelAfter(x: number, z: number, level: Level): Level {
    if (!inStair(x, z)) return level;
    if (z <= STAIR.zTop + 0.35) return 'upper';
    if (z >= STAIR.zBottom - 0.35) return 'main';
    return level;
}

/* ── Colliders ────────────────────────────────────────────── */

export type Collider = { x: number; z: number; hx: number; hz: number };

/** Build a wall collider from a segment */
const seg = (x1: number, z1: number, x2: number, z2: number, t = SHELL.t): Collider => ({
    x: (x1 + x2) / 2,
    z: (z1 + z2) / 2,
    hx: Math.max(Math.abs(x2 - x1) / 2, t / 2),
    hz: Math.max(Math.abs(z2 - z1) / 2, t / 2),
});

/** Two segments with a doorway gap punched at `gapC` (along the run) */
function withDoor(
    x1: number, z1: number, x2: number, z2: number,
    gapC: number, gapW = 1.0, t = SHELL.t,
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

/** Exterior shell, shared by both storeys (garage door + front door punched) */
const SHELL_WALLS: Collider[] = [
    // North (rear)
    seg(X0, Z0, X1, Z0),
    // West
    seg(X0, Z0, X0, Z1),
    // East
    seg(X1, Z0, X1, Z1),
];

export const MAIN_COLLIDERS: Collider[] = [
    ...SHELL_WALLS,
    // South (street) — front door gap at x=-1.2
    ...withDoor(X0, Z1, X1, Z1, -1.2, 1.2),
    // West band / centre band divider — doorways into rec and mud
    ...withDoor(W_E, 2.30, W_E, Z1, 5.0, 1.1),
    ...withDoor(W_E, 0.60, W_E, 2.30, 1.5, 0.95),
    // Centre / east divider (garage wall)
    seg(C_E, -1.00, C_E, Z1),
    seg(1.27, Z0, 1.27, Z1),
    // Rec / bath
    ...withDoor(X0, 2.30, W_E, 2.30, -4.0, 0.95),
    // Bath / bedroom
    ...withDoor(X0, 0.60, -3.10, 0.60, -5.6, 0.95),
    // Bedroom west / bedroom north
    ...withDoor(-3.10, -4.40, 1.27, -4.40, -1.0, 0.95),
    seg(-3.10, -4.40, -3.10, 0.60),
    // Mud / mech
    seg(C_E, 0.60, 1.27, 0.60),
];

export const UPPER_COLLIDERS: Collider[] = [
    ...SHELL_WALLS,
    seg(X0, Z1, X1, Z1),
    // Master suite
    ...withDoor(X0, 2.67, -2.66, 2.67, -5.4, 0.95),
    seg(-2.66, 2.67, -2.66, Z1),
    // Ensuite / WIC
    ...withDoor(-4.50, 0.60, -4.50, 2.67, 1.9, 0.85),
    ...withDoor(X0, -0.40, -2.66, -0.40, -5.9, 0.9),
    // Bedroom / laundry
    seg(-3.30, -4.30, -3.30, -0.40),
    ...withDoor(-3.30, -1.90, -0.50, -1.90, -2.4, 0.9),
    // Powder
    ...withDoor(-2.66, 1.00, -0.50, 1.00, -1.9, 0.85),
    seg(-0.50, -0.40, -0.50, 1.00),
    // Kitchen / living divider is open plan — only the island blocks
    seg(0.90, -4.40, 0.90, -1.20),
    // Dining sits west of living; the sideboard wall carries the Ledger
    seg(2.70, 0.40, 2.70, 3.60),
    // The void: a rail, not a wall — you cannot walk into the foyer drop
    seg(-2.66, 3.60, 0.90, 3.60),
    // Balcony rail (glass) + patio rail
    seg(1.50, Z1, X1, Z1),
    seg(1.50, 3.80, 1.50, Z1),
    seg(3.30, Z0, X1, Z0),
];

/** Furniture that blocks, per level */
export const FURNITURE: (Collider & { level: Level })[] = [
    // Main — rec room seating, beds
    { level: 'main', x: -5.6, z: 6.4, hx: 1.05, hz: 0.45 },
    { level: 'main', x: -5.9, z: -2.4, hx: 0.95, hz: 1.05 },
    { level: 'main', x: -1.0, z: -6.2, hx: 1.05, hz: 0.95 },
    // Upper — island, sofa, dining table, master bed
    { level: 'upper', x: 3.4, z: -2.6, hx: 1.6, hz: 0.5 },
    { level: 'upper', x: 4.6, z: 1.6, hx: 1.35, hz: 0.45 },
    { level: 'upper', x: 0.95, z: 1.9, hx: 0.85, hz: 0.6 },
    { level: 'upper', x: -5.2, z: 5.6, hx: 1.0, hz: 1.1 },
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

/** Slide along walls: try full move, then each axis alone. */
export function moveOn(
    level: Level,
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    r = PLAYER_R,
): { x: number; z: number } {
    const cs = collidersFor(level);
    if (!hits(toX, toZ, cs, r)) return { x: toX, z: toZ };
    if (!hits(toX, fromZ, cs, r)) return { x: toX, z: fromZ };
    if (!hits(fromX, toZ, cs, r)) return { x: fromX, z: toZ };
    return { x: fromX, z: fromZ };
}

/* ── Spawn ────────────────────────────────────────────────── */

/** On the front walk, facing the front door */
export const SPAWN: [number, number, number] = [-1.2, EYE_HEIGHT, Z1 + 3.2];
export const SPAWN_YAW = Math.PI;

export const FRONT_DOOR = { x: -1.2, z: Z1 };
export const GARAGE_DOOR = { x: 4.0, z: Z1 };

/* ── Hotspots ─────────────────────────────────────────────── */

export type HomeHotspot = {
    id: string;
    label: string;
    hint: string;
    level: Level;
    /** floor-relative; world y is added from the level */
    position: [number, number, number];
    radius: number;
    panel?: string;
};

/**
 * Where the stations live in the new home.
 *
 * Two placements are deliberate answers to how the old house read:
 * the Library is ON the living-room bookshelf wall (you walk to the
 * books, not to a patch of floor), and the Ledger — the Daily Word —
 * sits on the dining sideboard against the wall instead of floating in
 * the middle of the room.
 */
export const HOME_HOTSPOTS: HomeHotspot[] = [
    { id: 'front_door', label: 'Front door', hint: 'The safe house', level: 'main', position: [-1.2, 1.2, 7.0], radius: 1.2 },
    { id: 'computer', label: 'Truth.OS', hint: 'Boot the terminal', level: 'main', position: [-5.6, 1.1, 5.6], radius: 1.25, panel: 'computer' },
    { id: 'arcade', label: 'Arcade', hint: 'Rec room · play', level: 'main', position: [-3.4, 1.1, 6.6], radius: 1.15, panel: 'arcade' },
    { id: 'envelope', label: 'Mailbox', hint: 'Word from outside', level: 'main', position: [-2.0, 1.1, 7.1], radius: 1.0, panel: 'news' },

    // The books themselves — east wall of the living room
    { id: 'library', label: 'Bookshelves', hint: 'The Library · take one down', level: 'upper', position: [6.15, 1.15, 1.20], radius: 1.2, panel: 'library' },
    // The Daily Word, on the sideboard against the dining wall
    { id: 'ledger', label: 'The Ledger', hint: 'Daily Word', level: 'upper', position: [-0.15, 1.05, 2.30], radius: 1.0, panel: 'ledger' },

    { id: 'fireplace', label: 'Fireplace', hint: 'Living · warmth', level: 'upper', position: [6.35, 1.1, -0.40], radius: 1.2, panel: 'fireplace' },
    { id: 'codex', label: 'Codex', hint: 'Speak with Truth', level: 'upper', position: [2.60, 1.1, -3.90], radius: 1.15, panel: 'codex' },
    { id: 'wayfinder', label: 'Wall map', hint: 'World map · the paths are open', level: 'upper', position: [-2.45, 1.15, 1.90], radius: 1.05, panel: 'wayfinder' },
    { id: 'back_door', label: 'Covered patio', hint: 'Step out back', level: 'upper', position: [4.20, 1.15, -4.20], radius: 1.15 },
];

export function hotspotWorldY(h: HomeHotspot): number {
    return (h.level === 'upper' ? UPPER_Y : MAIN_Y) + h.position[1];
}

/** Nearest hotspot on the player's own storey */
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

/** Outside the shell entirely (the jungle clearing takes over) */
export function isOutdoors(x: number, z: number): boolean {
    return x < X0 || x > X1 || z < Z0 || z > Z1;
}
