/**
 * Build the vessel bodies — the rigged, animated low-poly humans every soul
 * wears in the world.
 *
 * Sources are CC0 (public domain): Quaternius' Universal Base Characters,
 * Modular Character Outfits and Universal Animation Library, fetched from a
 * pinned GitHub mirror (Dallolz/moorfall-assets) so the build is reproducible.
 * See public/models/CREDITS.md.
 *
 * What comes out (public/models/vessels/):
 *   vessel_masc.glb / vessel_fem.glb — one skeleton (UE-style bone names:
 *     pelvis, spine_01.., Head, clavicle_l, upperarm_l, lowerarm_l, hand_l,
 *     thigh_l, calf_l, foot_l …) carrying EVERY selectable part as its own
 *     skinned node, so the runtime downloads one file per build and toggles
 *     `visible` per player:
 *       head, eyes, brows
 *       outfit_peasant_{arms,body,legs,feet}, outfit_ranger_{…}
 *       hair_buzzed, hair_parted, hair_long, hair_buns, hair_beard (masc)
 *     Materials are named for the runtime tinter: skin_* (grayscale
 *     shading map × per-player skin tone), hair (flat, × hair colour),
 *     cloth_* (painted atlas, lightly tinted), eyes.
 *   vessel_anims.glb — the mannequin skeleton with rotation-only clips
 *     (pelvis keeps its translation), retargets onto both builds by bone
 *     name at runtime.
 *
 * Run: node scripts/build-vessels.mjs        (downloads sources once into
 *      scratch/vessels/src, which is gitignored)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, resample, reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'scratch', 'vessels', 'src');
const OUT = path.join(ROOT, 'public', 'models', 'vessels');
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

/** Pinned mirror commit — every path below is CC0 (see the repo's LICENSE.md). */
const MIRROR =
    'https://raw.githubusercontent.com/Dallolz/moorfall-assets/1e83864f55ff8646e929ac9b73faa75df29161de/';
const FILES = [
    'characters/Superhero_Male.glb',
    'characters/Superhero_Female.glb',
    'outfits/Male_Peasant.glb',
    'outfits/Male_Ranger.glb',
    'outfits/Female_Peasant.glb',
    'outfits/Female_Ranger.glb',
    'hair/Hair_Buns.glb',
    'hair/Hair_Buzzed.glb',
    'hair/Hair_BuzzedFemale.glb',
    'hair/Hair_Long.glb',
    'hair/Hair_SimpleParted.glb',
    'hair/Hair_Beard.glb',
    'animations/UAL1.glb',
    'animations/UAL2.glb',
];

/** Clips worth shipping. Everything else in the library stays on the shelf. */
const CLIPS = [
    'Idle_Loop',
    'Idle_Talking_Loop',
    'Idle_FoldArms_Loop',
    'Idle_TalkingPhone_Loop',
    'Walk_Loop',
    'Jog_Fwd_Loop',
    'Sprint_Loop',
    'Jump_Start',
    'Jump_Loop',
    'Jump_Land',
    'Sitting_Enter',
    'Sitting_Idle_Loop',
    'Sitting_Exit',
    'LayToIdle',
    'Interact',
    'PickUp_Table',
    'Yes',
    'Idle_No_Loop',
    'Dance_Loop',
    'Consume',
    // the Aether Plain: combat, prayer, the fall
    'Sword_Idle',
    'Sword_Regular_A',
    'Sword_Regular_B',
    'Sword_Regular_C',
    'Sword_Attack',
    'Sword_Block',
    'Roll',
    'Hit_Chest',
    'Hit_Knockback',
    'Death01',
    'Fixing_Kneeling',
    'Spell_Simple_Shoot',
    'Idle_Shield_Loop',
];

async function fetchAll() {
    for (const rel of FILES) {
        const dst = path.join(SRC, rel);
        if (fs.existsSync(dst) && fs.statSync(dst).size > 1000) continue;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        process.stdout.write(`  fetch ${rel} … `);
        const res = await fetch(MIRROR + rel);
        if (!res.ok) throw new Error(`${rel}: HTTP ${res.status}`);
        fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
        console.log(`${(fs.statSync(dst).size / 1024).toFixed(0)} KB`);
    }
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
});

