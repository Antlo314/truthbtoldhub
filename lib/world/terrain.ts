/**
 * The Aether Plain — the land the Lair stands on.
 *
 * One analytic function describes the ground: `heightAt(x, z)`. Everything
 * reads it — the terrain meshes, the walker, the grass, every creature and
 * prop placement — so nothing can float or sink. The plain shares the
 * Lair's coordinates (the Sanctum's centre is 0,0; the Overlook door opens
 * south at z ≈ 62.5), which is what lets you walk out of the house onto it.
 *
 * It is a sky-island: a disc of land that falls away into the cloud sea
 * past ISLAND_R. Regions, roads and the lake are placed by hand below;
 * the rolling ground between them is noise.
 */

export const ISLAND_C = { x: 0, z: 110 } as const;
export const ISLAND_R = 400;
/** Past this you cannot walk (the rim crumbles) */
export const WALK_R = 378;
export const WATER_Y = -1.6;

/* ── noise ──────────────────────────────────────────────────── */

function hash2(x: number, z: number): number {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return s - Math.floor(s);
}
function smooth(t: number) {
    return t * t * (3 - 2 * t);
}
/** Value noise in [0,1] */
export function vnoise(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = hash2(ix, iz);
    const b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1);
    const d = hash2(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
/** fbm in [-1,1]-ish */
export function fbm(x: number, z: number, octaves = 4): number {
    let v = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
        v += (vnoise(x * f, z * f) * 2 - 1) * amp;
        amp *= 0.5;
        f *= 2.03;
    }
    return v;
}

/* ── places ─────────────────────────────────────────────────── */

export type PlaceId = 'gate' | 'crossroads' | 'lake' | 'rise' | 'fields' | 'circle' | 'hollow' | 'pier' | 'summit' | 'cairns';

export type Landmark = {
    id: PlaceId;
    name: string;
    x: number;
    z: number;
    /** within this you are "there" */
    r: number;
    blurb: string;
};

export const LANDMARKS: Landmark[] = [
    { id: 'gate', name: 'The Lair Gate', x: 0, z: 68, r: 12, blurb: 'The door back into the house.' },
    { id: 'crossroads', name: 'The Crossroads', x: 0, z: 160, r: 16, blurb: 'Every road on the plain meets here.' },
    { id: 'lake', name: 'The Still Water', x: -170, z: 190, r: 95, blurb: 'A lake that does not ripple unless you do.' },
    { id: 'pier', name: 'The Old Pier', x: -108, z: 175, r: 14, blurb: 'Boards over the still water.' },
    { id: 'rise', name: 'The Rise', x: 150, z: 260, r: 80, blurb: 'The one hill. You can see the whole plain from it.' },
    { id: 'summit', name: 'The Summit Shrine', x: 150, z: 260, r: 14, blurb: 'A ring of stones at the top of the Rise.' },
    { id: 'cairns', name: 'The Four Cairns', x: 150, z: 260, r: 60, blurb: 'Four stone markers on the shoulders of the Rise.' },
    { id: 'fields', name: 'The Wildflower Fields', x: 0, z: 300, r: 90, blurb: 'Colour to the horizon.' },
    { id: 'circle', name: 'The Stone Circle', x: -200, z: 50, r: 40, blurb: 'Older than the Lair. Nobody remembers who raised it.' },
    { id: 'hollow', name: 'Pine Hollow', x: 10, z: -120, r: 90, blurb: 'Dark trees north of the house. Things glow in there.' },
];

export const landmark = (id: PlaceId) => LANDMARKS.find((l) => l.id === id)!;

/** The lake: a basin around this point, water at WATER_Y */
export const LAKE = { x: -170, z: 190, r: 72 } as const;
/** The Rise: a gaussian hill */
export const RISE = { x: 150, z: 260, r: 95, h: 30 } as const;

/** Roads — polylines; the ground is bare dirt within ROAD_W of them */
export const ROADS: [number, number][][] = [
    // gate → crossroads
    [[0, 66], [0, 110], [0, 160]],
    // crossroads → the pier on the lake
    [[0, 160], [-50, 168], [-96, 172], [-104, 174]],
    // crossroads → the foot of the Rise, winding up to the summit
    [[0, 160], [50, 185], [92, 215], [118, 238], [138, 252], [150, 260]],
    // crossroads → the fields
    [[0, 160], [6, 220], [0, 300]],
    // gate → around the Lair's east side → Pine Hollow
    [[0, 66], [34, 70], [44, 20], [40, -40], [16, -90], [10, -120]],
    // stone circle spur from the lake road
    [[-96, 172], [-150, 120], [-190, 70], [-200, 50]],
];
export const ROAD_W = 3.2;

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
    const vx = bx - ax;
    const vz = bz - az;
    const wx = px - ax;
    const wz = pz - az;
    const l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / l2));
    return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/** Distance to the nearest road centreline */
