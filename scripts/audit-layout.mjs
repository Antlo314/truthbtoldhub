/**
 * Layout audit — what is inside what.
 *
 * `validate-house.mjs` asserts a walker can GET everywhere: nothing in a
 * doorway, nothing on the stair, every room reachable. It never asks
 * whether two objects occupy the same cubic metre, because a walker
 * routing around a sofa does not care that the sofa is buried in the
 * wall. That is exactly what you see, though.
 *
 * This measures, and only reports. Fixing is a separate decision.
 *
 *   node --experimental-strip-types scripts/audit-layout.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOUSE = join(HERE, '..', 'components', 'truthos', 'house');
const DEPS = ['homeMap.ts', 'jungleMap.ts', 'houseMap.ts'];

const tmp = mkdtempSync(join(tmpdir(), 'layoutaudit-'));
let M;
try {
    for (const f of DEPS) {
        const src = readFileSync(join(HOUSE, f), 'utf8');
        writeFileSync(
            join(tmp, f),
            src.replace(/from '(\.\.?\/[^']+?)'/g, (m, spec) =>
                spec.endsWith('.ts') ? m : `from '${spec}.ts'`),
        );
    }
    M = await import(pathToFileURL(join(tmp, 'homeMap.ts')).href);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}

const {
    FURNITURE, ROOMS, SHELL, DOORWAYS, PLAYER_R, AISLES,
    artFootprints, collidersFor,
} = M;

const n = (v) => Number(v).toFixed(2);
const box = (c) => `x[${n(c.x - c.hx)},${n(c.x + c.hx)}] z[${n(c.z - c.hz)},${n(c.z + c.hz)}]`;

/** Overlap area in m² — 0 means they merely touch. */
function overlapArea(a, b) {
    const ox = Math.min(a.x + a.hx, b.x + b.hx) - Math.max(a.x - a.hx, b.x - b.hx);
    const oz = Math.min(a.z + a.hz, b.z + b.hz) - Math.max(a.z - a.hz, b.z - b.hz);
    return ox > 0 && oz > 0 ? ox * oz : 0;
}

const findings = { intersect: [], outsideShell: [], wallClash: [], roomless: [], aisleClash: [] };

// ── 1. Furniture inside furniture ───────────────────────────
// The headline complaint. Two solid props sharing floor area render as
// one object growing out of another.
const props = [...FURNITURE, ...artFootprints()];
for (let i = 0; i < props.length; i++) {
    for (let j = i + 1; j < props.length; j++) {
        const area = overlapArea(props[i], props[j]);
        if (area > 0.001) {
            findings.intersect.push({
                a: props[i].name, b: props[j].name, area,
                aBox: box(props[i]), bBox: box(props[j]),
            });
        }
    }
}

// ── 2. Furniture sticking through the outer shell ───────────
for (const f of props) {
    const out = [];
    if (f.x - f.hx < SHELL.minX) out.push(`${n(SHELL.minX - (f.x - f.hx))}m past west wall`);
    if (f.x + f.hx > SHELL.maxX) out.push(`${n(f.x + f.hx - SHELL.maxX)}m past east wall`);
    if (f.z - f.hz < SHELL.minZ) out.push(`${n(SHELL.minZ - (f.z - f.hz))}m past north wall`);
    if (f.z + f.hz > SHELL.maxZ) out.push(`${n(f.z + f.hz - SHELL.maxZ)}m past south wall`);
    if (out.length) findings.outsideShell.push({ name: f.name, out, box: box(f) });
}

// ── 3. Furniture buried in an interior wall ─────────────────
// collidersFor('main') is walls + furniture + door leaves, so the wall
// segments are whatever is left after removing the props themselves.
const all = collidersFor('main');
const propKeys = new Set(props.map((p) => `${n(p.x)}|${n(p.z)}|${n(p.hx)}|${n(p.hz)}`));
const walls = all.filter((c) => !propKeys.has(`${n(c.x)}|${n(c.z)}|${n(c.hx)}|${n(c.hz)}`));
for (const f of props) {
    for (const w of walls) {
        const area = overlapArea(f, w);
        // A prop pushed flat against a wall legitimately shares its skin;
        // only a real bite counts.
        if (area > 0.02) findings.wallClash.push({ name: f.name, area, propBox: box(f), wallBox: box(w) });
    }
}

// ── 4. Furniture in no room at all ──────────────────────────
const rooms = ROOMS.filter((r) => r.level === 'main');
for (const f of props) {
    const inRoom = rooms.find(
        (r) => f.x >= r.minX && f.x <= r.maxX && f.z >= r.minZ && f.z <= r.maxZ,
    );
    if (!inRoom) findings.roomless.push({ name: f.name, at: `${n(f.x)}, ${n(f.z)}` });
}

// ── 5. Furniture blocking a declared walking aisle ──────────
for (const f of props) {
    for (const a of AISLES) {
        const area = overlapArea(f, a);
        if (area > 0.02) findings.aisleClash.push({ name: f.name, aisle: a.name, area });
    }
}

// ── Report ──────────────────────────────────────────────────
const L = [];
L.push('═══ LAYOUT AUDIT ═══');
L.push(`shell  x[${n(SHELL.minX)},${n(SHELL.maxX)}]  z[${n(SHELL.minZ)},${n(SHELL.maxZ)}]`);
L.push(`props  ${props.length}   walls ${walls.length}   rooms ${rooms.length}`);
L.push('');

const sec = (title, rows, fmt) => {
    L.push(`── ${title}: ${rows.length} ──`);
    if (!rows.length) L.push('   clean');
    else rows.forEach((r) => L.push('   ' + fmt(r)));
    L.push('');
};

findings.intersect.sort((a, b) => b.area - a.area);
sec('MODELS INSIDE EACH OTHER', findings.intersect,
    (r) => `${n(r.area)}m²  ${r.a}  ✕  ${r.b}\n        ${r.a}: ${r.aBox}\n        ${r.b}: ${r.bBox}`);
sec('STICKING OUT OF THE HOUSE', findings.outsideShell, (r) => `${r.name} — ${r.out.join(', ')}  ${r.box}`);
findings.wallClash.sort((a, b) => b.area - a.area);
sec('BURIED IN A WALL', findings.wallClash, (r) => `${n(r.area)}m²  ${r.name}\n        prop: ${r.propBox}\n        wall: ${r.wallBox}`);
sec('IN NO ROOM', findings.roomless, (r) => `${r.name} at ${r.at}`);
sec('BLOCKING AN AISLE', findings.aisleClash, (r) => `${n(r.area)}m²  ${r.name} in "${r.aisle}"`);

const total = Object.values(findings).reduce((s, a) => s + a.length, 0);
L.push(total ? `${total} problems.` : 'Layout is clean.');
console.log(L.join('\n'));
process.exit(total ? 1 : 0);
