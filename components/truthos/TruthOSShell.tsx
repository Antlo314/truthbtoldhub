'use client';

/**
 * Truth.OS — desktop OS shell with custom icon sheet + wallpaper.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTruthOs, type OsAppId } from './truthOsStore';
import { renderOsApp } from './apps/OsApps';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/adminEmails';
import { hubAudio } from '@/lib/truthos/hubAudio';

type DockItem = {
    app: OsAppId;
    label: string;
    /** Position on 2×3 icon sheet (row-major 0–5) */
    sheet: number;
    adminOnly?: boolean;
};

const APPS: DockItem[] = [
    { app: 'truth', label: 'Truth', sheet: 0 },
    { app: 'updates', label: 'Updates', sheet: 1 },
    { app: 'files', label: 'Files', sheet: 2 },
    { app: 'account', label: 'Account', sheet: 3 },
    { app: 'settings', label: 'Settings', sheet: 4 },
    { app: 'admin', label: 'Admin', sheet: 5, adminOnly: true },
];

const BOOT_LINES = [
    'Truth.OS BIOS · firmware OK',
    'mounting soul_fs…',
    'loading icon atlas…',
    'network · encrypted channel',
    'desktop session ready',
];

/** 2×3 atlas → CSS background position (percent) */
function OsIcon({ index, size = 48, className = '' }: { index: number; size?: number; className?: string }) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = col === 0 ? 0 : col === 1 ? 50 : 100;
    const y = row === 0 ? 0 : 100;
    return (
        <span
            className={`block rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 ${className}`}
            style={{
                width: size,
                height: size,
                backgroundImage: 'url(/truthos/os-icons.jpg)',
                backgroundSize: '300% 200%',
                backgroundPosition: `${x}% ${y}%`,
                backgroundRepeat: 'no-repeat',
            }}
            aria-hidden
        />
    );
}

