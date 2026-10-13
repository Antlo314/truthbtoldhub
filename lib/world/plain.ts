/**
 * What stands on the plain — generated once, deterministically, from the
 * terrain. Trees, rocks, stones, flowers and mushrooms are scattered by
 * region with spacing rules; the solid ones go into a spatial hash the
 * walker and the creatures collide against. The pickups the quests ask
 * for, the four cairns and the shrine are placed by hand.
 *
 * Nothing here is random at runtime: two souls on the plain see the same
 * tree in the same place.
 */
import {
    heightAt,
    slopeAt,
    roadDist,
    ROAD_W,
    inLairBox,
    LAIR_SKIRT,
    distToIsland,
    ISLAND_R,
    WATER_Y,
    regionAt,
    isWater,
    LAKE,
    RISE,
    WALK_R,
    ISLAND_C,
    CIRCLE_C,
    PIER,
    WORLD_SCALE,
    sh,
    type Region,
} from './terrain';

export { PIER };

/** The plain shrank by WORLD_SCALE; scatter thins with its area */
const DENSITY = WORLD_SCALE * WORLD_SCALE * 1.08;
const at = (x: number, z: number) => {
    const [a, b] = sh(x, z);
    return { x: a, z: b };
};

/* ── seeded random ──────────────────────────────────────────── */

export function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ── props ──────────────────────────────────────────────────── */

export type PropKind =
    | 'oak'
    | 'tree'
    | 'treeFat'
    | 'treeDetailed'
    | 'pineTall'
    | 'pineRound'
    | 'pineSmall'
    | 'treeDark'
    | 'rockLarge'
    | 'rockTall'
    | 'stoneTall'
    | 'rockSmall'
    | 'bush'
    | 'bushLarge'
    | 'flowerRed'
    | 'flowerYellow'
    | 'flowerPurple'
    | 'flowersTall'
    | 'mushroomRed'
    | 'mushroomTan'
    | 'stump'
    | 'log'
    | 'lily'
    | 'reed';

export type PropDef = {
    kind: PropKind;
    /** public path */
    url: string;
    /** uniform scale applied to the GLB */
    scale: number;
    /** scale jitter ± */
    jitter: number;
    /** collision radius in metres (0 = walk through) */
    collide: number;
    /** sink into the ground a little so roots don't float on a slope */
    sink: number;
};

const NK = '/models/kenney/nature-kit';
const K = '/models/kenney';

