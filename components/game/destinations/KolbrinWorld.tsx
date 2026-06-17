'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import MiniWorldInsight from '@/components/game/MiniWorldInsight';

const MAP_SIZE = 15;
const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const TILE = 16;

interface Props {
    character: GameCharacter;
    isSolved: boolean;
    minigameDone?: boolean;
    onSolve: () => void;
    onClaim: () => void;
    onExit: () => void;
    puzzleId?: string;
    puzzleHint?: string;
    accent?: string;
}

export default function KolbrinWorld({ character, isSolved, minigameDone = true, onSolve, onClaim, onExit, puzzleId, puzzleHint, accent = '#a855f7' }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dialogue, setDialogue] = useState<string | null>(
        isSolved 
            ? "The cipher is deciphered: WORMWOOD. The Bronzebook folio is revealed." 
            : "Welcome to the Kolbrin Vault. The Ink Shades roam the library. Collect the 8 floating encrypted letters (Z-R-U-P-Z-R-R-D), then bring them to the central Cipher Wheel to decipher the star's name."
    );
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_kolbrin_folio'));

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    // Game loop state
    const gameState = useRef({
        px: 7, // Grid column
        py: 13, // Grid row
        pax: 7 * 16 + 8, // Sub-pixel X
        pay: 13 * 16 + 8, // Sub-pixel Y
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        blindTimer: 0,
        runes: [
            { id: 0, char: 'Z', gx: 2, gy: 2, collected: false },
            { id: 1, char: 'R', gx: 12, gy: 2, collected: false },
            { id: 2, char: 'U', gx: 2, gy: 12, collected: false },
            { id: 3, char: 'P', gx: 12, gy: 12, collected: false },
            { id: 4, char: 'Z', gx: 4, gy: 5, collected: false },
            { id: 5, char: 'R', gx: 10, gy: 5, collected: false },
            { id: 6, char: 'R', gx: 4, gy: 9, collected: false },
            { id: 7, char: 'D', gx: 10, gy: 9, collected: false }
        ],
        inkShades: [
            { x: 3 * 16, y: 6 * 16, vx: 38, vy: 26 },
            { x: 11 * 16, y: 6 * 16, vx: -28, vy: 38 }
        ],
        wheelX: 7,
        wheelY: 7,
        solved: isSolved,
        t: 0
    });

    const toggleMute = () => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
    };

    const isSolid = useCallback((gx: number, gy: number) => {
        if (gx < 0 || gx >= MAP_SIZE || gy < 0 || gy >= MAP_SIZE) return true;
        // Outer borders
        if (gx === 0 || gx === MAP_SIZE - 1 || gy === 0 || gy === MAP_SIZE - 1) return true;
        
        // Bookcase partitions
        if (gy === 3 && gx >= 2 && gx <= 12 && gx !== 7) return true;
        if (gy === 11 && gx >= 2 && gx <= 12 && gx !== 7) return true;
        if (gx === 3 && gy >= 4 && gy <= 10 && gy !== 7) return true;
        if (gx === 11 && gy >= 4 && gy <= 10 && gy !== 7) return true;
        
        // Central wheel block
        if (gx === 7 && gy === 7) return true;

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

        // Initialize ink droplets and scroll pages
        const inkDroplets: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; type: 'droplet' | 'page' }[] = [];
        for (let i = 0; i < 20; i++) {
            inkDroplets.push({
                x: Math.random() * (MAP_SIZE * TILE),
                y: Math.random() * (MAP_SIZE * TILE),
                vx: (Math.random() - 0.5) * 12,
                vy: 6 + Math.random() * 8, // drifting downwards
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.4,
                type: Math.random() > 0.35 ? 'droplet' : 'page'
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

            // Blindness effect handler
            if (state.blindTimer > 0) state.blindTimer -= dt;

            // Player speed and input handling
            let speed = state.blindTimer > 0 ? 0 : 76; // immobilised when blinded
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

            if (moving && speed > 0) {
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

            // Runes collection check
            state.runes.forEach(r => {
                if (!r.collected && !state.solved) {
                    const rx = r.gx * TILE + 8;
                    const ry = r.gy * TILE + 8;
                    if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                        r.collected = true;
                        sfx.strike();
                        const gathered = state.runes.filter(x => x.collected).map(x => x.char).join('');
                        setDialogue(`You gathered the letter '${r.char}'! Encrypted runes gathered so far: ${gathered}`);
                    }
                }
            });

            // Ink Shades bounce movement & collision
            for (const s of state.inkShades) {
                let sxn = s.x + s.vx * dt;
                let syn = s.y + s.vy * dt;
                
                // Horizontal bounce
                const sgx_n = Math.floor((s.vx > 0 ? sxn + 15 : sxn) / TILE);
                const sgy = Math.floor(s.y / TILE);
                if (isSolid(sgx_n, sgy)) {
                    s.vx *= -1;
                } else {
                    s.x = sxn;
                }

                // Vertical bounce
                const sgx = Math.floor(s.x / TILE);
                const sgy_n = Math.floor((s.vy > 0 ? syn + 15 : syn) / TILE);
                if (isSolid(sgx, sgy_n)) {
                    s.vy *= -1;
                } else {
                    s.y = syn;
                }

                // Check collision with player
                const pWorldX = state.pax;
                const pWorldY = state.pay;
                if (Math.hypot(s.x + 8 - pWorldX, s.y + 8 - pWorldY) < 13) {
                    if (state.blindTimer <= 0) {
                        state.blindTimer = 1.5; // Blinded for 1.5s
                        sfx.hurt();
                        
                        // Drop a random collected letter
                        const collected = state.runes.filter(x => x.collected);
                        if (collected.length > 0) {
                            const dropped = collected[Math.floor(Math.random() * collected.length)];
                            dropped.collected = false;
                            setDialogue(`Ink Shade strikes you! You are blinded, and the rune '${dropped.char}' slipped from your hands!`);
                        } else {
                            setDialogue("An Ink Shade blinded you! You cannot move for a moment.");
                        }
                    }
                }
            }

            // Check relic collection
            if (!relicClaimed && state.solved) {
                const rx = 7 * TILE + 8;
                const ry = 8 * TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue("You claim the Folio of the Bronzebook. The page shimmers with golden letters, telling of the star's return.");
                    sfx.hit();
                }
            }

            // ---- RENDER ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);

            // 1. Draw Ground (Purple library floor)
            for (let r = 0; r < MAP_SIZE; r++) {
                for (let c = 0; c < MAP_SIZE; c++) {
                    const solid = isSolid(c, r);
                    if (solid) {
                        if (c === 7 && r === 7) {
                            ctx.fillStyle = '#1e1b4b'; // Cipher wheel pedestal
                        } else {
                            ctx.fillStyle = '#78350f'; // Bookcase brown wood
                        }
                    } else {
                        // Library tiles
                        ctx.fillStyle = (c + r) % 2 === 0 ? '#4c1d95' : '#3b0764';
                    }
                    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);

                    // Draw books texture inside bookcases
                    if (solid && !(c === 7 && r === 7) && r > 0 && r < MAP_SIZE - 1) {
                        ctx.fillStyle = '#b45309';
                        ctx.fillRect(c * TILE + 2, r * TILE + 2, 3, 12);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(c * TILE + 6, r * TILE + 4, 3, 10);
                        ctx.fillStyle = '#38bdf8';
                        ctx.fillRect(c * TILE + 10, r * TILE + 3, 4, 11);
                    }
                }
            }

            // 2. Draw Runes (floating letters)
            state.runes.forEach(r => {
                if (!r.collected && !state.solved) {
                    const bounce = Math.sin(state.t / 120 + r.gx) * 2;
                    ctx.fillStyle = '#a855f7';
                    ctx.beginPath();
                    ctx.arc(r.gx * TILE + 8, r.gy * TILE + 8 + bounce, 6, 0, Math.PI * 2);
                    ctx.fill();

                    // Print letter
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 7px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(r.char, r.gx * TILE + 8, r.gy * TILE + 10 + bounce);
                }
            });

            // 3. Draw Cipher Wheel (pedestal center)
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(7 * TILE + 8, 7 * TILE + 8, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(7 * TILE + 8, 7 * TILE + 8, 5, 0, Math.PI * 2);
            ctx.stroke();

            // 4. Draw Relic (Folio of the Bronzebook)
            if (!relicClaimed && state.solved) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(7 * TILE + 5, 8 * TILE + 5 + bounce, 6, 8);
                ctx.fillStyle = '#000';
                ctx.fillRect(7 * TILE + 6, 8 * TILE + 7 + bounce, 4, 1);
            }

            // 5. Draw Ink Shades
            for (const s of state.inkShades) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(s.x + 8, s.y + 14, 5, 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Slime/blob ghost (Col 8, Row 3)
                ctx.drawImage(charImg, 8 * 17, 3 * 17, 16, 16, s.x, s.y, 16, 16);
            }

            // 6. Draw Easter Eggs (Book col 4, row 7; Journal col 10, row 7)
            ctx.fillStyle = '#a1a1aa';
            ctx.fillRect(4 * TILE + 4, 7 * TILE + 4, 8, 8);
            ctx.fillRect(10 * TILE + 4, 7 * TILE + 4, 8, 8);

            // Prompts
            if (Math.hypot(state.pax - (4 * TILE + 8), state.pay - (7 * TILE + 8)) < 22) {
                ctx.fillStyle = '#a855f7';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 4 * TILE + 8, 7 * TILE - 2);
            }
            if (Math.hypot(state.pax - (10 * TILE + 8), state.pay - (7 * TILE + 8)) < 22) {
                ctx.fillStyle = '#a855f7';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 10 * TILE + 8, 7 * TILE - 2);
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

            // Draw and Update ink droplets/pages
            inkDroplets.forEach(d => {
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                if (d.x < 0) d.x = MAP_SIZE * TILE;
                if (d.x > MAP_SIZE * TILE) d.x = 0;
                if (d.y > MAP_SIZE * TILE) d.y = 0;

                ctx.save();
                ctx.globalAlpha = d.alpha;
                if (d.type === 'droplet') {
                    ctx.fillStyle = '#6b21a8'; // Dark purple ink
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#fef08a'; // Yellowish old scroll paper
                    ctx.translate(d.x, d.y);
                    ctx.rotate(Math.sin(state.t / 250 + d.x) * 0.3);
                    ctx.fillRect(-d.size, -d.size * 1.3, d.size * 2, d.size * 2.6);
                    
                    // Tiny ink lines on the page
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(-d.size + 1, -d.size * 0.6, d.size * 2 - 2, 0.5);
                    ctx.fillRect(-d.size + 1, 0, d.size * 2 - 2, 0.5);
                }
                ctx.restore();
            });

            // Draw player avatar
            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19 - (moving && wphase === 0 ? 1 : 0), 16, 24);

            ctx.restore();

            // Apply Ink Blindness effect (blackout screen)
            if (state.blindTimer > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, state.blindTimer / 0.8)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            raf = requestAnimationFrame(loop);
        }

        running = true;
        raf = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [isSolved, relicClaimed, onClaim, isSolid]);

    // Handle Action interaction
    const handleAction = () => {
        const state = gameState.current;

        // Check if near Cipher Wheel
        const wx = state.wheelX * TILE + 8;
        const wy = state.wheelY * TILE + 8;
        if (Math.hypot(wx - state.pax, wy - state.pay) < 22 && !isSolved) {
            const collected = state.runes.filter(x => x.collected);
            if (collected.length < 8) {
                setDialogue(`You only have ${collected.length}/8 runes. Gather all of them before turning the wheel!`);
                sfx.defeat();
            } else {
                if (!minigameDone) {
                    setDialogue('The cipher wheel will not turn until you pass the Drowned Maze trial — open Records.');
                    return;
                }
                state.solved = true;
                onSolve();
                setDialogue("You turn the Cipher Wheel three steps: ZRUPZRRG becomes WORMWOOD. The vault library slides open, revealing the Bronzebook folio!");
                sfx.victory();
            }
            return;
        }

        // Check Book (col 4, row 7)
        if (Math.hypot(4 * TILE + 8 - state.pax, 7 * TILE + 8 - state.pay) < 22) {
            setDialogue("The Bronzebook Excerpt: 'The great star, called the Destroyer, returns in cycles of ages. It burns red like fire, filling the sky, making the waters bitter. The wise must read the letters of the heavens.'");
            sfx.hit();
            return;
        }

        // Check Scribe Diary (col 10, row 7)
        if (Math.hypot(10 * TILE + 8 - state.pax, 7 * TILE + 8 - state.pay) < 22) {
            setDialogue("Monk's diary entry: 'We hid these folios in the library vault from the fire-shades and the king's men who wanted to burn history. WORMWOOD is its true name. Rot-3 holds the key.'");
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
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-white bg-slate-950 p-4 rounded-3xl border border-purple-500/20 shadow-2xl relative select-none">
            {/* Header controls */}
            <div className="flex justify-between items-center w-full max-w-[480px] mb-3">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Return to Chamber
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400">Kolbrin Vault</span>
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                        {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                </div>
            </div>

            {/* Main Canvas Container */}
            <div className="relative border-4 border-purple-600/40 rounded-2xl overflow-hidden bg-purple-950 shadow-inner">
                <canvas ref={canvasRef} className="block w-full max-w-[480px] aspect-square" />
            </div>

            <MiniWorldInsight character={character} puzzleId={puzzleId} baseHint={puzzleHint} accent={accent} isSolved={isSolved} />

            {/* Dialogue text box */}
            {dialogue && (
                <div className="w-full max-w-[480px] mt-4 p-4 rounded-xl border border-purple-500/20 bg-purple-950/45 backdrop-blur-sm text-center">
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
                            background: 'rgba(168, 85, 247, 0.6)', border: '1px solid rgba(168, 85, 247, 0.85)',
                            transform: `translate(${knob.x}px, ${knob.y}px)`,
                            transition: joyActive.current ? 'none' : 'transform 0.15s ease'
                        }}
                    />
                </div>

                <button
                    onClick={handleAction}
                    onTouchStart={(e) => { e.preventDefault(); handleAction(); }}
                    className="w-16 h-16 rounded-full text-[10px] font-black uppercase tracking-widest text-black bg-purple-400 border border-purple-500 hover:bg-purple-300 pointer-events-auto flex items-center justify-center active:scale-95 transition-transform"
                    style={{ touchAction: 'none' }}
                >
                    Action
                </button>
            </div>
        </div>
    );
}
