/**
 * Where the twenty-four shards hang. Pure data, so the HUD, the renderer
 * and the pickup test all agree — and so validate-sanctum can assert
 * every one of them is reachable on foot.
 *
 * Eight on the terrace, three on each isle, four in the hall between
 * the apses (none in an apse, where a station already draws the eye).
 */
import { DESTINATIONS, destCenter, CLEARING_R } from './jungleMap';
import { facetAngle } from './homeMap';
import type { Shard } from './shardStore';

const ring = (angle: number, radius: number) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });

function isle(id: (typeof DESTINATIONS)[number]['id'], name: string, offsets: [number, number][]): Shard[] {
    const d = DESTINATIONS.find((x) => x.id === id)!;
    const c = destCenter(d);
    return offsets.map(([dx, dz], i) => ({ id: `${id}_${i}`, x: c.x + dx, z: c.z + dz, y: 1.15, place: name }));
}

/** Terrace shards sit on the middle ring, away from every bridge head and sentinel */
const TERRACE_ANGLES = [0.55, 1.05, 1.95, 2.6, 3.3, 4.2, 4.95, 5.95];

export const SHARDS: Shard[] = [
    ...TERRACE_ANGLES.map((a, i) => ({ id: `walk_${i}`, ...ring(a, CLEARING_R - 5.4 + (i % 2) * 1.2), y: 1.15, place: 'the terrace' })),
    ...isle('cinema', 'the Cinema Isle', [[-6.5, 5.5], [7.5, -4.5], [0, -8.5]]),
    ...isle('hall', 'the Hall Circle', [[0, -8.6], [8.4, 2.2], [-7.6, 4.8]]),
    ...isle('soul_mirror', 'the Mirror Well', [[-6.6, 1.2], [6.2, 3.4], [1.5, -6.8]]),
    ...isle('studio', 'the Signal Spire', [[-6.2, -3.4], [6.4, 4.2], [-1.0, 7.6]]),
    // the hall — on the gold ring, between the apses, at the four diagonals
    ...[0.5, 2.5, 4.5, 6.5].map((k, i) => ({ id: `hall_${i}`, ...ring(facetAngle(k), 7.4), y: 1.25, place: 'the Sanctum' })),
];

export const SHARD_TOTAL = SHARDS.length;
