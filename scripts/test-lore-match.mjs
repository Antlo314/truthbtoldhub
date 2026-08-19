/**
 * Does the guide's lore matcher hit the right answers — and only those?
 *
 * The matcher lives in TruthGuideApp.tsx. It decides whether a typed
 * question is one Truth has already answered in his recorded voice
 * (answered instantly, never sent to the model) or something new. Getting
 * it wrong in the confident direction is the bad case: a canned answer
 * to a question it does not fit. This pins both directions.
 *
 *   node scripts/test-lore-match.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'components/truthos/apps/TruthGuideApp.tsx'), 'utf8');
const lore = readFileSync(join(ROOT, 'lib/game/truthLore.ts'), 'utf8');

/** Pull a `const NAME = new Set([...])` word list straight out of the source. */
function setFrom(name) {
    const start = src.indexOf(`const ${name} = new Set([`);
    const end = src.indexOf(']);', start);
    const body = src.slice(start, end);
    return new Set([...body.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]));
}
const STOP = setFrom('STOP');
const KEYWORDS = setFrom('KEYWORDS');

const Q = [...lore.matchAll(/id: '([^']+)',\s*prompt: '((?:\\'|[^'])*)'/g)].map((m) => ({ id: m[1], prompt: m[2] }));

// Mirror of contentWords / loreHit in the component. If those change, this
// must too — that is the point of the test failing.
const cw = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
function hit(msg) {
    const q = new Set(cw(msg));
    if (!q.size) return null;
    let best = null;
    for (const t of Q) {
        const words = cw(t.prompt);
        if (!words.length) continue;
        const hits = words.filter((w) => q.has(w));
        if (!hits.length) continue;
        let score;
        if (words.length === 1) { if (!KEYWORDS.has(words[0])) continue; score = 1; }
        else { score = hits.length / words.length; if (score < 0.7) continue; }
        if (!best || score > best.score) best = { id: t.id, score };
    }
    return best ? best.id : null;
}

const CASES = [
    // Must NOT hijack — these are new questions for the model
    ['how do I follow the path', null],
    ['tell me about your day', null],
    ['what is the weather like', null],
    ['can you stop the music', null],
    ['what should I name my dog', null],
    // Must hit — the canonical recorded answers.
    // NB the lore ids do not always name their prompt: the id `fasting`
    // carries the prompt "How did you stop drinking?", and `imperfect`
    // carries "Why should anyone listen to you?". Expectations follow the
    // PROMPT, because that is what a person types.
    ['what is the source', 'source'],
    ['tell me about your family', 'family'],
    ['what happened to your children', 'children'],
    ['how did you stop drinking', 'fasting'],
    ['did sorrow ever break you', 'drinking'],
    ['what does fasting cost', 'fasting_cost'],
    ['why did you walk away from the mission', 'walked_away'],
    ['what is the 400 series', 'series_400'],
    ['why should anyone listen to you', 'imperfect'],
    ['what is freedom to you', 'transparency'],
    ['what is the wilderness', 'wilderness'],
    // "Who are you — really?" has zero content words and cannot be typed
    // into a match. That is acceptable: the greeting already IS that
    // answer, and it stays reachable via ▶ hear.
    ['who are you really', null],
];

let ok = 0;
for (const [m, want] of CASES) {
    const got = hit(m);
    const pass = got === want;
    if (pass) ok++;
    console.log(`${pass ? '  ✓' : '  ✕'} ${JSON.stringify(m).padEnd(44)} -> ${String(got).padEnd(14)}${pass ? '' : `  (wanted ${want})`}`);
}
console.log(`\n${ok}/${CASES.length} correct`);

const dead = Q.filter((t) => { const w = cw(t.prompt); return w.length === 1 && !KEYWORDS.has(w[0]); });
const zero = Q.filter((t) => cw(t.prompt).length === 0);
console.log(`prompts that can never match by typing (single non-keyword word): ${dead.map((t) => `${t.id}[${cw(t.prompt)[0]}]`).join(' ') || 'none'}`);
console.log(`prompts with zero content words: ${zero.map((t) => t.id).join(' ') || 'none'}`);
console.log('(those are still reachable through the ▶ hear button and the lore Q&A — this only affects free-typed questions)');

process.exit(ok === CASES.length ? 0 : 1);
