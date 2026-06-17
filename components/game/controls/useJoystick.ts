'use client';

import { useCallback, useRef, useState } from 'react';
import { unlockAudio } from '@/lib/game/sfx';

export function useJoystick(radius: number) {
    const joyRef = useRef({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });

    const joyMove = useCallback((cx: number, cy: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        const dx = cx - (rect.left + rect.width / 2);
        const dy = cy - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(d, radius);
        const a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * m;
        const ky = Math.sin(a) * m;
        setKnob({ x: kx, y: ky });
        joyRef.current = { x: kx / radius, y: ky / radius };
    }, [radius]);

    const joyEnd = useCallback(() => {
        joyActive.current = false;
        setKnob({ x: 0, y: 0 });
        joyRef.current = { x: 0, y: 0 };
    }, []);

    const bind = {
        onTouchStart: (e: React.TouchEvent) => {
            unlockAudio();
            joyActive.current = true;
            const t = e.touches[0];
            joyMove(t.clientX, t.clientY);
        },
        onTouchMove: (e: React.TouchEvent) => {
            e.preventDefault();
            if (joyActive.current) joyMove(e.touches[0].clientX, e.touches[0].clientY);
        },
        onTouchEnd: joyEnd,
        onMouseDown: (e: React.MouseEvent) => {
            unlockAudio();
            joyActive.current = true;
            joyMove(e.clientX, e.clientY);
        },
        onMouseMove: (e: React.MouseEvent) => {
            if (joyActive.current) joyMove(e.clientX, e.clientY);
        },
        onMouseUp: joyEnd,
        onMouseLeave: joyEnd,
    };

    return { joyRef, baseRef, knob, joyActive, bind, joyEnd };
}