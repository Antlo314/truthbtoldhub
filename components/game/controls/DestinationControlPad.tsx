'use client';

import JoystickVisual from '@/components/game/controls/JoystickVisual';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';
import type { useJoystick } from '@/components/game/controls/useJoystick';
import { MOBILE_ACTION, MOBILE_BAR_H, DESKTOP_HINT_BAR_H } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import type { InputProfile } from '@/lib/game/platform';

type Joy = ReturnType<typeof useJoystick>;

interface Props {
    profile: InputProfile;
    joy: Joy;
    joyRadius: number;
    accent?: string;
    actionLabel: string;
    actionDisabled?: boolean;
    onAction: () => void;
    hint?: string;
}

export default function DestinationControlPad({
    profile, joy, joyRadius, accent = 'rgba(34, 211, 238, 0.65)', actionLabel, actionDisabled, onAction, hint,
}: Props) {
    const large = loadSettings().controlSize === 'large';
    const action = large ? 84 : MOBILE_ACTION;

    if (profile === 'keyboard') {
        return (
            <div className="w-full flex flex-col items-center gap-2 -mt-1">
                <KeyboardHintBar
                    hints={[
                        { keys: ['W', 'A', 'S', 'D'], label: 'Move' },
                        { keys: ['J', 'Space'], label: actionLabel },
                    ]}
                    className="max-w-[520px]"
                />
                {hint && <p className="text-[8px] uppercase tracking-widest text-zinc-500 text-center px-2">{hint}</p>}
            </div>
        );
    }

    return (
        <>
            <div
                className="w-full max-w-[520px] h-32 relative pointer-events-none flex items-center justify-between mx-auto"
                style={{ minHeight: MOBILE_BAR_H - 80 }}
            >
                <JoystickVisual
                    radius={joyRadius}
                    joy={joy}
                    accent={accent}
                    className="ml-1"
                />
                <button
                    onClick={onAction}
                    onTouchStart={(e) => { e.preventDefault(); onAction(); }}
                    disabled={actionDisabled}
                    className="mr-1 rounded-full text-[10px] font-black uppercase tracking-widest text-black border pointer-events-auto flex items-center justify-center active:scale-95 transition-transform disabled:opacity-35"
                    style={{
                        width: action,
                        height: action,
                        background: accent.includes('34') ? '#22d3ee' : accent.includes('16') ? '#34d399' : '#22d3ee',
                        borderColor: 'rgba(255,255,255,0.2)',
                        touchAction: 'none',
                    }}
                >
                    {actionLabel}
                </button>
            </div>
            {hint && <p className="text-[8px] uppercase tracking-widest text-zinc-500 text-center px-2 -mt-1">{hint}</p>}
        </>
    );
}