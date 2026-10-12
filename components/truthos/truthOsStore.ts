'use client';

import { create } from 'zustand';
import { isAdminEmail } from '@/lib/adminEmails';

/**
 * Truth.OS 4 — the window manager.
 *
 * One desktop, free-floating windows that snap to halves and quarters,
 * an MRU list for the switcher, and a pinned set for the dock. The old
 * virtual desktops and the bento board are gone: four workspaces and a
 * tiling grid were two more ways to arrange the same few windows.
 *
 * Every app here has exactly one job. Account lives in Settings, the
 * dispatches live in the Ledger, and the doors that only pointed
 * somewhere else (Chamber, Studio, the old Wall stub) are gone; the
 * dock's House button is the one way into the 3D world.
 */
export type OsAppId =
    | 'truth'
    | 'ledger'
    | 'library'
    | 'archive'
    | 'wall'
    | 'offering'
    | 'arcade'
    | 'soul'
    | 'media'
    | 'paint'
    | 'photos'
    | 'music'
    | 'browser'
    | 'files'
    | 'notepad'
    | 'tasks'
    | 'calculator'
    | 'clock'
    | 'terminal'
    | 'settings'
    | 'taskmgr'
    | 'admin';

/**
 * Opening payload — lets one app hand a document to another
 * (Files → Notepad, Spotlight → Browser route, Spotlight → Guide question).
 * Serializable only, so sessions can be restored from localStorage.
 */
export type OsAppPayload = {
    /** Virtual-FS node id, when opening a saved document */
    nodeId?: string;
    /** Display name for the window title */
    name?: string;
    /** Inline text / data URL / route */
    content?: string;
    /** Settings pane or Ledger tab to open on */
    section?: string;
};

/** Apps that can have several windows open at once */
export const MULTI_INSTANCE = new Set<OsAppId>(['notepad', 'terminal', 'browser']);

/** Apps only an Architect may open, enforced in openApp */
export const ADMIN_APPS = new Set<OsAppId>(['admin']);

/** Apps that require a signed-in session */
export const PROTECTED_APPS = new Set<OsAppId>(['soul', 'arcade', 'offering', 'admin', 'wall']);

export function detectDevice(): 'desktop' | 'phone' {
    if (typeof window === 'undefined') return 'desktop';
    const narrow = window.innerWidth < 768;
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const touch = navigator.maxTouchPoints > 0;
    return narrow || (coarse && touch && window.innerWidth < 1024) ? 'phone' : 'desktop';
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
    payload?: OsAppPayload;
};

export type AppMeta = {
    /** Window title */
    title: string;
    /** Short name — dock tooltip, library, Spotlight */
    label: string;
    /** One line for Spotlight and the library */
    blurb: string;
    w: number;
    h: number;
};

export const APP_META: Record<OsAppId, AppMeta> = {
    truth: { title: 'Truth', label: 'Guide', blurb: 'Ask Truth anything', w: 440, h: 600 },
    ledger: { title: 'The Ledger', label: 'Ledger', blurb: 'Dispatches, the Daily Word, the souls', w: 760, h: 620 },
    library: { title: 'Library', label: 'Library', blurb: 'Scrolls to read and keep', w: 900, h: 640 },
    // Wide enough that the channel rail AND the member list are on screen —
    // below the lg breakpoint the Hall hides the souls who are here.
    archive: { title: 'The Hall', label: 'The Hall', blurb: 'Gather, talk, whisper', w: 1120, h: 700 },
    wall: { title: 'The Mark', label: 'The Mark', blurb: 'One mark a year on the wall', w: 760, h: 680 },
    offering: { title: 'Offering', label: 'Offering', blurb: 'Keep the house open', w: 520, h: 640 },
    arcade: { title: 'Arcade', label: 'Arcade', blurb: 'Four games, one crown a season', w: 980, h: 680 },
    soul: { title: 'Soul', label: 'Soul', blurb: 'Shape your vessel', w: 980, h: 660 },
    media: { title: 'Cinema', label: 'Cinema', blurb: 'The house films', w: 900, h: 600 },
    paint: { title: 'Paint', label: 'Paint', blurb: 'A canvas', w: 760, h: 560 },
    photos: { title: 'Photos', label: 'Photos', blurb: 'Stills from the sanctum', w: 760, h: 560 },
    music: { title: 'Music', label: 'Music', blurb: 'The sanctum score', w: 680, h: 520 },
    browser: { title: 'Browser', label: 'Browser', blurb: 'The sanctum’s own pages', w: 980, h: 640 },
    files: { title: 'Files', label: 'Files', blurb: 'Your documents', w: 700, h: 500 },
    notepad: { title: 'Notes', label: 'Notes', blurb: 'Plain text', w: 560, h: 460 },
    tasks: { title: 'To-Do', label: 'To-Do', blurb: 'Today’s list', w: 520, h: 580 },
    calculator: { title: 'Calculator', label: 'Calculator', blurb: 'Sums', w: 320, h: 460 },
    clock: { title: 'Clock', label: 'Clock', blurb: 'Time, world clocks, stopwatch', w: 440, h: 520 },
    terminal: { title: 'Terminal', label: 'Terminal', blurb: 'soulsh', w: 640, h: 440 },
    settings: { title: 'Settings', label: 'Settings', blurb: 'Account, look, sound', w: 820, h: 600 },
    taskmgr: { title: 'Activity', label: 'Activity', blurb: 'Windows, frame rate, memory', w: 560, h: 480 },
    admin: { title: 'Architect Console', label: 'Console', blurb: 'Post and pin dispatches', w: 600, h: 600 },
};

