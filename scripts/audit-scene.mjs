/**
 * Scene audit — what visually intersects what.
 *
 * `audit-layout.mjs` checks the COLLIDER tables and reports them clean.
 * That is not what you see. A collider is a hand-written box saying how
 * much floor a prop was allowed; the rendered model is a GLB scaled
 * uniformly to hit ONE requested axis, so its other two axes land
 * wherever its own proportions put them. Nothing has ever compared the
 * two, which is how a prop can pass every collider test and still grow
 * through the thing beside it.
 *
 * Input: scene-boxes.json — world-space boxes extracted from the scene
 * components (see scripts/README or the extraction workflow).
 * Output: every intersecting pair, worst first.
 *
 *   node scripts/audit-scene.mjs [path/to/scene-boxes.json]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = process.argv[2] || join(HERE, 'scene-boxes.json');

if (!existsSync(IN)) {
    console.error(`no box file at ${IN}`);
    process.exit(2);
}

/**
 * Only components that actually render count.
 *
 * The first run of this audit reported 263 pairs; about a hundred came
 * from HouseTrim and Fireplace, which are imported by nothing — dead
 * code cannot intersect anything on screen, and "fixing" it wastes an
 * afternoon. Grove is excluded for the opposite reason: its scatter was
 * rewritten (groveScatter.ts) after the boxes were extracted, so its
 * rows here describe a layout that no longer exists — validate-grove.mjs
 * asserts the live one exactly. Pass --all to see everything anyway.
 */
const MOUNTED = new Set([
    'HomeDecor.tsx', 'HomeInterior.tsx', 'HomeGeometry.tsx',
    'WorldDestinations.tsx', 'JungleGeometry.tsx',
]);
const ALL = process.argv.includes('--all');

/** [{file, objects:[{name,x,y,z,w,h,d,flat}]}] or a flat array of objects. */
const raw = JSON.parse(readFileSync(IN, 'utf8'));
const boxes = [];
for (const entry of Array.isArray(raw) ? raw : [raw]) {
    const file = entry.file || 'unknown';
    if (!ALL && !MOUNTED.has(file)) continue;
    for (const o of entry.objects || []) {
        if (!Number.isFinite(o.x) || !Number.isFinite(o.z)) continue;
        if (!Number.isFinite(o.w) || !Number.isFinite(o.d)) continue;
        boxes.push({
            file,
            name: o.name || '(unnamed)',
            line: o.line ?? null,
            x: o.x, z: o.z, y: Number.isFinite(o.y) ? o.y : 0,
            w: Math.abs(o.w), d: Math.abs(o.d), h: Number.isFinite(o.h) ? Math.abs(o.h) : 0,
            flat: !!o.flat || (Number.isFinite(o.h) && o.h < 0.06),
            assumed: !!o.assumed,
        });
    }
}

const n = (v) => Number(v).toFixed(2);
const lo = (b, ax) => (ax === 'x' ? b.x - b.w / 2 : ax === 'z' ? b.z - b.d / 2 : b.y);
const hi = (b, ax) => (ax === 'x' ? b.x + b.w / 2 : ax === 'z' ? b.z + b.d / 2 : b.y + b.h);
const span = (b) => `x[${n(lo(b, 'x'))},${n(hi(b, 'x'))}] y[${n(b.y)},${n(b.y + b.h)}] z[${n(lo(b, 'z'))},${n(hi(b, 'z'))}]`;

function overlap(a, b, ax) {
    return Math.min(hi(a, ax), hi(b, ax)) - Math.max(lo(a, ax), lo(b, ax));
}

/**
 * Not everything with a bounding box is a thing you can bump into.
 *
 * Two whole classes have to come out or they bury the signal:
 *
 *  - CONTAINERS. The sky dome is a 220m inverted sphere; it contains the
 *    entire world on purpose, so it "intersects" all 552 boxes. Same for
 *    the horizon rim and the ground plane.
 *  - AGGREGATES. The extraction folded instanced scatter (240 trees, 151
 *    hedges) into one box each. That box is a statistical envelope, not a
 *    solid — reporting the house as intersecting "240 tree canopies"
 *    says only that the house is in the jungle, which it is.
 *
 * What is left is discrete objects, which is what "models inside each
 * other" actually means.
 */
const CONTAINER = /AGGREGATE|sky dome|horizon|ground plane|ground disc|fog|backside|canopy mass|silhouette mass|water plane|skirt/i;
const HUGE = 12; // metres — beyond this it is architecture or terrain, not a prop

const solids = boxes.filter((b) => {
    if (CONTAINER.test(b.name)) return false;
    if (b.w > HUGE && b.d > HUGE) return false;
    return true;
});
console.log(`${boxes.length - solids.length} containers/aggregates excluded → ${solids.length} discrete objects\n`);

/**
 * Solids only, and only a real bite.
 *
 * Two allowances, both deliberate:
 *  - flat things (rugs, mats, floor decals) live UNDER furniture by design
 *  - a 3cm skin, so a bookshelf pushed against a wall is not a finding
 */
