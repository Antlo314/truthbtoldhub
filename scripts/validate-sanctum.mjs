/**
 * Lair plan validator — run it after touching homeMap / shardSites /
 * worldPads / the prop manifest.
 *
 *   node --experimental-strip-types scripts/validate-sanctum.mjs
 *
 * Everything is checked against the SAME functions the walker uses and
 * the SAME model files the renderer draws, so a pass here means a pass
 * in the world:
 *
 *   1. DRAWN    — every model is measured from its GLB and sized by its
 *                 fit exactly as HouseProp sizes it. Drawn bigger than
 *                 its footprint fails (that is how a "1.4 m" bench came
 *                 out 5 m long); a footprint far bigger than the drawing
 *                 fails too (an invisible wall).
 *   2. APART    — no two footprints overlap (rectangles turned by their
 *                 yaw, circles for round things). A chair tucked under
 *                 its desk is one object.
 *   3. FLOOR    — every footprint sits wholly on floor: nothing pokes
 *                 through a wall.
 *   4. REACH    — a flood fill from the spawn reaches every station,
 *                 every shard, every spring and every chamber; a shard
 *                 hung high has a spring under it.
 *   5. RINGS    — station rings have floor inside them and do not
 *                 overlap each other.
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Matrix4, Vector3, Quaternion, Box3 } from 'three';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HOUSE = join(ROOT, 'components', 'truthos', 'house');
const PUBLIC = join(ROOT, 'public');
const DEPS = ['homeMap.ts', 'houseMap.ts', 'shardSites.ts', 'worldPads.ts', 'shardStore.ts', 'houseUiStore.ts'];

const tmp = mkdtempSync(join(tmpdir(), 'laircheck-'));
let plan, sites, pads;
try {
    for (const f of DEPS) {
        const src = readFileSync(join(HOUSE, f), 'utf8');
        writeFileSync(
            join(tmp, f),
            src
                .replace(/from '(\.\.?\/[^']+?)'/g, (m, spec) => (spec.endsWith('.ts') ? m : `from '${spec}.ts'`))
                // the stores pull zustand + renderQuality; the validator only needs data
                .replace(/^import .* from 'zustand';?$/m, 'const create = () => () => ({});')
                .replace(/^import type .* from '\.\/renderQuality\.ts';?$/m, ''),
        );
    }
    plan = await import(pathToFileURL(join(tmp, 'homeMap.ts')).href);
    sites = await import(pathToFileURL(join(tmp, 'shardSites.ts')).href);
    pads = await import(pathToFileURL(join(tmp, 'worldPads.ts')).href);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}

const { SOLIDS, solidWorld, solidYaw, walkable, onFloor, HOME_HOTSPOTS, INTRO, PLAYER_R, JUNGLE_BOUNDS } = plan;
const fail = [];
const n = (v) => Number(v).toFixed(2);

/* ── the prop manifest: key → GLB ── */
const propSrc = readFileSync(join(HOUSE, 'HouseProp.tsx'), 'utf8');
const manifest = propSrc.slice(propSrc.indexOf('HOUSE_MODELS'), propSrc.indexOf('function Model('));
const urlOf = new Map();
for (const m of manifest.matchAll(/^\s{4}(\w+)\s*:\s*kenney\(\s*'([^']+)'/gm)) urlOf.set(m[1], `/models/kenney/${m[2]}.glb`);
for (const m of manifest.matchAll(/^\s{4}(\w+)\s*:\s*kit\(\s*'([^']+)'\s*,\s*'([^']+)'/gm)) urlOf.set(m[1], `/models/kenney/${m[2]}/${m[3]}.glb`);
for (const m of manifest.matchAll(/^\s{4}(\w+)\s*:\s*\{[\s\S]*?url:\s*'([^']+)'/gm)) if (!urlOf.has(m[1])) urlOf.set(m[1], m[2]);

/* ── GLB native size: JSON chunk, accessor bounds through the node tree ── */
function readGlbJson(buf) {
    if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
    let off = 12;
    while (off < buf.length) {
        const len = buf.readUInt32LE(off);
        const type = buf.readUInt32LE(off + 4);
        const start = off + 8;
        if (type === 0x4e4f534a) return JSON.parse(buf.slice(start, start + len).toString('utf8'));
        off = start + len + ((4 - (len % 4)) % 4);
    }
    throw new Error('no JSON chunk');
}
function nodeMatrix(nd) {
    if (nd.matrix) return new Matrix4().fromArray(nd.matrix);
    return new Matrix4().compose(
        new Vector3(...(nd.translation || [0, 0, 0])),
        new Quaternion(...(nd.rotation || [0, 0, 0, 1])),
        new Vector3(...(nd.scale || [1, 1, 1])),
    );
}
const sizeCache = new Map();
function nativeSize(url) {
    if (sizeCache.has(url)) return sizeCache.get(url);
    const file = join(PUBLIC, url.replace(/^\//, ''));
    if (!existsSync(file)) return null;
    const gltf = readGlbJson(readFileSync(file));
    const box = new Box3();
    const roots = (gltf.scenes?.[gltf.scene ?? 0] || gltf.scenes?.[0])?.nodes ?? [];
    const visit = (i, parent) => {
        const nd = gltf.nodes[i];
        if (!nd) return;
        const world = parent.clone().multiply(nodeMatrix(nd));
        if (nd.mesh != null) {
            for (const prim of gltf.meshes[nd.mesh]?.primitives || []) {
                const acc = gltf.accessors?.[prim.attributes?.POSITION];
                if (!acc?.min || !acc?.max) continue;
                for (const cx of [acc.min[0], acc.max[0]])
                    for (const cy of [acc.min[1], acc.max[1]])
                        for (const cz of [acc.min[2], acc.max[2]]) box.expandByPoint(new Vector3(cx, cy, cz).applyMatrix4(world));
            }
        }
        for (const c of nd.children || []) visit(c, world);
    };
    for (const r of roots) visit(r, new Matrix4());
    const s = box.getSize(new Vector3());
    sizeCache.set(url, s);
    return s;
}

/** HouseProp's Model(): each requested axis lands on its size; the rest follow the first, uniformly */
function drawnSize(size, fit) {
    const kw = fit?.w && size.x > 1e-4 ? fit.w / size.x : null;
    const kh = fit?.h && size.y > 1e-4 ? fit.h / size.y : null;
    const kd = fit?.d && size.z > 1e-4 ? fit.d / size.z : null;
    const base = kw ?? kh ?? kd ?? 1;
    return { w: size.x * (kw ?? base), h: size.y * (kh ?? base), d: size.z * (kd ?? base) };
}

/* ── 1. drawn vs footprint ── */
for (const s of SOLIDS) {
    if (!s.model) continue;
    const url = urlOf.get(s.model);
    if (!url) {
        fail.push(`DRAWN: "${s.name}" names model "${s.model}", which is not in the manifest`);
        continue;
    }
    if (!s.fit) {
        fail.push(`DRAWN: "${s.name}" draws ${s.model} with no fit — sizes must be explicit`);
        continue;
    }
    const size = nativeSize(url);
    if (!size) {
        fail.push(`DRAWN: "${s.name}" → ${url} does not exist`);
        continue;
    }
    const dr = drawnSize(size, s.fit);
    if (dr.w > s.w + 0.04 || dr.d > s.d + 0.04) {
        fail.push(`DRAWN: "${s.name}" is drawn ${n(dr.w)} × ${n(dr.d)} m but its footprint is ${n(s.w)} × ${n(s.d)} m`);
    }
    if (dr.w < s.w * 0.55 || dr.d < s.d * 0.55) {
        fail.push(`DRAWN: "${s.name}" footprint ${n(s.w)} × ${n(s.d)} m is far bigger than the ${n(dr.w)} × ${n(dr.d)} m it draws — an invisible wall`);
    }
}

/* ── 2. footprints apart ── */
const shapes = SOLIDS.map((s) => {
    const c = solidWorld(s);
    const yaw = solidYaw(s);
    return { s, x: c.x, z: c.z, ux: [Math.cos(yaw), -Math.sin(yaw)], uz: [Math.sin(yaw), Math.cos(yaw)], hw: s.w / 2, hd: s.d / 2 };
});
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function overlapDepth(A, B) {
    const d = [B.x - A.x, B.z - A.z];
    if (A.s.round && B.s.round) return A.hw + B.hw - Math.hypot(d[0], d[1]);
    if (A.s.round || B.s.round) {
        const C = A.s.round ? A : B;
        const R = A.s.round ? B : A;
        const v = [C.x - R.x, C.z - R.z];
        const lx = Math.max(-R.hw, Math.min(R.hw, dot(v, R.ux)));
        const lz = Math.max(-R.hd, Math.min(R.hd, dot(v, R.uz)));
        const px = R.x + R.ux[0] * lx + R.uz[0] * lz;
        const pz = R.z + R.ux[1] * lx + R.uz[1] * lz;
        return C.hw - Math.hypot(C.x - px, C.z - pz);
    }
    let least = Infinity;
    for (const axis of [A.ux, A.uz, B.ux, B.uz]) {
        const rA = A.hw * Math.abs(dot(A.ux, axis)) + A.hd * Math.abs(dot(A.uz, axis));
        const rB = B.hw * Math.abs(dot(B.ux, axis)) + B.hd * Math.abs(dot(B.uz, axis));
        least = Math.min(least, rA + rB - Math.abs(dot(d, axis)));
    }
    return least;
}
let tightest = null;
for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
        const A = shapes[i];
        const B = shapes[j];
        if (A.s.tuck === B.s.name || B.s.tuck === A.s.name) continue;
        if (Math.hypot(A.x - B.x, A.z - B.z) > Math.hypot(A.hw, A.hd) + Math.hypot(B.hw, B.hd) + 1) continue;
        const depth = overlapDepth(A, B);
        if (!tightest || depth > tightest.depth) tightest = { a: A.s.name, b: B.s.name, depth };
        if (depth > 0.005) fail.push(`APART: "${A.s.name}" and "${B.s.name}" overlap by ${n(depth)} m`);
    }
}

/* ── 3. on the floor ── */
for (const S of shapes) {
    const pts = [];
    if (S.s.round) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) pts.push([S.x + Math.cos(a) * (S.hw - 0.02), S.z + Math.sin(a) * (S.hw - 0.02)]);
    } else {
        for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
                const lx = sx * (S.hw - 0.02);
                const lz = sz * (S.hd - 0.02);
                pts.push([S.x + S.ux[0] * lx + S.uz[0] * lz, S.z + S.ux[1] * lx + S.uz[1] * lz]);
            }
    }
    pts.push([S.x, S.z]);
    const off = pts.filter(([x, z]) => !onFloor(x, z, 0));
    if (off.length) fail.push(`FLOOR: "${S.s.name}" pokes off the floor (through a wall) at (${n(off[0][0])}, ${n(off[0][1])})`);
}

