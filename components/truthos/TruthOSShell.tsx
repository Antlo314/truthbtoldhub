'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useTruthOs,
    type OsAppId,
} from './truthOsStore';
import { renderOsApp } from './apps/OsApps';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const DOCK: { app: OsAppId; label: string; glyph: string }[] = [
    { app: 'truth', label: 'Truth', glyph: '::' },
    { app: 'soul', label: 'Vessel', glyph: '◎' },
    { app: 'wayfinder', label: 'Roads', glyph: '◈' },
    { app: 'chamber', label: 'Chamber', glyph: '⬡' },
    { app: 'hall', label: 'Hall', glyph: '◎' },
    { app: 'codex', label: 'Codex', glyph: '§' },
    { app: 'cinema', label: 'Cinema', glyph: '▶' },
    { app: 'offering', label: 'Offer', glyph: '✦' },
    { app: 'settings', label: 'Sys', glyph: '⚙' },
];

export default function TruthOSShell({
    mode,
    onLogout,
}: {
    mode: 'desktop' | 'phone';
    onLogout: () => void;
}) {
    const {
        windows, focusId, bootDone, openApp, closeWindow, focusWindow,
        moveWindow, setBootDone, closeToRoom, enterOs,
    } = useTruthOs();
    const [bootLine, setBootLine] = useState(0);

    useEffect(() => {
        enterOs();
        const lines = 6;
        let i = 0;
        const t = setInterval(() => {
            i += 1;
            setBootLine(i);
            if (i >= lines) {
                clearInterval(t);
                setTimeout(() => {
                    setBootDone(true);
                    // Truth is a guide widget in the house — OS opens empty home
                    // (user can open Truth.sys from dock if needed)
                    sacredUi.access();
                }, 400);
            }
        }, 280);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bootMessages = [
        'POST · memory check…',
        'loading identity_module…',
        'mounting soul_fs…',
        'network · encrypted channel…',
        'TRUTH.OS 0.9.1',
        'wake up.',
    ];

    if (!bootDone) {
        return (
            <div
                className={`absolute inset-0 z-50 flex items-center justify-center bg-black font-mono text-[#5dff6a] ${
                    mode === 'phone' ? 'text-xs' : 'text-sm'
                }`}
            >
                <div className="w-full max-w-md px-6 space-y-2">
                    <p className="text-[10px] tracking-[0.4em] text-[#2d6b35] mb-4">BOOT</p>
                    {bootMessages.slice(0, bootLine).map((m, i) => (
                        <p key={i} className={i === bootLine - 1 ? 'animate-pulse' : ''}>
                            {m}
                        </p>
                    ))}
                    <p className="text-[#2d6b35] mt-6">_</p>
                </div>
            </div>
        );
    }

    const isPhone = mode === 'phone';

    return (
        <div
            className={`absolute inset-0 z-50 flex flex-col overflow-hidden ${
                isPhone
                    ? 'bg-[#0a0a0c]'
                    : 'bg-gradient-to-br from-[#0c0e14] via-[#0a1018] to-[#08060c]'
            }`}
        >
            {/* Desktop wallpaper signal */}
            {!isPhone && (
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
            )}

            {/* Menu bar */}
            <header
                className={`relative z-10 flex items-center justify-between px-3 border-b ${
                    isPhone
                        ? 'h-11 bg-black/90 border-white/10'
                        : 'h-9 bg-black/70 border-white/10 backdrop-blur-md'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-white/90">Truth.OS</span>
                    <span className="text-[10px] text-emerald-400/70 font-mono hidden sm:inline">v0.9.1</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                    <span className="hidden sm:inline">encrypted</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
            </header>

            {/* Workspace */}
            <div className="relative flex-1 min-h-0">
                {/* Desktop icons (desktop only) */}
                {!isPhone && (
                    <div className="absolute top-4 left-4 flex flex-col gap-3 z-[1]">
                        {DOCK.slice(0, 5).map((d) => (
                            <button
                                key={d.app}
                                type="button"
                                onClick={() => {
                                    openApp(d.app);
                                    sacredUi.click();
                                }}
                                className="w-16 flex flex-col items-center gap-1 group"
                            >
                                <span className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400/90 group-hover:border-emerald-400/40 group-hover:bg-emerald-500/10 font-mono text-sm">
                                    {d.glyph}
                                </span>
                                <span className="text-[10px] text-white/60 group-hover:text-white">{d.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Windows — stacked on phone as full sheets */}
                <AnimatePresence>
                    {windows.map((w) =>
                        isPhone ? (
                            <div
                                key={w.id}
                                className="absolute inset-0 flex flex-col bg-[#0c0c0e]"
                                style={{ zIndex: w.z }}
                            >
                                <div className="h-12 flex items-center justify-between px-3 border-b border-white/10 bg-black/80">
                                    <button
                                        type="button"
                                        className="text-xs text-emerald-400"
                                        onClick={() => closeWindow(w.id)}
                                    >
                                        Home
                                    </button>
                                    <span className="text-xs text-white/80 truncate max-w-[50%]">{w.title}</span>
                                    <span className="w-10" />
                                </div>
                                <div className="flex-1 min-h-0">
                                    {renderOsApp(w.app, {
                                        onLogout,
                                        onExit: closeToRoom,
                                    })}
                                </div>
                            </div>
                        ) : (
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
                                    onExit: closeToRoom,
                                })}
                            </OsWindowFrame>
                        ),
                    )}
                </AnimatePresence>

                {/* Phone home grid */}
                {isPhone && windows.length === 0 && (
                    <div className="absolute inset-0 p-4 pt-6 grid grid-cols-3 gap-4 content-start">
                        {DOCK.map((d) => (
                            <button
                                key={d.app}
                                type="button"
                                onClick={() => {
                                    openApp(d.app);
                                    sacredUi.click();
                                }}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-mono">
                                    {d.glyph}
                                </span>
                                <span className="text-[11px] text-white/70">{d.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Dock desktop */}
            {!isPhone && (
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
            )}
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

    return (
        <div
            className={`absolute flex flex-col rounded-xl overflow-hidden border shadow-2xl ${
                focused ? 'border-emerald-500/40 shadow-emerald-900/20' : 'border-white/10'
            }`}
            style={{
                left: x,
                top: y,
                width: w,
                height: h,
                zIndex: z,
                background: '#0c0c0e',
            }}
            onMouseDown={onFocus}
        >
            <div
                className="h-9 shrink-0 flex items-center gap-2 px-3 bg-black/80 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(e) => {
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
