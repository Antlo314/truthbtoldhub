import { loadSettings } from '@/lib/game/settings';

export function hapticTap(pattern: 'light' | 'medium' | 'heavy' = 'light') {
    if (typeof navigator === 'undefined' || !loadSettings().haptics) return;
    const ms = pattern === 'heavy' ? 28 : pattern === 'medium' ? 18 : 10;
    try {
        navigator.vibrate?.(ms);
    } catch { /* unsupported */ }
}