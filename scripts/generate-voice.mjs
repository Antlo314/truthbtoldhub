/**
 * The voice of Truth — generated, not scripted.
 *
 * `build-voice-prompts.mjs` wrote SPEECH_PROMPTS.txt and a page of cards
 * for a human to read into a microphone. Nobody ever did: `public/voice`
 * held zero mp3s, so every "voice line" in the house was a caption.
 *
 * This speaks them. The key, voice and model come from Zion's vault
 * (never from this repo); every line is written to public/voice/<id>.mp3
 * and listed in public/voice/manifest.json, which the client reads. Runs
 * are idempotent — an existing file is skipped unless --force — so
 * re-running after adding one line costs one API call, not forty.
 *
 *   node scripts/generate-voice.mjs            # only what is missing
 *   node scripts/generate-voice.mjs --force    # everything again
 *   node scripts/generate-voice.mjs --only welcome,closing
 *
 * Text is passed through the same lore parser the prompt builder uses,
 * so this can never speak a line the cards do not show.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'public', 'voice');
fs.mkdirSync(OUT, { recursive: true });

const ZION = process.env.ZION_URL || 'http://127.0.0.1:4100';
const FORCE = process.argv.includes('--force');
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

// ── 1. Credentials from the vault ───────────────────────────
async function vault() {
    const res = await fetch(`${ZION}/api/vault/for/zion`).catch(() => null);
    if (!res?.ok) throw new Error(`Zion vault unreachable at ${ZION} — start Zion first`);
    const { keys = {} } = await res.json();
    const key = keys.ELEVENLABS_API_KEY;
    const voice = keys.ELEVENLABS_VOICE_ID;
    const model = keys.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    if (!key) throw new Error('ELEVENLABS_API_KEY is not in the vault');
    if (!voice) throw new Error('ELEVENLABS_VOICE_ID is not in the vault — Truth needs a voice picked');
    return { key, voice, model };
}

// ── 2. Every line Truth says ────────────────────────────────

/** Same parse as build-voice-prompts.mjs, so the two never disagree. */
function loreAnswers() {
    const lore = fs.readFileSync(path.join(ROOT, 'lib/game/truthLore.ts'), 'utf8');
    const out = [];
    for (const b of lore.split(/\{\s*id:/).slice(1)) {
        const idM = b.match(/^\s*'([^']+)'/);
        const ansM = b.match(/answer:\s*'((?:\\'|[^'])*)'/);
        const prM = b.match(/prompt:\s*'((?:\\'|[^'])*)'/);
        if (idM && ansM) {
            out.push({
                id: idM[1],
                kind: 'lore',
                title: prM ? prM[1].replace(/\\'/g, "'") : idM[1],
                text: ansM[1].replace(/\\'/g, "'").replace(/\\n/g, ' '),
            });
        }
    }
    return out;
}

const SYSTEM = [
    { id: 'welcome', text: 'Welcome home. You are inside Truth.OS House — a living sanctum. Look around. Walk the rooms. Gold rings mark every station of the Hut.' },
    { id: 'truth_intro', text: 'I am Truth. Hood up. Feet on the floor of this house with you. Not a ghost player. Not a leftover process. Ask me what you came for — or walk the rooms and find me on the dais.' },
    { id: 'move_pc', text: 'W, A, S, D to walk. Click the scene to capture your look. Space to jump. E to use what is near. F for fullscreen. Escape to release the mouse.' },
    { id: 'move_mobile', text: 'Hold the left side of the screen to walk. Drag the right side to look. Tap Use when a gold ring glows. Jump is on the right.' },
    { id: 'live_echo', text: 'LIVE means a soul is here right now. Echo means someone stood here before. Neither is an invented character. I am a station — the brother on the dais.' },
    { id: 'station_truth', text: 'This is the Ask Truth dais. Speak. Listen. The threads open as you walk in sincerity.' },
    { id: 'station_soul', text: 'The Soul Mirror. Shape the vessel you walk in. What you forge here walks with you through the house.' },
    { id: 'station_wayfinder', text: 'The Wayfinder. Eden is the open road. Other ages stay sealed until the garden is complete.' },
    { id: 'station_ledger', text: 'The Ledger. Daily word and dispatches. The hut keeps account of what is spoken and what is sustained.' },
    { id: 'station_chamber', text: 'The Sanctum door. Beyond this threshold is the walkable Hut chamber — stations, vessel, free look. Return when you are ready.' },
    { id: 'station_os', text: 'Truth.OS. Boot the system. Every station lives as an app without leaving this house.' },
    { id: 'closing', text: 'This is the last run. Walk sincere. Patron if you can. Tell another soul. Do not let failure be wasted — let it become warning and mercy. Go all the way.' },

    // ── The world outside — one line per place, spoken on approach ──
    { id: 'world_leave', text: 'You have stepped out of the house. The jungle holds four places. Follow the lit paths, and I will meet you at each one.' },
    { id: 'dest_cinema', text: 'The Cinema Isle. Films above the cloud sea. Sit on the logs. Let the story do the work.' },
    { id: 'dest_hall', text: 'The Hall Circle. This is the community ring — where the many gather. What is spoken here is spoken to all.' },
    { id: 'dest_soul_mirror', text: 'The Mirror Well. Look down and shape the vessel you walk in.' },
    { id: 'dest_studio', text: 'The Signal Spire. Broadcast from the shelf. Whatever you send from here goes out beyond the trees.' },
    { id: 'aether_shelf', text: 'The Aether Shelf. The cloud sea. Nothing here is solid but the path. Walk it slowly.' },
    { id: 'return_home', text: 'Home again. The door is behind you and the rooms are as you left them.' },

    // ── Truth.OS ──
    { id: 'os_boot', text: 'Truth.OS is awake. Every station is an app. Command palette is your fastest door — press it and type what you need.' },
    { id: 'os_guide_open', text: 'I am here. Ask, and I will answer with what I hold. Or say guide me, and I will walk you through this system.' },
    { id: 'os_night', text: 'The house has gone to night. The lamps are down and the sky is up. Rest, or keep walking — the rooms do not sleep.' },
    { id: 'os_dawn', text: 'Dawn on the sanctum. The windows are doing the work the lamps did. Good morning.' },
];

const LINES = [
    ...SYSTEM.map((s) => ({ ...s, kind: 'system', title: s.id })),
    ...loreAnswers(),
];

// ── 3. Speak ────────────────────────────────────────────────
async function speak({ key, voice, model }, text) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
            text,
            model_id: model,
            // Sincere and steady. Stability up so a guide line does not
            // wander; style low — this is a brother talking, not a trailer.
            voice_settings: { stability: 0.62, similarity_boost: 0.8, style: 0.18, use_speaker_boost: true },
        }),
        signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return Buffer.from(await res.arrayBuffer());
}

const creds = await vault();
console.log(`voice ${creds.voice.slice(0, 6)}… · model ${creds.model} · ${LINES.length} lines`);

const manifest = { generatedAt: new Date().toISOString(), voice: creds.voice.slice(0, 6) + '…', model: creds.model, lines: {} };
const existing = fs.existsSync(path.join(OUT, 'manifest.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')).lines || {}
    : {};

let made = 0, kept = 0, failed = 0;
for (const line of LINES) {
    const file = `${line.id}.mp3`;
    const abs = path.join(OUT, file);
    const wanted = !ONLY || ONLY.has(line.id);
    const have = fs.existsSync(abs) && fs.statSync(abs).size > 800;

    if (!wanted || (have && !FORCE)) {
        if (have) { kept++; manifest.lines[line.id] = { file: `/voice/${file}`, kind: line.kind, title: line.title, text: line.text, ready: true }; }
        else if (existing[line.id]) manifest.lines[line.id] = existing[line.id];
        continue;
    }
    process.stdout.write(`  ${line.id.padEnd(22)} `);
    try {
        const buf = await speak(creds, line.text);
        fs.writeFileSync(abs, buf);
        manifest.lines[line.id] = { file: `/voice/${file}`, kind: line.kind, title: line.title, text: line.text, ready: true, bytes: buf.length };
        made++;
        console.log(`✓ ${(buf.length / 1024).toFixed(0)}kb`);
    } catch (e) {
        failed++;
        manifest.lines[line.id] = { kind: line.kind, title: line.title, text: line.text, ready: false, error: String(e.message) };
        console.log(`✕ ${e.message}`);
    }
    // Be a good citizen on the concurrent-request limit.
    await new Promise((r) => setTimeout(r, 250));
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${made} generated · ${kept} kept · ${failed} failed → public/voice/manifest.json`);
if (failed) process.exit(1);
