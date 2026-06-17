'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { unlockAudio } from '@/lib/game/sfx';

export function useJoystick(radius: number) {
    const joyRef = useRef({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    // Identifier of the finger that owns the stick, so a second finger (e.g.
    // tapping Interact) can't hijack steering and a lifted non-steer finger
    // can't zero it.
    const touchId = useRef<number | null>(null);
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
        touchId.current = null;
        setKnob({ x: 0, y: 0 });
        joyRef.current = { x: 0, y: 0 };
    }, []);

    const ownTouch = (list: React.TouchList) => {
        for (let i = 0; i < list.length; i++) {
            if (list[i].identifier === touchId.current) return list[i];
        }
        return null;
    };

    // A cancelled/lost touch (incoming call, OS gesture) or a mouse released off
    // the pad never fires the element handlers — without this the avatar keeps
    // walking on a stale vector. Window-level release is the safety net.
    useEffect(() => {
        const onWindowUp = () => joyEnd();
        window.addEventListener('mouseup', onWindowUp);
        window.addEventListener('touchcancel', onWindowUp);
        window.addEventListener('blur', onWindowUp);
        return () => {
            window.removeEventListener('mouseup', onWindowUp);
            window.removeEventListener('touchcancel', onWindowUp);
            window.removeEventListener('blur', onWindowUp);
        };
    }, [joyEnd]);

    const bind = {
        onTouchStart: (e: React.TouchEvent) => {
            unlockAudio();
            const t = e.changedTouches[0];
            touchId.current = t.identifier;
            joyActive.current = true;
            joyMove(t.clientX, t.clientY);
        },
        onTouchMove: (e: React.TouchEvent) => {
            if (!joyActive.current) return;
            const t = ownTouch(e.touches);
            if (!t) return; // a different finger moved — ignore
            e.preventDefault();
            joyMove(t.clientX, t.clientY);
        },
        onTouchEnd: (e: React.TouchEvent) => {
            if (touchId.current === null || ownTouch(e.changedTouches)) joyEnd();
        },
        onTouchCancel: (e: React.TouchEvent) => {
            if (touchId.current === null || ownTouch(e.changedTouches)) joyEnd();
        },
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