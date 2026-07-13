'use client';

import { create } from 'zustand';

export type OsAppId =
    | 'truth'
    | 'soul'
    | 'wayfinder'
    | 'chamber'
    | 'ledger'
    | 'hall'
    | 'codex'
    | 'cinema'
    | 'offering'
    | 'settings';

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
    /** Outside device: room. Inside: truth.os */
    phase: 'room' | 'device-lock' | 'os';
    device: 'desktop' | 'phone';
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
    soul: { title: 'Vessel — identity', w: 440, h: 520 },
    wayfinder: { title: 'Wayfinder — roads', w: 480, h: 420 },
    chamber: { title: 'Chamber — 3D sanctum', w: 400, h: 320 },
    ledger: { title: 'Ledger — daily word', w: 440, h: 400 },
    hall: { title: 'Hall — community', w: 400, h: 300 },
    codex: { title: 'Codex — memory', w: 400, h: 300 },
    cinema: { title: 'Cinema — transmissions', w: 400, h: 300 },
    offering: { title: 'Offering — sustain', w: 400, h: 300 },
    settings: { title: 'Settings', w: 380, h: 340 },
};

let winSeq = 1;

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'room',
    device: 'desktop',
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
            focusId: s.focusId === id ? null : s.focusId,
        })),

    focusWindow: (id) => {
        const z = get().zTop + 1;
        set((s) => ({
            zTop: z,
            focusId: id,
            windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
        }));
    },

    moveWindow: (id, x, y) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),
}));

export function detectDevice(): 'desktop' | 'phone' {
    if (typeof window === 'undefined') return 'desktop';
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
        ? 'phone'
        : 'desktop';
}
