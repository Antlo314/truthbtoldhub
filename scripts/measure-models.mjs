/**
 * Native size of every GLB, measured — not assumed.
 *
 * `HouseProp` fits a model by scaling it UNIFORMLY so ONE axis lands on a
 * requested size. The other two axes then land wherever the model's own
 * proportions put them. A collider is a hand-written box that says how
 * much floor the prop was allowed; nothing has ever checked the model
 * against it, so a sofa reserved 0.96m of depth can render 1.6m deep and
 * grow straight through the coffee table in front of it.
 *
 * This prints, for every model, its native bounding box — which is all
 * you need to compute the real footprint at any `fit`.
 *
 * Parses the GLB container directly (JSON chunk + accessor min/max,
 * composed through the node hierarchy). No DOM, no loader, no textures.
 *
 *   node scripts/measure-models.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Vector3, Quaternion, Box3 } from 'three';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const MODELS = join(ROOT, 'public', 'models');

function walk(dir, out = []) {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (e.toLowerCase().endsWith('.glb')) out.push(p);
    }
    return out;
}

/** GLB = 12-byte header then chunks; chunk 0 is the JSON. */
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

function nodeMatrix(n) {
    const m = new Matrix4();
    if (n.matrix) return m.fromArray(n.matrix);
    const t = new Vector3(...(n.translation || [0, 0, 0]));
    const q = new Quaternion(...(n.rotation || [0, 0, 0, 1]));
    const s = new Vector3(...(n.scale || [1, 1, 1]));
    return m.compose(t, q, s);
}

/**
 * Accessor min/max is the primitive's local AABB. Transforming the eight
 * corners and re-bounding is correct for any rotation; transforming just
 * min/max is not.
 */
function measure(gltf) {
    const box = new Box3();
    const scenes = gltf.scenes || [];
    const roots = (scenes[gltf.scene ?? 0] || scenes[0])?.nodes ?? [];

    const visit = (idx, parent) => {
        const n = gltf.nodes[idx];
        if (!n) return;
        const world = parent.clone().multiply(nodeMatrix(n));
        if (n.mesh != null) {
            for (const prim of gltf.meshes[n.mesh]?.primitives || []) {
                const acc = gltf.accessors?.[prim.attributes?.POSITION];
                if (!acc?.min || !acc?.max) continue;
                const [x0, y0, z0] = acc.min;
                const [x1, y1, z1] = acc.max;
                for (const cx of [x0, x1])
                    for (const cy of [y0, y1])
                        for (const cz of [z0, z1])
                            box.expandByPoint(new Vector3(cx, cy, cz).applyMatrix4(world));
            }
        }
        for (const c of n.children || []) visit(c, world);
    };
    for (const r of roots) visit(r, new Matrix4());
    return box;
}

const rows = [];
for (const file of walk(MODELS)) {
    try {
        const gltf = readGlbJson(readFileSync(file));
        const box = measure(gltf);
        if (box.isEmpty()) { rows.push({ file, err: 'no geometry' }); continue; }
        const s = box.getSize(new Vector3());
        rows.push({
            file: relative(MODELS, file).replace(/\\/g, '/'),
            w: s.x, h: s.y, d: s.z,
            depthPerWidth: s.x > 1e-6 ? s.z / s.x : 0,
        });
    } catch (e) {
        rows.push({ file: relative(MODELS, file).replace(/\\/g, '/'), err: e.message });
    }
}

const n = (v) => Number(v).toFixed(3);
rows.sort((a, b) => (a.file || '').localeCompare(b.file || ''));
console.log('model'.padEnd(42), 'w'.padStart(8), 'h'.padStart(8), 'd'.padStart(8), '  d/w');
for (const r of rows) {
    if (r.err) { console.log(r.file.padEnd(42), '  ' + r.err); continue; }
    console.log(
        r.file.padEnd(42),
        n(r.w).padStart(8), n(r.h).padStart(8), n(r.d).padStart(8),
        '  ' + n(r.depthPerWidth),
    );
}
console.log(`\n${rows.filter((r) => !r.err).length} models measured.`);
