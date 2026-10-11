/**
 * Pull curated CC0 models out of Kenney's kits into public/models/kenney/<kit>/.
 *
 * Kenney (kenney.nl) publishes every kit under Creative Commons Zero — no
 * attribution required, redistribution permitted. The kits are zips with a
 * "Models/GLB format" (or "Models/GLTF format") folder; this script downloads
 * a kit once into scratch/kenney (gitignored), unzips it in-process, and
 * copies ONLY the models the scene actually asks for, alongside the kit's own
 * License.txt.
 *
 *   node scripts/fetch-kenney.mjs            copy every model in KITS below
 *   node scripts/fetch-kenney.mjs --list     print each kit's GLB inventory
 *
 * Kenney's CDN answers non-browser clients with 403, so the page fetch and
 * the zip download both carry a browser User-Agent.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CACHE = path.join(ROOT, 'scratch', 'kenney');
const OUT = path.join(ROOT, 'public', 'models', 'kenney');
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

/**
 * kit slug (kenney.nl/assets/<slug>) → models to keep. Names are the GLB
 * basenames inside the kit's model folder (run --list to see them). Keep
 * this list tight: every file here is committed and served.
 */
const KITS = {
    'fantasy-town-kit': [
        'lantern', 'banner-green', 'banner-red', 'stall', 'stall-bench', 'stall-green', 'stall-red', 'stall-stool',
        'pillar-stone', 'pillar-wood', 'wall-arch', 'wall-arch-top', 'wall-doorway-round', 'wall-half', 'wall-block',
        'wall-broken', 'fountain-round', 'fountain-round-detail', 'fountain-center', 'cart', 'cart-high', 'wheel',
        'planks', 'planks-half', 'poles', 'poles-horizontal', 'hedge', 'hedge-curved', 'rock-large', 'rock-small',
        'rock-wide', 'tree', 'tree-crooked', 'tree-high', 'tree-high-round', 'fence', 'fence-gate', 'fence-curved',
        'fence-broken', 'stairs-stone', 'stairs-stone-handrail', 'blade', 'windmill', 'overhang', 'chimney',
    ],
    'castle-kit': [
        'flag', 'flag-banner-long', 'flag-banner-short', 'flag-pennant', 'flag-wide', 'bridge-straight',
        'bridge-straight-pillar', 'bridge-draw', 'tower-square-base', 'tower-square-mid', 'tower-square-mid-windows',
        'tower-square-top', 'tower-square-top-roof', 'tower-square-top-roof-high', 'tower-hexagon-base',
        'tower-hexagon-mid', 'tower-hexagon-top', 'tower-hexagon-roof', 'wall-pillar', 'wall-narrow',
        'wall-narrow-stairs', 'wall-half', 'wall-corner', 'rocks-large', 'rocks-small', 'tree-large', 'tree-small',
        'tree-log', 'tree-trunk', 'gate', 'metal-gate', 'door', 'stairs-stone', 'stairs-stone-square',
    ],
    'survival-kit': [
        'barrel', 'barrel-open', 'bedroll', 'bedroll-frame', 'bedroll-packed', 'bottle', 'bottle-large', 'box',
        'box-large', 'box-large-open', 'box-open', 'bucket', 'campfire-pit', 'campfire-stand',
        'campfire-fishing-stand', 'chest', 'fence', 'fence-doorway', 'fence-fortified', 'floor', 'floor-old',
        'grass', 'grass-large', 'patch-grass', 'patch-grass-large', 'resource-planks', 'resource-stone',
        'resource-stone-large', 'resource-wood', 'rock-a', 'rock-b', 'rock-c', 'rock-flat', 'rock-flat-grass',
        'signpost', 'signpost-single', 'structure', 'structure-canvas', 'structure-floor', 'structure-roof',
        'tent', 'tent-canvas', 'tent-canvas-half', 'tool-axe', 'tool-hammer', 'tool-pickaxe', 'tool-shovel',
        'tree', 'tree-tall', 'tree-autumn', 'tree-autumn-tall', 'tree-log', 'tree-log-small', 'tree-trunk',
        'workbench', 'workbench-anvil', 'workbench-grind',
    ],
    'platformer-kit': [
        'jewel', 'star', 'heart', 'key', 'lock', 'coin-gold', 'coin-silver', 'coin-bronze', 'chest', 'crate',
        'crate-item', 'crate-strong', 'flag', 'spring', 'lever', 'button-round', 'sign', 'arrow', 'arrows',
        'door-rotate', 'mushrooms', 'flowers', 'flowers-tall', 'plant', 'hedge', 'rocks', 'stones', 'grass',
        'ladder', 'platform', 'barrel', 'bomb',
    ],
    'food-kit': [
        'apple', 'apple-half', 'avocado', 'banana', 'bread', 'loaf', 'loaf-baguette', 'loaf-round', 'cheese',
        'cheese-cut', 'cherries', 'grapes', 'pear', 'orange', 'lemon', 'strawberry', 'watermelon', 'pumpkin',
        'pumpkin-basic', 'tomato', 'carrot', 'onion', 'broccoli', 'cabbage', 'corn', 'leek', 'paprika', 'eggplant',
        'mushroom', 'honey', 'pie', 'cake', 'cupcake', 'muffin', 'cookie', 'croissant', 'donut', 'pizza', 'sandwich',
        'bowl', 'bowl-soup', 'bowl-broth', 'bowl-cereal', 'plate', 'plate-dinner', 'plate-deep', 'cup', 'cup-coffee',
        'cup-tea', 'cup-saucer', 'mug', 'glass', 'glass-wine', 'wine-red', 'wine-white', 'bottle-oil',
        'bottle-ketchup', 'pepper-mill', 'shaker-salt', 'shaker-pepper', 'knife-block', 'cutting-board',
        'cutting-board-round', 'cooking-knife', 'cooking-spoon', 'cooking-spatula', 'frying-pan', 'frying-pan-lid',
        'pot', 'pot-lid', 'pot-stew', 'pan', 'pan-stew', 'utensil-fork', 'utensil-knife', 'utensil-spoon', 'whisk',
        'rollingPin', 'mortar-pestle', 'egg', 'egg-cup', 'fish', 'meat-ribs', 'turkey', 'salad', 'tajine',
        'tajine-lid', 'steamer',
    ],
    'nature-kit': [
        'cliff_block_rock', 'cliff_block_stone', 'cliff_cornerLarge_rock', 'cliff_cornerLarge_stone',
        'cliff_large_rock', 'cliff_large_stone', 'cliff_rock', 'cliff_stone', 'cliff_top_rock', 'cliff_top_stone',
        'cliff_half_rock', 'cliff_half_stone', 'cliff_halfCorner_rock', 'cliff_halfCorner_stone',
        'rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD', 'rock_largeE', 'rock_largeF',
        'rock_smallB', 'rock_smallC', 'rock_smallD', 'rock_smallE', 'rock_smallF', 'rock_smallFlatA',
        'rock_smallFlatB', 'rock_smallFlatC', 'rock_smallTopA', 'rock_smallTopB', 'rock_tallA', 'rock_tallB',
        'rock_tallC', 'rock_tallD', 'rock_tallE', 'rock_tallF', 'rock_tallG', 'rock_tallH', 'rock_tallI', 'rock_tallJ',
        'stone_largeA', 'stone_largeB', 'stone_largeC', 'stone_largeD', 'stone_largeE', 'stone_largeF',
        'stone_tallA', 'stone_tallB', 'stone_tallC', 'stone_tallD', 'stone_tallE', 'stone_tallF', 'stone_tallG',
        'stone_tallH', 'stone_tallI', 'stone_tallJ', 'stump_old', 'stump_oldTall', 'stump_round',
        'stump_roundDetailed', 'stump_square', 'stump_squareDetailed', 'stump_squareDetailedWide',
        'mushroom_red', 'mushroom_redGroup', 'mushroom_redTall', 'mushroom_tan', 'mushroom_tanGroup',
        'mushroom_tanTall', 'tree_pineDefaultA', 'tree_pineDefaultB', 'tree_pineRoundA', 'tree_pineRoundB',
        'tree_pineRoundC', 'tree_pineRoundD', 'tree_pineRoundE', 'tree_pineRoundF', 'tree_pineTallA',
        'tree_pineTallB', 'tree_pineTallC', 'tree_pineTallD', 'tree_pineSmallA', 'tree_pineSmallB',
        'tree_pineSmallC', 'tree_pineSmallD', 'tree_palm', 'tree_palmBend', 'tree_palmDetailedShort',
        'tree_palmDetailedTall', 'tree_palmShort', 'tree_palmTall', 'tree_blocks', 'tree_blocks_dark',
        'tree_blocks_fall', 'tree_cone', 'tree_cone_dark', 'tree_cone_fall', 'tree_detailed_dark',
        'tree_detailed_fall', 'tree_default_dark', 'tree_default_fall', 'tree_fat_dark', 'tree_fat_fall',
        'tree_oak_dark', 'tree_oak_fall', 'tree_plateau', 'tree_plateau_dark', 'tree_plateau_fall', 'tree_simple',
        'tree_simple_dark', 'tree_simple_fall', 'tree_small', 'tree_small_dark', 'tree_small_fall', 'tree_tall',
        'tree_tall_dark', 'tree_tall_fall', 'tree_thin', 'tree_thin_dark', 'tree_thin_fall', 'plant_flatShort',
        'plant_flatTall', 'lily_large', 'lily_small', 'lily_flower', 'tent_detailedClosed', 'tent_detailedOpen',
        'tent_smallClosed', 'tent_smallOpen', 'sign', 'statue_block', 'statue_column', 'statue_columnDamaged',
        'statue_head', 'statue_obelisk', 'statue_ring', 'bed_floor', 'bed_floor_old', 'bed_floor_decorated',
        'crops_bambooStageA', 'crops_bambooStageB', 'crops_cornStageA', 'crops_cornStageB', 'crops_cornStageC',
        'crops_cornStageD', 'crops_dillStageA', 'crops_leafStageA', 'crops_wheatStageA', 'crops_wheatStageB',
        'hanging_moss', 'log', 'log_large', 'log_stackLarge', 'path_stone', 'path_stoneCircle', 'path_stoneCorner',
        'path_stoneEnd', 'path_wood', 'path_woodCorner', 'path_woodStraight', 'ground_grass', 'ground_pathBend',
        'ground_pathCross', 'ground_pathEnd', 'ground_pathSplit', 'ground_pathStraight', 'ground_riverStraight',
        'ground_riverBend', 'ground_riverCross', 'canoe', 'canoe_paddle', 'cactus_short', 'cactus_tall',
        'bridge_center_stone', 'bridge_center_wood', 'bridge_side_stone', 'bridge_side_wood', 'bridge_stone',
        'bridge_stoneNarrow', 'bridge_stoneRound', 'bridge_stoneRoundNarrow', 'bridge_wood', 'bridge_woodNarrow',
        'bridge_woodRound', 'bridge_woodRoundNarrow', 'campfire_bricks', 'campfire_planks', 'campfire_stones',
        'fence_bend', 'fence_bendCenter', 'fence_planks', 'fence_planksDouble', 'fence_simpleCenter',
        'fence_simpleDiagonal', 'fence_simpleHigh', 'fence_simpleLow',
    ],
};