const read = (rel) => io.read(path.join(SRC, rel));

/* ───────────────────────── skeleton helpers ───────────────────────── */

/** World bind matrices per joint (inverse of the IBM), keyed by joint name. */
function bindWorlds(skin) {
    const ibm = skin.getInverseBindMatrices().getArray();
    const out = new Map();
    skin.listJoints().forEach((j, i) => {
        out.set(j.getName(), new THREE.Matrix4().fromArray(ibm, i * 16).invert());
    });
    return out;
}

/** Inverse bind matrices per joint, keyed by name. */
function ibms(skin) {
    const ibm = skin.getInverseBindMatrices().getArray();
    const out = new Map();
    skin.listJoints().forEach((j, i) => {
        out.set(j.getName(), new THREE.Matrix4().fromArray(ibm, i * 16));
    });
    return out;
}

/**
 * Deep-copy a skeleton (joint hierarchy + skin) from a source document into
 * `doc`, returning { skin, root, joints: Map<name, Node> }.
 */
function copySkeleton(doc, srcSkin) {
    const joints = srcSkin.listJoints();
    const srcRoot = joints[0];
    const map = new Map();
    const clone = (n) => {
        const c = doc
            .createNode(n.getName())
            .setTranslation(n.getTranslation())
            .setRotation(n.getRotation())
            .setScale(n.getScale());
        map.set(n, c);
        for (const ch of n.listChildren()) c.addChild(clone(ch));
        return c;
    };
    const root = clone(srcRoot);
    const buffer = doc.getRoot().listBuffers()[0];
    const ibmAcc = doc
        .createAccessor('inverseBindMatrices')
        .setType('MAT4')
        .setArray(new Float32Array(srcSkin.getInverseBindMatrices().getArray()))
        .setBuffer(buffer);
    const skin = doc.createSkin('vessel').setInverseBindMatrices(ibmAcc);
    const byName = new Map();
    for (const j of joints) {
        const c = map.get(j);
        skin.addJoint(c);
        byName.set(j.getName(), c);
    }
    skin.setSkeleton(root);
    return { skin, root, joints: byName, jointOrder: joints.map((j) => j.getName()) };
}

/* ───────────────────────── mesh copy / rebind ───────────────────────── */

/**
 * Copy one primitive into `doc`, optionally
 *   - keeping only triangles whose 3 vertices pass `keepVertex(weightsByJoint)`
 *   - re-expressing positions/normals from the source skeleton's bind pose
 *     into the target skeleton's bind pose (exact for skinned meshes bound
 *     in the same rest pose family; small residual otherwise)
 * Joint indices are copied verbatim — every source file shares the same
 * 65-joint order (verified in scratch/vessels/check.mjs).
 */