const SKIN = 0.03;
const pairs = [];
for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i];
        const b = solids[j];
        if (a.flat || b.flat) continue;

        const ox = overlap(a, b, 'x') - SKIN;
        const oz = overlap(a, b, 'z') - SKIN;
        if (ox <= 0 || oz <= 0) continue;
        // Height matters: a wall lamp above a sofa shares floor area and
        // intersects nothing. Only flag when they share vertical space too.
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (a.h > 0 && b.h > 0 && oy <= SKIN) continue;

        pairs.push({
            a, b,
            volume: ox * oz * Math.max(oy, 0.01),
            area: ox * oz,
            ox, oz, oy,
        });
    }
}

pairs.sort((p, q) => q.volume - p.volume);

/**
 * Not every intersection is wrong. A house is MADE of touching parts:
 * wall runs meet at corners, window glass sits inside the wall slab,
 * entry piers engage the front wall, chairs tuck under tables, a
 * screen hangs millimetres off its backing board (their AABBs overlap
 * hugely once the pavilion is rotated — an artifact of axis-aligned
 * boxes, not of the geometry).
 *
 * Splitting these out is what lets the exit code mean something: the
 * REVIEW bucket empty = the scene is arranged; a new prop landing
 * inside another shows up there, not buried under 90 wall corners.
 */
const STRUCTURE = /wall|window|pier|baseboard|skirting|trim|roof|post|beam|arch|doorway|door leaf|glass|pane|sill|lintel|backing|column|pillar|floor slab|ceiling|cove|threshold/i;
const TUCK = [
    [/chair/i, /table/i],       // seats slide under tabletops
    [/stool/i, /island|counter/i],
    [/screen|panel/i, /backing|board|post/i],
    [/flame|ember|log/i, /firebox|hearth|campfire|fire ring/i],
    [/monitor|screen|keyboard|mouse/i, /desk/i],   // things standing on a desk
    [/leaf/i, /jamb|casing|head/i],                // a door meets its frame
    [/mast/i, /beacon/i],
];
const isTuck = (a, b) =>
    TUCK.some(([p, q]) => (p.test(a.name) && q.test(b.name)) || (p.test(b.name) && q.test(a.name)));

/**
 * Parts of one assembly touch each other because that is what an
 * assembly is — a pendant's rod enters its shade, a desk top rests on
 * its legs. The extraction names parts with their assembly as a prefix
 * ("island pendant west — shade" / "island pendant west — bulb"), so a
 * long shared prefix is the tell. 10 characters is enough to clear
 * coincidences like "wall: ..." while catching every real assembly.
 */
function sharedAssembly(a, b) {
    const max = Math.min(a.name.length, b.name.length);
    let i = 0;
    while (i < max && a.name[i] === b.name[i]) i++;
    return i >= 10;
}

const expected = [];
const review = [];
for (const p of pairs) {
    if (
        STRUCTURE.test(p.a.name) || STRUCTURE.test(p.b.name) ||
        isTuck(p.a, p.b) || sharedAssembly(p.a, p.b)
    ) expected.push(p);
    else review.push(p);
}

console.log('═══ SCENE AUDIT — rendered geometry ═══');
console.log(`${boxes.length} solid+flat boxes from ${new Set(boxes.map((b) => b.file)).size} files`);
const assumed = boxes.filter((b) => b.assumed);
if (assumed.length) console.log(`${assumed.length} boxes used an assumed value — treat those findings as softer`);
console.log('');

if (!pairs.length) {
    console.log('Nothing intersects.');
    process.exit(0);
}

console.log(`── ${review.length} PROP INTERSECTIONS — these are the mess ──\n`);
if (!review.length) console.log('   none — everything left touching is structure doing its job\n');
for (const p of review) {
    console.log(
        `${n(p.volume)}m³   ${p.a.name}  ✕  ${p.b.name}` +
        `\n        ${p.a.file}${p.a.line ? ':' + p.a.line : ''}  ${span(p.a)}` +
        `\n        ${p.b.file}${p.b.line ? ':' + p.b.line : ''}  ${span(p.b)}` +
        `\n        bite: ${n(p.ox)}m in x · ${n(p.oz)}m in z · ${n(p.oy)}m in y\n`,
    );
}

console.log(`── ${expected.length} structural contacts (corners, embedded windows, tucks) — expected ──`);
for (const p of expected.slice(0, 5)) {
    console.log(`   ${n(p.volume)}m³  ${p.a.name}  ✕  ${p.b.name}`);
}
if (expected.length > 5) console.log(`   … and ${expected.length - 5} more (run with --all-pairs to list)`);
if (process.argv.includes('--all-pairs')) {
    for (const p of expected.slice(5)) console.log(`   ${n(p.volume)}m³  ${p.a.name}  ✕  ${p.b.name}`);
}

if (review.length) {
    const by = new Map();
    for (const p of review) for (const o of [p.a, p.b]) by.set(o.name, (by.get(o.name) || 0) + 1);
    console.log('\n── WORST OFFENDERS ──');
    [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
        .forEach(([name, c]) => console.log(`   ${String(c).padStart(3)} intersections   ${name}`));
}

process.exit(review.length ? 1 : 0);
