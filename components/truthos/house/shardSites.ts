/**
 * Where the twenty-four shards hang. Pure data, so the HUD, the renderer
 * and the pickup test all agree — and so validate-sanctum can assert
 * every one of them is reachable on foot (or by spring).
 *
 * Four on the Sanctum's gold ring, six in the Processional (two of them
 * high, above the springs), two at the Overlook, three in each chamber.
 */
import { facetAngle, FIRE, POOL, room, roomCenter } from './homeMap';
import type { Shard } from './shardStore';

const ring = (angle: number, radius: number) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });

const cin = roomCenter(room('cinema'));
const stu = roomCenter(room('studio'));
const mir = roomCenter(room('soul_mirror'));

export const SHARDS: Shard[] = [
    // the Sanctum — on the gold ring, between the apses, at the four diagonals
    ...[0.5, 2.5, 4.5, 6.5].map((k, i) => ({ id: `hall_${i}`, ...ring(facetAngle(k), 7.4), y: 1.25, place: 'the Sanctum' })),
    // the Processional — two on the runner, two by the planters, two high above the springs
    { id: 'gallery_0', x: 0, z: 17.8, y: 1.15, place: 'the Processional' },
    { id: 'gallery_1', x: 0, z: 25.0, y: 1.15, place: 'the Processional' },
    { id: 'gallery_2', x: -2.2, z: 17.5, y: 1.15, place: 'the Processional' },
    { id: 'gallery_3', x: 2.2, z: 26.4, y: 1.15, place: 'the Processional' },
    { id: 'gallery_high_W', x: -2.2, z: 21.0, y: 3.5, place: 'the air of the Processional' },
    { id: 'gallery_high_E', x: 2.2, z: 21.0, y: 3.5, place: 'the air of the Processional' },
    // the Overlook
    { id: 'overlook_0', x: -0.8, z: 33.0, y: 1.15, place: 'the Overlook' },
    { id: 'overlook_1', x: 0.9, z: 35.3, y: 1.15, place: 'the Overlook' },
    // the Cinema — back corners and the front of the aisle
    { id: 'cinema_0', x: 6.2, z: cin.z - 4.6, y: 1.15, place: 'the Cinema' },
    { id: 'cinema_1', x: 17.4, z: cin.z + 5.0, y: 1.15, place: 'the Cinema' },
    { id: 'cinema_2', x: 17.6, z: cin.z, y: 1.15, place: 'the Cinema' },
    // the Hall Circle — outside the stones
    { id: 'hall_circle_0', ...ring(1.3, 6.2), y: 1.15, place: 'the Hall Circle' },
    { id: 'hall_circle_1', ...ring(3.9, 6.2), y: 1.15, place: 'the Hall Circle' },
    { id: 'hall_circle_2', ...ring(5.5, 6.2), y: 1.15, place: 'the Hall Circle' },
    // the Mirror Well — the near lip and the far corners
    { id: 'well_0', x: POOL.x - POOL.r - 2.4, z: POOL.z - 1.4, y: 1.15, place: 'the Mirror Well' },
    { id: 'well_1', x: mir.x + 4.6, z: mir.z - 5.0, y: 1.15, place: 'the Mirror Well' },
    { id: 'well_2', x: mir.x + 4.6, z: mir.z + 5.0, y: 1.15, place: 'the Mirror Well' },
    // the Signal Studio
    { id: 'studio_0', x: stu.x + 2.0, z: stu.z + 4.2, y: 1.15, place: 'the Signal Studio' },
    { id: 'studio_1', x: stu.x - 2.4, z: stu.z + 1.6, y: 1.15, place: 'the Signal Studio' },
    { id: 'studio_2', x: stu.x + 5.4, z: stu.z - 4.6, y: 1.15, place: 'the Signal Studio' },
].map((s) =>
    // hall circle shards are placed about the fire
    s.id.startsWith('hall_circle') ? { ...s, x: s.x + FIRE.x, z: s.z + FIRE.z } : s,
);

export const SHARD_TOTAL = SHARDS.length;
