'use client';

import type { useJoystick } from '@/components/game/controls/useJoystick';

type Joy = ReturnType<typeof useJoystick>;

interface Props {
    radius: number;
    joy: Joy;
    accent?: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function JoystickVisual({ radius, joy, accent = 'rgba(251,191,36,0.65)', className = '', style }: Props) {
    const { baseRef, knob, bind } = joy;
    return (
        <div
            ref={baseRef}
            {...bind}
            className={`relative rounded-full border border-white/15 bg-black/35 backdrop-blur-md pointer-events-auto ${className}`}
            style={{
                width: radius * 2,
                height: radius * 2,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.45)',
                touchAction: 'none',
                ...style,
            }}
        >
            <div
                className="absolute rounded-full"
                style={{
                    width: '42%',
                    height: '42%',
                    left: '29%',
                    top: '29%',
                    background: accent,
                    border: '1px solid rgba(251,191,36,0.85)',
                    boxShadow: '0 0 14px rgba(251,191,36,0.45)',
                    transform: `translate(${knob.x}px, ${knob.y}px)`,
                }}
            />
        </div>
    );
}