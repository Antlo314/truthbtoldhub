'use client';

/**
 * Industry-standard dual-zone mobile FP controls.
 * Left ~48% — dynamic virtual joystick (spawn under thumb).
 * Right — free look drag.
 * Fixed Jump + Interact on the right bottom (thumb zone).
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

    const moveId = useRef<number | null>(null);
    const lookId = useRef<number | null>(null);
    const lookLast = useRef({ x: 0, y: 0 });
    const origin = useRef({ x: 0, y: 0 });
    const rootRef = useRef<HTMLDivElement>(null);

    const endMove = useCallback(() => {
        moveId.current = null;
        houseInput.clearMove();
        setStick((s) => ({ ...s, active: false, knobX: 0, knobY: 0 }));
    }, []);

    const endLook = useCallback(() => {
        lookId.current = null;
        houseInput.clearLook();
        setLooking(false);
    }, []);

    useEffect(() => {
        if (!visible) {
            endMove();
            endLook();
        }
    }, [visible, endMove, endLook]);

    // Safety: OS gestures / calls
    useEffect(() => {
        const up = () => {
            endMove();
            endLook();
        };
        window.addEventListener('touchcancel', up);
        window.addEventListener('blur', up);
        return () => {
            window.removeEventListener('touchcancel', up);
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
        // Normalize to −1…1 then shape
        const nx = kx / MOBILE.stickR;
        const ny = ky / MOBILE.stickR;
        const shaped = shapeStick(nx, ny);
        // ny up (negative screen Y when pulling up) → forward
        // Screen: up = smaller Y → ny negative when thumb up → forward = -ny
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

    const onTouchStart = (e: React.TouchEvent) => {
        if (!visible) return;
        unlockAudio();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const w = window.innerWidth;
            const isLeft = t.clientX < w * MOBILE.moveZone;

            // Don't steal touches on action buttons
            const target = e.target as HTMLElement;
            if (target.closest('[data-house-action]')) continue;

            // Leave top chrome (sign-in / tour) alone
            const topGuard = 56 + (typeof window !== 'undefined'
                ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0', 10) || 0
                : 0);
            if (t.clientY < topGuard) continue;

            if (isLeft && moveId.current === null) {
                moveId.current = t.identifier;
                origin.current = { x: t.clientX, y: t.clientY };
                applyStick(t.clientX, t.clientY);
            } else if (!isLeft && lookId.current === null) {
                lookId.current = t.identifier;
                lookLast.current = { x: t.clientX, y: t.clientY };
                houseInput.lookingTouch = true;
                setLooking(true);
            }
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!visible) return;
        let used = false;
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            if (t.identifier === moveId.current) {
                applyStick(t.clientX, t.clientY);
                used = true;
            } else if (t.identifier === lookId.current) {
                const dx = t.clientX - lookLast.current.x;
                const dy = t.clientY - lookLast.current.y;
                lookLast.current = { x: t.clientX, y: t.clientY };
                // Pixel look — controller consumes each frame (1:1, no double-apply)
                houseInput.lookDX += dx;
                houseInput.lookDY += dy;
                used = true;
            }
        }
        if (used) e.preventDefault();
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === moveId.current) endMove();
            if (t.identifier === lookId.current) endLook();
        }
    };

    if (!visible) return null;

    const safeBottom = 'calc(1rem + env(safe-area-inset-bottom))';
    // Ghost stick resting position (lower-left thumb zone)
    const ghostLeft = 28;
    const ghostBottom = 28;

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-40 select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            aria-label="Touch controls"
        >
            {/* Soft vignette only at bottom corners — doesn't wash the scene */}
            <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-36"
                style={{
                    background:
                        'linear-gradient(to top, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)',
                }}
            />

            {/* Resting ghost stick (when inactive) */}
            {!stick.active && (
                <div
                    className="pointer-events-none absolute rounded-full border border-white/20 bg-black/25 backdrop-blur-sm"
                    style={{
                        width: MOBILE.stickR * 2,
                        height: MOBILE.stickR * 2,
                        left: ghostLeft,
                        bottom: `calc(${ghostBottom}px + env(safe-area-inset-bottom))`,
                        opacity: MOBILE.idleOpacity,
                        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.35)',
                    }}
                >
                    <div
                        className="absolute rounded-full bg-white/25 border border-white/30"
                        style={{
                            width: MOBILE.knobR * 2,
                            height: MOBILE.knobR * 2,
                            left: MOBILE.stickR - MOBILE.knobR,
                            top: MOBILE.stickR - MOBILE.knobR,
                        }}
                    />
                </div>
            )}

            {/* Active dynamic stick under thumb */}
            {stick.active && (
                <div
                    className="pointer-events-none fixed rounded-full border border-white/30 bg-black/35 backdrop-blur-md"
                    style={{
                        width: MOBILE.stickR * 2,
                        height: MOBILE.stickR * 2,
                        left: stick.originX - MOBILE.stickR,
                        top: stick.originY - MOBILE.stickR,
                        opacity: MOBILE.activeOpacity,
                        boxShadow: '0 0 28px rgba(167,139,250,0.25), inset 0 0 20px rgba(0,0,0,0.4)',
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
                            border: '1px solid rgba(255,255,255,0.45)',
                            boxShadow: '0 0 16px rgba(167,139,250,0.55)',
                        }}
                    />
                </div>
            )}

            {/* Look-active whisper */}
            {looking && (
                <div
                    className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 w-1.5 h-12 rounded-full bg-white/25"
                    aria-hidden
                />
            )}

            {/* Action cluster — right thumb */}
            <div
                className="absolute right-3 flex flex-col items-center gap-3"
                style={{ bottom: safeBottom }}
                data-house-action
            >
                <button
                    type="button"
                    data-house-action
                    disabled={!hotspot}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        unlockAudio();
                        if (hotspot) onInteract();
                    }}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (hotspot) onInteract();
                    }}
                    className={[
                        'rounded-full flex flex-col items-center justify-center text-center',
                        'border shadow-lg backdrop-blur-md transition-all active:scale-95',
                        hotspot
                            ? 'border-amber-300/70 bg-gradient-to-br from-amber-200 to-amber-600 text-black scale-105'
                            : 'border-white/18 bg-black/40 text-white/30',
                    ].join(' ')}
                    style={{
                        width: MOBILE.action,
                        height: MOBILE.action,
                        touchAction: 'none',
                    }}
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
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        unlockAudio();
                        houseInput.queueJump();
                    }}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