export const PROP_DEFS: Record<PropKind, PropDef> = {
    oak: { kind: 'oak', url: `${K}/tree_oak.glb`, scale: 4.6, jitter: 0.9, collide: 0.7, sink: 0.08 },
    tree: { kind: 'tree', url: `${K}/tree_default.glb`, scale: 4.2, jitter: 0.8, collide: 0.6, sink: 0.08 },
    treeFat: { kind: 'treeFat', url: `${K}/tree_fat.glb`, scale: 4.8, jitter: 0.8, collide: 0.75, sink: 0.08 },
    treeDetailed: { kind: 'treeDetailed', url: `${K}/tree_detailed.glb`, scale: 4.4, jitter: 0.8, collide: 0.7, sink: 0.08 },
    pineTall: { kind: 'pineTall', url: `${NK}/tree_pineTallB.glb`, scale: 5.2, jitter: 1.2, collide: 0.55, sink: 0.1 },
    pineRound: { kind: 'pineRound', url: `${NK}/tree_pineRoundA.glb`, scale: 4.6, jitter: 1.0, collide: 0.6, sink: 0.1 },
    pineSmall: { kind: 'pineSmall', url: `${NK}/tree_pineSmallA.glb`, scale: 3.6, jitter: 0.8, collide: 0.4, sink: 0.08 },
    treeDark: { kind: 'treeDark', url: `${NK}/tree_thin_dark.glb`, scale: 4.4, jitter: 0.8, collide: 0.5, sink: 0.08 },
    rockLarge: { kind: 'rockLarge', url: `${NK}/rock_largeD.glb`, scale: 2.6, jitter: 0.9, collide: 1.3, sink: 0.25 },
    rockTall: { kind: 'rockTall', url: `${NK}/rock_tallA.glb`, scale: 2.8, jitter: 0.8, collide: 1.2, sink: 0.25 },
    stoneTall: { kind: 'stoneTall', url: `${NK}/stone_tallB.glb`, scale: 2.6, jitter: 0.6, collide: 1.0, sink: 0.25 },
    rockSmall: { kind: 'rockSmall', url: `${NK}/rock_smallD.glb`, scale: 2.0, jitter: 0.8, collide: 0, sink: 0.12 },
    bush: { kind: 'bush', url: `${K}/plant_bush.glb`, scale: 2.6, jitter: 0.8, collide: 0, sink: 0.05 },
    bushLarge: { kind: 'bushLarge', url: `${K}/plant_bushDetailed.glb`, scale: 2.8, jitter: 0.8, collide: 0, sink: 0.05 },
    flowerRed: { kind: 'flowerRed', url: `${K}/flower_redA.glb`, scale: 2.4, jitter: 0.6, collide: 0, sink: 0.02 },
    flowerYellow: { kind: 'flowerYellow', url: `${K}/flower_yellowA.glb`, scale: 2.4, jitter: 0.6, collide: 0, sink: 0.02 },
    flowerPurple: { kind: 'flowerPurple', url: `${K}/flower_purpleA.glb`, scale: 2.4, jitter: 0.6, collide: 0, sink: 0.02 },
    flowersTall: { kind: 'flowersTall', url: `${K}/platformer-kit/flowers-tall.glb`, scale: 1.8, jitter: 0.5, collide: 0, sink: 0.02 },
    mushroomRed: { kind: 'mushroomRed', url: `${NK}/mushroom_redGroup.glb`, scale: 2.2, jitter: 0.8, collide: 0, sink: 0.03 },
    mushroomTan: { kind: 'mushroomTan', url: `${NK}/mushroom_tanGroup.glb`, scale: 2.2, jitter: 0.8, collide: 0, sink: 0.03 },
    stump: { kind: 'stump', url: `${NK}/stump_old.glb`, scale: 2.8, jitter: 0.5, collide: 0.5, sink: 0.1 },
    log: { kind: 'log', url: `${NK}/log_large.glb`, scale: 2.6, jitter: 0.5, collide: 0.8, sink: 0.1 },
    lily: { kind: 'lily', url: `${NK}/lily_large.glb`, scale: 2.4, jitter: 0.8, collide: 0, sink: 0 },
    reed: { kind: 'reed', url: `${K}/platformer-kit/grass.glb`, scale: 2.6, jitter: 0.8, collide: 0, sink: 0.04 },
};

export type Prop = { kind: PropKind; x: number; y: number; z: number; yaw: number; s: number };

type Rule = {
    kind: PropKind;
    count: number;
    regions: Region[];
    /** minimum distance to any other prop with spacing */
    spacing: number;
    maxSlope: number;
    /** keep this far from a road centreline */
    road: number;
    /** only within this distance of a point (optional cluster) */
    near?: { x: number; z: number; r: number };
    /** allow in shallow water (lilies) */
    water?: 'only' | 'never';
};

