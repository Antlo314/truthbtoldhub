'use client';

/**
 * Truth.OS — Windows × Bento desktop shell.
 * Bottom taskbar, Start menu, snap windows. No 3D required.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    useTruthOs,
    APP_META,
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

type DockItem = {
    app: OsAppId;
    label: string;
    emoji: string;
    adminOnly?: boolean;
    guestOk?: boolean;
};

/** Hut home + utilities (no Forge / Wayfinder) */
const APPS: DockItem[] = [
    { app: 'truth', label: 'Guide', emoji: '✦', guestOk: true },
    { app: 'ledger', label: 'Ledger', emoji: '▣' },
    { app: 'soul', label: 'Soul', emoji: '◉' },
    { app: 'arcade', label: 'Arcade', emoji: '▷' },
    { app: 'offering', label: 'Offering', emoji: '◇' },
    { app: 'archive', label: 'Hall', emoji: '☰', guestOk: true },
    { app: 'library', label: 'Library', emoji: '▤', guestOk: true },
    { app: 'visions', label: 'Visions', emoji: '◈', guestOk: true },
    { app: 'updates', label: 'Updates', emoji: '◎', guestOk: true },
    { app: 'files', label: 'Files', emoji: '📁', guestOk: true },
    { app: 'calculator', label: 'Calc', emoji: '🔢', guestOk: true },
    { app: 'paint', label: 'Paint', emoji: '🎨', guestOk: true },
    { app: 'notepad', label: 'Notepad', emoji: '📝', guestOk: true },
    { app: 'account', label: 'Account', emoji: '☺' },
    { app: 'settings', label: 'Settings', emoji: '⚙', guestOk: true },
    { app: 'chamber', label: 'Leave', emoji: '🚪', guestOk: true },
    { app: 'admin', label: 'Admin', emoji: '✱', adminOnly: true },
];