function copyPrimitive(doc, srcPrim, opts) {
    const { material, keepVertex, rebind, jointOrder } = opts;
    const pos = srcPrim.getAttribute('POSITION').getArray();
    const nor = srcPrim.getAttribute('NORMAL')?.getArray();
    const uv = srcPrim.getAttribute('TEXCOORD_0')?.getArray();
    const jo = srcPrim.getAttribute('JOINTS_0').getArray();
    const we = srcPrim.getAttribute('WEIGHTS_0').getArray();
    const idxAcc = srcPrim.getIndices();
    const idx = idxAcc ? idxAcc.getArray() : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
    const vcount = pos.length / 3;

    // per-vertex pass filter
    let pass = null;
    if (keepVertex) {
        pass = new Uint8Array(vcount);
        for (let v = 0; v < vcount; v++) {
            const w = {};
            for (let k = 0; k < 4; k++) {
                const j = jo[v * 4 + k];
                const ww = we[v * 4 + k];
                if (ww > 0) w[jointOrder[j]] = (w[jointOrder[j]] || 0) + ww;
            }
            pass[v] = keepVertex(w) ? 1 : 0;
        }
    }

    // triangles that survive
    const tris = [];
    for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        if (pass && !(pass[a] && pass[b] && pass[c])) continue;
        tris.push(a, b, c);
    }
    if (tris.length === 0) throw new Error('copyPrimitive: nothing survived the cut');

    // compact
    const remap = new Int32Array(vcount).fill(-1);
    const order = [];
    for (const v of tris) if (remap[v] < 0) { remap[v] = order.length; order.push(v); }
    const n = order.length;
    const P = new Float32Array(n * 3);
    const N = nor ? new Float32Array(n * 3) : null;
    const U = uv ? new Float32Array(n * 2) : null;
    const J = new Uint16Array(n * 4);
    const W = new Float32Array(n * 4);

    const p = new THREE.Vector3(), nn = new THREE.Vector3(), acc = new THREE.Vector3(), accN = new THREE.Vector3();
    const tmp = new THREE.Vector3(), m3 = new THREE.Matrix3();
    order.forEach((v, i) => {
        p.set(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        if (nor) nn.set(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
        if (rebind) {
            acc.set(0, 0, 0);
            accN.set(0, 0, 0);
            let wsum = 0;
            for (let k = 0; k < 4; k++) {
                const ww = we[v * 4 + k];
                if (ww <= 0) continue;
                const jn = jointOrder[jo[v * 4 + k]];
                const M = rebind.get(jn);
                if (!M) continue;
                tmp.copy(p).applyMatrix4(M);
                acc.addScaledVector(tmp, ww);
                if (nor) {
                    m3.setFromMatrix4(M);
                    tmp.copy(nn).applyMatrix3(m3);
                    accN.addScaledVector(tmp, ww);
                }
                wsum += ww;
            }
            if (wsum > 0) {
                p.copy(acc).multiplyScalar(1 / wsum);
                if (nor) nn.copy(accN).normalize();
            }
        }
        P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
        if (N) { N[i * 3] = nn.x; N[i * 3 + 1] = nn.y; N[i * 3 + 2] = nn.z; }
        if (U) { U[i * 2] = uv[v * 2]; U[i * 2 + 1] = uv[v * 2 + 1]; }
        for (let k = 0; k < 4; k++) { J[i * 4 + k] = jo[v * 4 + k]; W[i * 4 + k] = we[v * 4 + k]; }
    });
    const I = new Uint32Array(tris.length);
    for (let t = 0; t < tris.length; t++) I[t] = remap[tris[t]];

    const buffer = doc.getRoot().listBuffers()[0];
    const mk = (name, type, arr) => doc.createAccessor(name).setType(type).setArray(arr).setBuffer(buffer);
    const prim = doc
        .createPrimitive()
        .setAttribute('POSITION', mk('POSITION', 'VEC3', P))
        .setAttribute('JOINTS_0', mk('JOINTS_0', 'VEC4', J))
        .setAttribute('WEIGHTS_0', mk('WEIGHTS_0', 'VEC4', W))
        .setIndices(mk('indices', 'SCALAR', I))
        .setMaterial(material);
    if (N) prim.setAttribute('NORMAL', mk('NORMAL', 'VEC3', N));
    if (U) prim.setAttribute('TEXCOORD_0', mk('TEXCOORD_0', 'VEC2', U));
    return { prim, tris: tris.length / 3 };
}

/* ───────────────────────── textures ───────────────────────── */

/**
 * Turn a painted skin texture into a shading map: pixel ÷ mean skin colour,
 * so `material.color = tone` reproduces the paint at any skin tone while the
 * baked lips/brows/shadows survive as relative detail.
 */
async function shadingMap(pngBytes, size = 512) {
    const img = sharp(Buffer.from(pngBytes)).removeAlpha().resize(size, size, { kernel: 'lanczos3' });
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    // mean over "skin-like" pixels: warm, not too dark (skips the underwear)
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 3) {
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const lum = (R + G + B) / 3;
        if (lum > 70 && R >= G && G >= B * 0.9) { r += R; g += G; b += B; n++; }
    }
    if (n === 0) throw new Error('shadingMap: no skin pixels found');
    r /= n; g /= n; b /= n;
    const K = 0.84; // headroom so highlights don't clip when tinted light
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += 3) {
        out[i] = Math.min(255, Math.round((data[i] / r) * K * 255));
        out[i + 1] = Math.min(255, Math.round((data[i + 1] / g) * K * 255));
        out[i + 2] = Math.min(255, Math.round((data[i + 2] / b) * K * 255));
    }
    return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
}

