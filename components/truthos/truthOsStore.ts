'use client';

import { create } from 'zustand';

/** OS apps — house stations stay in the 3D house */
export type OsAppId =
    | 'truth'
    | 'updates'
    | 'account'
    | 'settings'
    | 'admin'
    | 'files';

export function detectDevice(): 'desktop' | 'phone' {
    if (typeof window === 'undefined') return 'desktop';
    const narrow = window.innerWidth < 768;
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const touch = navigator.maxTouchPoints > 0;
    return narrow || (coarse && touch) ? 'phone' : 'desktop';
}

export type OsWindow = {
    id: string;
    app: OsAppId;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    minimized?: boolean;
    maximized?: boolean;
};

type TruthOsState = {
    phase: 'room' | 'device-lock' | 'os';
    windows: OsWindow[];
    focusId: string | null;
    zTop: number;
    bootDone: boolean;
    startOpen: boolean;
    openDevice: () => void;
    closeToRoom: () => void;
    enterOs: () => void;
    openApp: (app: OsAppId) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    setBootDone: (v: boolean) => void;
    setStartOpen: (v: boolean) => void;
};

const APP_META: Record<OsAppId, { title: string; w: number; h: number }> = {
    truth: { title: 'Truth Terminal', w: 560, h: 500 },
    updates: { title: 'Updates', w: 480, h: 460 },
    account: { title: 'Account', w: 440, h: 480 },
    settings: { title: 'Settings', w: 400, h: 380 },
    admin: { title: 'Admin Console', w: 520, h: 560 },
    files: { title: 'Files', w: 420, h: 360 },
};

let winSeq = 1;

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'room',
    windows: [],
    focusId: null,
    zTop: 10,
    bootDone: false,
    startOpen: false,

    openDevice: () => set({ phase: 'device-lock' }),
    closeToRoom: () =>
        set({ phase: 'room', windows: [], focusId: null, bootDone: false, startOpen: false }),
    enterOs: () => set({ phase: 'os', bootDone: false, startOpen: false }),
    setBootDone: (v) => set({ bootDone: v }),
    setStartOpen: (v) => set({ startOpen: v }),

    openApp: (app) => {
        const meta = APP_META[app];
        const existing = get().windows.find((w) => w.app === app);
        if (existing) {
            set((s) => ({
                windows: s.windows.map((w) =>
                    w.id === existing.id ? { ...w, minimized: false } : w,
                ),
                startOpen: false,
            }));
            get().focusWindow(existing.id);
            return;
        }
        const z = get().zTop + 1;
        const id = `w${winSeq++}`;
        const n = get().windows.length;
        const win: OsWindow = {
            id,
            app,
            title: meta.title,
            x: 56 + (n % 4) * 32,
            y: 56 + (n % 3) * 28,
            w: meta.w,
            h: meta.h,
            z,
        };
        set({
            windows: [...get().windows, win],
            focusId: id,
            zTop: z,
            startOpen: false,
        });
    },

    closeWindow: (id) =>
        set((s) => ({
            windows: s.windows.filter((w) => w.id !== id),
            focusId: s.focusId === id ? s.windows.find((w) => w.id !== id)?.id ?? null : s.focusId,
        })),

    focusWindow: (id) => {
        const z = get().zTop + 1;
        set((s) => ({
            focusId: id,
            zTop: z,
            windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
        }));
    },

    moveWindow: (id, x, y) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, x, y, maximized: false } : w)),
        })),

    minimizeWindow: (id) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
            focusId: s.focusId === id ? null : s.focusId,
        })),

    toggleMaximize: (id) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w,
            ),
        })),
}));
