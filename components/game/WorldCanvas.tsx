'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';

// ============================================================
//  THE WORLD — a lightweight, mobile-first 2D canvas engine.
//  Single-screen cavern that scales to fit any device. Touch
//  joystick (or WASD/arrows). Renders Kenney character sprites.
//  Truth = NPC, a scroll = pickup, a "shade" = spiritual enemy.
// ============================================================

const TILE = 16;
const COLS = 12;
const ROWS = 16;
const W = COLS * TILE; // logical world width
const H = ROWS * TILE; // logical world height
const DRAW = 22;       // sprite draw size (logical px)
const SHEET_W = 918;

const TRUTH_TILE = { col: 1, row: 10 };
const SHADE_TILE = { col: 0, row: 3 }; // faceless green base = a spiritual shade

type Nearby = 'truth' | null;

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

interface WorldCanvasProps {
    character: GameCharacter;
    onTalk: () => void;
    onCollect: () => void;
    onEncounter: () => void;
}

export default function WorldCanvas({ character, onTalk, onCollect, onEncounter }: WorldCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const interactRef = useRef(false);
    const nearbyRef = useRef<Nearby>(null);
    const [nearby, setNearby] = useState<Nearby>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    const cbRef = useRef({ onTalk, onCollect, onEncounter });
    cbRef.current = { onTalk, onCollect, onEncounter };

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.src = '/assets/kenney/roguelikeChar.png';

        // decorative rocks (computed once)
        const rocks = Array.from({ length: 7 }, (_, i) => ({
            x: TILE * 1.5 + ((i * 53) % (W - TILE * 3)),
            y: TILE * 2 + ((i * 97) % (H - TILE * 4)),
            r: 2 + (i % 3),
        }));

        const st = {
            player: { x: W / 2, y: H - TILE * 2.5 },
            truth: { x: W / 2, y: TILE * 2.6 },
            scroll: { x: TILE * 2.4, y: H / 2, collected: false },
            shade: { x: W - TILE * 2.6, y: H / 2, vx: 14, vy: 10 },
            encountered: false,
        };

        let raf = 0;
        let last = performance.now();
        let running = true;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            const c = canvas.getContext('2d')!;
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        function spriteAt(col: number, row: number, cx: number, cy: number, alpha = 1) {
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, col * 17, row * 17, 16, 16, cx - DRAW / 2, cy - DRAW * 0.62, DRAW, DRAW);
            ctx.globalAlpha = 1;
        }

        function aura(cx: number, cy: number, color: string, r: number) {
            const g = ctx.createRadialGradient(cx, cy - DRAW * 0.2, 0, cx, cy - DRAW * 0.2, r);
            g.addColorStop(0, color + '66');
            g.addColorStop(1, color + '00');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy - DRAW * 0.2, r, 0, Math.PI * 2);
            ctx.fill();
        }

        function shadow(cx: number, cy: number) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + DRAW * 0.32, DRAW * 0.32, DRAW * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawCavern() {
            // floor
            ctx.fillStyle = '#16131d';
            ctx.fillRect(0, 0, W, H);
            // rocks
            for (const r of rocks) {
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, r.r, r.r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // vignette
            const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, W, H);
            // walls
            ctx.fillStyle = '#0a0912';
            ctx.fillRect(0, 0, W, TILE);
            ctx.fillRect(0, H - TILE, W, TILE);
            ctx.fillRect(0, 0, TILE, H);
            ctx.fillRect(W - TILE, 0, TILE, H);
            ctx.fillStyle = 'rgba(251,191,36,0.06)';
            ctx.fillRect(TILE, TILE, W - TILE * 2, 1);
        }

        function drawScroll(x: number, y: number, t: number) {
            const bob = Math.sin(t / 320) * 1.6;
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 7;
            ctx.fillStyle = '#ecdca6';
            ctx.fillRect(x - 3.5, y - 5 + bob, 7, 10);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(x - 4.5, y - 6 + bob, 9, 2);
            ctx.fillRect(x - 4.5, y + 3 + bob, 9, 2);
            ctx.restore();
        }

        function loop(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            // ---- input ----
            let ix = joyRef.current.x;
            let iy = joyRef.current.y;
            const k = keysRef.current;
            if (k.has('arrowleft') || k.has('a')) ix = -1;
            if (k.has('arrowright') || k.has('d')) ix = 1;
            if (k.has('arrowup') || k.has('w')) iy = -1;
            if (k.has('arrowdown') || k.has('s')) iy = 1;
            const mag = Math.hypot(ix, iy);
            if (mag > 1) { ix /= mag; iy /= mag; }

            // ---- move player (clamp to walls) ----
            const speed = 62;
            const lo = TILE + DRAW * 0.28;
            const hiX = W - TILE - DRAW * 0.28;
            const hiY = H - TILE - DRAW * 0.1;
            st.player.x = Math.max(lo, Math.min(hiX, st.player.x + ix * speed * dt));
            st.player.y = Math.max(TILE + DRAW * 0.5, Math.min(hiY, st.player.y + iy * speed * dt));

            // ---- shade drift ----
            st.shade.x += st.shade.vx * dt;
            st.shade.y += st.shade.vy * dt;
            if (st.shade.x < lo || st.shade.x > hiX) st.shade.vx *= -1;
            if (st.shade.y < TILE + DRAW * 0.5 || st.shade.y > hiY) st.shade.vy *= -1;

            // ---- interactions ----
            const near: Nearby = dist(st.player, st.truth) < TILE * 1.6 ? 'truth' : null;
            if (near !== nearbyRef.current) {
                nearbyRef.current = near;
                setNearby(near);
            }
            if (!st.scroll.collected && dist(st.player, st.scroll) < TILE * 0.9) {
                st.scroll.collected = true;
                cbRef.current.onCollect();
            }
            if (!st.encountered && dist(st.player, st.shade) < TILE * 0.85) {
                st.encountered = true;
                cbRef.current.onEncounter();
            }
            if (interactRef.current) {
                interactRef.current = false;
                if (near === 'truth') cbRef.current.onTalk();
            }

            // ---- render ----
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const scale = Math.min(vw / W, vh / H);
            const offX = (vw - W * scale) / 2;
            const offY = (vh - H * scale) / 2;

            ctx.fillStyle = '#05060a';
            ctx.fillRect(0, 0, vw, vh);
            ctx.save();
            ctx.translate(offX, offY);
            ctx.scale(scale, scale);

            drawCavern();
            if (!st.scroll.collected) drawScroll(st.scroll.x, st.scroll.y, now);

            // truth
            aura(st.truth.x, st.truth.y, '#fbbf24', 16);
            shadow(st.truth.x, st.truth.y);
            spriteAt(TRUTH_TILE.col, TRUTH_TILE.row, st.truth.x, st.truth.y);

            // shade (spiritual form: ghostly + cool aura)
            const flicker = 0.4 + Math.sin(now / 260) * 0.12;
            aura(st.shade.x, st.shade.y, '#22d3ee', 15);
            spriteAt(SHADE_TILE.col, SHADE_TILE.row, st.shade.x, st.shade.y, flicker);

            // player
            const ap = charRef.current.appearance;
            aura(st.player.x, st.player.y, ap.aura, 14);
            shadow(st.player.x, st.player.y);
            spriteAt(ap.bodyTile.col, ap.bodyTile.row, st.player.x, st.player.y);

            ctx.restore();
            raf = requestAnimationFrame(loop);
        }

        const start = () => {
            last = performance.now();
            raf = requestAnimationFrame(loop);
        };
        if (img.complete) start();
        else img.onload = start;

        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }, []);

    // ---- joystick handlers ----
    const joyMove = (clientX: number, clientY: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);
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
        <>
            <canvas ref={canvasRef} className="world-canvas" />

            {/* touch joystick */}
            <div
                ref={baseRef}
                onTouchStart={(e) => { joyActive.current = true; const t = e.touches[0]; joyMove(t.clientX, t.clientY); }}
                onTouchMove={(e) => { e.preventDefault(); if (joyActive.current) { const t = e.touches[0]; joyMove(t.clientX, t.clientY); } }}
                onTouchEnd={joyEnd}
                onMouseDown={(e) => { joyActive.current = true; joyMove(e.clientX, e.clientY); }}
                onMouseMove={(e) => { if (joyActive.current) joyMove(e.clientX, e.clientY); }}
                onMouseUp={joyEnd}
                onMouseLeave={joyEnd}
                className="absolute left-6 bottom-9 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
                style={{ width: JOY_R * 2, height: JOY_R * 2, touchAction: 'none' }}
            >
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '42%', height: '42%', left: '29%', top: '29%',
                        background: 'rgba(251,191,36,0.55)', border: '1px solid rgba(251,191,36,0.8)',
                        transform: `translate(${knob.x}px, ${knob.y}px)`,
                    }}
                />
            </div>

            {/* interact button */}
            {nearby === 'truth' && (
                <button
                    onClick={() => { interactRef.current = true; }}
                    onTouchStart={(e) => { e.preventDefault(); interactRef.current = true; }}
                    className="absolute right-7 bottom-12 w-20 h-20 rounded-full text-[10px] font-black uppercase tracking-widest text-black flex items-center justify-center animate-pulse"
                    style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 24px rgba(251,191,36,0.4)', touchAction: 'none' }}
                >
                    Speak
                </button>
            )}
        </>
    );
}
