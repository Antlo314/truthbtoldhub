// ============================================================
//  THE OVERWORLD — one continuous SNES-style map.
//  Truth's Hut is the centerpiece; caves, a portal, and NPCs
//  are placed across it, linked by dirt paths. Generated
//  deterministically so it's the same world for everyone, and
//  expandable (content-as-data: add POIs to grow the world).
// ============================================================

export const TILE = 16;
export const MAP_W = 88;
export const MAP_H = 88;

export const ENV_SHEET = '/assets/kenney/roguelikeSheet.png';

// terrain tile ids -> sheet tiles
export const GROUND = {
    grass: { col: 5, row: 0 },
    dirt: { col: 6, row: 1 },
    water: { col: 1, row: 1 },
} as const;
export const DECOR = {
    tree: { col: 13, row: 11 },
    bush: { col: 19, row: 9 },
} as const;

export type GroundId = 0 | 1 | 2; // grass | dirt | water
export type DecorId = 0 | 1 | 2;  // none | tree | bush

export type POIType = 'hut' | 'cave' | 'portal' | 'npc';
export interface POI {
    id: string;
    type: POIType;
    x: number; // tile col
    y: number; // tile row
    name: string;
    npcTile?: { col: number; row: number };
    detail?: string;
}

export interface Overworld {
    width: number;
    height: number;
    ground: GroundId[][];
    decor: DecorId[][];
    solid: boolean[][];
    pois: POI[];
    spawn: { x: number; y: number }; // tile coords
}

function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// deterministic spatial hash (0..1) for organic terrain clumping
function h2(c: number, r: number) {
    let x = (c * 374761393 + r * 668265263) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

let cached: Overworld | null = null;

export function buildOverworld(): Overworld {
    if (cached) return cached;
    const rand = mulberry32(20260615);
    const W = MAP_W;
    const H = MAP_H;

    const ground: GroundId[][] = [];
    const decor: DecorId[][] = [];
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

    const cx = (W / 2) | 0;
    const cy = (H / 2) | 0;

    const pois: POI[] = [
        { id: 'hut', type: 'hut', x: cx, y: cy, name: "Truth's Hut", detail: 'The centerpiece — daily dispatches and scrolls.' },
        { id: 'dest_eden', type: 'portal', x: 8, y: 8, name: 'Eden — Before the Fall' },
        { id: 'npc_gardener', type: 'npc', x: 12, y: 11, name: 'The Gardener', npcTile: { col: 0, row: 8 }, detail: 'Keeper of the First Garden — walk Eden back to before the lie.' },
        { id: 'dest_emerald', type: 'portal', x: cx, y: 7, name: 'The Emerald Halls' },
        { id: 'dest_fair', type: 'portal', x: W - 8, y: 8, name: 'St. Louis, 1904' },
        { id: 'npc_mabel', type: 'npc', x: W - 12, y: 11, name: 'Mabel Hart', npcTile: { col: 0, row: 5 }, detail: 'Chronicler of the vanished Fair.' },
        { id: 'dest_giza', type: 'cave', x: 8, y: H - 8, name: 'Giza — The Engine of Stone' },
        { id: 'dest_kolbrin', type: 'cave', x: W - 8, y: H - 8, name: 'The Kolbrin Vault' },
        { id: 'npc_hana', type: 'npc', x: 14, y: cy + 5, name: 'Hana', npcTile: { col: 0, row: 5 }, detail: 'A mission for you, if you have the will.' },
        { id: 'npc_eli', type: 'npc', x: cx + 9, y: cy + 6, name: 'Eli', npcTile: { col: 0, row: 6 }, detail: 'A scribe of buried books.' },
        { id: 'npc_mara', type: 'npc', x: cx - 4, y: 13, name: 'Sister Mara', npcTile: { col: 1, row: 5 }, detail: 'She studies the relics of this world.' },
    ];

    const inB = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H;

    // forest border (natural walls)
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (c < 2 || r < 2 || c >= W - 2 || r >= H - 2) {
                decor[r][c] = 1;
                solid[r][c] = true;
            }
        }
    }

    // lakes — a few water bodies scattered across the larger map
    const lakes = [
        { x: 19, y: 21, r: 6.5 },
        { x: W - 23, y: H - 27, r: 5.5 },
        { x: cx + 19, y: 28, r: 4.2 },
        { x: 24, y: H - 22, r: 4 },
    ];
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            for (const lk of lakes) {
                if (Math.hypot(c - lk.x, r - lk.y) < lk.r) {
                    ground[r][c] = 2;
                    decor[r][c] = 0;
                    solid[r][c] = true;
                    break;
                }
            }
        }
    }

    // scatter: trees clump into woods (denser where the coarse field is high)
    // with open clearings between, plus walkable bushes — alive but roamable.
    for (let r = 4; r < H - 4; r++) {
        for (let c = 4; c < W - 4; c++) {
            if (ground[r][c] === 2 || decor[r][c]) continue;
            const forest = h2(c >> 3, r >> 3) * 0.62 + h2(c >> 2, r >> 2) * 0.38;
            const treeChance = forest > 0.6 ? 0.18 : 0.022;
            const v = rand();
            if (v < treeChance) {
                decor[r][c] = 1; // tree (solid)
                solid[r][c] = true;
            } else if (v < treeChance + 0.075) {
                decor[r][c] = 2; // bush (walkable)
            }
        }
    }

    const clear = (x: number, y: number, rad: number) => {
        for (let r = y - rad; r <= y + rad; r++) {
            for (let c = x - rad; c <= x + rad; c++) {
                if (!inB(c, r)) continue;
                if (ground[r][c] === 2) continue; // keep lake
                decor[r][c] = 0;
                solid[r][c] = false;
            }
        }
    };

    const carvePath = (x0: number, y0: number, x1: number, y1: number) => {
        let x = x0;
        let y = y0;
        const lay = () => {
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    const c = x + dx;
                    const r = y + dy;
                    if (!inB(c, r) || ground[r][c] === 2) continue;
                    ground[r][c] = 1;
                    decor[r][c] = 0;
                    solid[r][c] = false;
                }
            }
        };
        while (x !== x1) {
            x += x1 > x ? 1 : -1;
            lay();
        }
        while (y !== y1) {
            y += y1 > y ? 1 : -1;
            lay();
        }
    };

    // clear + connect every POI to the hut
    for (const p of pois) clear(p.x, p.y, p.type === 'hut' ? 3 : 2);
    for (const p of pois) {
        if (p.id === 'hut') continue;
        carvePath(cx, cy, p.x, p.y);
    }

    // hut footprint solid (3 wide x 2 tall), door (south-centre) stays open
    for (let r = cy - 1; r <= cy; r++) {
        for (let c = cx - 1; c <= cx + 1; c++) {
            if (inB(c, r)) solid[r][c] = true;
        }
    }

    // NPCs block their own tile
    for (const p of pois) if (p.type === 'npc' && inB(p.x, p.y)) solid[p.y][p.x] = true;

    cached = { width: W, height: H, ground, decor, solid, pois, spawn: { x: cx, y: cy + 3 } };
    return cached;
}

