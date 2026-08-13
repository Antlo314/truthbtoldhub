'use client';

import { create } from 'zustand';
import { isAdminEmail } from '@/lib/adminEmails';

/** Full Hut feature set as desktop apps */
export type OsAppId =
    | 'truth'
    | 'updates'
    | 'ledger'
    | 'soul'
    | 'arcade'
    | 'offering'
    | 'library'
    | 'archive'
    | 'files'
    | 'calculator'
    | 'paint'
    | 'notepad'
    | 'account'
    | 'settings'
    | 'admin'
    | 'chamber'
    | 'terminal'
    | 'media'
    | 'photos'
    | 'clock'
    | 'taskmgr'
    | 'browser'
    | 'music'
    | 'tasks'
    | 'wall'
    | 'studio'
;

export type BentoSlot =
    | 'hero'
    | 'a'
    | 'b'
    | 'c'
    | 'd'
    | 'float'
    | 'max';

/**
 * Opening payload — lets one app hand a document to another
 * (Files → Notepad, Files → Photos, palette → Browser route).
 * Serializable only, so sessions can be restored from localStorage.
 */
export type OsAppPayload = {
    /** Virtual-FS node id, when opening a saved document */
    nodeId?: string;
    /** Display name for the window title */
    name?: string;
    /** Inline text / data URL / route */
    content?: string;
};

/** Apps that can have several windows open at once */
export const MULTI_INSTANCE = new Set<OsAppId>(['notepad', 'terminal', 'browser', 'photos']);

/** Apps only an Architect may open, enforced in openApp */
export const ADMIN_APPS = new Set<OsAppId>(['admin']);

