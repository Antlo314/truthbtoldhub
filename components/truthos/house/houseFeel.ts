/**
 * Fluid first-person feel — easy on PC keyboard + mobile stick.
 */

/** Walk m/s — readable indoors, still snappy */
export const WALK_SPEED = 5.6;
export const SPRINT_MULT = 1.4;

/** High accel = almost instant response (less "heavy") */
export const MOVE_ACCEL = 28;
export const MOVE_FRICTION = 22;

/** Soft deadzone so light thumb still moves */
export const STICK_DEADZONE = 0.1;
/** Near-linear stick response for easy walking */
export const STICK_CURVE = 1.12;

export const LOOK_SENS_DESKTOP = 0.0026;
export const LOOK_SENS_MOBILE = 0.0034;
export const PITCH_MAX = 1.15;

export const JUMP_V = 5.5;
export const GRAVITY = 16;
export const EYE_HEIGHT = 1.62;

export const BOB_AMP = 0.016;
export const BOB_FREQ = 8.2;

/** Mild look smoothing — still responsive */
export const LOOK_SMOOTH = 22;

export const MOBILE = {
    stickR: 72,
    knobR: 30,
    action: 74,
    actionSecondary: 60,
    moveZone: 0.5,
    idleOpacity: 0.5,
    activeOpacity: 0.92,
} as const;

export function shapeStick(x: number, y: number): { x: number; y: number; mag: number } {
    const raw = Math.hypot(x, y);
    if (raw < STICK_DEADZONE || raw < 1e-6) return { x: 0, y: 0, mag: 0 };
    let t = (raw - STICK_DEADZONE) / (1 - STICK_DEADZONE);
    t = Math.min(1, Math.max(0, t));
    t = Math.pow(t, STICK_CURVE);
    const s = t / raw;
    return { x: x * s, y: y * s, mag: t };
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
