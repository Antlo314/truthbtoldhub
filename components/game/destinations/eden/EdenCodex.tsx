'use client';

// ============================================================
//  EDEN CODEX — the "game within itself" dashboard.
//
//  A full-screen modal that lets the wanderer read the whole
//  garden back to themselves: overall progress, the four rivers,
//  the bestiary, the harvest, and the Serpent's long arc.
//
//  Purely presentational. Every number is read from the codex
//  summary (edenCodex) — nothing is re-derived from discovered[].
// ============================================================

import type { GameCharacter } from '@/lib/store/useGameStore';
import type { EdenLevelState } from '@/lib/game/edenLevel';
import { edenCodex } from '@/lib/game/eden/codex';
import type { EdenCodexLine } from '@/lib/game/eden/types';
import {
    X, Sparkles, Leaf, Droplets, PawPrint, Apple, Shield, Flame, ShieldCheck,
} from 'lucide-react';

interface Props {
    character: GameCharacter;
    level: EdenLevelState;
    onClose: () => void;
    accent?: string;
}

const TINY = { fontSize: 'clamp(7px,2vw,9px)', letterSpacing: '0.08em' } as const;
const MICRO = { fontSize: 'clamp(6px,1.7vw,8px)', letterSpacing: '0.1em' } as const;

/** Hex (#rgb / #rrggbb) -> rgba() with the given alpha. */
function withAlpha(hex: string, a: number): string {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function pct(done: number, total: number): number {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, done / total));
}

// ------------------------------------------------------------
//  Tiny pieces
// ------------------------------------------------------------

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 px-0.5 text-emerald-200/80 uppercase" style={TINY}>
            <span className="text-emerald-300/90">{icon}</span>
            <span className="font-semibold">{children}</span>
        </div>
    );
}

function MiniBar({ line }: { line: EdenCodexLine }) {
    const p = pct(line.done, line.total);
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 uppercase" style={MICRO}>
                <span className="text-white/70 truncate">{line.label}</span>
                <span className="tabular-nums shrink-0" style={{ color: line.color }}>
                    {line.done}/{line.total}
                </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${p * 100}%`,
                        backgroundColor: line.color,
                        boxShadow: p > 0 ? `0 0 6px ${withAlpha(line.color, 0.7)}` : undefined,
                    }}
                />
            </div>
        </div>
    );
}

function ProgressRing({ p, accent }: { p: number; accent: string }) {
    const R = 26;
    const C = 2 * Math.PI * R;
    return (
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
            <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle
                    cx="32" cy="32" r={R} fill="none" stroke={accent} strokeWidth="5"
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)}
                    style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 4px ${withAlpha(accent, 0.8)})` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold tabular-nums text-white" style={{ fontSize: 'clamp(12px,4vw,15px)' }}>
                    {Math.round(p * 100)}%
                </span>
            </div>
        </div>
    );
}

// ------------------------------------------------------------
//  Component
// ------------------------------------------------------------

