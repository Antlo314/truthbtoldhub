/**
 * Where the twenty-four shards hang. Pure data, so the HUD, the renderer
 * and the pickup test all agree — and so validate-sanctum can assert
 * every one of them is reachable on foot (or by spring).
 *
 * Four in the Sanctum, six in the Processional (two of them high, above
 * the springs), two at the Overlook, three in each chamber.
 */
import { FIRE, POOL, facetAngle, room, roomCenter } from './homeMap';
import type { Shard } from './shardStore';

const ring = (cx: number, cz: number, angle: number, radius: number) => ({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });

const cin = roomCenter(room('cinema'));
const mir = roomCenter(room('soul_mirror'));
const stu = roomCenter(room('studio'));

export const SHARDS: Shard[] = [
    // the Sanctum — between the Source seats and the lanterns, on the vertex bearings
    ...[0, 2, 4, 6].map((k, i) => ({ id: `hall_${i}`, ...ring(0, 0, facetAngle(k) + Math.PI / 8, 9.0), y: 1.25, place: 'the Sanctum' })),
    // the Processional — on the runner, by the benches, and two high above the springs
    { id: 'gallery_0', x: 0, z: 23.6, y: 1.15, place: 'the Processional' },
    { id: 'gallery_1', x: 0, z: 41.0, y: 1.15, place: 'the Processional' },
    { id: 'gallery_2', x: -3.0, z: 53.0, y: 1.15, place: 'the Processional' },
    { id: 'gallery_3', x: 3.2, z: 38.6, y: 1.15, place: 'the Processional' },
    { id: 'gallery_high_W', x: -2.4, z: 28.7, y: 3.5, place: 'the air of the Processional' },
    { id: 'gallery_high_E', x: 2.4, z: 28.7, y: 3.5, place: 'the air of the Processional' },
    // the Overlook
    { id: 'overlook_0', x: -1.2, z: 57.0, y: 1.15, place: 'the Overlook' },
    { id: 'overlook_1', x: 1.4, z: 61.0, y: 1.15, place: 'the Overlook' },
    // the Cinema — inside the door, behind the last row, by the stage
    { id: 'cinema_0', x: 7.6, z: cin.z - 2.7, y: 1.15, place: 'the Cinema' },
    { id: 'cinema_1', x: 22.2, z: cin.z, y: 1.15, place: 'the Cinema' },
    { id: 'cinema_2', x: 23.2, z: 36.0, y: 1.15, place: 'the Cinema' },
    // the Hall Circle — outside the stones
    { id: 'hall_circle_0', ...ring(FIRE.x, FIRE.z, 0.6, 8.0), y: 1.15, place: 'the Hall Circle' },
    { id: 'hall_circle_1', ...ring(FIRE.x, FIRE.z, 5.7, 8.0), y: 1.15, place: 'the Hall Circle' },
    { id: 'hall_circle_2', ...ring(FIRE.x, FIRE.z, 3.6, 8.0), y: 1.15, place: 'the Hall Circle' },
    // the Mirror Well — the near lip and the far corners
    { id: 'well_0', x: POOL.x - POOL.r - 2.4, z: POOL.z - 1.8, y: 1.15, place: 'the Mirror Well' },
    { id: 'well_1', x: mir.x + 7.8, z: mir.z - 6.4, y: 1.15, place: 'the Mirror Well' },
    { id: 'well_2', x: mir.x + 7.8, z: mir.z + 6.6, y: 1.15, place: 'the Mirror Well' },
    // the Signal Studio
    { id: 'studio_0', x: stu.x + 3.2, z: stu.z + 2.6, y: 1.15, place: 'the Signal Studio' },
    { id: 'studio_1', x: stu.x - 4.4, z: stu.z + 1.6, y: 1.15, place: 'the Signal Studio' },
    { id: 'studio_2', x: stu.x + 5.4, z: stu.z - 6.4, y: 1.15, place: 'the Signal Studio' },
];

export const SHARD_TOTAL = SHARDS.length;
