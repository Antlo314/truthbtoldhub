'use client';

/**
 * The grove — real trees where the player actually looks.
 *
 * The jungle's far wall is instanced cylinders and icosahedrons, which is
 * the right call for a hundred metres of foliage: it costs almost nothing
 * and reads correctly as a mass of green. But the same trick was also
 * doing the near band, the twenty metres you walk through and stand
 * beside, and up close a cylinder is a cylinder. Meanwhile the Kenney
 * Nature Kit models were sitting registered and unplaced in the manifest.
 *
 * So this layer sits between them: real GLB trees, bushes, flowers and
 * rocks in the visible ring around the clearing and along the corridor
 * edges, thinning out where the instanced wall takes over. Every prop
 * keeps the HouseProp fallback, so a missing model leaves a shrub-shaped
 * primitive rather than a hole, and phones get roughly a third as many.
 */
import { useMemo } from 'react';
import HouseProp from './HouseProp';
import { CLEARING_R, inCorridor, inOpenGround } from './jungleMap';
import { SHELL } from './homeMap';

const TREES = ['treeDefault', 'treeOak', 'treeDetailed', 'treeFat'] as const;
const BUSHES = ['bush', 'bushSmall', 'bushLarge'] as const;
const FLOWERS = ['flowerPurple', 'flowerRed', 'flowerYellow'] as const;

function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const HOUSE_PAD = 2.0;
const clearOfHouse = (x: number, z: number) =>
    x < SHELL.minX - HOUSE_PAD ||
    x > SHELL.maxX + HOUSE_PAD ||
    z < SHELL.minZ - HOUSE_PAD ||
    z > SHELL.maxZ + HOUSE_PAD;

type Placed = { key: string; x: number; z: number; rot: number; scale: number };

/**
 * Scatter in a band, rejecting anything that would stand in open ground,
 * on a path, or inside the house — the same tests the instanced foliage
 * and the colliders already use, so nothing here can contradict them.
 */
function band(
    seed: number,
    count: number,
    rMin: number,
    rMax: number,
    keys: readonly string[],
    scale: [number, number],
    openMargin: number,
): Placed[] {
    const r = rng(seed);
    const out: Placed[] = [];
    let guard = count * 40;
    while (out.length < count && guard-- > 0) {
        const rad = Math.sqrt(r()) * (rMax - rMin) + rMin;
        const a = r() * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        if (!clearOfHouse(x, z)) continue;
        if (inOpenGround(x, z, openMargin)) continue;
        if (inCorridor(x, z, 1.4)) continue;
        out.push({
            key: keys[Math.floor(r() * keys.length)],
            x,
            z,
            rot: r() * Math.PI * 2,
            scale: scale[0] + r() * (scale[1] - scale[0]),
        });
    }
    return out;
}

/** Flowers and small growth line the paths instead of avoiding them. */
function verges(seed: number, count: number): Placed[] {
    const r = rng(seed);
    const out: Placed[] = [];
    let guard = count * 40;
    while (out.length < count && guard-- > 0) {
        const rad = Math.sqrt(r()) * 62 + 6;
        const a = r() * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        if (!clearOfHouse(x, z)) continue;
        // just off the path, not on it
        if (!inCorridor(x, z, 1.6) || inCorridor(x, z, -0.2)) continue;
        out.push({
            key: FLOWERS[Math.floor(r() * FLOWERS.length)],
            x,
            z,
            rot: r() * Math.PI * 2,
            scale: 0.8 + r() * 0.6,
        });
    }
    return out;
}

export default function Grove({ low = false }: { low?: boolean }) {
    const k = low ? 0.35 : 1;

    const trees = useMemo(
        () => band(20250811, Math.round(46 * k), CLEARING_R - 1, CLEARING_R + 16, TREES, [0.85, 1.5], 1.2),
        [k],
    );
    const bushes = useMemo(
        () => band(731145, Math.round(60 * k), CLEARING_R - 3, CLEARING_R + 12, BUSHES, [0.7, 1.35], 0.8),
        [k],
    );
    const rocks = useMemo(
        () => band(908812, Math.round(18 * k), CLEARING_R - 4, CLEARING_R + 10, ['rock', 'stone'], [0.8, 1.6], 0.9),
        [k],
    );
    const blooms = useMemo(() => verges(559021, Math.round(38 * k)), [k]);

    const all = useMemo(
        () => [...trees, ...bushes, ...rocks, ...blooms],
        [trees, bushes, rocks, blooms],
    );

    return (
        <group>
            {all.map((p, i) => (
                <group key={`${p.key}-${i}`} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={p.scale}>
                    <HouseProp model={p.key} position={[0, 0, 0]}>
                        {null}
                    </HouseProp>
                </group>
            ))}
        </group>
    );
}
