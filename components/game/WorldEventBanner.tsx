'use client';

import type { WorldEvent } from '@/lib/game/worldEvents';

interface Props {
    event: WorldEvent;
}

export default function WorldEventBanner({ event }: Props) {
    return (
        <div
            className="pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm max-w-[min(92vw,20rem)]"
            style={{
                background: `${event.accent}18`,
                borderColor: `${event.accent}44`,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ background: event.accent }}
            />
            <span
                className="text-[9px] font-black uppercase tracking-[0.22em] truncate"
                style={{ color: event.accent }}
            >
                Today · {event.shortLabel}
            </span>
        </div>
    );
}