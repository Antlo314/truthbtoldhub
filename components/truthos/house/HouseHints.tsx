'use client';

/**
 * Progressive guidance:
 * - First moments: how to move/look in 3D
 * - On station approach: interact tip (once)
 * - Subtle reminders for unvisited Hut stations (spaced out, never spam)
 */
import { useEffect, useRef, useState } from 'react';
import type { Hotspot } from './houseMap';
import {
    unvisitedCore,
    STATION_LABELS,
    hutCompletion,
} from './stationProgress';
type HintId = string;

const STORAGE = 'tbth-house-hints-v3';

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
    activity,
}: {
    visible: boolean;
    isMobile: boolean;
    hotspot: Hotspot | null;
    activity: 'move' | 'look' | 'jump' | 'idle' | null;
}) {
    const done = useRef<Set<string>>(new Set());
    const [hint, setHint] = useState<{ id: HintId; line: string; sub: string } | null>(null);
    const [fade, setFade] = useState(false);
    const hideTimer = useRef<number | null>(null);
    const bootTimer = useRef<number | null>(null);
    const remindTimer = useRef<number | null>(null);
    const seenMove = useRef(false);
    const seenLook = useRef(false);
    const lastRemindAt = useRef(0);

    useEffect(() => {
        done.current = loadDone();
    }, []);

    // Expose mark helper via effect when parent opens station
    useEffect(() => {
        if (!hotspot) return;
        // approaching alone doesn't mark — open does via parent
    }, [hotspot]);

    const show = (id: HintId, line: string, sub: string, ms = 4200) => {
        if (done.current.has(id)) return;
        done.current.add(id);
        saveDone(done.current);
        setFade(false);
        setHint({ id, line, sub });
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
            setFade(true);
            window.setTimeout(() => setHint(null), 300);
        }, ms);
    };

    // Soft intro
    useEffect(() => {
        if (!visible) return;
        bootTimer.current = window.setTimeout(() => {
            show(
                'immersive',
                'You’re inside a 3D house — look around, then walk.',
                isMobile ? 'Left: move · Right: look' : 'WASD move · drag to look',
                4800,
            );
        }, 1200);
        return () => {
            if (bootTimer.current) window.clearTimeout(bootTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, isMobile]);

    useEffect(() => {
        if (!visible || !activity) return;
        if (activity === 'look') {
            seenLook.current = true;
            done.current.add('look');
            saveDone(done.current);
        }
        if (activity === 'move') {
            seenMove.current = true;
            done.current.add('move');
            saveDone(done.current);
            if (!done.current.has('station')) {
                window.setTimeout(() => {
                    show(
                        'station',
                        'Gold rings mark house rooms',
                        isMobile ? 'Walk onto a ring, then tap Use' : 'Walk close, then press E',
                        4500,
                    );
                }, 2000);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activity, visible, isMobile]);

    // Near hotspot — interact once
    useEffect(() => {
        if (!visible || !hotspot) return;
        if (!done.current.has('interact')) {
            show(
                'interact',
                STATION_LABELS[hotspot.id] || hotspot.label,
                isMobile ? 'Tap Use to enter' : 'Press E to enter',
                4000,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotspot?.id, visible]);

    // Subtle reminders for unvisited Hut core stations
    useEffect(() => {
        if (!visible) return;
        const tick = () => {
            const now = Date.now();
            // Space reminders ≥ 50s apart
            if (now - lastRemindAt.current < 50000) return;
            if (!seenMove.current) return;
            const miss = unvisitedCore();
            if (miss.length === 0) return;
            const id = miss[0];
            const key = `remind-${id}`;
            if (done.current.has(key)) {
                // try next
                const next = miss.find((m) => !done.current.has(`remind-${m}`));
                if (!next) return;
                lastRemindAt.current = now;
                show(
                    `remind-${next}`,
                    `Still unexplored: ${STATION_LABELS[next]}`,
                    next === 'computer'
                        ? 'Computer is powered down here — use Return to terminal'
                        : 'A house room waits',
                    5000,
                );
                return;
            }
            lastRemindAt.current = now;
            show(
                key,
                `Still unexplored: ${STATION_LABELS[id]}`,
                id === 'computer'
                    ? 'Use the top-left button to return to the terminal'
                    : 'A house room waits',
                5000,
            );
        };
        remindTimer.current = window.setInterval(tick, 28000);
        // first remind after 40s of play
        const first = window.setTimeout(tick, 40000);
        return () => {
            if (remindTimer.current) window.clearInterval(remindTimer.current);
            window.clearTimeout(first);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        return () => {
            if (hideTimer.current) window.clearTimeout(hideTimer.current);
        };
    }, []);

    // progress chip
    const [progress, setProgress] = useState(() => hutCompletion());
    useEffect(() => {
        if (!visible) return;
        const t = window.setInterval(() => setProgress(hutCompletion()), 2000);
        return () => window.clearInterval(t);
    }, [visible]);

    if (!visible) return null;

    return (
        <>
            {hint && (
                <div
                    className="fixed inset-x-0 z-[35] flex justify-center pointer-events-none px-4"
                    style={{
                        top: isMobile
                            ? 'calc(4.5rem + env(safe-area-inset-top))'
                            : 'calc(5.5rem + env(safe-area-inset-top))',
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
                        <p className="mt-1 text-[11px] text-white/45 text-center tracking-wide">
                            {hint.sub}
                        </p>
                    </div>
                </div>
            )}

            {/* Quiet Hut progress — only until complete */}
            {progress.seen < progress.total && seenMove.current && (
                <div
                    className="fixed z-[34] pointer-events-none"
                    style={{
                        left: isMobile ? 12 : 16,
                        bottom: isMobile
                            ? 'calc(min(42dvh, 260px) + 0.75rem)'
                            : '5.5rem',
                    }}
                >
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-mono bg-black/35 px-2 py-1 rounded-full border border-white/8">
                        Rooms · {progress.seen}/{progress.total}
                    </p>
                </div>
            )}
        </>
    );
}