const RULES: Rule[] = [
    // meadow trees — loose stands
    { kind: 'oak', count: 150, regions: ['meadow', 'fields', 'circle'], spacing: 7, maxSlope: 0.3, road: 5 },
    { kind: 'tree', count: 110, regions: ['meadow', 'fields'], spacing: 7, maxSlope: 0.3, road: 5 },
    { kind: 'treeFat', count: 60, regions: ['meadow', 'rise'], spacing: 8, maxSlope: 0.3, road: 5 },
    { kind: 'treeDetailed', count: 70, regions: ['meadow', 'lake'], spacing: 7, maxSlope: 0.3, road: 5 },
    // the hollow — dense pines
    { kind: 'pineTall', count: 260, regions: ['hollow'], spacing: 4.2, maxSlope: 0.35, road: 4 },
    { kind: 'pineRound', count: 140, regions: ['hollow'], spacing: 4.2, maxSlope: 0.35, road: 4 },
    { kind: 'pineSmall', count: 90, regions: ['hollow'], spacing: 3.2, maxSlope: 0.4, road: 3 },
    { kind: 'treeDark', count: 90, regions: ['hollow'], spacing: 4, maxSlope: 0.35, road: 4 },
    // pines on the Rise's shoulders
    { kind: 'pineRound', count: 70, regions: ['rise'], spacing: 6, maxSlope: 0.36, road: 5 },
    { kind: 'pineSmall', count: 40, regions: ['rise'], spacing: 4, maxSlope: 0.4, road: 4 },
    // rocks everywhere, more on slopes and the rim
    { kind: 'rockLarge', count: 120, regions: ['meadow', 'rise', 'lake', 'hollow', 'fields'], spacing: 6, maxSlope: 0.5, road: 4 },
    { kind: 'rockTall', count: 60, regions: ['rise', 'hollow', 'circle', 'meadow'], spacing: 6, maxSlope: 0.5, road: 4 },
    { kind: 'stoneTall', count: 40, regions: ['circle', 'rise', 'meadow'], spacing: 6, maxSlope: 0.5, road: 4 },
    { kind: 'rockSmall', count: 320, regions: ['meadow', 'rise', 'lake', 'hollow', 'fields', 'circle'], spacing: 2, maxSlope: 0.6, road: 2 },
    { kind: 'stump', count: 50, regions: ['hollow', 'meadow'], spacing: 4, maxSlope: 0.3, road: 3 },
    { kind: 'log', count: 40, regions: ['hollow', 'meadow', 'lake'], spacing: 4, maxSlope: 0.3, road: 3 },
    // undergrowth
    { kind: 'bush', count: 260, regions: ['meadow', 'lake', 'fields', 'rise', 'circle'], spacing: 2.2, maxSlope: 0.35, road: 2.5 },
    { kind: 'bushLarge', count: 120, regions: ['meadow', 'hollow', 'lake'], spacing: 2.6, maxSlope: 0.35, road: 2.5 },
    { kind: 'mushroomRed', count: 110, regions: ['hollow'], spacing: 1.6, maxSlope: 0.4, road: 1.5 },
    { kind: 'mushroomTan', count: 90, regions: ['hollow', 'meadow'], spacing: 1.6, maxSlope: 0.4, road: 1.5 },
    // the fields
    { kind: 'flowerRed', count: 260, regions: ['fields', 'meadow'], spacing: 1.2, maxSlope: 0.3, road: 1.5 },
    { kind: 'flowerYellow', count: 300, regions: ['fields', 'meadow'], spacing: 1.2, maxSlope: 0.3, road: 1.5 },
    { kind: 'flowerPurple', count: 260, regions: ['fields', 'meadow', 'circle'], spacing: 1.2, maxSlope: 0.3, road: 1.5 },
    { kind: 'flowersTall', count: 200, regions: ['fields'], spacing: 1.4, maxSlope: 0.3, road: 1.5 },
    // the lakeshore
    { kind: 'reed', count: 220, regions: ['lake'], spacing: 1.2, maxSlope: 0.4, road: 1.5, near: { x: LAKE.x, z: LAKE.z, r: LAKE.r + 14 } },
    { kind: 'lily', count: 90, regions: ['lake'], spacing: 1.6, maxSlope: 1, road: 0, water: 'only', near: { x: LAKE.x, z: LAKE.z, r: LAKE.r } },
];

/* ── spatial hash of solids ─────────────────────────────────── */

export type Obstacle = { x: number; z: number; r: number };

const CELL = 8;
const cellKey = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

class Hash {
    cells = new Map<string, Obstacle[]>();
    add(o: Obstacle) {
        const k = cellKey(o.x, o.z);
        const list = this.cells.get(k);
        if (list) list.push(o);
        else this.cells.set(k, [o]);
    }
    /** every obstacle whose cell touches the query circle */
    near(x: number, z: number, r: number, out: Obstacle[] = []): Obstacle[] {
        out.length = 0;
        const x0 = Math.floor((x - r) / CELL);
        const x1 = Math.floor((x + r) / CELL);
        const z0 = Math.floor((z - r) / CELL);
        const z1 = Math.floor((z + r) / CELL);
        for (let cx = x0; cx <= x1; cx++) {
            for (let cz = z0; cz <= z1; cz++) {
                const list = this.cells.get(`${cx},${cz}`);
                if (list) for (const o of list) out.push(o);
            }
        }
        return out;
    }
}

/* ── generation ─────────────────────────────────────────────── */

export type PlainData = {
    props: Prop[];
    byKind: Map<PropKind, Prop[]>;
    solids: Hash;
};

let cache: PlainData | null = null;

