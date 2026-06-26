// ============================================================
//  EDEN OVERWORLD — the 96×72 nine-region garden.
//
//  Generated from lib/game/eden/atlas.ts so every fountain,
//  guardian arena, tree and the spine fall ON the carved road
//  grid by construction. Biome-tinted tree scatter per region,
//  generous region clearings, a sanctum pool around the Tree of
//  Life, corner river pools, and a single Cherub gate north.
// ============================================================

import type { EdenLevelState } from '@/lib/game/eden/types';
import {
    EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE, edenHash,
    EDEN_REGIONS, edenRegionAt,
    EDEN_SPAWN, EDEN_GARDENER, EDEN_TREE_OF_LIFE, EDEN_TREE_OF_KNOWLEDGE, EDEN_CHERUB,
    EDEN_RIVERS_V2, EDEN_RIVER_ORDER,
} from '@/lib/game/eden/atlas';

export { EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE };

export type EdenGroundId = 0 | 1 | 2; // grass | dirt(road) | water
// none | tree | bush | rock | flower | tall-grass | reed.
// Only tree(1) is ever solid; 3..6 are walkable ground-cover for biome flavour.
export type EdenDecorId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EdenOverworld {
    width: number;
    height: number;
    ground: EdenGroundId[][];
    decor: EdenDecorId[][];
    solid: boolean[][];
    spawn: { x: number; y: number };
}

let cached: EdenOverworld | null = null;

// ------------------------------------------------------------
//  Gates — choke points cleared by level progress.
//  Only one true wall-gate now (the Cherub road north); rivers
//  stay open to roam, but their fountains won't attune until the
//  river's guardian falls (handled in level logic, not here).
// ------------------------------------------------------------
export type EdenGateCondition =
    | { kind: 'bossGate' }
    | { kind: 'fight'; combatId: string }
    | { kind: 'rivers'; count: number };

export interface EdenGate {
    id: string;
    tiles: [number, number][];
    condition: EdenGateCondition;
}

const SPINE = EDEN_TREE_OF_LIFE.gx; // 48
export const EDEN_GATES: EdenGate[] = [
    {
        id: 'gate_cherub',
        // spine crossing at the Verge → Antechamber boundary (gy 21)
        tiles: [[SPINE - 2, 21], [SPINE - 1, 21], [SPINE, 21], [SPINE + 1, 21], [SPINE + 2, 21]],
        condition: { kind: 'bossGate' },
    },
];

export function edenGateOpen(gateId: string, level: EdenLevelState): boolean {
    const gate = EDEN_GATES.find((g) => g.id === gateId);
    if (!gate) return true;
    const cond = gate.condition;
    switch (cond.kind) {
        case 'bossGate': return level.bossGateOpen;
        case 'fight': return level.fights.some((f) => f.combatId === cond.combatId && f.cleared);
        case 'rivers': return (level.riversLit?.length ?? 0) >= cond.count;
        default: return true;
    }
}

// ------------------------------------------------------------
//  Map generation
// ------------------------------------------------------------
function blankGrid<T>(fill: T): T[][] {
    const g: T[][] = [];
    for (let r = 0; r < EDEN_MAP_H; r++) {
        g[r] = [];
        for (let c = 0; c < EDEN_MAP_W; c++) g[r][c] = fill;
    }
    return g;
}

