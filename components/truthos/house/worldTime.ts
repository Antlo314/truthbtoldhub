'use client';

/**
 * World clock + weather.
 *
 * One source of truth for "what time is it in the world and what's the sky
 * doing", so the sun, fog, star field, street lamps, window glow and the HUD
 * all agree. Everything downstream reads a resolved `SkyState` rather than
 * re-deriving lighting from the hour, which is what keeps them in step.
 *
 * Time is expressed as fractional hours 0–24. A full day defaults to twelve
 * real minutes; `setDayLength` can slow it to a crawl or freeze it entirely
 * for screenshots.
 */
import { create } from 'zustand';

export type Phase = 'night' | 'dawn' | 'day' | 'dusk';
export type Weather = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'fog';

export type RGB = [number, number, number];

/** Everything the renderer needs for one instant of the day */
export type SkyState = {
    hour: number;
    phase: Phase;
    /** 0 at midnight, 1 at solar noon — drives most intensity ramps */
    daylight: number;
    sunDir: [number, number, number];
    sunColor: RGB;
    sunIntensity: number;
    ambientColor: RGB;
    ambientIntensity: number;
    hemiSky: RGB;
    hemiGround: RGB;
    hemiIntensity: number;
    skyTint: RGB;
    fogColor: RGB;
    fogNear: number;
    fogFar: number;
    /** 1 = fully visible star field, 0 = washed out by the sun */
    starOpacity: number;
    moonOpacity: number;
    /** 1 = street lamps and window glow at full, 0 = off */
    lampLevel: number;
};

/* ── colour helpers ─────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function rgbToHex(c: RGB): string {
    const h = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, '0');
    return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

/* ── the day, as keyframes ──────────────────────────────── */

type Key = {
    at: number;
    sunColor: RGB;
    sunIntensity: number;
    ambientColor: RGB;
    ambientIntensity: number;
    hemiSky: RGB;
    hemiGround: RGB;
    hemiIntensity: number;
    skyTint: RGB;
    fogColor: RGB;
    fogNear: number;
    fogFar: number;
};

/**
 * Keyframes are interpolated, so dawn and dusk read as transitions rather than
 * switches. Night keeps a cool moonlit cast instead of going black — an
 * unlit night is unreadable to walk around in.
 */
const KEYS: Key[] = [
    {
        at: 0, // deep night
        sunColor: [150, 170, 255],
        sunIntensity: 0.16,
        ambientColor: [200, 205, 240],
        ambientIntensity: 0.3,
        hemiSky: [140, 155, 215],
        hemiGround: [38, 32, 56],
        hemiIntensity: 0.45,
        skyTint: [42, 46, 84],
        fogColor: [18, 16, 34],
        fogNear: 16,
        fogFar: 54,
    },
    {
        at: 5.2, // first light
        sunColor: [255, 168, 150],
        sunIntensity: 0.4,
        ambientColor: [230, 205, 210],
        ambientIntensity: 0.45,
        hemiSky: [190, 165, 200],
        hemiGround: [58, 44, 60],
        hemiIntensity: 0.6,
        skyTint: [120, 88, 120],
        fogColor: [70, 52, 72],
        fogNear: 14,
        fogFar: 50,
    },
    {
        at: 7, // sunrise
        sunColor: [255, 196, 148],
        sunIntensity: 1.15,
        ambientColor: [255, 236, 220],
        ambientIntensity: 0.62,
        hemiSky: [214, 206, 236],
        hemiGround: [96, 82, 78],
        hemiIntensity: 0.8,
        skyTint: [196, 150, 148],
        fogColor: [150, 128, 132],
        fogNear: 20,
        fogFar: 70,
    },
    {
        at: 12, // noon
        sunColor: [255, 250, 236],
        sunIntensity: 2.1,
        ambientColor: [255, 253, 248],
        ambientIntensity: 0.85,
        hemiSky: [186, 214, 255],
        hemiGround: [128, 118, 104],
        hemiIntensity: 1.0,
        skyTint: [150, 194, 255],
        fogColor: [176, 200, 232],
        fogNear: 30,
        fogFar: 120,
    },
    {
        at: 17.5, // late afternoon
        sunColor: [255, 214, 168],
        sunIntensity: 1.35,
        ambientColor: [255, 238, 222],
        ambientIntensity: 0.68,
        hemiSky: [206, 202, 238],
        hemiGround: [110, 92, 86],
        hemiIntensity: 0.82,
        skyTint: [206, 166, 158],
        fogColor: [162, 136, 134],
        fogNear: 24,
        fogFar: 88,
    },
    {
        at: 19.6, // sunset
        sunColor: [255, 146, 96],
        sunIntensity: 0.55,
        ambientColor: [232, 196, 194],
        ambientIntensity: 0.46,
        hemiSky: [172, 150, 200],
        hemiGround: [62, 48, 62],
        hemiIntensity: 0.6,
        skyTint: [132, 88, 106],
        fogColor: [72, 50, 64],
        fogNear: 16,
        fogFar: 58,
    },
    {
        at: 21.5, // nightfall
        sunColor: [150, 170, 255],
        sunIntensity: 0.18,
        ambientColor: [204, 208, 242],
        ambientIntensity: 0.32,
        hemiSky: [144, 158, 218],
        hemiGround: [40, 34, 58],
        hemiIntensity: 0.47,
        skyTint: [50, 52, 92],
        fogColor: [22, 20, 40],
        fogNear: 16,
        fogFar: 54,
    },
    { ...({} as Key), at: 24 }, // filled below — wraps to the 0h key
];
KEYS[KEYS.length - 1] = { ...KEYS[0], at: 24 };