/** Hut stations shown as home-screen bento cards */
const HUT_HOME: { app: OsAppId; emoji: string; title: string; blurb: string; span?: string }[] = [
    { app: 'truth', emoji: '✦', title: 'Truth Guide', blurb: 'AI brother · scripture · OS help', span: 'sm:col-span-2 sm:row-span-2' },
    { app: 'ledger', emoji: '▣', title: 'Ledger', blurb: 'Daily Word · souls' },
    { app: 'soul', emoji: '◉', title: 'Soul', blurb: 'Vessel · identity' },
    { app: 'arcade', emoji: '▷', title: 'Arcade', blurb: 'Games · scores' },
    { app: 'archive', emoji: '☰', title: 'The Hall', blurb: 'Community chat' },
    { app: 'library', emoji: '▤', title: 'Library', blurb: 'Scrolls · study' },
    { app: 'visions', emoji: '◈', title: 'Visions', blurb: 'Roads · cinema' },
    { app: 'offering', emoji: '◇', title: 'Offering', blurb: 'Sustain the work' },
    { app: 'updates', emoji: '◎', title: 'Updates', blurb: 'Dispatches' },
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

function AppTile({
    emoji,
    label,
    accent,
    onClick,
    large,
}: {
    emoji: string;
    label: string;
    accent?: string;
    onClick: () => void;
    large?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-emerald-400/30 transition-all active:scale-[0.98] ${
                large ? 'min-h-[88px] p-3' : 'min-h-[72px] p-2'
            }`}
        >
            <span
                className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 shadow-inner ${
                    large ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-lg'
                } ${accent || ''}`}
            >
                {emoji}
            </span>
            <span className="text-[11px] text-white/80 group-hover:text-white text-center leading-tight px-1">
                {label}
            </span>
        </button>
    );
}

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
    const email = sessionEmail;
    const isAdmin = isAdminEmail(email);

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
    const phone = detectDevice() === 'phone';
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

    return (
        <div className="fixed inset-0 z-40 flex flex-col overflow-hidden select-none bg-[#0a0c12]">
            {/* Wallpaper */}
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/truthos/os-wallpaper.jpg)' }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                }}
            />

            {/* Desktop workspace (above taskbar) */}
            <div
                className="relative flex-1 min-h-0 pb-16 sm:pb-14"
                style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom, 0px) + 3.5rem)' }}
                onClick={() => {
                    if (startOpen) setStartOpen(false);
                }}
            >
                {/* HOME: Hut bento (always under windows) */}
                {openWindows.length === 0 && (
                    <div
                        className="absolute inset-0 z-[1] overflow-y-auto p-3 sm:p-5 overscroll-contain"
                        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-w-5xl mx-auto space-y-4 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-400/80 font-mono">
                                        Truth.OS · Home
                                    </p>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-1 tracking-tight">
                                        The Hut
                                    </h1>
                                    <p className="text-sm text-white/55 mt-1 max-w-lg">
                                        Everything that lived in the Hut is here — open a card. No 3D required.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md px-3.5 py-3 shrink-0">
                                    <p className="text-[9px] uppercase tracking-[0.28em] text-emerald-400/70 font-mono">
                                        {email ? 'Signed in' : 'Guest'}
                                    </p>
                                    <p className="text-[12px] text-white/70 mt-0.5 max-w-[200px]">
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
                                            className="mt-2 w-full py-2 rounded-xl bg-white text-black text-[11px] font-semibold min-h-[40px]"
                                        >
                                            Sign in with Google
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hut stations bento */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 auto-rows-[minmax(100px,auto)]">
                                {HUT_HOME.filter(
                                    (c) => !APPS.find((a) => a.app === c.app)?.adminOnly || isAdmin,
                                ).map((card) => (
                                    <button
                                        key={card.app}
                                        type="button"
                                        onClick={() => launch(card.app)}
                                        className={`group text-left rounded-2xl border border-white/10 bg-black/40 hover:bg-black/55 hover:border-emerald-400/35 backdrop-blur-md p-3.5 sm:p-4 transition-all active:scale-[0.98] shadow-lg ${
                                            card.span || ''
                                        }`}
                                    >
                                        <span className="text-2xl sm:text-3xl block mb-2 group-hover:scale-105 transition-transform origin-left">
                                            {card.emoji}
                                        </span>
                                        <span className="block text-sm sm:text-base font-semibold text-white">
                                            {card.title}
                                        </span>
                                        <span className="block text-[11px] text-white/45 mt-0.5 leading-snug">
                                            {card.blurb}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Utilities strip */}
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-white/35 font-mono mb-2 px-0.5">
                                    System tools
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {(
                                        [
                                            ['files', '📁', 'Files'],
                                            ['calculator', '🔢', 'Calc'],
                                            ['paint', '🎨', 'Paint'],
                                            ['notepad', '📝', 'Notes'],
                                            ['settings', '⚙', 'Settings'],
                                            ['chamber', '🚪', 'Leave'],
                                        ] as const
                                    ).map(([app, emoji, label]) => (
                                        <button
                                            key={app}
                                            type="button"
                                            onClick={() => launch(app)}
                                            className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-3 px-2 flex flex-col items-center gap-1 min-h-[72px]"
                                        >
                                            <span className="text-lg">{emoji}</span>
                                            <span className="text-[10px] text-white/70">{label}</span>
                                        </button>
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
                                        emoji={APPS.find((a) => a.app === w.app)?.emoji ?? '▣'}
                                        x={w.x}
                                        y={w.y}
                                        w={w.w}
                                        h={w.h}
                                        z={w.z}
                                        maximized={!!w.maximized || w.snap === 'max'}
                                        focused={focusId === w.id}
                                        bento
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
                                        emoji={APPS.find((a) => a.app === w.app)?.emoji ?? '▣'}
                                        x={w.x}
                                        y={w.y}
                                        w={w.w}
                                        h={w.h}
                                        z={w.z}
                                        maximized={!!w.maximized || phone}
                                        focused={focusId === w.id}
                                        bento={false}
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

                {/* Start menu — above taskbar */}
                {startOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-2 left-2 sm:left-3 z-50 w-[min(100%-1rem,380px)] max-h-[min(70vh,560px)] rounded-2xl border border-white/12 bg-[#12151c]/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-black">
                                T
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-mono">Start</p>
                                <p className="text-sm text-white font-medium mt-0.5 truncate">
                                    {email || 'Guest · sign in for full Hut'}
                                </p>
                            </div>
                            {!email && (
                                <button
                                    type="button"
                                    onClick={() => setAuthPrompt(true)}
                                    className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-white text-black font-semibold"
                                >
                                    Google
                                </button>
                            )}
                        </div>
                        <div className="p-3 grid grid-cols-3 gap-2 overflow-y-auto flex-1">
                            {visibleApps.map((d) => (
                                <AppTile
                                    key={d.app}
                                    emoji={d.emoji}
                                    label={d.label}
                                    onClick={() => launch(d.app)}
                                />
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/10 space-y-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setLayoutMode(layoutMode === 'bento' ? 'float' : 'bento');
                                    sacredUi.click();
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-white/60 hover:bg-white/8 min-h-[44px]"
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
                                    className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-emerald-300/80 hover:bg-emerald-500/10 min-h-[44px]"
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
                                className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-red-300/80 hover:bg-red-500/10 min-h-[44px]"
                            >
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Bottom taskbar — taller on mobile + safe area */}
            <footer
                className="absolute bottom-0 inset-x-0 z-50 flex items-center gap-1 px-2 border-t border-white/10 bg-black/85 backdrop-blur-xl"
                style={{
                    minHeight: '3.5rem',
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
                    className={`h-10 px-3 rounded-xl flex items-center gap-2 text-[13px] font-semibold transition-colors min-w-[44px] ${
                        startOpen ? 'bg-emerald-500/20 text-white border border-emerald-400/30' : 'text-white/80 hover:bg-white/10 border border-transparent'
                    }`}
                >
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-[11px] font-black text-black flex items-center justify-center">
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
                        className="h-10 px-3 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 border border-emerald-300/40 min-w-[44px] shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                        title="Leave terminal — enter 3D world"
                    >
                        <span aria-hidden>🚪</span>
                        <span className="hidden sm:inline">Leave terminal</span>
                    </button>
                )}
                <div className="w-px h-7 bg-white/10 mx-1" />
                <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0 no-scrollbar">
                    {windows.map((w) => {
                        const emoji = APPS.find((a) => a.app === w.app)?.emoji ?? '▣';
                        return (
                            <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                    if (w.minimized || focusId !== w.id) focusWindow(w.id);
                                    else minimizeWindow(w.id);
                                    sacredUi.click();
                                }}
                                className={`h-10 pl-2 pr-3 rounded-xl text-[11px] truncate max-w-[150px] border transition-colors flex items-center gap-1.5 shrink-0 ${
                                    focusId === w.id && !w.minimized
                                        ? 'bg-white/12 border-white/15 text-white'
                                        : 'border-transparent text-white/50 hover:bg-white/8'
                                }`}
                            >
                                <span className="text-sm">{emoji}</span>
                                <span className="truncate hidden xs:inline sm:inline">{w.title}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 px-2 shrink-0">
                    {isAdmin && (
                        <span className="text-[9px] uppercase tracking-widest text-rose-400/90 hidden md:inline">
                            Admin
                        </span>
                    )}
                    <span className="text-[10px] font-mono text-white/45 hidden sm:inline">
                        {clock.split(' · ')[0]}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" title="Online" />
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
    emoji,
    x,
    y,
    w,
    h,
    z,
    maximized,
    focused,
    bento,
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
    emoji: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    maximized: boolean;
    focused: boolean;
    bento: boolean;
    children: ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onMove: (x: number, y: number) => void;
    onSnap: (s: BentoSlot) => void;
}) {
    const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
    const narrow = typeof window !== 'undefined' && window.innerWidth < 768;
    const accent =
        app === 'admin'
            ? 'border-rose-500/40'
            : focused
              ? 'border-emerald-500/35'
              : 'border-white/12';

    const style: React.CSSProperties =
        bento || maximized || narrow
            ? {
                  position: bento && !maximized && !narrow ? 'relative' : 'absolute',
                  inset: bento && !maximized && !narrow ? undefined : narrow || maximized ? 8 : undefined,
                  bottom: bento && !maximized && !narrow ? undefined : narrow || maximized ? 60 : undefined,
                  left: bento && !maximized && !narrow ? undefined : maximized || narrow ? 8 : x,
                  top: bento && !maximized && !narrow ? undefined : maximized || narrow ? 8 : y,
                  width: bento && !maximized && !narrow ? '100%' : maximized || narrow ? undefined : Math.min(w, (typeof window !== 'undefined' ? window.innerWidth : w) - 24),
                  height: bento && !maximized && !narrow ? '100%' : maximized || narrow ? undefined : Math.min(h, (typeof window !== 'undefined' ? window.innerHeight : h) - 100),
                  zIndex: z,
                  background: '#0e1016',
              }
            : {
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: Math.min(w, typeof window !== 'undefined' ? window.innerWidth - 24 : w),
                  height: Math.min(h, typeof window !== 'undefined' ? window.innerHeight - 100 : h),
                  zIndex: z,
                  background: '#0e1016',
              };

    return (
        <div
            className={`flex flex-col overflow-hidden border shadow-2xl rounded-2xl ${accent} ${
                focused ? 'shadow-black/50' : 'opacity-95'
            } ${bento && !maximized && !narrow ? 'h-full w-full absolute inset-0' : ''}`}
            style={style}
            onMouseDown={onFocus}
        >
            <div
                className="h-10 shrink-0 flex items-center gap-2 px-2 border-b border-white/10 bg-black/50 cursor-default"
                onPointerDown={(e) => {
                    if (narrow || maximized || bento) return;
                    const el = e.currentTarget.parentElement;
                    if (!el) return;
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
                <span className="text-sm pl-1">{emoji}</span>
                <span className="text-[12px] text-white/85 font-medium truncate flex-1">{title}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {!narrow && (
                        <button
                            type="button"
                            title="Snap bento"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSnap('hero');
                            }}
                            className="w-7 h-7 rounded-md text-[10px] text-white/40 hover:bg-white/10 hover:text-white"
                        >
                            ⊞
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMinimize();
                        }}
                        className="w-7 h-7 rounded-md text-white/50 hover:bg-white/10 text-sm leading-none"
                    >
                        –
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMaximize();
                        }}
                        className="w-7 h-7 rounded-md text-white/50 hover:bg-white/10 text-[10px]"
                    >
                        □
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-7 h-7 rounded-md text-white/50 hover:bg-red-500/30 hover:text-red-200 text-sm leading-none"
                    >
                        ×
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0e1016]">{children}</div>
        </div>
    );
}
