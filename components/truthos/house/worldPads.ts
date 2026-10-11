/**
 * Aether springs — bounce pads on the terrace.
 *
 * Three Platformer Kit springs sit on the shelf's outer walk. Step on one
 * and the controller launches you (worldPads is pure data so the walker
 * and the renderer cannot disagree about where they are). Placement keeps
 * clear of the lantern ring (r≈27.2, every 2π/14 from 0.08) and the three
 * sentinels (r 28.5 at 0.55, 2.2, 4.0).
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
    { id: 'spring_e', ...ring(1.25, 25.4), r: 0.62, launch: 9.6 },
    { id: 'spring_w', ...ring(3.35, 25.4), r: 0.62, launch: 9.6 },
    { id: 'spring_s', ...ring(5.3, 25.4), r: 0.62, launch: 11.2 },
];

export function padUnder(x: number, z: number): Pad | null {
    for (const p of PADS) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < p.r * p.r) return p;
    }
    return null;
}
