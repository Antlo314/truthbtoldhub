'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem } from 'lucide-react';
import { VISIONS } from '@/lib/brand/visions';
import {
    loadVisionProgress,
    visionStats,
    RELIC_BY_VISION,
    type VisionProgress,
} from '@/lib/brand/visionProgress';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { cn } from '@/lib/design/cn';

interface Props {
    /** compact = row of gems; full = named list */
    variant?: 'compact' | 'full';
    className?: string;
    showCtas?: boolean;
}

/**
 * Claimed vision relics + journey map strip — local persistence only.
 */
export default function VisionReliquary({ variant = 'full', className, showCtas = true }: Props) {
    const [progress, setProgress] = useState<VisionProgress | null>(null);
    const [stats, setStats] = useState({ seen: 0, trials: 0, total: VISIONS.length, relics: 0, complete: false });

    useEffect(() => {
        setProgress(loadVisionProgress());
        setStats(visionStats());
    }, []);

    const owned = progress?.relics ?? [];
    const pct = stats.total ? Math.round((stats.seen / stats.total) * 100) : 0;

    return (
        <div
            className={cn(
                'rounded-2xl border border-aether-gold/20 bg-black/50 backdrop-blur-md p-4',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <p className="text-[9px] uppercase tracking-[0.35em] text-aether-gold/70 mb-1">Reliquary</p>
                    <p className="font-ritual text-lg text-white leading-tight">Vision relics</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-ritual text-xl text-aether-gold/90 tabular-nums">
                        {stats.relics}<span className="text-white/30 text-base">/{stats.total}</span>
                    </p>
                    <p className="text-[8px] uppercase tracking-widest text-white/35">carried</p>
                </div>
            </div>

            <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-3">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-aether-gold/70 to-aether-gold transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[11px] text-white/40 mb-4 tabular-nums">
                {stats.seen}/{stats.total} portals · {stats.trials} trials witnessed
            </p>

            {variant === 'compact' ? (
                <div className="flex flex-wrap gap-2">
                    {VISIONS.map((v) => {
                        const r = RELIC_BY_VISION[v.id];
                        const has = owned.includes(r.id);
                        return (
                            <div
                                key={v.id}
                                title={has ? r.name : `${r.name} (unclaimed)`}
                                className="w-9 h-9 rounded-full border flex items-center justify-center"
                                style={{
                                    borderColor: has ? `${v.accent}66` : 'rgba(255,255,255,0.1)',
                                    background: has ? `${v.accent}22` : 'rgba(255,255,255,0.03)',
                                    opacity: has ? 1 : 0.35,
                                }}
                            >
                                <Gem className="w-3.5 h-3.5" style={{ color: has ? v.accent : '#71717a' }} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <ul className="space-y-2.5">
                    {VISIONS.map((v) => {
                        const r = RELIC_BY_VISION[v.id];
                        const has = owned.includes(r.id);
                        const seen = progress?.seen.includes(v.id);
                        return (
                            <li key={v.id} className="flex items-start gap-3">
                                <div
                                    className="shrink-0 w-8 h-8 rounded-full border flex items-center justify-center mt-0.5"
                                    style={{
                                        borderColor: has ? `${v.accent}55` : 'rgba(255,255,255,0.1)',
                                        background: has ? `${v.accent}18` : 'rgba(0,0,0,0.4)',
                                    }}
                                >
                                    <Gem className="w-3.5 h-3.5" style={{ color: has ? v.accent : '#52525b' }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-ritual" style={{ color: has ? v.accent : 'rgba(255,255,255,0.45)' }}>
                                        {r.name}
                                    </p>
                                    <p className="text-[11px] text-white/35 leading-relaxed">
                                        {has ? r.desc : seen ? 'Opened — claim at the portal' : `${v.name.split('—')[0].trim()} · unopened`}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {showCtas && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.25em]">
                    <Link
                        href="/vision"
                        onClick={() => sacredUi.click()}
                        className="text-aether-gold/80 hover:text-aether-gold"
                    >
                        Wayfinder →
                    </Link>
                    {stats.complete ? (
                        <Link
                            href="/epilogue"
                            onClick={() => sacredUi.access()}
                            className="text-white/50 hover:text-aether-gold/80"
                        >
                            Epilogue →
                        </Link>
                    ) : stats.seen > 0 ? (
                        <Link
                            href="/epilogue"
                            onClick={() => sacredUi.click()}
                            className="text-white/35 hover:text-aether-gold/70"
                        >
                            Roads so far →
                        </Link>
                    ) : null}
                </div>
            )}
        </div>
    );
}
