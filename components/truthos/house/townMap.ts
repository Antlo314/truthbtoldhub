'use client';

/**
 * The neighbourhood around the player's house.
 *
 * The player's own lot sits at the origin (fence at |x| ≤ 17.5, |z| ≤ 21.4).
 * A street runs east–west in front of it, and twenty houses line both sides.
 * Plots are declared explicitly rather than generated from a loop so the row
 * can dodge the player's lot and vary without special cases.
 *
 * Everything downstream — meshes, colliders, NPC routes — reads this file, the
 * same discipline the house interior uses, so geometry and collision can't
 * drift apart.
 */

/** 21 distinct Kenney house models, keyed a–u */
export const HOUSE_TYPES = 'abcdefghijklmnopqrstu'.split('');

export type Plot = {
    x: number;
    z: number;
    /** Model suffix into building-type-<t>.glb */
    t: string;
    /** Facing, radians. Houses face the street. */
    rotY: number;
    /** Target height in metres — varies so the row isn't uniform */
    h: number;
};

/** Street centre lines */
export const STREET = {
    /** Main street runs east–west in front of the player's house */
    z: 30,
    halfWidth: 4.5,
    /** Pavement strip either side */
    pavement: 1.8,
    minX: -92,
    maxX: 92,
} as const;

/** Row centre lines — houses set back from the kerb */
const SOUTH_ROW = 45;
const NORTH_ROW = 15.5;

/**
 * Twenty plots. The north row skips |x| < 26 because that is the player's own
 * lot; the south row runs unbroken opposite it.
 */
export const PLOTS: Plot[] = [
    // South side, facing north toward the street
    { x: -96, z: SOUTH_ROW, t: 'h', rotY: Math.PI, h: 6.9 },
    { x: -80, z: SOUTH_ROW, t: 'b', rotY: Math.PI, h: 7.6 },
    { x: -64, z: SOUTH_ROW, t: 'e', rotY: Math.PI, h: 7.0 },
    { x: -48, z: SOUTH_ROW, t: 'n', rotY: Math.PI, h: 7.8 },
    { x: -32, z: SOUTH_ROW, t: 'c', rotY: Math.PI, h: 6.6 },
    { x: -16, z: SOUTH_ROW, t: 's', rotY: Math.PI, h: 7.2 },
    { x: 0, z: SOUTH_ROW, t: 'd', rotY: Math.PI, h: 8.0 },
    { x: 16, z: SOUTH_ROW, t: 'o', rotY: Math.PI, h: 7.1 },
    { x: 32, z: SOUTH_ROW, t: 'f', rotY: Math.PI, h: 7.4 },
    { x: 48, z: SOUTH_ROW, t: 'u', rotY: Math.PI, h: 7.2 },
    { x: 64, z: SOUTH_ROW, t: 'j', rotY: Math.PI, h: 6.8 },
    { x: 80, z: SOUTH_ROW, t: 't', rotY: Math.PI, h: 7.6 },

    // North side, facing south toward the street — clear of the player's lot
    { x: -84, z: NORTH_ROW, t: 'k', rotY: 0, h: 7.0 },
    { x: -68, z: NORTH_ROW, t: 'q', rotY: 0, h: 6.4 },
    { x: -52, z: NORTH_ROW, t: 'g', rotY: 0, h: 6.2 },
    { x: -36, z: NORTH_ROW, t: 'l', rotY: 0, h: 6.8 },
    { x: 36, z: NORTH_ROW, t: 'p', rotY: 0, h: 6.5 },
    { x: 52, z: NORTH_ROW, t: 'r', rotY: 0, h: 7.0 },
    { x: 68, z: NORTH_ROW, t: 'i', rotY: 0, h: 6.2 },
    { x: 84, z: NORTH_ROW, t: 'm', rotY: 0, h: 6.6 },
];

/** Street lamps down both kerbs */
export const LAMPS: { x: number; z: number }[] = (() => {
    const out: { x: number; z: number }[] = [];
    for (let x = -84; x <= 84; x += 24) {
        out.push({ x, z: STREET.z - STREET.halfWidth - 1.1 });
        out.push({ x: x + 12, z: STREET.z + STREET.halfWidth + 1.1 });
    }
    return out;
})();

