/**
 * Render quality tiers for the world.
 *
 * One table decides what a frame costs — resolution ceiling, shadow map,
 * post stack, environment capture, clouds, water reflections — so a phone
 * and a desktop GPU read the same scene description and simply spend
 * differently. `auto` picks a tier from the device; PerformanceMonitor
 * can still walk a tier down at runtime when frames are being missed.
 */

export type QualitySetting = 'auto' | 'ultra' | 'high' | 'balanced' | 'low';
export type QualityTier = 'ultra' | 'high' | 'balanced' | 'low';

export const QUALITY_ORDER: QualityTier[] = ['ultra', 'high', 'balanced', 'low'];

export const QUALITY_LABELS: Record<QualitySetting, string> = {
    auto: 'Auto',
    ultra: 'Ultra',
    high: 'High',
    balanced: 'Balanced',
    low: 'Low',
};

export type QualityProfile = {
    tier: QualityTier;
    /** [floor, start, ceiling] device-pixel ratio */
    dpr: [number, number, number];
    shadows: boolean;
    shadowMap: number;
    /** Post-processing composer at all */
    post: boolean;
    /** Subpixel morphological antialiasing */
    smaa: boolean;
    bloom: boolean;
    /** Depth of field — off by default: it is what made the room read soft */
    dof: boolean;
    /** Sky-driven image based lighting */
    env: boolean;
    envResolution: number;
    /** Seconds between environment recaptures */
    envEvery: number;
    clouds: boolean;
    /** Live reflections on the Mirror Well */
    reflections: boolean;
    reflectionResolution: number;
    atmosphere: boolean;
    rain: boolean;
    sparkles: boolean;
    anisotropy: number;
    /** Rigged GLB vessels for every soul (else the procedural figure) */
    riggedVessels: boolean;
    /** GLB props (else procedural solids) */
    props: boolean;
};

const PROFILES: Record<QualityTier, QualityProfile> = {
    ultra: {
        tier: 'ultra',
        dpr: [1.25, 2, 2],
        shadows: true,
        shadowMap: 4096,
        post: true,
        smaa: true,
        bloom: true,
        dof: false,
        env: true,
        envResolution: 128,
        envEvery: 1.5,
        clouds: true,
        reflections: true,
        reflectionResolution: 768,
        atmosphere: true,
        rain: true,
        sparkles: true,
        anisotropy: 16,
        riggedVessels: true,
        props: true,
    },
    high: {
        tier: 'high',
        dpr: [1, 1.5, 1.75],
        shadows: true,
        shadowMap: 2048,
        post: true,
        smaa: true,
        bloom: true,
        dof: false,
        env: true,
        envResolution: 64,
        envEvery: 2,
        clouds: true,
        reflections: true,
        reflectionResolution: 512,
        atmosphere: true,
        rain: true,
        sparkles: true,
        anisotropy: 8,
        riggedVessels: true,
        props: true,
    },
    balanced: {
        tier: 'balanced',
        dpr: [0.9, 1.25, 1.5],
        shadows: true,
        shadowMap: 1024,
        post: true,
        smaa: true,
        bloom: true,
        dof: false,
        env: true,
        envResolution: 32,
        envEvery: 3,
        clouds: false,
        reflections: false,
        reflectionResolution: 256,
        atmosphere: false,
        rain: true,
        sparkles: false,
        anisotropy: 4,
        riggedVessels: true,
        props: true,
    },
    low: {
        tier: 'low',
        dpr: [0.65, 1.1, 1.25],
        shadows: false,
        shadowMap: 512,
        post: false,
        smaa: false,
        bloom: false,
        dof: false,
        env: false,
        envResolution: 16,
        envEvery: 6,
        clouds: false,
        reflections: false,
        reflectionResolution: 128,
        atmosphere: false,
        rain: false,
        sparkles: false,
        anisotropy: 2,
        riggedVessels: true,
        props: false,
    },
};

export function profileFor(tier: QualityTier): QualityProfile {
    return PROFILES[tier];
}

/** Which tier `auto` means on this device. */
export function autoTier(mobile: boolean): QualityTier {
    if (mobile) return 'low';
    if (typeof navigator === 'undefined') return 'high';
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    if (cores <= 4 || mem <= 4) return 'balanced';
    return 'high';
}

/**
 * Resolve the tier the scene should run at. `drop` is how many steps the
 * runtime monitor has walked the tier down since the session began.
 */
export function resolveTier(setting: QualitySetting, mobile: boolean, drop = 0): QualityTier {
    const base = setting === 'auto' ? autoTier(mobile) : setting;
    const i = Math.min(QUALITY_ORDER.length - 1, QUALITY_ORDER.indexOf(base) + Math.max(0, drop));
    return QUALITY_ORDER[i];
}
