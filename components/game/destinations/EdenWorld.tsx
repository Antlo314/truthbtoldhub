'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import MiniWorldInsight from '@/components/game/MiniWorldInsight';

const TILE_COUNT = 16;
const MAP_SIZE = TILE_COUNT;
const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const TILE = 16;

interface Props {
    character: GameCharacter;
    isSolved: boolean;
    onSolve: () => void;
    onClaim: () => void;
    onExit: () => void;
    puzzleId?: string;
    puzzleHint?: string;
    accent?: string;
}

export default function EdenWorld({ character, isSolved, onSolve, onClaim, onExit, puzzleId, puzzleHint, accent = '#34d399' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dialogue, setDialogue] = useState<string | null>(
        isSolved 
            ? "The four rivers flow. The Garden of Eden remembers. The Leaf is yours." 
            : "Welcome to Eden, child. Attune the four rivers in order: Pishon (North-West), Gihon (North-East), Hiddekel (South-West), and Euphrates (South-East) to lower the central barrier."
    );
    const [sequence, setSequence] = useState<number[]>([]);
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_eden_leaf'));

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    // Game loop state
    const gameState = useRef({
        px: 8, // Grid column
        py: 12, // Grid row
        pax: 8 * 16 + 8, // Sub-pixel X
        pay: 12 * 16 + 8, // Sub-pixel Y
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        distractTimer: 0,
        shades: [
            { x: 3 * 16, y: 4 * 16, tx: 3 * 16, ty: 4 * 16, wait: 0 },
            { x: 12 * 16, y: 4 * 16, tx: 12 * 16, ty: 4 * 16, wait: 0 }
        ],
        rivers: [
            { id: 0, name: 'Pishon', gx: 2, gy: 2, active: false, color: '#22d3ee' },
            { id: 1, name: 'Gihon', gx: 13, gy: 2, active: false, color: '#fbbf24' },
            { id: 2, name: 'Hiddekel', gx: 2, gy: 13, active: false, color: '#a855f7' },
            { id: 3, name: 'Euphrates', gx: 13, gy: 13, active: false, color: '#10b981' }
        ],
        treeX: 8,
        treeY: 7,
        barrierActive: !isSolved,
        t: 0
    });

    const toggleMute = () => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
    };

    // Reset sequence
    const resetSequence = useCallback(() => {
        setSequence([]);
        gameState.current.rivers.forEach(r => r.active = false);
        setDialogue("The resonance breaks. The rivers reset. Try again from the North-West (Pishon).");
        sfx.defeat();
    }, []);

    // Collision check
    const isSolid = useCallback((gx: number, gy: number) => {
        if (gx < 0 || gx >= MAP_SIZE || gy < 0 || gy >= MAP_SIZE) return true;
        // Central pool / Tree of Life
        if (gx >= 7 && gx <= 9 && gy >= 6 && gy <= 8) {
            // If barrier is active, cannot enter
            if (gameState.current.barrierActive) return true;
            // Tree trunk itself is solid
            if (gx === 8 && gy === 7) return true;
        }
        // Fountains
        if ((gx === 2 && gy === 2) || (gx === 13 && gy === 2) || 
            (gx === 2 && gy === 13) || (gx === 13 && gy === 13)) return true;
        
        return false;
    }, []);

    // Setup input listeners
    useEffect(() => {
        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);

        return () => {
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }, []);

    // Primary Game Loop
    useEffect(() => {
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;

        // Particles system
        const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number; type: 'leaf' | 'pollen' }[] = [];
        for (let i = 0; i < 22; i++) {
            particles.push({
                x: Math.random() * (MAP_SIZE * TILE),
                y: Math.random() * (MAP_SIZE * TILE),
                vx: -12 - Math.random() * 16,
                vy: 8 + Math.random() * 12,
                size: 1.5 + Math.random() * 2,
                color: Math.random() > 0.4 ? '#15803d' : '#fcd34d',
                alpha: 0.3 + Math.random() * 0.5,
                type: Math.random() > 0.4 ? 'leaf' : 'pollen'
            });
        }

        const charImg = new Image();
        charImg.src = CHAR_SHEET;

        // Build animation frames
        const DIRS = ['down', 'up', 'left', 'right'] as const;
        type Dir = typeof DIRS[number];
        const buildFrames = (cfg: GameCharacter['avatar']) => {
            const m = {} as Record<Dir, HTMLCanvasElement[]>;
            for (const d of DIRS) {
                m[d] = [
                    avatarOffscreen(cfg, 0, d),
                    avatarOffscreen(cfg, 1, d),
                    avatarOffscreen(cfg, 2, d)
                ];
            }
            return m;
        };
        let avatarFrames = buildFrames(charRef.current.avatar);
        let avatarKey = JSON.stringify(charRef.current.avatar);

        let raf = 0;
        let last = performance.now();
        let running = true;

        // Scale tiles dynamically to fit viewport
        let Z = 3;
        function resize() {
            if (!canvas.parentElement) return;
            const size = Math.min(canvas.parentElement.clientWidth || 400, 480);
            canvas.width = size;
            canvas.height = size;
            Z = size / (MAP_SIZE * TILE);
            ctx.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        const state = gameState.current;

        function loop(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            state.t = now;

            // Player speed and input handling
            let speed = state.distractTimer > 0 ? 32 : 72; // slowed when distracted
            if (state.distractTimer > 0) state.distractTimer -= dt;

            let ix = joyRef.current.x;
            let iy = joyRef.current.y;
            const k = keysRef.current;
            if (k.has('arrowleft') || k.has('a')) ix = -1;
            if (k.has('arrowright') || k.has('d')) ix = 1;
            if (k.has('arrowup') || k.has('w')) iy = -1;
            if (k.has('arrowdown') || k.has('s')) iy = 1;

            const mag = Math.hypot(ix, iy);
            if (mag > 1) { ix /= mag; iy /= mag; }
            const moving = Math.hypot(ix, iy) > 0.15;

            if (moving) {
                state.walkT += dt;
                state.facing = Math.abs(ix) > Math.abs(iy) 
                    ? (ix < 0 ? 'left' : 'right') 
                    : (iy < 0 ? 'up' : 'down');

                // Try moving X
                const nx = state.pax + ix * speed * dt;
                const ngx = Math.floor(nx / TILE);
                if (!isSolid(ngx, state.py)) state.pax = nx;

                // Try moving Y
                const ny = state.pay + iy * speed * dt;
                const ngy = Math.floor(ny / TILE);
                if (!isSolid(state.px, ngy)) state.pay = ny;

                state.px = Math.floor(state.pax / TILE);
                state.py = Math.floor(state.pay / TILE);
            }

            // Patrol shades logic
            for (const s of state.shades) {
                if (s.wait > 0) {
                    s.wait -= dt;
                } else {
                    const dx = s.tx - s.x;
                    const dy = s.ty - s.y;
                    const d = Math.hypot(dx, dy);
                    if (d < 1) {
                        // Pick new random adjacent cell that is not solid
                        const directions = [
                            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                        ];
                        const valid = directions.map(dir => {
                            const gx = Math.floor(s.x / TILE) + dir.dx;
                            const gy = Math.floor(s.y / TILE) + dir.dy;
                            return { gx, gy, x: gx * TILE, y: gy * TILE };
                        }).filter(pos => !isSolid(pos.gx, pos.gy));

                        if (valid.length > 0) {
                            const next = valid[Math.floor(Math.random() * valid.length)];
                            s.tx = next.x;
                            s.ty = next.y;
                        }
                        s.wait = Math.random() * 1.5;
                    } else {
                        const step = 28 * dt;
                        s.x += (dx / d) * Math.min(step, d);
                        s.y += (dy / d) * Math.min(step, d);
                    }
                }

                // Check collision with player
                const pWorldX = state.pax;
                const pWorldY = state.pay;
                if (Math.hypot(s.x + 8 - pWorldX, s.y + 8 - pWorldY) < 12) {
                    if (state.distractTimer <= 0) {
                        state.distractTimer = 2.5; // 2.5 seconds distraction
                        sfx.hurt();
                        setDialogue("An Apple Shade drifts through you! Your mind wanders... you are slowed.");
                    }
                }
            }

            // Check river triggers
            for (const r of state.rivers) {
                const rx = r.gx * TILE + 8;
                const ry = r.gy * TILE + 8;
                const pWorldX = state.pax;
                const pWorldY = state.pay;
                
                // Stepped near a fountain button (1 tile radius)
                if (Math.hypot(rx - pWorldX, ry - pWorldY) < 16 && !r.active && !isSolved) {
                    r.active = true;
                    sfx.strike();
                    
                    setSequence(prev => {
                        const next = [...prev, r.id];
                        // Validate order
                        const expected = [0, 1, 2, 3];
                        const isCorrectSoFar = next.every((val, idx) => val === expected[idx]);
                        
                        if (!isCorrectSoFar) {
                            setTimeout(() => resetSequence(), 100);
                            return [];
                        } else {
                            setDialogue(`The river ${r.name} starts to glow and flow into the garden!`);
                            if (next.length === 4) {
                                state.barrierActive = false;
                                onSolve();
                                setDialogue("The four rivers converge! Pishon, Gihon, Hiddekel, and Euphrates flow together. The central gold barrier dissolves. Claim the Leaf!");
                                sfx.victory();
                            }
                            return next;
                        }
                    });
                }
            }

            // Check relic collection
            if (!relicClaimed && !state.barrierActive) {
                const tx = state.treeX * TILE + 8;
                const ty = (state.treeY + 1) * TILE + 8; // stand in front of the tree
                if (Math.hypot(tx - state.pax, ty - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue("You reach into the hollow of the ancient tree and retrieve the Leaf of the Tree of Life. You feel a deep tranquility.");
                    sfx.hit();
                }
            }

            // ---- RENDER ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);

            // 1. Draw Ground
            for (let r = 0; r < MAP_SIZE; r++) {
                for (let c = 0; c < MAP_SIZE; c++) {
                    const isRiverSrc = (c === 2 && r === 2) || (c === 13 && r === 2) || 
                                       (c === 2 && r === 13) || (c === 13 && r === 13);
                    const isPool = c >= 7 && c <= 9 && r >= 6 && r <= 8;

                    if (isPool) {
                        ctx.fillStyle = '#1e3a8a'; // Blue water pool
                    } else if (isRiverSrc) {
                        ctx.fillStyle = '#475569'; // Stone fountain base
                    } else {
                        // Grass checkerboard
                        ctx.fillStyle = (c + r) % 2 === 0 ? '#3f6212' : '#365314'; 
                    }
                    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);

                    // Draw stone paths leading to center
                    if (!isPool && !isRiverSrc && (c === 8 || r === 7)) {
                        ctx.fillStyle = '#52525b';
                        ctx.fillRect(c * TILE + 3, r * TILE + 3, 10, 10);
                    }
                }
            }

            // 2. Draw Fountains / Rivers
            state.rivers.forEach(r => {
                // Draw river flow line to center if active
                if (r.active || isSolved) {
                    ctx.strokeStyle = r.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(r.gx * TILE + 8, r.gy * TILE + 8);
                    ctx.lineTo(8 * TILE + 8, 7 * TILE + 8);
                    ctx.stroke();

                    // Active fountain glow
                    ctx.fillStyle = r.color;
                    ctx.beginPath();
                    ctx.arc(r.gx * TILE + 8, r.gy * TILE + 8, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw physical stone fountain
                ctx.fillStyle = '#64748b';
                ctx.fillRect(r.gx * TILE + 2, r.gy * TILE + 2, 12, 12);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(r.gx * TILE + 4, r.gy * TILE + 4, 8, 8);
            });

            // 3. Draw Central Barrier
            if (state.barrierActive) {
                const pulse = 0.5 + Math.sin(state.t / 200) * 0.2;
                ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(8 * TILE + 8, 7 * TILE + 8, 24, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 4. Draw Central Tree of Life
            ctx.fillStyle = '#78350f'; // Trunk
            ctx.fillRect(8 * TILE + 4, 7 * TILE + 2, 8, 14);
            ctx.fillStyle = '#166534'; // Leaves
            ctx.beginPath();
            ctx.arc(8 * TILE + 8, 7 * TILE - 4, 16, 0, Math.PI * 2);
            ctx.fill();

            // 5. Draw Relic (Leaf) if not claimed
            if (!relicClaimed && !state.barrierActive) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#10b981'; // Green leaf relic
                ctx.beginPath();
                ctx.ellipse(8 * TILE + 8, 7 * TILE + 16 + bounce, 4, 6, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                // Glow
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(8 * TILE + 8, 7 * TILE + 16 + bounce, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0; // reset
            }

            // 6. Draw Apple Shades (Enemies)
            for (const s of state.shades) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(s.x + 8, s.y + 14, 5, 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw red apple ghost
                const bounce = Math.sin(state.t / 180 + s.x) * 2.5;
                ctx.drawImage(charImg, 0 * 17, 3 * 17, 16, 16, s.x, s.y + bounce, 16, 16);
                
                // Red tint glow
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
                ctx.beginPath();
                ctx.arc(s.x + 8, s.y + 8 + bounce, 8, 0, Math.PI * 2);
                ctx.fill();
            }

            // 7. Draw Serpent (Easter Egg) in forbidden tree top-left
            const sx = 4 * TILE + 8;
            const sy = 3 * TILE + 8;
            // Draw a small serpent snake tile
            ctx.drawImage(charImg, 6 * 17, 3 * 17, 16, 16, sx - 8, sy - 8, 16, 16);
            if (Math.hypot(state.pax - sx, state.pay - sy) < 22) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Speak', sx, sy - 10 + Math.sin(state.t / 200) * 1.5);
            }

            // 8. Draw Player Avatar
            const curKey = JSON.stringify(charRef.current.avatar);
            if (curKey !== avatarKey) {
                avatarKey = curKey;
                avatarFrames = buildFrames(charRef.current.avatar);
            }
            
            // Draw player shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(state.pax, state.pay + 5, 6, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Player aura
            const ap = charRef.current.appearance;
            const ag = ctx.createRadialGradient(state.pax, state.pay - 4, 0, state.pax, state.pay - 4, 10);
            ag.addColorStop(0, ap.aura + '66');
            ag.addColorStop(1, ap.aura + '00');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.arc(state.pax, state.pay - 4, 10, 0, Math.PI * 2);
            ctx.fill();

            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19 - (moving && wphase === 0 ? 1 : 0), 16, 24);

            // 9. Draw and Update Particles
            particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.x < 0) p.x = MAP_SIZE * TILE;
                if (p.y > MAP_SIZE * TILE) p.y = 0;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                if (p.type === 'leaf') {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(Math.PI / 4 + Math.sin(state.t / 300) * 0.1);
                    ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });

            ctx.restore();

            raf = requestAnimationFrame(loop);
        }

        running = true;
        raf = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [isSolved, relicClaimed, resetSequence, onClaim, onSolve, isSolid]);

    // Handle Tap interaction (Serpent)
    const handleAction = () => {
        const state = gameState.current;
        const sx = 4 * TILE_COUNT + 8;
        const sy = 3 * TILE_COUNT + 8;
        if (Math.hypot(state.pax - sx, state.pay - sy) < 26) {
            setDialogue("The Serpent whispers: 'Did the Source really say you would perish if you took of the knowledge? It was a lie. True freedom lies in defining your own good and evil. Ssskip the rules...'");
            sfx.hit();
        }
    };

    // Mobile touch joystick
    const joyMove = (cx: number, cy: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        const dx = cx - (rect.left + rect.width / 2);
        const dy = cy - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(d, JOY_R);
        const a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * m;
        const ky = Math.sin(a) * m;
        setKnob({ x: kx, y: ky });
        joyRef.current = { x: kx / JOY_R, y: ky / JOY_R };
    };
    
    const joyEnd = () => {
        joyActive.current = false;
        setKnob({ x: 0, y: 0 });
        joyRef.current = { x: 0, y: 0 };
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-white bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 shadow-2xl relative select-none">
            {/* Header controls */}
            <div className="flex justify-between items-center w-full max-w-[480px] mb-3">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Return to Chamber
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Eden Overworld</span>
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                        {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                </div>
            </div>

            {/* Main Canvas Container */}
            <div className="relative border-4 border-emerald-600/40 rounded-2xl overflow-hidden bg-emerald-950 shadow-inner">
                <canvas ref={canvasRef} className="block w-full max-w-[480px] aspect-square" />
            </div>

            <MiniWorldInsight character={character} puzzleId={puzzleId} baseHint={puzzleHint} accent={accent} isSolved={isSolved} />

            {/* Dialogue text box */}
            {dialogue && (
                <div className="w-full max-w-[480px] mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/45 backdrop-blur-sm text-center">
                    <p className="font-ritual text-sm leading-relaxed text-zinc-200">{dialogue}</p>
                </div>
            )}

            {/* Virtual Joystick controls for mobile */}
            <div className="w-full max-w-[480px] h-32 mt-2 relative pointer-events-none flex items-center justify-between">
                {/* Left Joystick */}
                <div
                    ref={baseRef}
                    onTouchStart={(e) => { joyActive.current = true; const t = e.touches[0]; joyMove(t.clientX, t.clientY); }}
                    onTouchMove={(e) => { e.preventDefault(); if (joyActive.current) { const t = e.touches[0]; joyMove(t.clientX, t.clientY); } }}
                    onTouchEnd={joyEnd}
                    onMouseDown={(e) => { joyActive.current = true; joyMove(e.clientX, e.clientY); }}
                    onMouseMove={(e) => { if (joyActive.current) joyMove(e.clientX, e.clientY); }}
                    onMouseUp={joyEnd}
                    onMouseLeave={joyEnd}
                    className="rounded-full border border-white/10 bg-black/40 pointer-events-auto relative"
                    style={{ width: JOY_R * 2, height: JOY_R * 2, boxShadow: 'inset 0 0 16px rgba(0,0,0,0.6)', touchAction: 'none' }}
                >
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '40%', height: '40%', left: '30%', top: '30%',
                            background: 'rgba(16, 185, 129, 0.6)', border: '1px solid rgba(16, 185, 129, 0.85)',
                            transform: `translate(${knob.x}px, ${knob.y}px)`,
                            transition: joyActive.current ? 'none' : 'transform 0.15s ease'
                        }}
                    />
                </div>

                {/* Right Action Button */}
                <button
                    onClick={handleAction}
                    onTouchStart={(e) => { e.preventDefault(); handleAction(); }}
                    className="w-16 h-16 rounded-full text-[10px] font-black uppercase tracking-widest text-black bg-emerald-400 border border-emerald-500 hover:bg-emerald-300 pointer-events-auto flex items-center justify-center active:scale-95 transition-transform"
                    style={{ touchAction: 'none' }}
                >
                    Action
                </button>
            </div>
        </div>
    );
}
