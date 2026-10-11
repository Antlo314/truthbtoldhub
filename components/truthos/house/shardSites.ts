/**
 * Where the twenty-four shards hang. Pure data, so the HUD, the renderer
 * and the pickup test all agree — and so a script can assert nothing sits
 * inside a wall.
 *
 * Six on the terrace walk, three on each isle, four indoors, two on the
 * north walk that goes nowhere (so it goes somewhere now).
 */
import { DESTINATIONS, destCenter } from './jungleMap';
import type { Shard } from './shardStore';

const ring = (angle: number, radius: number) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });

function isle(id: (typeof DESTINATIONS)[number]['id'], name: string, offsets: [number, number][]): Shard[] {
    const d = DESTINATIONS.find((x) => x.id === id)!;
    const c = destCenter(d);
    return offsets.map(([dx, dz], i) => ({
        id: `${id}_${i}`,
        x: c.x + dx,
        z: c.z + dz,
        y: 1.15,
        place: name,
    }));
}

export const SHARDS: Shard[] = [
    // the terrace walk, between the lanterns
    { id: 'walk_0', ...ring(0.42, 25.9), y: 1.15, place: 'the terrace walk' },
    { id: 'walk_1', ...ring(1.75, 26.2), y: 1.15, place: 'the terrace walk' },
    { id: 'walk_2', ...ring(2.65, 25.7), y: 1.15, place: 'the terrace walk' },
    { id: 'walk_3', ...ring(3.85, 26.0), y: 1.15, place: 'the terrace walk' },
    { id: 'walk_4', ...ring(4.6, 25.8), y: 1.15, place: 'the terrace walk' },
    { id: 'walk_5', ...ring(5.85, 26.1), y: 1.15, place: 'the terrace walk' },
    // the isles — clear of each stage's own furniture
    ...isle('cinema', 'the Cinema Isle', [[-6.5, 5.5], [7.5, -4.5], [0, -8.5]]),
    ...isle('hall', 'the Hall Circle', [[0, -8.6], [8.4, 2.2], [-7.6, 4.8]]),
    ...isle('soul_mirror', 'the Mirror Well', [[-6.6, 1.2], [6.2, 3.4], [1.5, -6.8]]),
    ...isle('studio', 'the Signal Spire', [[-6.2, -3.4], [6.4, 4.2], [-1.0, 7.6]]),
    // indoors — one per wing, in open floor
    { id: 'house_rec', x: -9.4, z: 8.2, y: 1.2, place: 'the Rec Room' },
    { id: 'house_spare', x: -10.6, z: -11.6, y: 1.2, place: 'the Spare room' },
    { id: 'house_kitchen', x: 12.6, z: -8.4, y: 1.2, place: 'the Kitchen' },
    { id: 'house_living', x: 12.2, z: 9.6, y: 1.2, place: 'the Living room' },
    // the north walk
    { id: 'north_0', x: 0.9, z: 30, y: 1.15, place: 'the north walk' },
    { id: 'north_1', x: -0.8, z: 43, y: 1.15, place: 'the north walk' },
];

export const SHARD_TOTAL = SHARDS.length;
