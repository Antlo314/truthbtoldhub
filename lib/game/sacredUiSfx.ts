/**
 * Sacred UI SFX — soft Web Audio tones for the shell (no extra files).
 * Unlocks on first user gesture. Safe to call anytime.
 */
import { unlockAudio } from '@/lib/game/sfx';
import { gameMusic } from '@/lib/game/music';

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

function ensure() {
    unlockAudio();
    const c = ac();
    if (c?.state === 'suspended') c.resume().catch(() => {});
    return c;
}

function blip(freq: number, dur: number, gain = 0.07, type: OscillatorType = 'sine', delay = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
}

export const sacredUi = {
    setMuted(m: boolean) { muted = m; },
    unlock() { ensure(); },

    /** Soft tick on hover */
    hover() {
        blip(880, 0.05, 0.025, 'sine');
    },

    /** Primary CTA / button press */
    click() {
        blip(520, 0.07, 0.05, 'triangle');
        blip(780, 0.05, 0.03, 'sine', 0.03);
    },

    /** Constellation / veil open */
    veilOpen() {
        blip(220, 0.18, 0.05, 'sine');
        blip(330, 0.22, 0.04, 'triangle', 0.04);
        blip(440, 0.16, 0.03, 'sine', 0.1);
    },

    /** Veil close */
    veilClose() {
        blip(400, 0.1, 0.04, 'sine');
        blip(260, 0.14, 0.03, 'triangle', 0.04);
    },

    /** Route / threshold crossed */
    threshold() {
        blip(392, 0.12, 0.05, 'sine');
        blip(523, 0.16, 0.045, 'triangle', 0.06);
        blip(659, 0.2, 0.035, 'sine', 0.12);
    },

    /** Auth / access granted */
    access() {
        try { gameMusic.playSting('soul_recognized'); } catch {
            blip(523, 0.2, 0.06, 'triangle');
            blip(784, 0.28, 0.05, 'sine', 0.08);
        }
    },

    /** Soft whoosh for dialogue advance */
    whoosh() {
        blip(180, 0.08, 0.03, 'sine');
        blip(320, 0.1, 0.025, 'triangle', 0.02);
    },
};