async function jpegResize(pngBytes, size, quality = 84) {
    return sharp(Buffer.from(pngBytes)).removeAlpha().resize(size, size, { kernel: 'lanczos3' }).jpeg({ quality, mozjpeg: true }).toBuffer();
}

function firstBaseColorImage(srcDoc, matName) {
    const mat = srcDoc.getRoot().listMaterials().find((m) => m.getName() === matName);
    const tex = mat?.getBaseColorTexture();
    return tex ? tex.getImage() : null;
}

/* ───────────────────────── compression ───────────────────────── */

/**
 * Meshopt everything, but leave POSITION unquantized: gltf-transform's
 * position quantization re-bakes inverse bind matrices per node, which
 * splits our single shared skin into one skin per part.
 */
async function compress(doc) {
    await doc.transform(
        reorder({ encoder: MeshoptEncoder, target: 'size' }),
        quantize({ pattern: /^(TEXCOORD|JOINTS|WEIGHTS|COLOR|NORMAL)(_\d+)?$/, quantizeNormal: 8, quantizeTexcoord: 12 }),
    );
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
}

/* ───────────────────────── build one vessel ───────────────────────── */

const isSkinMat = (name) => /Regular|Superhero/i.test(name) && !/Hair|Eye/i.test(name);

async function buildVessel(build) {
    const masc = build === 'masc';
    const doc = new Document();
    doc.createBuffer('vessel');
    const scene = doc.createScene('Vessel');

    // ── skeleton: the one the outfits + most hair were authored on ──
    const skelSrc = await read(masc ? 'outfits/Male_Peasant.glb' : 'characters/Superhero_Female.glb');
    const skelSkin = skelSrc.getRoot().listSkins()[0];
    const { skin, root, jointOrder } = copySkeleton(doc, skelSkin);
    scene.addChild(root);
    const targetBind = bindWorlds(skelSkin);

    /** rebind matrices for a mesh authored on another skeleton */
    const rebindFrom = (srcSkin) => {
        const src = ibms(srcSkin);
        const m = new Map();
        for (const [name, IBM] of src) {
            const B = targetBind.get(name);
            if (B) m.set(name, new THREE.Matrix4().multiplyMatrices(B, IBM));
        }
        return m;
    };
    /** did this file use the exact same skeleton? (skip rebind if so) */
    const sameSkeleton = (srcSkin) => {
        const a = srcSkin.getInverseBindMatrices().getArray();
        const b = skelSkin.getInverseBindMatrices().getArray();
        for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-4) return false;
        return true;
    };

    // ── materials ──
    const materials = new Map();
    const texture = (name, bytes, mime = 'image/jpeg') =>
        doc.createTexture(name).setImage(bytes).setMimeType(mime);
    const material = (name) => {
        if (!materials.has(name)) {
            const m = doc.createMaterial(name).setRoughnessFactor(0.85).setMetallicFactor(0);
            materials.set(name, m);
        }
        return materials.get(name);
    };
    let tris = 0;
    const addNode = (name, prims) => {
        const mesh = doc.createMesh(name);
        for (const p of prims) mesh.addPrimitive(p);
        const node = doc.createNode(name).setMesh(mesh).setSkin(skin);
        scene.addChild(node);
    };

    // ── head (cut from the base character), eyes, brows ──
    {
        const src = await read(masc ? 'characters/Superhero_Male.glb' : 'characters/Superhero_Female.glb');
        const sskin = src.getRoot().listSkins()[0];
        const rebind = sameSkeleton(sskin) ? null : rebindFrom(sskin);
        const meshes = src.getRoot().listMeshes();
        // classify by material of the first primitive
        for (const m of meshes) {
            const prim0 = m.listPrimitives()[0];
            const matName = prim0.getMaterial()?.getName() || '';
            if (/Eye/i.test(matName)) {
                const eyeMat = material('eyes');
                if (!eyeMat.getBaseColorTexture()) {
                    const img = firstBaseColorImage(src, matName);
                    if (img) eyeMat.setBaseColorTexture(texture('eyes', await jpegResize(img, 256))).setRoughnessFactor(0.35);
                }
                const out = [];
                for (const p of m.listPrimitives()) { const r = copyPrimitive(doc, p, { material: eyeMat, rebind, jointOrder }); out.push(r.prim); tris += r.tris; }
                addNode('eyes', out);
            } else if (/Hair/i.test(matName)) {
                const out = [];
                for (const p of m.listPrimitives()) { const r = copyPrimitive(doc, p, { material: material('hair'), rebind, jointOrder }); out.push(r.prim); tris += r.tris; }
                addNode('brows', out);
            } else {
                // the body: keep only what the outfits leave bare — head + neck
                const skinMat = material('skin_head');
                if (!skinMat.getBaseColorTexture()) {
                    const img = firstBaseColorImage(src, matName);
                    skinMat.setBaseColorTexture(texture('skin_head', await shadingMap(img, 512))).setRoughnessFactor(0.72);
                }
                const out = [];
                for (const p of m.listPrimitives()) {
                    const r = copyPrimitive(doc, p, {
                        material: skinMat,
                        rebind,
                        jointOrder,
                        keepVertex: (w) => (w.Head || 0) + (w.neck_01 || 0) + (w.spine_03 || 0) * 0.35 >= 0.22,
                    });
                    out.push(r.prim);
                    tris += r.tris;
                }
                addNode('head', out);
            }
        }
    }

    // ── outfits ──
    const outfits = masc
        ? [['peasant', 'outfits/Male_Peasant.glb'], ['ranger', 'outfits/Male_Ranger.glb']]
        : [['peasant', 'outfits/Female_Peasant.glb'], ['ranger', 'outfits/Female_Ranger.glb']];
    for (const [id, rel] of outfits) {
        const src = await read(rel);
        const sskin = src.getRoot().listSkins()[0];
        const rebind = sameSkeleton(sskin) ? null : rebindFrom(sskin);
        const hasSkinPrim = src.getRoot().listMaterials().some((mm) => isSkinMat(mm.getName()));
        for (const m of src.getRoot().listMeshes()) {
            // "Male_Ranger_Arms_Bracer" → "arms_bracer"; "Female_Peasant_Body" → "body"
            const part = m.getName().replace(/^(Male|Female)_(Peasant|Ranger)_?/i, '').toLowerCase() || 'part';
            const out = [];
            for (const p of m.listPrimitives()) {
                const matName = p.getMaterial()?.getName() || '';
                let mat;
                if (!hasSkinPrim && /arms/i.test(part)) {
                    // Hands are painted into the cloth atlas here (female peasant):
                    // split them off so they can still take the soul's skin tone.
                    const isHand = (w) => {
                        let h = 0;
                        for (const [k, v] of Object.entries(w)) if (/^(hand|index|middle|ring|pinky|thumb)_/.test(k)) h += v;
                        return h;
                    };
                    const cloth = material(`cloth_${id}`);
                    if (!cloth.getBaseColorTexture()) {
                        const img = firstBaseColorImage(src, matName);
                        if (img) cloth.setBaseColorTexture(texture(`cloth_${id}`, await jpegResize(img, 512)));
                    }
                    const flat = material('skin_flat').setRoughnessFactor(0.72).setBaseColorFactor([0.84, 0.84, 0.84, 1]);
                    const rc = copyPrimitive(doc, p, { material: cloth, rebind, jointOrder, keepVertex: (w) => isHand(w) < 0.5 });
                    const rh = copyPrimitive(doc, p, { material: flat, rebind, jointOrder, keepVertex: (w) => isHand(w) >= 0.5 });
                    out.push(rc.prim, rh.prim);
                    tris += rc.tris + rh.tris;
                    continue;
                }
                if (isSkinMat(matName)) {
                    mat = material('skin_hands');
                    if (!mat.getBaseColorTexture()) {
                        const img = firstBaseColorImage(src, matName);
                        mat.setBaseColorTexture(texture('skin_hands', await shadingMap(img, 512))).setRoughnessFactor(0.72);
                    }
                } else {
                    mat = material(`cloth_${id}`);
                    if (!mat.getBaseColorTexture()) {
                        const img = firstBaseColorImage(src, matName);
                        if (img) mat.setBaseColorTexture(texture(`cloth_${id}`, await jpegResize(img, 512)));
                    }
                }
                const r = copyPrimitive(doc, p, { material: mat, rebind, jointOrder });
                out.push(r.prim);
                tris += r.tris;
            }
            addNode(`outfit_${id}_${part}`, out);
        }
    }

    // ── hair ──
    const hairs = masc
        ? [['buzzed', 'hair/Hair_Buzzed.glb'], ['parted', 'hair/Hair_SimpleParted.glb'], ['beard', 'hair/Hair_Beard.glb'], ['buns', 'hair/Hair_Buns.glb'], ['long', 'hair/Hair_Long.glb']]
        : [['buzzed', 'hair/Hair_BuzzedFemale.glb'], ['parted', 'hair/Hair_SimpleParted.glb'], ['buns', 'hair/Hair_Buns.glb'], ['long', 'hair/Hair_Long.glb']];
    for (const [id, rel] of hairs) {
        const src = await read(rel);
        const sskin = src.getRoot().listSkins()[0];
        const rebind = sameSkeleton(sskin) ? null : rebindFrom(sskin);
        const out = [];
        for (const m of src.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
            const r = copyPrimitive(doc, p, { material: material('hair'), rebind, jointOrder });
            out.push(r.prim);
            tris += r.tris;
        }
        addNode(`hair_${id}`, out);
    }
    material('hair').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.6);

    doc.getRoot().setExtras({ build, source: 'Quaternius (CC0) via moorfall-assets', tris });
    await doc.transform(dedup(), prune());
    await compress(doc);
    const file = path.join(OUT, `vessel_${build}.glb`);
    await io.write(file, doc);
    console.log(`  ${path.basename(file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${tris} tris across all parts`);
}