/* ── 4. reach ── */
const STEP = 0.25;
const X0 = JUNGLE_BOUNDS.minX;
const Z0 = JUNGLE_BOUNDS.minZ;
const NX = Math.round((JUNGLE_BOUNDS.maxX - X0) / STEP) + 1;
const NZ = Math.round((JUNGLE_BOUNDS.maxZ - Z0) / STEP) + 1;
const ix = (x) => Math.round((x - X0) / STEP);
const iz = (z) => Math.round((z - Z0) / STEP);
const seen = new Uint8Array(NX * NZ);
const start = [ix(INTRO.stand.x), iz(INTRO.stand.z)];
if (!walkable(X0 + start[0] * STEP, Z0 + start[1] * STEP, PLAYER_R)) fail.push('REACH: the spawn itself is not walkable');
const queue = [start];
seen[start[0] * NZ + start[1]] = 1;
let reached = 0;
while (queue.length) {
    const [i, k] = queue.pop();
    reached++;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di;
        const nk = k + dk;
        if (ni < 0 || nk < 0 || ni >= NX || nk >= NZ) continue;
        const key = ni * NZ + nk;
        if (seen[key]) continue;
        if (walkable(X0 + ni * STEP, Z0 + nk * STEP, PLAYER_R)) {
            seen[key] = 1;
            queue.push([ni, nk]);
        } else seen[key] = 2;
    }
}
const reachableNear = (x, z, r) => {
    for (let dx = -r; dx <= r + 1e-9; dx += STEP)
        for (let dz = -r; dz <= r + 1e-9; dz += STEP) {
            if (dx * dx + dz * dz > r * r) continue;
            const i = ix(x + dx);
            const k = iz(z + dz);
            if (i < 0 || k < 0 || i >= NX || k >= NZ) continue;
            if (seen[i * NZ + k] === 1) return true;
        }
    return false;
};
for (const h of HOME_HOTSPOTS) {
    if (!reachableNear(h.position[0], h.position[2], Math.max(0.3, h.radius - 0.2))) fail.push(`REACH: station "${h.id}" (${h.label}) cannot be reached`);
}
for (const s of sites.SHARDS) {
    if (!reachableNear(s.x, s.z, 1.0)) fail.push(`REACH: shard "${s.id}" at (${n(s.x)}, ${n(s.z)}) cannot be picked up`);
    if (s.y > 2.2 && !pads.PADS.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 0.9)) fail.push(`REACH: shard "${s.id}" hangs at ${n(s.y)} m with no spring beneath it`);
}
for (const p of pads.PADS) {
    if (!reachableNear(p.x, p.z, 0.5)) fail.push(`REACH: spring "${p.id}" cannot be stepped on`);
}