/** Apps that require a signed-in session */
export const PROTECTED_APPS = new Set<OsAppId>([
    'ledger',
    'soul',
    'arcade',
    'offering',
    'admin',
    'account',
    'wall',
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
    /** Virtual desktop this window lives on */
    desktop: number;
    payload?: OsAppPayload;
};

export const DESKTOP_COUNT = 4;
const SESSION_KEY = 'truthos_session_v1';

type TruthOsState = {
    /** room / device-lock kept for legacy BedroomStage + HouseExperience */
    phase: 'room' | 'device-lock' | 'lock' | 'os';
    windows: OsWindow[];
    focusId: string | null;
    zTop: number;
    bootDone: boolean;
    startOpen: boolean;
    /** Kept as a type for stored sessions; only 'float' is reachable now
        that the bento board is gone. */
    layoutMode: 'bento' | 'float';
    sessionEmail: string | null;
    authPrompt: boolean;
    pendingApp: OsAppId | null;
    /** Active virtual desktop (0-indexed) */
    desktop: number;
    /** Most-recently-used window ids, newest first — drives the Ctrl+Tab switcher */
    mru: string[];
    /** Taskbar-pinned apps */
    pinned: OsAppId[];

    enterOs: () => void;
    /** @deprecated legacy house computer flow */
    openDevice: () => void;
    /** Exit OS overlay back to house / clear windows */
    closeToRoom: () => void;
    setSessionEmail: (email: string | null) => void;
    setAuthPrompt: (v: boolean) => void;
    openApp: (app: OsAppId, opts?: { payload?: OsAppPayload; newInstance?: boolean }) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    /** Set exact rect (used by resize handles + edge/quarter snapping) */
    setRect: (id: string, rect: { x?: number; y?: number; w?: number; h?: number }) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    setSnap: (id: string, snap: BentoSlot) => void;
    setBootDone: (v: boolean) => void;
    setStartOpen: (v: boolean) => void;
    setLayoutMode: (m: 'bento' | 'float') => void;
    clearDesktop: () => void;

    setDesktop: (i: number) => void;
    moveWindowToDesktop: (id: string, i: number) => void;
    togglePin: (app: OsAppId) => void;
    /** Windows on the active desktop, MRU-ordered (for the switcher) */
    mruWindows: () => OsWindow[];
    saveSession: () => void;
    restoreSession: () => void;
};

export const APP_META: Record<
    OsAppId,
    { title: string; w: number; h: number; label: string; accent: string; protected?: boolean }
> = {
    truth: { title: 'Truth · Guide', w: 420, h: 560, label: 'Guide', accent: 'emerald' },
    updates: { title: 'Updates', w: 440, h: 420, label: 'Updates', accent: 'amber' },
    ledger: { title: 'The Ledger', w: 520, h: 480, label: 'Ledger', accent: 'gold', protected: true },
    soul: { title: 'Your Soul', w: 480, h: 520, label: 'Soul', accent: 'cyan', protected: true },
    arcade: { title: 'Arcade', w: 640, h: 520, label: 'Arcade', accent: 'violet', protected: true },
    offering: { title: 'The Offering', w: 480, h: 520, label: 'Offering', accent: 'rose', protected: true },
    library: { title: 'Library', w: 520, h: 480, label: 'Library', accent: 'sky' },
    // Wide enough that the channel rail AND the member list are on screen:
    // below the lg breakpoint the Hall hides the very thing that proves other
    // souls are here, so the flagship community room opened in phone layout.
    archive: { title: 'The Hall', w: 1120, h: 700, label: 'The Hall', accent: 'indigo' },
    files: { title: 'File Explorer', w: 640, h: 480, label: 'Files', accent: 'sky' },
    calculator: { title: 'Calculator', w: 320, h: 440, label: 'Calculator', accent: 'emerald' },
    paint: { title: 'Paint', w: 700, h: 520, label: 'Paint', accent: 'pink' },
    notepad: { title: 'Notepad', w: 520, h: 440, label: 'Notepad', accent: 'zinc' },
    account: { title: 'Account', w: 440, h: 480, label: 'Account', accent: 'cyan', protected: true },
    settings: { title: 'Settings', w: 560, h: 540, label: 'Settings', accent: 'zinc' },
    admin: { title: 'Admin Console', w: 560, h: 560, label: 'Admin', accent: 'rose', protected: true },
    chamber: { title: 'The House', w: 480, h: 360, label: 'The House', accent: 'emerald' },
    terminal: { title: 'Terminal', w: 620, h: 440, label: 'Terminal', accent: 'emerald' },
    media: { title: 'Media Player', w: 760, h: 540, label: 'Media', accent: 'violet' },
    photos: { title: 'Photos', w: 680, h: 520, label: 'Photos', accent: 'pink' },
    clock: { title: 'Clock & Calendar', w: 420, h: 520, label: 'Clock', accent: 'sky' },
    taskmgr: { title: 'Task Manager', w: 560, h: 480, label: 'Task Manager', accent: 'zinc' },
    browser: { title: 'Sanctum Browser', w: 820, h: 560, label: 'Browser', accent: 'cyan' },
    music: { title: 'Music', w: 620, h: 500, label: 'Music', accent: 'violet' },
    tasks: { title: 'To-Do', w: 520, h: 560, label: 'To-Do', accent: 'gold' },
    wall: { title: 'The Wall', w: 640, h: 520, label: 'The Wall', accent: 'amber', protected: true },
    studio: { title: 'Signal Studio', w: 560, h: 520, label: 'Studio', accent: 'rose' },
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

/** Push an id to the front of the MRU list */
function bumpMru(mru: string[], id: string): string[] {
    return [id, ...mru.filter((m) => m !== id)];
}

type StoredSession = {
    v: 1;
    desktop: number;
    pinned: OsAppId[];
    windows: Pick<
        OsWindow,
        'app' | 'x' | 'y' | 'w' | 'h' | 'minimized' | 'maximized' | 'snap' | 'desktop'
    >[];
};

export const useTruthOs = create<TruthOsState>((set, get) => ({
    phase: 'os',
    windows: [],
    focusId: null,
    zTop: 10,
    bootDone: false,
    startOpen: false,
    // Float-first: windows open free-moving and resizable, like any desktop.
    // Bento remains one keystroke away for people who want the tiled board.
    layoutMode: 'float',
    sessionEmail: null,
    authPrompt: false,
    pendingApp: null,
    desktop: 0,
    mru: [],
    // The Hall is pinned first: this is a community hub, and the dock is
    // the one launcher that never leaves the screen.
    pinned: ['archive', 'truth', 'chamber', 'browser'],

    enterOs: () => set({ phase: 'os', bootDone: false, startOpen: false }),
    openDevice: () => set({ phase: 'device-lock' }),
    closeToRoom: () =>
        set({
            phase: 'room',
            windows: [],
            focusId: null,
            mru: [],
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
    clearDesktop: () => {
        set({ windows: [], focusId: null, mru: [], startOpen: false, pendingApp: null });
        get().saveSession();
    },

    openApp: (app, opts) => {
        const meta = APP_META[app];
        const email = get().sessionEmail;
        const needsAuth = PROTECTED_APPS.has(app) || meta.protected;
        if (needsAuth && !email) {
            set({ authPrompt: true, pendingApp: app, startOpen: false });
            return;
        }
        // Architect-only apps are gated HERE, not per launcher. The Start menu
        // filtered 'admin' by isAdmin, but the command palette only checked
        // for any session and the Terminal's `open admin` checked nothing —
        // so the console opened for any signed-in soul. One door, one lock.
        if (ADMIN_APPS.has(app) && !isAdminEmail(email)) {
            set({ startOpen: false });
            return;
        }

        const desktop = get().desktop;
        const wantsNew = opts?.newInstance || (opts?.payload && MULTI_INSTANCE.has(app));

        if (!wantsNew) {
            // Focus an existing window of this app — pull it to this desktop if elsewhere
            const existing = get().windows.find((w) => w.app === app);
            if (existing) {
                set((s) => ({
                    windows: s.windows.map((w) =>
                        w.id === existing.id ? { ...w, minimized: false, desktop } : w,
                    ),
                    startOpen: false,
                    authPrompt: false,
                    pendingApp: null,
                }));
                get().focusWindow(existing.id);
                return;
            }
        }

        const z = get().zTop + 1;
        const id = `w${winSeq++}`;
        const n = get().windows.length;
        const phone = detectDevice() === 'phone';
        const snap =
            get().layoutMode === 'bento' && !phone
                ? nextFreeSlot(get().windows.filter((w) => w.desktop === desktop))
                : 'float';

        const win: OsWindow = {
            id,
            app,
            title: opts?.payload?.name ? `${opts.payload.name} — ${meta.label}` : meta.title,
            x: 48 + (n % 4) * 28,
            y: 40 + (n % 3) * 24,
            w: meta.w,
            h: meta.h,
            z,
            snap,
            desktop,
            maximized: phone,
            payload: opts?.payload,
        };
        set((s) => ({
            windows: [...s.windows, win],
            focusId: id,
            mru: bumpMru(s.mru, id),
            zTop: z,
            startOpen: false,
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
                        ? mru.find((m) => rest.some((w) => w.id === m)) ?? null
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
            windows: s.windows.map((w) =>
                w.id === id ? { ...w, x, y, maximized: false, snap: 'float' } : w,
            ),
            layoutMode: 'float',
        })),

    setRect: (id, rect) =>
        set((s) => ({
            windows: s.windows.map((w) =>
                w.id === id
                    ? {
                          ...w,
                          x: rect.x ?? w.x,
                          y: rect.y ?? w.y,
                          w: Math.max(280, rect.w ?? w.w),
                          h: Math.max(200, rect.h ?? w.h),
                          maximized: false,
                          minimized: false,
                          snap: 'float',
                      }
                    : w,
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

    setDesktop: (i) => {
        const next = Math.max(0, Math.min(DESKTOP_COUNT - 1, i));
        set({ desktop: next, startOpen: false });
        // Focus the top window of the desktop we just landed on
        const top = get()
            .mru.map((id) => get().windows.find((w) => w.id === id))
            .find((w): w is OsWindow => !!w && w.desktop === next && !w.minimized);
        set({ focusId: top?.id ?? null });
        get().saveSession();
    },

    moveWindowToDesktop: (id, i) => {
        const next = Math.max(0, Math.min(DESKTOP_COUNT - 1, i));
        set((s) => ({
            windows: s.windows.map((w) => (w.id === id ? { ...w, desktop: next } : w)),
        }));
        get().saveSession();
    },

    togglePin: (app) => {
        set((s) => ({
            pinned: s.pinned.includes(app)
                ? s.pinned.filter((p) => p !== app)
                : [...s.pinned, app],
        }));
        get().saveSession();
    },

    mruWindows: () => {
        const { windows, mru, desktop } = get();
        const onDesk = windows.filter((w) => w.desktop === desktop);
        const ordered = mru
            .map((id) => onDesk.find((w) => w.id === id))
            .filter((w): w is OsWindow => !!w);
        // Anything not yet in the MRU list (shouldn't happen) goes last
        return [...ordered, ...onDesk.filter((w) => !mru.includes(w.id))];
    },

    saveSession: () => {
        if (typeof window === 'undefined') return;
        const { windows, desktop, pinned } = get();
        const data: StoredSession = {
            v: 1,
            desktop,
            pinned,
            windows: windows
                // Never restore a transient/auth-gated surface into a cold boot
                .filter((w) => w.app !== 'chamber' && !PROTECTED_APPS.has(w.app))
                .map((w) => ({
                    app: w.app,
                    x: w.x,
                    y: w.y,
                    w: w.w,
                    h: w.h,
                    minimized: w.minimized,
                    maximized: w.maximized,
                    snap: w.snap,
                    desktop: w.desktop,
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
        if (!data || data.v !== 1 || !Array.isArray(data.windows)) return;

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
                snap: s.snap ?? 'float',
                desktop: Math.max(0, Math.min(DESKTOP_COUNT - 1, s.desktop ?? 0)),
                minimized: s.minimized,
                maximized: phone ? true : s.maximized,
            });
        }
        set({
            windows,
            zTop: z,
            desktop: Math.max(0, Math.min(DESKTOP_COUNT - 1, data.desktop ?? 0)),
            pinned: Array.isArray(data.pinned) && data.pinned.length ? data.pinned : get().pinned,
            mru: windows.map((w) => w.id).reverse(),
            focusId: windows.length ? windows[windows.length - 1].id : null,
        });
    },
}));