export function buildEdenOverworld(): EdenOverworld {
    if (cached) return cached;
    const W = EDEN_MAP_W;
    const H = EDEN_MAP_H;

    const ground: EdenGroundId[][] = blankGrid<EdenGroundId>(0);
    const decor: EdenDecorId[][] = blankGrid<EdenDecorId>(0);
    const solid: boolean[][] = blankGrid<boolean>(false);

    const inBounds = (c: number, r: number) => c >= 0 && c < W && r >= 0 && r < H;

    // --- border forest -------------------------------------------------
    for (let c = 0; c < W; c++) {
        decor[0][c] = 1; solid[0][c] = true;
        decor[H - 1][c] = 1; solid[H - 1][c] = true;
    }
    for (let r = 0; r < H; r++) {
        decor[r][0] = 1; solid[r][0] = true;
        decor[r][W - 1] = 1; solid[r][W - 1] = true;
    }

    // --- per-region biome tree scatter --------------------------------
    for (let r = 1; r < H - 1; r++) {
        for (let c = 1; c < W - 1; c++) {
            const reg = edenRegionAt(c, r);
            if (!reg) continue;
            // keep a soft inner buffer from region rect edges so regions read distinct
            const [x0, y0, x1, y1] = reg.rect;
            const edge = c <= x0 + 1 || c >= x1 - 1 || r <= y0 + 1 || r >= y1 - 1;
            const n = edenHash(c, r, reg.id.length * 7 + 3);
            const dens = reg.biome.density * (edge ? 1.7 : 1);
            if (n < dens) {
                decor[r][c] = edenHash(c, r, 8) > 0.6 ? 1 : 2;
                solid[r][c] = decor[r][c] === 1; // bushes walkable, trees solid
            }
        }
    }

    // --- carve a road (dirt, walkable) ---------------------------------
    const carveRoad = (x1: number, y1: number, x2: number, y2: number, half: number) => {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                for (let dy = -half; dy <= half; dy++) {
                    for (let dx = -half; dx <= half; dx++) {
                        const cx = x + dx, cy = y + dy;
                        if (!inBounds(cx, cy) || cx === 0 || cy === 0 || cx === W - 1 || cy === H - 1) continue;
                        ground[cy][cx] = 1;
                        decor[cy][cx] = 0;
                        solid[cy][cx] = false;
                    }
                }
            }
        }
    };

    // vertical spine + the two river columns (gx 16 / 80) — fountains sit on these
    carveRoad(SPINE, 3, SPINE, H - 3, 1);
    carveRoad(16, 3, 16, H - 3, 1);
    carveRoad(80, 3, 80, H - 3, 1);
    // three horizontal mid-lines (gy 12 / 36 / 60) — fountains sit on these too
    carveRoad(3, 12, W - 3, 12, 1);
    carveRoad(3, 36, W - 3, 36, 1);
    carveRoad(3, 60, W - 3, 60, 1);

    // --- region centre clearings (open grass to roam) ------------------
    const clearEllipse = (cx: number, cy: number, rx: number, ry: number, asRoad = false) => {
        for (let r = Math.ceil(cy - ry); r <= Math.floor(cy + ry); r++) {
            for (let c = Math.ceil(cx - rx); c <= Math.floor(cx + rx); c++) {
                if (!inBounds(c, r) || c === 0 || r === 0 || c === W - 1 || r === H - 1) continue;
                const dx = (c - cx) / rx, dy = (r - cy) / ry;
                if (dx * dx + dy * dy <= 1) {
                    decor[r][c] = 0;
                    solid[r][c] = false;
                    if (asRoad) ground[r][c] = 1;
                    else if (ground[r][c] === 2) ground[r][c] = 0; // a clearing/plaza drains any river water it covers
                }
            }
        }
    };
    for (const reg of EDEN_REGIONS) {
        const [x0, y0, x1, y1] = reg.rect;
        clearEllipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2.7, (y1 - y0) / 2.7);
    }

    // --- the river of Eden (Gen 2:10) ----------------------------------
    //  "A river went out of Eden... and parted into four heads." A great
    //  water flows from the north sanctum down the spine and parts east–
    //  west across the four-rivers band, dividing the garden into four
    //  lands. Carved BEFORE the plazas/sanctum/landing/gates below, and it
    //  never floods a road tile — so the road grid bridges both waters at
    //  every crossing (a ford) and every landmark plaza drains its water.
    const RIVER_H = 40; // east–west, just south of the gy36 midline road
    const RIVER_V = 52; // north–south, just east of the spine
    const carveWater = (c: number, r: number) => {
        if (!inBounds(c, r) || c <= 1 || r <= 1 || c >= W - 2 || r >= H - 2) return;
        if (ground[r][c] === 1) return; // never flood a road — it is the ford
        ground[r][c] = 2; solid[r][c] = true; decor[r][c] = 0;
    };
    for (let c = 6; c <= W - 6; c++) carveWater(c, RIVER_H);            // the dividing river
    for (let r = 6; r <= RIVER_H + 9; r++) carveWater(RIVER_V, r);     // the source, flowing from the north into the cross

    // --- plazas around every fixed landmark (always walkable) ----------
    const plaza = (gx: number, gy: number, rad = 3) => clearEllipse(gx, gy, rad, rad);
    plaza(EDEN_SPAWN.gx, EDEN_SPAWN.gy, 4);
    plaza(EDEN_GARDENER.gx, EDEN_GARDENER.gy, 3);
    plaza(EDEN_TREE_OF_KNOWLEDGE.gx, EDEN_TREE_OF_KNOWLEDGE.gy, 4);
    plaza(EDEN_CHERUB.at.gx, EDEN_CHERUB.at.gy, 4);
    for (const id of EDEN_RIVER_ORDER) {
        const rv = EDEN_RIVERS_V2[id];
        plaza(rv.fountain.gx, rv.fountain.gy, 3);
        plaza(rv.guardian.at.gx, rv.guardian.at.gy, 3);
    }

    // --- sanctum pool around the Tree of Life (north) ------------------
    const tl = EDEN_TREE_OF_LIFE;
    for (let r = 2; r <= 9; r++) {
        for (let c = tl.gx - 7; c <= tl.gx + 7; c++) {
            if (!inBounds(c, r)) continue;
            if (Math.hypot(c - tl.gx, r - tl.gy) < 6) {
                ground[r][c] = 2;
                solid[r][c] = true;
                decor[r][c] = 0;
            }
        }
    }
    // tree-of-life landing (walkable approach from the south on the spine).
    // MUST reach gy+4 to punch through the sanctum-pool moat ring at gy9 and
    // connect the gy10 spine road to the gy5..8 landing — else the Leaf is
    // unclaimable. Carving to ground=0 also bypasses the sanctum-water gate.
    for (let r = tl.gy; r <= tl.gy + 4; r++) {
        if (inBounds(tl.gx, r)) { ground[r][tl.gx] = 0; solid[r][tl.gx] = false; decor[r][tl.gx] = 0; }
    }

    // --- decorative corner river pools near each fountain --------------
    const pool = (cx: number, cy: number, rad: number) => {
        for (let r = cy - rad; r <= cy + rad; r++) {
            for (let c = cx - rad; c <= cx + rad; c++) {
                if (!inBounds(c, r) || c <= 1 || r <= 1 || c >= W - 2 || r >= H - 2) continue;
                if (Math.hypot(c - cx, r - cy) <= rad && ground[r][c] !== 1) {
                    ground[r][c] = 2; solid[r][c] = true; decor[r][c] = 0;
                }
            }
        }
        // keep the fountain tile itself walkable
        if (inBounds(cx, cy)) { ground[cy][cx] = 1; solid[cy][cx] = false; decor[cy][cx] = 0; }
    };
    for (const id of EDEN_RIVER_ORDER) {
        const f = EDEN_RIVERS_V2[id].fountain;
        // small pool offset toward the map corner, never covering the road
        pool(f.gx + (f.gx < SPINE ? -3 : 3), f.gy + (f.gy < EDEN_MAP_H / 2 ? -3 : 3), 2);
    }

    // --- biome ground cover + riverbank reeds (all walkable) -----------
    //  Pure decor that makes the nine biomes read distinct; never solid, so
    //  it has zero effect on walkability. Reeds fringe every water edge.
    const COVER: Record<string, EdenDecorId[]> = {
        pishon: [3, 3, 4], gihon: [4, 5, 4], hiddekel: [3, 3, 5], euphrates: [5, 4, 5],
        verge: [3, 5, 3], outer_grove: [5, 4, 5], eastern_garden: [4, 4, 5],
        threshold: [5, 4, 5], antechamber: [3, 5, 3],
    };
    for (let r = 1; r < H - 1; r++) {
        for (let c = 1; c < W - 1; c++) {
            if (ground[r][c] !== 0 || decor[r][c] !== 0 || solid[r][c]) continue;
            let nearWater = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (inBounds(c + dx, r + dy) && ground[r + dy][c + dx] === 2) { nearWater = true; break; }
            }
            if (nearWater) {
                if (edenHash(c, r, 30) < 0.55) decor[r][c] = 6; // reeds at the water's edge
                continue;
            }
            if (edenHash(c, r, 21) < 0.07) {
                const reg = edenRegionAt(c, r);
                const pal = (reg && COVER[reg.id]) || [4, 5, 3];
                decor[r][c] = pal[Math.floor(edenHash(c, r, 22) * pal.length) % pal.length];
            }
        }
    }

    // --- gate trees (rendered solid until the gate opens) --------------
    for (const gate of EDEN_GATES) {
        for (const [c, r] of gate.tiles) {
            if (!inBounds(c, r)) continue;
            decor[r][c] = 1; solid[r][c] = true; ground[r][c] = 0;
        }
    }

    cached = {
        width: W, height: H, ground, decor, solid,
        spawn: { x: EDEN_SPAWN.gx, y: EDEN_SPAWN.gy },
    };
    return cached;
}

