'use client';

import JoystickVisual from '@/components/game/controls/JoystickVisual';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';
import type { useJoystick } from '@/components/game/controls/useJoystick';
import { MOBILE_ACTION, MOBILE_BAR_H, DESKTOP_HINT_BAR_H } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import type { InputProfile } from '@/lib/game/platform';

type Joy = ReturnType<typeof useJoystick>;

interface NearPOI {
    name: string;
    type: string;
}

interface Props {
    profile: InputProfile;
    joy: Joy;
    joyRadius: number;
    near: NearPOI | null;
    onInteract: () => void;
}

export default function WorldControlPad({ profile, joy, joyRadius, near, onInteract }: Props) {
    const large = loadSettings().controlSize === 'large';
    const action = large ? 84 : MOBILE_ACTION;

    if (profile === 'keyboard') {
        return (
            <div
                className="absolute inset-x-0 bottom-0 z-10 flex justify-center pointer-events-none px-4 lg:px-8"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', minHeight: DESKTOP_HINT_BAR_H + 20 }}
            >
                <KeyboardHintBar
                    hints={[
                        { keys: ['W', 'A', 'S', 'D'], label: 'Move' },
                        { keys: ['E'], label: 'Interact' },
                    ]}
                />
                {near && (
                    <div className="absolute right-8 top-1 pointer-events-none hidden lg:block max-w-[min(14rem,28vw)] text-right">
                        <span className="text-[9px] uppercase tracking-[0.18em] text-amber-300/90 font-mono leading-snug break-words text-pretty inline-block">
                            ◆ {near.name}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    const interactLabel = near
        ? (near.type === 'hut' ? 'Enter' : near.type === 'cave' ? 'Descend' : near.type === 'portal' ? 'Step through' : 'Speak')
        : '';

    return (
        <div
            className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[540px] pointer-events-none"
            style={{ height: MOBILE_BAR_H }}
        >
            <JoystickVisual
                radius={joyRadius}
                joy={joy}
                className="absolute left-4"
                style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            />
            {near && (
                <button
                    onPointerDown={(e) => { e.preventDefault(); onInteract(); }}
                    className="absolute right-4 rounded-full text-[11px] font-black uppercase tracking-widest text-black flex flex-col items-center justify-center text-center animate-pulse pointer-events-auto active:scale-95 transition-transform"
                    style={{
                        width: action,
                        height: action,
                        bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
                        background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)',
                        boxShadow: '0 0 28px rgba(251,191,36,0.45)',
                        touchAction: 'none',
                    }}
                >
                    <span className="text-[8px] opacity-70 leading-none mb-0.5 shrink-0">{interactLabel}</span>
                    <span
                        className="leading-[1.15] px-1.5 text-center break-words hyphens-auto text-pretty max-w-[88%]"
                        style={{ fontSize: near.name.length > 22 ? '7px' : near.name.length > 14 ? '8px' : '10px' }}
                    >
                        {near.name}
                    </span>
                </button>
            )}
        </div>
    );
}