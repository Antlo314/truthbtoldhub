/**
 * Aether springs — bounce pads on the terrace.
 *
 * Three Platformer Kit springs sit on the shelf between the bridges.
 * Step on one and the controller launches you (worldPads is pure data so
 * the walker and the renderer cannot disagree about where they are).
 * Bearings are chosen clear of every bridge head, the sentinels and the
 * lantern ring; validate-sanctum checks each one is reachable.
 */
export type Pad = {
    id: string;
    x: number;
    z: number;
    /** trigger radius, metres */
    r: number;
    /** vertical launch speed, m/s — 9.6 clears about 2.9 m */
    launch: number;
};

const ring = (angle: number, radius: number) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });

export const PADS: Pad[] = [
    { id: 'spring_se', ...ring(1.2, 19), r: 0.62, launch: 9.6 },
    { id: 'spring_nw', ...ring(4.9, 19), r: 0.62, launch: 9.6 },
    { id: 'spring_ne', ...ring(5.6, 19), r: 0.62, launch: 11.2 },
];

export function padUnder(x: number, z: number): Pad | null {
    for (const p of PADS) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < p.r * p.r) return p;
    }
    return null;
}
