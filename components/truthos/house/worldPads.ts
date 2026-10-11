/**
 * Aether springs — bounce pads inside the lair.
 *
 * Two in the Processional, opposite the Cinema and Hall doors, under the
 * two shards that hang out of reach; one in the Hall Circle for the joy
 * of it. Step on one and the controller launches you (worldPads is pure
 * data so the walker and the renderer cannot disagree about where they
 * are). validate-sanctum checks each one is reachable.
 */
import { FIRE } from './homeMap';

export type Pad = {
    id: string;
    x: number;
    z: number;
    /** trigger radius, metres */
    r: number;
    /** vertical launch speed, m/s — 9.6 clears about 2.9 m */
    launch: number;
};

export const PADS: Pad[] = [
    { id: 'spring_gallery_W', x: -2.4, z: 28.7, r: 0.62, launch: 9.6 },
    { id: 'spring_gallery_E', x: 2.4, z: 28.7, r: 0.62, launch: 9.6 },
    { id: 'spring_hall', x: FIRE.x - 6.0, z: FIRE.z - 5.4, r: 0.62, launch: 10.4 },
];

export function padUnder(x: number, z: number): Pad | null {
    for (const p of PADS) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < p.r * p.r) return p;
    }
    return null;
}
