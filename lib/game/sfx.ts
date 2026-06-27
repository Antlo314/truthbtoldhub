// ============================================================
//  COMBAT SFX — synthesized at runtime via the Web Audio API.
//  No asset files: every sound is built from oscillators + noise,
//  so the bundle stays lean and it works offline. The context is
//  created lazily and must be unlocked from a user gesture (mobile
//  autoplay policy) — call unlockAudio() on the first tap.
// ============================================================

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch { return null; }
    }
    return ctx;
}

// Resume the audio context — call from a user gesture so iOS/Android unlock.
export function unlockAudio() {
    const c = ac();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m: boolean) {
    muted = m;
    if (typeof window !== 'undefined') {
        import('@/lib/game/music').then(({ gameMusic }) => gameMusic.setMuted(m));
    }
}
export function isMuted() { return muted; }

// A single enveloped oscillator note (optionally gliding freq -> to).
function tone(o: { freq: number; to?: number; type?: OscillatorType; dur: number; gain?: number; delay?: number }) {
    const c = ac();
    if (!c || muted) return;
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
    const peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
}

// A burst of decaying white noise, optionally band/low/high-passed.
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
    g.gain.setValueAtTime(o.gain ?? 0.15, t0);
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

export const sfx = {
    // the weapon cuts the air
    strike() { noise({ dur: 0.1, gain: 0.1, type: 'highpass', freq: 1400 }); tone({ freq: 340, to: 180, type: 'triangle', dur: 0.09, gain: 0.07 }); },
    // a sidestep through the veil — the dodge
    dash() { noise({ dur: 0.16, gain: 0.09, type: 'highpass', freq: 900 }); tone({ freq: 520, to: 880, type: 'sine', dur: 0.14, gain: 0.05 }); },
    // a mote of essence gathered from the world
    pickup() { tone({ freq: 660, to: 990, type: 'triangle', dur: 0.12, gain: 0.09 }); tone({ freq: 990, type: 'sine', dur: 0.1, gain: 0.06, delay: 0.05 }); },
    // a blade lands on a shade
    hit() { tone({ freq: 170, to: 60, type: 'square', dur: 0.11, gain: 0.16 }); noise({ dur: 0.07, gain: 0.1, freq: 500 }); },
    // a shade is undone
    enemyDown() { tone({ freq: 440, to: 70, type: 'sawtooth', dur: 0.32, gain: 0.13 }); },
    // the guardian rises
    bossSpawn() { tone({ freq: 90, to: 38, type: 'sawtooth', dur: 0.75, gain: 0.22 }); tone({ freq: 58, to: 30, type: 'square', dur: 0.75, gain: 0.12, delay: 0.05 }); },
    // a shade hurls spectral fire
    cast() { tone({ freq: 300, to: 620, type: 'sawtooth', dur: 0.18, gain: 0.08 }); noise({ dur: 0.1, gain: 0.05, type: 'highpass', freq: 1800 }); },
    // a brute winds into a charge
    charge() { tone({ freq: 70, to: 200, type: 'sawtooth', dur: 0.5, gain: 0.13 }); noise({ dur: 0.4, gain: 0.06, type: 'bandpass', freq: 220 }); },
    // a guardian's ground slam
    slam() { tone({ freq: 130, to: 38, type: 'square', dur: 0.32, gain: 0.22 }); noise({ dur: 0.28, gain: 0.18, type: 'lowpass', freq: 320 }); },
    // a perfectly-timed parry — a bright metallic clang that deflects the blow
    parry() { tone({ freq: 1300, to: 620, type: 'square', dur: 0.12, gain: 0.13 }); tone({ freq: 2100, to: 900, type: 'triangle', dur: 0.1, gain: 0.07 }); noise({ dur: 0.08, gain: 0.1, type: 'highpass', freq: 3200 }); },
    // an enemy's poise breaks — staggered, wide open
    stagger() { tone({ freq: 170, to: 48, type: 'sawtooth', dur: 0.3, gain: 0.17 }); noise({ dur: 0.22, gain: 0.13, type: 'lowpass', freq: 260 }); },
    // a perfect dodge — time bends as you slip the strike
    perfect() { tone({ freq: 680, to: 1360, type: 'sine', dur: 0.18, gain: 0.1 }); tone({ freq: 1020, to: 1530, type: 'triangle', dur: 0.14, gain: 0.07, delay: 0.05 }); },
    // a charged heavy blow lands with weight
    heavy() { tone({ freq: 120, to: 40, type: 'square', dur: 0.26, gain: 0.22 }); tone({ freq: 220, to: 70, type: 'sawtooth', dur: 0.2, gain: 0.1 }); noise({ dur: 0.16, gain: 0.16, type: 'lowpass', freq: 440 }); },
    // you take a wound
    hurt() { tone({ freq: 210, to: 85, type: 'square', dur: 0.17, gain: 0.17 }); noise({ dur: 0.11, gain: 0.11, freq: 320, type: 'lowpass' }); },
    // the guardian falls
    victory() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.15, delay: i * 0.11 })); },
    // you fall
    defeat() { [330, 247, 165].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.6, gain: 0.16, delay: i * 0.16 })); },
};