/** Parked cars, tucked against the kerb so they never block the pavement */
export const PARKED: { x: number; z: number; rotY: number; model: string }[] = [
    { x: -58, z: STREET.z + 3.1, rotY: Math.PI / 2, model: 'carA' },
    { x: -22, z: STREET.z - 3.1, rotY: -Math.PI / 2, model: 'carB' },
    { x: 26, z: STREET.z + 3.1, rotY: Math.PI / 2, model: 'carC' },
    { x: 62, z: STREET.z - 3.1, rotY: -Math.PI / 2, model: 'carD' },
];

/**
 * Walk routes for the neighbours. Each is a closed loop of waypoints laid on
 * the pavements, so NPCs stay off the carriageway and out of the player's lot.
 * Loops are deliberately different lengths so the crowd doesn't sync up.
 */
export type Route = [number, number][];

const PAVE_N = STREET.z - STREET.halfWidth - 0.9;
const PAVE_S = STREET.z + STREET.halfWidth + 0.9;

export const ROUTES: Route[] = [
    // Long circuit of the whole street
    [
        [-78, PAVE_N],
        [78, PAVE_N],
        [82, PAVE_S],
        [-82, PAVE_S],
    ],
    // Short beat outside the player's house
    [
        [-20, PAVE_N],
        [22, PAVE_N],
        [24, PAVE_S],
        [-22, PAVE_S],
    ],
    // West end
    [
        [-84, PAVE_S],
        [-40, PAVE_S],
        [-38, PAVE_N],
        [-82, PAVE_N],
    ],
    // East end
    [
        [40, PAVE_N],
        [86, PAVE_N],
        [84, PAVE_S],
        [38, PAVE_S],
    ],
    // Between two south-row driveways
    [
        [-8, PAVE_S],
        [-8, SOUTH_ROW - 6],
        [10, SOUTH_ROW - 6],
        [10, PAVE_S],
    ],
];

/** Character models available for neighbours */
export const PEOPLE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

/**
 * Neighbour roster. Fixed rather than random so the same faces walk the same
 * beats every visit — a neighbourhood you can learn.
 */
export const NEIGHBOURS: { person: string; route: number; speed: number; offset: number }[] = [
    { person: 'a', route: 0, speed: 1.25, offset: 0 },
    { person: 'c', route: 0, speed: 1.05, offset: 0.55 },
    { person: 'e', route: 1, speed: 1.35, offset: 0.2 },
    { person: 'g', route: 1, speed: 1.15, offset: 0.7 },
    { person: 'b', route: 2, speed: 1.2, offset: 0.1 },
    { person: 'i', route: 2, speed: 0.95, offset: 0.6 },
    { person: 'd', route: 3, speed: 1.3, offset: 0.35 },
    { person: 'f', route: 3, speed: 1.1, offset: 0.85 },
    { person: 'h', route: 4, speed: 1.0, offset: 0.15 },
    { person: 'j', route: 4, speed: 1.18, offset: 0.65 },
];

export type Box = { x: number; z: number; hx: number; hz: number };

/** Solid footprints — houses block, street furniture blocks, pavements don't */
export const TOWN_COLLIDERS: Box[] = [
    ...PLOTS.map((p) => ({ x: p.x, z: p.z, hx: 4.6, hz: 4.0 })),
    ...PARKED.map((c) => ({ x: c.x, z: c.z, hx: 2.2, hz: 1.0 })),
    ...LAMPS.map((l) => ({ x: l.x, z: l.z, hx: 0.2, hz: 0.2 })),
];

/** Bounds the player may roam once the neighbourhood exists */
export const TOWN_BOUNDS = {
    minX: -96,
    maxX: 96,
    minZ: -30,
    maxZ: 54,
} as const;

/** Total length of a closed route, for even spacing along it */
export function routeLength(r: Route): number {
    let total = 0;
    for (let i = 0; i < r.length; i++) {
        const a = r[i];
        const b = r[(i + 1) % r.length];
        total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return total;
}

/** Position and heading at distance `d` along a closed route */
export function samplePath(r: Route, d: number): { x: number; z: number; yaw: number } {
    const total = routeLength(r);
    let t = ((d % total) + total) % total;
    for (let i = 0; i < r.length; i++) {
        const a = r[i];
        const b = r[(i + 1) % r.length];
        const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (t <= seg) {
            const k = seg === 0 ? 0 : t / seg;
            return {
                x: a[0] + (b[0] - a[0]) * k,
                z: a[1] + (b[1] - a[1]) * k,
                yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
            };
        }
        t -= seg;
    }
    return { x: r[0][0], z: r[0][1], yaw: 0 };
}
