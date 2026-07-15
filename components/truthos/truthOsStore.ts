'use client';

import { create } from 'zustand';

/** Full Hut feature set as desktop apps */
export type OsAppId =
    | 'truth'
    | 'updates'
    | 'ledger'
    | 'soul'
    | 'arcade'
    | 'offering'
    | 'forge'
    | 'visions'
    | 'library'
    | 'archive'
    | 'wayfinder'
    | 'files'
    | 'calculator'
    | 'paint'
    | 'notepad'
    | 'account'
    | 'settings'
    | 'admin'
    | 'chamber';

export type BentoSlot =
    | 'hero'
    | 'a'
    | 'b'
    | 'c'
    | 'd'
    | 'float'
    | 'max';

/** Apps that require a signed-in session */
export const PROTECTED_APPS = new Set<OsAppId>([
    'ledger',
    'soul',
    'arcade',
    'forge',
    'offering',
    'wayfinder',
    'admin',
    'account',
]);

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
    snap: BentoSlot;
};

type TruthOsState = {
    /** room / device-lock kept for legacy BedroomStage + HouseExperience */
    phase: 'room' | 'device-lock' | 'lock' | 'os';
    windows: OsWindow[];
    focusId: string | null;
    zTop: number;
    bootDone: boolean;
    startOpen: boolean;
    layoutMode: 'bento' | 'float';
    sessionEmail: string | null;
    authPrompt: boolean;
    pendingApp: OsAppId | null;
    enterOs: () => void;
    /** @deprecated legacy house computer flow */
    openDevice: () => void;
    /** Exit OS overlay back to house / clear windows */
    closeToRoom: () => void;
    setSessionEmail: (email: string | null) => void;
    setAuthPrompt: (v: boolean) => void;
    openApp: (app: OsAppId) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    setSnap: (id: string, snap: BentoSlot) => void;
    setBootDone: (v: boolean) => void;
    setStartOpen: (v: boolean) => void;
    setLayoutMode: (m: 'bento' | 'float') => void;
    clearDesktop: () => void;
};

export const APP_META: Record<
    OsAppId,
    { title: string; w: number; h: number; label: string; accent: string; protected?: boolean }
> = {
    truth: { title: 'Truth Terminal', w: 560, h: 520, label: 'Truth', accent: 'emerald' },
    updates: { title: 'Updates', w: 440, h: 420, label: 'Updates', accent: 'amber' },
    ledger: { title: 'The Ledger', w: 520, h: 480, label: 'Ledger', accent: 'gold', protected: true },
    soul: { title: 'Your Soul', w: 480, h: 520, label: 'Soul', accent: 'cyan', protected: true },
    arcade: { title: 'Arcade', w: 640, h: 520, label: 'Arcade', accent: 'violet', protected: true },
    offering: { title: 'The Offering', w: 480, h: 520, label: 'Offering', accent: 'rose', protected: true },
    forge: { title: 'The Forge', w: 520, h: 480, label: 'Forge', accent: 'orange', protected: true },
    visions: { title: 'Visions', w: 480, h: 440, label: 'Visions', accent: 'sky' },
    library: { title: 'Library', w: 520, h: 480, label: 'Library', accent: 'sky' },
    archive: { title: 'The Hall', w: 560, h: 520, label: 'Hall', accent: 'indigo' },
    wayfinder: { title: 'Wayfinder', w: 480, h: 440, label: 'Wayfinder', accent: 'teal', protected: true },
    files: { title: 'File Explorer', w: 640, h: 480, label: 'Files', accent: 'sky' },
    calculator: { title: 'Calculator', w: 320, h: 440, label: 'Calculator', accent: 'emerald' },
    paint: { title: 'Paint', w: 700, h: 520, label: 'Paint', accent: 'pink' },
    notepad: { title: 'Notepad', w: 520, h: 440, label: 'Notepad', accent: 'zinc' },
    account: { title: 'Account', w: 440, h: 480, label: 'Account', accent: 'cyan', protected: true },
    settings: { title: 'Settings', w: 400, h: 400, label: 'Settings', accent: 'zinc' },
    admin: { title: 'Admin Console', w: 560, h: 560, label: 'Admin', accent: 'rose', protected: true },
    chamber: { title: 'Leave Terminal', w: 480, h: 360, label: 'Leave Terminal', accent: 'emerald' },
};

