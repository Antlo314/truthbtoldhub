/**
 * Where the grove's props stand.
 *
 * Pulled out of Grove.tsx so the placement maths is pure — no React, no
 * GLB loading — and can therefore be asserted by a script instead of
 * eyeballed in a running scene. `scripts/validate-grove.mjs` imports
 * exactly this module, so the check and the render cannot drift.
 *
 * ── The bug this module was extracted to fix ────────────────
 *
 * `band()` rejected a candidate that fell on the house, in open ground,
 * or on a corridor. It never asked whether something was ALREADY THERE.
 * With 46 trees thrown into a ring, collisions are not unlikely, they
 * are certain — measured worst case was two oaks 0.3m apart, a 3.03m
 * overlap on a 3.9m-wide canopy, i.e. one tree growing out of the
 * middle of another.
 *
 * The fix is a spacing test against everything already placed. It needs
 * each model's real size, which is why FOOTPRINT below is measured from
 * the GLB binaries (scripts/measure-models.mjs) rather than guessed.
 */
import { CLEARING_R, inCorridor, inOpenGround } from './jungleMap';
import { SHELL } from './homeMap';

export const TREES = ['treeDefault', 'treeOak', 'treeDetailed', 'treeFat'] as const;
export const BUSHES = ['bush', 'bushSmall', 'bushLarge'] as const;
export const FLOWERS = ['flowerPurple', 'flowerRed', 'flowerYellow'] as const;

/**
 * Native width in metres, measured from the GLB accessors.
 * A prop's rendered radius is (FOOTPRINT[key] * scale) / 2.
 */
export const FOOTPRINT: Record<string, number> = {
    treeDefault: 0.755,
    treeOak: 0.641,
    treeDetailed: 0.847,
    treeFat: 0.755,
    bush: 0.396,
    bushSmall: 0.095,
    bushLarge: 0.374,
    flowerPurple: 0.159,
    flowerRed: 0.159,
    flowerYellow: 0.159,
    rock: 0.361,
    stone: 0.361,
};

export function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const HOUSE_PAD = 2.0;
export const clearOfHouse = (x: number, z: number) =>
    x < SHELL.minX - HOUSE_PAD ||
    x > SHELL.maxX + HOUSE_PAD ||
    z < SHELL.minZ - HOUSE_PAD ||
    z > SHELL.maxZ + HOUSE_PAD;

export type Placed = { key: string; x: number; z: number; rot: number; scale: number };

export const radiusOf = (p: Placed) => ((FOOTPRINT[p.key] ?? 0.5) * p.scale) / 2;

/**
 * How close two props may stand, as a fraction of their summed radii.
 *
 * Not 1.0. These are trees: canopies are meant to interleave, and a
 * grove where no two crowns touch reads as an orchard. 0.62 keeps the
 * foliage woven while putting daylight between the trunks — which is
 * the thing that actually looked broken.
 */
const WEAVE = 0.62;

function clashes(c: Placed, placed: Placed[], weave: number): boolean {
    const rc = radiusOf(c);
    for (const p of placed) {
        const min = (rc + radiusOf(p)) * weave;
        const dx = c.x - p.x;
        const dz = c.z - p.z;
        if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
}

/**
 * Scatter in a band, rejecting anything that would stand in open ground,
 * on a path, inside the house — or on top of something already placed.
 *
 * `against` lets a later band see the earlier ones, so bushes do not
 * grow through the trees that were scattered before them.
 */
export function band(
    seed: number,
    count: number,
    rMin: number,
    rMax: number,
    keys: readonly string[],
    scale: [number, number],
    openMargin: number,
    against: Placed[] = [],
    weave = WEAVE,
): Placed[] {
    const r = rng(seed);
    const out: Placed[] = [];
    // Spacing rejects far more candidates than the old tests did, so the
    // guard has to be generous or the band quietly under-fills.
    let guard = count * 200;
    while (out.length < count && guard-- > 0) {
        const rad = Math.sqrt(r()) * (rMax - rMin) + rMin;
        const a = r() * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        // Draw the key and scale before the spacing test — a big oak needs
        // more room than a sapling, and testing with the wrong size would
        // let the largest models through.
        const cand: Placed = {
            key: keys[Math.floor(r() * keys.length)],
            x,
            z,
            rot: r() * Math.PI * 2,
            scale: scale[0] + r() * (scale[1] - scale[0]),
        };
        if (!clearOfHouse(x, z)) continue;
        if (inOpenGround(x, z, openMargin)) continue;
        if (inCorridor(x, z, 1.4)) continue;
        if (clashes(cand, out, weave)) continue;
        if (against.length && clashes(cand, against, weave)) continue;
        out.push(cand);
    }
    return out;
}

/** Flowers and small growth line the paths instead of avoiding them. */
export function verges(seed: number, count: number, against: Placed[] = []): Placed[] {
    const r = rng(seed);
    const out: Placed[] = [];
    let guard = count * 200;
    while (out.length < count && guard-- > 0) {
        const rad = Math.sqrt(r()) * 62 + 6;
        const a = r() * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        const cand: Placed = {
            key: FLOWERS[Math.floor(r() * FLOWERS.length)],
            x,
            z,
            rot: r() * Math.PI * 2,
            scale: 0.8 + r() * 0.6,
        };
        if (!clearOfHouse(x, z)) continue;
        // just off the path, not on it
        if (!inCorridor(x, z, 1.6) || inCorridor(x, z, -0.2)) continue;
        // Blooms are small and clumping is natural, so they pack tighter
        // than the canopy layer — but still not through each other.
        if (clashes(cand, out, 0.9)) continue;
        if (against.length && clashes(cand, against, 0.9)) continue;
        out.push(cand);
    }
    return out;
}

/**
 * The whole grove, in placement order.
 *
 * Order matters: each layer is tested against the ones before it, so
 * trees claim their ground first and the undergrowth parts around them.
 */
export function buildGrove(k = 1): {
    trees: Placed[]; bushes: Placed[]; rocks: Placed[]; blooms: Placed[]; all: Placed[];
} {
    const trees = band(20250811, Math.round(46 * k), CLEARING_R - 1, CLEARING_R + 16, TREES, [0.85, 1.5], 1.2);
    const bushes = band(731145, Math.round(60 * k), CLEARING_R - 3, CLEARING_R + 12, BUSHES, [0.7, 1.35], 0.8, trees);
    const rocks = band(908812, Math.round(18 * k), CLEARING_R - 4, CLEARING_R + 10, ['rock', 'stone'], [0.8, 1.6], 0.9, [...trees, ...bushes]);
    const blooms = verges(559021, Math.round(38 * k), [...trees, ...bushes, ...rocks]);
    return { trees, bushes, rocks, blooms, all: [...trees, ...bushes, ...rocks, ...blooms] };
}
