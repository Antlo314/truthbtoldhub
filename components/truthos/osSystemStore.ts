'use client';

/**
 * Truth.OS system services — theme (wallpaper + accent), notifications,
 * system flyouts (quick settings / calendar / notification center / widgets),
 * task view, lock screen, brightness & night light.
 * Persisted to localStorage so the desktop feels like a real installed OS.
 */
import { create } from 'zustand';
import type { OsAccentId } from './OsIcon';
import { EMPTY_SNAPSHOT as EMPTY_SNAP, type GameSnapshot as Snap } from './osWallpapers';

const THEME_KEY = 'truthos_theme_v3';

export type { OsWallpaper, GameSnapshot } from './osWallpapers';
export {
    OS_WALLPAPERS,
    WALLPAPER_FAMILIES,
    isUnlocked,
    resolveWallpaper,
    EMPTY_SNAPSHOT,
} from './osWallpapers';

export type OsNotification = {
    id: string;
    title: string;
    body?: string;
    accent?: OsAccentId;
    /** epoch ms */
    at: number;
    read?: boolean;
    /** Show as transient toast (default true) */
    toast?: boolean;
};

export type OsFlyout = 'quick' | 'calendar' | 'notifications' | 'widgets' | null;

/** Full-screen system overlays that own the keyboard while open */
export type OsOverlay = 'palette' | 'switcher' | 'shortcuts' | null;

type OsTheme = {
    wallpaper: string;
    accent: OsAccentId;
    /** 0.55 – 1 screen brightness */
    brightness: number;
    nightLight: boolean;
    /** 0 – 1 system volume */
    volume: number;
    /** Silences toasts; notifications still land in the centre */
    doNotDisturb: boolean;
    /** Notify when a neighbor leaves a mark on The Wall */
    wallNeighbor: boolean;
};

const DEFAULT_THEME: OsTheme = {
    wallpaper: 'aurora',
    accent: 'emerald',
    brightness: 1,
    nightLight: false,
    volume: 0.7,
    doNotDisturb: false,
    wallNeighbor: true,
};

function loadTheme(): OsTheme {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    try {
        const raw = localStorage.getItem(THEME_KEY);
        if (!raw) return DEFAULT_THEME;
        const parsed = JSON.parse(raw) as Partial<OsTheme>;
        return { ...DEFAULT_THEME, ...parsed };
    } catch {
        return DEFAULT_THEME;
    }
}

function persistTheme(t: OsTheme) {
    try {
        localStorage.setItem(THEME_KEY, JSON.stringify(t));
    } catch {
        /* private mode */
    }
}

/** Merge a theme patch into state and persist the whole theme */
function patchTheme(current: OsTheme, patch: Partial<OsTheme>): Partial<OsTheme> {
    const next: OsTheme = {
        wallpaper: current.wallpaper,
        accent: current.accent,
        brightness: current.brightness,
        nightLight: current.nightLight,
        volume: current.volume,
        doNotDisturb: current.doNotDisturb,
        wallNeighbor: current.wallNeighbor ?? true,
        ...patch,
    };
    persistTheme(next);
    return patch;
}

let noteSeq = 1;

type OsSystemState = OsTheme & {
    notifications: OsNotification[];
    /** ids currently visible as toasts */
    toastIds: string[];
    flyout: OsFlyout;
    taskView: boolean;
    locked: boolean;
    /** desktop right-click context menu position (null = closed) */
    ctxMenu: { x: number; y: number } | null;

    setWallpaper: (id: string) => void;
    setAccent: (a: OsAccentId) => void;
    setBrightness: (v: number) => void;
    setNightLight: (v: boolean) => void;
    setVolume: (v: number) => void;
    setDoNotDisturb: (v: boolean) => void;
    setWallNeighbor: (v: boolean) => void;

    overlay: OsOverlay;
    setOverlay: (o: OsOverlay) => void;

    /** Live game progress, mirrored in so the OS can gate + display it */
    snapshot: Snap;
    setSnapshot: (s: Snap) => void;

    notify: (n: { title: string; body?: string; accent?: OsAccentId; toast?: boolean }) => void;
    dismissToast: (id: string) => void;
    markAllRead: () => void;
    clearNotifications: () => void;

    setFlyout: (f: OsFlyout) => void;
    toggleFlyout: (f: Exclude<OsFlyout, null>) => void;
    setTaskView: (v: boolean) => void;
    setLocked: (v: boolean) => void;
    setCtxMenu: (p: { x: number; y: number } | null) => void;
};

export const useOsSystem = create<OsSystemState>((set, get) => ({
    ...loadTheme(),
    notifications: [],
    toastIds: [],
    flyout: null,
    taskView: false,
    locked: false,
    ctxMenu: null,
    overlay: null,
    snapshot: EMPTY_SNAP,

    setWallpaper: (id) => set((s) => patchTheme(s, { wallpaper: id })),
    setAccent: (a) => set((s) => patchTheme(s, { accent: a })),
    setBrightness: (v) =>
        set((s) => patchTheme(s, { brightness: Math.min(1, Math.max(0.55, v)) })),
    setNightLight: (v) => set((s) => patchTheme(s, { nightLight: v })),
    setVolume: (v) => set((s) => patchTheme(s, { volume: Math.min(1, Math.max(0, v)) })),
    setDoNotDisturb: (v) => set((s) => patchTheme(s, { doNotDisturb: v })),
    setWallNeighbor: (v) => set((s) => patchTheme(s, { wallNeighbor: v })),

    setOverlay: (o) => set({ overlay: o, flyout: null, ctxMenu: null }),
    setSnapshot: (snap) => set({ snapshot: snap }),

    notify: ({ title, body, accent, toast = true }) => {
        const id = `n${noteSeq++}_${Date.now().toString(36)}`;
        // Do-not-disturb silences the popup but still files the notification
        const popup = toast && !get().doNotDisturb;
        const note: OsNotification = { id, title, body, accent, at: Date.now(), toast: popup };
        set((s) => ({
            notifications: [note, ...s.notifications].slice(0, 40),
            toastIds: popup ? [...s.toastIds, id] : s.toastIds,
        }));
        if (popup) {
            setTimeout(() => get().dismissToast(id), 5200);
        }
    },
    dismissToast: (id) => set((s) => ({ toastIds: s.toastIds.filter((t) => t !== id) })),
    markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    clearNotifications: () => set({ notifications: [], toastIds: [] }),

    setFlyout: (f) => set({ flyout: f, ctxMenu: null }),
    toggleFlyout: (f) => set((s) => ({ flyout: s.flyout === f ? null : f, ctxMenu: null })),
    setTaskView: (v) => set({ taskView: v, flyout: null, ctxMenu: null }),
    setLocked: (v) => set({ locked: v, flyout: null, taskView: false, ctxMenu: null }),
    setCtxMenu: (p) => set({ ctxMenu: p }),
}));

/** Accent hex values for non-Tailwind uses (canvas, inline styles) */
export const ACCENT_HEX: Record<OsAccentId, string> = {
    emerald: '#34d399',
    amber: '#fbbf24',
    gold: '#f5c451',
    cyan: '#22d3ee',
    violet: '#a78bfa',
    rose: '#fb7185',
    sky: '#38bdf8',
    indigo: '#818cf8',
    pink: '#f472b6',
    zinc: '#94a3b8',
};
