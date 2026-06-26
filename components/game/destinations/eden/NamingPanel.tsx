'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Delete, X, Check, Sparkles } from 'lucide-react';
import type { EdenCreature } from '@/lib/game/eden/types';
import { checkCreatureName } from '@/lib/game/eden/bestiary';

interface Props {
    creature: EdenCreature;
    onName: (creatureId: string) => void;
    onClose: () => void;
    accent?: string;
}

export default function NamingPanel({ creature, onName, onClose, accent = '#34d399' }: Props) {
    const [guess, setGuess] = useState('');
    const [shake, setShake] = useState(false);
    const [wrongMsg, setWrongMsg] = useState(false);
    const [solved, setSolved] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const gold = '#fbbf24';

    // Stable shuffle of the letter bank for the life of this panel.
    const bank = useMemo(() => {
        const arr = creature.letters.map((ch, i) => ({ ch, key: `${ch}-${i}` }));
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, [creature.letters]);

    useEffect(() => {
        // Focus the typing input on desktop (fine pointer) so physical-keyboard
        // play works; skip on touch so the soft keyboard doesn't pop — there the
        // on-screen letter bank is the primary input.
        if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches) {
            inputRef.current?.focus();
        }
        return () => {
            if (shakeTimer.current) clearTimeout(shakeTimer.current);
        };
    }, []);

    const appendLetter = useCallback((ch: string) => {
        if (solved) return;
        setWrongMsg(false);
        setGuess((g) => g + ch);
    }, [solved]);

    const backspace = useCallback(() => {
        setWrongMsg(false);
        setGuess((g) => g.slice(0, -1));
    }, []);

    const clearGuess = useCallback(() => {
        setWrongMsg(false);
        setGuess('');
    }, []);

    const submit = useCallback(() => {
        if (solved || !guess.trim()) return;
        if (checkCreatureName(creature, guess)) {
            setSolved(true);
        } else {
            setWrongMsg(true);
            setShake(true);
            if (shakeTimer.current) clearTimeout(shakeTimer.current);
            shakeTimer.current = setTimeout(() => setShake(false), 480);
        }
    }, [solved, guess, creature]);

    const handleContinue = useCallback(() => {
        onName(creature.id);
        onClose();
    }, [onName, onClose, creature.id]);

    const giftsSkill = !!creature.reward?.skillPoint;

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{
                padding: 'max(env(safe-area-inset-top), 16px) 14px max(env(safe-area-inset-bottom), 16px)',
                background: 'rgba(0,0,0,0.74)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes edenBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
                @keyframes edenShake { 10%,90% { transform: translateX(-2px) } 20%,80% { transform: translateX(4px) } 30%,50%,70% { transform: translateX(-7px) } 40%,60% { transform: translateX(7px) } }
                @keyframes edenRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
                @keyframes edenGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
            `}</style>

            <div
                className="glass-panel rounded-2xl border bg-black/60 backdrop-blur-md"
                style={{
                    width: '100%',
                    maxWidth: 360,
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    borderColor: solved ? 'rgba(251,191,36,0.45)' : 'rgba(52,211,153,0.28)',
                    boxShadow: `0 0 0 1px ${solved ? gold : accent}22, 0 24px 60px -20px ${solved ? gold : accent}55`,
                    animation: shake ? 'edenShake 0.46s both' : 'edenRise 0.28s ease both',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <div className="flex items-center justify-between px-4 pt-3">
                    <span
                        className="uppercase font-semibold"
                        style={{ fontSize: 'clamp(7px,2vw,9px)', letterSpacing: '0.22em', color: solved ? gold : accent }}
                    >
                        {solved ? 'Named' : 'Name the Creature'}
                    </span>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        className="flex items-center justify-center rounded-lg text-white/55 hover:text-white/90 active:scale-95 transition"
                        style={{ width: 30, height: 30 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Glyph */}
                <div className="flex justify-center pt-2 pb-1">
                    <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                            width: 92,
                            height: 92,
                            fontSize: 52,
                            lineHeight: 1,
                            animation: 'edenBob 2.6s ease-in-out infinite',
                            background: `radial-gradient(circle at 50% 45%, ${(solved ? gold : accent)}26, transparent 70%)`,
                            filter: solved ? `drop-shadow(0 0 14px ${gold}aa)` : `drop-shadow(0 0 10px ${accent}66)`,
                        }}
                    >
                        <span aria-hidden>{creature.glyph}</span>
                    </div>
                </div>

                {!solved ? (
                    <div className="px-4 pb-4">
                        {/* Clue */}
                        <p
                            className="text-center italic text-white/70"
                            style={{ fontSize: 'clamp(10px,3vw,12px)', lineHeight: 1.5 }}
                        >
                            {creature.clue}
                        </p>

                        {/* Masked target pattern */}
                        <div
                            className="mt-3 mb-1 text-center font-mono text-white/85"
                            style={{ fontSize: 'clamp(14px,5vw,18px)', letterSpacing: '0.18em' }}
                        >
                            {creature.masked}
                        </div>

                        {/* Built guess */}
                        <div
                            className="mx-auto mt-2 flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2"
                            style={{
                                borderColor: wrongMsg ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.14)',
                                background: 'rgba(0,0,0,0.35)',
                            }}
                        >
                            <span
                                className="font-mono font-semibold uppercase"
                                style={{
                                    fontSize: 'clamp(16px,6vw,22px)',
                                    letterSpacing: '0.22em',
                                    color: guess ? '#fff' : 'rgba(255,255,255,0.3)',
                                }}
                            >
                                {guess || '— — —'}
                            </span>
                        </div>

                        {/* Accessibility / free-typing fallback */}
                        <input
                            ref={inputRef}
                            value={guess}
                            onChange={(e) => { setWrongMsg(false); setGuess(e.target.value.toUpperCase()); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                            aria-label="Type the creature's name"
                            autoComplete="off"
                            spellCheck={false}
                            className="sr-only"
                            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                        />

                        {wrongMsg && (
                            <p
                                className="mt-2 text-center text-red-300/90"
                                style={{ fontSize: 'clamp(9px,2.6vw,11px)', letterSpacing: '0.04em' }}
                            >
                                That is not its name.
                            </p>
                        )}

                        {/* Letter bank */}
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                            {bank.map(({ ch, key }) => (
                                <button
                                    key={key}
                                    onClick={() => appendLetter(ch)}
                                    className="flex items-center justify-center rounded-lg border font-mono font-bold uppercase text-white/90 active:scale-90 transition-transform"
                                    style={{
                                        minWidth: 40,
                                        height: 42,
                                        fontSize: 'clamp(15px,4.5vw,19px)',
                                        borderColor: 'rgba(52,211,153,0.28)',
                                        background: 'linear-gradient(180deg, rgba(52,211,153,0.16), rgba(0,0,0,0.4))',
                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 0 ${accent}33`,
                                    }}
                                >
                                    {ch}
                                </button>
                            ))}
                        </div>

                        {/* Backspace / Clear */}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={backspace}
                                disabled={!guess}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/40 py-2 text-white/75 active:scale-95 transition disabled:opacity-35"
                                style={{ fontSize: 'clamp(9px,2.6vw,11px)', letterSpacing: '0.08em', minHeight: 38 }}
                            >
                                <Delete size={14} /> Back
                            </button>
                            <button
                                onClick={clearGuess}
                                disabled={!guess}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/40 py-2 text-white/75 active:scale-95 transition disabled:opacity-35"
                                style={{ fontSize: 'clamp(9px,2.6vw,11px)', letterSpacing: '0.08em', minHeight: 38 }}
                            >
                                <X size={14} /> Clear
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={submit}
                            disabled={!guess.trim()}
                            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold uppercase text-black active:scale-[0.98] transition disabled:opacity-40"
                            style={{
                                fontSize: 'clamp(10px,3vw,12px)',
                                letterSpacing: '0.14em',
                                minHeight: 44,
                                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                                boxShadow: `0 6px 18px -6px ${accent}aa`,
                            }}
                        >
                            <Sparkles size={15} /> Speak its name
                        </button>
                    </div>
                ) : (
                    /* Success state */
                    <div className="px-4 pb-4" style={{ animation: 'edenRise 0.32s ease both' }}>
                        <div className="flex items-center justify-center gap-2">
                            <Check size={18} style={{ color: gold }} />
                            <span
                                className="font-semibold uppercase text-white"
                                style={{ fontSize: 'clamp(16px,6vw,22px)', letterSpacing: '0.16em' }}
                            >
                                {creature.name}
                            </span>
                        </div>

                        <div
                            className="mt-3 rounded-xl border p-3"
                            style={{
                                borderColor: 'rgba(251,191,36,0.4)',
                                background: 'linear-gradient(180deg, rgba(251,191,36,0.12), rgba(0,0,0,0.45))',
                            }}
                        >
                            <p
                                className="text-center italic text-amber-100/90"
                                style={{ fontSize: 'clamp(10px,3vw,12px)', lineHeight: 1.55 }}
                            >
                                {creature.lore}
                            </p>

                            {giftsSkill && (
                                <div
                                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border py-1.5 font-semibold uppercase"
                                    style={{
                                        borderColor: 'rgba(251,191,36,0.45)',
                                        background: 'rgba(251,191,36,0.14)',
                                        color: gold,
                                        fontSize: 'clamp(9px,2.6vw,11px)',
                                        letterSpacing: '0.12em',
                                        animation: 'edenGlow 2s ease-in-out infinite',
                                    }}
                                >
                                    <Sparkles size={13} /> +1 Skill Point
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleContinue}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold uppercase text-black active:scale-[0.98] transition"
                            style={{
                                fontSize: 'clamp(10px,3vw,12px)',
                                letterSpacing: '0.14em',
                                minHeight: 44,
                                background: `linear-gradient(180deg, ${gold}, ${gold}cc)`,
                                boxShadow: `0 6px 18px -6px ${gold}aa`,
                            }}
                        >
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
