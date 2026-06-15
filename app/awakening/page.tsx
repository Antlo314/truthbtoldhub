'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import { useGameStore } from '@/lib/store/useGameStore';

// ============================================================
//  CHAPTER I — THE AWAKENING  (first-person POV)
//  The screen IS your vision. Black -> your eyelids part open over
//  the camera, groggy blinks, vision focuses from blur to clear ->
//  Truth speaks -> he asks your name.
//  Character art (Truth's sprite) will be a Kenney sprite dropped
//  into the marked slot below; nothing fake is rendered until then.
// ============================================================

type Phase = 'waking' | 'scene';

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

// ---- typewriter ----
function Typewriter({
    text,
    speed = 30,
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

    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState<Phase>('waking');
    const [focused, setFocused] = useState(false);
    const [lineIndex, setLineIndex] = useState(0);
    const [typingDone, setTypingDone] = useState(false);
    const [reveal, setReveal] = useState(false);
    const [named, setNamed] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [finalName, setFinalName] = useState('');

    const droneRef = useRef<Howl | null>(null);

    const startAudio = useCallback(() => {
        if (droneRef.current) return;
        try {
            const drone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0,
            });
            drone.play(); // Howler resumes on first gesture if autoplay is blocked
            drone.fade(0, 0.22, 4000);
            droneRef.current = drone;
        } catch {
            /* audio is optional */
        }
    }, []);

    // mount: reveal scene, start ambient audio
    useEffect(() => {
        setMounted(true);
        startAudio();
        const onFirst = () => startAudio();
        window.addEventListener('pointerdown', onFirst, { once: true });
        return () => {
            window.removeEventListener('pointerdown', onFirst);
            droneRef.current?.stop();
        };
    }, [startAudio]);

    // the waking cinematic: lids open over ~4.4s, vision focuses, then the scene
    useEffect(() => {
        if (!mounted) return;
        const t1 = setTimeout(() => setFocused(true), 2800);
        const t2 = setTimeout(() => setPhase('scene'), 4400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [mounted]);

    const current = LINES[lineIndex];

    const advance = useCallback(() => {
        if (phase !== 'scene') return;
        if (!typingDone) {
            setReveal(true); // click while typing -> reveal full line
            return;
        }
        if (named) return;
        if (current?.name) return; // name line waits for the input
        if (lineIndex < LINES.length - 1) {
            setLineIndex((i) => i + 1);
            setTypingDone(false);
            setReveal(false);
        }
    }, [phase, typingDone, named, current, lineIndex]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (phase === 'scene' && (e.key === 'Enter' || e.key === ' ')) {
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === 'INPUT') return;
                e.preventDefault();
                advance();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [advance, phase]);

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
        router.push('/awakening/create');
    };

    const skip = () => {
        setPhase('scene');
        setFocused(true);
        setLineIndex(LINES.length - 1);
        setReveal(true);
    };

    if (!mounted) return <div className="fixed inset-0 bg-black" />;

    return (
        <div className="pov-root select-none">
            {/* skip */}
            {!named && (
                <button
                    onClick={skip}
                    className="absolute top-5 right-6 z-30 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-aether-gold transition-colors"
                >
                    skip ▸
                </button>
            )}

            {/* the vision behind your eyelids — focuses from blur to clear */}
            <div className={`pov-vision ${focused ? 'focused' : ''}`} />

            {/* ===== Truth's sprite slot — a Kenney sprite will stand here in first person =====
                (intentionally empty until the Kenney art is wired in) */}

            {/* dialogue */}
            <AnimatePresence>
                {phase === 'scene' && (
                    <motion.div
                        key="scene"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0 z-30"
                    >
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-7 flex justify-center">
                            <div
                                onClick={advance}
                                className="w-full max-w-2xl glass-panel rounded-2xl p-6 md:p-8 cursor-pointer border border-[rgba(251,191,36,0.12)]"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-aether-gold">Truth</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-[rgba(251,191,36,0.4)] to-transparent" />
                                </div>

                                <p className="font-ritual text-lg md:text-2xl leading-relaxed text-white/90 min-h-[3.5em]">
                                    {!named ? (
                                        <Typewriter
                                            key={lineIndex}
                                            text={current.t}
                                            reveal={reveal}
                                            onDone={() => setTypingDone(true)}
                                        />
                                    ) : (
                                        <Typewriter
                                            key="post"
                                            text={`${finalName}. Yes — that name will mean something before the end.`}
                                            reveal={reveal}
                                            onDone={() => setTypingDone(true)}
                                        />
                                    )}
                                </p>

                                {/* name input */}
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

                                {/* continue hint */}
                                {!named && !current?.name && typingDone && lineIndex < LINES.length - 1 && (
                                    <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/30 animate-pulse">▸ click to continue</div>
                                )}

                                {/* step into the light */}
                                {named && typingDone && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            stepIntoLight();
                                        }}
                                        className="mt-6 w-full sm:w-auto px-8 py-3 rounded-lg text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.02]"
                                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                    >
                                        Step into the light →
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* peripheral vignette — keeps the eye-aperture feel even when open */}
            <div className="pov-vignette" />

            {/* the eyelids themselves, framing your vision */}
            <div className={`pov-lids ${phase === 'waking' ? 'pov-lids-in' : ''}`}>
                <div className="pov-lid pov-lid-top" />
                <div className="pov-lid pov-lid-bottom" />
            </div>
        </div>
    );
}