/** Preferred bento slot order when opening apps */
const SLOT_PRIORITY: BentoSlot[] = ['hero', 'a', 'b', 'c', 'd'];

function nextFreeSlot(windows: OsWindow[]): BentoSlot {
    const used = new Set(windows.filter((w) => !w.minimized && w.snap !== 'float' && w.snap !== 'max').map((w) => w.snap));
    for (const s of SLOT_PRIORITY) {
        if (!used.has(s)) return s;
    }
    return 'float';
}

let winSeq = 1;

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'os',
    windows: [],
    focusId: null,
    zTop: 10,
    bootDone: false,
    startOpen: false,
    layoutMode: 'bento',
    sessionEmail: null,
    authPrompt: false,
    pendingApp: null,

    enterOs: () => set({ phase: 'os', bootDone: false, startOpen: false }),
    openDevice: () => set({ phase: 'device-lock' }),
    closeToRoom: () =>
        set({
            phase: 'room',
            windows: [],
            focusId: null,
            bootDone: false,
            startOpen: false,
            pendingApp: null,
            authPrompt: false,
        }),
    setSessionEmail: (email) => set({ sessionEmail: email }),
    setAuthPrompt: (v) => set({ authPrompt: v, pendingApp: v ? get().pendingApp : null }),
    setBootDone: (v) => set({ bootDone: v }),
    setStartOpen: (v) => set({ startOpen: v }),
    setLayoutMode: (m) => set({ layoutMode: m }),
    clearDesktop: () =>
        set({ windows: [], focusId: null, startOpen: false, pendingApp: null }),

    openApp: (app) => {
        const meta = APP_META[app];
        const email = get().sessionEmail;
        const needsAuth = PROTECTED_APPS.has(app) || meta.protected;
        if (needsAuth && !email) {
            set({ authPrompt: true, pendingApp: app, startOpen: false });
            return;
        }

        const existing = get().windows.find((w) => w.app === app);
        if (existing) {
            set((s) => ({
                windows: s.windows.map((w) =>
                    w.id === existing.id ? { ...w, minimized: false } : w,
                ),
                startOpen: false,
                authPrompt: false,
                pendingApp: null,
            }));
            get().focusWindow(existing.id);
            return;
        }

        const z = get().zTop + 1;
        const id = `w${winSeq++}`;
        const n = get().windows.length;
        const snap =
            get().layoutMode === 'bento' && detectDevice() === 'desktop'
                ? nextFreeSlot(get().windows)
                : 'float';

        const win: OsWindow = {
            id,
            app,
            title: meta.title,
            x: 48 + (n % 4) * 28,
            y: 40 + (n % 3) * 24,
            w: meta.w,
            h: meta.h,
            z,
            snap,
            maximized: detectDevice() === 'phone',
        };
        set({
            windows: [...get().windows, win],
            focusId: id,
            zTop: z,
            startOpen: false,
            authPrompt: false,
            pendingApp: null,
        });
    },

    closeWindow: (id) =>
        set((s) => ({
            windows: s.windows.filter((w) => w.id !== id),
            focusId:
                s.focusId === id
                    ? s.windows.find((w) => w.id !== id)?.id ?? null
                    : s.focusId,
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
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, x, y, maximized: false, snap: 'float' } : w,
            ),
            layoutMode: 'float',
        })),

    minimizeWindow: (id) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
            focusId: s.focusId === id ? null : s.focusId,
        })),

    toggleMaximize: (id) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id
                    ? {
                          ...w,
                          maximized: !w.maximized,
                          minimized: false,
                          snap: !w.maximized ? 'max' : w.snap === 'max' ? 'float' : w.snap,
                      }
                    : w,
            ),
        })),

    setSnap: (id, snap) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id
                    ? { ...w, snap, maximized: snap === 'max', minimized: false }
                    : w,
            ),
            layoutMode: snap === 'float' ? 'float' : 'bento',
        })),
}));