export function roadDist(x: number, z: number): number {
    let best = Infinity;
    for (const road of ROADS) {
        for (let i = 0; i + 1 < road.length; i++) {
            const d = segDist(x, z, road[i][0], road[i][1], road[i + 1][0], road[i + 1][1]);
            if (d < best) best = d;
        }
    }
    return best;
}

/* ── the Lair's footprint ───────────────────────────────────── */

/** The house, with a skirt of flat ground around it */
export const LAIR_BOX = { x0: -30, z0: -26, x1: 30, z1: 66 } as const;
export const LAIR_SKIRT = 10;

export function inLairBox(x: number, z: number, pad = 0): boolean {
    return x > LAIR_BOX.x0 - pad && x < LAIR_BOX.x1 + pad && z > LAIR_BOX.z0 - pad && z < LAIR_BOX.z1 + pad;
}

/** 0 at the Lair, 1 well clear of it — used to flatten the ground under the house */
function lairMask(x: number, z: number): number {
    const dx = Math.max(LAIR_BOX.x0 - x, 0, x - LAIR_BOX.x1);
    const dz = Math.max(LAIR_BOX.z0 - z, 0, z - LAIR_BOX.z1);
    const d = Math.hypot(dx, dz);
    const t = Math.min(1, d / 28);
    return smooth(t);
}

/* ── height ─────────────────────────────────────────────────── */

export function distToIsland(x: number, z: number): number {
    return Math.hypot(x - ISLAND_C.x, z - ISLAND_C.z);
}

/**
 * Ground height in metres. Rolling meadow (±5 m), the Rise, the lake basin,
 * flat ground under the house and a gentle flattening along the roads, then
 * the rim: past ISLAND_R the land plunges into the clouds.
 */
export function heightAt(x: number, z: number): number {
    // roads follow the land's long shape but lose its small bumps, and sit
    // a hand lower — never a trench (scaling the whole height cut 9 m into the Rise)
    const rd = roadDist(x, z);
    const onRoad = rd < ROAD_W + 2 ? 1 - Math.min(1, rd / (ROAD_W + 2)) : 0;
    let h = fbm(x / 110, z / 110, 4) * 5.2 + fbm(x / 23, z / 23, 2) * 0.55 * (1 - onRoad);
    // the Rise
    const dr = Math.hypot(x - RISE.x, z - RISE.z) / RISE.r;
    if (dr < 1.6) h += RISE.h * Math.exp(-dr * dr * 2.2);
    // the lake basin
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r;
    if (dl < 1.5) h -= 9 * Math.exp(-dl * dl * 1.6);
    // flat under the house
    h *= lairMask(x, z);
    if (rd < ROAD_W) h -= 0.08 * (1 - rd / ROAD_W);
    // the rim
    const di = distToIsland(x, z);
    if (di > ISLAND_R - 30) {
        const t = Math.min(1, (di - (ISLAND_R - 30)) / 60);
        h -= t * t * 70;
    }
    return h;
}

/** Surface normal from finite differences */
export function normalAt(x: number, z: number, out: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }) {
    const e = 0.6;
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    const nx = -hx;
    const ny = 2 * e;
    const nz = -hz;
    const l = Math.hypot(nx, ny, nz) || 1;
    out.x = nx / l;
    out.y = ny / l;
    out.z = nz / l;
    return out;
}

/** 0 flat … 1 vertical */
export function slopeAt(x: number, z: number): number {
    const n = normalAt(x, z);
    return 1 - n.y;
}

export function isWater(x: number, z: number, margin = 0): boolean {
    return heightAt(x, z) < WATER_Y - margin;
}

/* ── regions ────────────────────────────────────────────────── */

export type Region = 'meadow' | 'hollow' | 'lake' | 'rise' | 'fields' | 'circle' | 'rim';

export function regionAt(x: number, z: number): Region {
    if (distToIsland(x, z) > ISLAND_R - 40) return 'rim';
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 30) return 'lake';
    if (Math.hypot(x - RISE.x, z - RISE.z) < RISE.r) return 'rise';
    if (z < -50 && Math.abs(x - 10) < 130) return 'hollow';
    if (z > 240 && Math.abs(x) < 110) return 'fields';
    if (Math.hypot(x + 200, z - 50) < 45) return 'circle';
    return 'meadow';
}

