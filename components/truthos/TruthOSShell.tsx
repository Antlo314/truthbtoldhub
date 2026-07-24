'use client';

/**
 * Truth.OS — 2026-grade desktop shell.
 * Windows-class chrome: Start with search, snap layouts, task view,
 * notification center, quick settings, calendar, widgets, lock screen,
 * desktop icons, Aero edge-snap — atop the Bento window manager.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bell,
    LayoutPanelLeft,
    Power,
    RefreshCw,
    Search,
    Settings2,
    SquareStack,
} from 'lucide-react';
import {
    useTruthOs,
    type OsAppId,
    type BentoSlot,
    detectDevice,
} from './truthOsStore';
import { renderOsApp } from './apps/OsApps';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/adminEmails';
import { hubAudio } from '@/lib/truthos/hubAudio';
import AuthModal from '@/components/AuthModal';
import {
    OsAppButton,
    OsHomeCard,
    OsIconTile,
    OsTaskbarItem,
} from './OsIcon';
import OsWindowFrame from './OsWindowFrame';
import { useOsSystem, getWallpaper } from './osSystemStore';
import {
    OsCalendarFlyout,
    OsContextMenu,
    OsLockScreen,
    OsNotificationCenter,
    OsQuickSettings,
    OsTaskView,
    OsToasts,
    OsWidgetsPanel,
} from './OsSystemUI';

type DockItem = {
    app: OsAppId;
    label: string;
    adminOnly?: boolean;
    guestOk?: boolean;
};

/** Hut home + full 2026 program suite */
const APPS: DockItem[] = [
    { app: 'truth', label: 'Guide', guestOk: true },
    { app: 'ledger', label: 'Ledger' },
    { app: 'soul', label: 'Soul' },
    { app: 'arcade', label: 'Arcade' },
    { app: 'offering', label: 'Offering' },
    { app: 'archive', label: 'Hall', guestOk: true },
    { app: 'library', label: 'Library', guestOk: true },
    { app: 'visions', label: 'Visions', guestOk: true },
    { app: 'updates', label: 'Updates', guestOk: true },
    { app: 'browser', label: 'Browser', guestOk: true },
    { app: 'media', label: 'Media', guestOk: true },
    { app: 'photos', label: 'Photos', guestOk: true },
    { app: 'terminal', label: 'Terminal', guestOk: true },
    { app: 'files', label: 'Files', guestOk: true },
    { app: 'clock', label: 'Clock', guestOk: true },
    { app: 'taskmgr', label: 'Tasks', guestOk: true },
    { app: 'calculator', label: 'Calc', guestOk: true },
    { app: 'paint', label: 'Paint', guestOk: true },
    { app: 'notepad', label: 'Notepad', guestOk: true },
    { app: 'account', label: 'Account' },
    { app: 'settings', label: 'Settings', guestOk: true },
    { app: 'chamber', label: 'Leave', guestOk: true },
    { app: 'admin', label: 'Admin', adminOnly: true },
];

/** Hut stations shown as home-screen bento cards */
const HUT_HOME: { app: OsAppId; title: string; blurb: string; span?: string }[] = [
    { app: 'truth', title: 'Truth Guide', blurb: 'AI brother · scripture · OS help', span: 'sm:col-span-2 sm:row-span-2' },
    { app: 'ledger', title: 'Ledger', blurb: 'Daily Word · souls' },
    { app: 'soul', title: 'Soul', blurb: 'Vessel · identity' },
    { app: 'arcade', title: 'Arcade', blurb: 'Games · scores' },
    { app: 'archive', title: 'The Hall', blurb: 'Community chat' },
    { app: 'library', title: 'Library', blurb: 'Scrolls · study' },
    { app: 'media', title: 'Media Player', blurb: 'Cutscene reels' },
    { app: 'visions', title: 'Visions', blurb: 'Roads · cinema' },
    { app: 'offering', title: 'Offering', blurb: 'Sustain the work' },
    { app: 'updates', title: 'Updates', blurb: 'Dispatches' },
];

