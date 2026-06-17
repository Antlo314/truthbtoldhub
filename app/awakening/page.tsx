'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store/useGameStore';
import CinematicVideo from '@/components/game/CinematicVideo';
import TruthSprite from '@/components/game/TruthSprite';
import { CINEMA } from '@/lib/game/cutscenes';

interface Line {
    t: string;
    name?: boolean;
}

const LINES: Line[] = [
    { t: 'So… you are awake.' },
    { t: 'Most never open their eyes. They live and die inside a dream the world built for them — and they call it freedom.' },
    { t: 'But something in you stirred. That is why you are here, and not still sleeping.' },
    { t: 'I am Truth. I will walk beside you — every step of the way back to the Source.' },
    { t: 'Before we take the first step… what shall I call you?', name: true },
];

function Typewriter({
    text,
    speed = 16,
    reveal,
    onDone,
}: {
    text: string;
    speed?: number;
    reveal: boolean;
    onDone: () => void;
}) {
    const [n, setN] = useState(0);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const fired = useRef(false);

    useEffect(() => {
        fired.current = false;
        setN(0);
    }, [text]);

    useEffect(() => {
        if (reveal) {
            setN(text.length);
            return;
        }
        if (n >= text.length) return;
        const id = setTimeout(() => setN((v) => v + 1), speed);
        return () => clearTimeout(id);
    }, [n, text, reveal, speed]);

    const done = n >= text.length;
    useEffect(() => {
        if (done && !fired.current) {
            fired.current = true;
            onDoneRef.current();
        }
    }, [done]);

    return (
        <span>
            {text.slice(0, n)}
            {!done && <span className="awaken-caret">▌</span>}
        </span>
    );
}

export default function AwakeningPage() {
    const router = useRouter();
    const setName = useGameStore((s) => s.setName);
    const completeAwakening = useGameStore((s) => s.completeAwakening);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [lineIndex, setLineIndex] = useState(0);
    const [typingDone, setTypingDone] = useState(false);
    const [reveal, setReveal] = useState(false);
    const [named, setNamed] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [finalName, setFinalName] = useState('');

    useEffect(() => { setMounted(true); }, []);

    const current = LINES[lineIndex];

    const advance = useCallback(() => {
        if (!typingDone) {
            setReveal(true);
            return;
        }
        if (named) return;
        if (current?.name) return;
        if (lineIndex < LINES.length - 1) {
            setLineIndex((i) => i + 1);
            setTypingDone(false);
            setReveal(false);
        }
    }, [typingDone, named, current, lineIndex]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === 'INPUT') return;
                e.preventDefault();
                advance();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [advance]);

    const submitName = (e?: React.FormEvent) => {
        e?.preventDefault();
        const clean = nameInput.trim().slice(0, 24);
        if (!clean) return;
        setName(clean);
        setFinalName(clean);
        setNamed(true);
        setTypingDone(false);
        setReveal(false);
    };

    const stepIntoLight = () => {
        completeAwakening();
        saveToCloud();
        router.push('/awakening/create');
    };

    const skip = () => {
        setLineIndex(LINES.length - 1);
        setReveal(true);
    };

    if (!mounted) return <div className="bg-black" style={{ height: '100dvh' }} />;

    return (
        <main className="relative bg-black text-white overflow-hidden flex flex-col select-none" style={{ height: '100dvh' }}>
            <CinematicVideo src={CINEMA.awakening} overlay="medium" showMuteControl />

            {!named && (
                <button
                    onClick={skip}
                    className="absolute top-5 right-6 z-30 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-aether-gold transition-colors"
                >
                    skip ▸
                </button>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative z-30 flex flex-1 min-h-0 flex-col justify-end px-4 pb-7"
            >
                <div
                    onClick={advance}
                    className="w-full max-w-2xl mx-auto glass-panel rounded-2xl p-6 md:p-8 cursor-pointer border border-[rgba(251,191,36,0.12)] bg-black/40 backdrop-blur-md"
                >
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="relative shrink-0 truth-float" style={{ width: 48, height: 72 }}>
                                    <div className="absolute left-1/2 top-1/2 rounded-full pointer-events-none" style={{ width: 56, height: 56, transform: 'translate(-50%,-45%)', background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 68%)' }} />
                                    <TruthSprite scale={3} style={{ position: 'relative', margin: '0 auto', display: 'block' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-aether-gold">Truth</span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-[rgba(251,191,36,0.4)] to-transparent" />
                                    </div>
                                    <p className="font-ritual text-lg md:text-2xl leading-relaxed text-white/90 min-h-[3.5em]">
                                        {!named ? (
                                            <Typewriter key={lineIndex} text={current.t} reveal={reveal} onDone={() => setTypingDone(true)} />
                                        ) : (
                                            <Typewriter
                                                key="post"
                                                text={`${finalName}. Yes — that name will mean something before the end.`}
                                                reveal={reveal}
                                                onDone={() => setTypingDone(true)}
                                            />
                                        )}
                                    </p>
                                </div>
                            </div>

                            {!named && current?.name && typingDone && (
                                <form onSubmit={submitName} className="mt-5 flex flex-col sm:flex-row gap-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        autoFocus
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        maxLength={24}
                                        placeholder="speak your name"
                                        className="flex-1 bg-black/50 border border-[rgba(251,191,36,0.25)] rounded-lg px-4 py-3 text-base text-white tracking-wide focus:outline-none focus:border-aether-gold transition-colors font-ritual"
                                    />
                                    <button
                                        type="submit"
                                        className="px-6 py-3 rounded-lg text-[11px] font-black uppercase tracking-[0.25em] text-black"
                                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                    >
                                        Name Yourself
                                    </button>
                                </form>
                            )}

                            {!named && !current?.name && typingDone && lineIndex < LINES.length - 1 && (
                                <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/30 animate-pulse">▸ click to continue</div>
                            )}

                            {named && typingDone && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); stepIntoLight(); }}
                                    className="mt-6 w-full sm:w-auto px-8 py-3 rounded-lg text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.02]"
                                    style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                >
                                    Step into the light →
                                </button>
                            )}
                </div>
            </motion.div>
        </main>
    );
}