/** Name of where you stand (nearest landmark you are inside, else the region) */
export function placeAt(x: number, z: number): { id: string; name: string } {
    let best: Landmark | null = null;
    let bestD = Infinity;
    for (const l of LANDMARKS) {
        const d = Math.hypot(x - l.x, z - l.z);
        if (d < l.r && d / l.r < bestD) {
            bestD = d / l.r;
            best = l;
        }
    }
    if (best) return { id: best.id, name: best.name };
    const r = regionAt(x, z);
    const names: Record<Region, string> = {
        meadow: 'The Aether Plain',
        hollow: 'Pine Hollow',
        lake: 'The Lakeshore',
        rise: 'The Rise',
        fields: 'The Wildflower Fields',
        circle: 'The Stone Circle',
        rim: 'The Rim',
    };
    return { id: r, name: names[r] };
}

/* ── ground colour ──────────────────────────────────────────── */

/** Vertex colour for a point of ground, linear RGB 0..1 */
export function groundColor(x: number, z: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
    const h = heightAt(x, z);
    const s = slopeAt(x, z);
    const rd = roadDist(x, z);
    const reg = regionAt(x, z);
    const n = vnoise(x / 9, z / 9);
    // base grass by region
    let r = 0.2;
    let g = 0.42;
    let b = 0.12;
    if (reg === 'hollow') {
        r = 0.12;
        g = 0.28;
        b = 0.1;
    } else if (reg === 'fields') {
        r = 0.26;
        g = 0.46;
        b = 0.14;
    } else if (reg === 'rise') {
        r = 0.24;
        g = 0.4;
        b = 0.13;
    } else if (reg === 'circle') {
        r = 0.22;
        g = 0.36;
        b = 0.14;
    }
    // noise variety
    const k = 0.85 + n * 0.3;
    r *= k;
    g *= k;
    b *= k;
    // steep → rock; high → paler; low → damp dark
    const rock = Math.min(1, Math.max(0, (s - 0.22) / 0.25));
    r = r + (0.36 - r) * rock;
    g = g + (0.33 - g) * rock;
    b = b + (0.3 - b) * rock;
    if (h > 14) {
        const t = Math.min(1, (h - 14) / 16);
        r += (0.42 - r) * t * 0.6;
        g += (0.4 - g) * t * 0.6;
        b += (0.3 - b) * t * 0.6;
    }
    // shore sand and lake bed
    if (h < WATER_Y + 1.2) {
        const t = Math.min(1, (WATER_Y + 1.2 - h) / 2.2);
        r += (0.5 - r) * t;
        g += (0.44 - g) * t;
        b += (0.3 - b) * t;
    }
    if (h < WATER_Y - 1) {
        const t = Math.min(1, (WATER_Y - 1 - h) / 5);
        r *= 1 - t * 0.5;
        g *= 1 - t * 0.45;
        b *= 1 - t * 0.3;
    }
    // road: packed earth with a soft shoulder
    if (rd < ROAD_W + 1.2) {
        const t = 1 - Math.min(1, Math.max(0, (rd - ROAD_W * 0.6) / (ROAD_W * 0.4 + 1.2)));
        r += (0.4 - r) * t;
        g += (0.3 - g) * t;
        b += (0.18 - b) * t;
    }
    // the rim darkens into basalt
    const di = distToIsland(x, z);
    if (di > ISLAND_R - 34) {
        const t = Math.min(1, (di - (ISLAND_R - 34)) / 30);
        r += (0.14 - r) * t;
        g += (0.12 - g) * t;
        b += (0.16 - b) * t;
    }
    out[0] = r;
    out[1] = g;
    out[2] = b;
    return out;
}

/** Can grass grow here? (not road, not water, not under the house, not rock) */
export function grassDensityAt(x: number, z: number): number {
    const h = heightAt(x, z);
    if (h < WATER_Y + 0.4) return 0;
    if (inLairBox(x, z, 2)) return 0;
    if (distToIsland(x, z) > ISLAND_R - 36) return 0;
    const rd = roadDist(x, z);
    let d = rd < ROAD_W ? 0 : rd < ROAD_W + 2.5 ? (rd - ROAD_W) / 2.5 : 1;
    const s = slopeAt(x, z);
    if (s > 0.3) d *= Math.max(0, 1 - (s - 0.3) / 0.15);
    const reg = regionAt(x, z);
    if (reg === 'hollow') d *= 0.55;
    if (reg === 'fields') d *= 1.15;
    return Math.min(1, d);
}
