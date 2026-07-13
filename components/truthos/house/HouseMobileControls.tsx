'use client';

/**
 * Pristine mobile / touch control pad for the house.
 * Left joystick · right Jump + Interact · safe-area aware.
 */
import { useEffect } from 'react';
import JoystickVisual from '@/components/game/controls/JoystickVisual';
import { useJoystick } from '@/components/game/controls/useJoystick';
import { MOBILE_JOY_R, MOBILE_ACTION } from '@/lib/game/controls';
import { houseInput } from './houseInput';
import type { Hotspot } from './houseMap';

export default function HouseMobileControls({
    hotspot,
    onInteract,
    visible,
}: {
    hotspot: Hotspot | null;
    onInteract: () => void;
    visible: boolean;
}) {
    const radius = MOBILE_JOY_R;
    const joy = useJoystick(radius);
    const action = MOBILE_ACTION;

    // Push stick into shared input every frame-ish via rAF
    useEffect(() => {
        if (!visible) {
            houseInput.clearMove();
            return;
        }
        let id = 0;
        const tick = () => {
            const { x, y } = joy.joyRef.current;
            // stick: x = strafe, y up (negative) = forward → axisZ negative
            houseInput.setMove(x, y);
            id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(id);
            houseInput.clearMove();
        };
    }, [joy.joyRef, visible]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 pointer-events-none select-none"
            style={{
                height: 'min(42dvh, 280px)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            aria-label="Touch controls"
        >
            {/* Soft gradient so pads read against bright rooms */}
            <div
                className="absolute inset-x-0 bottom-0 h-full pointer-events-none"
                style={{
                    background:
                        'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, transparent 100%)',
                }}
            />

            <JoystickVisual
                radius={radius}
                joy={joy}
                accent="rgba(167, 139, 250, 0.75)"
                className="absolute left-3 sm:left-5"
                style={{ bottom: 'calc(1.1rem + env(safe-area-inset-bottom))' }}
            />

            <div
                className="absolute right-3 sm:right-5 flex flex-col items-end gap-3 pointer-events-auto"
                style={{ bottom: 'calc(1.1rem + env(safe-area-inset-bottom))' }}
            >
                {/* Interact */}
                <button
                    type="button"
                    disabled={!hotspot}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        if (!hotspot) return;
                        onInteract();
                    }}
                    className={[
                        'rounded-full flex flex-col items-center justify-center text-center transition-transform active:scale-95',
                        'border shadow-lg backdrop-blur-md',
                        hotspot
                            ? 'border-amber-400/60 bg-gradient-to-br from-amber-300 to-amber-600 text-black animate-pulse'
                            : 'border-white/15 bg-black/45 text-white/35',
                    ].join(' ')}
                    style={{
                        width: action,
                        height: action,
                        touchAction: 'none',
                    }}
                    aria-label={hotspot ? `Interact ${hotspot.hint}` : 'Interact'}
                >
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-80 leading-none">
                        {hotspot ? 'Use' : 'E'}
                    </span>
                    <span
                        className="mt-0.5 px-1.5 font-bold leading-tight text-center"
                        style={{
                            fontSize: hotspot && hotspot.hint.length > 18 ? 8 : 10,
                            maxWidth: action - 8,
                        }}
                    >
                        {hotspot ? hotspot.label : 'Interact'}
                    </span>
                </button>

                {/* Jump */}
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        houseInput.queueJump();
                    }}
                    className="rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center"
                    style={{
                        width: action * 0.82,
                        height: action * 0.82,
                        touchAction: 'none',
                    }}
                    aria-label="Jump"
                >
                    <span className="text-lg leading-none">⤒</span>
                    <span className="text-[8px] uppercase tracking-widest opacity-70 mt-0.5">Jump</span>
                </button>
            </div>
        </div>
    );
}
