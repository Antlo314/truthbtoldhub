// ============================================================
//  ARCADE SFX — procedural Web-Audio sounds for the Sanctum
//  Arcade (Tetra, Serpent, …). No asset files; built from
//  oscillators + noise so the bundle stays lean and it works
//  offline. Its own context + mute (separate from combat sfx),
//  persisted to localStorage. Unlock from a user gesture.
// ============================================================

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== 'undefined') {
    try { muted = localStorage.getItem('tbth-arcade-muted') === '1'; } catch { /* ignore */ }
}

function ac(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch { return null; }
    }
    return ctx;
}

/** Resume the context — call from a user gesture so iOS/Android unlock. */
export function unlockArcadeAudio() {
    const c = ac();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setArcadeMuted(m: boolean) {
    muted = m;
    if (m) arcadeMusic.stop(); // unmute does NOT auto-restart — the game starts it on next play
    if (typeof window !== 'undefined') {
        try { localStorage.setItem('tbth-arcade-muted', m ? '1' : '0'); } catch { /* ignore */ }
    }
}
export function isArcadeMuted() { return muted; }

function tone(o: { freq: number; to?: number; type?: OscillatorType; dur: number; gain?: number; delay?: number }) {
    const c = ac();
    if (!c || muted) return;
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
    const peak = o.gain ?? 0.16;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
}

function noise(o: { dur: number; gain?: number; type?: BiquadFilterType; freq?: number; delay?: number }) {
    const c = ac();
    if (!c || muted) return;
    const t0 = c.currentTime + (o.delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * o.dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(o.gain ?? 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    let node: AudioNode = src;
    if (o.freq) {
        const f = c.createBiquadFilter();
        f.type = o.type || 'bandpass';
        f.frequency.value = o.freq;
        src.connect(f);
        node = f;
    }
    node.connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
}

const CLEAR_NOTES = [523, 659, 784, 1047, 1319];

export const asfx = {
    // Tetra ------------------------------------------------
    move() { tone({ freq: 200, type: 'square', dur: 0.025, gain: 0.03 }); },
    rotate() { tone({ freq: 440, to: 560, type: 'square', dur: 0.05, gain: 0.045 }); },
    lock() { tone({ freq: 150, to: 88, type: 'square', dur: 0.08, gain: 0.08 }); noise({ dur: 0.05, gain: 0.05, type: 'lowpass', freq: 300 }); },
    hold() { tone({ freq: 360, to: 300, type: 'triangle', dur: 0.07, gain: 0.05 }); },
    lineClear(n: number) {
        const big = n >= 4;
        const count = Math.min(CLEAR_NOTES.length, n + 1);
        for (let i = 0; i < count; i++) tone({ freq: CLEAR_NOTES[i], type: 'triangle', dur: big ? 0.22 : 0.13, gain: big ? 0.13 : 0.1, delay: i * 0.05 });
        if (big) tone({ freq: 1568, type: 'sine', dur: 0.3, gain: 0.08, delay: 0.12 });
    },
    levelUp() { tone({ freq: 330, to: 880, type: 'triangle', dur: 0.3, gain: 0.12 }); tone({ freq: 660, to: 1320, type: 'sine', dur: 0.3, gain: 0.07, delay: 0.06 }); },
    // Serpent ----------------------------------------------
    eat() { tone({ freq: 560, to: 880, type: 'triangle', dur: 0.08, gain: 0.08 }); },
    bonus() { tone({ freq: 880, to: 1320, type: 'triangle', dur: 0.14, gain: 0.1 }); tone({ freq: 1320, type: 'sine', dur: 0.12, gain: 0.06, delay: 0.07 }); },
    crash() { tone({ freq: 220, to: 50, type: 'sawtooth', dur: 0.3, gain: 0.16 }); noise({ dur: 0.22, gain: 0.12, type: 'lowpass', freq: 360 }); },
    // Veil -------------------------------------------------
    jump() { tone({ freq: 320, to: 620, type: 'square', dur: 0.10, gain: 0.07 }); },
    orb() { tone({ freq: 700, to: 1180, type: 'triangle', dur: 0.12, gain: 0.08 }); tone({ freq: 1400, type: 'sine', dur: 0.10, gain: 0.04, delay: 0.05 }); },
    pad() { tone({ freq: 180, to: 760, type: 'sawtooth', dur: 0.16, gain: 0.09 }); noise({ dur: 0.06, type: 'bandpass', freq: 900, gain: 0.04 }); },
    portal() { tone({ freq: 240, to: 880, type: 'sine', dur: 0.30, gain: 0.10 }); tone({ freq: 480, to: 1320, type: 'triangle', dur: 0.30, gain: 0.05, delay: 0.04 }); noise({ dur: 0.25, type: 'bandpass', freq: 1200, gain: 0.04 }); },
    coin() { tone({ freq: 988, type: 'square', dur: 0.06, gain: 0.06 }); tone({ freq: 1319, type: 'square', dur: 0.12, gain: 0.06, delay: 0.06 }); },
    flip() { tone({ freq: 300, to: 520, type: 'triangle', dur: 0.08, gain: 0.06 }); },
    complete() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.13, delay: i * 0.1 })); tone({ freq: 1568, type: 'sine', dur: 0.5, gain: 0.08, delay: 0.5 }); },
    // power-ups & pickups ----------------------------------
    // Tetra: one rising blip per Aether segment gained (a Tetris arpeggiates up)
    charge(seg: number) { tone({ freq: 520 + seg * 40, to: 700 + seg * 40, type: 'square', dur: 0.04, gain: 0.035 }); },
    // Tetra: the meter just became spendable + off cooldown (rising edge)
    powerReady() { tone({ freq: 880, type: 'triangle', dur: 0.16, gain: 0.07 }); tone({ freq: 1320, type: 'sine', dur: 0.14, gain: 0.04, delay: 0.06 }); },
    // Tetra: a power button pressed while blocked (no charge / cooldown)
    powerFizzle() { tone({ freq: 240, to: 150, type: 'sawtooth', dur: 0.12, gain: 0.06 }); noise({ dur: 0.05, type: 'lowpass', freq: 260, gain: 0.04 }); },
    // Tetra: Slow Veil — time dilating
    slowVeil() { tone({ freq: 620, to: 300, type: 'triangle', dur: 0.4, gain: 0.10 }); tone({ freq: 310, to: 150, type: 'sine', dur: 0.45, gain: 0.05, delay: 0.05 }); noise({ dur: 0.3, type: 'lowpass', freq: 500, gain: 0.04 }); },
    // Tetra: Aether Sink — deep downward dissolve + sparkle tail
    aetherSink() { tone({ freq: 300, to: 70, type: 'sawtooth', dur: 0.35, gain: 0.13 }); noise({ dur: 0.22, type: 'lowpass', freq: 360, gain: 0.10 }); tone({ freq: 1568, type: 'sine', dur: 0.3, gain: 0.06, delay: 0.12 }); },
    // Serpent: Veil grace gained / lifted, and the rare pickup appearing
    veil() { tone({ freq: 520, to: 1040, type: 'sine', dur: 0.22, gain: 0.10 }); tone({ freq: 780, to: 1560, type: 'triangle', dur: 0.20, gain: 0.05, delay: 0.05 }); noise({ dur: 0.16, type: 'bandpass', freq: 2200, gain: 0.04, delay: 0.02 }); },
    veilEnd() { tone({ freq: 760, to: 380, type: 'sine', dur: 0.26, gain: 0.06 }); tone({ freq: 1140, to: 560, type: 'triangle', dur: 0.22, gain: 0.03, delay: 0.03 }); },
    pickupSpawn() { tone({ freq: 1320, type: 'sine', dur: 0.05, gain: 0.035 }); tone({ freq: 1760, type: 'sine', dur: 0.06, gain: 0.03, delay: 0.04 }); },
    // Veil: Source Shard collected (Aegis armed) / the Aegis absorbing a hit
    shardPickup() { tone({ freq: 660, to: 1245, type: 'triangle', dur: 0.16, gain: 0.09 }); tone({ freq: 1320, to: 1760, type: 'sine', dur: 0.18, gain: 0.05, delay: 0.05 }); noise({ dur: 0.05, type: 'bandpass', freq: 5000, gain: 0.03 }); },
    shieldBreak() { tone({ freq: 520, to: 130, type: 'sawtooth', dur: 0.22, gain: 0.12 }); tone({ freq: 1320, to: 660, type: 'triangle', dur: 0.14, gain: 0.06 }); noise({ dur: 0.16, type: 'bandpass', freq: 2400, gain: 0.07 }); },
    // Tetra: go-all-out cues (T-Spin / Perfect Clear / combo) ----
    // T-Spin landing — descending saw whoosh + rising triangle shimmer
    tspin() { tone({ freq: 320, to: 140, type: 'sawtooth', dur: 0.26, gain: 0.10 }); tone({ freq: 600, to: 1100, type: 'triangle', dur: 0.24, gain: 0.06, delay: 0.03 }); noise({ dur: 0.14, type: 'bandpass', freq: 700, gain: 0.04, delay: 0.02 }); },
    // Perfect Clear — the big rare payoff: 5-note triangle arpeggio + bell + sparkle tail
    perfectClear() { CLEAR_NOTES.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, gain: 0.13, delay: i * 0.08 })); tone({ freq: 1568, type: 'sine', dur: 0.5, gain: 0.09, delay: 0.4 }); noise({ dur: 0.4, type: 'highpass', freq: 6000, gain: 0.035, delay: 0.42 }); },
    // Combo step — single blip rising with combo depth (n = combo+1)
    combo(n: number) { const f = 440 + Math.min(n, 12) * 60; tone({ freq: f, type: 'square', dur: 0.05, gain: 0.05 }); tone({ freq: f * 1.5, type: 'triangle', dur: 0.05, gain: 0.025, delay: 0.005 }); },
    // Serpent: go-all-out cues (zones / chain / boons) ----------
    // Zone shift — deep rising sweep + airy noise wash (heavier than levelUp)
    zoneShift() { tone({ freq: 110, to: 660, type: 'sawtooth', dur: 0.5, gain: 0.11 }); tone({ freq: 220, to: 990, type: 'triangle', dur: 0.5, gain: 0.05, delay: 0.05 }); noise({ dur: 0.45, type: 'bandpass', freq: 1400, gain: 0.05, delay: 0.04 }); },
    // Chain tier-up — bright blip rising with combo tier
    chainUp(tier: number) { const f = 620 + tier * 120; tone({ freq: f, type: 'triangle', dur: 0.06, gain: 0.07 }); tone({ freq: f * 2, type: 'sine', dur: 0.05, gain: 0.03, delay: 0.01 }); },
    // Magnet (Lodestone) — low warbling pull-tone wobbling ~300<->420
    magnet() { tone({ freq: 300, to: 420, type: 'sine', dur: 0.15, gain: 0.08 }); tone({ freq: 420, to: 300, type: 'sine', dur: 0.15, gain: 0.07, delay: 0.15 }); },
    // Molt (Shrink) — quick descending shed flutter + soft puff
    molt() { tone({ freq: 760, to: 240, type: 'triangle', dur: 0.12, gain: 0.07 }); noise({ dur: 0.10, type: 'lowpass', freq: 500, gain: 0.05, delay: 0.02 }); },
    // Frenzy (Ardor) start — hot ascending double-tone igniting
    frenzy() { tone({ freq: 440, to: 880, type: 'sawtooth', dur: 0.3, gain: 0.10 }); tone({ freq: 660, to: 1320, type: 'triangle', dur: 0.3, gain: 0.05, delay: 0.04 }); },
    // Frenzy end — brief cooling downward pair (mirror of veilEnd)
    frenzyEnd() { tone({ freq: 880, to: 440, type: 'sawtooth', dur: 0.22, gain: 0.06 }); tone({ freq: 1320, to: 660, type: 'triangle', dur: 0.2, gain: 0.03, delay: 0.03 }); },
    // Near-miss — very short low-gain airy brushed-past tick
    nearMiss() { noise({ dur: 0.06, type: 'bandpass', freq: 3200, gain: 0.03 }); tone({ freq: 520, to: 760, type: 'sine', dur: 0.04, gain: 0.02 }); },
    // Veil: go-all-out cues (coin streak / tiers / wave / shard) -
    // Coin streak — coin pickup rising with streak n (replaces flat coin())
    coinStreak(n: number) { const f = 988 + n * 70; tone({ freq: f, type: 'square', dur: 0.06, gain: 0.06 }); tone({ freq: f * 1.5, type: 'sine', dur: 0.10, gain: 0.035, delay: 0.05 }); },
    // Tier entry — short ascending riser marking a new difficulty tier
    tierUp() { tone({ freq: 330, to: 990, type: 'triangle', dur: 0.28, gain: 0.10 }); tone({ freq: 660, to: 1320, type: 'sine', dur: 0.28, gain: 0.05, delay: 0.05 }); },
    // Wave portal entered — airy descending-then-rising sine swell
    waveEnter() { tone({ freq: 880, to: 360, type: 'sine', dur: 0.18, gain: 0.08 }); tone({ freq: 360, to: 1180, type: 'sine', dur: 0.26, gain: 0.07, delay: 0.16 }); noise({ dur: 0.22, type: 'bandpass', freq: 1600, gain: 0.035, delay: 0.04 }); },
    // Shard near — soft high shimmer telegraphing an approaching un-collected shard
    shardNear() { tone({ freq: 1245, type: 'sine', dur: 0.10, gain: 0.04 }); tone({ freq: 1760, type: 'sine', dur: 0.12, gain: 0.03, delay: 0.04 }); },
    // shared -----------------------------------------------
    gameOver() { [392, 294, 196].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.5, gain: 0.15, delay: i * 0.14 })); },
};