function tryPlace(r: () => number, rule: Rule, spacingHash: Hash, scratch: Obstacle[]): Prop | null {
    for (let attempt = 0; attempt < 12; attempt++) {
        let x: number;
        let z: number;
        if (rule.near) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * rule.near.r;
            x = rule.near.x + Math.cos(a) * d;
            z = rule.near.z + Math.sin(a) * d;
        } else {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * (ISLAND_R - 38);
            x = ISLAND_C.x + Math.cos(a) * d;
            z = ISLAND_C.z + Math.sin(a) * d;
        }
        if (distToIsland(x, z) > ISLAND_R - 36) continue;
        if (inLairBox(x, z, LAIR_SKIRT)) continue;
        if (!rule.regions.includes(regionAt(x, z))) continue;
        const water = isWater(x, z, -0.3);
        if (rule.water === 'only' ? !isWater(x, z, 0.3) || heightAt(x, z) < WATER_Y - 2.4 : water) continue;
        if (slopeAt(x, z) > rule.maxSlope) continue;
        if (rule.road > 0 && roadDist(x, z) < ROAD_W + rule.road) continue;
        // keep the summit shrine, the cairns and every NPC post clear
        if (Math.hypot(x - RISE.x, z - RISE.z) < 16) continue;
        if (clearings().some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
        const list = spacingHash.near(x, z, rule.spacing, scratch);
        let ok = true;
        for (const o of list) {
            if (Math.hypot(o.x - x, o.z - z) < Math.max(rule.spacing, o.r)) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;
        const def = PROP_DEFS[rule.kind];
        const s = def.scale + (r() * 2 - 1) * def.jitter;
        const y = (rule.water === 'only' ? WATER_Y + 0.02 : heightAt(x, z)) - def.sink * s;
        return { kind: rule.kind, x, y, z, yaw: r() * Math.PI * 2, s };
    }
    return null;
}

/** Places that must stay empty of scatter: every soul's post, the shrine, the pier, the circle, the crossroads */
let clearingCache: { x: number; z: number; r: number }[] | null = null;
function clearings() {
    if (clearingCache) return clearingCache;
    clearingCache = [
        ...NPCS.filter((n) => n.roam === 0).map((n) => ({ x: n.x, z: n.z, r: 7 })),
        { ...at(0, 160), r: 10 },
        { x: PIER.x, z: PIER.z, r: 10 },
        { x: RISE.x, z: RISE.z, r: 15 },
        { x: CIRCLE_C.x, z: CIRCLE_C.z, r: 18 },
    ];
    return clearingCache;
}

export function plainData(): PlainData {
    if (cache) return cache;
    const r = rng(0x5eed7a1e);
    const props: Prop[] = [];
    const byKind = new Map<PropKind, Prop[]>();
    const spacing = new Hash();
    const solids = new Hash();
    const scratch: Obstacle[] = [];
    for (const rule of RULES) {
        for (let i = 0; i < Math.round(rule.count * DENSITY); i++) {
            const p = tryPlace(r, rule, spacing, scratch);
            if (!p) continue;
            props.push(p);
            const list = byKind.get(p.kind);
            if (list) list.push(p);
            else byKind.set(p.kind, [p]);
            spacing.add({ x: p.x, z: p.z, r: rule.spacing });
            const def = PROP_DEFS[p.kind];
            if (def.collide > 0) solids.add({ x: p.x, z: p.z, r: def.collide * (p.s / def.scale) });
        }
    }
    // the stone circle: twelve standing stones and an altar
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = CIRCLE_C.x + Math.cos(a) * 13;
        const z = CIRCLE_C.z + Math.sin(a) * 13;
        const p: Prop = { kind: 'stoneTall', x, y: heightAt(x, z) - 0.4, z, yaw: -a, s: 3.4 + (i % 3) * 0.3 };
        props.push(p);
        (byKind.get('stoneTall') ?? byKind.set('stoneTall', []).get('stoneTall')!).push(p);
        solids.add({ x, z, r: 1.1 });
    }
    // the four cairns on the Rise
    for (const c of CAIRNS) {
        const p: Prop = { kind: 'rockTall', x: c.x, y: heightAt(c.x, c.z) - 0.3, z: c.z, yaw: 0, s: 2.2 };
        props.push(p);
        (byKind.get('rockTall') ?? byKind.set('rockTall', []).get('rockTall')!).push(p);
        solids.add({ x: c.x, z: c.z, r: 0.9 });
    }
    // the summit shrine: seven stones and the altar (PlainFixtures draws them)
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        solids.add({ x: RISE.x + Math.cos(a) * 6, z: RISE.z + Math.sin(a) * 6, r: 0.7 });
    }
    solids.add({ x: RISE.x, z: RISE.z, r: 1.05 });
    for (const o of fixtureSolids()) solids.add(o);
    cache = { props, byKind, solids };
    return cache;
}

