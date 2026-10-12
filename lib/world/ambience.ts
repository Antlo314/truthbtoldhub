/**
 * The plain's sound, made rather than downloaded: wind through the grass
 * (filtered noise that swells), birdsong by day (short chirped sweeps),
 * crickets at night (pulsed high tones), water near the lake. All Web
 * Audio, a few kilobytes of code, no files to fetch.
 */
import { hubAudio } from '@/lib/truthos/hubAudio';

type Ctx = {
    ac: AudioContext;
    master: GainNode;
    wind: GainNode;
    windFilter: BiquadFilterNode;
    water: GainNode;
    birds: GainNode;
    crickets: GainNode;
    noise: AudioBufferSourceNode;
    noise2: AudioBufferSourceNode;
};

let ctx: Ctx | null = null;
let birdT = 0;
let cricketT = 0;
let t = 0;

function noiseBuffer(ac: AudioContext): AudioBuffer {
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    // pinkish: a running average of white noise
    let last = 0;
    for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = last * 0.96 + w * 0.04;
        d[i] = last * 6 + w * 0.08;
    }
    return buf;
}

export function startAmbience() {
    if (ctx || typeof window === 'undefined') return;
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ac = new AC();
        const master = ac.createGain();
        master.gain.value = 0;
        master.connect(ac.destination);
        const buf = noiseBuffer(ac);

        const noise = ac.createBufferSource();
        noise.buffer = buf;
        noise.loop = true;
        const windFilter = ac.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 420;
        windFilter.Q.value = 0.7;
        const wind = ac.createGain();
        wind.gain.value = 0.0;
        noise.connect(windFilter).connect(wind).connect(master);
        noise.start();

        const noise2 = ac.createBufferSource();
        noise2.buffer = buf;
        noise2.loop = true;
        noise2.playbackRate.value = 0.7;
        const waterFilter = ac.createBiquadFilter();
        waterFilter.type = 'lowpass';
        waterFilter.frequency.value = 700;
        const water = ac.createGain();
        water.gain.value = 0;
        noise2.connect(waterFilter).connect(water).connect(master);
        noise2.start();

        const birds = ac.createGain();
        birds.gain.value = 0.5;
        birds.connect(master);
        const crickets = ac.createGain();
        crickets.gain.value = 0.5;
        crickets.connect(master);

        ctx = { ac, master, wind, windFilter, water, birds, crickets, noise, noise2 };
        if (ac.state === 'suspended') {
            const wake = () => {
                void ac.resume();
                window.removeEventListener('pointerdown', wake);
                window.removeEventListener('keydown', wake);
            };
            window.addEventListener('pointerdown', wake);
            window.addEventListener('keydown', wake);
        }
        master.gain.linearRampToValueAtTime(1, ac.currentTime + 2.5);
    } catch {
        ctx = null;
    }
}

export function stopAmbience() {
    const c = ctx;
    ctx = null;
    if (!c) return;
    try {
        c.master.gain.cancelScheduledValues(c.ac.currentTime);
        c.master.gain.setValueAtTime(c.master.gain.value, c.ac.currentTime);
        c.master.gain.linearRampToValueAtTime(0, c.ac.currentTime + 0.8);
        window.setTimeout(() => {
            try {
                c.noise.stop();
                c.noise2.stop();
                void c.ac.close();
            } catch {
                /* */
            }
        }, 900);
    } catch {
        /* */
    }
}

function chirp(c: Ctx, when: number) {
    const o = c.ac.createOscillator();
    const g = c.ac.createGain();
    o.type = 'sine';
    const base = 2400 + Math.random() * 2200;
    const notes = 2 + Math.floor(Math.random() * 4);
    g.gain.setValueAtTime(0, when);
    for (let i = 0; i < notes; i++) {
        const s = when + i * (0.07 + Math.random() * 0.05);
        o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.25), s);
        o.frequency.exponentialRampToValueAtTime(base * (1.15 + Math.random() * 0.3), s + 0.05);
        g.gain.linearRampToValueAtTime(0.018 + Math.random() * 0.012, s + 0.01);
        g.gain.linearRampToValueAtTime(0, s + 0.06);
    }
    const pan = c.ac.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    o.connect(g).connect(pan).connect(c.birds);
    o.start(when);
    o.stop(when + notes * 0.13 + 0.1);
}

function cricket(c: Ctx, when: number) {
    const o = c.ac.createOscillator();
    const g = c.ac.createGain();
    o.type = 'triangle';
    o.frequency.value = 4200 + Math.random() * 600;
    g.gain.setValueAtTime(0, when);
    const pulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) {
        const s = when + i * 0.045;
        g.gain.linearRampToValueAtTime(0.008, s + 0.008);
        g.gain.linearRampToValueAtTime(0, s + 0.03);
    }
    const pan = c.ac.createStereoPanner();
    pan.pan.value = Math.random() * 1.8 - 0.9;
    o.connect(g).connect(pan).connect(c.crickets);
    o.start(when);
    o.stop(when + pulses * 0.05 + 0.05);
}

/**
 * Called a few times a second. daylight 0..1, wind 0..1 (region exposure),
 * water 0..1 (lake nearness), moving = the walker is moving (wind in ears).
 */
export function updateAmbience(dt: number, p: { daylight: number; exposure: number; water: number; hollow: boolean }) {
    const c = ctx;
    if (!c) return;
    const muted = hubAudio.isMuted();
    const now = c.ac.currentTime;
    t += dt;
    const swell = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1.3);
    const windLevel = muted ? 0 : (0.012 + 0.03 * swell) * (0.5 + p.exposure * 0.8);
    c.wind.gain.setTargetAtTime(windLevel, now, 0.6);
    c.windFilter.frequency.setTargetAtTime(300 + swell * 520, now, 0.8);
    c.water.gain.setTargetAtTime(muted ? 0 : p.water * 0.03, now, 0.8);
    if (muted) return;
    birdT -= dt;
    if (birdT <= 0) {
        birdT = 0.6 + Math.random() * (p.hollow ? 5 : 2.6);
        if (p.daylight > 0.35 && Math.random() < p.daylight) chirp(c, now + Math.random() * 0.2);
    }
    cricketT -= dt;
    if (cricketT <= 0) {
        cricketT = 0.25 + Math.random() * 0.9;
        if (p.daylight < 0.4 && Math.random() < 1 - p.daylight * 2) cricket(c, now + Math.random() * 0.1);
    }
}
