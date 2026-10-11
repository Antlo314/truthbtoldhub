/**
 * Sanctum plan validator — run it after touching homeMap / jungleMap /
 * shardSites / worldPads.
 *
 *   node --experimental-strip-types scripts/validate-sanctum.mjs
 *
 * Four assertions, all against the SAME functions the walker uses, so a
 * pass here means a pass in the world:
 *
 *   1. SOLIDS   — no two props share floor (circle vs circle).
 *   2. GROUND   — every prop stands on floor, not in a wall or over the sea.
 *   3. REACH    — flood-fill from the spawn reaches every station, every
 *                 shard and every spring, so nothing has been sealed off.
 *   4. CLEAR    — a station's trigger has walkable floor inside it.
 *
 * homeMap is TypeScript with extensionless imports, which node's type
 * stripper cannot resolve — so the plan modules are copied to a temp dir
 * with their relative specifiers rewritten to carry .ts.
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOUSE = join(HERE, '..', 'components', 'truthos', 'house');
const DEPS = ['homeMap.ts', 'houseMap.ts', 'shardSites.ts', 'worldPads.ts', 'shardStore.ts', 'houseUiStore.ts'];

const tmp = mkdtempSync(join(tmpdir(), 'sanctumcheck-'));
let plan, sites, pads;
try {
    for (const f of DEPS) {
        const src = readFileSync(join(HOUSE, f), 'utf8');
        writeFileSync(
            join(tmp, f),
            src
                .replace(/from '(\.\.?\/[^']+?)'/g, (m, spec) => (spec.endsWith('.ts') ? m : `from '${spec}.ts'`))
                // the store pulls zustand + renderQuality; the validator only needs its types
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

const { SOLIDS, solidWorld, walkable, onFloor, HOME_HOTSPOTS, INTRO, PLAYER_R } = plan;
const fail = [];
const n = (v) => Number(v).toFixed(2);

/* ── 1. solids vs solids ── */
const placed = SOLIDS.map((s) => ({ ...s, w: solidWorld(s) }));
let worst = null;
for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        // a chair pushed under its desk is one object, not a clash
        if (a.tuck === b.name || b.tuck === a.name) continue;
        const d = Math.hypot(a.w.x - b.w.x, a.w.z - b.w.z);
        const need = a.r + b.r;
        if (!worst || d - need < worst.gap) worst = { a, b, d, gap: d - need };
        if (d < need) fail.push(`SOLIDS: "${a.name}" and "${b.name}" overlap — ${n(d)}m apart, need ${n(need)}m`);
    }
}
console.log(`── ${placed.length} solids; closest pair: "${worst.a.name}" ↔ "${worst.b.name}" ${n(worst.d)}m apart (${n(worst.gap)}m clear)`);

/* ── 2. solids on ground — the centre and the inner half of the circle.
       A prop pushed against a wall has a collision circle that overruns
       the wall by design; a prop hanging half off the floor does not. ── */
for (const s of placed) {
    const { x, z } = s.w;
    let ok = onFloor(x, z, 0);
    for (let a = 0; a < Math.PI * 2 && ok; a += Math.PI / 4) {
        if (!onFloor(x + Math.cos(a) * s.r * 0.5, z + Math.sin(a) * s.r * 0.5, 0)) ok = false;
    }
    if (!ok) fail.push(`GROUND: "${s.name}" at (${n(x)}, ${n(z)}) r ${n(s.r)} is not on floor`);
}

/* ── 3. reach ── */
const STEP = 0.25;
const LIM = 52;
const N = Math.round((LIM * 2) / STEP) + 1;
const idx = (x, z) => Math.round((x + LIM) / STEP) * N + Math.round((z + LIM) / STEP);
const seen = new Uint8Array(N * N);
const queue = [[INTRO.stand.x, INTRO.stand.z]];
seen[idx(INTRO.stand.x, INTRO.stand.z)] = 1;
let reached = 0;
while (queue.length) {
    const [x, z] = queue.pop();
    reached++;
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
        const nx = +(x + dx).toFixed(4);
        const nz = +(z + dz).toFixed(4);
        if (Math.abs(nx) > LIM || Math.abs(nz) > LIM) continue;
        const k = idx(nx, nz);
        if (seen[k]) continue;
        seen[k] = 1;
        if (walkable(nx, nz, PLAYER_R)) queue.push([nx, nz]);
        else seen[k] = 2;
    }
}
console.log(`── reach: ${reached} cells walkable from the spawn (${n(reached * STEP * STEP)} m²)`);

const reachableNear = (x, z, r) => {
    for (let dx = -r; dx <= r; dx += STEP)
        for (let dz = -r; dz <= r; dz += STEP) {
            if (dx * dx + dz * dz > r * r) continue;
            const px = x + dx;
            const pz = z + dz;
            if (Math.abs(px) > LIM || Math.abs(pz) > LIM) continue;
            if (seen[idx(px, pz)] === 1) return true;
        }
    return false;
};

for (const h of HOME_HOTSPOTS) {
    const [x, , z] = h.position;
    if (!reachableNear(x, z, Math.max(0.3, h.radius - 0.2))) fail.push(`REACH: station "${h.id}" (${h.label}) cannot be reached`);
}
for (const s of sites.SHARDS) {
    if (!reachableNear(s.x, s.z, 1.0)) fail.push(`REACH: shard "${s.id}" at (${n(s.x)}, ${n(s.z)}) cannot be picked up`);
    // a shard hung high must have a spring under it
    if (s.y > 2.2 && !pads.PADS.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 0.9)) fail.push(`REACH: shard "${s.id}" hangs at ${n(s.y)}m with no spring beneath it`);
}
for (const p of pads.PADS) {
    if (!reachableNear(p.x, p.z, 0.6)) fail.push(`REACH: spring "${p.id}" cannot be stepped on`);
}
// the chambers themselves
for (const id of ['cinema', 'hall', 'soul_mirror', 'studio']) {
    const h = HOME_HOTSPOTS.find((x) => x.id === id);
    if (h && !reachableNear(h.position[0], h.position[2], 2.0)) fail.push(`REACH: chamber "${id}" is cut off`);
}

/* ── 4. clear triggers ── */
for (const h of HOME_HOTSPOTS) {
    const [x, , z] = h.position;
    let ok = false;
    for (let a = 0; a < Math.PI * 2 && !ok; a += Math.PI / 8) {
        for (let r = 0; r <= h.radius - 0.1 && !ok; r += 0.3) {
            if (walkable(x + Math.cos(a) * r, z + Math.sin(a) * r, PLAYER_R)) ok = true;
        }
    }
    if (!ok) fail.push(`CLEAR: station "${h.id}" has no walkable floor inside its ring`);
}

console.log(`── ${HOME_HOTSPOTS.length} stations · ${sites.SHARDS.length} shards · ${pads.PADS.length} springs checked`);
if (fail.length) {
    console.log('\nFAIL');
    fail.forEach((f) => console.log('  ✕ ' + f));
    process.exit(1);
}
console.log('\nThe lair is clean: nothing overlaps, everything stands on floor, every station is reachable.');