/* ── the pier ───────────────────────────────────────────────── */

/** Is this point on the pier's boards? */
export function onPier(x: number, z: number): boolean {
    const dx = x - PIER.x;
    const dz = z - PIER.z;
    // local frame: +z along the pier (sin yaw, cos yaw), +x across it
    const s = Math.sin(PIER.yaw);
    const c = Math.cos(PIER.yaw);
    const along = dx * s + dz * c;
    const across = dx * c - dz * s;
    return along > -1 && along < PIER.len && Math.abs(across) < PIER.w / 2 - 0.15;
}

/** Where feet land: the ground, or the pier's boards above the water */
export function groundAt(x: number, z: number): number {
    const h = heightAt(x, z);
    return onPier(x, z) ? Math.max(h, PIER.deckY) : h;
}

/* ── collision ──────────────────────────────────────────────── */

export const PLAYER_R = 0.34;
const scratchNear: Obstacle[] = [];

/** Can a body of radius r stand here? */
export function walkableAt(x: number, z: number, r = PLAYER_R): boolean {
    if (distToIsland(x, z) > WALK_R) return false;
    if (onPier(x, z)) return true;
    // the house is solid from outside; its door is the one way in
    if (inLairBox(x, z, 0.4) && !(z > 62 && Math.abs(x) < 3.2)) return false;
    // you can wade, not swim
    if (heightAt(x, z) < WATER_Y - 1.1) return false;
    const list = plainData().solids.near(x, z, r + 2, scratchNear);
    for (const o of list) {
        if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false;
    }
    return true;
}

export function moveOnPlain(fromX: number, fromZ: number, toX: number, toZ: number, r = PLAYER_R): { x: number; z: number } {
    if (walkableAt(toX, toZ, r)) return { x: toX, z: toZ };
    if (walkableAt(toX, fromZ, r)) return { x: toX, z: fromZ };
    if (walkableAt(fromX, toZ, r)) return { x: fromX, z: toZ };
    return { x: fromX, z: fromZ };
}

/* ── the hand-placed things ─────────────────────────────────── */

/** On the Rise's shoulders, north, east, south, west of the summit */
export const CAIRNS = [
    { id: 'cairn_n', x: RISE.x, z: RISE.z - 38 },
    { id: 'cairn_e', x: RISE.x + 37, z: RISE.z + 2 },
    { id: 'cairn_s', x: RISE.x - 2, z: RISE.z + 37 },
    { id: 'cairn_w', x: RISE.x - 36, z: RISE.z - 2 },
] as const;

export type PickupKind = 'mote' | 'lily' | 'ember' | 'scroll';

export type Pickup = { id: string; kind: PickupKind; x: number; z: number };

/** Lift above the ground each pickup hovers */
export const PICKUP_LIFT: Record<PickupKind, number> = { mote: 1.0, lily: 0.3, ember: 0.45, scroll: 0.9 };

function ring(prefix: string, kind: PickupKind, cx: number, cz: number, r: number, n: number, seed: number): Pickup[] {
    const g = rng(seed);
    const out: Pickup[] = [];
    let i = 0;
    let guard = 0;
    while (i < n && guard++ < 200) {
        const a = g() * Math.PI * 2;
        const d = r * (0.35 + 0.65 * Math.sqrt(g()));
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        if (kind === 'lily' ? !isWater(x, z, 0.2) || heightAt(x, z) < WATER_Y - 1.0 : isWater(x, z)) continue;
        if (inLairBox(x, z, 4) || !walkableAt(x, z, 0.5)) continue;
        out.push({ id: `${prefix}_${i}`, kind, x, z });
        i++;
    }
    return out;
}

