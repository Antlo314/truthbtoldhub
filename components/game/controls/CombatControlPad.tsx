'use client';

import { useEffect, useRef, useState } from 'react';
import JoystickVisual from '@/components/game/controls/JoystickVisual';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';
import type { useJoystick } from '@/components/game/controls/useJoystick';
import { COMBAT_ACTION, COMBAT_BAR_H, DESKTOP_HINT_BAR_H } from '@/lib/game/controls';
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
    stamPct: number;
    charge: number;       // 0..1 heavy charge
    combo: number;
    empowered: boolean;   // riposte / counter ready
    parryReady: boolean;
    onStrikeDown: () => void;
    onStrikeUp: () => void;
    onParry: () => void;
    onDodge: () => void;
    onAbility: (id: string) => void;
}

export default function CombatControlPad({
    profile, joy, joyRadius, pathColor, abilities, dodgeCd,
    stamPct, charge, combo, empowered, parryReady,
    onStrikeDown, onStrikeUp, onParry, onDodge, onAbility,
}: Props) {
    const large = loadSettings().controlSize === 'large';
    const strikeSize = large ? COMBAT_ACTION + 10 : COMBAT_ACTION;
    const sideSize = large ? 54 : 46;

    // ---- auto-fade when idle: the pad dims so the arena breathes, snaps back on touch ----
    const [idle, setIdle] = useState(false);
    const [narrow, setNarrow] = useState(false);
    const abSize = narrow ? 34 : 38;
    const idleTimer = useRef<any>(null);

    useEffect(() => {
        const check = () => setNarrow(window.innerWidth < 380);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const wake = () => {
        setIdle(false);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setIdle(true), 2600);
    };
    useEffect(() => {
        wake();
        const onAny = () => wake();
        window.addEventListener('touchstart', onAny, { passive: true });
        window.addEventListener('mousedown', onAny);
        return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            window.removeEventListener('touchstart', onAny);
            window.removeEventListener('mousedown', onAny);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- reliable strike press/release (release must fire even if the finger slides off) ----
    const pressed = useRef(false);
    const press = () => { if (pressed.current) return; pressed.current = true; unlockAudio(); wake(); onStrikeDown(); };
    const release = () => { if (!pressed.current) return; pressed.current = false; onStrikeUp(); };
    useEffect(() => {
        const up = () => release();
        window.addEventListener('touchend', up);
        window.addEventListener('touchcancel', up);
        window.addEventListener('mouseup', up);
        window.addEventListener('blur', up);
        return () => {
            window.removeEventListener('touchend', up);
            window.removeEventListener('touchcancel', up);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('blur', up);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (profile === 'keyboard') {
        const abilityHints = abilities.slice(0, 4).map((ab, i) => ({ keys: [String(i + 1)], label: ab.name }));
        return (
            <div
                className="absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none px-4"
                style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))', minHeight: DESKTOP_HINT_BAR_H + 16 }}
            >
                <KeyboardHintBar
                    hints={[
                        { keys: ['W', 'A', 'S', 'D'], label: 'Move' },
                        { keys: ['J'], label: 'Strike · hold = Heavy' },
                        { keys: ['K'], label: 'Parry' },
                        { keys: ['Shift', 'L'], label: 'Dodge' },
                        ...abilityHints,
                    ]}
                />
            </div>
        );
    }

    // charge ring geometry
    const r = strikeSize / 2 - 3;
    const circ = 2 * Math.PI * r;
    const tooTired = stamPct < 12;

    return (
        <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px] pointer-events-none transition-opacity duration-500"
            style={{ height: COMBAT_BAR_H, opacity: idle ? 0.32 : 1 }}
        >
            <JoystickVisual
                radius={joyRadius}
                joy={joy}
                className="absolute left-3 opacity-70"
                style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            />

            {/* Ability chips — small + translucent, stacked on the right edge just
                ABOVE the dodge button so they never spill into the arena. */}
            {abilities.length > 0 && (
                <div
                    className="absolute flex flex-col gap-1 items-center pointer-events-auto"
                    style={{ right: '0.4rem', bottom: `calc(${strikeSize + sideSize + 24}px + 1rem + env(safe-area-inset-bottom))`, touchAction: 'none' }}
                >
                    {abilities.slice(0, 4).map((ab) => {
                        const isSuper = ab.cooldownSec >= 22;
                        return (
                            <button
                                key={ab.id}
                                onClick={() => { unlockAudio(); wake(); onAbility(ab.id); }}
                                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); wake(); onAbility(ab.id); }}
                                disabled={ab.cd > 0}
                                className="shrink-0 rounded-full text-[7px] font-black uppercase tracking-tight text-white flex flex-col items-center justify-center active:scale-95 transition-transform disabled:opacity-30 px-0.5 text-center leading-none"
                                style={{
                                    width: abSize, height: abSize,
                                    background: isSuper ? `linear-gradient(135deg, ${pathColor} 0%, ${pathColor}88 100%)` : `linear-gradient(135deg, ${pathColor}bb 0%, ${pathColor}55 100%)`,
                                    boxShadow: `0 0 10px ${pathColor}33`,
                                    color: isSuper ? '#0a0a0a' : '#fff',
                                    touchAction: 'none',
                                }}
                            >
                                {ab.cd > 0 ? <span className="text-[10px]">{Math.ceil(ab.cd)}</span> : ab.name.slice(0, 5)}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Dodge — above the strike */}
            <button
                onClick={() => { unlockAudio(); wake(); onDodge(); }}
                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); wake(); onDodge(); }}
                disabled={dodgeCd > 0}
                className="absolute rounded-full text-[9px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform pointer-events-auto disabled:opacity-35"
                style={{
                    width: sideSize, height: sideSize,
                    right: `calc(0.75rem + ${(strikeSize - sideSize) / 2}px)`,
                    bottom: `calc(${strikeSize + 14}px + 1rem + env(safe-area-inset-bottom))`,
                    background: 'linear-gradient(135deg,#67e8f9 0%,#0e7490 100%)',
                    boxShadow: '0 0 14px rgba(34,211,238,0.35)', touchAction: 'none',
                }}
            >
                Dodge
            </button>

            {/* Parry — to the left of the strike */}
            <button
                onClick={() => { unlockAudio(); wake(); onParry(); }}
                onTouchStart={(e) => { e.preventDefault(); unlockAudio(); wake(); onParry(); }}
                className="absolute rounded-full text-[9px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
                style={{
                    width: sideSize, height: sideSize,
                    right: `calc(0.75rem + ${strikeSize + 12}px)`,
                    bottom: 'calc(1rem + env(safe-area-inset-bottom))',
                    background: parryReady ? 'linear-gradient(135deg,#a5f3fc 0%,#0891b2 100%)' : 'linear-gradient(135deg,#334155 0%,#1e293b 100%)',
                    boxShadow: parryReady ? '0 0 14px rgba(103,232,249,0.45)' : 'none',
                    opacity: parryReady ? 1 : 0.5, color: parryReady ? '#06202b' : '#94a3b8', touchAction: 'none',
                }}
            >
                Parry
            </button>

            {/* Strike — tap = light, hold = charge a heavy. Charge ring + combo badge. */}
            <div
                className="absolute pointer-events-auto"
                style={{ width: strikeSize, height: strikeSize, right: '0.75rem', bottom: 'calc(1rem + env(safe-area-inset-bottom))', touchAction: 'none' }}
            >
                <svg width={strikeSize} height={strikeSize} className="absolute inset-0 pointer-events-none" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={strikeSize / 2} cy={strikeSize / 2} r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3} />
                    {charge > 0.02 && (
                        <circle
                            cx={strikeSize / 2} cy={strikeSize / 2} r={r} fill="none"
                            stroke={charge >= 0.99 ? '#f97316' : '#fcd34d'} strokeWidth={3.5} strokeLinecap="round"
                            strokeDasharray={circ} strokeDashoffset={circ * (1 - charge)}
                        />
                    )}
                </svg>
                <button
                    onTouchStart={(e) => { e.preventDefault(); press(); }}
                    onTouchEnd={(e) => { e.preventDefault(); release(); }}
                    onTouchCancel={() => release()}
                    onMouseDown={() => press()}
                    className="absolute inset-[3px] rounded-full text-[11px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform"
                    style={{
                        background: empowered ? 'linear-gradient(135deg,#fde68a 0%,#f59e0b 100%)' : 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)',
                        boxShadow: empowered ? '0 0 26px rgba(252,211,77,0.7)' : '0 0 18px rgba(251,191,36,0.4)',
                        opacity: tooTired ? 0.55 : 1, touchAction: 'none',
                    }}
                >
                    {empowered ? 'Riposte' : 'Strike'}
                </button>
                {combo > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black/80 border border-amber-300/60 text-amber-200 text-[9px] font-black flex items-center justify-center pointer-events-none">
                        ×{combo}
                    </span>
                )}
            </div>
        </div>
    );
}
