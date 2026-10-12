/**
 * Pull curated CC0 2D sprites out of Kenney's packs into public/assets/kenney/<pack>/.
 *
 * Same contract as fetch-kenney.mjs (the 3D kits): a pack is downloaded once
 * into scratch/kenney (gitignored), read in-process, and ONLY the files named
 * in PACKS are copied out, beside the pack's own License.txt.
 *
 *   node scripts/fetch-kenney-2d.mjs            copy every file in PACKS
 *   node scripts/fetch-kenney-2d.mjs --list     print each pack's PNG inventory
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
const OUT = path.join(ROOT, 'public', 'assets', 'kenney');
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

/**
 * pack slug → { size, files }. Each file is `{ from: <path in zip>, to: <served name> }`.
 * `size` (px) downsizes square sprites with sharp so the arcade never ships a
 * 512px particle to draw at 24px. The arcade reads these by their served
 * names (lib/game/arcadeSprites.ts), so renaming one here means renaming it there.
 */
const P = (from, to) => ({ from, to });
export const PACKS = {
    'particle-pack': {
        size: 128,
        files: [
            P('PNG (Transparent)/circle_02.png', 'ring.png'),
            P('PNG (Transparent)/circle_05.png', 'glow.png'),
            P('PNG (Transparent)/flare_01.png', 'flare.png'),
            P('PNG (Transparent)/magic_03.png', 'rune.png'),
            P('PNG (Transparent)/magic_05.png', 'burst.png'),
            P('PNG (Transparent)/star_06.png', 'sparkle.png'),
            P('PNG (Transparent)/star_08.png', 'glint.png'),
            P('PNG (Transparent)/star_09.png', 'nova.png'),
            P('PNG (Transparent)/spark_05.png', 'bolt.png'),
            P('PNG (Transparent)/twirl_01.png', 'arc.png'),
            P('PNG (Transparent)/light_01.png', 'halo.png'),
            P('PNG (Transparent)/smoke_04.png', 'smoke.png'),
        ],
    },
    'puzzle-pack-2': {
        size: 128,
        files: [
            P('PNG/Tiles grey/tileGrey_01.png', 'block.png'),
            P('PNG/Tiles grey/tileGrey_04.png', 'diamond.png'),
            P('PNG/Tiles grey/tileGrey_08.png', 'star4.png'),
            P('PNG/Tiles grey/tileGrey_09.png', 'star.png'),
            P('PNG/Tiles grey/tileGrey_10.png', 'gem.png'),
            P('PNG/Tiles grey/tileGrey_11.png', 'orb.png'),
            P('PNG/Tiles grey/tileGrey_12.png', 'heart.png'),
            P('PNG/Coins/coin_06.png', 'coin.png'),
        ],
    },
    'simple-space': {
        size: 96,
        files: [P('PNG/Retina/ship_F.png', 'ship.png')],
    },
    'game-icons': {
        size: 96,
        files: [
            P('PNG/White/2x/trophy.png', 'trophy.png'),
            P('PNG/White/2x/medal1.png', 'medal.png'),
            P('PNG/White/2x/leaderboardsComplex.png', 'podium.png'),
        ],
    },
};

const listOnly = process.argv.includes('--list');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

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

function readZip(file) {
    const buf = readFileSync(file);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70_000); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip: no end-of-central-directory');
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const entries = new Map();
    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
        const method = buf.readUInt16LE(p + 10);
        const csize = buf.readUInt32LE(p + 20);
        const nlen = buf.readUInt16LE(p + 28);
        const elen = buf.readUInt16LE(p + 30);
        const clen = buf.readUInt16LE(p + 32);
        const off = buf.readUInt32LE(p + 42);
        const name = buf.toString('utf8', p + 46, p + 46 + nlen).split(String.fromCharCode(92)).join('/');
        entries.set(name, { method, csize, off });
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

const sharp = (await import('sharp')).default;
for (const [slug, pack] of Object.entries(PACKS)) {
    if (only && slug !== only) continue;
    const zip = readZip(await zipFor(slug));
    if (listOnly) {
        console.log(`
== ${slug} (${zip.names.length} entries)`);
        for (const n of zip.names) if (/.(png|svg)$/i.test(n)) console.log('  ' + n);
        continue;
    }
    const dir = path.join(OUT, slug);
    mkdirSync(dir, { recursive: true });
    const lic = zip.names.find((n) => /licen[cs]e.txt$/i.test(n));
    if (lic) writeFileSync(path.join(dir, 'License.txt'), zip.read(lic));
    let n = 0;
    for (const { from, to } of pack.files) {
        const data = zip.read(from);
        if (!data) { console.warn(`  ! ${slug}: ${from} not in pack`); continue; }
        const out = pack.size
            ? await sharp(data).resize(pack.size, pack.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer()
            : data;
        writeFileSync(path.join(dir, to), out);
        n++;
    }
    console.log(`  ✓ ${slug}: ${n} files → public/assets/kenney/${slug}/`);
}