// ============================================================
//  ARCADE MUSIC — a driving, fully-synthesized loop for Veil.
//  Uses a Web-Audio LOOKAHEAD scheduler (not rAF) so timing
//  rides ctx.currentTime and never drifts under tab throttling.
//  Routes through its own gain bus so it's independent of SFX.
// ============================================================

const MUSIC_BPM = 140;
const SECONDS_PER_16TH = 60 / MUSIC_BPM / 4;
const SCHEDULE_AHEAD = 0.10;   // seconds of notes to queue ahead
const LOOKAHEAD_MS = 25;       // pump interval
const MUSIC_VOLUME = 0.5;

// 16-step patterns (A-minor flavored, original)
const KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const HAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1];
const BASS = [55, 0, 0, 0, 55, 0, 0, 82.41, 55, 0, 0, 0, 73.42, 0, 82.41, 0];
const LEAD = [440, 0, 523.25, 0, 659.25, 0, 523.25, 0, 587.33, 0, 440, 0, 659.25, 0, 880, 0];

let musicBus: GainNode | null = null;
let musicRunning = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let step16 = 0;

function mGain(time: number, peak: number, dur: number): GainNode | null {
    if (!ctx || !musicBus) return null;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    g.connect(musicBus);
    return g;
}
function mOsc(freq: number, to: number | undefined, type: OscillatorType, time: number, dur: number, peak: number) {
    const c = ctx; if (!c) return;
    const g = mGain(time, peak, dur); if (!g) return;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), time + dur);
    o.connect(g);
    o.start(time); o.stop(time + dur + 0.02);
}
function mNoise(time: number, dur: number, peak: number, hp: number) {
    const c = ctx; if (!c) return;
    const g = mGain(time, peak, dur); if (!g) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    src.connect(f).connect(g);
    src.start(time); src.stop(time + dur + 0.02);
}