const listOnly = process.argv.includes('--list');

async function fetchUA(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
    if (!res.ok) throw new Error(`${res.status} on ${url}`);
    return res;
}

async function zipFor(slug) {
    mkdirSync(CACHE, { recursive: true });
    const dest = path.join(CACHE, `${slug}.zip`);
    if (existsSync(dest) && statSync(dest).size > 100_000) return dest;
    const page = await (await fetchUA(`https://kenney.nl/assets/${slug}`)).text();
    const m = page.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"']+?\.zip/);
    if (!m) throw new Error(`no zip link on the ${slug} page`);
    process.stdout.write(`  ↓ ${slug} … `);
    const res = await fetchUA(m[0]);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    console.log(`${(statSync(dest).size / 1048576).toFixed(1)} MB`);
    return dest;
}

/**
 * Minimal zip reader — central directory → local headers → inflateRaw.
 * Kenney's archives are plain deflate/store, well under 4 GB, so no
 * Zip64 or encryption handling is needed here.
 */
function readZip(file) {
    const buf = readFileSync(file);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70_000); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) throw new Error('not a zip: no end-of-central-directory');
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const entries = new Map();
    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
        const method = buf.readUInt16LE(p + 10);
        const csize = buf.readUInt32LE(p + 20);
        const usize = buf.readUInt32LE(p + 24);
        const nlen = buf.readUInt16LE(p + 28);
        const elen = buf.readUInt16LE(p + 30);
        const clen = buf.readUInt16LE(p + 32);
        const off = buf.readUInt32LE(p + 42);
        const name = buf.toString('utf8', p + 46, p + 46 + nlen).replace(/\\/g, '/');
        entries.set(name, { method, csize, usize, off });
        p += 46 + nlen + elen + clen;
    }
    const read = (name) => {
        const e = entries.get(name);
        if (!e) return null;
        const h = e.off;
        if (buf.readUInt32LE(h) !== 0x04034b50) throw new Error(`bad local header for ${name}`);
        const nlen = buf.readUInt16LE(h + 26);
        const elen = buf.readUInt16LE(h + 28);
        const start = h + 30 + nlen + elen;
        const data = buf.subarray(start, start + e.csize);
        if (e.method === 0) return Buffer.from(data);
        if (e.method === 8) return inflateRawSync(data);
        throw new Error(`unsupported zip method ${e.method} for ${name}`);
    };
    return { names: [...entries.keys()], read };
}

