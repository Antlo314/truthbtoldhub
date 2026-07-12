'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store/useGameStore';
import CinematicVideo from '@/components/game/CinematicVideo';
import { CINEMA } from '@/lib/game/cutscenes';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { gameMusic } from '@/lib/game/music';
import DialogueBox from '@/components/sanctum/DialogueBox';
import SacredButton from '@/components/sanctum/SacredButton';
import { DURATION, EASE } from '@/lib/design/motion';

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

/**
 * Chapter I — The Stirring
 * Void → Truth → Naming → threshold into forging.
 */
export default function AwakeningPage() {
    const router = useRouter();
    const setName = useGameStore((s) => s.setName);
    const completeAwakening = useGameStore((s) => s.completeAwakening);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState<'void' | 'dialogue'>('void');
    const [lineIndex, setLineIndex] = useState(0);
    const [typingDone, setTypingDone] = useState(false);
    const [reveal, setReveal] = useState(false);
    const [named, setNamed] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [finalName, setFinalName] = useState('');

    usePageMusic('awakening_truth');

    useEffect(() => {
        setMounted(true);
        // Brief void hold — breath before Truth speaks
        const id = setTimeout(() => setPhase('dialogue'), 1400);
        return () => clearTimeout(id);
    }, []);

    // Duck BGM under each spoken line
    useEffect(() => {
        if (phase !== 'dialogue') return;
        gameMusic.duckForDialogue(3200, 0.32);
    }, [lineIndex, phase, named]);

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
        gameMusic.duckForDialogue(4000, 0.28);
    };

    const stepIntoLight = () => {
        gameMusic.playSting('soul_recognized');
        completeAwakening();
        saveToCloud();
        router.push('/awakening/create');
    };

    const skip = () => {
        setPhase('dialogue');
        setLineIndex(LINES.length - 1);
        setReveal(true);
        setTypingDone(true);
    };

    if (!mounted) return <div className="bg-black" style={{ height: '100dvh' }} />;

    const dialogueText = named
        ? `${finalName}. Yes — that name will mean something before the end.`
        : current.t;

    return (
        <main
            className="relative bg-black text-white overflow-hidden flex flex-col select-none"
            style={{ height: '100dvh' }}
        >
            <CinematicVideo src={CINEMA.awakening} overlay="heavy" showMuteControl />

            {/* Void phase — pure black breath */}
            <AnimatePresence>
                {phase === 'void' && (
                    <motion.div
                        key="void"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: DURATION.ritual, ease: EASE.breath }}
                        className="absolute inset-0 z-40 bg-black flex items-center justify-center pointer-events-none"
                    >
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.5, 0.35] }}
                            transition={{ duration: 1.2, ease: EASE.breath }}
                            className="text-[10px] uppercase tracking-[0.55em] text-white/30"
                        >
                            Breathe
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {!named && phase === 'dialogue' && (
                <button
                    type="button"
                    onClick={skip}
                    className="absolute top-5 right-6 z-30 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-aether-gold transition-colors"
                    style={{ paddingTop: 'env(safe-area-inset-top)' }}
                >
                    skip ▸
                </button>
            )}

            <div
                className="relative z-30 flex flex-1 min-h-0 flex-col justify-end px-4"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === 'dialogue' ? 1 : 0 }}
                    transition={{ duration: DURATION.threshold, ease: EASE.breath }}
                >
                    {phase === 'dialogue' && (
                        <DialogueBox
                            typewriter={{
                                text: dialogueText,
                                reveal,
                                onDone: () => setTypingDone(true),
                            }}
                            onClick={advance}
                            hint={
                                !named && !current?.name && typingDone && lineIndex < LINES.length - 1
                                    ? '▸ click or press space'
                                    : undefined
                            }
                        >
                            {!named && current?.name && typingDone && (
                                <form
                                    onSubmit={submitName}
                                    className="mt-5 flex flex-col sm:flex-row gap-3"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        autoFocus
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        maxLength={24}
                                        placeholder="speak your name"
                                        className="sacred-input flex-1"
                                        aria-label="Your name"
                                    />
                                    <SacredButton type="submit" size="md">
                                        Name Yourself
                                    </SacredButton>
                                </form>
                            )}

                            {named && typingDone && (
                                <div className="mt-6" onClick={(e) => e.stopPropagation()}>
                                    <SacredButton pulse size="md" onClick={stepIntoLight}>
                                        Step into the light →
                                    </SacredButton>
                                </div>
                            )}
                        </DialogueBox>
                    )}
                </motion.div>
            </div>
        </main>
    );
}
