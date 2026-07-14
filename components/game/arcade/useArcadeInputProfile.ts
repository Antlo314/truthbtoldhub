'use client';

/**
 * Arcade reuses the world/combat input profile so PC = keyboard-first
 * and phone = touch-first (same settings.controlScheme override).
 */
export { useInputProfile as useArcadeInputProfile } from '@/components/game/controls/useInputProfile';
export type { InputProfile } from '@/lib/game/platform';
