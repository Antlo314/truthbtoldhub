/**
 * Pull a curated CC0 PBR set from Poly Haven into public/textures/polyhaven.
 *
 * Poly Haven is CC0 (no attribution required, commercial use fine) and has a
 * public API: https://api.polyhaven.com/files/<slug> lists every map at every
 * resolution. We take 1k JPGs — diffuse, normal (GL), roughness — which is
 * the sweet spot for a web scene: ~200-400 KB per map.
 *
 * Run: node scripts/fetch-polyhaven.mjs
 * Re-runs skip files that already exist, so it costs nothing to repeat.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'textures', 'polyhaven');

/**
 * slug → the house material it upgrades. First slug that exists wins.
 * `res` bumps a set to 2k — reserved for hero surfaces the camera lives
 * close to (floors, walls); everything else stays 1k.
 */
const WANTED = [
    { key: 'woodFloor', slugs: ['wood_floor_deck', 'wood_floor'], res: '2k' },
    { key: 'woodDark', slugs: ['dark_wood', 'wood_planks_dirt'] },
    { key: 'plaster', slugs: ['painted_plaster_wall', 'plastered_wall'], res: '2k' },
    { key: 'stone', slugs: ['stone_brick_wall_001', 'castle_brick_02_red'] },
    { key: 'fabric', slugs: ['fabric_pattern_07', 'fabric_pattern_05'] },
    { key: 'leather', slugs: ['brown_leather', 'leather_red_02'] },
    { key: 'rug', slugs: ['fabric_pattern_05', 'floral_jacquard'] },
    { key: 'carpet', slugs: ['curly_teddy_natural', 'fabric_pattern_07'] },
    { key: 'marble', slugs: ['marble_01', 'marble_0008'], res: '2k' },
    { key: 'grass', slugs: ['grass_medium_01', 'aerial_grass_rock'] },
    { key: 'path', slugs: ['stone_tiles_02', 'cobblestone_floor_04'] },
    { key: 'dirt', slugs: ['brown_mud_leaves_01', 'dirt_aerial_03'] },
    { key: 'tile', slugs: ['kitchen_wood_tiles', 'large_grey_tiles'] },
    { key: 'concrete', slugs: ['concrete_wall_004', 'concrete_floor_02'] },

    /* ── the 10x wave: one DISTINCT set per surface family, so the eye
       stops meeting the same texture wearing different tints. All slugs
       verified against api.polyhaven.com/assets?type=textures. ── */
    // Dining + living hero floor
    { key: 'woodHerring', slugs: ['herringbone_parquet', 'diagonal_parquet'], res: '2k' },
    // Furniture timber — distinct from the dark structural wood
    { key: 'oak', slugs: ['oak_veneer_01', 'oak_veneer_02'] },
    // Kitchen counters + island top
    { key: 'counter', slugs: ['terrazzo_tiles', 'granite_tile_02'] },
    // Bath + ensuite walls
    { key: 'ceramic', slugs: ['square_tiles_02', 'square_tiled_wall'] },
    // Bedding + curtains
    { key: 'linen', slugs: ['rough_linen', 'waffle_pique_cotton'] },
    // Sofas — soft bouclé, distinct from the patterned fabric
    { key: 'wool', slugs: ['wool_boucle', 'poly_wool_herringbone'] },
    // Jungle trunks — the flat brown cylinders were the loudest fake outdoors
    { key: 'bark', slugs: ['bark_brown_01', 'bark_willow'] },
    // The forest band beyond the clearing edge
    { key: 'forestFloor', slugs: ['forest_floor', 'forest_ground_04'] },
    { key: 'basalt', slugs: ['rock_boulder_cracked', 'rough_block_wall'] },
    { key: 'goldMetal', slugs: ['metal_plate', 'gold'] },
];

const MAPS = [
    ['Diffuse', 'diff'],
    ['nor_gl', 'nor'],
    ['Rough', 'rough'],
];

async function exists(p) {
    try {
        await access(p);
        return true;
    } catch {
        return false;
    }
}

async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
}

async function grab(url, dest) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} on ${url}`);
    await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

await mkdir(OUT, { recursive: true });
const manifest = {};

for (const want of WANTED) {
    let done = false;
    for (const slug of want.slugs) {
        const files = await fetchJson(`https://api.polyhaven.com/files/${slug}`);
        if (!files) continue;
        const got = {};
        // Hero surfaces take 2k; fall back to 1k when a set has no 2k jpg.
        const res = want.res ?? '1k';
        try {
            for (const [apiName, short] of MAPS) {
                // Fabric assets publish colour as col_1/col_2 instead of Diffuse
                const key =
                    apiName === 'Diffuse'
                        ? ['Diffuse', 'col_1', 'col_2', 'col_01', 'col_03'].find(
                              (k) => files[k]?.[res] ?? files[k]?.['1k'],
                          ) ?? 'Diffuse'
                        : apiName;
                const node =
                    files[key]?.[res]?.jpg ?? files[key]?.[res]?.png ??
                    files[key]?.['1k']?.jpg ?? files[key]?.['1k']?.png;
                if (!node?.url) {
                    if (apiName === 'Diffuse') throw new Error(`no diffuse for ${slug}`);
                    continue; // normal/rough are nice-to-have
                }
                const ext = node.url.split('.').pop();
                const dest = path.join(OUT, `${want.key}_${short}.${ext}`);
                if (!(await exists(dest))) {
                    await grab(node.url, dest);
                    console.log(`  ✓ ${want.key} ${short} ← ${slug} (${Math.round(node.size / 1024)} KB)`);
                } else {
                    console.log(`  · ${want.key} ${short} exists`);
                }
                got[short] = `/textures/polyhaven/${want.key}_${short}.${ext}`;
            }
            manifest[want.key] = { slug, maps: got };
            done = true;
            break;
        } catch (e) {
            console.warn(`  ✗ ${slug}: ${e.message}`);
        }
    }
    if (!done) console.warn(`MISSING: ${want.key} — no candidate slug resolved`);
}

await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
);
console.log(`\nmanifest → public/textures/polyhaven/manifest.json (${Object.keys(manifest).length} sets)`);
