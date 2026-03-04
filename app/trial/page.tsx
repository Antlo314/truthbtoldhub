'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Play, Zap, Flame, Trophy } from 'lucide-react';

export default function TheTrial() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game state
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [soulPowerEarned, setSoulPowerEarned] = useState(0);
    const [userAuth, setUserAuth] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Engine references
    const requestRef = useRef<number>(0);
    const frameCount = useRef(0);

    // Physics constants
    const GRAVITY = 0.6;
    const JUMP_FORCE = -10;
    const OBSTACLE_SPEED_INITIAL = 5;
    const SPARK_RADIUS = 15;

    // Entities
    const spark = useRef({ x: 100, y: 300, velocity: 0 });
    const obstacles = useRef<{ x: number; y: number; width: number; height: number; passed: boolean }[]>([]);
    const timerRef = useRef<number>(0);

    useEffect(() => {
        // Fetch user context aggressively bypassing cache to get true SP
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserAuth({ ...user }); // force new object ref
            }
        };
        fetchUser();

        // Initial Draw
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && !isPlaying && !gameOver) {
            drawIdleState(ctx);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, gameOver]);

    const startGame = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation(); // prevent bubbling to canvas click handler
        }
        spark.current = { x: 100, y: 300, velocity: 0 };
        obstacles.current = [];
        setScore(0);
        setSoulPowerEarned(0);
        setIsPlaying(true);
        setGameOver(false);
        frameCount.current = 0;
        timerRef.current = performance.now();
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const jump = useCallback(() => {
        if (!isPlaying) return;
        spark.current.velocity = JUMP_FORCE;
    }, [isPlaying]);

    // Handle spacebar / click
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                jump();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump]);

    // Delta time physics
    const lastTimeRef = useRef<number>(0);

    const gameLoop = (time: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Calculate delta time
        const deltaTime = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        // If tab was inactive, cap deltaTime to prevent explosion
        if (deltaTime > 0.1) {
            requestRef.current = requestAnimationFrame(gameLoop);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Physics: Spark Fall
        spark.current.velocity += GRAVITY;
        spark.current.y += spark.current.velocity;

        // Ground/Ceiling Collision
        if (spark.current.y >= canvas.height - SPARK_RADIUS || spark.current.y <= SPARK_RADIUS) {
            triggerGameOver();
            return;
        }

        // Difficulty scaling using performance.now()
        const elapsedTime = (time - timerRef.current) / 1000;
        const currentSpeed = OBSTACLE_SPEED_INITIAL + (elapsedTime * 0.1);

        // Obstacle Generation (using frameCount roughly tied to 60fps)
        frameCount.current++;
        if (frameCount.current % Math.floor(90 / (currentSpeed / 5)) === 0) {
            const gap = 150 - (elapsedTime * 0.5); // Gap shrinks over time
            const minGap = 90;
            const finalGap = Math.max(gap, minGap);
            const obstacleHeight = Math.random() * (canvas.height - finalGap - 40) + 20;

            // Top pillar
            obstacles.current.push({ x: canvas.width, y: 0, width: 40, height: obstacleHeight, passed: false });
            // Bottom pillar
            obstacles.current.push({ x: canvas.width, y: obstacleHeight + finalGap, width: 40, height: canvas.height - (obstacleHeight + finalGap), passed: false });
        }

        let collision = false;

        // Update Obstacles
        for (let i = 0; i < obstacles.current.length; i++) {
            const obs = obstacles.current[i];
            obs.x -= currentSpeed;

            // Draw Obstacle (Obsidian Pillar style)
            ctx.fillStyle = '#1a0b2e'; // Dark purple/obsidian
            ctx.strokeStyle = '#a855f7'; // Purple glow edge
            ctx.lineWidth = 2;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

            // Collision Detection (AABB)
            const sx = spark.current.x;
            const sy = spark.current.y;
            const sr = SPARK_RADIUS - 2; // slightly forgiving hitbox

            if (sx + sr > obs.x && sx - sr < obs.x + obs.width &&
                sy + sr > obs.y && sy - sr < obs.y + obs.height) {
                collision = true;
            }

            // Score updating
            if (!obs.passed && obs.x + obs.width < spark.current.x) {
                obs.passed = true;
                // Since there are 2 parts (top/bottom) per generation, we only increment score once per pair
                if (obs.y === 0) {
                    setScore(s => s + 10);
                }
            }
        }

        // Cleanup off-screen obstacles
        obstacles.current = obstacles.current.filter(obs => obs.x + obs.width > 0);

        if (collision) {
            triggerGameOver();
            return;
        }

        // Draw Spark
        ctx.beginPath();
        ctx.arc(spark.current.x, spark.current.y, SPARK_RADIUS, 0, Math.PI * 2);

        // Ember glow effect
        const gradient = ctx.createRadialGradient(
            spark.current.x, spark.current.y, 0,
            spark.current.x, spark.current.y, SPARK_RADIUS
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#f97316'); // Orange-500
        gradient.addColorStop(1, 'rgba(234, 88, 12, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(spark.current.x, spark.current.y, SPARK_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Draw Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.fillText(`SCORE: ${score}`, 20, 40);

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const triggerGameOver = () => {
        setIsPlaying(false);
        setGameOver(true);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        if (score > highScore) setHighScore(score);

        // Calculate SP Yield (e.g. 10% of score becomes SP)
        const earned = Math.floor(score * 0.1);
        setSoulPowerEarned(earned);

        if (earned > 0 && userAuth) {
            saveScore(earned);
        }
    };

    const saveScore = async (earned: number) => {
        setSaving(true);
        try {
            // First fetch current SP aggressively bypassing cache
            const { data: profile } = await supabase.from('profiles').select('soul_power').eq('id', userAuth.id).single();
            const currentSP = profile?.soul_power || 0;
            const newSP = currentSP + earned;

            // Update SP
            await supabase.from('profiles').update({ soul_power: newSP }).eq('id', userAuth.id);

            // Log Transaction history
            await supabase.from('transactions').insert([{
                profile_id: userAuth.id,
                amount: earned,
                transaction_type: 'THE_TRIAL_YIELD',
                description: `Earned from surviving The Trial (Score: ${score})`
            }]);

        } catch (err) {
            console.error("Failed to save score:", err);
        } finally {
            setSaving(false);
        }
    };

    const drawIdleState = (ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Just draw a faint grid or static background
        ctx.strokeStyle = '#ffffff10';
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col items-center">
            {/* Dark background */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,#1a0b2e_0%,#000_100%)]"></div>

            {/* Header */}
            <header className="sticky top-0 w-full z-50 glass bg-black/60 backdrop-blur-xl px-4 py-4 flex justify-between items-center border-b border-orange-500/20">
                <button onClick={() => router.push('/sanctum')} className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none drop-shadow-md">
                        THE TRIAL
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.2em]">
                        Raw Power Extraction
                    </span>
                </div>
                <div className="w-6 opacity-0"></div>
            </header>

            <main className="flex-1 w-full max-w-4xl relative z-10 flex flex-col items-center justify-center p-4">

                <div className="w-full flex justify-between items-end mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <div>
                            <span className="block text-[8px] text-gray-500 font-mono uppercase tracking-widest leading-none">High Score</span>
                            <span className="text-lg font-bold font-mono text-white">{highScore}</span>
                        </div>
                    </div>
                </div>

                {/* GAME CANVAS */}
                <div className="relative w-full aspect-video md:aspect-[21/9] bg-zinc-950 border border-orange-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(234,88,12,0.1)] group">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={400}
                        className="w-full h-full object-cover cursor-pointer"
                        onPointerDown={() => {
                            if (!isPlaying && !gameOver) {
                                startGame();
                            } else {
                                jump();
                            }
                        }}
                    />

                    {/* Pre-Game Overlay */}
                    {!isPlaying && !gameOver && (
                        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-[100] p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-orange-900/30 border border-orange-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(234,88,12,0.4)] animate-pulse">
                                <Flame className="w-8 h-8 text-orange-500" />
                            </div>
                            <h2 className="font-ritual text-3xl md:text-5xl text-white tracking-widest mb-2 shadow-black drop-shadow-xl">SURVIVE THE DESCENT</h2>
                            <p className="text-[10px] md:text-xs text-gray-300 font-mono uppercase tracking-[0.2em] max-w-lg mb-8 leading-relaxed">
                                Guide your Soul Spark through the Obsidian Pillars. The longer you endure, the more raw Sanctum Power (SP) you extract for your wallet.
                            </p>
                            <button
                                onClick={startGame}
                                className="px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-bold rounded-xl text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(234,88,12,0.5)] hover:scale-105 transition-all flex items-center gap-3 border border-orange-400"
                            >
                                <Play className="w-5 h-5" fill="currentColor" /> INITIATE EXTRACTION
                            </button>
                            <p className="text-[8px] text-gray-500 font-mono mt-6 uppercase tracking-widest">Controls: Click, Tap, or Spacebar to Jump</p>
                        </div>
                    )}

                    {/* Game Over Overlay */}
                    {gameOver && (
                        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-[100] animate-fade-in p-6 text-center">
                            <h2 className="font-ritual text-5xl text-red-500 tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">SPARK EXTINGUISHED</h2>
                            <p className="text-xl font-mono text-white mb-6">Final Score: <span className="text-orange-500 font-bold">{score}</span></p>

                            <div className="glass bg-white/5 border border-white/10 rounded-xl p-4 mb-8 flex flex-col items-center min-w-[200px]">
                                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-1">Yield Extracted</span>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-orange-400" />
                                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600">+{soulPowerEarned} SP</span>
                                </div>
                                {saving && <span className="text-[8px] text-orange-500 animate-pulse mt-2 uppercase">Depositing to Wallet...</span>}
                                {!saving && soulPowerEarned > 0 && <span className="text-[8px] text-green-500 mt-2 uppercase">Secured in Lumen Wallet</span>}
                            </div>

                            <button
                                onClick={startGame}
                                disabled={saving}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                            >
                                Dive Again
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-col items-center max-w-2xl px-4 gap-4 z-[200] relative">
                    {/* Fallback override button just in case the overlay visually glitches but DOM is present */}
                    {!isPlaying && !gameOver && (
                        <button onClick={startGame} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded shadow-[0_0_15px_rgba(234,88,12,0.6)] text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
                            <Play className="w-4 h-4" /> START TRIAL MANUALLY
                        </button>
                    )}
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest leading-relaxed text-center">
                        The Trial is a proving ground for Initiates to forge raw energy. Sanctum Power (SP) can be pledged in The Pool to fund mutual aid petitions or used to unlock premium artifacts in the Vault.
                    </p>
                </div>
            </main>
        </div>
    );
}