/* ── 5. station rings ── */
for (const h of HOME_HOTSPOTS) {
    const [x, , z] = h.position;
    let ok = false;
    for (let a = 0; a < Math.PI * 2 && !ok; a += Math.PI / 8)
        for (let r = 0; r <= h.radius - 0.1 && !ok; r += 0.3) if (walkable(x + Math.cos(a) * r, z + Math.sin(a) * r, PLAYER_R)) ok = true;
    if (!ok) fail.push(`RINGS: station "${h.id}" has no walkable floor inside its ring`);
}
for (let i = 0; i < HOME_HOTSPOTS.length; i++)
    for (let j = i + 1; j < HOME_HOTSPOTS.length; j++) {
        const a = HOME_HOTSPOTS[i];
        const b = HOME_HOTSPOTS[j];
        const d = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
        if (d < a.radius + b.radius - 0.05) fail.push(`RINGS: "${a.id}" and "${b.id}" rings overlap (${n(d)} m apart, radii ${n(a.radius)} + ${n(b.radius)})`);
    }

const models = SOLIDS.filter((s) => s.model).length;
console.log(`── ${SOLIDS.length} solids (${models} drawn from models, each measured) · tightest pair: "${tightest?.a}" ↔ "${tightest?.b}" ${n(-(tightest?.depth ?? 0))} m clear`);
console.log(`── reach: ${n(reached * STEP * STEP)} m² walkable from the spawn`);
console.log(`── ${HOME_HOTSPOTS.length} stations · ${sites.SHARDS.length} shards · ${pads.PADS.length} springs checked`);
if (fail.length) {
    console.log('\nFAIL');
    fail.forEach((f) => console.log('  ✕ ' + f));
    process.exit(1);
}
console.log('\nThe lair is clean: every model fits its footprint, nothing overlaps, nothing pokes through a wall, every station is reachable.');