let pickupCache: Pickup[] | null = null;
export function pickups(): Pickup[] {
    if (pickupCache) return pickupCache;
    pickupCache = [
        ...ring('mote', 'mote', at(0, 130).x, at(0, 130).z, 48, 9, 0x1a2b3c),
        ...ring('lily', 'lily', LAKE.x, LAKE.z, LAKE.r - 5, 10, 0x4d5e6f),
        ...ring('ember', 'ember', at(10, -120).x, at(10, -120).z, 44, 11, 0x7a8b9c),
        { id: 'scroll_summit', kind: 'scroll', x: RISE.x, z: RISE.z - 2 },
    ];
    return pickupCache;
}

export const PICKUP_LABEL: Record<PickupKind, string> = {
    mote: 'Light mote',
    lily: 'Still-water lily',
    ember: 'Glowing ember',
    scroll: 'The Summit Scroll',
};

/* ── NPCs ───────────────────────────────────────────────────── */

export type NpcId =
    | 'truth'
    | 'hana'
    | 'eli'
    | 'keeper'
    | 'lanternkeeper'
    | 'scribe'
    | 'lydia'
    | 'bartimaeus'
    | 'widow'
    | 'asa'
    | 'wanderer1'
    | 'wanderer2'
    | 'wanderer3'
    | 'wanderer4';

/** What a soul is for: quests, trade, or the alms Matthew 6 asks of you */
export type NpcRole = 'guide' | 'quest' | 'merchant' | 'poor' | 'walker';

export type Npc = {
    id: NpcId;
    name: string;
    title: string;
    role: NpcRole;
    /** home post */
    x: number;
    z: number;
    /** facing yaw at the post */
    yaw: number;
    /** wander radius (0 = stands) */
    roam: number;
    /** sits at the post (on a stone) */
    seated?: boolean;
    /** wire-format wardrobe (vesselLook) */
    wear: { build: 'masc' | 'fem'; skin: number; hair: number; top: number; bottom: number; boots: number; hs: 'buzzed' | 'parted' | 'buns' | 'long' | 'none'; of: 'peasant' | 'ranger'; hd: 0 | 1; bd: 0 | 1 };
    /** extra features the vessel kit lacks — built procedurally */
    look?: { locs?: boolean };
    aura: string;
    /** lines said when there is no quest business */
    idle: string[];
};

type RawNpc = Omit<Npc, 'x' | 'z'> & { x: number; z: number };

