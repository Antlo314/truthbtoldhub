/**
 * The jungle worldplan — the safe house sits alone in a clearing.
 *
 * One description drives everything: the clearing edge is both the visual
 * treeline and the collider ring, the path corridor is both the dirt strip
 * and the gap in that ring. Meshes and physics can therefore never disagree
 * about where the jungle starts, the same single-source rule the house and
 * the old town followed.
 */

export type Box = { x: number; z: number; hx: number; hz: number };

/** Radius of the open ground around the house — the safe part of the world */
export const CLEARING_R = 32;

/**
 * The one way out: a dirt path north from the front-yard gate that fades
 * into the trees and dead-ends. Walkable a little way — enough to feel the
 * jungle close over you — then the wall of green.
 */
export const PATH = {
    halfWidth: 2.2,
    from: 16,   // just past the front fence line
    to: 46,     // where the jungle closes it
} as const;

/** Player roam box — the clearing plus the path throat */
export const JUNGLE_BOUNDS = {
    minX: -34,
    maxX: 34,
    minZ: -34,
    maxZ: PATH.to,
} as const;

/**
 * Collider ring — boxes approximating the clearing circle, with a gap at
 * the path corridor, corridor side rails, and a dead-end cap. ~40 boxes,
 * about what the old street cost, and the AABB test is unchanged.
 */
export const JUNGLE_COLLIDERS: Box[] = (() => {
    const out: Box[] = [];
    const SEGMENTS = 36;
    for (let i = 0; i < SEGMENTS; i++) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        const x = Math.cos(a) * CLEARING_R;
        const z = Math.sin(a) * CLEARING_R;
        // Leave the ring open where the path passes through it
        if (z > 0 && Math.abs(x) < PATH.halfWidth + 2.4) continue;
        out.push({ x, z, hx: 3.4, hz: 3.4 });
    }
    // Path side rails — dense jungle either side of the corridor
    for (let z = CLEARING_R - 2; z < PATH.to; z += 4) {
        out.push({ x: -(PATH.halfWidth + 2.6), z, hx: 2.4, hz: 2.4 });
        out.push({ x: PATH.halfWidth + 2.6, z, hx: 2.4, hz: 2.4 });
    }
    // Dead end — the jungle wins
    out.push({ x: 0, z: PATH.to + 1.6, hx: PATH.halfWidth + 5, hz: 2 });
    return out;
})();
