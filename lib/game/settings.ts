// Client-side game settings (localStorage, not cloud-synced).

export interface GameSettings {
    reducedMotion: boolean;
    haptics: boolean;
    showMinimap: boolean;
    showQuestTrail: boolean;
    subtitles: boolean;
    textScale: 'normal' | 'large';
}

const KEY = 'tbth-game-settings';

export const DEFAULT_SETTINGS: GameSettings = {
    reducedMotion: false,
    haptics: true,
    showMinimap: true,
    showQuestTrail: true,
    subtitles: true,
    textScale: 'normal',
};

export function loadSettings(): GameSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(s: Partial<GameSettings>): GameSettings {
    const next = { ...loadSettings(), ...s };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
}

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return loadSettings().reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}