function sampleKeys(hour: number): Key {
    let a = KEYS[0];
    let b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) {
        if (hour >= KEYS[i].at && hour <= KEYS[i + 1].at) {
            a = KEYS[i];
            b = KEYS[i + 1];
            break;
        }
    }
    const span = b.at - a.at || 1;
    const t = Math.max(0, Math.min(1, (hour - a.at) / span));
    return {
        at: hour,
        sunColor: lerpRgb(a.sunColor, b.sunColor, t),
        sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
        ambientColor: lerpRgb(a.ambientColor, b.ambientColor, t),
        ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
        hemiSky: lerpRgb(a.hemiSky, b.hemiSky, t),
        hemiGround: lerpRgb(a.hemiGround, b.hemiGround, t),
        hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
        skyTint: lerpRgb(a.skyTint, b.skyTint, t),
        fogColor: lerpRgb(a.fogColor, b.fogColor, t),
        fogNear: lerp(a.fogNear, b.fogNear, t),
        fogFar: lerp(a.fogFar, b.fogFar, t),
    };
}

export function phaseOf(hour: number): Phase {
    if (hour >= 5.2 && hour < 7.4) return 'dawn';
    if (hour >= 7.4 && hour < 17.5) return 'day';
    if (hour >= 17.5 && hour < 20.4) return 'dusk';
    return 'night';
}

/** How much each weather type dims and thickens the air */
const WEATHER_MOD: Record<Weather, { light: number; fog: number; desat: number }> = {
    clear: { light: 1, fog: 1, desat: 0 },
    cloudy: { light: 0.82, fog: 0.86, desat: 0.18 },
    overcast: { light: 0.62, fog: 0.7, desat: 0.34 },
    rain: { light: 0.52, fog: 0.55, desat: 0.42 },
    fog: { light: 0.6, fog: 0.28, desat: 0.5 },
};

export const WEATHER_LABEL: Record<Weather, string> = {
    clear: 'Clear',
    cloudy: 'Cloudy',
    overcast: 'Overcast',
    rain: 'Rain',
    fog: 'Fog',
};

