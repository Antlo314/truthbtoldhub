'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';

const MAP_SIZE = 16;
const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const TILE = 16;

interface Props {
    character: GameCharacter;
    isSolved: boolean;
    onSolve: () => void;
    onClaim: () => void;
    onExit: () => void;
}

export default function GizaWorld({ character, isSolved, onSolve, onClaim, onExit }: Props) {
    const addMaterial = useGameStore(s => s.addMaterial);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dialogue, setDialogue] = useState<string | null>(
        isSolved 
            ? "The resonance matches. Giza's engine granite slab slides open. The Shard is yours." 
            : "Welcome to Giza, the Engine of Stone. Walk through the dark tomb. Step on traps and dormant Sentinels will wake. Strike the three Resonance Crystals in order from lowest chamber to highest (Low -> Mid -> High) to slide the central stone slab."
    );
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_giza_shard'));

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const attackRef = useRef(false);
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
        swingT: 0,
        sentinels: [
            { id: 0, x: 4 * 16, y: 8 * 16, awake: false, hp: 2, tx: 4 * 16, ty: 8 * 16, speed: 38 },
            { id: 1, x: 11 * 16, y: 8 * 16, awake: false, hp: 2, tx: 11 * 16, ty: 8 * 16, speed: 38 }
        ],
        crystals: [
            { id: 0, name: 'Low', gx: 3, gy: 3, active: false, color: '#38bdf8' },
            { id: 1, name: 'Mid', gx: 12, gy: 3, active: false, color: '#a855f7' },
            { id: 2, name: 'High', gx: 8, gy: 11, active: false, color: '#ef4444' }
        ],
        traps: [
            { gx: 5, gy: 8, tripped: false },
            { gx: 10, gy: 8, tripped: false }
        ],
        ironNodes: [
            { id: 0, gx: 2, gy: 5, mined: false },
            { id: 1, gx: 13, gy: 5, mined: false },
            { id: 2, gx: 5, gy: 12, mined: false },
            { id: 3, gx: 10, gy: 12, mined: false },
            { id: 4, gx: 2, gy: 13, mined: false }
        ],
        sequence: [] as number[],
        wallOpen: isSolved,
        t: 0
    });

    const toggleMute = () => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
    };

    const resetSequence = useCallback(() => {
        const state = gameState.current;
        state.sequence = [];
        state.crystals.forEach(c => c.active = false);
        setDialogue("The resonance is off. The crystals reset. Strike them from Low -> Mid -> High.");
        sfx.defeat();
    }, []);

    const isSolid = useCallback((gx: number, gy: number) => {
        if (gx < 0 || gx >= MAP_SIZE || gy < 0 || gy >= MAP_SIZE) return true;
        
        // Borders and inner walls
        if (gx === 0 || gx === MAP_SIZE - 1 || gy === 0 || gy === MAP_SIZE - 1) return true;
        
        // Sarcophagi blocks in the center
        if (gy === 6 && (gx >= 3 && gx <= 6)) return true;
        if (gy === 6 && (gx >= 9 && gx <= 12)) return true;

        // The locking granite slab at col 8, row 4
        if (gy === 4 && gx === 8 && !gameState.current.wallOpen) return true;
        if (gy === 4 && gx !== 8 && gx !== 4 && gx !== 11) return true; // horizontal wall

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

        // Initialize dust motes
        const dustMotes: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < 30; i++) {
            dustMotes.push({
                x: Math.random() * (MAP_SIZE * TILE),
                y: Math.random() * (MAP_SIZE * TILE),
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: 0.5 + Math.random() * 1.2,
                alpha: 0.15 + Math.random() * 0.4
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
            let speed = 72;
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

            // Check Trap triggers
            state.traps.forEach(t => {
                if (!t.tripped && state.px === t.gx && state.py === t.gy) {
                    t.tripped = true;
                    sfx.bossSpawn();
                    // Wake up adjacent sentinel
                    state.sentinels.forEach(s => {
                        s.awake = true;
                        setDialogue("Click! You stepped on a dusty pressure plate. The stone guardian wakes up!");
                    });
                }
            });

            // Player combat swing
            if (state.swingT > 0) state.swingT -= dt;
            const forceSwing = attackRef.current || keysRef.current.has('j') || keysRef.current.has(' ');
            if (forceSwing && state.swingT <= 0) {
                state.swingT = 0.35;
                sfx.strike();
                
                // Strike Sentinels in range
                state.sentinels.forEach(s => {
                    if (s.awake && s.hp > 0) {
                        const dist = Math.hypot(s.x + 8 - state.pax, s.y + 8 - state.pay);
                        if (dist < 26) {
                            s.hp -= 1;
                            sfx.hit();
                            if (s.hp <= 0) {
                                sfx.enemyDown();
                                setDialogue("You strike the Sentinel and it crumbles into stone dust.");
                            } else {
                                // Knockback
                                const a = Math.atan2(s.y - state.pay, s.x - state.pax);
                                s.x += Math.cos(a) * 12;
                                s.y += Math.sin(a) * 12;
                            }
                        }
                    }
                });
                // Strike Iron Ore nodes
                state.ironNodes.forEach(node => {
                    if (!node.mined) {
                        const dist = Math.hypot(node.gx * TILE + 8 - state.pax, node.gy * TILE + 8 - state.pay);
                        if (dist < 24) {
                            node.mined = true;
                            addMaterial('iron', 1);
                            sfx.hit();
                            setDialogue("Clang! You mined a chunk of raw Iron Ore! Bring it to the Weapon Forge.");
                        }
                    }
                });

                attackRef.current = false;
            }

            // Sentinel AI (Chase player)
            state.sentinels.forEach(s => {
                if (s.awake && s.hp > 0) {
                    const dx = state.pax - (s.x + 8);
                    const dy = state.pay - (s.y + 8);
                    const d = Math.hypot(dx, dy);

                    if (d < 10) {
                        // Collision: reset player
                        sfx.hurt();
                        state.pax = 8 * TILE + 8;
                        state.pay = 14 * TILE + 8;
                        state.px = 8;
                        state.py = 14;
                        setDialogue("The Sentinel caught you! You were wounded and returned to the tomb entrance.");
                    } else if (d < 96) {
                        // Chase
                        s.x += (dx / d) * s.speed * dt;
                        s.y += (dy / d) * s.speed * dt;
                    }
                }
            });

            // Check relic collection
            if (!relicClaimed && state.wallOpen) {
                const rx = 8 * TILE + 8;
                const ry = 1 * TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue("You claim the Shard of Casing Stone. It shines with polished white limestone brilliance.");
                    sfx.hit();
                }
            }

            // ---- RENDER ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw into offscreen-like scaled context
            ctx.save();
            ctx.scale(Z, Z);

            // 1. Draw Ground (Dark sandstone tiles)
            for (let r = 0; r < MAP_SIZE; r++) {
                for (let c = 0; c < MAP_SIZE; c++) {
                    const solid = isSolid(c, r);
                    const isTrap = state.traps.some(t => t.gx === c && t.gy === r);
                    
                    if (solid) {
                        ctx.fillStyle = '#1e1b4b'; // Deep Indigo walls
                    } else if (isTrap) {
                        ctx.fillStyle = '#b45309'; // Trap brown
                    } else {
                        // Checkerboard sandstone tiles
                        ctx.fillStyle = (c + r) % 2 === 0 ? '#451a03' : '#3c1502';
                    }
                    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
                }
            }

            // 2. Draw Crystals
            state.crystals.forEach(c => {
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.arc(c.gx * TILE + 8, c.gy * TILE + 8, 5, 0, Math.PI * 2);
                ctx.fill();

                // Glow active
                if (c.active || isSolved) {
                    ctx.shadowColor = c.color;
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(c.gx * TILE + 8, c.gy * TILE + 8, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            // 3. Draw Locking Granite Slab
            if (!state.wallOpen) {
                ctx.fillStyle = '#52525b';
                ctx.fillRect(8 * TILE + 1, 4 * TILE + 1, 14, 14);
                ctx.fillStyle = '#71717a';
                ctx.fillRect(8 * TILE + 3, 4 * TILE + 3, 10, 10);
            }

            // 4. Draw Relic (Shard of Casing Stone)
            if (!relicClaimed && state.wallOpen) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.arc(8 * TILE + 8, 1 * TILE + 8 + bounce, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // 5. Draw Sentinels
            state.sentinels.forEach(s => {
                if (s.hp > 0) {
                    // Shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.beginPath();
                    ctx.ellipse(s.x + 8, s.y + 14, 5, 2, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Skeleton sprite (Col 1, Row 3)
                    const colIdx = s.awake ? 1 : 1; // can change row/col if needed
                    ctx.drawImage(charImg, colIdx * 17, 3 * 17, 16, 16, s.x, s.y, 16, 16);
                }
            });

            // 6. Easter Eggs (illusion wall col 12, row 12; Carving col 3, row 9)
            // Carving stands out slightly
            ctx.fillStyle = '#311001';
            ctx.fillRect(3 * TILE + 4, 9 * TILE + 4, 8, 8);

            // Prompts
            if (Math.hypot(state.pax - (3 * TILE + 8), state.pay - (9 * TILE + 8)) < 22) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 3 * TILE + 8, 9 * TILE - 2);
            }

            // Illusion Wall walking trigger
            if (state.px === 12 && state.py === 12) {
                setDialogue("You walk through the dust of a crumbling block and discover a secret chamber! Inside sits a ancient brass astrolabe showing the Giza pyramids aligned perfectly with Orion's Belt.");
                state.pax = 12 * TILE + 8;
                state.pay = 11 * TILE + 8;
                state.px = 12;
                state.py = 11;
                sfx.hit();
            }

            // 7. Player strike animation
            if (state.swingT > 0) {
                ctx.strokeStyle = `rgba(56, 189, 248, ${state.swingT / 0.35})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(state.pax, state.pay - 3, 20, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 8. Draw Player shadow & aura
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

            // Draw Iron Ore Nodes
            state.ironNodes.forEach(node => {
                if (!node.mined) {
                    ctx.fillStyle = '#64748b'; // Slate gray base
                    ctx.fillRect(node.gx * TILE + 3, node.gy * TILE + 3, 10, 10);
                    ctx.fillStyle = '#94a3b8'; // Light highlights
                    ctx.fillRect(node.gx * TILE + 5, node.gy * TILE + 4, 3, 3);
                    ctx.fillRect(node.gx * TILE + 8, node.gy * TILE + 7, 2, 2);
                }
            });

            // Draw and Update dust motes
            dustMotes.forEach(m => {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                if (m.x < 0) m.x = MAP_SIZE * TILE;
                if (m.x > MAP_SIZE * TILE) m.x = 0;
                if (m.y < 0) m.y = MAP_SIZE * TILE;
                if (m.y > MAP_SIZE * TILE) m.y = 0;

                ctx.save();
                ctx.globalAlpha = m.alpha;
                ctx.fillStyle = '#e0f2fe'; // Light cyan dust
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw player avatar
            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19 - (moving && wphase === 0 ? 1 : 0), 16, 24);

            ctx.restore();

            // 9. Apply FLASH LIGHT effect
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.globalCompositeOperation = 'multiply';
            
            // Draw overall dark mask
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Clear light circle at player position
            ctx.globalCompositeOperation = 'source-over';
            const gradient = ctx.createRadialGradient(
                (state.pax * Z), (state.pay * Z) - 10, 0,
                (state.pax * Z), (state.pay * Z) - 10, 56 * Z
            );
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc((state.pax * Z), (state.pay * Z) - 10, 56 * Z, 0, Math.PI * 2);
            ctx.fill();
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

    // Handle Action interaction
    const handleAction = () => {
        const state = gameState.current;

        // Check if near a crystal
        for (const c of state.crystals) {
            const cx = c.gx * TILE + 8;
            const cy = c.gy * TILE + 8;
            if (Math.hypot(cx - state.pax, cy - state.pay) < 22 && !isSolved) {
                c.active = true;
                sfx.strike();

                const nextSeq = [...state.sequence, c.id];
                state.sequence = nextSeq;

                // Expected sequence: 0 (Low) -> 1 (Mid) -> 2 (High)
                const expected = [0, 1, 2];
                const correct = nextSeq.every((val, idx) => val === expected[idx]);

                if (!correct) {
                    setTimeout(() => resetSequence(), 150);
                } else if (nextSeq.length === 3) {
                    state.wallOpen = true;
                    onSolve();
                    setDialogue("The crystals resonate in perfect harmony! Giza's center granite slab slides back, revealing the casing stone Shard!");
                    sfx.victory();
                } else {
                    setDialogue(`Resonance stone struck: ${c.name}`);
                }
                return;
            }
        }

        // Check carving (col 3, row 9)
        if (Math.hypot(3 * TILE + 8 - state.pax, 9 * TILE + 8 - state.pay) < 22) {
            setDialogue("Ancient Wall Carving: 'We do not build to bury our kings; we build to channel the sky. The stones answer the voice of the stars, humming as one engine.'");
            sfx.hit();
            return;
        }

        // Trigger manual strike (also wakes dormant mummies if player swings near them)
        attackRef.current = true;
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
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-white bg-slate-950 p-4 rounded-3xl border border-cyan-500/20 shadow-2xl relative select-none">
            {/* Header controls */}
            <div className="flex justify-between items-center w-full max-w-[480px] mb-3">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Return to Chamber
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400">Giza Chamber</span>
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                        {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                </div>
            </div>

            {/* Main Canvas Container */}
            <div className="relative border-4 border-cyan-600/40 rounded-2xl overflow-hidden bg-cyan-950 shadow-inner">
                <canvas ref={canvasRef} className="block w-full max-w-[480px] aspect-square" />
            </div>

            {/* Dialogue text box */}
            {dialogue && (
                <div className="w-full max-w-[480px] mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/45 backdrop-blur-sm text-center">
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
                            background: 'rgba(34, 211, 238, 0.6)', border: '1px solid rgba(34, 211, 238, 0.85)',
                            transform: `translate(${knob.x}px, ${knob.y}px)`,
                            transition: joyActive.current ? 'none' : 'transform 0.15s ease'
                        }}
                    />
                </div>

                <button
                    onClick={handleAction}
                    onTouchStart={(e) => { e.preventDefault(); handleAction(); }}
                    className="w-16 h-16 rounded-full text-[10px] font-black uppercase tracking-widest text-black bg-cyan-400 border border-cyan-500 hover:bg-cyan-300 pointer-events-auto flex items-center justify-center active:scale-95 transition-transform"
                    style={{ touchAction: 'none' }}
                >
                    Strike
                </button>
            </div>
        </div>
    );
}
