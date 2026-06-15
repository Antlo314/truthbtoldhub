'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { Destination } from '@/lib/game/destinations';

// ============================================================
//  COMBAT — real-time, mobile-first. Move with the joystick,
//  tap ATTACK (or J / Space) to strike shades within reach.
//  Clear the shades, then defeat the guardian boss.
// ============================================================

const TILE = 16;
const COLS = 12;
const ROWS = 16;
const W = COLS * TILE;
const H = ROWS * TILE;
const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const SHADE_TILE = { col: 0, row: 3 };
const PLAYER_HP = 100;

interface Foe { x: number; y: number; hp: number; max: number; boss?: boolean; hurt: number; }

interface Props {
    destination: Destination;
    character: GameCharacter;
    weaponDamage: number;
    weaponReach: number;
    bonusHp?: number;
    bonusDamage?: number;
    bonusReach?: number;
    onVictory: () => void;
    onDefeat: () => void;
    onExit: () => void;
}

export default function CombatScene({ destination: d, character, weaponDamage, weaponReach, bonusHp = 0, bonusDamage = 0, bonusReach = 0, onVictory, onDefeat, onExit }: Props) {
    const maxHp = PLAYER_HP + bonusHp;
    const dmg = weaponDamage + bonusDamage;
    const reach = weaponReach + bonusReach;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const attackRef = useRef(false);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    const [hp, setHp] = useState(maxHp);
    const [boss, setBoss] = useState<{ name: string; hp: number; max: number } | null>(null);
    const [foesLeft, setFoesLeft] = useState(0);
    const [outcome, setOutcome] = useState<'fight' | 'won' | 'lost'>('fight');

    const endRef = useRef({ onVictory, onDefeat });
    endRef.current = { onVictory, onDefeat };

    useEffect(() => {
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.src = CHAR_SHEET;
        const cfg = d.combat!;

        const rand = (a: number, b: number) => a + Math.random() * (b - a);
        const st = {
            px: W / 2, py: H - TILE * 3, php: maxHp, atk: 0, swing: 0,
            foes: [] as Foe[], bossSpawned: false, done: false,
        };
        for (let i = 0; i < cfg.enemyCount; i++) {
            st.foes.push({ x: rand(TILE * 2, W - TILE * 2), y: rand(TILE * 2, H / 2), hp: cfg.enemyHp, max: cfg.enemyHp, hurt: 0 });
        }
        setFoesLeft(st.foes.length);

        let raf = 0, last = performance.now(), running = true;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

        function loop(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            if (!st.done) {
                // input
                let ix = joyRef.current.x, iy = joyRef.current.y;
                const k = keysRef.current;
                if (k.has('arrowleft') || k.has('a')) ix = -1;
                if (k.has('arrowright') || k.has('d')) ix = 1;
                if (k.has('arrowup') || k.has('w')) iy = -1;
                if (k.has('arrowdown') || k.has('s')) iy = 1;
                const mag = Math.hypot(ix, iy);
                if (mag > 1) { ix /= mag; iy /= mag; }
                const lo = TILE + 4, hiX = W - TILE - 4, hiY = H - TILE - 4;
                st.px = Math.max(lo, Math.min(hiX, st.px + ix * 64 * dt));
                st.py = Math.max(lo, Math.min(hiY, st.py + iy * 64 * dt));

                // attack — the weapon strikes any shade within reach on its own
                // rhythm (move to engage); the Strike button forces a swing.
                st.atk -= dt; st.swing -= dt;
                const me = { x: st.px, y: st.py };
                const forceStrike = attackRef.current || keysRef.current.has('j') || keysRef.current.has(' ');
                const inReach = st.foes.some((f) => dist(f, me) <= reach + (f.boss ? 6 : 0));
                if (st.atk <= 0 && (inReach || forceStrike)) {
                    st.atk = 0.42; st.swing = 0.18;
                    for (const f of st.foes) {
                        if (dist(f, me) <= reach + (f.boss ? 6 : 0)) {
                            f.hp -= dmg; f.hurt = 0.12;
                            const a = Math.atan2(f.y - st.py, f.x - st.px);
                            f.x += Math.cos(a) * 6; f.y += Math.sin(a) * 6;
                        }
                    }
                }
                attackRef.current = false;

                // foes act
                const speedFor = (f: Foe) => (f.boss ? 26 : 34);
                let contactDps = 0;
                for (const f of st.foes) {
                    f.hurt -= dt;
                    const a = Math.atan2(st.py - f.y, st.px - f.x);
                    f.x += Math.cos(a) * speedFor(f) * dt;
                    f.y += Math.sin(a) * speedFor(f) * dt;
                    if (dist(f, { x: st.px, y: st.py }) < (f.boss ? 14 : 10)) contactDps += f.boss ? cfg.bossDmg : cfg.enemyDmg;
                }
                if (contactDps > 0) { st.php -= contactDps * dt; setHp(Math.max(0, Math.round(st.php))); }

                // remove dead
                const before = st.foes.length;
                st.foes = st.foes.filter((f) => f.hp > 0);
                if (st.foes.length !== before) setFoesLeft(st.foes.filter((f) => !f.boss).length);

                // boss phase
                if (!st.bossSpawned && st.foes.length === 0) {
                    st.bossSpawned = true;
                    const b: Foe = { x: W / 2, y: TILE * 3, hp: cfg.bossHp, max: cfg.bossHp, boss: true, hurt: 0 };
                    st.foes.push(b);
                    setBoss({ name: cfg.bossName, hp: b.hp, max: b.max });
                }
                if (st.bossSpawned) {
                    const b = st.foes.find((f) => f.boss);
                    if (b) setBoss({ name: cfg.bossName, hp: Math.max(0, Math.round(b.hp)), max: b.max });
                }

                // outcomes
                if (st.php <= 0) { st.done = true; setOutcome('lost'); setTimeout(() => endRef.current.onDefeat(), 1400); }
                else if (st.bossSpawned && st.foes.length === 0) { st.done = true; setOutcome('won'); setTimeout(() => endRef.current.onVictory(), 1600); }
            }

            // ---- render ----
            const vw = canvas.clientWidth, vh = canvas.clientHeight;
            const scale = Math.min(vw / W, vh / H);
            const ox = (vw - W * scale) / 2, oy = (vh - H * scale) / 2;
            ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, vw, vh);
            ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);

            // floor
            ctx.fillStyle = d.bg[0]; ctx.fillRect(0, 0, W, H);
            const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.72);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, d.bg[1]);
            ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00000088';
            ctx.fillRect(0, 0, W, TILE); ctx.fillRect(0, H - TILE, W, TILE); ctx.fillRect(0, 0, TILE, H); ctx.fillRect(W - TILE, 0, TILE, H);

            const spriteAt = (cx: number, cy: number, sizeScale: number, alpha: number, tint?: string) => {
                const s = 16 * sizeScale;
                if (tint) { ctx.save(); }
                ctx.globalAlpha = alpha;
                ctx.drawImage(img, SHADE_TILE.col * 17, SHADE_TILE.row * 17, 16, 16, cx - s / 2, cy - s * 0.62, s, s);
                ctx.globalAlpha = 1;
            };
            const glow = (cx: number, cy: number, color: string, r: number) => {
                const g = ctx.createRadialGradient(cx, cy - 4, 0, cx, cy - 4, r);
                g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy - 4, r, 0, Math.PI * 2); ctx.fill();
            };

            // foes
            for (const f of st.foes) {
                const col = f.boss ? '#ef4444' : '#22d3ee';
                glow(f.x, f.y, col, f.boss ? 18 : 11);
                spriteAt(f.x, f.y, f.boss ? 2.4 : 1.2, f.hurt > 0 ? 0.9 : 0.55);
                if (f.boss) {
                    // boss hp pip ring is shown in DOM; draw a small bar above
                    ctx.fillStyle = '#000a'; ctx.fillRect(f.x - 14, f.y - 26, 28, 3);
                    ctx.fillStyle = col; ctx.fillRect(f.x - 14, f.y - 26, 28 * (f.hp / f.max), 3);
                }
            }

            // swing
            if (st.swing > 0) {
                ctx.strokeStyle = `rgba(251,191,36,${st.swing / 0.18})`;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(st.px, st.py - 2, reach, 0, Math.PI * 2); ctx.stroke();
            }

            // player
            glow(st.px, st.py, character.appearance.aura, 11);
            ctx.globalAlpha = 1;
            ctx.drawImage(img, character.appearance.bodyTile.col * 17, character.appearance.bodyTile.row * 17, 16, 16, st.px - 11, st.py - 14, 22, 22);

            ctx.restore();
            raf = requestAnimationFrame(loop);
        }

        const start = () => { last = performance.now(); raf = requestAnimationFrame(loop); };
        if (img.complete) start(); else img.onload = start;

        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            running = false; cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
        };
    }, []);

    const joyMove = (cx: number, cy: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        const dx = cx - (rect.left + rect.width / 2), dy = cy - (rect.top + rect.height / 2);
        const dd = Math.hypot(dx, dy) || 1, m = Math.min(dd, JOY_R), a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * m, ky = Math.sin(a) * m;
        setKnob({ x: kx, y: ky }); joyRef.current = { x: kx / JOY_R, y: ky / JOY_R };
    };
    const joyEnd = () => { joyActive.current = false; setKnob({ x: 0, y: 0 }); joyRef.current = { x: 0, y: 0 }; };

    return (
        <div className="absolute inset-0 z-40 bg-black select-none" style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} className="world-canvas" />

            {/* top bars */}
            <div className="absolute top-0 left-0 right-0 px-4 py-3 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center justify-between">
                    <button onClick={onExit} className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white">‹ Flee</button>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">{boss ? 'Guardian' : `Shades · ${foesLeft}`}</span>
                </div>
                {/* player hp */}
                <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(hp / maxHp) * 100}%`, background: hp > maxHp * 0.3 ? '#34d399' : '#ef4444' }} />
                </div>
                {boss && (
                    <div className="mt-1">
                        <p className="text-[9px] uppercase tracking-[0.25em] text-red-400 mb-1">{boss.name}</p>
                        <div className="h-2.5 rounded-full bg-black/50 overflow-hidden border border-red-500/30">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${(boss.hp / boss.max) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* outcome banner */}
            {outcome !== 'fight' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="font-ritual text-3xl" style={{ color: outcome === 'won' ? '#fbbf24' : '#ef4444' }}>
                        {outcome === 'won' ? 'The guardian falls.' : 'You fall…'}
                    </p>
                </div>
            )}

            {/* joystick */}
            <div
                ref={baseRef}
                onTouchStart={(e) => { joyActive.current = true; const t = e.touches[0]; joyMove(t.clientX, t.clientY); }}
                onTouchMove={(e) => { e.preventDefault(); if (joyActive.current) { const t = e.touches[0]; joyMove(t.clientX, t.clientY); } }}
                onTouchEnd={joyEnd}
                onMouseDown={(e) => { joyActive.current = true; joyMove(e.clientX, e.clientY); }}
                onMouseMove={(e) => { if (joyActive.current) joyMove(e.clientX, e.clientY); }}
                onMouseUp={joyEnd} onMouseLeave={joyEnd}
                className="absolute left-6 bottom-9 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
                style={{ width: JOY_R * 2, height: JOY_R * 2, touchAction: 'none' }}
            >
                <div className="absolute rounded-full" style={{ width: '42%', height: '42%', left: '29%', top: '29%', background: 'rgba(251,191,36,0.55)', border: '1px solid rgba(251,191,36,0.8)', transform: `translate(${knob.x}px, ${knob.y}px)` }} />
            </div>

            {/* attack */}
            <button
                onClick={() => { attackRef.current = true; }}
                onTouchStart={(e) => { e.preventDefault(); attackRef.current = true; }}
                className="absolute right-7 bottom-10 w-20 h-20 rounded-full text-[11px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95"
                style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 24px rgba(251,191,36,0.4)', touchAction: 'none' }}
            >
                Strike
            </button>
        </div>
    );
}