export default function EdenCodex({ character, level, onClose, accent = '#34d399' }: Props) {
    const summary = edenCodex(character, level);
    const overall = pct(summary.overall.done, summary.overall.total);

    const namedCount = summary.creatures.filter((c) => c.named).length;
    const harvestedCount = summary.fruits.filter((f) => f.harvested).length;

    return (
        <div
            className="absolute inset-0 z-[60] flex flex-col bg-black/80 backdrop-blur-md"
            style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
            role="dialog"
            aria-modal="true"
        >
            {/* Header */}
            <div className="glass-panel relative z-10 border-b border-emerald-500/20 bg-black/50 px-3 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <ProgressRing p={overall} accent={accent} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-emerald-300/90">
                            <Sparkles size={11} />
                            <h2
                                className="truncate font-semibold uppercase text-white"
                                style={{ fontSize: 'clamp(11px,3.4vw,14px)', letterSpacing: '0.1em' }}
                            >
                                The Garden Remembers
                            </h2>
                        </div>
                        <p className="mt-0.5 truncate text-white/55 uppercase" style={MICRO}>
                            {summary.overall.done} / {summary.overall.total} threads of Eden gathered
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 active:bg-white/15"
                    >
                        <X size={16} />
                    </button>
                </div>
                {/* overall bar */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${overall * 100}%`, backgroundColor: accent, boxShadow: `0 0 8px ${withAlpha(accent, 0.7)}` }}
                    />
                </div>
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" style={{ scrollbarWidth: 'thin' }}>
                <div className="mx-auto flex max-w-md flex-col gap-4">

                    {/* 1. Progress lines */}
                    <section className="glass-panel rounded-xl border border-emerald-500/20 bg-black/40 p-3 backdrop-blur-sm">
                        <SectionLabel icon={<Sparkles size={10} />}>The Reckoning</SectionLabel>
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5">
                            {summary.lines.map((line) => (
                                <MiniBar key={line.label} line={line} />
                            ))}
                        </div>
                    </section>

                    {/* 2. The Four Rivers */}
                    <section className="glass-panel rounded-xl border border-emerald-500/20 bg-black/40 p-3 backdrop-blur-sm">
                        <SectionLabel icon={<Droplets size={10} />}>The Four Rivers</SectionLabel>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                            {summary.rivers.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all"
                                    style={{
                                        borderColor: r.lit ? withAlpha(r.color, 0.5) : 'rgba(255,255,255,0.08)',
                                        backgroundColor: r.lit ? withAlpha(r.color, 0.1) : 'rgba(255,255,255,0.02)',
                                        boxShadow: r.lit ? `0 0 12px ${withAlpha(r.color, 0.25)}` : undefined,
                                    }}
                                >
                                    <span
                                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                                        style={{
                                            backgroundColor: r.lit ? withAlpha(r.color, 0.25) : 'rgba(255,255,255,0.04)',
                                            boxShadow: r.lit ? `0 0 8px ${withAlpha(r.color, 0.8)}` : undefined,
                                        }}
                                    >
                                        <Droplets size={11} style={{ color: r.lit ? r.color : 'rgba(255,255,255,0.3)' }} />
                                    </span>
                                    <div className="min-w-0">
                                        <div
                                            className="truncate font-semibold uppercase"
                                            style={{ ...MICRO, color: r.lit ? r.color : 'rgba(255,255,255,0.4)' }}
                                        >
                                            {r.name}
                                        </div>
                                        <div className="text-white/40 uppercase" style={{ fontSize: 'clamp(5px,1.5vw,7px)', letterSpacing: '0.1em' }}>
                                            {r.lit ? 'Attuned' : 'Dark'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. The Bestiary */}
                    <section className="glass-panel rounded-xl border border-emerald-500/20 bg-black/40 p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <SectionLabel icon={<PawPrint size={10} />}>The Bestiary</SectionLabel>
                            <span className="tabular-nums text-amber-300/90 uppercase" style={MICRO}>
                                {namedCount} / {summary.creatures.length} named
                            </span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-4">
                            {summary.creatures.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-all"
                                    style={{
                                        borderColor: c.named ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.06)',
                                        backgroundColor: c.named ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.015)',
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        style={{
                                            fontSize: 'clamp(16px,5vw,20px)',
                                            lineHeight: 1,
                                            filter: c.named ? 'none' : 'grayscale(1)',
                                            opacity: c.named ? 1 : 0.22,
                                        }}
                                    >
                                        {c.glyph}
                                    </span>
                                    <span
                                        className="w-full truncate uppercase"
                                        style={{
                                            ...MICRO,
                                            color: c.named ? '#fde68a' : 'rgba(255,255,255,0.3)',
                                            letterSpacing: c.named ? '0.05em' : '0.18em',
                                        }}
                                    >
                                        {c.named ? c.name : '? ? ?'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. The Garden (fruits) */}
                    <section className="glass-panel rounded-xl border border-emerald-500/20 bg-black/40 p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <SectionLabel icon={<Apple size={10} />}>The Garden</SectionLabel>
                            <span className="tabular-nums text-lime-300/90 uppercase" style={MICRO}>
                                {harvestedCount} / {summary.fruits.length} gathered
                            </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                            {summary.fruits.map((f) => (
                                <div
                                    key={f.id}
                                    className="flex flex-1 basis-[28%] flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all"
                                    style={{
                                        borderColor: f.harvested ? 'rgba(163,230,53,0.4)' : 'rgba(255,255,255,0.06)',
                                        backgroundColor: f.harvested ? 'rgba(163,230,53,0.09)' : 'rgba(255,255,255,0.015)',
                                        boxShadow: f.harvested ? '0 0 10px rgba(163,230,53,0.2)' : undefined,
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        style={{
                                            fontSize: 'clamp(15px,4.6vw,19px)',
                                            lineHeight: 1,
                                            filter: f.harvested ? 'none' : 'grayscale(1)',
                                            opacity: f.harvested ? 1 : 0.22,
                                        }}
                                    >
                                        {f.glyph}
                                    </span>
                                    <span
                                        className="w-full truncate uppercase"
                                        style={{ ...MICRO, color: f.harvested ? '#d9f99d' : 'rgba(255,255,255,0.3)' }}
                                    >
                                        {f.harvested ? f.name : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5. The Serpent */}
                    <section className="glass-panel rounded-xl border border-red-500/20 bg-black/40 p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <SectionLabel icon={<Flame size={10} />}>The Serpent</SectionLabel>
                            {summary.untempted && (
                                <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300 uppercase" style={MICRO}>
                                    <ShieldCheck size={9} /> Untempted
                                </span>
                            )}
                        </div>
                        <div className="mt-2.5 flex flex-col gap-1.5">
                            {summary.serpent.map((b, i) => {
                                const resolved = b.choice !== null;
                                const resisted = b.choice === 'resisted';
                                const color = !resolved
                                    ? 'rgba(255,255,255,0.25)'
                                    : resisted ? '#34d399' : '#ef4444';
                                const verb = !resolved ? 'unheard' : resisted ? 'resisted' : 'listened';
                                return (
                                    <div
                                        key={b.id}
                                        className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                                        style={{
                                            borderColor: b.climax
                                                ? withAlpha(resolved ? color : '#ef4444', 0.4)
                                                : resolved ? withAlpha(color, 0.3) : 'rgba(255,255,255,0.06)',
                                            backgroundColor: resolved ? withAlpha(color, 0.07) : 'rgba(255,255,255,0.015)',
                                        }}
                                    >
                                        <span
                                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                                            style={{ backgroundColor: withAlpha(color, 0.18) }}
                                        >
                                            {resolved
                                                ? (resisted ? <Shield size={10} style={{ color }} /> : <Flame size={10} style={{ color }} />)
                                                : <span className="text-white/30" style={MICRO}>{i + 1}</span>}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="truncate font-semibold uppercase"
                                                    style={{ ...MICRO, color: resolved ? color : 'rgba(255,255,255,0.4)' }}
                                                >
                                                    {b.climax ? 'The Tree of Knowledge' : `The ${ordinal(i + 1)} Whisper`}
                                                </span>
                                                {b.climax && (
                                                    <span className="rounded-sm bg-white/10 px-1 text-white/50 uppercase" style={{ fontSize: 'clamp(5px,1.4vw,6px)', letterSpacing: '0.12em' }}>
                                                        climax
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="shrink-0 uppercase" style={{ ...MICRO, color: resolved ? color : 'rgba(255,255,255,0.3)' }}>
                                            {verb}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* climax outcome */}
                        {summary.knowledgeOutcome !== 'none' && (
                            <div
                                className="mt-2.5 flex items-center gap-2 rounded-lg border px-3 py-2"
                                style={{
                                    borderColor: summary.knowledgeOutcome === 'refused' ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)',
                                    backgroundColor: summary.knowledgeOutcome === 'refused' ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                                }}
                            >
                                <Leaf size={13} style={{ color: summary.knowledgeOutcome === 'refused' ? '#34d399' : '#ef4444' }} />
                                <div className="min-w-0">
                                    <div className="font-semibold uppercase" style={{ ...MICRO, color: summary.knowledgeOutcome === 'refused' ? '#6ee7b7' : '#fca5a5' }}>
                                        {summary.knowledgeOutcome === 'refused' ? 'The Untempted' : 'The Long Way Home'}
                                    </div>
                                    <div className="text-white/45 uppercase" style={{ fontSize: 'clamp(5px,1.5vw,7px)', letterSpacing: '0.08em' }}>
                                        {summary.knowledgeOutcome === 'refused'
                                            ? 'You turned from the tree — the road kept whole.'
                                            : 'You tasted, and walk home eyes open.'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* relic footnote */}
                    {summary.relicClaimed && (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-3 py-2.5 text-emerald-200 uppercase" style={TINY}>
                            <Leaf size={12} className="text-emerald-300" />
                            <span className="font-semibold">The Leaf of Life is yours</span>
                        </div>
                    )}

                    <div style={{ height: 8 }} />
                </div>
            </div>
        </div>
    );
}

function ordinal(n: number): string {
    return ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'][n - 1] ?? `${n}th`;
}
