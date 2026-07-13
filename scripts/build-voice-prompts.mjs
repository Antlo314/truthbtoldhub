/**
 * Generate Exact speech scripts for ElevenLabs (text + HTML + SVG cards).
 * Run: node scripts/build-voice-prompts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'voice');
fs.mkdirSync(outDir, { recursive: true });

const lore = fs.readFileSync(path.join(root, 'lib/game/truthLore.ts'), 'utf8');
const answers = [];
const blocks = lore.split(/\{\s*id:/).slice(1);
for (const b of blocks) {
    const idM = b.match(/^\s*'([^']+)'/);
    const ansM = b.match(/answer:\s*'((?:\\'|[^'])*)'/);
    const prM = b.match(/prompt:\s*'((?:\\'|[^'])*)'/);
    if (idM && ansM) {
        answers.push({
            id: idM[1],
            prompt: prM ? prM[1].replace(/\\'/g, "'") : idM[1],
            answer: ansM[1].replace(/\\'/g, "'").replace(/\\n/g, ' '),
        });
    }
}

const systemLines = [
    {
        id: 'welcome',
        title: 'Welcome (House enter)',
        text: 'Welcome home. You are inside Truth.OS House — a living 3D sanctum. Look around. Walk the rooms. Gold rings mark every station of the Hut.',
    },
    {
        id: 'truth_intro',
        title: 'Truth · first meet',
        text: 'I am Truth. Hood up. Feet on the floor of this house with you. Not a ghost player. Not a leftover process. Ask me what you came for — or walk the rooms and find me on the dais.',
    },
    {
        id: 'move_pc',
        title: 'Hint · PC move',
        text: 'WASD to walk. Click the scene to capture your look. Space to jump. E to use what is near. F for fullscreen. Escape to release the mouse.',
    },
    {
        id: 'move_mobile',
        title: 'Hint · Mobile move',
        text: 'Hold the left side of the screen to walk. Drag the right side to look. Tap Use when a gold ring glows. Jump is on the right.',
    },
    {
        id: 'live_echo',
        title: 'Presence explained',
        text: 'LIVE means a soul is here right now. Echo means someone stood here before. Neither is an invented NPC. I am a station — the brother on the dais.',
    },
    {
        id: 'station_truth',
        title: 'Station · Truth',
        text: 'This is the Ask Truth dais. Speak. Listen. The threads open as you walk in sincerity.',
    },
    {
        id: 'station_soul',
        title: 'Station · Soul Mirror',
        text: 'The Soul Mirror. Shape the vessel you walk in. What you forge here walks with you through the house.',
    },
    {
        id: 'station_wayfinder',
        title: 'Station · Wayfinder',
        text: 'The Wayfinder. Eden is the open road. Other ages stay sealed until the garden is complete.',
    },
    {
        id: 'station_ledger',
        title: 'Station · Ledger',
        text: 'The Ledger. Daily word and dispatches. The hut keeps account of what is spoken and what is sustained.',
    },
    {
        id: 'station_chamber',
        title: 'Station · Sanctum',
        text: 'The Sanctum door. Beyond this threshold is the walkable Hut chamber — stations, vessel, free look. Return when you are ready.',
    },
    {
        id: 'station_os',
        title: 'Station · Computer',
        text: 'Truth.OS. Boot the system. Every station lives as an app without leaving this house.',
    },
    {
        id: 'closing',
        title: 'Closing (last run)',
        text: 'This is the last run. Walk sincere. Patron if you can. Tell another soul. Do not let failure be wasted — let it become warning and mercy. Go all the way.',
    },
];

const all = [
    ...systemLines.map((s) => ({ id: s.id, title: s.title, text: s.text })),
    ...answers.map((a) => ({
        id: a.id,
        title: 'Truth answer · ' + a.prompt,
        text: a.answer,
    })),
];

let txt = 'TRUTH.OS HOUSE — VOICE PROMPTS FOR ELEVENLABS\n';
txt += 'Speak clearly. One file per block. Pause at periods.\n';
txt += 'Suggested voice: warm Black male, mid-baritone, intimate, sincere, not theatrical.\n\n';
all.forEach((a, i) => {
    txt += '────────────────────────────────\n';
    txt += 'FILE: ' + String(i + 1).padStart(2, '0') + '_' + a.id + '.mp3\n';
    txt += 'TITLE: ' + a.title + '\n';
    txt += 'SCRIPT:\n' + a.text + '\n\n';
});
fs.writeFileSync(path.join(outDir, 'SPEECH_PROMPTS.txt'), txt);

const escHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cards = all
    .map(
        (a, i) => `
<section class="card" id="${a.id}">
  <div class="meta">${String(i + 1).padStart(2, '0')} · ${escHtml(a.id)}</div>
  <h2>${escHtml(a.title)}</h2>
  <p class="script">${escHtml(a.text)}</p>
  <div class="file">Save as: ${String(i + 1).padStart(2, '0')}_${a.id}.mp3</div>
</section>`,
    )
    .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Truth.OS House · Speech Prompts (ElevenLabs)</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: Georgia, 'Times New Roman', serif;
    background: #0a0810; color: #f5e6c8;
    padding: 2rem 1rem 4rem;
  }
  header {
    max-width: 720px; margin: 0 auto 2rem;
    border-bottom: 1px solid rgba(251,191,36,0.35); padding-bottom: 1.25rem;
  }
  header h1 { font-size: 1.5rem; margin: 0 0 0.5rem; letter-spacing: 0.04em; }
  header p { margin: 0.35rem 0; font-size: 0.95rem; color: #c4b5a0; font-family: system-ui, sans-serif; }
  .card {
    max-width: 720px; margin: 0 auto 1.5rem;
    background: linear-gradient(160deg, #16101c 0%, #0c0a12 100%);
    border: 1px solid rgba(251,191,36,0.28);
    border-radius: 1rem; padding: 1.5rem 1.6rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    page-break-inside: avoid;
  }
  .meta { font-family: ui-monospace, monospace; font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: #fbbf24; margin-bottom: 0.5rem; }
  h2 { font-size: 1.05rem; margin: 0 0 0.85rem; color: #fff; font-family: system-ui, sans-serif; font-weight: 600; }
  .script { font-size: 1.15rem; line-height: 1.65; margin: 0 0 1rem; white-space: pre-wrap; }
  .file { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; }
  @media print {
    body { background: #fff; color: #111; padding: 0; }
    .card { box-shadow: none; border-color: #ccc; break-inside: avoid; margin-bottom: 1rem; }
    .meta { color: #b45309; }
    h2 { color: #111; }
  }
</style>
</head>
<body>
<header>
  <h1>Truth.OS House · Voice scripts</h1>
  <p>Clone your voice in ElevenLabs, then record or generate each block as a separate audio file.</p>
  <p>Suggested delivery: warm Black male mid-baritone · intimate · sincere · not theatrical · slight gravel OK.</p>
  <p>Plain text: <code>SPEECH_PROMPTS.txt</code>. SVG cards in this folder for teleprompter screenshots.</p>
</header>
${cards}
</body>
</html>`;
fs.writeFileSync(path.join(outDir, 'speech-prompts.html'), html);

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function wrap(text, max = 40) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
        if ((cur + ' ' + w).trim().length > max) {
            lines.push(cur.trim());
            cur = w;
        } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
}

systemLines.forEach((s, idx) => {
    const lines = wrap(s.text, 40);
    const h = Math.max(200, 130 + lines.length * 30);
    const tspans = lines
        .map((ln, i) => `<tspan x="48" dy="${i === 0 ? 0 : 30}">${esc(ln)}</tspan>`)
        .join('');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${h}" viewBox="0 0 900 ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16101c"/>
      <stop offset="100%" stop-color="#0a0810"/>
    </linearGradient>
  </defs>
  <rect width="900" height="${h}" fill="url(#g)" rx="24"/>
  <rect x="1" y="1" width="898" height="${h - 2}" fill="none" stroke="#fbbf24" stroke-opacity="0.35" rx="24"/>
  <text x="48" y="42" fill="#fbbf24" font-family="ui-monospace,Consolas,monospace" font-size="14" letter-spacing="3">${esc(String(idx + 1).padStart(2, '0'))} · ${esc(s.id.toUpperCase())}</text>
  <text x="48" y="74" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="18" font-weight="600">${esc(s.title)}</text>
  <text x="48" y="120" fill="#f5e6c8" font-family="Georgia,Times New Roman,serif" font-size="22">${tspans}</text>
</svg>`;
    fs.writeFileSync(
        path.join(outDir, `card_${String(idx + 1).padStart(2, '0')}_${s.id}.svg`),
        svg,
    );
});

console.log('Wrote', all.length, 'scripts and', systemLines.length, 'SVG cards → public/voice/');
