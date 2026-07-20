'use client';

/**
 * Truth.OS — Windows × Bento desktop shell.
 * Colored icons, sharp glass chrome, real open/press states.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
    ACCENT_STYLES,
    getAppAccent,
} from './OsIcon';

type DockItem = {
    app: OsAppId;
    label: string;
    adminOnly?: boolean;
    guestOk?: boolean;
};

/** Hut home + utilities (no Forge / Wayfinder) */
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
    { app: 'files', label: 'Files', guestOk: true },
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
    { app: 'visions', title: 'Visions', blurb: 'Roads · cinema' },
    { app: 'offering', title: 'Offering', blurb: 'Sustain the work' },
    { app: 'updates', title: 'Updates', blurb: 'Dispatches' },
];

const BOOT_LINES = [
    'Truth.OS BIOS · firmware OK',
    'mounting soul_fs…',
    'loading bento window manager…',
    'network · encrypted channel',
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
        minimizeWindow,
        toggleMaximize,
        setSnap,
        setBootDone,
        setStartOpen,
        setSessionEmail,
        setAuthPrompt,
        enterOs,
        setLayoutMode,
    } = useTruthOs();

    const [bootLine, setBootLine] = useState(0);
    const [clock, setClock] = useState('');
    const [phone, setPhone] = useState(() => detectDevice() === 'phone');
    const email = sessionEmail;
    const isAdmin = isAdminEmail(email);

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

    useEffect(() => {
        enterOs();
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
        }, 120);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                if (startOpen) setStartOpen(false);
                else if (authPrompt) setAuthPrompt(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                setStartOpen(!startOpen);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [startOpen, authPrompt, setStartOpen, setAuthPrompt]);

    const visibleApps = APPS.filter((a) => !a.adminOnly || isAdmin);
    const openWindows = windows.filter((w) => !w.minimized);
    const useBento = layoutMode === 'bento' && !phone;

    const launch = (app: OsAppId) => {
        openApp(app);
        hubAudio.osWindowOpen();
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
                            <p className="text-[11px] text-emerald-400/50">v2.0 · Windows × Bento</p>
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
            {/* Wallpaper — no scale zoom on phone (sharper + cheaper) */}
            <div
                className={`pointer-events-none absolute inset-0 bg-cover bg-center ${phone ? '' : 'scale-105'}`}
                style={{ backgroundImage: 'url(/truthos/os-wallpaper.jpg)' }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,rgba(16,185,129,0.18),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_80%_20%,rgba(56,189,248,0.12),transparent_50%)]" />
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
                }}
            >
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
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-8">
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300 font-mono font-semibold">
                                        Truth.OS · Home
                                    </p>
                                    <h1 className="text-xl sm:text-3xl font-semibold text-white mt-1 tracking-tight drop-shadow-md">
                                        The Hut
                                    </h1>
                                    <p className="text-[13px] sm:text-sm text-white/75 mt-1 max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-none">
                                        Open a card to launch an app. Everything from the Hut lives here.
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

                            {/* Utilities strip */}
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-white/55 font-mono mb-2 px-0.5 font-semibold">
                                    System tools
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {(
                                        [
                                            ['files', 'Files'],
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
                    <div className="absolute inset-0 z-[5] p-3 grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 auto-rows-fr">
                        <AnimatePresence>
                            {openWindows.map((w) => (
                                <div
                                    key={w.id}
                                    className={`${BENTO_CLASS[w.snap] || ''} min-h-0 ${
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
                        <div className="absolute inset-0 z-[5]">
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
                                        onClose={() => closeWindow(w.id)}
                                        onMinimize={() => minimizeWindow(w.id)}
                                        onMaximize={() => toggleMaximize(w.id)}
                                        onMove={(x, y) => moveWindow(w.id, x, y)}
                                        onSnap={(s) => setSnap(w.id, s)}
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
                                ? 'left-0 right-0 bottom-0 max-h-[min(78dvh,560px)] rounded-t-3xl rounded-b-none border-b-0'
                                : 'bottom-2 left-2 sm:left-3 w-[min(100%-1rem,400px)] max-h-[min(70vh,560px)] rounded-2xl'
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
                        <div
                            className={`p-3 grid gap-2 overflow-y-auto flex-1 overscroll-contain ${
                                phone ? 'grid-cols-4' : 'grid-cols-3'
                            }`}
                            style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
                        >
                            {visibleApps.map((d) => (
                                <OsAppButton
                                    key={d.app}
                                    app={d.app}
                                    label={d.label}
                                    open={openAppIds.has(d.app)}
                                    compact={phone}
                                    onClick={() => launch(d.app)}
                                />
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/10 space-y-1 shrink-0 bg-black/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setLayoutMode(layoutMode === 'bento' ? 'float' : 'bento');
                                    sacredUi.click();
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-white/75 hover:bg-white/10 hover:text-white min-h-[44px] font-medium"
                            >
                                Layout · {layoutMode === 'bento' ? 'Bento snap' : 'Free float'}
                            </button>
                            {onEnterChamber && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartOpen(false);
                                        enterChamber();
                                        sacredUi.click();
                                    }}
                                    className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-emerald-300 hover:bg-emerald-500/15 min-h-[44px] font-medium"
                                >
                                    Enter 3D Chamber (optional)
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    onLogout();
                                    sacredUi.click();
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-red-300 hover:bg-red-500/15 min-h-[44px] font-medium"
                            >
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                )}
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
                        <span className="hidden sm:inline">Leave terminal</span>
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
                <div className="flex items-center gap-2 px-2 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] h-11 min-h-[44px]">
                    {isAdmin && (
                        <span className="text-[9px] uppercase tracking-widest text-rose-300 font-bold hidden md:inline">
                            Admin
                        </span>
                    )}
                    <span className="text-[11px] font-mono text-white/75 hidden md:inline font-medium tabular-nums">
                        {clock.split(' · ')[0]}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" title="Online" />
                </div>
            </footer>

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

function OsWindowFrame({
    title,
    app,
    x,
    y,
    w,
    h,
    z,
    maximized,
    focused,
    bento,
    phone = false,
    children,
    onFocus,
    onClose,
    onMinimize,
    onMaximize,
    onMove,
    onSnap,
}: {
    title: string;
    app: OsAppId;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    maximized: boolean;
    focused: boolean;
    bento: boolean;
    phone?: boolean;
    children: ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onMove: (x: number, y: number) => void;
    onSnap: (s: BentoSlot) => void;
}) {
    const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
    const narrow = phone || (typeof window !== 'undefined' && window.innerWidth < 768);
    const accentId = getAppAccent(app);
    const accentStyle = ACCENT_STYLES[accentId];
    const borderCls = focused
        ? `border-white/20 ring-1 ${accentStyle.ring}`
        : 'border-white/12';
    const fillScreen = (maximized || narrow) && !(bento && !maximized && !narrow);

    const style: CSSProperties = fillScreen
        ? {
              position: 'absolute',
              left: narrow ? 0 : 8,
              right: narrow ? 0 : 8,
              top: narrow
                  ? 'max(0px, env(safe-area-inset-top, 0px))'
                  : 8,
              bottom: 'var(--os-taskbar, 3.65rem)',
              width: undefined,
              height: undefined,
              zIndex: z,
              background: '#0c0e14',
          }
        : bento && !maximized && !narrow
          ? {
                position: 'relative',
                width: '100%',
                height: '100%',
                zIndex: z,
                background: '#0c0e14',
            }
          : {
                position: 'absolute',
                left: x,
                top: y,
                width: Math.min(w, typeof window !== 'undefined' ? window.innerWidth - 24 : w),
                height: Math.min(h, typeof window !== 'undefined' ? window.innerHeight - 100 : h),
                zIndex: z,
                background: '#0c0e14',
            };

    return (
        <div
            className={`flex flex-col overflow-hidden border shadow-2xl ${
                narrow ? 'rounded-none sm:rounded-2xl' : 'rounded-2xl'
            } ${borderCls} ${focused ? 'shadow-black/60' : 'opacity-[0.97]'} ${
                bento && !maximized && !narrow ? 'h-full w-full absolute inset-0' : ''
            }`}
            style={style}
            onMouseDown={onFocus}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentStyle.bar} z-10 ${narrow ? '' : 'rounded-l-2xl'}`} />
            <div
                className={`shrink-0 flex items-center gap-2 pl-3 pr-1 border-b border-white/12 bg-gradient-to-r from-black/70 to-black/40 cursor-default ${
                    narrow ? 'h-11 min-h-[44px]' : 'h-10'
                }`}
                onPointerDown={(e) => {
                    if (narrow || maximized || bento) return;
                    drag.current = { ox: e.clientX, oy: e.clientY, sx: x, sy: y };
                    const move = (ev: PointerEvent) => {
                        if (!drag.current) return;
                        onMove(
                            drag.current.sx + (ev.clientX - drag.current.ox),
                            drag.current.sy + (ev.clientY - drag.current.oy),
                        );
                    };
                    const up = () => {
                        drag.current = null;
                        window.removeEventListener('pointermove', move);
                        window.removeEventListener('pointerup', up);
                    };
                    window.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', up);
                }}
            >
                <OsIconTile app={app} size="sm" open={focused} />
                <span className="text-[12px] sm:text-[13px] text-white font-semibold truncate flex-1 tracking-tight">
                    {title}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                    {!narrow && (
                        <button
                            type="button"
                            title="Snap bento"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSnap('hero');
                            }}
                            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg text-[11px] text-white/50 hover:bg-white/12 hover:text-white transition-colors touch-manipulation"
                        >
                            ⊞
                        </button>
                    )}
                    <button
                        type="button"
                        title="Minimize"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMinimize();
                        }}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-lg text-white/60 hover:bg-white/12 text-base leading-none transition-colors touch-manipulation"
                    >
                        –
                    </button>
                    {!narrow && (
                        <button
                            type="button"
                            title="Maximize"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMaximize();
                            }}
                            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg text-white/60 hover:bg-white/12 text-[11px] transition-colors touch-manipulation"
                        >
                            □
                        </button>
                    )}
                    <button
                        type="button"
                        title="Close"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-lg text-white/70 hover:bg-red-500 hover:text-white text-base leading-none transition-colors touch-manipulation"
                    >
                        ×
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden overflow-y-auto bg-[#0c0e14] overscroll-contain">
                {children}
            </div>
        </div>
    );
}
