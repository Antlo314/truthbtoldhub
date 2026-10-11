/**
 * Cap every Poly Haven map at 1k and re-encode with mozjpeg.
 *
 * The fetch script takes 2k for hero surfaces, which is right for a close
 * look at one floor and wrong for sixty files a first-time visitor has to
 * pull before the room stops being procedural. On the web the memory
 * ceiling is the GPU's, not the disk's: a 2k map is 16 MB of VRAM each.
 * 1k at q82 keeps the grain and loses nothing at walking distance.
 *
 *   node scripts/optimize-textures.mjs            (idempotent — skips files already ≤ 1k)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'public', 'textures', 'polyhaven');
const MAX = 1024;

const quality = (name) => (/_nor\./.test(name) ? 86 : /_rough\./.test(name) ? 76 : 82);

let before = 0;
let after = 0;
for (const f of readdirSync(DIR)) {
    if (!/\.jpe?g$/i.test(f)) continue;
    const file = path.join(DIR, f);
    const src = readFileSync(file);
    before += src.length;
    const meta = await sharp(src).metadata();
    const big = (meta.width ?? 0) > MAX || (meta.height ?? 0) > MAX;
    let img = sharp(src);
    if (big) img = img.resize({ width: MAX, height: MAX, fit: 'inside', kernel: 'lanczos3' });
    const out = await img.jpeg({ quality: quality(f), mozjpeg: true, chromaSubsampling: /_diff\./.test(f) ? '4:2:0' : '4:4:4' }).toBuffer();
    // Never make a file bigger; never recompress a small one for nothing
    if (out.length < src.length * 0.97 || big) {
        writeFileSync(file, out);
        after += out.length;
        console.log(`  ${f.padEnd(28)} ${meta.width}px → ${big ? MAX : meta.width}px  ${(src.length / 1024).toFixed(0)} → ${(out.length / 1024).toFixed(0)} KB`);
    } else {
        after += src.length;
    }
}
console.log(`\n${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB  (${path.relative(process.cwd(), DIR)})`);
void statSync;
