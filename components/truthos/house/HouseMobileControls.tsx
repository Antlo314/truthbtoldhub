'use client';

/**
 * Mobile dual-zone controls — pointer + touch (tablets / hybrid PCs too).
 * Left half: move stick · Right half: look · Bottom-right: Use / Jump
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { houseInput } from './houseInput';
import { shapeStick, MOBILE } from './houseFeel';
import type { Hotspot } from './houseMap';
import { unlockAudio } from '@/lib/game/sfx';

type StickState = {
    active: boolean;
    originX: number;
    originY: number;
    knobX: number;
    knobY: number;
};

export default function HouseMobileControls({
    hotspot,
    onInteract,
    visible,
}: {
    hotspot: Hotspot | null;
    onInteract: () => void;
    visible: boolean;
}) {
    const [stick, setStick] = useState<StickState>({
        active: false,
        originX: 0,
        originY: 0,
        knobX: 0,
        knobY: 0,
    });
    const [looking, setLooking] = useState(false);

    const movePtr = useRef<number | null>(null);
    const lookPtr = useRef<number | null>(null);
    const lookLast = useRef({ x: 0, y: 0 });
    const origin = useRef({ x: 0, y: 0 });

    const endMove = useCallback(() => {
        movePtr.current = null;
        houseInput.clearMove();
        setStick((s) => ({ ...s, active: false, knobX: 0, knobY: 0 }));
    }, []);

    const endLook = useCallback(() => {
        lookPtr.current = null;
        houseInput.clearLook();
        setLooking(false);
    }, []);

    useEffect(() => {
        if (!visible) {
            endMove();
            endLook();
            houseInput.clearAll();
        }
    }, [visible, endMove, endLook]);

    useEffect(() => {
        const up = () => {
            endMove();
            endLook();
            houseInput.clearAll();
        };
        window.addEventListener('blur', up);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) up();
        });
        return () => {
            window.removeEventListener('blur', up);
        };
    }, [endMove, endLook]);

    const applyStick = (cx: number, cy: number) => {
        const dx = cx - origin.current.x;
        const dy = cy - origin.current.y;
        const len = Math.hypot(dx, dy) || 1;
        const capped = Math.min(len, MOBILE.stickR);
        const kx = (dx / len) * capped;
        const ky = (dy / len) * capped;
        const nx = kx / MOBILE.stickR;
        const ny = ky / MOBILE.stickR;
        const shaped = shapeStick(nx, ny);
        // Thumb up (screen −Y) → forward
        houseInput.setMove(shaped.x, -shaped.y);
        houseInput.movingTouch = true;
        setStick({
            active: true,
            originX: origin.current.x,
            originY: origin.current.y,
            knobX: kx,
            knobY: ky,
        });
    };

    const isActionTarget = (t: EventTarget | null) =>
        t instanceof Element && !!t.closest('[data-house-action]');

    const onPointerDown = (e: React.PointerEvent) => {
        if (!visible || isActionTarget(e.target)) return;
        unlockAudio();

        const topGuard = 56;
        if (e.clientY < topGuard) return;

        const w = window.innerWidth;
        const isLeft = e.clientX < w * MOBILE.moveZone;

        if (isLeft && movePtr.current === null) {
            e.preventDefault();
            movePtr.current = e.pointerId;
            origin.current = { x: e.clientX, y: e.clientY };
            applyStick(e.clientX, e.clientY);
            try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
                /* */
            }
        } else if (!isLeft && lookPtr.current === null) {
            e.preventDefault();
            lookPtr.current = e.pointerId;
            lookLast.current = { x: e.clientX, y: e.clientY };
            houseInput.lookingTouch = true;
            setLooking(true);
            try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
                /* */
            }
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!visible) return;
        if (e.pointerId === movePtr.current) {
            e.preventDefault();
            applyStick(e.clientX, e.clientY);
        } else if (e.pointerId === lookPtr.current) {
            e.preventDefault();
            const dx = e.clientX - lookLast.current.x;
            const dy = e.clientY - lookLast.current.y;
            lookLast.current = { x: e.clientX, y: e.clientY };
            houseInput.lookDX += dx;
            houseInput.lookDY += dy;
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (e.pointerId === movePtr.current) endMove();
        if (e.pointerId === lookPtr.current) endLook();
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* */
        }
    };

    if (!visible) return null;

    const safeBottom = 'calc(1rem + env(safe-area-inset-bottom))';

    return (
        <div
            className="fixed inset-0 z-40 select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Touch controls"
        >
            <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-36"
                style={{
                    background:
                        'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
                }}
            />

            {/* Ghost stick */}
            {!stick.active && (
                <div
                    className="pointer-events-none absolute rounded-full border border-white/25 bg-black/30 backdrop-blur-sm"
                    style={{
                        width: MOBILE.stickR * 2,
                        height: MOBILE.stickR * 2,
                        left: 24,
                        bottom: `calc(28px + env(safe-area-inset-bottom))`,
                        opacity: MOBILE.idleOpacity,
                        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.35)',
                    }}
                >
                    <div
                        className="absolute rounded-full bg-white/30 border border-white/35"
                        style={{
                            width: MOBILE.knobR * 2,
                            height: MOBILE.knobR * 2,
                            left: MOBILE.stickR - MOBILE.knobR,
                            top: MOBILE.stickR - MOBILE.knobR,
                        }}
                    />
                    <span className="absolute -bottom-5 inset-x-0 text-center text-[9px] uppercase tracking-widest text-white/35">
                        Move
                    </span>
                </div>
            )}

            {stick.active && (
                <div
                    className="pointer-events-none fixed rounded-full border border-white/35 bg-black/40 backdrop-blur-md"
                    style={{
                        width: MOBILE.stickR * 2,
                        height: MOBILE.stickR * 2,
                        left: stick.originX - MOBILE.stickR,
                        top: stick.originY - MOBILE.stickR,
                        opacity: MOBILE.activeOpacity,
                        boxShadow: '0 0 28px rgba(167,139,250,0.3), inset 0 0 20px rgba(0,0,0,0.4)',
                    }}
                >
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: MOBILE.knobR * 2,
                            height: MOBILE.knobR * 2,
                            left: MOBILE.stickR - MOBILE.knobR + stick.knobX,
                            top: MOBILE.stickR - MOBILE.knobR + stick.knobY,
                            background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #7c3aed)',
                            border: '1px solid rgba(255,255,255,0.5)',
                            boxShadow: '0 0 16px rgba(167,139,250,0.55)',
                        }}
                    />
                </div>
            )}

            {looking && (
                <div
                    className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 w-1 h-14 rounded-full bg-white/30"
                    aria-hidden
                />
            )}

            <div
                className="absolute right-3 flex flex-col items-center gap-3"
                style={{ bottom: safeBottom }}
                data-house-action
            >
                <button
                    type="button"
                    data-house-action
                    disabled={!hotspot}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        unlockAudio();
                        if (hotspot) onInteract();
                    }}
                    className={[
                        'rounded-full flex flex-col items-center justify-center text-center',
                        'border shadow-lg backdrop-blur-md transition-all active:scale-95',
                        hotspot
                            ? 'border-amber-300/70 bg-gradient-to-br from-amber-200 to-amber-600 text-black scale-105'
                            : 'border-white/18 bg-black/40 text-white/30',
                    ].join(' ')}
                    style={{ width: MOBILE.action, height: MOBILE.action, touchAction: 'none' }}
                    aria-label={hotspot ? `Use ${hotspot.label}` : 'Interact'}
                >
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none opacity-80">
                        {hotspot ? 'Use' : '·'}
                    </span>
                    <span
                        className="mt-0.5 px-1 font-bold leading-tight"
                        style={{
                            fontSize: hotspot && hotspot.label.length > 10 ? 9 : 11,
                            maxWidth: MOBILE.action - 10,
                        }}
                    >
                        {hotspot ? hotspot.label : 'Use'}
                    </span>
                </button>

                <button
                    type="button"
                    data-house-action
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        unlockAudio();
                        houseInput.queueJump();
                    }}
                    className="rounded-full border border-white/22 bg-black/45 text-white backdrop-blur-md shadow-md active:scale-95 flex flex-col items-center justify-center"
                    style={{
                        width: MOBILE.actionSecondary,
                        height: MOBILE.actionSecondary,
                        touchAction: 'none',
                    }}
                    aria-label="Jump"
                >
                    <span className="text-base leading-none opacity-90">↑</span>
                    <span className="text-[8px] uppercase tracking-widest opacity-55 mt-0.5">Jump</span>
                </button>
            </div>
        </div>
    );
}