const SESSION_KEY = 'truthos_session_v2';

/** Reserved chrome, so a centred window clears the top bar and the dock */
const TOP_BAR = 32;
const DOCK = 92;

type TruthOsState = {
    /** room / device-lock kept for the house's legacy enterOs/closeToRoom calls */
    phase: 'room' | 'device-lock' | 'lock' | 'os';
    windows: OsWindow[];
    focusId: string | null;
    zTop: number;
    bootDone: boolean;
    sessionEmail: string | null;
    authPrompt: boolean;
    pendingApp: OsAppId | null;
    /** Most-recently-used window ids, newest first — drives the switcher */
    mru: string[];
    /** Dock-pinned apps */
    pinned: OsAppId[];

    enterOs: () => void;
    /** @deprecated legacy house computer flow */
    openDevice: () => void;
    closeToRoom: () => void;
    setSessionEmail: (email: string | null) => void;
    setAuthPrompt: (v: boolean) => void;
    openApp: (app: OsAppId, opts?: { payload?: OsAppPayload; newInstance?: boolean }) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    /** Set exact rect (resize handles + edge/quarter snapping) */
    setRect: (id: string, rect: { x?: number; y?: number; w?: number; h?: number }) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    /** Show desktop — every window to the dock */
    minimizeAll: () => void;
    setBootDone: (v: boolean) => void;
    clearDesktop: () => void;
    togglePin: (app: OsAppId) => void;
    /** Windows MRU-ordered (for the switcher) */
    mruWindows: () => OsWindow[];
    saveSession: () => void;
    restoreSession: () => void;
};

let winSeq = 1;

function bumpMru(mru: string[], id: string): string[] {
    return [id, ...mru.filter((m) => m !== id)];
}

/** Centre a window in the space between the top bar and the dock, cascading repeats */
function placeWindow(w: number, h: number, n: number) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const wsH = vh - TOP_BAR - DOCK;
    const cw = Math.min(w, vw - 32);
    const ch = Math.min(h, wsH - 16);
    const step = (n % 6) * 26;
    return {
        x: Math.max(12, Math.round((vw - cw) / 2) - 60 + step),
        y: Math.max(10, Math.round((wsH - ch) / 2) - 10 + step),
        w: cw,
        h: ch,
    };
}

