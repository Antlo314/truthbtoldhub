'use client';

/**
 * Shared functional game chrome — bezel, HUD strip, pause overlay shell.
 */
import type { ReactNode } from 'react';
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';

export function ArcadeGameShell({
    title,
    subtitle,
    accent,
    muted,
    status,
    onExit,
    onMute,
    onPause,
    hud,
    board,
    controls,
    children,
}: {
    title: string;
    subtitle?: string;
    accent: string;
    muted: boolean;
    status: 'playing' | 'paused' | 'over';
    onExit: () => void;
    onMute: () => void;
    onPause: () => void;
    hud: ReactNode;
    board: ReactNode;
    controls?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div
            className="absolute inset-0 z-[60] flex flex-col select-none"
            style={{
                background: `radial-gradient(100% 70% at 50% -5%, ${accent}22, transparent 55%), #06070c`,
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {/* Title bar */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <button
                    type="button"
                    onClick={onExit}
                    className="h-10 px-3 rounded-lg border border-white/12 bg-white/[0.04] text-zinc-200 hover:text-white flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
                    aria-label="Exit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Exit</span>
                </button>
                <div className="text-center min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.35em] text-white/35 font-mono">Arcade</p>
                    <p className="font-ritual text-xl tracking-[0.2em] leading-none truncate" style={{ color: accent }}>
                        {title}
                    </p>
                    {subtitle && <p className="text-[10px] text-white/40 mt-0.5 truncate">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onMute}
                        className="h-10 w-10 rounded-lg border border-white/12 bg-white/[0.04] text-zinc-200 flex items-center justify-center"
                        aria-label="Mute"
                    >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={onPause}
                        className="h-10 w-10 rounded-lg border border-white/12 bg-white/[0.04] text-zinc-200 flex items-center justify-center"
                        aria-label="Pause"
                        disabled={status === 'over'}
                    >
                        {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Stats HUD */}
            <div className="shrink-0 px-3 py-2 border-b border-white/5 bg-black/30">{hud}</div>

            {/* Playfield bezel */}
            <div className="flex-1 min-h-0 flex flex-col mx-auto w-full max-w-[480px] px-3 py-2">
                <div
                    className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_12px_40px_rgba(0,0,0,0.45)]"
                    style={{ borderColor: `${accent}55`, background: '#03040a' }}
                >
                    {/* CRT corner nubs */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                    {board}
                    {children}
                </div>
            </div>

            {controls}
        </div>
    );
}

export function StatPill({
    label,
    value,
    accent,
}: {
    label: string;
    value: string | number;
    accent?: string;
}) {
    return (
        <div className="flex-1 min-w-0 text-center px-1">
            <p className="text-[8px] font-mono uppercase tracking-[0.22em] text-white/40 leading-none">{label}</p>
            <p className="font-ritual text-lg leading-tight tabular-nums" style={{ color: accent || '#fff' }}>
                {value}
            </p>
        </div>
    );
}