function scheduleStep(i: number, time: number) {
    if (KICK[i]) { mOsc(150, 48, 'sine', time, 0.12, 0.5); mNoise(time, 0.02, 0.18, 1200); }
    if (HAT[i]) mNoise(time, 0.03, 0.10, 7000);
    if (BASS[i]) mOsc(BASS[i], undefined, 'sawtooth', time, 0.18, 0.22);
    if (LEAD[i]) mOsc(LEAD[i], undefined, 'square', time, 0.12, 0.05);
}

function pump() {
    const c = ctx;
    if (!c || !musicRunning) return;
    while (nextNoteTime < c.currentTime + SCHEDULE_AHEAD) {
        scheduleStep(step16, nextNoteTime);
        nextNoteTime += SECONDS_PER_16TH;
        step16 = (step16 + 1) % 16;
    }
}

export const arcadeMusic = {
    start() {
        if (muted || musicRunning) return;
        const c = ac();
        if (!c) return;
        if (c.state === 'suspended') c.resume().catch(() => {});
        if (!musicBus) { musicBus = c.createGain(); musicBus.connect(c.destination); }
        musicBus.gain.cancelScheduledValues(c.currentTime);
        musicBus.gain.setValueAtTime(MUSIC_VOLUME, c.currentTime);
        step16 = 0;
        nextNoteTime = c.currentTime + 0.06;
        musicRunning = true;
        musicTimer = setInterval(pump, LOOKAHEAD_MS);
    },
    stop() {
        if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
        if (!musicRunning) return;
        musicRunning = false;
        // fade the bus out (click-free) using the existing ctx, never ac()
        if (ctx && musicBus) {
            try {
                const t = ctx.currentTime;
                musicBus.gain.cancelScheduledValues(t);
                musicBus.gain.setValueAtTime(musicBus.gain.value, t);
                musicBus.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
            } catch { /* ignore */ }
        }
    },
    isPlaying() { return musicRunning; },
};
