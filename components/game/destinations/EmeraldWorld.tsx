'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import MiniWorldInsight from '@/components/game/MiniWorldInsight';

const MAP_SIZE = 16;
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

export default function EmeraldWorld({ character, isSolved, onSolve, onClaim, onExit, puzzleId, puzzleHint, accent = '#10b981' }: Props) {
    const addMaterial = useGameStore(s => s.addMaterial);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dialogue, setDialogue] = useState<string | null>(
        isSolved 
            ? "The constellation is aligned. The seven wanderers blaze. The Emerald Tablet Fragment is yours." 
            : "Welcome to the Emerald Halls. Connect the 7 star shrines representing the Chaldean celestial spheres in order of orbital speed: Saturn (Slowest) -> Jupiter -> Mars -> Sun -> Venus -> Mercury -> Moon (Fastest) while avoiding the orbiting Astral Orbs."
    );
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_emerald_fragment'));
    const [activeChain, setActiveChain] = useState<number[]>([]);

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    // Game loop state
    const gameState = useRef({
        px: 8, // Grid column
        py: 14, // Grid row
        pax: 8 * 16 + 8, // Sub-pixel X
        pay: 14 * 16 + 8, // Sub-pixel Y
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        astralOrbs: [
            { id: 0, cx: 8 * 16 + 8, cy: 3 * 16 + 8, radius: 42, speed: 2.2, angle: 0 },
            { id: 1, cx: 8 * 16 + 8, cy: 11 * 16 + 8, radius: 48, speed: -1.8, angle: Math.PI }
        ],
        shrines: [
            { id: 0, name: 'Saturn', gx: 8, gy: 2, active: false, color: '#eab308' },
            { id: 1, name: 'Jupiter', gx: 3, gy: 5, active: false, color: '#f97316' },
            { id: 2, name: 'Mars', gx: 13, gy: 5, active: false, color: '#ef4444' },
            { id: 3, name: 'Sun', gx: 8, gy: 7, active: false, color: '#facc15' },
            { id: 4, name: 'Venus', gx: 3, gy: 9, active: false, color: '#ec4899' },
            { id: 5, name: 'Mercury', gx: 13, gy: 9, active: false, color: '#3b82f6' },
            { id: 6, name: 'Moon', gx: 8, gy: 12, active: false, color: '#a855f7' }
        ],
        cosmicNodes: [
            { id: 0, gx: 2, gy: 4, collected: false },
            { id: 1, gx: 13, gy: 4, collected: false },
            { id: 2, gx: 2, gy: 10, collected: false },
            { id: 3, gx: 13, gy: 10, collected: false },
            { id: 4, gx: 8, gy: 9, collected: false }
        ],
        solved: isSolved,
        t: 0
    });

    const toggleMute = () => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
    };

    const resetConstellation = useCallback(() => {
        const state = gameState.current;
        state.shrines.forEach(s => s.active = false);
        setActiveChain([]);
        setDialogue("The alignment snaps! The constellation breaks. Restart from Saturn (Top).");
        sfx.defeat();
    }, []);

    const isSolid = useCallback((gx: number, gy: number) => {
        if (gx < 0 || gx >= MAP_SIZE || gy < 0 || gy >= MAP_SIZE) return true;
        // Borders
        if (gx === 0 || gx === MAP_SIZE - 1 || gy === 0 || gy === MAP_SIZE - 1) return true;
        
        // Starry Void holes (cannot walk on black space void tiles)
        if (gy === 4 && gx >= 6 && gx <= 10) return true;
        if (gy === 10 && gx >= 6 && gx <= 10) return true;
        if (gx === 4 && gy >= 6 && gy <= 8) return true;
        if (gx === 12 && gy >= 6 && gy <= 8) return true;

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
            let speed = 76;
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

            // Shrines checking
            state.shrines.forEach(s => {
                if (!s.active && !state.solved) {
                    const sx = s.gx * TILE + 8;
                    const sy = s.gy * TILE + 8;
                    if (Math.hypot(sx - state.pax, sy - state.pay) < 14) {
                        s.active = true;
                        sfx.strike();

                        setActiveChain(prev => {
                            const next = [...prev, s.id];
                            const expected = [0, 1, 2, 3, 4, 5, 6];
                            const correct = next.every((val, idx) => val === expected[idx]);

                            if (!correct) {
                                setTimeout(() => resetConstellation(), 100);
                                return [];
                            } else {
                                setDialogue(`Attuned ${s.name} sphere. Orbit path forming.`);
                                if (next.length === 7) {
                                    state.solved = true;
                                    onSolve();
                                    setDialogue("The alignment runs true! The seven spheres unite as one. The Emerald Tablet Fragment emerges at the center!");
                                    sfx.victory();
                                }
                                return next;
                            }
                        });
                    }
                }
            });

            // Astral Orbs orbit math & collision
            state.astralOrbs.forEach(o => {
                o.angle += o.speed * dt;
                const ox = o.cx + Math.cos(o.angle) * o.radius;
                const oy = o.cy + Math.sin(o.angle) * o.radius;

                // Check collision with player
                const pWorldX = state.pax;
                const pWorldY = state.pay;
                if (Math.hypot(ox - pWorldX, oy - pWorldY) < 13) {
                    sfx.hurt();
                    
                    // Knockback player 2 tiles away
                    let kbx = 0;
                    let kby = 0;
                    if (state.facing === 'up') kby = 32;
                    else if (state.facing === 'down') kby = -32;
                    else if (state.facing === 'left') kbx = 32;
                    else if (state.facing === 'right') kbx = -32;

                    state.pax = Math.max(TILE, Math.min((MAP_SIZE - 2) * TILE, state.pax + kbx));
                    state.pay = Math.max(TILE, Math.min((MAP_SIZE - 2) * TILE, state.pay + kby));
                    state.px = Math.floor(state.pax / TILE);
                    state.py = Math.floor(state.pay / TILE);

                    resetConstellation();
                }
            });

            // Check cosmic shard collisions
            state.cosmicNodes.forEach(node => {
                if (!node.collected) {
                    const nx = node.gx * TILE + 8;
                    const ny = node.gy * TILE + 8;
                    if (Math.hypot(nx - state.pax, ny - state.pay) < 12) {
                        node.collected = true;
                        addMaterial('cosmic', 1);
                        sfx.hit();
                        setDialogue("You collected a Cosmic Shard! Rare celestial energy to forge legendary weapons.");
                    }
                }
            });

            // Check relic collection
            if (!relicClaimed && state.solved) {
                const rx = 8 * TILE + 8;
                const ry = 7 * TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue("You claim the Fragment of the Emerald Tablet. It glows with green light, revealing Atlantis scriptures.");
                    sfx.hit();
                }
            }

            // ---- RENDER ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);

            // 1. Draw Ground (Green crystals & starry voids with Parallax Nebula)
            for (let r = 0; r < MAP_SIZE; r++) {
                for (let c = 0; c < MAP_SIZE; c++) {
                    const solid = isSolid(c, r);
                    if (solid) {
                        ctx.fillStyle = '#022c22'; // Starry black void
                        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);

                        // Parallax Nebula glow
                        const scrollX = state.pax * 0.15;
                        const scrollY = state.pay * 0.15;
                        const cellX = c * TILE;
                        const cellY = r * TILE;

                        const nebulae = [
                            { x: 4 * TILE - scrollX, y: 4 * TILE - scrollY, color: 'rgba(217, 70, 239, 0.08)' },
                            { x: 12 * TILE - scrollX, y: 12 * TILE - scrollY, color: 'rgba(16, 185, 129, 0.08)' }
                        ];
                        
                        nebulae.forEach(neb => {
                            const d = Math.hypot(cellX + 8 - neb.x, cellY + 8 - neb.y);
                            if (d < 48) {
                                ctx.fillStyle = neb.color;
                                ctx.beginPath();
                                ctx.arc(cellX + 8, cellY + 8, TILE, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });
                        
                        // draw stars
                        const starHash = (c * 17 + r * 31) % 100;
                        if (starHash > 85) {
                            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(state.t / 200 + starHash) * 0.3})`;
                            ctx.fillRect(c * TILE + (starHash % TILE), r * TILE + ((starHash * 7) % TILE), 1.5, 1.5);
                        }
                    } else {
                        // Emerald crystal floor
                        ctx.fillStyle = (c + r) % 2 === 0 ? '#065f46' : '#047857';
                        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
                    }
                }
            }

            // 2. Draw Constellation lines
            if (activeChain.length > 1) {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                for (let i = 0; i < activeChain.length; i++) {
                    const s = state.shrines[activeChain[i]];
                    if (i === 0) ctx.moveTo(s.gx * TILE + 8, s.gy * TILE + 8);
                    else ctx.lineTo(s.gx * TILE + 8, s.gy * TILE + 8);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // 3. Draw Star Shrines
            state.shrines.forEach(s => {
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.gx * TILE + 8, s.gy * TILE + 8, 4.5, 0, Math.PI * 2);
                ctx.fill();

                if (s.active || isSolved) {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(s.gx * TILE + 8, s.gy * TILE + 8, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Glow circle
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(s.gx * TILE + 8, s.gy * TILE + 8, 8 + Math.sin(state.t / 200) * 1.5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            // 4. Draw Relic (Emerald Tablet Fragment)
            if (!relicClaimed && state.solved) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(8 * TILE + 8, 7 * TILE + 4 + bounce);
                ctx.lineTo(8 * TILE + 12, 7 * TILE + 12 + bounce);
                ctx.lineTo(8 * TILE + 4, 7 * TILE + 12 + bounce);
                ctx.closePath();
                ctx.fill();
            }

            // 5. Draw Astral Orbs (Enemies)
            state.astralOrbs.forEach(o => {
                const ox = o.cx + Math.cos(o.angle) * o.radius;
                const oy = o.cy + Math.sin(o.angle) * o.radius;

                // Orb glow
                const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 12);
                og.addColorStop(0, '#10b981');
                og.addColorStop(0.5, 'rgba(52, 211, 153, 0.4)');
                og.addColorStop(1, 'rgba(52, 211, 153, 0)');
                ctx.fillStyle = og;
                ctx.beginPath();
                ctx.arc(ox, oy, 12, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ox, oy, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // 6. Easter Eggs (Emerald Shard col 2, row 2; Telescope col 13, row 13)
            ctx.fillStyle = '#14532d';
            ctx.fillRect(2 * TILE + 4, 2 * TILE + 4, 8, 8); // Emerald Shard
            ctx.fillStyle = '#b45309';
            ctx.fillRect(13 * TILE + 4, 13 * TILE + 4, 8, 8); // Telescope

            // Prompts
            if (Math.hypot(state.pax - (2 * TILE + 8), state.pay - (2 * TILE + 8)) < 22) {
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 2 * TILE + 8, 2 * TILE - 2);
            }
            if (Math.hypot(state.pax - (13 * TILE + 8), state.pay - (13 * TILE + 8)) < 22) {
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Look', 13 * TILE + 8, 13 * TILE - 2);
            }

            // 7. Draw Player shadow & aura
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(state.pax, state.pay + 5, 6, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const ap = charRef.current.appearance;
            const ag = ctx.createRadialGradient(state.pax, state.pay - 4, 0, state.pax, state.pay - 4, 10);
            ag.addColorStop(0, ap.aura + '66');
            ag.addColorStop(1, ap.aura + '00');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.arc(state.pax, state.pay - 4, 10, 0, Math.PI * 2);
            ctx.fill();

            // Draw Cosmic Shards
            state.cosmicNodes.forEach(node => {
                if (!node.collected) {
                    const bounce = Math.sin((state.t + node.id * 500) / 200) * 2;
                    ctx.save();
                    ctx.shadowColor = '#d946ef'; // Fuchsia glow
                    ctx.shadowBlur = 6;
                    ctx.fillStyle = '#f472b6'; // Light pink core
                    ctx.beginPath();
                    ctx.moveTo(node.gx * TILE + 8, node.gy * TILE + 4 + bounce);
                    ctx.lineTo(node.gx * TILE + 12, node.gy * TILE + 10 + bounce);
                    ctx.lineTo(node.gx * TILE + 8, node.gy * TILE + 14 + bounce);
                    ctx.lineTo(node.gx * TILE + 4, node.gy * TILE + 10 + bounce);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            });

            // Draw player avatar
            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19 - (moving && wphase === 0 ? 1 : 0), 16, 24);

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
    }, [isSolved, relicClaimed, resetConstellation, onClaim, onSolve, isSolid]);

    // Handle Action interaction
    const handleAction = () => {
        const state = gameState.current;

        // Check Emerald Shard (col 2, row 2)
        if (Math.hypot(2 * TILE + 8 - state.pax, 2 * TILE + 8 - state.pay) < 22) {
            setDialogue("Emerald Shard inscription: 'Man, know thyself, and thou shalt know the All. That which is below is as that which is above. The spheres sing a single truth.'");
            sfx.hit();
            return;
        }

        // Check Telescope (col 13, row 13)
        if (Math.hypot(13 * TILE + 8 - state.pax, 13 * TILE + 8 - state.pay) < 22) {
            setDialogue("You look through the copper celestial telescope. It is trained on a green point in the starry sky. Coordinate plaque: '31.15 N, 32.22 E — The Sunken Gateway of Atlantis.'");
            sfx.hit();
            return;
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
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Emerald Halls</span>
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
