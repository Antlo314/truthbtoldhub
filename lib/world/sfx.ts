/**
 * The plain's sound effects, synthesized (zzfx.ts) — no files to fetch, a
 * different take every time (each preset carries a little randomness), and
 * positioned: give a world point and it pans and fades with distance from
 * the walker.
 */
import { zzfxSamples, ZZFX_RATE, type ZzfxParams } from './zzfx';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';

const PRESETS = {
    swing: [0.45, 0.12, 360, 0.01, 0.04, 0.12, 4, 1.4, -18, 0, 0, 0, 0, 1.2, 0, 0, 0, 0.6, 0.05],
    swingHeavy: [0.6, 0.1, 190, 0.03, 0.08, 0.2, 4, 1.6, -10, 0, 0, 0, 0, 1.6, 0, 0, 0, 0.6, 0.08],
    hit: [0.85, 0.1, 140, 0, 0.02, 0.15, 3, 2, -8, 0, 0, 0, 0, 0.6, 0, 0.1, 0, 0.7, 0.04],
    crit: [0.6, 0.05, 880, 0, 0.03, 0.22, 1, 1, 0, 0, 440, 0.04],
    enemyDie: [0.6, 0.1, 420, 0.01, 0.1, 0.4, 2, 1, -30, 0, 0, 0, 0, 0.3],
    hurt: [0.75, 0.05, 160, 0, 0.05, 0.25, 3, 1.5, -10, 0, 0, 0, 0, 0.8, 0, 0.15],
    dodge: [0.4, 0.1, 260, 0.02, 0.06, 0.15, 4, 1, 12, 0, 0, 0, 0, 1.5],
    block: [0.7, 0.05, 520, 0, 0.02, 0.3, 1, 1, 0, 0, 0, 0, 0, 0.2, 7, 0, 0.05],
    coin: [0.5, 0.02, 1200, 0, 0.03, 0.18, 1, 1, 0, 0, 600, 0.05],
    pickup: [0.45, 0.05, 700, 0.01, 0.05, 0.2, 0, 1, 0, 0, 300, 0.06],
    eat: [0.5, 0.2, 300, 0, 0.05, 0.1, 4, 1, 0, 0, 0, 0, 0.06, 1.8],
    drink: [0.4, 0.1, 500, 0.02, 0.1, 0.2, 0, 1, -5, 0, 0, 0, 0.08, 0, 2],
    levelUp: [0.6, 0, 523, 0.02, 0.3, 0.5, 1, 1, 0, 0, 262, 0.08, 0.16],
    questDone: [0.6, 0, 660, 0.02, 0.25, 0.4, 0, 1, 0, 0, 330, 0.1, 0.2],
    questNew: [0.45, 0, 440, 0.02, 0.1, 0.3, 0, 1, 0, 0, 220, 0.08],
    prayStart: [0.3, 0, 880, 0.1, 0.4, 1.2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.6],
    prayDone: [0.5, 0, 440, 0.3, 0.5, 1.5, 0, 1, 0, 0, 220, 0.4, 0, 0, 0, 0, 0.25],
    give: [0.45, 0, 600, 0.02, 0.1, 0.4, 0, 1, 0, 0, 200, 0.07],
    light: [0.8, 0, 300, 0.05, 0.3, 0.8, 2, 1, 20, 0, 0, 0, 0, 0.2, 0, 0, 0.2],
    thunder: [1, 0.2, 60, 0.05, 0.6, 2.5, 4, 2, -2, 0, 0, 0, 0, 3, 0, 0.4, 0, 0.8, 0.3],
    heartbeat: [0.55, 0, 58, 0.01, 0.05, 0.16, 0, 1, -2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.05],
    uiOpen: [0.22, 0, 900, 0, 0.02, 0.06, 0, 1, 0, 0, 200, 0.02],
    uiClose: [0.2, 0, 700, 0, 0.02, 0.06, 0, 1, 0, 0, -200, 0.02],
    equip: [0.4, 0, 300, 0, 0.03, 0.1, 1, 1, 0, 0, 200, 0.03],
    fall: [0.7, 0, 180, 0.05, 0.4, 1.2, 2, 1, -6, 0, 0, 0, 0, 0.4, 0, 0.2],
    squish: [0.5, 0.2, 200, 0, 0.05, 0.12, 0, 1, 20, 0, 0, 0, 0, 0, 30],
    growl: [0.5, 0.1, 90, 0.05, 0.3, 0.3, 3, 1, 0, 0, 0, 0, 0, 2, 0, 0.1, 0, 1, 0, 0.5],
    wail: [0.4, 0.1, 520, 0.2, 0.3, 0.6, 0, 1, -4, 0, 0, 0, 0.3, 0, 6, 0, 0.2, 0.7, 0, 0.4],
    windup: [0.35, 0.1, 150, 0.1, 0.1, 0.1, 3, 1, 5],
    deny: [0.3, 0, 180, 0, 0.04, 0.08, 1, 1, 0, 0, -40, 0.04],
} satisfies Record<string, ZzfxParams>;

export type SfxName = keyof typeof PRESETS;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const cache = new Map<SfxName, AudioBuffer[]>();

function ac(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.42;
            master.connect(ctx.destination);
            const wake = () => {
                if (ctx?.state === 'suspended') void ctx.resume();
            };
            window.addEventListener('pointerdown', wake, { passive: true });
            window.addEventListener('keydown', wake);
        } catch {
            return null;
        }
    }
    return ctx;
}

function buffer(name: SfxName): AudioBuffer | null {
    const c = ac();
    if (!c) return null;
    let list = cache.get(name);
    if (!list) {
        list = [];
        cache.set(name, list);
    }
    // three takes per sound, so repeats don't sound stamped
    if (list.length < 3) {
        const samples = zzfxSamples(...(PRESETS[name] as ZzfxParams));
        const b = c.createBuffer(1, samples.length, ZZFX_RATE);
        b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        list.push(b);
        return b;
    }
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Play a sound. With `at`, it is placed in the world: panned by bearing
 * from the walker and quieter with distance (silent past `range`).
 */
export function sfx(name: SfxName, opts: { at?: { x: number; z: number }; volume?: number; range?: number; rate?: number } = {}) {
    if (hubAudio.isMuted()) return;
    const c = ac();
    if (!c || !master) return;
    if (c.state === 'suspended') void c.resume();
    let gain = opts.volume ?? 1;
    let pan = 0;
    if (opts.at) {
        const p = getWalkerPose();
        const dx = opts.at.x - p.x;
        const dz = opts.at.z - p.z;
        const d = Math.hypot(dx, dz);
        const range = opts.range ?? 40;
        if (d > range) return;
        gain *= 1 / (1 + d / 7);
        // how far to the walker's right it is; right is (cos yaw, −sin yaw)
        const side = d > 0.01 ? (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / d : 0;
        pan = Math.max(-0.85, Math.min(0.85, side));
    }
    const b = buffer(name);
    if (!b) return;
    const src = c.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = (opts.rate ?? 1) * (0.94 + Math.random() * 0.12);
    const g = c.createGain();
    g.gain.value = gain;
    const p = c.createStereoPanner();
    p.pan.value = pan;
    src.connect(g).connect(p).connect(master);
    src.start();
}
