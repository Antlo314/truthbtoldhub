import type { InputProfile } from '@/lib/game/platform';

// ============================================================
//  CONTROL SIZES — one place for mobile thumb targets vs PC HUD
// ============================================================

export const MOBILE_JOY_R = 58;
export const MOBILE_ACTION = 76;
export const MOBILE_BAR_H = 210;

export const DESKTOP_HINT_BAR_H = 52;

/** Reserve space so speech bubbles clear thumb controls (mobile) */
export const WORLD_SPEECH_BOTTOM_MOBILE = `calc(${MOBILE_BAR_H}px + env(safe-area-inset-bottom))`;

/** Desktop keyboard hint bar + padding */
export const WORLD_SPEECH_BOTTOM_DESKTOP = `calc(${DESKTOP_HINT_BAR_H}px + 1.5rem + env(safe-area-inset-bottom))`;

export function joyRadius(profile: InputProfile, large = false): number {
    if (profile === 'keyboard') return 0;
    return large ? 64 : MOBILE_JOY_R;
}

export function actionSize(profile: InputProfile, large = false): number {
    if (profile === 'keyboard') return 0;
    return large ? 84 : MOBILE_ACTION;
}

// ============================================================
//  COMBAT CONTROLS — deliberately tighter + translucent than the world's, so
//  the fight keeps the screen. The pad also auto-fades when idle.
// ============================================================
export const COMBAT_JOY_R = 44;
export const COMBAT_ACTION = 60;
export const COMBAT_BAR_H = 150;

export function combatJoyRadius(large = false): number {
    return large ? 52 : COMBAT_JOY_R;
}