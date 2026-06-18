'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — smoothly animates a number from 0 (or `from`) up to `value` over
 * `duration` ms the first time the element is visible. Used for the "founding
 * seals remain" counter so the number ticks into place like a premium drop.
 *
 * Returns [display, ref] — attach ref to the element you want to watch.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(value: number, duration = 1400, from = 0) {
    const ref = useRef<T | null>(null);
    const [display, setDisplay] = useState(from);
    const startedRef = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (el == null || value === from) {
            setDisplay(value);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !startedRef.current) {
                    startedRef.current = true;
                    const start = performance.now();
                    const tick = (now: number) => {
                        const p = Math.min(1, (now - start) / duration);
                        // easeOutExpo for a confident deceleration
                        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                        setDisplay(Math.round(from + (value - from) * eased));
                        if (p < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.4 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [value, duration, from]);

    return [display, ref] as const;
}
