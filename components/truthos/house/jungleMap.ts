/**
 * The worldplan beyond the Sanctum — a shelf of open ground joined by
 * light-bridges to four isles.
 *
 * The Sanctum's leading stations live out here as DESTINATIONS, each an
 * isle of its own at the end of a bridge. One description still drives
 * everything — the bridges, the walkable region, the wayfinder map, the
 * compass and the hotspot positions all read these tables, so the world
 * cannot disagree with itself.
 */

export type Box = { x: number; z: number; hx: number; hz: number };

/** Radius of the terrace around the Sanctum */
export const CLEARING_R = 26;

export type Destination = {
    id: 'cinema' | 'hall' | 'soul_mirror' | 'studio';
    name: string;
    blurb: string;
    /** Bearing from the Sanctum, radians (0 = +x/east, ccw) */
    angle: number;
    /** Distance of the isle's CENTRE from the origin */
    dist: number;
    /** Isle radius */
    r: number;
};

/**
 * Where the Sanctum's stations live in the world. Bearings avoid the
 * entrance walk (π/2, straight out of the door), which stays a scenic
 * walk for now.
 */
export const DESTINATIONS: Destination[] = [
    { id: 'cinema', name: 'The Cinema Isle', blurb: 'Films above the cloud sea', angle: 0.1, dist: 54, r: 13 },
    { id: 'hall', name: 'The Hall Circle', blurb: 'The community ring', angle: Math.PI - 0.12, dist: 52, r: 13 },
    { id: 'soul_mirror', name: 'The Mirror Well', blurb: 'Shape your vessel', angle: -Math.PI / 3.1, dist: 50, r: 12 },
    { id: 'studio', name: 'The Signal Spire', blurb: 'Broadcast from the shelf', angle: Math.PI + 0.72, dist: 52, r: 12 },
];

export function destCenter(d: Destination): { x: number; z: number } {
    return { x: Math.cos(d.angle) * d.dist, z: Math.sin(d.angle) * d.dist };
}

export type Corridor = {
    ax: number;
    az: number;
    bx: number;
    bz: number;
    /** Walkable half-width — the bridge deck is a little wider than this */
    halfWidth: number;
    /** A corridor that goes nowhere (yet) */
    deadEnd?: boolean;
};

/** Bridge decks are drawn this wide; you can walk within halfWidth of the centreline */
export const BRIDGE_DECK_W = 2.4;

/** The walk out of the door (dead end, for now) + one bridge per isle. */
export const CORRIDORS: Corridor[] = [
    { ax: 0, az: CLEARING_R - 3, bx: 0, bz: 44, halfWidth: 1.1, deadEnd: true },
    ...DESTINATIONS.map((d) => {
        const c = destCenter(d);
        const ux = Math.cos(d.angle);
        const uz = Math.sin(d.angle);
        return {
            // From just inside the terrace to just inside the isle
            ax: ux * (CLEARING_R - 3),
            az: uz * (CLEARING_R - 3),
            bx: c.x - ux * (d.r - 3),
            bz: c.z - uz * (d.r - 3),
            halfWidth: 1.1,
        };
    }),
];

/** Player roam box — a backstop; the walkable region is the real fence */
export const JUNGLE_BOUNDS = {
    minX: -72,
    maxX: 72,
    minZ: -72,
    maxZ: 72,
} as const;

/** Distance from a point to a corridor's centreline segment */
export function corridorDistance(x: number, z: number, c: Corridor): number {
    const dx = c.bx - c.ax;
    const dz = c.bz - c.az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / len2));
    return Math.hypot(x - (c.ax + dx * t), z - (c.az + dz * t));
}

export function inCorridor(x: number, z: number, margin = 0): boolean {
    return CORRIDORS.some((c) => corridorDistance(x, z, c) < c.halfWidth + margin);
}

export function inDestination(x: number, z: number, margin = 0): boolean {
    return DESTINATIONS.some((d) => {
        const c = destCenter(d);
        return Math.hypot(x - c.x, z - c.z) < d.r + margin;
    });
}

/** Anywhere outside the building that has ground under it — terrace, bridges, isles */
export function inOpenGround(x: number, z: number, margin = 0): boolean {
    if (Math.hypot(x, z) < CLEARING_R + margin) return true;
    return inCorridor(x, z, margin) || inDestination(x, z, margin);
}