// ------------------------------------------------------------
//  Walkability
// ------------------------------------------------------------
/** Is a tile blocked? barrierActive seals the sanctum until the rivers converge. */
export function isEdenWalkable(
    gx: number,
    gy: number,
    level: EdenLevelState,
    barrierActive: boolean,
): boolean {
    const ow = buildEdenOverworld();
    if (gx < 0 || gx >= ow.width || gy < 0 || gy >= ow.height) return false;

    // gate trees
    for (const gate of EDEN_GATES) {
        if (!edenGateOpen(gate.id, level)) {
            for (const [c, r] of gate.tiles) if (c === gx && r === gy) return false;
        }
    }

    const tl = EDEN_TREE_OF_LIFE;
    // sanctum water: only the spine landing is walkable, and only once the
    // rivers converge (barrier down) + sanctum opened.
    if (ow.ground[gy][gx] === 2 && gy <= 9 && Math.hypot(gx - tl.gx, gy - tl.gy) < 6.5) {
        const onLanding = gx === tl.gx && gy >= tl.gy && gy <= tl.gy + 3;
        if (!onLanding) return false;
        if (barrierActive) return false;
        if (!level.sanctumOpen) return false;
        return true;
    }

    if (ow.solid[gy][gx] && ow.ground[gy][gx] !== 1) return false;
    return true;
}

/** Nearest walkable tile (BFS) — safety net for dynamically-placed content. */
export function edenNearestWalkable(
    gx: number, gy: number,
    level: EdenLevelState,
): { gx: number; gy: number } {
    if (isEdenWalkable(gx, gy, level, false)) return { gx, gy };
    const seen = new Set<string>([`${gx},${gy}`]);
    let frontier = [[gx, gy]];
    for (let ring = 0; ring < 8; ring++) {
        const next: number[][] = [];
        for (const [cx, cy] of frontier) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                const k = `${nx},${ny}`;
                if (seen.has(k)) continue;
                seen.add(k);
                if (isEdenWalkable(nx, ny, level, false)) return { gx: nx, gy: ny };
                next.push([nx, ny]);
            }
        }
        frontier = next;
    }
    return { gx, gy };
}
