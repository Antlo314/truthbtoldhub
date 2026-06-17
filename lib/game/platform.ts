// ============================================================
//  INPUT PROFILE — touch-first mobile vs keyboard-first desktop
// ============================================================

export type InputProfile = 'touch' | 'keyboard';
export type ControlScheme = 'auto' | 'touch' | 'keyboard';

/** Breakpoint where the game switches to the desktop control layout. */
export const DESKTOP_BREAKPOINT_PX = 1024;

export function detectInputProfile(): InputProfile {
    if (typeof window === 'undefined') return 'keyboard';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const wide = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
    if (fineHover && wide) return 'keyboard';
    if (coarse) return 'touch';
    return wide ? 'keyboard' : 'touch';
}

export function resolveInputProfile(scheme: ControlScheme): InputProfile {
    if (scheme === 'touch') return 'touch';
    if (scheme === 'keyboard') return 'keyboard';
    return detectInputProfile();
}

export function isDesktopLayout(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= DESKTOP_BREAKPOINT_PX;
}