const RAW_NPCS: RawNpc[] = [
    {
        // Truth: a Black man in his thirties, locs to the shoulder, a short beard
        id: 'truth', name: 'Truth', title: 'The Guide', role: 'guide', x: 4, z: 70, yaw: Math.PI, roam: 0,
        wear: { build: 'masc', skin: 9, hair: 0, top: 3, bottom: 6, boots: 1, hs: 'none', of: 'ranger', hd: 0, bd: 1 },
        look: { locs: true },
        aura: '#fbbf24',
        idle: ['The plain is wide. Walk it; it will not walk itself.', 'Every road out there comes back to this door.', 'Pray in secret. Fast in secret. Give in secret. That is where the strength comes from.'],
    },
    {
        id: 'hana', name: 'Hana', title: 'The Gatherer', role: 'quest', x: 0, z: 0, yaw: Math.PI / 2, roam: 0,
        wear: { build: 'fem', skin: 3, hair: 2, top: 4, bottom: 1, boots: 2, hs: 'long', of: 'peasant', hd: 0, bd: 0 }, aura: '#34d399',
        idle: ['The water only shows you what you bring to it.', 'Consider the lilies. They toil not, and still they are clothed.'],
    },
    {
        id: 'eli', name: 'Eli', title: 'The Shepherd', role: 'quest', x: 12, z: 290, yaw: -Math.PI * 0.3, roam: 0,
        wear: { build: 'masc', skin: 5, hair: 1, top: 0, bottom: 6, boots: 0, hs: 'buzzed', of: 'peasant', hd: 0, bd: 1 }, aura: '#a78bfa',
        idle: ['The herds come down from the Rise at dusk. Stand still and they pass right by you.', 'Wolves come out of the hollow after dark. Keep your staff close.'],
    },
    {
        id: 'keeper', name: 'The Keeper', title: 'Of the Circle', role: 'quest', x: -200, z: 32, yaw: 0, roam: 0,
        wear: { build: 'fem', skin: 6, hair: 4, top: 5, bottom: 5, boots: 3, hs: 'buns', of: 'ranger', hd: 1, bd: 0 }, aura: '#22d3ee',
        idle: ['Twelve stones. They were here before the house, and they will be here after.', 'Stillness is not nothing. It is the hardest thing you will do today.'],
    },
    {
        id: 'lanternkeeper', name: 'Ama', title: 'The Lantern-keeper', role: 'quest', x: 12, z: -116, yaw: Math.PI, roam: 0,
        wear: { build: 'fem', skin: 2, hair: 0, top: 2, bottom: 3, boots: 1, hs: 'parted', of: 'peasant', hd: 0, bd: 0 }, aura: '#f97316',
        idle: ['The hollow is dark on purpose. Light is only light where it is dark.', 'If the light that is in thee be darkness, how great is that darkness.'],
    },
    {
        id: 'scribe', name: 'Obed', title: 'The Scribe', role: 'quest', x: 154, z: 266, yaw: Math.PI * 1.2, roam: 0,
        wear: { build: 'masc', skin: 4, hair: 3, top: 1, bottom: 2, boots: 4, hs: 'parted', of: 'ranger', hd: 0, bd: 0 }, aura: '#60a5fa',
        idle: ['From up here you can see every road at once. Down there you only ever see one.', 'A word carried is worth ten kept.'],
    },
    {
        id: 'lydia', name: 'Lydia', title: 'Seller of purple', role: 'merchant', x: 11, z: 154, yaw: -Math.PI / 2, roam: 0,
        wear: { build: 'fem', skin: 7, hair: 1, top: 6, bottom: 4, boots: 2, hs: 'buns', of: 'ranger', hd: 0, bd: 0 }, aura: '#c084fc',
        idle: ['Bread, fish, oil, water — and better staves than the one you carry.', 'Pelts and gel I will buy. Bring them to me before they spoil.'],
    },
    {
        id: 'bartimaeus', name: 'Bartimaeus', title: 'Blind, by the road', role: 'poor', x: -6, z: 112, yaw: Math.PI / 2, roam: 0, seated: true,
        wear: { build: 'masc', skin: 8, hair: 8, top: 7, bottom: 7, boots: 0, hs: 'buzzed', of: 'peasant', hd: 1, bd: 1 }, aura: '#94a3b8',
        idle: ['I hear you on the road. Most walk past.', 'Have mercy. Anything at all.'],
    },
    {
        id: 'widow', name: 'Ruth', title: 'A widow, by the water', role: 'poor', x: -84, z: 162, yaw: 0, roam: 0, seated: true,
        wear: { build: 'fem', skin: 5, hair: 7, top: 7, bottom: 7, boots: 0, hs: 'buns', of: 'peasant', hd: 1, bd: 0 }, aura: '#94a3b8',
        idle: ['Two mites I had once. I gave them both.', 'The water is kind. People less so.'],
    },
    {
        id: 'asa', name: 'Asa', title: 'Outside the camp', role: 'poor', x: 44, z: -40, yaw: -Math.PI / 2, roam: 0, seated: true,
        wear: { build: 'masc', skin: 3, hair: 2, top: 7, bottom: 7, boots: 0, hs: 'long', of: 'peasant', hd: 1, bd: 1 }, aura: '#94a3b8',
        idle: ['Do not come too close. Or come. Nobody else does.', 'The lantern-keeper leaves bread sometimes.'],
    },
    { id: 'wanderer1', name: 'Micah', title: 'A walker', role: 'walker', x: 40, z: 140, yaw: 0, roam: 48, wear: { build: 'masc', skin: 2, hair: 1, top: 6, bottom: 0, boots: 2, hs: 'parted', of: 'peasant', hd: 0, bd: 0 }, aura: '#f472b6', idle: ['Peace, soul.', 'Have you been up the Rise yet? Go at dusk.'] },
    { id: 'wanderer2', name: 'Naomi', title: 'A walker', role: 'walker', x: -60, z: 210, yaw: 0, roam: 56, wear: { build: 'fem', skin: 0, hair: 3, top: 3, bottom: 4, boots: 0, hs: 'long', of: 'peasant', hd: 0, bd: 0 }, aura: '#fde68a', idle: ['The lake is colder than it looks.', 'Slimes come up out of the mire when it rains. Mind your feet.'] },
    { id: 'wanderer3', name: 'Jude', title: 'A walker', role: 'walker', x: 90, z: 230, yaw: 0, roam: 40, wear: { build: 'masc', skin: 6, hair: 0, top: 5, bottom: 1, boots: 3, hs: 'buzzed', of: 'ranger', hd: 0, bd: 1 }, aura: '#34d399', idle: ['Four cairns. I only ever found three.', 'Pray before you go into the hollow. I mean it.'] },
    { id: 'wanderer4', name: 'Tirzah', title: 'A walker', role: 'walker', x: -30, z: 100, yaw: 0, roam: 40, wear: { build: 'fem', skin: 5, hair: 2, top: 0, bottom: 6, boots: 1, hs: 'buns', of: 'peasant', hd: 0, bd: 0 }, aura: '#a78bfa', idle: ['Truth sent me out here a month ago. I never went back in.', 'Sit by the water a while. It helps.'] },
];

