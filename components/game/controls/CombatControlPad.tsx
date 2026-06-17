'use client';

import JoystickVisual from '@/components/game/controls/JoystickVisual';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';
import type { useJoystick } from '@/components/game/controls/useJoystick';
import { MOBILE_ACTION, MOBILE_BAR_H, DESKTOP_HINT_BAR_H } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import type { InputProfile } from '@/lib/game/platform';
import { unlockAudio } from '@/lib/game/sfx';

type Joy = ReturnType<typeof useJoystick>;

interface AbilityBtn {
    id: string;
    name: string;
    cooldownSec: number;
    cd: number;
}

interface Props {
    profile: InputProfile;
    joy: Joy;
    joyRadius: number;
    pathColor: string;
    abilities: AbilityBtn[];
    dodgeCd: number;
    onStrike: () => void;
    onDodge: () => void;
    onAbility: (id: string) => void;
}

export default function CombatControlPad({
    profile, joy, joyRadius, pathColor, abilities, dodgeCd, onStrike, onDodge, onAbility,
}: Props) {
    const large = loadSettings().controlSize === 'large';
    const strikeSize = large ? 84 : MOBILE_ACTION;
    const dodgeSize = large ? 68 : 68;

    if (profile === 'keyboard') {
        const abilityHints = abilities.slice(0, 4).map((ab, i) => ({
            keys: [String(i + 1)],
            label: ab.name,
        }));
        return (
            <div
                className="absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none px-4"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', minHeight: DESKTOP_HINT_BAR_H + 16 }}
            >
                <KeyboardHintBar
                    hints={[
                        { keys: ['W', 'A', 'S', 'D'], label: 'Move' },
                        { keys: ['J'], label: 'Strike' },
                        { keys: ['Shift'], label: 'Dodge' },
                        ...abilityHints,
                    ]}
                />
            </div>
        );
    }

    return (
        <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[540px] pointer-events-none"
            style={{ height: MOBILE_BAR_H }}
        >
            <JoystickVisual
                radius={joyRadius}
                joy={joy}
                className="absolute left-4"
                style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            />

            {abilities.length > 0 && (
                <div
                    className="absolute flex gap-2.5 items-end pointer-events-auto max-w-[55%] overflow-x-auto"
                    style={{ right: '5.5rem', bottom: 'calc(1.5rem + env(safe-area-inset-bottom))', touchAction: 'none' }}
                >
                    {abilities.map((ab) => {
                        const isSuper = ab.cooldownSec >= 22;
                        return (
                            <button
                                key={ab.id}
                                onClick={() => { unlockAudio(); onAbility(ab.id); }}
                                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); onAbility(ab.id); }}
                                disabled={ab.cd > 0}
                                className="shrink-0 rounded-full text-[8px] font-black uppercase tracking-wide text-white flex flex-col items-center justify-center active:scale-95 transition-transform disabled:opacity-35 px-1 text-center leading-tight"
                                style={{
                                    width: 64,
                                    height: 64,
                                    background: isSuper ? `linear-gradient(135deg, ${pathColor} 0%, ${pathColor}88 100%)` : `linear-gradient(135deg, ${pathColor}cc 0%, ${pathColor}66 100%)`,
                                    boxShadow: `0 0 16px ${pathColor}44`,
                                    color: isSuper ? '#0a0a0a' : '#fff',
                                    touchAction: 'none',
                                }}
                            >
                                {ab.name}
                                {ab.cd > 0 && <span className="text-[7px] mt-0.5 opacity-80">{Math.ceil(ab.cd)}s</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            <button
                onClick={() => { unlockAudio(); onDodge(); }}
                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); onDodge(); }}
                disabled={dodgeCd > 0}
                className="absolute right-4 rounded-full text-[10px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform pointer-events-auto disabled:opacity-40"
                style={{
                    width: dodgeSize,
                    height: dodgeSize,
                    bottom: 'calc(6.5rem + env(safe-area-inset-bottom))',
                    background: 'linear-gradient(135deg,#67e8f9 0%,#0e7490 100%)',
                    boxShadow: '0 0 20px rgba(34,211,238,0.4)',
                    touchAction: 'none',
                }}
            >
                Dodge
            </button>
            <button
                onClick={() => { unlockAudio(); onStrike(); }}
                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); onStrike(); }}
                className="absolute right-4 rounded-full text-[12px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
                style={{
                    width: strikeSize,
                    height: strikeSize,
                    bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
                    background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)',
                    boxShadow: '0 0 28px rgba(251,191,36,0.45)',
                    touchAction: 'none',
                }}
            >
                Strike
            </button>
        </div>
    );
}