type StoredSession = {
    v: 2;
    pinned: OsAppId[];
    windows: Pick<OsWindow, 'app' | 'x' | 'y' | 'w' | 'h' | 'minimized' | 'maximized'>[];
};

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'os',
    windows: [],
    focusId: null,
    zTop: 10,
    bootDone: false,
    sessionEmail: null,
    authPrompt: false,
    pendingApp: null,
    mru: [],
    // The Hall first: this is a community hub, and the dock is the one
    // launcher that never leaves the screen.
    pinned: ['archive', 'truth', 'ledger', 'library', 'arcade', 'media', 'music'],

    enterOs: () => set({ phase: 'os', bootDone: false }),
    openDevice: () => set({ phase: 'device-lock' }),
    closeToRoom: () =>
        set({
            phase: 'room',
            windows: [],
            focusId: null,
            mru: [],
            bootDone: false,
            pendingApp: null,
            authPrompt: false,
        }),
    setSessionEmail: (email) => set({ sessionEmail: email }),
    setAuthPrompt: (v) => set({ authPrompt: v, pendingApp: v ? get().pendingApp : null }),
    setBootDone: (v) => set({ bootDone: v }),
    clearDesktop: () => {
        set({ windows: [], focusId: null, mru: [], pendingApp: null });
        get().saveSession();
    },

    openApp: (app, opts) => {
        const meta = APP_META[app];
        if (!meta) return;
        const email = get().sessionEmail;
        if (PROTECTED_APPS.has(app) && !email) {
            set({ authPrompt: true, pendingApp: app });
            return;
        }
        // Architect-only apps are gated HERE, not per launcher — one door, one lock.
        if (ADMIN_APPS.has(app) && !isAdminEmail(email)) return;

        const wantsNew = opts?.newInstance || (opts?.payload && MULTI_INSTANCE.has(app));
        if (!wantsNew) {
            const existing = get().windows.find((w) => w.app === app);
            if (existing) {
                set((s) => ({
                    windows: s.windows.map((w) =>
                        w.id === existing.id
                            ? { ...w, minimized: false, payload: opts?.payload ?? w.payload }
                            : w,
                    ),
                    authPrompt: false,
                    pendingApp: null,
                }));
                get().focusWindow(existing.id);
                return;
            }
        }

        const z = get().zTop + 1;
        const id = `w${winSeq++}`;
        const phone = detectDevice() === 'phone';
        const rect = placeWindow(meta.w, meta.h, get().windows.length);
        const win: OsWindow = {
            id,
            app,
            title: opts?.payload?.name ? `${opts.payload.name} — ${meta.label}` : meta.title,
            ...rect,
            z,
            maximized: phone,
            payload: opts?.payload,
        };
        set((s) => ({
            windows: [...s.windows, win],
            focusId: id,
            mru: bumpMru(s.mru, id),
            zTop: z,
            authPrompt: false,
            pendingApp: null,
        }));
        get().saveSession();
    },

    closeWindow: (id) => {
        set((s) => {
            const mru = s.mru.filter((m) => m !== id);
            const rest = s.windows.filter((w) => w.id !== id);
            return {
                windows: rest,
                mru,
                focusId:
                    s.focusId === id
                        ? mru.find((m) => rest.some((w) => w.id === m && !w.minimized)) ?? null
                        : s.focusId,
            };
        });
        get().saveSession();
    },

    focusWindow: (id) => {
        const z = get().zTop + 1;
        set((s) => ({
            focusId: id,
            zTop: z,
            mru: bumpMru(s.mru, id),
            windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
        }));
    },

    moveWindow: (id, x, y) =>
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, x, y, maximized: false } : w)),
        })),

    setRect: (id, rect) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id
                    ? {
                          ...w,
                          x: rect.x ?? w.x,
                          y: rect.y ?? w.y,
                          w: Math.max(300, rect.w ?? w.w),
                          h: Math.max(220, rect.h ?? w.h),
                          maximized: false,
                          minimized: false,
                      }
                    : w,
            ),
        })),

    minimizeWindow: (id) =>
        set((s) => {
            const rest = s.mru.filter((m) => m !== id);
            return {
                windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
                focusId:
                    s.focusId === id
                        ? rest.find((m) => s.windows.some((w) => w.id === m && !w.minimized)) ?? null
                        : s.focusId,
            };
        }),

    minimizeAll: () =>
        set((s) => ({
            windows: s.windows.map((w) => ({ ...w, minimized: true })),
            focusId: null,
        })),

    toggleMaximize: (id) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w,
            ),
        })),

    togglePin: (app) => {
        set((s) => ({
            pinned: s.pinned.includes(app) ? s.pinned.filter((p) => p !== app) : [...s.pinned, app],
        }));
        get().saveSession();
    },

    mruWindows: () => {
        const { windows, mru } = get();
        const ordered = mru
            .map((id) => windows.find((w) => w.id === id))
            .filter((w): w is OsWindow => !!w);
        return [...ordered, ...windows.filter((w) => !mru.includes(w.id))];
    },

    saveSession: () => {
        if (typeof window === 'undefined') return;
        const { windows, pinned } = get();
        const data: StoredSession = {
            v: 2,
            pinned,
            windows: windows
                // Never restore an auth-gated surface into a cold boot
                .filter((w) => !PROTECTED_APPS.has(w.app))
                .map((w) => ({
                    app: w.app,
                    x: w.x,
                    y: w.y,
                    w: w.w,
                    h: w.h,
                    minimized: w.minimized,
                    maximized: w.maximized,
                })),
        };
        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        } catch {
            /* private mode */
        }
    },

    restoreSession: () => {
        if (typeof window === 'undefined') return;
        let data: StoredSession | null = null;
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) data = JSON.parse(raw) as StoredSession;
        } catch {
            return;
        }
        if (!data || data.v !== 2 || !Array.isArray(data.windows)) return;

        const phone = detectDevice() === 'phone';
        let z = get().zTop;
        const windows: OsWindow[] = [];
        for (const s of data.windows) {
            const meta = APP_META[s.app];
            if (!meta) continue; // app removed since the session was saved
            z += 1;
            windows.push({
                id: `w${winSeq++}`,
                app: s.app,
                title: meta.title,
                x: s.x,
                y: s.y,
                w: s.w,
                h: s.h,
                z,
                // Phones always come back to the home screen
                minimized: phone ? true : s.minimized,
                maximized: phone ? true : s.maximized,
            });
        }
        const pinned = Array.isArray(data.pinned)
            ? data.pinned.filter((p) => APP_META[p])
            : [];
        set({
            windows,
            zTop: z,
            pinned: pinned.length ? pinned : get().pinned,
            mru: windows.map((w) => w.id).reverse(),
            focusId: phone ? null : windows.filter((w) => !w.minimized).at(-1)?.id ?? null,
        });
    },
}));
