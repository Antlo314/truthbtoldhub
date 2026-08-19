/**
 * The grove must not grow through itself.
 *
 * Imports the SAME module Grove.tsx renders from, so a passing check and
 * a clean scene cannot disagree. Reports the closest pairs either way,
 * because "no clashes" is only meaningful next to how much room is
 * actually left.
 *
 *   node --experimental-strip-types scripts/validate-grove.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOUSE = join(HERE, '..', 'components', 'truthos', 'house');
const DEPS = ['groveScatter.ts', 'homeMap.ts', 'jungleMap.ts', 'houseMap.ts'];

const tmp = mkdtempSync(join(tmpdir(), 'grovecheck-'));
let G;
try {
    for (const f of DEPS) {
        const src = readFileSync(join(HOUSE, f), 'utf8');
        writeFileSync(
            join(tmp, f),
            src.replace(/from '(\.\.?\/[^']+?)'/g, (m, spec) =>
                spec.endsWith('.ts') ? m : `from '${spec}.ts'`),
        );
    }
    G = await import(pathToFileURL(join(tmp, 'groveScatter.ts')).href);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}

const { buildGrove, radiusOf } = G;
const fail = [];

for (const [tier, k] of [['desktop', 1], ['phone (low)', 0.35]]) {
    const g = buildGrove(k);
    const all = g.all;

    let worst = null;
    const clashes = [];
    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
            const a = all[i];
            const b = all[j];
            const d = Math.hypot(a.x - b.x, a.z - b.z);
            const touch = radiusOf(a) + radiusOf(b);
            const ratio = d / touch;
            if (!worst || ratio < worst.ratio) worst = { a, b, d, touch, ratio };
            // Trunks through trunks. Canopies are allowed to weave, so the
            // bar is the inner half of the summed radii.
            if (d < touch * 0.5) clashes.push({ a, b, d, touch });
        }
    }

    console.log(`── ${tier}: ${all.length} props ` +
        `(${g.trees.length} trees, ${g.bushes.length} bushes, ${g.rocks.length} rocks, ${g.blooms.length} blooms)`);
    if (worst) {
        console.log(`   closest pair: ${worst.a.key} ↔ ${worst.b.key} — ` +
            `${worst.d.toFixed(2)}m apart, touching at ${worst.touch.toFixed(2)}m ` +
            `(${(worst.ratio * 100).toFixed(0)}% of touch)`);
    }
    if (clashes.length) {
        fail.push(`${tier}: ${clashes.length} props inside each other`);
        clashes.slice(0, 8).forEach((c) =>
            console.log(`   ✕ ${c.a.key} ↔ ${c.b.key} — ${c.d.toFixed(2)}m apart, need ${(c.touch * 0.5).toFixed(2)}m`));
    } else {
        console.log('   nothing inside anything else');
    }

    // A spacing rule that silently starves the grove is its own bug.
    const want = { desktop: 162, 'phone (low)': 56 }[tier];
    if (all.length < want * 0.75) {
        fail.push(`${tier}: only ${all.length} props placed, expected around ${want} — spacing is too aggressive`);
    }
    console.log('');
}

if (fail.length) {
    console.log('FAIL');
    fail.forEach((f) => console.log('  ' + f));
    process.exit(1);
}
console.log('Grove is clean.');