/** Desktop shortcut rail (visible behind windows, desktop only) */
const DESKTOP_ICONS: OsAppId[] = [
    'truth',
    'browser',
    'files',
    'media',
    'photos',
    'terminal',
    'arcade',
    'settings',
];

const BOOT_LINES = [
    'Truth.OS UEFI · firmware OK',
    'mounting soul_fs…',
    'starting aura compositor…',
    'loading bento window manager…',
    'network · encrypted channel',
    'system services · notifications · widgets',
    'desktop session ready',
];

const BENTO_CLASS: Record<BentoSlot, string> = {
    hero: 'col-span-1 row-span-2 md:col-start-1 md:row-start-1',
    a: 'col-span-1 row-span-1 md:col-start-2 md:row-start-1',
    b: 'col-span-1 row-span-1 md:col-start-3 md:row-start-1',
    c: 'col-span-1 row-span-1 md:col-start-2 md:row-start-2',
    d: 'col-span-1 row-span-1 md:col-start-3 md:row-start-2',
    float: '',
    max: 'col-span-full row-span-full',
};

export default function TruthOSShell({
    onLogout,
    onEnterChamber,
}: {
    onLogout: () => void;
    onEnterChamber?: () => void;
    mode?: 'desktop' | 'phone';
}) {
    const enterChamber = onEnterChamber ?? (() => {});
    const {
        windows,
        focusId,
        bootDone,
        startOpen,
        layoutMode,
        sessionEmail,
        authPrompt,
        pendingApp,
        openApp,
        closeWindow,
        focusWindow,
        moveWindow,
        setRect,
        minimizeWindow,
        toggleMaximize,
        setSnap,
        setBootDone,
        setStartOpen,
        setSessionEmail,
        setAuthPrompt,
        enterOs,
        setLayoutMode,
        clearDesktop,
    } = useTruthOs();

    const flyout = useOsSystem((s) => s.flyout);
    const taskView = useOsSystem((s) => s.taskView);
    const locked = useOsSystem((s) => s.locked);
    const ctxMenu = useOsSystem((s) => s.ctxMenu);
    const wallpaperId = useOsSystem((s) => s.wallpaper);
    const brightness = useOsSystem((s) => s.brightness);
    const nightLight = useOsSystem((s) => s.nightLight);
    const notifications = useOsSystem((s) => s.notifications);
    const setFlyout = useOsSystem((s) => s.setFlyout);
    const toggleFlyout = useOsSystem((s) => s.toggleFlyout);
    const setTaskView = useOsSystem((s) => s.setTaskView);
    const setCtxMenu = useOsSystem((s) => s.setCtxMenu);
    const notify = useOsSystem((s) => s.notify);

    const [bootLine, setBootLine] = useState(0);
    const [bootKey, setBootKey] = useState(0);
    const [clock, setClock] = useState('');
    const [phone, setPhone] = useState(() => detectDevice() === 'phone');
    const [query, setQuery] = useState('');
    const welcomed = useRef(-1);
    const email = sessionEmail;
    const isAdmin = isAdminEmail(email);
    const wallpaper = getWallpaper(wallpaperId);
    const unread = notifications.filter((n) => !n.read).length;

    // Recompute phone layout on resize / rotate
    useEffect(() => {
        const sync = () => setPhone(detectDevice() === 'phone');
        sync();
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
        };
    }, []);

    // Boot sequence (re-runs on restart via bootKey)
    useEffect(() => {
        enterOs();
        setBootLine(0);
        hubAudio.osBootStart();
        let i = 0;
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            setBootLine(BOOT_LINES.length);
            setBootDone(true);
            hubAudio.osBootReady();
            return;
        }
        const t = setInterval(() => {
            i += 1;
            setBootLine(i);
            hubAudio.playSfx('os_boot_blip', { volume: 0.18 });
            if (i >= BOOT_LINES.length) {
                clearInterval(t);
                setTimeout(() => {
                    setBootDone(true);
                    hubAudio.osBootReady();
                    sacredUi.access();
                }, 160);
            }
        }, 110);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bootKey]);

    // Welcome toast once per boot
    useEffect(() => {
        if (bootDone && welcomed.current !== bootKey) {
            welcomed.current = bootKey;
            notify({
                title: 'Truth.OS 3.0 ready',
                body: 'Snap layouts, task view, widgets and a full program suite are live. Press Start.',
                accent: 'emerald',
            });
        }
    }, [bootDone, bootKey, notify]);

    useEffect(() => {
        const tick = () => {
            const d = new Date();
            setClock(
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
                    ' · ' +
                    d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
            );
        };
        tick();
        const t = setInterval(tick, 15000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSessionEmail(data.session?.user?.email ?? null);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setSessionEmail(session?.user?.email ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, [setSessionEmail]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (ctxMenu) setCtxMenu(null);
                else if (taskView) setTaskView(false);
                else if (flyout) setFlyout(null);
                else if (startOpen) setStartOpen(false);
                else if (authPrompt) setAuthPrompt(false);
            }
            if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                setStartOpen(!startOpen);
                setFlyout(null);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
                e.preventDefault();
                setTaskView(!taskView);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [startOpen, authPrompt, flyout, taskView, ctxMenu, setStartOpen, setAuthPrompt, setFlyout, setTaskView, setCtxMenu]);

    const visibleApps = APPS.filter((a) => !a.adminOnly || isAdmin);
    const filteredApps = query.trim()
        ? visibleApps.filter(
              (a) =>
                  a.label.toLowerCase().includes(query.trim().toLowerCase()) ||
                  a.app.includes(query.trim().toLowerCase()),
          )
        : visibleApps;
    const openWindows = windows.filter((w) => !w.minimized);
    const useBento = layoutMode === 'bento' && !phone;

    const launch = (app: OsAppId) => {
        openApp(app);
        setFlyout(null);
        setQuery('');
        hubAudio.osWindowOpen();
        sacredUi.click();
    };

    const restartOs = () => {
        clearDesktop();
        setFlyout(null);
        setTaskView(false);
        setBootDone(false);
        setBootKey((k) => k + 1);
        sacredUi.access();
    };

    const showDesktop = () => {
        windows.forEach((w) => {
            if (!w.minimized) minimizeWindow(w.id);
        });
        sacredUi.click();
    };

    if (!bootDone) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050508] font-mono text-sm text-[#5dff6a]">
                <div className="w-full max-w-md px-6 space-y-2">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-black text-black shadow-[0_0_24px_rgba(52,211,153,0.45)]">
                            T
                        </span>
                        <div>
                            <p className="text-[10px] tracking-[0.4em] text-[#2d6b35]">TRUTH.OS</p>
                            <p className="text-[11px] text-emerald-400/50">v3.0 · 2026 edition</p>
                        </div>
                    </div>
                    {BOOT_LINES.slice(0, bootLine).map((m, i) => (
                        <p key={i} className={i === bootLine - 1 ? 'animate-pulse' : 'text-emerald-400/80'}>
                            <span className="text-emerald-700 mr-2">›</span>
                            {m}
                        </p>
                    ))}
                    <div className="mt-6 h-1 rounded-full bg-emerald-950 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 transition-all duration-200"
                            style={{ width: `${Math.min(100, (bootLine / BOOT_LINES.length) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const openAppIds = new Set(windows.map((w) => w.app));

    return (
        <div
            className="fixed inset-0 z-40 flex flex-col overflow-hidden select-none bg-[#07090f]"
            style={
                {
                    ['--os-taskbar' as string]: 'calc(3.65rem + env(safe-area-inset-bottom, 0px))',
                    ['--os-pad-top' as string]: 'env(safe-area-inset-top, 0px)',
                } as CSSProperties
            }
        >
            {/* Wallpaper — themeable (Settings / Photos / right-click) */}
            <div
                className={`pointer-events-none absolute inset-0 bg-cover bg-center transition-[background-image] duration-300 ${phone ? '' : 'scale-105'}`}
                style={{ backgroundImage: wallpaper.css }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,rgba(16,185,129,0.14),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_80%_20%,rgba(56,189,248,0.1),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/75" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.06] max-sm:opacity-[0.04]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            {/* Desktop workspace (above taskbar) */}
            <div
                className="relative flex-1 min-h-0"
                style={{ paddingBottom: 'var(--os-taskbar)' }}
                onClick={() => {
                    if (startOpen) setStartOpen(false);
                    if (flyout) setFlyout(null);
                    if (ctxMenu) setCtxMenu(null);
                }}
                onContextMenu={(e) => {
                    if (phone) return;
                    // Only trap right-click on the empty desktop, not inside windows
                    if ((e.target as HTMLElement).closest('[data-os-window]')) return;
                    e.preventDefault();
                    setStartOpen(false);
                    setCtxMenu({ x: e.clientX, y: e.clientY });
                }}
            >
                {/* Desktop shortcut rail — behind windows, desktop only */}
                {!phone && openWindows.length > 0 && (
                    <div className="absolute left-2 top-2 z-[2] flex flex-col gap-1 w-[76px]">
                        {DESKTOP_ICONS.map((app) => (
                            <button
                                key={app}
                                type="button"
                                onDoubleClick={() => launch(app)}
                                onClick={() => launch(app)}
                                className="group flex flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors"
                                title={app}
                            >
                                <OsIconTile app={app} size="md" open={openAppIds.has(app)} />
                                <span className="text-[9px] text-white/85 drop-shadow-md leading-tight capitalize">
                                    {app === 'taskmgr' ? 'Tasks' : app}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* HOME: Hut bento (always under windows) */}
                {openWindows.length === 0 && (
                    <div
                        className="absolute inset-0 z-[1] overflow-y-auto overscroll-contain p-3 sm:p-5"
                        style={
                            {
                                WebkitOverflowScrolling: 'touch',
                                paddingTop: 'max(0.75rem, var(--os-pad-top))',
                                paddingBottom: '1.5rem',
                            } as CSSProperties
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            if (flyout) setFlyout(null);
                            if (ctxMenu) setCtxMenu(null);
                        }}
                    >
                        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-8">
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300 font-mono font-semibold">
                                        Truth.OS 3.0 · Home
                                    </p>
                                    <h1 className="text-xl sm:text-3xl font-semibold text-white mt-1 tracking-tight drop-shadow-md">
                                        The Hut
                                    </h1>
                                    <p className="text-[13px] sm:text-sm text-white/75 mt-1 max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-none">
                                        Open a card to launch a program. Right-click the desktop or explore the tray for more.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-black/55 sm:backdrop-blur-xl backdrop-blur-md px-3.5 py-3 shrink-0 shadow-xl ring-1 ring-white/5 w-full sm:w-auto">
                                    <p className="text-[9px] uppercase tracking-[0.28em] text-emerald-300/90 font-mono">
                                        {email ? 'Signed in' : 'Guest'}
                                    </p>
                                    <p className="text-[12px] text-white/80 mt-0.5 max-w-[240px] sm:max-w-[200px] truncate">
                                        {email
                                            ? email
                                            : 'Sign in for Ledger, Soul, Arcade & more.'}
                                    </p>
                                    {!email && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthPrompt(true);
                                                sacredUi.click();
                                            }}
                                            className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-[12px] font-bold min-h-[44px] shadow-[0_0_20px_rgba(52,211,153,0.35)] touch-manipulation"
                                        >
                                            Sign in with Google
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hut stations bento */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 auto-rows-[minmax(100px,auto)]">
                                {HUT_HOME.filter(
                                    (c) => !APPS.find((a) => a.app === c.app)?.adminOnly || isAdmin,
                                ).map((card) => (
                                    <OsHomeCard
                                        key={card.app}
                                        app={card.app}
                                        title={card.title}
                                        blurb={card.blurb}
                                        span={phone ? undefined : card.span}
                                        onClick={() => launch(card.app)}
                                    />
                                ))}
                            </div>

                            {/* Programs strip */}
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-white/55 font-mono mb-2 px-0.5 font-semibold">
                                    Programs
                                </p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {(
                                        [
                                            ['browser', 'Browser'],
                                            ['media', 'Media'],
                                            ['photos', 'Photos'],
                                            ['terminal', 'Terminal'],
                                            ['files', 'Files'],
                                            ['clock', 'Clock'],
                                            ['taskmgr', 'Tasks'],
                                            ['calculator', 'Calc'],
                                            ['paint', 'Paint'],
                                            ['notepad', 'Notes'],
                                            ['settings', 'Settings'],
                                            ['chamber', 'Leave'],
                                        ] as const
                                    ).map(([app, label]) => (
                                        <OsAppButton
                                            key={app}
                                            app={app}
                                            label={label}
                                            open={openAppIds.has(app)}
                                            compact={phone}
                                            onClick={() => launch(app)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Window layer */}
                {useBento && openWindows.length > 0 ? (
                    <div
                        className="absolute inset-x-0 top-0 z-[5] p-3 grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 auto-rows-fr pointer-events-none"
                        style={{ bottom: 'var(--os-taskbar)' }}
                    >
                        <AnimatePresence>
                            {openWindows.map((w) => (
                                <div
                                    key={w.id}
                                    data-os-window
                                    className={`${BENTO_CLASS[w.snap] || ''} min-h-0 pointer-events-auto ${
                                        w.snap === 'float' ? 'relative' : ''
                                    }`}
                                    style={{ zIndex: w.z }}
                                >
                                    <OsWindowFrame
                                        title={w.title}
                                        app={w.app}
                                        x={w.x}
                                        y={w.y}
                                        w={w.w}
                                        h={w.h}
                                        z={w.z}
                                        maximized={!!w.maximized || w.snap === 'max'}
                                        focused={focusId === w.id}
                                        bento
                                        phone={phone}
                                        onFocus={() => focusWindow(w.id)}
                                        onClose={() => {
                                            closeWindow(w.id);
                                            hubAudio.osWindowClose();
                                        }}
                                        onMinimize={() => minimizeWindow(w.id)}
                                        onMaximize={() => toggleMaximize(w.id)}
                                        onMove={(x, y) => moveWindow(w.id, x, y)}
                                        onSnap={(s) => setSnap(w.id, s)}
                                        onRect={(r) => setRect(w.id, r)}
                                    >
                                        {renderOsApp(w.app, {
                                            onLogout,
                                            onEnterChamber: enterChamber,
                                        })}
                                    </OsWindowFrame>
                                </div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    openWindows.length > 0 && (
                        <div
                            className="absolute inset-x-0 top-0 z-[5] pointer-events-none [&>*]:pointer-events-auto"
                            style={{ bottom: 'var(--os-taskbar)' }}
                        >
                            <AnimatePresence>
                                {openWindows.map((w) => (
                                    <OsWindowFrame
                                        key={w.id}
                                        title={w.title}
                                        app={w.app}
                                        x={w.x}
                                        y={w.y}
                                        w={w.w}
                                        h={w.h}
                                        z={w.z}
                                        maximized={!!w.maximized || phone}
                                        focused={focusId === w.id}
                                        bento={false}
                                        phone={phone}
                                        onFocus={() => focusWindow(w.id)}
                                        onClose={() => {
                                            closeWindow(w.id);
                                            hubAudio.osWindowClose();
                                        }}
                                        onMinimize={() => minimizeWindow(w.id)}
                                        onMaximize={() => toggleMaximize(w.id)}
                                        onMove={(x, y) => moveWindow(w.id, x, y)}
                                        onSnap={(s) => setSnap(w.id, s)}
                                        onRect={(r) => setRect(w.id, r)}
                                    >
                                        {renderOsApp(w.app, {
                                            onLogout,
                                            onEnterChamber: enterChamber,
                                        })}
                                    </OsWindowFrame>
                                ))}
                            </AnimatePresence>
                        </div>
                    )
                )}

                {/* Start menu — bottom sheet on phone, floating on desktop */}
                {startOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute z-50 border border-white/15 bg-[#0f1219]/97 shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 max-sm:backdrop-blur-md sm:backdrop-blur-2xl ${
                            phone
                                ? 'left-0 right-0 bottom-0 max-h-[min(78dvh,600px)] rounded-t-3xl rounded-b-none border-b-0'
                                : 'bottom-2 left-2 sm:left-3 w-[min(100%-1rem,460px)] max-h-[min(74vh,620px)] rounded-2xl'
                        }`}
                        style={
                            (phone
                                ? { marginBottom: 'var(--os-taskbar)' }
                                : undefined) as CSSProperties | undefined
                        }
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 shrink-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(52,211,153,0.4)] ring-1 ring-white/30">
                                T
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-mono font-semibold">Start</p>
                                <p className="text-sm text-white font-semibold mt-0.5 truncate">
                                    {email || 'Guest · sign in for full Hut'}
                                </p>
                            </div>
                            {!email && (
                                <button
                                    type="button"
                                    onClick={() => setAuthPrompt(true)}
                                    className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-white text-black font-bold"
                                >
                                    Google
                                </button>
                            )}
                        </div>
                        {/* Search */}
                        <div className="px-3 pt-3 pb-1 shrink-0">
                            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-white/12 bg-white/[0.06] focus-within:border-emerald-400/50">
                                <Search size={14} className="text-white/40 shrink-0" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && filteredApps.length > 0) {
                                            launch(filteredApps[0].app);
                                        }
                                    }}
                                    autoFocus={!phone}
                                    className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-white/35"
                                    placeholder="Search programs…"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        className="text-white/40 hover:text-white text-xs px-1"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                        <div
                            className={`p-3 grid gap-2 overflow-y-auto flex-1 overscroll-contain ${
                                phone ? 'grid-cols-4' : 'grid-cols-4'
                            }`}
                            style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
                        >
                            {filteredApps.map((d) => (
                                <OsAppButton
                                    key={d.app}
                                    app={d.app}
                                    label={d.label}
                                    open={openAppIds.has(d.app)}
                                    compact={phone}
                                    onClick={() => launch(d.app)}
                                />
                            ))}
                            {filteredApps.length === 0 && (
                                <p className="col-span-full text-center text-[12px] text-white/40 py-6">
                                    No programs match “{query}”.
                                </p>
                            )}
                        </div>
                        <div className="p-2 border-t border-white/10 flex items-center gap-1 shrink-0 bg-black/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setLayoutMode(layoutMode === 'bento' ? 'float' : 'bento');
                                    sacredUi.click();
                                }}
                                className="flex-1 text-left px-3 py-2.5 rounded-xl text-[11px] text-white/75 hover:bg-white/10 hover:text-white min-h-[44px] font-medium"
                            >
                                Layout · {layoutMode === 'bento' ? 'Bento' : 'Float'}
                            </button>
                            {onEnterChamber && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartOpen(false);
                                        enterChamber();
                                        sacredUi.click();
                                    }}
                                    className="flex-1 text-left px-3 py-2.5 rounded-xl text-[11px] text-emerald-300 hover:bg-emerald-500/15 min-h-[44px] font-medium"
                                >
                                    3D Chamber
                                </button>
                            )}
                            <button
                                type="button"
                                title="Restart Truth.OS"
                                onClick={() => {
                                    setStartOpen(false);
                                    restartOs();
                                }}
                                className="w-11 h-11 min-w-[44px] rounded-xl text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center touch-manipulation"
                            >
                                <RefreshCw size={15} />
                            </button>
                            <button
                                type="button"
                                title="Sign out"
                                onClick={() => {
                                    onLogout();
                                    sacredUi.click();
                                }}
                                className="w-11 h-11 min-w-[44px] rounded-xl text-red-300/80 hover:bg-red-500/15 hover:text-red-200 flex items-center justify-center touch-manipulation"
                            >
                                <Power size={15} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* System flyouts */}
                <AnimatePresence>
                    {flyout === 'quick' && <OsQuickSettings key="quick" phone={phone} />}
                    {flyout === 'calendar' && <OsCalendarFlyout key="cal" phone={phone} />}
                    {flyout === 'notifications' && (
                        <OsNotificationCenter key="notes" phone={phone} />
                    )}
                    {flyout === 'widgets' && (
                        <OsWidgetsPanel key="widgets" phone={phone} onLaunch={launch} />
                    )}
                </AnimatePresence>

                {/* Task view */}
                <AnimatePresence>
                    {taskView && (
                        <OsTaskView
                            onPick={(id) => {
                                setTaskView(false);
                                focusWindow(id);
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Desktop context menu */}
                <OsContextMenu
                    onOpenSettings={() => launch('settings')}
                    onRestart={restartOs}
                />

                {/* Toasts */}
                <OsToasts />
            </div>

            {/* Bottom taskbar — dock height matches --os-taskbar */}
            <footer
                className="absolute bottom-0 inset-x-0 z-50 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 border-t border-white/15 bg-black/85 max-sm:backdrop-blur-md sm:backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
                style={{
                    minHeight: '3.65rem',
                    height: 'var(--os-taskbar)',
                    paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))',
                    paddingTop: '0.35rem',
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        const next = !startOpen;
                        setStartOpen(next);
                        setFlyout(null);
                        if (next) hubAudio.osStartMenu();
                        else sacredUi.click();
                    }}
                    className={`h-11 min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold transition-all active:scale-95 touch-manipulation ${
                        startOpen
                            ? 'bg-emerald-500/25 text-white border border-emerald-400/40 shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                            : 'text-white/90 hover:bg-white/12 border border-white/10'
                    }`}
                >
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-[12px] font-black text-black flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.4)] ring-1 ring-white/30">
                        T
                    </span>
                    <span className="hidden sm:inline">Start</span>
                </button>
                <button
                    type="button"
                    title="Task view (Ctrl+Tab)"
                    onClick={() => {
                        setTaskView(!taskView);
                        sacredUi.click();
                    }}
                    className={`h-11 min-h-[44px] min-w-[44px] px-2 rounded-xl flex items-center justify-center transition-all active:scale-95 touch-manipulation ${
                        taskView
                            ? 'bg-white/15 text-white border border-white/25'
                            : 'text-white/70 hover:bg-white/10 border border-transparent'
                    }`}
                >
                    <SquareStack size={17} />
                </button>
                <button
                    type="button"
                    title="Widgets"
                    onClick={() => {
                        setStartOpen(false);
                        toggleFlyout('widgets');
                        sacredUi.click();
                    }}
                    className={`h-11 min-h-[44px] min-w-[44px] px-2 rounded-xl hidden sm:flex items-center justify-center transition-all active:scale-95 touch-manipulation ${
                        flyout === 'widgets'
                            ? 'bg-white/15 text-white border border-white/25'
                            : 'text-white/70 hover:bg-white/10 border border-transparent'
                    }`}
                >
                    <LayoutPanelLeft size={17} />
                </button>
                {onEnterChamber && (
                    <button
                        type="button"
                        onClick={() => {
                            setStartOpen(false);
                            enterChamber();
                            sacredUi.access();
                        }}
                        className="h-11 min-h-[44px] min-w-[44px] px-2 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 border border-emerald-200/50 shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 touch-manipulation"
                        title="Leave terminal — enter 3D world"
                    >
                        <OsIconTile app="chamber" size="sm" />
                        <span className="hidden lg:inline">Leave terminal</span>
                    </button>
                )}
                <div className="w-px h-7 bg-white/15 mx-0.5 shrink-0" />
                <div
                    className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto min-w-0 no-scrollbar overscroll-x-contain"
                    style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
                >
                    {windows.map((w) => (
                        <OsTaskbarItem
                            key={w.id}
                            app={w.app}
                            title={w.title}
                            focused={focusId === w.id}
                            minimized={w.minimized}
                            iconOnly={phone}
                            onClick={() => {
                                if (w.minimized || focusId !== w.id) focusWindow(w.id);
                                else minimizeWindow(w.id);
                                sacredUi.click();
                            }}
                        />
                    ))}
                </div>
                {/* System tray */}
                <div className="flex items-center gap-0.5 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] h-11 min-h-[44px] px-1">
                    {isAdmin && (
                        <span className="text-[9px] uppercase tracking-widest text-rose-300 font-bold hidden lg:inline px-1">
                            Admin
                        </span>
                    )}
                    <button
                        type="button"
                        title="Quick settings"
                        onClick={() => {
                            setStartOpen(false);
                            toggleFlyout('quick');
                            sacredUi.click();
                        }}
                        className={`h-9 min-w-[36px] px-1.5 rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
                            flyout === 'quick' ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10'
                        }`}
                    >
                        <Settings2 size={15} />
                    </button>
                    <button
                        type="button"
                        title="Notifications"
                        onClick={() => {
                            setStartOpen(false);
                            toggleFlyout('notifications');
                            sacredUi.click();
                        }}
                        className={`relative h-9 min-w-[36px] px-1.5 rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
                            flyout === 'notifications'
                                ? 'bg-white/15 text-white'
                                : 'text-white/65 hover:bg-white/10'
                        }`}
                    >
                        <Bell size={15} />
                        {unread > 0 && (
                            <span className="absolute top-0.5 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-black/60">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        title="Calendar"
                        onClick={() => {
                            setStartOpen(false);
                            toggleFlyout('calendar');
                            sacredUi.click();
                        }}
                        className={`h-9 px-2 rounded-lg items-center justify-center hidden md:flex transition-colors touch-manipulation ${
                            flyout === 'calendar' ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                    >
                        <span className="text-[11px] font-mono text-white/75 font-medium tabular-nums">
                            {clock.split(' · ')[0]}
                        </span>
                    </button>
                    <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80] mx-1"
                        title="Online"
                    />
                </div>
                {/* Show desktop sliver */}
                <button
                    type="button"
                    title="Show desktop"
                    onClick={showDesktop}
                    className="hidden sm:block w-2 h-11 min-h-[44px] rounded-sm border-l border-white/15 hover:bg-white/15 transition-colors shrink-0"
                />
            </footer>

            {/* Screen filters — brightness + night light */}
            {brightness < 1 && (
                <div
                    className="pointer-events-none absolute inset-0 z-[85] bg-black"
                    style={{ opacity: (1 - brightness) * 0.85 }}
                />
            )}
            {nightLight && (
                <div
                    className="pointer-events-none absolute inset-0 z-[85]"
                    style={{ background: 'rgba(255, 147, 41, 0.10)' }}
                />
            )}

            {/* Lock screen */}
            <AnimatePresence>
                {locked && <OsLockScreen wallpaperCss={wallpaper.css} />}
            </AnimatePresence>

            <AuthModal
                isOpen={authPrompt}
                isGated
                onClose={() => setAuthPrompt(false)}
                onSuccess={() => {
                    setAuthPrompt(false);
                    supabase.auth.getUser().then(({ data }) => {
                        setSessionEmail(data.user?.email ?? null);
                        if (pendingApp) openApp(pendingApp);
                    });
                }}
            />
        </div>
    );
}