function glbIndex(zip) {
    // "Models/GLB format/foo.glb" (most kits) or "Models/GLTF format/foo.glb" (Nature Kit)
    const idx = new Map();
    for (const n of zip.names) {
        const m = n.match(/(?:^|\/)Models\/(?:GLB|GLTF)(?: format)?\/([^/]+)\.glb$/i);
        if (m) idx.set(m[1], n);
    }
    return idx;
}

/**
 * The newer kits (Fantasy Town, Castle, Survival, Platformer, Food) paint
 * every model from ONE shared atlas referenced as "Textures/colormap.png"
 * beside the GLBs — the GLB itself carries no image. Without the atlas
 * next to the copied models the loader 404s and the kit renders grey.
 */
function textureEntries(zip) {
    const out = new Map();
    for (const n of zip.names) {
        const m = n.match(/(?:^|\/)Models\/(?:GLB|GLTF)(?: format)?\/(Textures\/[^/]+\.(?:png|jpg))$/i);
        if (m) out.set(m[1], n);
    }
    return out;
}

function licenseEntry(zip) {
    return zip.names.find((n) => /(^|\/)License\.txt$/i.test(n)) || null;
}

async function main() {
    const slugs = Object.keys(KITS);
    const report = [];
    for (const slug of slugs) {
        const zipPath = await zipFor(slug);
        const zip = readZip(zipPath);
        const idx = glbIndex(zip);
        if (listOnly) {
            console.log(`\n── ${slug}: ${idx.size} GLB models`);
            console.log('   ' + [...idx.keys()].sort().join(', '));
            continue;
        }
        const dir = path.join(OUT, slug);
        mkdirSync(dir, { recursive: true });
        const lic = licenseEntry(zip);
        if (lic) writeFileSync(path.join(dir, 'LICENSE.txt'), zip.read(lic));
        for (const [rel, entry] of textureEntries(zip)) {
            const dest = path.join(dir, rel);
            mkdirSync(path.dirname(dest), { recursive: true });
            if (!existsSync(dest)) writeFileSync(dest, zip.read(entry));
        }
        let copied = 0;
        const missing = [];
        for (const name of KITS[slug]) {
            const entry = idx.get(name);
            if (!entry) {
                missing.push(name);
                continue;
            }
            const dest = path.join(dir, `${name}.glb`);
            if (!existsSync(dest)) {
                writeFileSync(dest, zip.read(entry));
                copied++;
            }
        }
        report.push(`${slug}: ${KITS[slug].length - missing.length} models (${copied} new)` +
            (missing.length ? ` · not in kit: ${missing.join(', ')}` : ''));
    }
    if (!listOnly) {
        console.log('\n' + report.join('\n'));
        console.log(`\nmodels → ${path.relative(ROOT, OUT)}/<kit>/  (CC0, each with its License.txt)`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
