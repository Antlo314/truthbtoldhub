'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Play, Zap, ShieldAlert, Cpu, Lock, Unlock } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- AUDIO ASSETS ---
const uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
const correctSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
const errorSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'], volume: 0.3 });
const alarmSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'], volume: 0.05, loop: true, rate: 0.8 });

type DifficultyLevel = 'INITIATE' | 'ARCHITECT' | 'SOVEREIGN';

interface DecryptionState {
    isPlaying: boolean;
    gameOver: boolean;
    level: DifficultyLevel;
    score: number;
    timeLeft: number;
    targetSequence: number[];
    currentInput: number[];
    earnedSP: number;
}

export default function TheTrial() {
    const router = useRouter();
    const [userAuth, setUserAuth] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Game State
    const [gameState, setGameState] = useState<DecryptionState>({
        isPlaying: false,
        gameOver: false,
        level: 'INITIATE',
        score: 0,
        timeLeft: 30,
        targetSequence: [],
        currentInput: [],
        earnedSP: 0
    });

    // Refs for GSAP
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<HTMLDivElement>(null);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    const playHover = () => uiHoverSfx.play();
    const playSuccess = () => correctSfx.play();
    const playError = () => errorSfx.play();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserAuth(user);
        };
        fetchUser();

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
            alarmSfx.stop();
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        if (gameState.isPlaying && gameState.timeLeft > 0) {
            timerInterval.current = setInterval(() => {
                setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
            }, 1000);

            if (gameState.timeLeft <= 10 && !alarmSfx.playing()) {
                alarmSfx.play();
                gsap.to(timerRef.current, { color: '#ef4444', scale: 1.1, yoyo: true, repeat: -1, duration: 0.5 });
            }
        } else if (gameState.timeLeft <= 0 && gameState.isPlaying) {
            triggerGameOver();
        }

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [gameState.isPlaying, gameState.timeLeft]);

    const generateSequence = (level: DifficultyLevel): number[] => {
        const length = level === 'INITIATE' ? 4 : level === 'ARCHITECT' ? 6 : 8;
        return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1); // 1-9
    };

    const startGame = (level: DifficultyLevel) => {
        playSuccess();
        setGameState({
            isPlaying: true,
            gameOver: false,
            level,
            score: 0,
            timeLeft: level === 'INITIATE' ? 30 : level === 'ARCHITECT' ? 45 : 60,
            targetSequence: generateSequence(level),
            currentInput: [],
            earnedSP: 0
        });
        alarmSfx.stop();
        if (timerRef.current) gsap.killTweensOf(timerRef.current);

        // Glitch Entrance
        if (gameContainerRef.current) {
            gsap.fromTo(gameContainerRef.current,
                { opacity: 0, scale: 0.9, filter: 'hue-rotate(90deg) blur(10px)' },
                { opacity: 1, scale: 1, filter: 'hue-rotate(0deg) blur(0px)', duration: 0.5, ease: 'power2.out' }
            );
        }
    };

    const handleInput = (num: number) => {
        if (!gameState.isPlaying || gameState.gameOver) return;

        playHover();
        const newInput = [...gameState.currentInput, num];
        const currentIndex = newInput.length - 1;

        // Check if correct so far
        if (newInput[currentIndex] !== gameState.targetSequence[currentIndex]) {
            // Wrong input!
            playError();
            gsap.fromTo(gameContainerRef.current,
                { x: -10 }, { x: 0, duration: 0.4, ease: "rough({ template: power0.none, strength: 8, points: 20, taper: 'none', randomize: true, clamp: false})" }
            );

            // Penalty: lose time and reset sequence
            setGameState(prev => ({
                ...prev,
                timeLeft: Math.max(0, prev.timeLeft - 3),
                currentInput: [],
                targetSequence: generateSequence(prev.level) // reroll sequence on fail
            }));
            return;
        }

        // Check if sequence completed
        if (newInput.length === gameState.targetSequence.length) {
            playSuccess();
            const points = gameState.level === 'INITIATE' ? 100 : gameState.level === 'ARCHITECT' ? 250 : 500;

            // Glitch flash for success
            gsap.fromTo(gameContainerRef.current,
                { backgroundColor: 'rgba(34, 197, 94, 0.3)' }, { backgroundColor: 'transparent', duration: 0.5 }
            );

            setGameState(prev => ({
                ...prev,
                score: prev.score + points,
                currentInput: [],
                targetSequence: generateSequence(prev.level),
                timeLeft: prev.timeLeft + (prev.level === 'INITIATE' ? 5 : 3) // Add bonus time
            }));
        } else {
            // Correct input, wait for more
            setGameState(prev => ({ ...prev, currentInput: newInput }));
        }
    };

    const triggerGameOver = () => {
        alarmSfx.stop();
        if (timerRef.current) gsap.killTweensOf(timerRef.current);

        const spYield = Math.floor(gameState.score / 10); // 10% conversion to SP

        setGameState(prev => ({
            ...prev,
            isPlaying: false,
            gameOver: true,
            earnedSP: spYield
        }));

        if (spYield > 0 && userAuth) {
            saveScore(spYield);
        }
    };

    const saveScore = async (earned: number) => {
        setSaving(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('soul_power').eq('id', userAuth.id).single();
            const newSP = (profile?.soul_power || 0) + earned;

            await supabase.from('profiles').update({ soul_power: newSP }).eq('id', userAuth.id);

            await supabase.from('transactions').insert([{
                profile_id: userAuth.id,
                amount: earned,
                transaction_type: 'DECRYPTION_YIELD',
                description: `Decryption Matrix execution (Score: ${gameState.score})`
            }]);
        } catch (err) {
            console.error("Failed to save score:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-zinc-950 text-green-500 selection:bg-green-500/30 font-mono flex flex-col items-center overflow-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            {/* Vignette */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#09090b_90%)] pointer-events-none"></div>

            {/* Header */}
            <header className="sticky top-0 w-full z-50 glass bg-black/80 backdrop-blur-xl px-4 py-4 flex justify-between items-center border-b border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                <button onClick={() => router.push('/sanctum')} className="text-green-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 animate-pulse text-green-400" />
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold tracking-widest text-white drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                            ENCRYPTED SANDBOX
                        </span>
                        <span className="text-[9px] text-green-500/80 uppercase tracking-widest">
                            Decryption Matrix
                        </span>
                    </div>
                </div>
                <div className="w-6 hidden md:block opacity-0"></div>
            </header>

            <main className="flex-1 w-full max-w-2xl relative z-10 flex flex-col items-center justify-center p-4 min-h-[80vh]">

                {/* PRE-GAME STATE */}
                {!gameState.isPlaying && !gameState.gameOver && (
                    <div className="w-full flex justify-center items-center h-full">
                        <div className="w-full glass bg-black/60 border border-green-500/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse"></div>

                            <Cpu className="w-16 h-16 text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                            <h2 className="text-2xl md:text-4xl text-white font-bold tracking-widest mb-4">Uplink Established</h2>
                            <p className="text-xs text-green-400/80 max-w-md leading-relaxed mb-8">
                                Connect to the Sanctum mainframe and sequence the decryption hashes before the firewall detects the breach. Successful node fractures grant raw Sanctum Power (SP).
                            </p>

                            <div className="w-full flex flex-col md:flex-row gap-4 justify-center">
                                {(["INITIATE", "ARCHITECT", "SOVEREIGN"] as DifficultyLevel[]).map((level) => (
                                    <button
                                        key={level}
                                        onMouseEnter={playHover}
                                        onClick={() => startGame(level)}
                                        className="flex-1 border border-green-500/40 bg-green-950/20 hover:bg-green-500/20 text-green-400 hover:text-green-300 py-4 px-6 rounded-xl text-[10px] font-bold tracking-widest transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] flex flex-col items-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        {level} PROTOCOL
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVE GAME STATE */}
                {gameState.isPlaying && (
                    <div ref={gameContainerRef} className="w-full flex justify-center items-start pt-8 pb-32">
                        <div className="w-full max-w-sm flex flex-col gap-8">

                            {/* HUD */}
                            <div className="flex justify-between items-center bg-black/50 border border-green-500/30 rounded-xl p-4">
                                <div>
                                    <span className="block text-[8px] text-green-500/60 uppercase tracking-widest">Score</span>
                                    <span className="text-xl text-white font-bold">{gameState.score}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[8px] text-green-500/60 uppercase tracking-widest">Breach Timer</span>
                                    <span ref={timerRef} className="text-2xl text-green-400 font-bold tracking-wider">{gameState.timeLeft}s</span>
                                </div>
                            </div>

                            {/* Sequence Display */}
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-[10px] text-green-500/80 uppercase tracking-widest">Target Sequence</span>
                                <div className="flex gap-2 flex-wrap justify-center">
                                    {gameState.targetSequence.map((num, i) => {
                                        const isCompleted = i < gameState.currentInput.length;
                                        const isActive = i === gameState.currentInput.length;
                                        return (
                                            <div
                                                key={i}
                                                className={`w-10 h-12 flex items-center justify-center rounded-lg border text-lg font-bold transition-all duration-300
                                                ${isCompleted ? 'bg-green-500/20 text-green-300 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                                                        isActive ? 'bg-white/10 text-white border-white/50 animate-pulse' :
                                                            'bg-black/50 text-zinc-600 border-green-900/30'}`}
                                            >
                                                {isCompleted ? num : '?'}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleInput(num)}
                                        className="h-16 bg-green-950/30 border border-green-500/20 hover:border-green-400/80 hover:bg-green-900/50 text-white text-2xl font-bold rounded-xl active:scale-95 transition-all outline-none"
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* GAME OVER STATE */}
                {gameState.gameOver && (
                    <div className="w-full h-full flex items-center justify-center animate-fade-in relative z-[100]">
                        <div className="glass bg-zinc-950 border border-green-500/50 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl text-white font-bold tracking-widest mb-1">FIREWALL TRIGGERED</h2>
                            <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest">Connection Terminated</p>

                            <div className="bg-black/80 rounded-xl p-4 mb-6 border border-white/5">
                                <span className="block text-[9px] text-green-500/60 uppercase tracking-widest mb-1">Final Score</span>
                                <span className="text-3xl font-bold text-white">{gameState.score}</span>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 mb-8 bg-green-900/10 py-4 rounded-xl border border-green-500/20">
                                <span className="text-[10px] text-green-500/80 uppercase tracking-widest">Yield Extracted</span>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-green-400 animate-pulse" />
                                    <span className="text-2xl font-bold text-green-400">+{gameState.earnedSP} SP</span>
                                </div>
                                {saving ? (
                                    <span className="text-[8px] text-green-500 animate-pulse uppercase tracking-widest">Encrypting transfer...</span>
                                ) : (
                                    <span className="text-[8px] text-gray-400 uppercase tracking-widest">Secured in Lumen Wallet</span>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push('/sanctum')}
                                    className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all"
                                >
                                    Log Out
                                </button>
                                <button
                                    onClick={() => setGameState(prev => ({ ...prev, isPlaying: false, gameOver: false }))}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-black font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Unlock className="w-4 h-4" /> Re-Connect
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
