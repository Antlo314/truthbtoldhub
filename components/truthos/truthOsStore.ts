'use client';

import { create } from 'zustand';

/** OS apps only — house stations are NOT duplicated here */
export type OsAppId =
    | 'truth'
    | 'updates'
    | 'account'
    | 'settings';

/** Legacy helper for BedroomStage / ImmersiveExperience device chrome */
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
};

type TruthOsState = {
    phase: 'room' | 'device-lock' | 'os';
    windows: OsWindow[];
    focusId: string | null;
    zTop: number;
    bootDone: boolean;
    openDevice: () => void;
    closeToRoom: () => void;
    enterOs: () => void;
    openApp: (app: OsAppId) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    setBootDone: (v: boolean) => void;
};

const APP_META: Record<OsAppId, { title: string; w: number; h: number }> = {
    truth: { title: 'TRUTH.SYS — terminal', w: 520, h: 480 },
    updates: { title: 'Updates — dispatches', w: 460, h: 440 },
    account: { title: 'Account — identity', w: 420, h: 480 },
    settings: { title: 'Settings', w: 380, h: 340 },
};

let winSeq = 1;

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'room',
    windows: [],
    focusId: null,
    zTop: 10,
    bootDone: false,

    openDevice: () => set({ phase: 'device-lock' }),
    closeToRoom: () => set({ phase: 'room', windows: [], focusId: null, bootDone: false }),
    enterOs: () => set({ phase: 'os', bootDone: false }),
    setBootDone: (v) => set({ bootDone: v }),

    openApp: (app) => {
        const meta = APP_META[app];
        const existing = get().windows.find((w) => w.app === app && !w.minimized);
        if (existing) {
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
            x: 48 + (n % 5) * 28,
            y: 48 + (n % 4) * 24,
            w: meta.w,
            h: meta.h,
            z,
        };
        set({
            windows: [...get().windows, win],
            focusId: id,
            zTop: z,
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
            windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)),
        }));
    },

    moveWindow: (id, x, y) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),
}));
