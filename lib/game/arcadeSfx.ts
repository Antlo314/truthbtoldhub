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
    // shared -----------------------------------------------
    gameOver() { [392, 294, 196].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.5, gain: 0.15, delay: i * 0.14 })); },
};
