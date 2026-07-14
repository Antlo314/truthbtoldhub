'use client';

/**
 * Unified Truth.OS shell — one responsive layout (no PC/phone fork).
 * Dock: Truth · Updates · Account · Settings only.
 * House stations live on objects in the 3D house, not here.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTruthOs, type OsAppId } from './truthOsStore';
import { renderOsApp } from './apps/OsApps';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const DOCK: { app: OsAppId; label: string; glyph: string }[] = [
    { app: 'truth', label: 'Truth', glyph: '::' },
    { app: 'updates', label: 'Updates', glyph: '※' },
    { app: 'account', label: 'Account', glyph: '◎' },
    { app: 'settings', label: 'Sys', glyph: '⚙' },
];

const BOOT_LINES = [
    'POST · memory check…',
    'loading identity_module…',
    'mounting soul_fs…',
    'presence · live filter on',
    'Truth.OS · wake up.',
];

export default function TruthOSShell({
    onLogout,
    /** @deprecated ignored — single unified shell */
    mode: _mode,
}: {
    onLogout: () => void;
    mode?: 'desktop' | 'phone';
}) {
    const {
        windows,
        focusId,
        bootDone,
        openApp,
        closeWindow,
        focusWindow,
        moveWindow,
        setBootDone,
        closeToRoom,
        enterOs,
    } = useTruthOs();
    const [bootLine, setBootLine] = useState(0);

    useEffect(() => {
        enterOs();
        let i = 0;
        const t = setInterval(() => {
            i += 1;
            setBootLine(i);
            if (i >= BOOT_LINES.length) {
                clearInterval(t);
                setTimeout(() => {
                    setBootDone(true);
                    sacredUi.access();
                }, 200);
            }
        }, 160);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!bootDone) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black font-mono text-sm text-[#5dff6a]">
                <div className="w-full max-w-md px-6 space-y-2">
                    <p className="text-[10px] tracking-[0.4em] text-[#2d6b35] mb-4">BOOT</p>
                    {BOOT_LINES.slice(0, bootLine).map((m, i) => (
                        <p key={i} className={i === bootLine - 1 ? 'animate-pulse' : ''}>
                            {m}
                        </p>
                    ))}
                    <p className="text-[#2d6b35] mt-6">_</p>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-br from-[#0c0e14] via-[#0a1018] to-[#08060c]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'linear-gradient(#5dff6a 1px, transparent 1px), linear-gradient(90deg, #5dff6a 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
            </div>

            <header className="relative z-10 flex items-center justify-between h-10 px-3 border-b border-white/10 bg-black/70 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-white/90">Truth.OS</span>
                    <span className="text-[10px] text-emerald-400/70 font-mono">v1.0 · house</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                    <span className="hidden sm:inline">signed in · encrypted</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
            </header>

            <div className="relative flex-1 min-h-0">
                {/* Desktop icons */}
                <div className="absolute top-4 left-3 sm:left-4 flex flex-col gap-3 z-[1]">
                    {DOCK.map((d) => (
                        <button
                            key={d.app}
                            type="button"
                            onClick={() => {
                                openApp(d.app);
                                sacredUi.click();
                            }}
                            className="w-14 sm:w-16 flex flex-col items-center gap-1 group"
                        >
                            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400/90 group-hover:border-emerald-400/40 group-hover:bg-emerald-500/10 font-mono text-sm">
                                {d.glyph}
                            </span>
                            <span className="text-[10px] text-white/60 group-hover:text-white">{d.label}</span>
                        </button>
                    ))}
                </div>

                <p className="absolute bottom-20 left-4 right-4 sm:left-24 max-w-sm text-[11px] text-white/25 leading-relaxed pointer-events-none">
                    Hall, Arcade, Forge, Cinema, Library, and other stations live as objects in the house — walk to
                    them. This OS holds Truth, updates, and account data only.
                </p>

                <AnimatePresence>
                    {windows.map((w) => (
                        <OsWindowFrame
                            key={w.id}
                            title={w.title}
                            x={w.x}
                            y={w.y}
                            w={w.w}
                            h={w.h}
                            z={w.z}
                            focused={focusId === w.id}
                            onFocus={() => focusWindow(w.id)}
                            onClose={() => closeWindow(w.id)}
                            onMove={(x, y) => moveWindow(w.id, x, y)}
                        >
                            {renderOsApp(w.app, {
                                onLogout,
                                onExit: () => {
                                    closeToRoom();
                                },
                            })}
                        </OsWindowFrame>
                    ))}
                </AnimatePresence>
            </div>

            <footer className="relative z-30 h-14 flex items-center justify-center gap-1 px-4 pb-2">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-2xl">
                    {DOCK.map((d) => (
                        <button
                            key={d.app}
                            type="button"
                            title={d.label}
                            onClick={() => {
                                openApp(d.app);
                                sacredUi.click();
                            }}
                            className="w-10 h-10 rounded-xl text-emerald-400/90 hover:bg-white/10 font-mono text-xs transition-colors"
                        >
                            {d.glyph}
                        </button>
                    ))}
                </div>
            </footer>
        </div>
    );
}

function OsWindowFrame({
    title,
    x,
    y,
    w,
    h,
    z,
    focused,
    children,
    onFocus,
    onClose,
    onMove,
}: {
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    focused: boolean;
    children: React.ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMove: (x: number, y: number) => void;
}) {
    const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);

    // Responsive: full sheet on narrow viewports
    const narrow = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div
            className={`absolute flex flex-col overflow-hidden border shadow-2xl ${
                narrow ? 'inset-2 rounded-xl' : 'rounded-xl'
            } ${focused ? 'border-emerald-500/40 shadow-emerald-900/20' : 'border-white/10'}`}
            style={
                narrow
                    ? { zIndex: z, background: '#0c0c0e' }
                    : {
                          left: x,
                          top: y,
                          width: Math.min(w, typeof window !== 'undefined' ? window.innerWidth - 24 : w),
                          height: Math.min(h, typeof window !== 'undefined' ? window.innerHeight - 80 : h),
                          zIndex: z,
                          background: '#0c0c0e',
                      }
            }
            onMouseDown={onFocus}
        >
            <div
                className="h-9 shrink-0 flex items-center gap-2 px-3 bg-black/80 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(e) => {
                    if (narrow) return;
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
            >
                <button
                    type="button"
                    className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                />
                <button type="button" className="w-3 h-3 rounded-full bg-amber-500/50" tabIndex={-1} />
                <button type="button" className="w-3 h-3 rounded-full bg-emerald-500/50" tabIndex={-1} />
                <span className="ml-2 text-[11px] text-white/70 truncate flex-1 font-mono">{title}</span>
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}
