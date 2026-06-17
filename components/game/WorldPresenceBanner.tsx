'use client';

import { Footprints } from 'lucide-react';

interface Props {
    walkedToday: number;
    fellowCount: number;
}

export default function WorldPresenceBanner({ walkedToday, fellowCount }: Props) {
    if (walkedToday <= 0) return null;

    const label = walkedToday === 1
        ? '1 soul walked today'
        : `${walkedToday.toLocaleString()} souls walked today`;

    return (
        <div
            className="pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm max-w-[min(92vw,22rem)]"
            style={{
                background: 'rgba(167,139,250,0.12)',
                borderColor: 'rgba(167,139,250,0.35)',
            }}
        >
            <Footprints className="w-3 h-3 shrink-0 text-violet-300/90" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] truncate text-violet-200/90">
                {label}
                {fellowCount > 0 && (
                    <span className="text-violet-300/60 font-mono normal-case tracking-normal">
                        {' '}· {fellowCount} near you
                    </span>
                )}
            </span>
        </div>
    );
}