// ============================================================
//  PICKUPS — essence/ore motes scattered across the open map so
//  the wide mid-regions reward roaming. Deterministic (same for
//  everyone), placed only on walkable grass away from POIs.
//  Collected ids persist in character.discovered so they don't
//  respawn. iron is common, copper uncommon, cosmic rare.
// ============================================================

export type MaterialKind = 'iron' | 'copper' | 'cosmic';
export type PickupKind = MaterialKind | 'health';
export interface Pickup {
    id: string;
    x: number; // tile col
    y: number; // tile row
    kind: PickupKind;
    qty: number;
}

let cachedPickups: Pickup[] | null = null;

export function buildPickups(): Pickup[] {
    if (cachedPickups) return cachedPickups;
    const ow = buildOverworld();
    const rand = mulberry32(99001);
    const out: Pickup[] = [];
    const tooCloseToPoi = (c: number, r: number) =>
        ow.pois.some((p) => Math.hypot(p.x - c, p.y - r) < 6);

    for (let r = 4; r < MAP_H - 4; r++) {
        for (let c = 4; c < MAP_W - 4; c++) {
            // only on open, walkable grass (not water/dirt/path/tree/solid)
            if (ow.ground[r][c] !== 0 || ow.solid[r][c] || ow.decor[r][c] === 1) continue;
            if (tooCloseToPoi(c, r)) continue;
            if (rand() > 0.014) continue;
            // keep them spread out — skip if one is already within 4 tiles
            if (out.some((p) => Math.hypot(p.x - c, p.y - r) < 4)) continue;
            const roll = rand();
            if (roll < 0.08) {
                out.push({ id: `health_${c}_${r}`, x: c, y: r, kind: 'health', qty: 20 });
                continue;
            }
            const matRoll = rand();
            const kind: MaterialKind = matRoll < 0.6 ? 'iron' : matRoll < 0.88 ? 'copper' : 'cosmic';
            const qty = kind === 'iron' ? (rand() < 0.35 ? 2 : 1) : 1;
            out.push({ id: `ore_${c}_${r}`, x: c, y: r, kind, qty });
        }
    }
    cachedPickups = out;
    return out;
}
