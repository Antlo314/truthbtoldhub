'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sprout, X, Check } from 'lucide-react';
import {
    EDEN_SEEDS,
    seedById,
    growthStage,
    growthProgress,
} from '@/lib/game/eden/cultivation';
import type { EdenBed, EdenBedRuntime, EdenSeed } from '@/lib/game/eden/types';

interface Props {
    bed: EdenBed;
    runtime: EdenBedRuntime;
    onPlant: (seedId: string) => void;
    onHarvest: (seed: EdenSeed) => void;
    onClose: () => void;
    accent?: string;
}

/** Compact "heals N · +regen/dmg/hp · Mf" line for a seed's fruit. */
function fruitSummary(seed: EdenSeed): string {
    const f = seed.fruit;
    const parts: string[] = [];
    if (f.heal) parts.push(`heal ${f.heal}`);
    if (f.buff) {
        const b = f.buff;
        if (b.hp) parts.push(`+${b.hp} hp`);
        if (b.damage) parts.push(`+${b.damage} dmg`);
        if (b.regen) parts.push(`+${b.regen} regen`);
        parts.push(`${b.fights}f`);
    }
    return parts.join(' · ') || '—';
}

function fmtCountdown(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${s}s`;
}

export default function TendPanel({
    bed,
    runtime,
    onPlant,
    onHarvest,
    onClose,
    accent = '#34d399',
}: Props) {
    const planted = useMemo(
        () => (runtime.seedId ? seedById(runtime.seedId) : undefined),
        [runtime.seedId],
    );

    // Live ticking clock so growth animates while planted.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!planted) return;
        const id = setInterval(() => setNow(Date.now()), 400);
        return () => clearInterval(id);
    }, [planted]);

    const labelStyle: React.CSSProperties = {
        fontSize: 'clamp(7px,2vw,9px)',
        letterSpacing: '0.18em',
    };
    const microStyle: React.CSSProperties = {
        fontSize: 'clamp(7px,1.9vw,9px)',
        letterSpacing: '0.04em',
    };

    // ---- planted view ------------------------------------------------
    let body: React.ReactNode;
    let heading: string;

    if (planted) {
        const elapsed = now - runtime.plantedAt;
        const stage = growthStage(planted, elapsed);
        const progress = growthProgress(planted, elapsed);
        const remainMs = planted.growSeconds * 1000 - elapsed;
        const ripe = stage === 'ripe';

        const stageGlyph =
            stage === 'sprout' ? '🌱' : stage === 'growing' ? planted.glyph : planted.fruit.glyph;
        const stageLabel =
            stage === 'sprout' ? 'Sprouting' : stage === 'growing' ? 'Growing' : 'Ripe';

        heading = planted.name;
        body = (
            <div className="flex flex-col items-center gap-3">
                <div
                    className="flex items-center justify-center rounded-full border bg-black/40"
                    style={{
                        width: 84,
                        height: 84,
                        borderColor: `${accent}55`,
                        boxShadow: ripe ? `0 0 22px ${accent}66` : `0 0 12px ${accent}22`,
                        transition: 'box-shadow 600ms ease',
                    }}
                >
                    <span
                        style={{
                            fontSize: 'clamp(30px,11vw,44px)',
                            lineHeight: 1,
                            transform: `scale(${0.7 + progress * 0.35})`,
                            transition: 'transform 500ms ease',
                            filter: ripe ? `drop-shadow(0 0 8px ${accent})` : 'none',
                        }}
                    >
                        {stageGlyph}
                    </span>
                </div>

                <div className="flex items-center gap-2 uppercase text-emerald-300/80" style={labelStyle}>
                    <Sprout size={11} strokeWidth={2.4} style={{ color: accent }} />
                    {stageLabel}
                </div>

                {/* progress bar */}
                <div className="w-full overflow-hidden rounded-full bg-emerald-950/60" style={{ height: 7 }}>
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${Math.round(progress * 100)}%`,
                            background: `linear-gradient(90deg, ${accent}, #fbbf24)`,
                            transition: 'width 500ms linear',
                        }}
                    />
                </div>

                <div className="text-center text-emerald-200/60" style={microStyle}>
                    {ripe ? 'Ready to gather.' : `ripens in ${fmtCountdown(remainMs)}`}
                </div>

                <p
                    className="text-center italic text-emerald-100/60"
                    style={{ ...microStyle, lineHeight: 1.5 }}
                >
                    “{planted.fruit.line}”
                </p>

                <button
                    type="button"
                    disabled={!ripe}
                    onClick={() => {
                        if (!ripe) return;
                        onHarvest(planted);
                        onClose();
                    }}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border font-semibold uppercase transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                        minHeight: 40,
                        ...labelStyle,
                        borderColor: ripe ? `${accent}` : 'rgba(52,211,153,0.2)',
                        color: ripe ? '#052e1b' : 'rgba(167,243,208,0.7)',
                        background: ripe
                            ? `linear-gradient(135deg, ${accent}, #fbbf24)`
                            : 'rgba(0,0,0,0.35)',
                        boxShadow: ripe ? `0 0 16px ${accent}55` : 'none',
                    }}
                >
                    {ripe ? <Check size={13} strokeWidth={2.6} /> : <Sprout size={13} strokeWidth={2.4} />}
                    {ripe ? 'Harvest' : 'Still growing…'}
                </button>
            </div>
        );
    } else {
        // ---- empty bed: seed picker ----------------------------------
        heading = 'Sow this bed';
        body = (
            <div className="grid grid-cols-1 gap-2">
                {EDEN_SEEDS.map((seed) => (
                    <button
                        key={seed.id}
                        type="button"
                        onClick={() => {
                            onPlant(seed.id);
                            onClose();
                        }}
                        className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-black/40 px-3 py-2.5 text-left backdrop-blur-sm transition active:scale-[0.98] hover:border-emerald-400/45 hover:bg-emerald-950/30"
                        style={{ minHeight: 44 }}
                    >
                        <span
                            className="flex shrink-0 items-center justify-center rounded-lg bg-emerald-900/40"
                            style={{ width: 36, height: 36, fontSize: 'clamp(16px,5vw,20px)' }}
                        >
                            {seed.glyph}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span
                                className="block truncate font-semibold text-emerald-100"
                                style={{ fontSize: 'clamp(9px,2.6vw,11px)', letterSpacing: '0.02em' }}
                            >
                                {seed.name}
                            </span>
                            <span
                                className="mt-0.5 flex items-center gap-1.5 text-emerald-300/70"
                                style={microStyle}
                            >
                                <span>{seed.fruit.glyph}</span>
                                <span>{fruitSummary(seed)}</span>
                            </span>
                        </span>
                        <span
                            className="shrink-0 uppercase text-amber-300/80"
                            style={labelStyle}
                        >
                            {seed.growSeconds}s
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div
            className="absolute inset-0 z-50 flex items-end justify-center sm:items-center"
            style={{
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {/* scrim */}
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            />

            <div
                className="glass-panel relative w-full max-w-sm animate-[edenrise_220ms_ease-out] rounded-t-2xl border border-emerald-500/20 bg-black/70 p-4 backdrop-blur-md sm:rounded-2xl"
                style={{ boxShadow: `0 -8px 40px ${accent}22` }}
            >
                <style>{`@keyframes edenrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

                {/* header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Sprout size={14} strokeWidth={2.4} style={{ color: accent }} />
                        <h2
                            className="uppercase text-emerald-100"
                            style={{ ...labelStyle, fontWeight: 700 }}
                        >
                            {heading}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center justify-center rounded-lg border border-emerald-500/20 bg-black/40 text-emerald-200/80 transition hover:border-emerald-400/40 hover:text-emerald-100"
                        style={{ width: 32, height: 32 }}
                    >
                        <X size={15} strokeWidth={2.4} />
                    </button>
                </div>

                {body}

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 w-full rounded-xl border border-emerald-500/15 bg-black/30 py-2 uppercase text-emerald-200/70 transition hover:border-emerald-400/30 hover:text-emerald-100"
                    style={{ minHeight: 36, ...labelStyle }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
