/**
 * Prop manifest audit — does every prop the scene asks for actually exist?
 *
 * `HouseProp` looks the model name up in HOUSE_MODELS and, if the key is
 * missing or has no url, silently renders the procedural fallback child
 * instead. That is a good failure mode for a missing GLB and a terrible
 * one for a TYPO: the scene keeps rendering, so nothing ever tells you
 * that "sideTable" was never a key and you have been looking at a grey
 * box where a table should be.
 *
 * Three questions:
 *   1. every model="..." used in the scene — is it a key?
 *   2. every key with a url — does that file exist on disk?
 *   3. every key — is anything using it?
 *
 *   node scripts/audit-props.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HOUSE = join(ROOT, 'components', 'truthos', 'house');
const PUBLIC = join(ROOT, 'public');

// ── keys declared in the manifest ───────────────────────────
const propSrc = readFileSync(join(HOUSE, 'HouseProp.tsx'), 'utf8');
const manifest = propSrc.slice(
    propSrc.indexOf('HOUSE_MODELS'),
    propSrc.indexOf('function Model('),
);

/** `key: kenney('file', {...})` or `key: { url: '/models/...' }` */
const keys = new Map();
for (const m of manifest.matchAll(/^\s{4}(\w+)\s*:\s*(kenney\(\s*'([^']+)'|\{)/gm)) {
    keys.set(m[1], { kenney: m[3] || null, url: null });
}
for (const m of manifest.matchAll(/^\s{4}(\w+)\s*:\s*\{[\s\S]*?url:\s*(null|'([^']+)')/gm)) {
    const e = keys.get(m[1]) || { kenney: null, url: null };
    e.url = m[3] || null;
    keys.set(m[1], e);
}

const urlFor = (k) => {
    const e = keys.get(k);
    if (!e) return null;
    return e.kenney ? `/models/kenney/${e.kenney}.glb` : e.url;
};

// ── every model="..." used anywhere in the scene ────────────
const used = new Map(); // name -> [{file, line}]
for (const f of readdirSync(HOUSE).filter((f) => f.endsWith('.tsx'))) {
    const src = readFileSync(join(HOUSE, f), 'utf8').split(/\r?\n/);
    src.forEach((line, i) => {
        // model="x" — the plain case
        for (const m of line.matchAll(/model=["']([\w]+)["']/g)) {
            if (!used.has(m[1])) used.set(m[1], []);
            used.get(m[1]).push({ file: f, line: i + 1 });
        }
        // model={cond ? 'a' : 'b'} / model={arr[i]} etc — a dynamic key is
        // still a key, and a typo inside one is exactly as broken. Pull
        // every string literal out of the expression.
        for (const m of line.matchAll(/model=\{([^}]*)\}/g)) {
            for (const s of m[1].matchAll(/['"]([\w]+)['"]/g)) {
                if (!used.has(s[1])) used.set(s[1], []);
                used.get(s[1]).push({ file: f, line: i + 1, dynamic: true });
            }
        }
    });
}

const L = [];
const bad = { missingKey: [], missingFile: [], unused: [], nullUrl: [] };

for (const [name, sites] of [...used].sort()) {
    if (!keys.has(name)) {
        bad.missingKey.push({ name, sites });
        continue;
    }
    const url = urlFor(name);
    if (!url) { bad.nullUrl.push({ name, sites }); continue; }
    if (!existsSync(join(PUBLIC, url.replace(/^\//, '')))) {
        bad.missingFile.push({ name, url, sites });
    }
}
for (const k of keys.keys()) if (!used.has(k)) bad.unused.push(k);

L.push('═══ PROP MANIFEST AUDIT ═══');
L.push(`${keys.size} keys declared · ${used.size} distinct models used in the scene`);
L.push('');

L.push(`── USED BUT NOT A KEY — renders the grey fallback, silently: ${bad.missingKey.length} ──`);
if (!bad.missingKey.length) L.push('   clean');
for (const b of bad.missingKey) {
    const near = [...keys.keys()].filter(
        (k) => k.toLowerCase().includes(b.name.toLowerCase().slice(0, 5)) ||
               b.name.toLowerCase().includes(k.toLowerCase().slice(0, 5)),
    );
    L.push(`   ${b.name}   used at ${b.sites.map((s) => `${s.file}:${s.line}`).join(', ')}`);
    if (near.length) L.push(`        did you mean: ${near.join(', ')}`);
}
L.push('');

L.push(`── KEY EXISTS BUT THE FILE DOES NOT: ${bad.missingFile.length} ──`);
if (!bad.missingFile.length) L.push('   clean');
bad.missingFile.forEach((b) => L.push(`   ${b.name} -> ${b.url}   (${b.sites.map((s) => `${s.file}:${s.line}`).join(', ')})`));
L.push('');

L.push(`── DECLARED url: null (procedural on purpose): ${bad.nullUrl.length} ──`);
bad.nullUrl.forEach((b) => L.push(`   ${b.name}`));
L.push('');

L.push(`── DECLARED BUT NEVER USED: ${bad.unused.length} ──`);
L.push(bad.unused.length ? '   ' + bad.unused.join(', ') : '   none');

const total = bad.missingKey.length + bad.missingFile.length;
L.push('');
L.push(total ? `${total} props are not rendering the model they name.` : 'Every named prop resolves.');
console.log(L.join('\n'));
process.exit(total ? 1 : 0);
