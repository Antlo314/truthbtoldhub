'use client';

/**
 * After the tour: one gold-ring reminder. Next-line owns the rest.
 */
import { useEffect, useRef, useState } from 'react';
import type { Hotspot } from './houseMap';
import { STATION_LABELS } from './stationProgress';
import { useHouseUi } from './houseUiStore';

const STORAGE = 'tbth-house-hints-v5';

function loadDone(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch {
        return new Set();
    }
}

function saveDone(set: Set<string>) {
    try {
        localStorage.setItem(STORAGE, JSON.stringify(Array.from(set)));
    } catch {
        /* */
    }
}

export default function HouseHints({
    visible,
    isMobile,
    hotspot,
}: {
    visible: boolean;
    isMobile: boolean;
    hotspot: Hotspot | null;
    activity?: 'move' | 'look' | 'jump' | 'idle' | null;
}) {
    const tourOpen = useHouseUi((s) => s.walkthroughOpen);
    const done = useRef<Set<string>>(new Set());
    const [hint, setHint] = useState<{ line: string; sub: string } | null>(null);
    const [fade, setFade] = useState(false);
    const hideTimer = useRef<number | null>(null);

    useEffect(() => {
        done.current = loadDone();
    }, []);

    const show = (id: string, line: string, sub: string, ms = 4000) => {
        if (done.current.has(id)) return;
        done.current.add(id);
        saveDone(done.current);
        setFade(false);
        setHint({ line, sub });
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
            setFade(true);
            window.setTimeout(() => setHint(null), 300);
        }, ms);
    };

    useEffect(() => {
        if (!visible || !hotspot || tourOpen) return;
        show(
            'interact',
            STATION_LABELS[hotspot.id] || hotspot.label,
            isMobile ? 'Tap Use' : 'Press E',
            3800,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotspot?.id, visible, tourOpen, isMobile]);

    useEffect(() => {
        return () => {
            if (hideTimer.current) window.clearTimeout(hideTimer.current);
        };
    }, []);

    if (!visible || tourOpen || !hint) return null;

    return (
        <div
            className="fixed inset-x-0 z-[35] flex justify-center pointer-events-none px-4"
            style={{
                top: isMobile
                    ? 'calc(5.6rem + env(safe-area-inset-top))'
                    : 'calc(6.2rem + env(safe-area-inset-top))',
            }}
            role="status"
        >
            <div
                className="max-w-sm w-full rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition-all duration-300"
                style={{
                    opacity: fade ? 0 : 1,
                    transform: fade ? 'translateY(-6px)' : 'translateY(0)',
                }}
            >
                <p className="text-[13px] text-white/90 font-medium leading-snug text-center">
                    {hint.line}
                </p>
                <p className="mt-1 text-[11px] text-white/45 text-center tracking-wide">{hint.sub}</p>
            </div>
        </div>
    );
}
