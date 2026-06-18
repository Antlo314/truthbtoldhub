'use client';

import { useEffect, useRef } from 'react';

/**
 * useTiltParallax — tracks pointer (or device orientation on mobile) and reports
 * a normalized offset in range roughly [-1, 1] for x/y. Apply it as a translate
 * to layered elements (title, glow, embers) for a subtle, premium depth effect
 * on the title card.
 *
 * Pointer-based on desktop; on touch we fall back to a gentle idle drift so the
 * layer is never dead. Respects prefers-reduced-motion (returns to neutral).
 */
export function useTiltParallax(strength = 14) {
    const offset = useRef({ x: 0, y: 0 });
    const subs = useRef<Array<() => void>>([]);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;

        const onMove = (e: PointerEvent) => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            offset.current = {
                x: ((e.clientX - cx) / cx),
                y: ((e.clientY - cy) / cy),
            };
            notify();
        };
        let driftT = 0;
        let raf = 0;
        // Gentle idle drift so motion exists even without pointer movement.
        const idle = (t: number) => {
            driftT = t;
            const base = offset.current;
            // only drift if the user hasn't moved recently
            if (Math.hypot(base.x, base.y) < 0.02) {
                offset.current = {
                    x: Math.sin(t / 3200) * 0.12,
                    y: Math.cos(t / 3800) * 0.10,
                };
                notify();
            }
            raf = requestAnimationFrame(idle);
        };
        raf = requestAnimationFrame(idle);

        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            cancelAnimationFrame(raf);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strength]);

    function notify() {
        for (const fn of subs.current) fn();
    }

    function subscribe(fn: () => void) {
        subs.current.push(fn);
        return () => {
            subs.current = subs.current.filter((f) => f !== fn);
        };
    }

    /** Bind to a ref to apply transform: translate(x, y) based on offset. */
    function bind<T extends HTMLElement>(): { ref: (el: T | null) => void } {
        let el: T | null = null;
        let unsub = () => {};
        return {
            ref: (node) => {
                unsub();
                el = node;
                if (!el) return;
                const apply = () => {
                    if (!el) return;
                    const { x, y } = offset.current;
                    el.style.transform = `translate3d(${(-x * strength).toFixed(2)}px, ${(-y * strength).toFixed(2)}px, 0)`;
                };
                apply();
                unsub = subscribe(apply);
            },
        };
    }

    return { bind };
}
