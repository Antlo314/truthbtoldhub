/**
 * A tiny sound synthesizer for the plain's effects — swings, hits, coins,
 * the low thud of a fall — made from numbers instead of files.
 *
 * The parameter set and synthesis follow ZzFX by Frank Force
 * (https://github.com/KilledByAPixel/ZzFX, MIT licence): one oscillator
 * with an ADSR envelope, slide, pitch jump, vibrato-like modulation, noise,
 * bit crush, echo and tremolo. Re-implemented here so it renders into a
 * Web Audio buffer the plain's own volume and mute control.
 */

export type ZzfxParams = [
    volume?: number,
    randomness?: number,
    frequency?: number,
    attack?: number,
    sustain?: number,
    release?: number,
    shape?: number,
    shapeCurve?: number,
    slide?: number,
    deltaSlide?: number,
    pitchJump?: number,
    pitchJumpTime?: number,
    repeatTime?: number,
    noise?: number,
    modulation?: number,
    bitCrush?: number,
    delay?: number,
    sustainVolume?: number,
    decay?: number,
    tremolo?: number,
];

const RATE = 44100;

/** Render a ZzFX-style sound into samples */
export function zzfxSamples(
    volume = 1,
    randomness = 0.05,
    frequency = 220,
    attack = 0,
    sustain = 0,
    release = 0.1,
    shape = 0,
    shapeCurve = 1,
    slide = 0,
    deltaSlide = 0,
    pitchJump = 0,
    pitchJumpTime = 0,
    repeatTime = 0,
    noise = 0,
    modulation = 0,
    bitCrush = 0,
    delay = 0,
    sustainVolume = 1,
    decay = 0,
    tremolo = 0,
): Float32Array {
    const PI2 = Math.PI * 2;
    const sign = (v: number) => (v > 0 ? 1 : -1);
    slide *= (500 * PI2) / RATE / RATE;
    const startSlide = slide;
    frequency *= ((1 + randomness * 2 * Math.random() - randomness) * PI2) / RATE;
    let startFrequency = frequency;
    attack = attack * RATE + 9;
    decay *= RATE;
    sustain *= RATE;
    release *= RATE;
    delay *= RATE;
    deltaSlide *= (500 * PI2) / RATE ** 3;
    modulation *= PI2 / RATE;
    pitchJump *= PI2 / RATE;
    pitchJumpTime *= RATE;
    repeatTime = (repeatTime * RATE) | 0;
    const length = (attack + decay + sustain + release + delay) | 0;
    const b = new Float32Array(Math.max(1, length));
    let t = 0;
    let tm = 0;
    let j = 1;
    let r = 0;
    let c = 0;
    let s = 0;
    const crush = (bitCrush * 100) | 0;
    for (let i = 0; i < length; i++) {
        if (!crush || !(++c % crush)) {
            s = shape
                ? shape > 1
                    ? shape > 2
                        ? shape > 3
                            ? Math.sin((t % PI2) ** 3) // 4: noise-ish
                            : Math.max(Math.min(Math.tan(t), 1), -1) // 3: tan
                        : 1 - (((((2 * t) / PI2) % 2) + 2) % 2) // 2: saw
                    : 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2) // 1: triangle
                : Math.sin(t); // 0: sine
            const env =
                i < attack
                    ? i / attack
                    : i < attack + decay
                      ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
                      : i < attack + decay + sustain
                        ? sustainVolume
                        : i < length - delay
                          ? ((length - i - delay) / release) * sustainVolume
                          : 0;
            s = (repeatTime ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime) : 1) * sign(s) * Math.abs(s) ** shapeCurve * volume * env;
            if (delay) s = s / 2 + (delay > i ? 0 : ((i < length - delay ? 1 : (length - i) / delay) * b[(i - delay) | 0]) / 2);
        }
        const f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++);
        t += f - f * noise * (1 - ((((Math.sin(i) + 1) * 1e9) % 2) | 0));
        if (j && ++j > pitchJumpTime) {
            frequency += pitchJump;
            startFrequency += pitchJump;
            j = 0;
        }
        if (repeatTime && !(++r % repeatTime)) {
            frequency = startFrequency;
            slide = startSlide;
            j = j || 1;
        }
        b[i] = s;
    }
    return b;
}

export const ZZFX_RATE = RATE;
