'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Gem, Swords, Sun, Sparkles } from 'lucide-react';
import { suggestNextRoad, type NextRoad } from '@/lib/brand/nextRoad';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { cn } from '@/lib/design/cn';

const ICON: Record<NextRoad['kind'], typeof Compass> = {
    vision: Sparkles,
    trial: Swords,
    relic: Gem,
    epilogue: Sun,
    start: Compass,
};

interface Props {
    className?: string;
    compact?: boolean;
}

/** Soft "what next on the map?" card — local vision progress only. */
export default function NextRoadCard({ className, compact }: Props) {
    const [road, setRoad] = useState<NextRoad | null>(null);

    useEffect(() => {
        try {
            setRoad(suggestNextRoad());
        } catch {
            setRoad(null);
        }
    }, []);

    if (!road) return null;
    const Icon = ICON[road.kind];

    return (
        <div
            className={cn(
                'rounded-2xl border border-aether-gold/20 bg-black/55 backdrop-blur-md',
                compact ? 'p-3' : 'p-4',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full border border-aether-gold/30 bg-aether-gold/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-aether-gold" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-[0.35em] text-aether-gold/70 mb-0.5">
                        Next road
                    </p>
                    <p className={cn('font-ritual text-white', compact ? 'text-sm' : 'text-base')}>
                        {road.label}
                    </p>
                    {!compact && (
                        <p className="text-[12px] text-white/40 mt-1 leading-relaxed">{road.whisper}</p>
                    )}
                    <Link
                        href={road.href}
                        onClick={() => sacredUi.threshold()}
                        className="inline-block mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-aether-gold hover:text-white transition-colors min-h-[40px] leading-[40px]"
                    >
                        Walk this road →
                    </Link>
                </div>
            </div>
        </div>
    );
}
