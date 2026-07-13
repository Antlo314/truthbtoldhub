'use client';

/**
 * Subtle progressive guidance — no load-in wall of text.
 * Hints appear when the player needs them, then never nag again.
 */
import { useEffect, useRef, useState } from 'react';
import type { Hotspot } from './houseMap';

type HintId =
    | 'immersive'
    | 'look'
    | 'move'
    | 'interact'
    | 'station'
    | 'jump';

const STORAGE = 'tbth-house-hints-v2';

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

const COPY: Record<HintId, { text: string; mobile: string; desktop: string }> = {
    immersive: {
        text: 'You’re inside a 3D space — look around, then walk.',
        mobile: 'Drag right to look · press left to walk',
        desktop: 'Drag to look · WASD to walk',
    },
    look: {
        text: 'Look around the room',
        mobile: 'Drag on the right half of the screen',
        desktop: 'Click and drag',
    },
    move: {
        text: 'Walk through the house',
        mobile: 'Hold and slide on the left',
        desktop: 'WASD or arrow keys',
    },
    interact: {
        text: 'Something here responds',
        mobile: 'Tap Use when it glows',
        desktop: 'Press E',
    },
    station: {
        text: 'Gold rings mark places you can enter',
        mobile: 'Walk onto a ring, then Use',
        desktop: 'Walk close, then press E',
    },
    jump: {
        text: 'You can jump',
        mobile: 'Tap Jump',
        desktop: 'Space',
    },
};

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
    const idleTimer = useRef<number | null>(null);
    const seenMove = useRef(false);
    const seenLook = useRef(false);

    useEffect(() => {
        done.current = loadDone();
    }, []);

    const show = (id: HintId, ms = 4200) => {
        if (done.current.has(id)) return;
        done.current.add(id);
        saveDone(done.current);
        const c = COPY[id];
        setFade(false);
        setHint({
            id,
            line: c.text,
            sub: isMobile ? c.mobile : c.desktop,
        });
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
            setFade(true);
            window.setTimeout(() => setHint(null), 320);
        }, ms);
    };

    // Soft intro after a short beat — not a modal
    useEffect(() => {
        if (!visible) return;
        bootTimer.current = window.setTimeout(() => {
            show('immersive', 5000);
        }, 1400);
        return () => {
            if (bootTimer.current) window.clearTimeout(bootTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, isMobile]);

    useEffect(() => {
        if (!visible || !activity) return;
        if (activity === 'look') {
            seenLook.current = true;
            if (!done.current.has('look')) {
                done.current.add('look');
                saveDone(done.current);
            }
        }
        if (activity === 'move') {
            seenMove.current = true;
            if (!done.current.has('move')) {
                done.current.add('move');
                saveDone(done.current);
            }
            if (!done.current.has('station')) {
                window.setTimeout(() => show('station', 4500), 2200);
            }
        }
        if (activity === 'jump') {
            done.current.add('jump');
            saveDone(done.current);
        }
        if (activity === 'idle') {
            if (idleTimer.current) window.clearTimeout(idleTimer.current);
            idleTimer.current = window.setTimeout(() => {
                if (!seenLook.current && !done.current.has('look')) show('look', 4000);
                else if (!seenMove.current && !done.current.has('move')) show('move', 4000);
            }, 5500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activity, visible, isMobile]);

    useEffect(() => {
        if (!visible || !hotspot) return;
        if (!done.current.has('interact')) show('interact', 4800);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotspot?.id, visible]);

    useEffect(() => {
        if (!visible) return;
        const t = window.setTimeout(() => {
            if (!done.current.has('jump') && seenMove.current) show('jump', 3500);
        }, 45000);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        return () => {
            if (hideTimer.current) window.clearTimeout(hideTimer.current);
            if (idleTimer.current) window.clearTimeout(idleTimer.current);
        };
    }, []);

    if (!visible || !hint) return null;

    return (
        <div
            className="fixed inset-x-0 z-[35] flex justify-center pointer-events-none px-4"
            style={{
                top: isMobile
                    ? 'calc(4.5rem + env(safe-area-inset-top))'
                    : 'calc(5.5rem + env(safe-area-inset-top))',
            }}
            role="status"
            aria-live="polite"
        >
            <div
                key={hint.id}
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
    );
}