/* ───────────────────────── animations ───────────────────────── */

async function buildAnims() {
    const doc = new Document();
    doc.createBuffer('anims');
    const scene = doc.createScene('VesselAnims');
    const src1 = await read('animations/UAL1.glb');
    const src2 = await read('animations/UAL2.glb');
    const { skin, root, joints } = copySkeleton(doc, src1.getRoot().listSkins()[0]);
    scene.addChild(root);
    // the runtime scales pelvis height per build from this
    const pelvisBind = bindWorlds(src1.getRoot().listSkins()[0]).get('pelvis');
    const pelvisRestY = new THREE.Vector3().setFromMatrixPosition(pelvisBind).y;
    doc.getRoot().setExtras({ pelvisRestY, clips: CLIPS });

    const buffer = doc.getRoot().listBuffers()[0];
    let count = 0;
    for (const src of [src1, src2]) {
        for (const anim of src.getRoot().listAnimations()) {
            if (!CLIPS.includes(anim.getName())) continue;
            const a = doc.createAnimation(anim.getName());
            const samplerCache = new Map();
            for (const ch of anim.listChannels()) {
                const path = ch.getTargetPath();
                const name = ch.getTargetNode().getName();
                if (path === 'scale') continue;
                if (path === 'translation' && name !== 'pelvis') continue; // rotation-only retarget
                const target = joints.get(name);
                if (!target) continue;
                const s = ch.getSampler();
                let sampler = samplerCache.get(s);
                if (!sampler) {
                    const inp = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput().getArray())).setBuffer(buffer);
                    const outp = doc.createAccessor().setType(s.getOutput().getType()).setArray(new Float32Array(s.getOutput().getArray())).setBuffer(buffer);
                    sampler = doc.createAnimationSampler().setInput(inp).setOutput(outp).setInterpolation(s.getInterpolation());
                    samplerCache.set(s, sampler);
                    a.addSampler(sampler);
                }
                a.addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(sampler));
            }
            count++;
        }
    }
    // keep the skin so the file validates as a rig (no mesh needed)
    void skin;
    await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true }));
    await compress(doc);
    const file = path.join(OUT, 'vessel_anims.glb');
    await io.write(file, doc);
    console.log(`  ${path.basename(file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${count} clips`);
}

/* ───────────────────────── main ───────────────────────── */

async function main() {
    console.log('vessels ▸ fetching CC0 sources');
    await fetchAll();
    await MeshoptEncoder.ready;
    console.log('vessels ▸ building');
    await buildVessel('masc');
    await buildVessel('fem');
    await buildAnims();
    // the old bone-parented blockouts are superseded
    for (const old of ['vessel_man.glb', 'vessel_woman.glb']) {
        const f = path.join(OUT, old);
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    console.log('vessels ▸ done');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