/** Resolve the full render state for an hour + weather */
export function resolveSky(hour: number, weather: Weather): SkyState {
    const k = sampleKeys(((hour % 24) + 24) % 24);
    const w = WEATHER_MOD[weather];

    // Sun rides an arc: up at noon, below the horizon at night
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(angle);
    const sunDir: [number, number, number] = [
        Math.cos(angle) * 26,
        Math.max(-14, elev * 30),
        -10 + Math.cos(angle * 0.5) * 12,
    ];
    const daylight = Math.max(0, Math.min(1, elev * 1.15 + 0.12));

    // Grey the palette toward its own luminance as weather worsens
    const desat = (c: RGB): RGB => {
        if (!w.desat) return c;
        const l = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
        return lerpRgb(c, [l, l, l], w.desat);
    };

    const lampLevel = Math.max(0, Math.min(1, 1 - daylight * 1.8));

    return {
        hour,
        phase: phaseOf(hour),
        daylight,
        sunDir,
        sunColor: desat(k.sunColor),
        sunIntensity: k.sunIntensity * w.light,
        ambientColor: desat(k.ambientColor),
        // Overcast skies scatter light, so ambient falls off less than the sun
        ambientIntensity: k.ambientIntensity * (0.55 + w.light * 0.45),
        hemiSky: desat(k.hemiSky),
        hemiGround: desat(k.hemiGround),
        hemiIntensity: k.hemiIntensity * (0.6 + w.light * 0.4),
        skyTint: desat(k.skyTint),
        fogColor: desat(k.fogColor),
        fogNear: k.fogNear * w.fog,
        fogFar: k.fogFar * w.fog,
        starOpacity: Math.max(0, 1 - daylight * 2.2) * (weather === 'clear' ? 1 : 0.25),
        moonOpacity: Math.max(0, 1 - daylight * 1.9) * (weather === 'clear' ? 1 : 0.4),
        lampLevel,
    };
}

/* ── store ──────────────────────────────────────────────── */

/** Real seconds for one full in-world day */
const DEFAULT_DAY_LENGTH = 12 * 60;

type WorldTimeState = {
    hour: number;
    dayLength: number;
    paused: boolean;
    weather: Weather;
    /** Days elapsed since the session began */
    day: number;

    advance: (deltaSeconds: number) => void;
    setHour: (h: number) => void;
    setDayLength: (s: number) => void;
    setPaused: (p: boolean) => void;
    setWeather: (w: Weather) => void;
    /** Roll the next weather, biased to stay put so it doesn't flicker */
    rollWeather: () => void;
};

const WEATHER_CHAIN: Record<Weather, Weather[]> = {
    clear: ['clear', 'clear', 'cloudy', 'fog'],
    cloudy: ['cloudy', 'clear', 'overcast', 'rain'],
    overcast: ['overcast', 'cloudy', 'rain', 'rain'],
    rain: ['rain', 'overcast', 'cloudy'],
    fog: ['fog', 'clear', 'cloudy'],
};

export const useWorldTime = create<WorldTimeState>((set, get) => ({
    // Start mid-morning so a first-time visitor sees the world lit
    hour: 9.5,
    dayLength: DEFAULT_DAY_LENGTH,
    paused: false,
    weather: 'clear',
    day: 1,

    advance: (dt) => {
        const { paused, dayLength, hour, day } = get();
        if (paused || dt <= 0) return;
        const next = hour + (dt / dayLength) * 24;
        if (next >= 24) set({ hour: next % 24, day: day + 1 });
        else set({ hour: next });
    },
    setHour: (h) => set({ hour: ((h % 24) + 24) % 24 }),
    setDayLength: (s) => set({ dayLength: Math.max(10, s) }),
    setPaused: (p) => set({ paused: p }),
    setWeather: (w) => set({ weather: w }),
    rollWeather: () => {
        const cur = get().weather;
        const pool = WEATHER_CHAIN[cur];
        set({ weather: pool[Math.floor(Math.random() * pool.length)] });
    },
}));

/** "07:42" for the HUD */
export function formatClock(hour: number): string {
    const h = Math.floor(((hour % 24) + 24) % 24);
    const m = Math.floor((hour - Math.floor(hour)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
