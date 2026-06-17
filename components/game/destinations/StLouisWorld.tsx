'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import MiniWorldInsight from '@/components/game/MiniWorldInsight';

const MAP_W = 18;
const MAP_H = 14;
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

export default function StLouisWorld({ character, isSolved, minigameDone = true, onSolve, onClaim, onExit, puzzleId, puzzleHint, accent = '#fbbf24' }: Props) {
    const addMaterial = useGameStore(s => s.addMaterial);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dialogue, setDialogue] = useState<string | null>(
        isSolved 
            ? "The turnstile is unlocked. St. Louis 1904 reveals its hidden token." 
            : "Welcome to St. Louis, 1904. The Caretakers guard the White Palaces. Interact with the 4 Dynamos to set the year of the Exposition (1-9-0-4) while avoiding their spotlight lanterns."
    );
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_fair_token'));

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    // Game loop state
    const gameState = useRef({
        px: 9, // Grid column
        py: 12, // Grid row
        pax: 9 * 16 + 8, // Sub-pixel X
        pay: 12 * 16 + 8, // Sub-pixel Y
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        caretakers: [
            { x: 3 * 16, y: 8 * 16, tx: 8 * 16, ty: 8 * 16, startX: 3 * 16, startY: 8 * 16, speed: 30, dir: 'right' as 'left' | 'right' | 'up' | 'down', angle: 0 },
            { x: 14 * 16, y: 9 * 16, tx: 9 * 16, ty: 9 * 16, startX: 14 * 16, startY: 9 * 16, speed: 32, dir: 'left' as 'left' | 'right' | 'up' | 'down', angle: Math.PI }
        ],
        dynamos: [
            { id: 0, name: 'D1', val: 0, gx: 4, gy: 3 },
            { id: 1, name: 'D2', val: 0, gx: 7, gy: 3 },
            { id: 2, name: 'D3', val: 0, gx: 10, gy: 3 },
            { id: 3, name: 'D4', val: 0, gx: 13, gy: 3 }
        ],
        copperNodes: [
            { id: 0, gx: 2, gy: 5, collected: false },
            { id: 1, gx: 15, gy: 5, collected: false },
            { id: 2, gx: 5, gy: 11, collected: false },
            { id: 3, gx: 12, gy: 11, collected: false },
            { id: 4, gx: 9, gy: 8, collected: false }
        ],
        gateOpen: isSolved,
        t: 0
    });

    const toggleMute = () => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
    };

    const isSolid = useCallback((gx: number, gy: number) => {
        if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H) return true;
        // Palaces and pillars walls
        if (gy <= 2) return true; // Top wall
        if (gy === 3 && (gx === 3 || gx === 6 || gx === 11 || gx === 14)) return true; // Pillar columns
        if (gy === 6 && (gx >= 3 && gx <= 5)) return true; // Left pavilion
        if (gy === 6 && (gx >= 12 && gx <= 14)) return true; // Right pavilion
        
        // Locked Gate block at (col 9, row 2)
        if (gy === 2 && gx === 9 && !gameState.current.gateOpen) return true;

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

    // Helper to check if player is in a spotlight vision cone
    const inSpotlight = (cx: number, cy: number, cdir: string, px: number, py: number) => {
        const dist = Math.hypot(px - cx, py - cy);
        if (dist > 72) return false; // Spotlight range limit: 4.5 tiles

        const dx = px - cx;
        const dy = py - cy;
        const targetAngle = Math.atan2(dy, dx);

        let coneCenter = 0;
        if (cdir === 'right') coneCenter = 0;
        else if (cdir === 'left') coneCenter = Math.PI;
        else if (cdir === 'down') coneCenter = Math.PI / 2;
        else if (cdir === 'up') coneCenter = -Math.PI / 2;

        let diff = Math.abs(targetAngle - coneCenter);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;

        return diff < Math.PI / 6; // 30-degree cone half-width
    };

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
            const sizeW = canvas.parentElement.clientWidth || 400;
            const sizeH = (sizeW * MAP_H) / MAP_W;
            canvas.width = sizeW;
            canvas.height = sizeH;
            Z = sizeW / (MAP_W * TILE);
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

            // Patrol Caretakers logic
            for (const c of state.caretakers) {
                const dx = c.tx - c.x;
                const dy = c.ty - c.y;
                const d = Math.hypot(dx, dy);
                if (d < 1) {
                    // Reverse patrol destination
                    const tempX = c.tx;
                    const tempY = c.ty;
                    c.tx = c.startX;
                    c.ty = c.startY;
                    c.startX = tempX;
                    c.startY = tempY;
                    c.dir = c.dir === 'left' ? 'right' : 'left';
                } else {
                    c.x += (dx / d) * c.speed * dt;
                    c.y += (dy / d) * c.speed * dt;
                }

                // Check spotlight collision
                if (inSpotlight(c.x + 8, c.y + 8, c.dir, state.pax, state.pay)) {
                    sfx.defeat();
                    state.pax = 9 * TILE + 8;
                    state.pay = 12 * TILE + 8;
                    state.px = 9;
                    state.py = 12;
                    state.facing = 'up';
                    setDialogue("Alert! A Caretaker spotted you! You were detained and escorted back to the entrance.");
                }
            }

            // Check copper node collisions
            state.copperNodes.forEach(node => {
                if (!node.collected) {
                    const nx = node.gx * TILE + 8;
                    const ny = node.gy * TILE + 8;
                    if (Math.hypot(nx - state.pax, ny - state.pay) < 12) {
                        node.collected = true;
                        addMaterial('copper', 1);
                        sfx.hit();
                        setDialogue("You collected a Copper Sheet! Perfect for upgrading weapons at the Forge.");
                    }
                }
            });

            // Check relic collection
            if (!relicClaimed && state.gateOpen) {
                const rx = 9 * TILE + 8;
                const ry = 1 * TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue("You claim the Fairgrounds Token. Brass shimmers in your hand, depicting a grand ivory dome.");
                    sfx.hit();
                }
            }

            // ---- RENDER ----
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);

            // 1. Draw Ground (White/light grey tiles)
            for (let r = 0; r < MAP_H; r++) {
                for (let c = 0; c < MAP_W; c++) {
                    const solid = isSolid(c, r);
                    if (solid) {
                        ctx.fillStyle = '#0f172a'; // dark border/pillars
                    } else {
                        // Light ivory pavings
                        ctx.fillStyle = (c + r) % 2 === 0 ? '#e2e8f0' : '#f1f5f9';
                    }
                    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);

                    // Draw fences
                    if (r === 6 && c >= 3 && c <= 5) {
                        ctx.fillStyle = '#475569';
                        ctx.fillRect(c * TILE, r * TILE + 12, TILE, 4);
                    }
                    if (r === 6 && c >= 12 && c <= 14) {
                        ctx.fillStyle = '#475569';
                        ctx.fillRect(c * TILE, r * TILE + 12, TILE, 4);
                    }
                }
            }

            // 2. Draw Dynamos
            state.dynamos.forEach(d => {
                ctx.fillStyle = '#854d0e'; // Brass housing
                ctx.fillRect(d.gx * TILE + 2, d.gy * TILE + 2, 12, 12);
                ctx.fillStyle = '#0f172a'; // Display window
                ctx.fillRect(d.gx * TILE + 4, d.gy * TILE + 4, 8, 8);

                // Print digit
                ctx.fillStyle = '#fcd34d';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(d.val.toString(), d.gx * TILE + 8, d.gy * TILE + 11);
            });

            // 3. Draw Gate / Portal
            if (!state.gateOpen) {
                ctx.fillStyle = '#ef4444'; // Red security beam
                ctx.fillRect(9 * TILE, 2 * TILE + 6, TILE, 4);
            } else {
                ctx.fillStyle = '#34d399'; // Green gate open
                ctx.fillRect(9 * TILE, 2 * TILE + 6, TILE, 4);
            }

            // 4. Draw Relic (Fairgrounds Token) if not claimed
            if (!relicClaimed && state.gateOpen) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(9 * TILE + 8, 1 * TILE + 8 + bounce, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // 5. Draw Caretakers (Enemies) and their spotlights
            for (const c of state.caretakers) {
                // Draw spotlight cone
                ctx.fillStyle = 'rgba(251, 243, 60, 0.18)';
                ctx.beginPath();
                ctx.moveTo(c.x + 8, c.y + 8);
                
                let angle = 0;
                if (c.dir === 'right') angle = 0;
                else if (c.dir === 'left') angle = Math.PI;
                else if (c.dir === 'down') angle = Math.PI / 2;
                else if (c.dir === 'up') angle = -Math.PI / 2;

                ctx.arc(
                    c.x + 8, c.y + 8, 
                    72, 
                    angle - Math.PI / 6, 
                    angle + Math.PI / 6
                );
                ctx.closePath();
                ctx.fill();

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(c.x + 8, c.y + 14, 5, 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw Caretaker sprite (Row 3, Col 1 is skeleton, or Row 11, Col 0 is Sage / dark clothes)
                ctx.drawImage(charImg, 0 * 17, 11 * 17, 16, 16, c.x, c.y, 16, 16);
            }

            // 6. Draw Easter Eggs (Blueprints col 2, row 6; Newspaper col 15, row 6)
            ctx.fillStyle = '#a1a1aa';
            ctx.fillRect(2 * TILE + 4, 6 * TILE + 4, 8, 8); // Blueprint stand
            ctx.fillRect(15 * TILE + 4, 6 * TILE + 4, 8, 8); // Newspaper stand

            // Render Prompt indicators if close
            if (Math.hypot(state.pax - (2 * TILE + 8), state.pay - (6 * TILE + 8)) < 22) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 2 * TILE + 8, 6 * TILE - 2);
            }
            if (Math.hypot(state.pax - (15 * TILE + 8), state.pay - (6 * TILE + 8)) < 22) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Read', 15 * TILE + 8, 6 * TILE - 2);
            }

            // Draw player shadow & aura
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

            // Draw Copper Sheets
            state.copperNodes.forEach(node => {
                if (!node.collected) {
                    const bounce = Math.sin((state.t + node.id * 500) / 200) * 1.5;
                    ctx.fillStyle = '#ea580c'; // Metallic copper color
                    ctx.fillRect(node.gx * TILE + 4, node.gy * TILE + 4 + bounce, 8, 8);
                    ctx.fillStyle = '#fdba74'; // Highlight line
                    ctx.fillRect(node.gx * TILE + 5, node.gy * TILE + 5 + bounce, 2, 6);
                }
            });

            // Draw electric sparks
            if (Math.random() < 0.15) {
                const sparks = [
                    { from: { x: 4 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 3 * TILE + 8, y: 3 * TILE + 8 } },
                    { from: { x: 4 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 6 * TILE + 8, y: 3 * TILE + 8 } },
                    { from: { x: 7 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 6 * TILE + 8, y: 3 * TILE + 8 } },
                    { from: { x: 10 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 11 * TILE + 8, y: 3 * TILE + 8 } },
                    { from: { x: 13 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 11 * TILE + 8, y: 3 * TILE + 8 } },
                    { from: { x: 13 * TILE + 8, y: 3 * TILE + 8 }, to: { x: 14 * TILE + 8, y: 3 * TILE + 8 } }
                ];
                const s = sparks[Math.floor(Math.random() * sparks.length)];
                ctx.strokeStyle = '#38bdf8'; // Electric blue
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(s.from.x, s.from.y);
                const midX = (s.from.x + s.to.x) / 2;
                const midY = (s.from.y + s.to.y) / 2 + (Math.random() - 0.5) * 6;
                ctx.lineTo(midX, midY);
                ctx.lineTo(s.to.x, s.to.y);
                ctx.stroke();
            }

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
    }, [isSolved, relicClaimed, onClaim, isSolid]);

    // Handle Action interaction
    const handleAction = () => {
        const state = gameState.current;

        // Check if near a dynamo
        for (const d of state.dynamos) {
            const dx = d.gx * TILE + 8;
            const dy = d.gy * TILE + 8;
            if (Math.hypot(dx - state.pax, dy - state.pay) < 22 && !isSolved) {
                d.val = (d.val + 1) % 10;
                sfx.strike();

                // Validate year solution
                const code = state.dynamos.map(x => x.val).join('');
                if (code === '1904') {
                    if (!minigameDone) {
                        setDialogue('The turnstile stays locked until you clear the White Blocks trial — open Records.');
                        return;
                    }
                    state.gateOpen = true;
                    onSolve();
                    setDialogue("Success! The year is set to 1904. The electromagnetic gates drop. The Fairgrounds Token is unlocked!");
                    sfx.victory();
                } else {
                    setDialogue(`Dynamo ${d.id + 1} set to ${d.val}. Current passcode: ${code}`);
                }
                return;
            }
        }

        // Check blueprints (col 2, row 6)
        if (Math.hypot(2 * TILE + 8 - state.pax, 6 * TILE + 8 - state.pay) < 22) {
            setDialogue("Atmospheric Electricity Blueprints: Schematics of the white palace domes showing wireless power transmitters drawing charge from the stratosphere. Label: 'Grand Illuminations of 1904'.");
            sfx.hit();
            return;
        }

        // Check newspaper (col 15, row 6)
        if (Math.hypot(15 * TILE + 8 - state.pax, 6 * TILE + 8 - state.pay) < 22) {
            setDialogue("The St. Louis Dispatch, Oct 1904: 'The Plaster Myth. Architectural experts question the speed of building and demolition. Why are we tearing down palaces that withstand fire and wear? A hidden city uncovered?'");
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
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-white bg-slate-950 p-4 rounded-3xl border border-amber-500/20 shadow-2xl relative select-none">
            {/* Header controls */}
            <div className="flex justify-between items-center w-full max-w-[480px] mb-3">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Return to Chamber
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400">St. Louis, 1904</span>
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                        {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                </div>
            </div>

            {/* Main Canvas Container */}
            <div className="relative border-4 border-amber-600/40 rounded-2xl overflow-hidden bg-amber-950 shadow-inner">
                <canvas ref={canvasRef} className="block w-full max-w-[480px]" />
            </div>

            <MiniWorldInsight character={character} puzzleId={puzzleId} baseHint={puzzleHint} accent={accent} isSolved={isSolved} />

            {/* Dialogue text box */}
            {dialogue && (
                <div className="w-full max-w-[480px] mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-950/45 backdrop-blur-sm text-center">
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
                            background: 'rgba(251, 191, 36, 0.6)', border: '1px solid rgba(251, 191, 36, 0.85)',
                            transform: `translate(${knob.x}px, ${knob.y}px)`,
                            transition: joyActive.current ? 'none' : 'transform 0.15s ease'
                        }}
                    />
                </div>

                <button
                    onClick={handleAction}
                    onTouchStart={(e) => { e.preventDefault(); handleAction(); }}
                    className="w-16 h-16 rounded-full text-[10px] font-black uppercase tracking-widest text-black bg-amber-400 border border-amber-500 hover:bg-amber-300 pointer-events-auto flex items-center justify-center active:scale-95 transition-transform"
                    style={{ touchAction: 'none' }}
                >
                    Action
                </button>
            </div>
        </div>
    );
}
