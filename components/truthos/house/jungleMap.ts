/**
 * The jungle worldplan — an ENCLOSED clearing, not an open sandbox.
 *
 * One description drives everything: the clearing edge is the treeline,
 * the collider ring, and the base of the green wall; corridors are both
 * the dirt strips and the gaps in all of it. Meshes and physics can never
 * disagree about where the world ends.
 *
 * Corridors are a list on purpose — opening a new path later is one entry
 * here, and the wall, the undergrowth, and the colliders all part for it
 * automatically.
 */

export type Box = { x: number; z: number; hx: number; hz: number };

/** Radius of the open ground around the house — the safe world */
export const CLEARING_R = 32;

export type Corridor = {
    /** Segment the corridor runs along (world coords) */
    ax: number;
    az: number;
    bx: number;
    bz: number;
    halfWidth: number;
};

/**
 * Ways out of the clearing. One today — the north path — more shortly.
 * Every system (wall rings, scatter, colliders, dirt strips) reads this
 * list, so adding a corridor here opens it everywhere at once.
 */
export const CORRIDORS: Corridor[] = [
    { ax: 0, az: 16, bx: 0, bz: 46, halfWidth: 2.2 },
];

/** Player roam box — the clearing plus corridor throats */
export const JUNGLE_BOUNDS = {
    minX: -34,
    maxX: 34,
    minZ: -34,
    maxZ: 46,
} as const;

/** Distance from point to a corridor's centreline segment */
export function corridorDistance(x: number, z: number, c: Corridor): number {
    const dx = c.bx - c.ax;
    const dz = c.bz - c.az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / len2));
    return Math.hypot(x - (c.ax + dx * t), z - (c.az + dz * t));
}

/** True when a spot is inside any corridor (plus a margin for shoulders) */
export function inCorridor(x: number, z: number, margin = 0): boolean {
    return CORRIDORS.some((c) => corridorDistance(x, z, c) < c.halfWidth + margin);
}

/**
 * Collider ring — boxes approximating the clearing circle with gaps at
 * corridors, rails along each corridor, and a cap at each dead end.
 */
export const JUNGLE_COLLIDERS: Box[] = (() => {
    const out: Box[] = [];
    const SEGMENTS = 40;
    for (let i = 0; i < SEGMENTS; i++) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        const x = Math.cos(a) * CLEARING_R;
        const z = Math.sin(a) * CLEARING_R;
        if (inCorridor(x, z, 3.2)) continue;
        out.push({ x, z, hx: 3.2, hz: 3.2 });
    }
    for (const c of CORRIDORS) {
        const dx = c.bx - c.ax;
        const dz = c.bz - c.az;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len; // corridor normal
        const nz = dx / len;
        const steps = Math.ceil(len / 3.6);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = c.ax + dx * t;
            const pz = c.az + dz * t;
            // Rails hug both shoulders
            out.push({ x: px + nx * (c.halfWidth + 2.4), z: pz + nz * (c.halfWidth + 2.4), hx: 2.2, hz: 2.2 });
            out.push({ x: px - nx * (c.halfWidth + 2.4), z: pz - nz * (c.halfWidth + 2.4), hx: 2.2, hz: 2.2 });
        }
        // The jungle wins at the end of every path (for now)
        out.push({ x: c.bx + (dx / len) * 1.8, z: c.bz + (dz / len) * 1.8, hx: c.halfWidth + 4.5, hz: 2 });
    }
    return out;
})();