export default function TruthOSShell({
    onLogout,
}: {
    onLogout: () => void;
    mode?: 'desktop' | 'phone';
}) {
    const {
        windows,
        focusId,
        bootDone,
        startOpen,
        openApp,
        closeWindow,
        focusWindow,
        moveWindow,
        minimizeWindow,
        toggleMaximize,
        setBootDone,
        setStartOpen,
        closeToRoom,
        enterOs,
    } = useTruthOs();
    const [bootLine, setBootLine] = useState(0);
    const [clock, setClock] = useState('');
    const [email, setEmail] = useState<string | null>(null);
    const isAdmin = isAdminEmail(email);

    useEffect(() => {
        enterOs();
        hubAudio.osBootStart();
        let i = 0;
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
                }, 180);
            }
        }, 130);
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
        supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    }, []);

    const visibleApps = APPS.filter((a) => !a.adminOnly || isAdmin);
    const openWindows = windows.filter((w) => !w.minimized);

    if (!bootDone) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050508] font-mono text-sm text-[#5dff6a]">
                <div className="w-full max-w-md px-6 space-y-2">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-black text-black shadow-[0_0_24px_rgba(52,211,153,0.45)]">
                            T
                        </span>
                        <div>
                            <p className="text-[10px] tracking-[0.4em] text-[#2d6b35]">TRUTH.OS</p>
                            <p className="text-[11px] text-emerald-400/50">v1.4 · house desktop</p>
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
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden select-none bg-[#0a0c12]">
            {/* Wallpaper image + soft overlays */}
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/truthos/os-wallpaper.jpg)' }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            {/* Menu bar */}
            <header className="relative z-40 h-9 shrink-0 flex items-center justify-between px-3 border-b border-white/10 bg-black/60 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => {
                            const next = !startOpen;
                            setStartOpen(next);
                            if (next) hubAudio.osStartMenu();
                            else sacredUi.click();
                        }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/10"
                    >
                        <span className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[9px] font-black text-black">
                            T
                        </span>
                        <span className="text-[12px] font-semibold text-white/90">Truth.OS</span>
                    </button>
                    <span className="hidden sm:inline text-[10px] text-white/30 font-mono truncate">
                        {email || 'session'}
                        {isAdmin && <span className="ml-2 text-rose-400">· ADMIN</span>}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-white/50">
                    <span className="hidden md:inline text-white/25">soul_fs · secure</span>
                    <span className="hidden sm:inline">{clock}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" title="Online" />
                </div>
            </header>

            {/* Desktop */}
            <div className="relative flex-1 min-h-0" onClick={() => setStartOpen(false)}>
                {/* Desktop icons — icon sheet */}
                <div className="absolute top-4 left-3 sm:left-5 grid grid-cols-1 sm:grid-cols-1 gap-5 z-[1]">
                    {visibleApps.map((d) => (
                        <button
                            key={d.app}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openApp(d.app);
                                hubAudio.osWindowOpen();
                                sacredUi.click();
                            }}
                            className="w-[80px] flex flex-col items-center gap-1.5 group touch-manipulation"
                        >
                            <span
                                className={`relative transition-transform group-hover:scale-105 group-active:scale-95 ${
                                    d.adminOnly ? 'ring-2 ring-rose-400/40 rounded-2xl' : ''
                                }`}
                            >
                                <OsIcon index={d.sheet} size={52} />
                                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/5" />
                            </span>
                            <span className="text-[11px] text-white/85 group-hover:text-white text-center leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] px-1 rounded bg-black/25">
                                {d.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Welcome card */}
                <div className="absolute bottom-4 right-3 sm:right-5 z-[1] max-w-[220px] rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md px-3.5 py-3 pointer-events-none hidden sm:block">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-emerald-400/70 font-mono">Desktop</p>
                    <p className="text-[12px] text-white/75 mt-1 leading-snug">
                        Open Truth, Files, or Account. Walk the house for stations.
                    </p>
                </div>

                {/* Windows */}
                <AnimatePresence>
                    {openWindows.map((w) => (
                        <OsWindowFrame
                            key={w.id}
                            title={w.title}
                            app={w.app}
                            sheet={APPS.find((a) => a.app === w.app)?.sheet ?? 0}
                            x={w.x}
                            y={w.y}
                            w={w.w}
                            h={w.h}
                            z={w.z}
                            maximized={!!w.maximized}
                            focused={focusId === w.id}
                            onFocus={() => focusWindow(w.id)}
                            onClose={() => closeWindow(w.id)}
                            onMinimize={() => minimizeWindow(w.id)}
                            onMaximize={() => toggleMaximize(w.id)}
                            onMove={(x, y) => moveWindow(w.id, x, y)}
                        >
                            {renderOsApp(w.app, {
                                onLogout,
                                onExit: () => closeToRoom(),
                            })}
                        </OsWindowFrame>
                    ))}
                </AnimatePresence>

                {/* Start menu */}
                {startOpen && (
                    <div
                        className="absolute bottom-2 left-2 sm:left-3 z-50 w-[min(100%-1rem,320px)] rounded-2xl border border-white/12 bg-[#12151c]/92 backdrop-blur-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                            <OsIcon index={3} size={36} />
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-mono">Start</p>
                                <p className="text-sm text-white font-medium mt-0.5 truncate">
                                    {email || 'Truth.OS user'}
                                </p>
                            </div>
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-1">
                            {visibleApps.map((d) => (
                                <button
                                    key={d.app}
                                    type="button"
                                    onClick={() => {
                                        openApp(d.app);
                                        hubAudio.osWindowOpen();
                                        sacredUi.click();
                                    }}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/8 text-left"
                                >
                                    <OsIcon index={d.sheet} size={32} className="!rounded-xl shrink-0" />
                                    <span className="text-[12px] text-white/80">{d.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/10 space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    closeToRoom();
                                    hubAudio.osExitToHouse();
                                    sacredUi.click();
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-white/60 hover:bg-white/8"
                            >
                                Sleep · return to house
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onLogout();
                                    sacredUi.click();
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-red-300/80 hover:bg-red-500/10"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Taskbar */}
            <footer className="relative z-40 h-12 shrink-0 flex items-center gap-1 px-2 border-t border-white/10 bg-black/75 backdrop-blur-xl">
                <button
                    type="button"
                    onClick={() => {
                        const next = !startOpen;
                        setStartOpen(next);
                        if (next) hubAudio.osStartMenu();
                        else sacredUi.click();
                    }}
                    className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                        startOpen ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                >
                    <span className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 text-[10px] font-black text-black flex items-center justify-center">
                        T
                    </span>
                    Start
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0">
                    {windows.map((w) => {
                        const sheet = APPS.find((a) => a.app === w.app)?.sheet ?? 0;
                        return (
                            <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                    if (w.minimized || focusId !== w.id) focusWindow(w.id);
                                    else minimizeWindow(w.id);
                                    sacredUi.click();
                                }}
                                className={`h-9 pl-1.5 pr-3 rounded-lg text-[11px] truncate max-w-[160px] border transition-colors flex items-center gap-1.5 ${
                                    focusId === w.id && !w.minimized
                                        ? 'bg-white/12 border-white/15 text-white'
                                        : 'border-transparent text-white/50 hover:bg-white/8'
                                }`}
                            >
                                <OsIcon index={sheet} size={22} className="!rounded-md shrink-0" />
                                <span className="truncate">{w.title}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="hidden sm:flex items-center gap-2 px-2 text-[10px] font-mono text-white/40 shrink-0">
                    <span>{clock.split(' · ')[0]}</span>
                </div>
            </footer>
        </div>
    );
}

function OsWindowFrame({
    title,
    app,
    sheet,
    x,
    y,
    w,
    h,
    z,
    maximized,
    focused,
    children,
    onFocus,
    onClose,
    onMinimize,
    onMaximize,
    onMove,
}: {
    title: string;
    app: OsAppId;
    sheet: number;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    maximized: boolean;
    focused: boolean;
    children: React.ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onMove: (x: number, y: number) => void;
}) {
    const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
    const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
    const accent = app === 'admin' ? 'border-rose-500/40' : focused ? 'border-emerald-500/35' : 'border-white/12';

    return (
        <div
            className={`absolute flex flex-col overflow-hidden border shadow-2xl ${
                narrow || maximized ? 'rounded-none sm:rounded-xl' : 'rounded-xl'
            } ${accent} ${focused ? 'shadow-black/50' : 'opacity-95'}`}
            style={
                narrow || maximized
                    ? {
                          inset: narrow ? 8 : 8,
                          bottom: narrow ? 56 : 56,
                          zIndex: z,
                          background: '#0e1016',
                      }
                    : {
                          left: x,
                          top: y,
                          width: Math.min(w, typeof window !== 'undefined' ? window.innerWidth - 24 : w),
                          height: Math.min(h, typeof window !== 'undefined' ? window.innerHeight - 100 : h),
                          zIndex: z,
                          background: '#0e1016',
                      }
            }
            onMouseDown={onFocus}
        >
            <div
                className="h-10 shrink-0 flex items-center gap-2 px-2 bg-[#161a22] border-b border-white/8 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(e) => {
                    if (narrow || maximized) return;
                    if ((e.target as HTMLElement).closest('button')) return;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    drag.current = { ox: e.clientX, oy: e.clientY, sx: x, sy: y };
                    onFocus();
                }}
                onPointerMove={(e) => {
                    if (!drag.current) return;
                    onMove(
                        drag.current.sx + (e.clientX - drag.current.ox),
                        drag.current.sy + (e.clientY - drag.current.oy),
                    );
                }}
                onPointerUp={() => {
                    drag.current = null;
                }}
                onDoubleClick={() => onMaximize()}
            >
                <div className="flex items-center gap-1.5 pl-1">
                    <button
                        type="button"
                        aria-label="Close"
                        className="w-3 h-3 rounded-full bg-red-500/85 hover:bg-red-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            hubAudio.osWindowClose();
                            onClose();
                        }}
                    />
                    <button
                        type="button"
                        aria-label="Minimize"
                        className="w-3 h-3 rounded-full bg-amber-500/70 hover:bg-amber-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            hubAudio.playSfx('os_window_close', { volume: 0.22 });
                            onMinimize();
                        }}
                    />
                    <button
                        type="button"
                        aria-label="Maximize"
                        className="w-3 h-3 rounded-full bg-emerald-500/70 hover:bg-emerald-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMaximize();
                        }}
                    />
                </div>
                <OsIcon index={sheet} size={18} className="!rounded-md ml-1 shrink-0" />
                <span className="ml-1.5 text-[12px] text-white/70 truncate flex-1 font-medium">{title}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}