/** Hana keeps the pier's land end; everyone else is pulled in with the shrunk plain */
export const NPCS: Npc[] = RAW_NPCS.map((n) => {
    if (n.id === 'hana') {
        const s = Math.sin(PIER.yaw);
        const c = Math.cos(PIER.yaw);
        // a few steps back from the boards, to the side of the walkway
        return { ...n, x: PIER.x - s * 4 + c * 2.4, z: PIER.z - c * 4 - s * 2.4, yaw: PIER.yaw + Math.PI };
    }
    if (n.id === 'truth') return n; // at the gate, which did not move
    // the scribe keeps the summit, just outside the shrine's ring of stones
    if (n.id === 'scribe') return { ...n, x: RISE.x + 7.5, z: RISE.z + 6.5 };
    const [x, z] = sh(n.x, n.z);
    return { ...n, x, z, roam: n.roam };
});

export const npc = (id: NpcId) => NPCS.find((n) => n.id === id)!;

/* ── signposts, the pier, the shrine ────────────────────────── */

export type Fixture =
    | { kind: 'signpost'; x: number; z: number; yaw: number }
    | { kind: 'pier'; x: number; z: number; yaw: number }
    | { kind: 'shrine'; x: number; z: number }
    | { kind: 'lantern'; x: number; z: number }
    | { kind: 'campfire'; x: number; z: number }
    | { kind: 'tent'; x: number; z: number; yaw: number }
    | { kind: 'stall'; x: number; z: number; yaw: number }
    | { kind: 'seat'; x: number; z: number };

const crossroads = at(0, 160);
const fieldsCamp = at(16, 294);

export const FIXTURES: Fixture[] = [
    { kind: 'signpost', x: crossroads.x + 3, z: crossroads.z, yaw: 0.4 },
    { kind: 'signpost', ...at(-3, 96), yaw: -0.2 },
    { kind: 'signpost', ...at(42, 24), yaw: 1.4 },
    { kind: 'pier', x: PIER.x, z: PIER.z, yaw: PIER.yaw },
    { kind: 'shrine', x: RISE.x, z: RISE.z },
    { kind: 'lantern', x: 3.2, z: 66 },
    { kind: 'lantern', x: -3.2, z: 66 },
    { kind: 'lantern', ...at(10, -118) },
    { kind: 'lantern', x: PIER.x + 1.6, z: PIER.z + 1.6 },
    { kind: 'lantern', x: crossroads.x, z: crossroads.z - 2 },
    { kind: 'campfire', ...fieldsCamp },
    { kind: 'tent', x: fieldsCamp.x + 4, z: fieldsCamp.z + 4, yaw: -1.2 },
    { kind: 'campfire', ...at(-62, 214) },
    // Lydia's stall behind her at the crossroads
    { kind: 'stall', x: npc('lydia').x + 1.8, z: npc('lydia').z, yaw: -Math.PI / 2 },
    // stones the poor sit on
    ...NPCS.filter((n) => n.seated).map((n) => ({ kind: 'seat' as const, x: n.x, z: n.z })),
];

/** Where a stall or a seat stands, the walker cannot */
export function fixtureSolids(): Obstacle[] {
    return FIXTURES.filter((f) => f.kind === 'stall').map((f) => ({ x: f.x, z: f.z, r: 1.1 }));
}
