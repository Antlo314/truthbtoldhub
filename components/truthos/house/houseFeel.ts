/**
 * Industry-calibrated first-person feel for Truth.OS House.
 * Tuned against common mobile FP / open-world mobile baselines
 * (COD Mobile, Genshin exploration, Roblox FP walk).
 */

/** Walk m/s — snappy but readable indoors (~ brisk walk) */
export const WALK_SPEED = 6.2;
/** Sprint optional (keyboard Shift) */
export const SPRINT_MULT = 1.35;

/** How fast velocity approaches stick target (higher = snappier) */
export const MOVE_ACCEL = 22;
/** How fast velocity dies with no input */
export const MOVE_FRICTION = 18;

/**
 * Stick deadzone (radial). Mobile industry common range 0.12–0.18.
 * Below this magnitude → zero input.
 */
export const STICK_DEADZONE = 0.14;

/**
 * Response curve power. >1 softens center (fine aim walk), full at edge.
 * 1.0 = linear; 1.25–1.5 typical for locomotion sticks.
 */
export const STICK_CURVE = 1.28;

/** Desktop mouse look: radians per pixel (drag) */
export const LOOK_SENS_DESKTOP = 0.00285;
/** Mobile touch look: slightly hotter for thumb + finger */
export const LOOK_SENS_MOBILE = 0.00355;
/** Look pitch clamp (radians) */
export const PITCH_MAX = 1.15;

/** Jump / gravity — floaty enough to feel, snappy enough indoors */
export const JUMP_V = 5.8;
export const GRAVITY = 17;
export const EYE_HEIGHT = 1.62;

/** Subtle head bob when walking (amplitude in meters) */
export const BOB_AMP = 0.022;
export const BOB_FREQ = 8.5;

/** Camera look smoothing (0 = raw, ~12–18 = soft) */
export const LOOK_SMOOTH = 16;

/** Mobile control geometry (px) — Apple 44pt min; games go larger for thumbs */
export const MOBILE = {
    /** Virtual stick outer radius */
    stickR: 68,
    /** Knob radius */
    knobR: 28,
    /** Primary action (Interact) diameter */
    action: 72,
    /** Secondary action (Jump) diameter */
    actionSecondary: 58,
    /** Left zone fraction for move stick (rest of screen = look) */
    moveZone: 0.48,
    /** Opacity when idle / active */
    idleOpacity: 0.42,
    activeOpacity: 0.88,
} as const;

/**
 * Apply radial deadzone + power curve to a unit stick sample.
 * Returns 0…1 magnitude remapped, preserving angle via x/y.
 */
export function shapeStick(x: number, y: number): { x: number; y: number; mag: number } {
    const raw = Math.hypot(x, y);
    if (raw < STICK_DEADZONE || raw < 1e-6) return { x: 0, y: 0, mag: 0 };
    // Remap [deadzone, 1] → [0, 1]
    let t = (raw - STICK_DEADZONE) / (1 - STICK_DEADZONE);
    t = Math.min(1, Math.max(0, t));
    t = Math.pow(t, STICK_CURVE);
    const s = t / raw;
    return { x: x * s, y: y * s, mag: t };
}

/** Exponential approach for smooth velocity */
export function damp(current: number, target: number, lambda: number, dt: number): number {
    // frame-rate independent exp decay
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
