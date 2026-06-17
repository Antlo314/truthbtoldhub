// ============================================================
//  EDEN OPEN GARDEN — smaller overworld-style map.
//  Grass paths, trees, ponds; puzzles & trials scattered openly.
// ============================================================

import type { EdenLevelState } from '@/lib/game/edenLevel';

export const EDEN_MAP_W = 56;
export const EDEN_MAP_H = 44;
export const EDEN_TILE = 16;

export type EdenGroundId = 0 | 1 | 2; // grass | dirt | water
export type EdenDecorId = 0 | 1 | 2;  // none | tree | bush

export interface EdenOverworld {
    width: number;
    height: number;
    ground: EdenGroundId[][];
    decor: EdenDecorId[][];
    solid: boolean[][];
    spawn: { x: number; y: number };
}

function h2(c: number, r: number, s = 0) {
    let x = (c * 374761393 + r * 668265263 + s * 2246822519) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

let cached: EdenOverworld | null = null;

/** Choke-point gates — trees clear when conditions met */
export const EDEN_GATES: {
    id: string;
    tiles: [number, number][];
    keyId?: string;
    needsBossGate?: boolean;
}[] = [
    { id: 'gate_grove', tiles: [[22, 30], [23, 30], [24, 30]], keyId: 'key_threshold' },
    { id: 'gate_river', tiles: [[36, 22], [37, 22], [38, 22]], keyId: 'key_river' },
    { id: 'gate_cherub', tiles: [[26, 14], [27, 14], [28, 14], [29, 14], [30, 14]], needsBossGate: true },
];

export function buildEdenOverworld(): EdenOverworld {
    if (cached) return cached;
    const W = EDEN_MAP_W;
    const H = EDEN_MAP_H;

    const ground: EdenGroundId[][] = [];
    const decor: EdenDecorId[][] = [];
    const solid: boolean[][] = [];

    for (let r = 0; r < H; r++) {
        ground[r] = [];
        decor[r] = [];
        solid[r] = [];
        for (let c = 0; c < W; c++) {
            ground[r][c] = 0;
            decor[r][c] = 0;
            solid[r][c] = false;
        }
    }

    // border forest
    for (let c = 0; c < W; c++) {
        decor[0][c] = 1; solid[0][c] = true;
        decor[H - 1][c] = 1; solid[H - 1][c] = true;
    }
    for (let r = 0; r < H; r++) {
        decor[r][0] = 1; solid[r][0] = true;
        decor[r][W - 1] = 1; solid[r][W - 1] = true;
    }

    // main cross paths
    const path = (x1: number, y1: number, x2: number, y2: number) => {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
                if (ground[y]?.[x] === 0) ground[y][x] = 1;
    };
    path(8, 38, 48, 38);   // south road (threshold)
    path(28, 6, 28, 40);   // north-south spine
    path(10, 22, 46, 22);  // east-west mid
    path(10, 10, 46, 10);  // north terrace
    path(10, 32, 46, 32);  // south grove ring

    // sanctum pool (north)
    for (let r = 4; r <= 9; r++) {
        for (let c = 22; c <= 34; c++) {
            if (Math.hypot(c - 28, r - 6) < 5.5) {
                ground[r][c] = 2;
                solid[r][c] = true;
            }
        }
    }
    // tree of life landing
    ground[6][28] = 0;
    solid[6][28] = false;
    ground[7][28] = 0;
    solid[7][28] = false;

    // corner river pools
    const pool = (cx: number, cy: number, rad: number) => {
        for (let r = cy - rad; r <= cy + rad; r++) {
            for (let c = cx - rad; c <= cx + rad; c++) {
                if (r < 1 || r >= H - 1 || c < 1 || c >= W - 1) continue;
                if (Math.hypot(c - cx, r - cy) <= rad) {
                    ground[r][c] = 2;
                    solid[r][c] = true;
                }
            }
        }
        ground[cy][cx] = 0;
        solid[cy][cx] = false;
    };
    pool(10, 10, 3);
    pool(46, 10, 3);
    pool(10, 32, 3);
    pool(46, 32, 3);

    // scattered groves (organic trees)
    for (let r = 2; r < H - 2; r++) {
        for (let c = 2; c < W - 2; c++) {
            if (ground[r][c] === 2) continue;
            const edge = r < 3 || r > H - 4 || c < 3 || c > W - 4;
            const onPath = ground[r][c] === 1;
            if (edge && h2(c, r) > 0.35) {
                decor[r][c] = 1;
                solid[r][c] = true;
            } else if (!onPath && h2(c, r, 7) > 0.88) {
                decor[r][c] = h2(c, r, 8) > 0.55 ? 1 : 2;
                solid[r][c] = true;
            }
        }
    }

    // gate trees (cleared dynamically in isEdenWalkable)
    for (const gate of EDEN_GATES) {
        for (const [c, r] of gate.tiles) {
            decor[r][c] = 1;
            solid[r][c] = true;
        }
    }

    // clear spawn plaza
    for (let r = 36; r <= 40; r++) {
        for (let c = 24; c <= 32; c++) {
            decor[r][c] = 0;
            solid[r][c] = false;
            ground[r][c] = 0;
        }
    }

    cached = {
        width: W,
        height: H,
        ground,
        decor,
        solid,
        spawn: { x: 28, y: 38 },
    };
    return cached;
}

export function edenGateOpen(gateId: string, level: EdenLevelState): boolean {
    const gate = EDEN_GATES.find((g) => g.id === gateId);
    if (!gate) return true;
    if (gate.needsBossGate) return level.bossGateOpen;
    if (gate.keyId) return level.keysFound.includes(gate.keyId);
    return true;
}

/** Walkable check — open garden with dynamic gates & sanctum pool */
export function isEdenWalkable(
    gx: number,
    gy: number,
    level: EdenLevelState,
    barrierActive: boolean,
): boolean {
    const ow = buildEdenOverworld();
    if (gx < 0 || gx >= ow.width || gy < 0 || gy >= ow.height) return false;

    for (const gate of EDEN_GATES) {
        if (!edenGateOpen(gate.id, level)) {
            for (const [c, r] of gate.tiles) {
                if (c === gx && r === gy) return false;
            }
        }
    }

    if (ow.solid[gy][gx] && ow.ground[gy][gx] !== 2) return false;

    if (ow.ground[gy][gx] === 2) {
        if (barrierActive && !(gx === 28 && gy >= 6 && gy <= 8)) return false;
        if (!level.sanctumOpen && gy < 12) return false;
        return gx === 28 && gy >= 6 && gy <= 8;
    }

    return true;
}