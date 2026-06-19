'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { asfx, arcadeMusic, unlockArcadeAudio, isArcadeMuted, setArcadeMuted } from '@/lib/game/arcadeSfx';
import {
    SPEED, SPEED_MULTS, GRAVITY, JUMP_VELOCITY, TERMINAL_VY, CEIL, START_PAD,
    createGen, generateAhead, type Obstacle, type ModeKind, type VeilGen,
} from '@/lib/game/veilLevels';

// ============================================================
//  VEIL — a Geometry-Dash-style rhythm runner for the Sanctum
//  Arcade. Deterministic 240Hz fixed-timestep engine decoupled
//  from rAF; cube + ship modes via portals; endless provably-
//  beatable levels; neon canvas render with beat pulse, trail,
//  particles, and procedural music. Mirrors the Tetris/Serpent
//  component shape (run-once effect, statusRef, ref loop).
// ============================================================

// ---- engine constants ----
const SIM_DT = 1000 / 240;          // ms per sim step
const SIM_DT_S = SIM_DT / 1000;
const MAX_FRAME_MS = 100;
const MAX_STEPS = 8;
const LOOKAHEAD_UNITS = 14;         // target horizontal units visible (drives cell size → enough warning of obstacles)
const MIN_PX = 14;
const MAX_PX = 40;
const GROUND_BAND_FRAC = 0.28;      // ground sits this far up from the bottom
const PLAYER_SCREEN_X = 3.0;
const HITBOX_INSET = 0.22;
const SPIKE_INSET = 0.18;
const CONTACT_EPS = 0.04;
const LAND_EPS = 0.15;
const HOLD_REJUMP_COOLDOWN = 0.06;  // s
const SHIP_THRUST = 62;
const SHIP_GRAVITY = 58;
const SHIP_VY_CLAMP = 26;
const PAD_V = 27;
const COIN_BONUS = 50;
const SPAWN_AHEAD = 8;
const CULL_BEHIND = 4;
const BEAT_MS = 60000 / 128;        // visual beat (128 BPM)
const TRAIL_LEN = 14;
const MAX_PARTICLES = 120;
const SECTION_HUES = [210, 270, 320, 160, 30];

const PAL = {
    void: '#06060d', grid: '#3a2d6b', gridHot: '#7c5cff', ground: '#9d7bff',
    spike: '#ff4d6d', block: '#5b8cff', portalGrav: '#ffb454', portalMode: '#22d3ee',
    speed: '#ff7ae0', orb: '#ffd24a', pad: '#36e0a0', coin: '#fcd34d', shard: '#b69bff', text: '#ece8ff',
};

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; }

interface VS {
    px: number; py: number; vy: number; prevPy: number;
    gravitySign: 1 | -1;
    mode: ModeKind;
    speedMult: number;
    onSurface: boolean;
    wasOnSurface: boolean;
    lastHoldJumpT: number;
    simTime: number;
    acc: number; last: number;
    obstacles: Obstacle[];
    gen: VeilGen;
    coins: number;
    distance: number;       // = px, the score basis
    shield: boolean;        // Aegis from a Source Shard (one-hit)
    invulnUntil: number;    // sim-time i-frames after an Aegis break
    shardsUsed: number;
    // visual-only
    trail: { x: number; y: number }[];
    particles: Particle[];
    shakeUntil: number; shakeMag: number;
    flash: number;          // wall-clock ms of a portal flash
}

export type VeilResult = { score: number; lines: number; level: number };

interface Props {
    accent: string;
    onExit: () => void;
    onGameOver: (r: VeilResult) => void;
    onReset?: () => void;
    submitState?: 'idle' | 'saving' | 'saved' | 'error';
    submitMessage?: string;
    isNewBest?: boolean;
}

function pointInTri(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(neg && pos);
}

export default function VeilGame({ accent, onExit, onGameOver, onReset, submitState = 'idle', submitMessage, isNewBest }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dimRef = useRef({ px: 0, w: 0, h: 0, viewUnits: 16, floorY: 0 });
    const stRef = useRef<VS | null>(null);
    const overRef = useRef(false);
    const statusRef = useRef<'playing' | 'paused' | 'over'>('playing');
    const propsRef = useRef({ onGameOver, onReset });
    const inputRef = useRef({ held: false, tapPending: false });
    const attemptsRef = useRef(1);
    const reduceRef = useRef(false);
    const shown = useRef({ score: -1, coins: -1, shield: -1 });
    const actionsRef = useRef<{ [k: string]: (...a: any[]) => void }>({});

    const [status, setStatus] = useState<'playing' | 'paused' | 'over'>('playing');
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(0);
    const [attempt, setAttempt] = useState(1);
    const [muted, setMuted] = useState(false);
    const [started, setStarted] = useState(false);
    const [shield, setShield] = useState(false);

    useEffect(() => { propsRef.current = { onGameOver, onReset }; }, [onGameOver, onReset]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { setMuted(isArcadeMuted()); }, []);

    // reduced motion
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const set = () => { reduceRef.current = mq.matches; };
        set();
        mq.addEventListener?.('change', set);
        return () => mq.removeEventListener?.('change', set);
    }, []);

    // ---- responsive canvas sizing ----
    useEffect(() => {
        const measure = () => {
            const el = wrapRef.current;
            const cv = canvasRef.current;
            if (!el || !cv) return;
            const w = el.clientWidth, h = el.clientHeight;
            // cell size keyed off WIDTH so there's always enough horizontal warning of obstacles
            const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.floor(w / LOOKAHEAD_UNITS)));
            const groundBand = Math.min(h * GROUND_BAND_FRAC, 3 * px);
            const floorY = h - groundBand; // floor sits near the bottom; plenty of sky above for jumps
            const dpr = Math.min(3, window.devicePixelRatio || 1);
            cv.width = Math.floor(w * dpr);
            cv.height = Math.floor(h * dpr);
            cv.style.width = `${w}px`;
            cv.style.height = `${h}px`;
            const ctx = cv.getContext('2d');
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            dimRef.current = { px, w, h, viewUnits: w / px, floorY };
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (wrapRef.current) ro.observe(wrapRef.current);
        window.addEventListener('resize', measure);
        return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    // ---- the game ----
    useEffect(() => {
        const spawnParticles = (st: VS, x: number, y: number, n: number, color: string, spread: number, up: number) => {
            if (reduceRef.current) return;
            for (let i = 0; i < n; i++) {
                if (st.particles.length >= MAX_PARTICLES) st.particles.shift();
                st.particles.push({ x, y, vx: (Math.random() * 2 - 1) * spread, vy: (Math.random() * -up) - 0.5, life: 0, max: 0.4 + Math.random() * 0.4, color });
            }
        };

        const die = (st: VS) => {
            // Aegis absorbs a single hit — consume the shield, brief i-frames, escape nudge
            if (st.shield) {
                st.shield = false;
                st.shardsUsed++;
                st.invulnUntil = st.simTime + 0.45;
                st.vy = JUMP_VELOCITY * st.gravitySign * 0.5;
                asfx.shieldBreak();
                st.flash = performance.now() + 140;
                spawnParticles(st, st.px + 0.5, st.py + 0.5, 18, PAL.shard, 7, 7);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { navigator.vibrate(25); } catch { /* ignore */ } }
                return;
            }
            if (overRef.current) return;
            overRef.current = true;
            statusRef.current = 'over';
            asfx.crash();
            asfx.gameOver();
            arcadeMusic.stop();
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { navigator.vibrate(60); } catch { /* ignore */ } }
            if (!reduceRef.current) { st.shakeUntil = performance.now() + 380; st.shakeMag = 14; }
            spawnParticles(st, st.px + 0.5, st.py + 0.5, 28, PAL.shard, 9, 9);
            setStatus('over');
            const finalScore = Math.floor(st.distance) + st.coins * COIN_BONUS;
            propsRef.current.onGameOver({ score: finalScore, lines: st.coins, level: attemptsRef.current });
        };

        // ---- per-substep simulation (deterministic; no wall-clock / Math.random) ----
        const step = (st: VS, dt: number) => {
            const inp = inputRef.current;
            const vx = SPEED * st.speedMult;
            st.px += vx * dt;
            st.distance = st.px;
            st.simTime += dt;

            // vertical control
            if (st.mode === 'cube') {
                st.vy += -GRAVITY * st.gravitySign * dt;
                if (st.vy > TERMINAL_VY) st.vy = TERMINAL_VY;
                if (st.vy < -TERMINAL_VY) st.vy = -TERMINAL_VY;
                const holdEligible = inp.held && st.onSurface && (st.simTime - st.lastHoldJumpT) >= HOLD_REJUMP_COOLDOWN;
                if (st.onSurface && (inp.tapPending || holdEligible)) {
                    st.vy = JUMP_VELOCITY * st.gravitySign;
                    st.onSurface = false;
                    st.lastHoldJumpT = st.simTime;
                    inp.tapPending = false;
                    asfx.jump();
                }
            } else {
                const a = inp.held ? SHIP_THRUST : -SHIP_GRAVITY;
                st.vy += a * st.gravitySign * dt;
                if (st.vy > SHIP_VY_CLAMP) st.vy = SHIP_VY_CLAMP;
                if (st.vy < -SHIP_VY_CLAMP) st.vy = -SHIP_VY_CLAMP;
            }

            st.prevPy = st.py;
            st.py += st.vy * dt;

            resolveCollisions(st);
            if (overRef.current) return;
            handleEntities(st);

            st.wasOnSurface = st.onSurface;
        };

        const resolveCollisions = (st: VS) => {
            const wasGrounded = st.onSurface;
            st.onSurface = false;
            const IN = HITBOX_INSET;
            const insL = st.px + IN, insR = st.px + 1 - IN;

            // world floor / ceiling
            if (st.gravitySign === 1) {
                if (st.py < 0) { st.py = 0; if (st.vy < 0) st.vy = 0; st.onSurface = true; }
                if (st.mode === 'ship' && st.py + 1 > CEIL) { st.py = CEIL - 1; if (st.vy > 0) st.vy = 0; st.onSurface = true; }
            } else {
                if (st.py + 1 > CEIL) { st.py = CEIL - 1; if (st.vy > 0) st.vy = 0; st.onSurface = true; }
                if (st.mode === 'ship' && st.py < 0) { st.py = 0; if (st.vy < 0) st.vy = 0; st.onSurface = true; }
            }

            for (const o of st.obstacles) {
                if (o.x > st.px + 3 || o.x < st.px - 3) continue;

                if (o.kind === 'block') {
                    const bx0 = o.x, bx1 = o.x + (o.w ?? 1);
                    if (bx1 <= insL || bx0 >= insR) continue;
                    const bTop = o.y + (o.h ?? 1), bBot = o.y;
                    // landing on top (normal) / underside (flipped)
                    if (st.gravitySign === 1 && st.vy <= 0 && st.prevPy >= bTop - LAND_EPS && st.py <= bTop) {
                        st.py = bTop; st.vy = 0; st.onSurface = true; continue;
                    }
                    if (st.gravitySign === -1 && st.vy >= 0 && st.prevPy + 1 <= bBot + LAND_EPS && st.py + 1 >= bBot) {
                        st.py = bBot - 1; st.vy = 0; st.onSurface = true; continue;
                    }
                    // otherwise: a side/penetration hit kills
                    const ovX = Math.min(insR, bx1) - Math.max(insL, bx0);
                    const ovY = Math.min(st.py + 1 - IN, bTop) - Math.max(st.py + IN, bBot);
                    if (ovX > CONTACT_EPS && ovY > CONTACT_EPS && st.simTime >= st.invulnUntil) { die(st); return; }
                } else if (o.kind === 'spike') {
                    const h = o.h ?? 1;
                    const baseY = o.y;
                    const apexY = o.dir === 'down' ? o.y - h : o.y + h;
                    // inset triangle toward centroid
                    const cxT = o.x + 0.5, cyT = (baseY + baseY + apexY) / 3;
                    const k = SPIKE_INSET;
                    const ax = o.x + (cxT - o.x) * k, ay = baseY + (cyT - baseY) * k;
                    const bx = (o.x + 1) + (cxT - (o.x + 1)) * k, by = baseY + (cyT - baseY) * k;
                    const ix = cxT, iy = apexY + (cyT - apexY) * k;
                    const samples = [
                        [insL, st.py + IN], [insR, st.py + IN], [insL, st.py + 1 - IN], [insR, st.py + 1 - IN], [st.px + 0.5, st.py + IN],
                    ];
                    for (const s of samples) {
                        if (pointInTri(s[0], s[1], ax, ay, bx, by, ix, iy)) { if (st.simTime >= st.invulnUntil) { die(st); return; } break; }
                    }
                }
            }

            // landing dust on the grounding transition
            if (st.onSurface && !wasGrounded && st.simTime > 0.1) {
                spawnParticles(st, st.px + 0.5, st.gravitySign === 1 ? st.py : st.py + 1, 8, PAL.ground, 4, 3);
            }
        };

        const handleEntities = (st: VS) => {
            const inp = inputRef.current;
            const cx = st.px + 0.5, cy = st.py + 0.5;
            for (const o of st.obstacles) {
                if (o.x > st.px + 2.5 || o.x < st.px - 2.5) continue;
                const within = Math.abs((o.x) - cx) < 0.7;
                switch (o.kind) {
                    case 'modePortal':
                        if (within && !o.taken) { st.mode = o.to ?? 'cube'; st.vy *= 0.6; o.taken = true; asfx.portal(); st.flash = performance.now() + 140; }
                        break;
                    case 'gravityPortal':
                        if (within && !o.taken) { if (o.sign && st.gravitySign !== o.sign) { st.gravitySign = o.sign; asfx.portal(); st.flash = performance.now() + 140; } o.taken = true; }
                        break;
                    case 'speedPortal':
                        if (within && !o.taken) { st.speedMult = SPEED_MULTS[(o.tier ?? 2) - 1]; o.taken = true; asfx.portal(); st.flash = performance.now() + 140; }
                        break;
                    case 'orb': {
                        const d = Math.hypot(o.x - cx, o.y - cy);
                        if (d < 0.75 && inp.tapPending && !st.onSurface) {
                            if (o.variant === 'pink') { st.gravitySign = st.gravitySign === 1 ? -1 : 1; asfx.flip(); }
                            st.vy = JUMP_VELOCITY * st.gravitySign;
                            inp.tapPending = false;
                            asfx.orb();
                        }
                        break;
                    }
                    case 'pad': {
                        const onPad = within && (Math.abs(st.py - o.y) < 0.5 || (st.gravitySign === -1 && Math.abs((st.py + 1) - o.y) < 0.6));
                        if (onPad && !o.taken) {
                            if (o.variant === 'pink') { st.gravitySign = st.gravitySign === 1 ? -1 : 1; asfx.flip(); }
                            st.vy = PAD_V * st.gravitySign;
                            o.taken = true;
                            asfx.pad();
                        }
                        break;
                    }
                    case 'coin': {
                        if (!o.taken && Math.hypot(o.x - cx, o.y - cy) < 0.7) { o.taken = true; st.coins++; asfx.coin(); spawnParticles(st, o.x, o.y, 6, PAL.coin, 3, 4); }
                        break;
                    }
                    case 'shard': {
                        // Source Shard → arms the Aegis (one held; no score/coin, deterministic)
                        if (!o.taken && !st.shield && Math.hypot(o.x - cx, o.y - cy) < 0.75) { o.taken = true; st.shield = true; asfx.shardPickup(); spawnParticles(st, o.x, o.y, 8, PAL.shard, 3, 4); }
                        break;
                    }
                }
            }
        };

        const buildRun = () => {
            const seed = (attemptsRef.current * 2654435761) >>> 0;
            const gen = createGen(seed);
            const st: VS = {
                px: 0, py: 0, vy: 0, prevPy: 0, gravitySign: 1, mode: 'cube', speedMult: SPEED_MULTS[1],
                onSurface: true, wasOnSurface: true, lastHoldJumpT: -1, simTime: 0, acc: 0, last: 0,
                obstacles: [], gen, coins: 0, distance: 0,
                shield: false, invulnUntil: 0, shardsUsed: 0,
                trail: [], particles: [], shakeUntil: 0, shakeMag: 0, flash: 0,
            };
            generateAhead(gen, st.obstacles, PLAYER_SCREEN_X + dimRef.current.viewUnits + SPAWN_AHEAD);
            stRef.current = st;
            overRef.current = false;
            shown.current = { score: -1, coins: -1, shield: -1 };
            setShield(false);
            inputRef.current.tapPending = false;
            setScore(0); setCoins(0);
            setAttempt(attemptsRef.current);
            statusRef.current = 'playing';
            setStatus('playing');
            if (!isArcadeMuted()) arcadeMusic.start();
            propsRef.current.onReset?.();
        };

        const replay = () => { attemptsRef.current += 1; buildRun(); };

        const togglePause = () => {
            if (overRef.current) return;
            setStatus((s) => {
                if (s === 'playing') { arcadeMusic.stop(); return 'paused'; }
                if (s === 'paused') { if (!isArcadeMuted()) arcadeMusic.start(); return 'playing'; }
                return s;
            });
        };

        actionsRef.current = { replay, togglePause };
        buildRun();

        // ---- render ----
        const draw = () => {
            const dim = dimRef.current;
            const cv = canvasRef.current;
            const st = stRef.current;
            if (!dim.px || !cv || !st) return;
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            const P = dim.px, W = dim.w, H = dim.h, floorY = dim.floorY;
            const reduce = reduceRef.current;
            const cameraX = st.px - PLAYER_SCREEN_X;
            const now = performance.now();
            const beat = ((st.simTime * 1000) % BEAT_MS) / BEAT_MS;
            const pulse = reduce ? 0 : Math.pow(1 - beat, 3);
            const sx = (wx: number) => (wx - cameraX) * P;
            const sy = (wy: number) => floorY - wy * P;

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = PAL.void;
            ctx.fillRect(0, 0, W, H);

            ctx.save();
            if (!reduce && now < st.shakeUntil) {
                const k = (st.shakeUntil - now) / 380;
                const m = st.shakeMag * k;
                ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
            }

            // section hue mix
            const sectionIdx = Math.floor(st.px / 220) % SECTION_HUES.length;
            const hue = SECTION_HUES[sectionIdx];

            // parallax grid (two layers)
            ctx.globalCompositeOperation = 'lighter';
            const drawGrid = (factor: number, spacing: number, alpha: number) => {
                ctx.strokeStyle = `hsla(${hue},70%,62%,${alpha})`;
                ctx.lineWidth = 1;
                const offX = ((-cameraX * factor) % spacing) * P;
                for (let gx = offX % (spacing * P); gx < W; gx += spacing * P) {
                    ctx.beginPath(); ctx.moveTo(Math.round(gx) + 0.5, 0); ctx.lineTo(Math.round(gx) + 0.5, H); ctx.stroke();
                }
                for (let gy = (floorY % (spacing * P)) - spacing * P; gy < H; gy += spacing * P) {
                    ctx.beginPath(); ctx.moveTo(0, Math.round(gy) + 0.5); ctx.lineTo(W, Math.round(gy) + 0.5); ctx.stroke();
                }
            };
            if (!reduce) { drawGrid(0.25, 4, 0.05 + pulse * 0.04); drawGrid(0.5, 2, 0.06 + pulse * 0.05); }
            else drawGrid(0.5, 2, 0.05);
            ctx.globalCompositeOperation = 'source-over';

            // ground (and ceiling in ship)
            ctx.save();
            ctx.shadowColor = PAL.ground; ctx.shadowBlur = reduce ? 0 : 8 + pulse * 6;
            ctx.strokeStyle = PAL.ground; ctx.lineWidth = 2 + pulse * 1.5;
            ctx.beginPath(); ctx.moveTo(0, floorY + 0.5); ctx.lineTo(W, floorY + 0.5); ctx.stroke();
            // filled ground band
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(124,92,255,0.08)';
            ctx.fillRect(0, floorY, W, H - floorY);
            if (st.mode === 'ship') {
                const cyPx = sy(CEIL);
                ctx.shadowColor = PAL.ground; ctx.shadowBlur = reduce ? 0 : 8;
                ctx.strokeStyle = PAL.ground; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(0, cyPx + 0.5); ctx.lineTo(W, cyPx + 0.5); ctx.stroke();
            }
            ctx.restore();

            // obstacles
            for (const o of st.obstacles) {
                const ox = sx(o.x);
                if (ox < -60 || ox > W + 60) continue;
                switch (o.kind) {
                    case 'spike': {
                        const h = o.h ?? 1;
                        const baseYpx = sy(o.y);
                        const apexYpx = sy(o.dir === 'down' ? o.y - h : o.y + h);
                        ctx.save();
                        ctx.shadowColor = PAL.spike; ctx.shadowBlur = reduce ? 0 : 8;
                        ctx.fillStyle = PAL.spike;
                        ctx.beginPath();
                        ctx.moveTo(ox, baseYpx); ctx.lineTo(ox + P, baseYpx); ctx.lineTo(ox + P / 2, apexYpx); ctx.closePath(); ctx.fill();
                        ctx.restore();
                        break;
                    }
                    case 'block': {
                        const w = (o.w ?? 1) * P, h = (o.h ?? 1) * P;
                        const topY = sy(o.y + (o.h ?? 1));
                        ctx.fillStyle = 'rgba(91,140,255,0.18)';
                        ctx.fillRect(ox, topY, w, h);
                        ctx.strokeStyle = PAL.block; ctx.lineWidth = 2;
                        ctx.strokeRect(ox + 1, topY + 1, w - 2, h - 2);
                        break;
                    }
                    case 'coin': {
                        if (o.taken) break;
                        const cyp = sy(o.y);
                        ctx.save(); ctx.shadowColor = PAL.coin; ctx.shadowBlur = reduce ? 0 : 10;
                        ctx.strokeStyle = PAL.coin; ctx.lineWidth = 2.5;
                        ctx.beginPath(); ctx.arc(ox, cyp, P * 0.28, 0, Math.PI * 2); ctx.stroke();
                        ctx.restore();
                        break;
                    }
                    case 'shard': {
                        if (o.taken) break;
                        const cyp = sy(o.y);
                        ctx.save(); ctx.shadowColor = PAL.shard; ctx.shadowBlur = reduce ? 0 : 12;
                        ctx.strokeStyle = PAL.shard; ctx.lineWidth = 2.5;
                        ctx.beginPath(); ctx.arc(ox, cyp, P * 0.30, 0, Math.PI * 2); ctx.stroke();
                        ctx.fillStyle = PAL.shard; ctx.globalAlpha = 0.5 + (reduce ? 0.2 : pulse * 0.4);
                        ctx.beginPath(); ctx.arc(ox, cyp, P * 0.1, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                        break;
                    }
                    case 'orb': {
                        const cyp = sy(o.y);
                        const col = o.variant === 'pink' ? '#ff6bd6' : PAL.orb;
                        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = reduce ? 0 : 10;
                        ctx.fillStyle = col; ctx.globalAlpha = 0.35 + (reduce ? 0.3 : pulse * 0.5);
                        ctx.beginPath(); ctx.arc(ox, cyp, P * 0.32, 0, Math.PI * 2); ctx.fill();
                        ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(ox, cyp, P * 0.32, 0, Math.PI * 2); ctx.stroke();
                        ctx.restore();
                        break;
                    }
                    case 'pad': {
                        const baseYpx = sy(o.y);
                        const col = o.variant === 'pink' ? '#ff6bd6' : PAL.pad;
                        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = reduce ? 0 : 8;
                        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
                        ctx.beginPath(); ctx.moveTo(ox - P * 0.4, baseYpx); ctx.lineTo(ox, baseYpx - P * 0.4); ctx.lineTo(ox + P * 0.4, baseYpx); ctx.stroke();
                        ctx.restore();
                        break;
                    }
                    case 'gravityPortal':
                    case 'modePortal':
                    case 'speedPortal': {
                        const col = o.kind === 'gravityPortal' ? PAL.portalGrav : o.kind === 'speedPortal' ? PAL.speed : PAL.portalMode;
                        const cyp = sy(o.kind === 'speedPortal' ? 2 : CEIL / 2);
                        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = reduce ? 0 : 14;
                        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
                        ctx.beginPath(); ctx.ellipse(ox, cyp, P * 0.42, P * 1.4, 0, 0, Math.PI * 2); ctx.stroke();
                        ctx.restore();
                        break;
                    }
                }
            }

            // trail
            if (!reduce) {
                ctx.globalCompositeOperation = 'lighter';
                for (let i = 0; i < st.trail.length; i++) {
                    const t = st.trail[i]; const a = (i / st.trail.length) * 0.4;
                    ctx.fillStyle = accent; ctx.globalAlpha = a;
                    const s2 = P * 0.5 * (i / st.trail.length);
                    ctx.fillRect(t.x - s2 / 2, t.y - s2 / 2, s2, s2);
                }
                ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            }

            // player
            const pxc = sx(st.px + 0.5), pyc = sy(st.py + 0.5);
            ctx.save();
            ctx.translate(pxc, pyc);
            ctx.shadowColor = accent; ctx.shadowBlur = reduce ? 0 : 16;
            if (st.mode === 'cube') {
                const ang = st.px * 0.9 * (st.gravitySign === 1 ? 1 : -1);
                ctx.rotate(ang);
                const s2 = P * 0.7;
                ctx.fillStyle = accent;
                ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(-s2 * 0.2, -s2 * 0.2, s2 * 0.4, s2 * 0.4);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.strokeRect(-s2 / 2, -s2 / 2, s2, s2);
            } else {
                const tilt = Math.max(-0.5, Math.min(0.5, -st.vy / 30)) * st.gravitySign;
                ctx.rotate(tilt);
                const s2 = P * 0.7;
                ctx.fillStyle = accent;
                ctx.beginPath(); ctx.moveTo(-s2 / 2, -s2 / 2); ctx.lineTo(s2 / 2, 0); ctx.lineTo(-s2 / 2, s2 / 2); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
            }
            ctx.restore();

            // Aegis ring — orbits the player while a Source Shard is held
            if (st.shield) {
                const rr = P * (0.62 + (reduce ? 0 : pulse * 0.08));
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = PAL.shard; ctx.shadowColor = PAL.shard; ctx.shadowBlur = reduce ? 0 : 12;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(pxc, pyc, rr, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }

            // particles
            for (const pt of st.particles) {
                const a = Math.max(0, 1 - pt.life / pt.max);
                ctx.globalAlpha = a; ctx.fillStyle = pt.color;
                ctx.fillRect(sx(pt.x) - 2, sy(pt.y) - 2, 4, 4);
            }
            ctx.globalAlpha = 1;

            ctx.restore(); // end shake

            // portal flash + vignette (screen-space)
            if (!reduce && now < st.flash) {
                ctx.fillStyle = `rgba(255,255,255,${0.18 * ((st.flash - now) / 140)})`;
                ctx.fillRect(0, 0, W, H);
            }
            const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(0,0,0,${0.45 + (reduce ? 0 : pulse * 0.1)})`);
            ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
        };

        // ---- loop ----
        let raf = 0;
        let running = true;
        const loop = (now: number) => {
            if (!running) return;
            const st = stRef.current;
            if (st) {
                if (!st.last) st.last = now;
                st.acc += Math.min(MAX_FRAME_MS, now - st.last);
                st.last = now;
                if (statusRef.current === 'playing' && !overRef.current) {
                    let n = 0;
                    while (st.acc >= SIM_DT) {
                        if (++n > MAX_STEPS) { st.acc = 0; break; }
                        st.acc -= SIM_DT;
                        step(st, SIM_DT_S);
                        if (overRef.current) break;
                    }
                    // generation + cull (uses post-step camera)
                    const cameraX = st.px - PLAYER_SCREEN_X;
                    generateAhead(st.gen, st.obstacles, cameraX + dimRef.current.viewUnits + SPAWN_AHEAD);
                    if (st.obstacles.length > 64) st.obstacles = st.obstacles.filter((o) => o.x > cameraX - CULL_BEHIND);
                    // trail (visual)
                    if (!reduceRef.current) {
                        st.trail.push({ x: (PLAYER_SCREEN_X + 0.5) * dimRef.current.px, y: dimRef.current.floorY - (st.py + 0.5) * dimRef.current.px });
                        if (st.trail.length > TRAIL_LEN) st.trail.shift();
                    }
                    // particles advance by the sim time consumed this frame (frame-rate independent)
                    const visDt = n * SIM_DT_S;
                    for (const pt of st.particles) { pt.life += visDt; pt.x += pt.vx * visDt; pt.y += pt.vy * visDt; pt.vy -= 9 * visDt; }
                    st.particles = st.particles.filter((p) => p.life < p.max);
                    // HUD
                    const sc = Math.floor(st.distance) + st.coins * COIN_BONUS;
                    if (sc !== shown.current.score) { shown.current.score = sc; setScore(sc); }
                    if (st.coins !== shown.current.coins) { shown.current.coins = st.coins; setCoins(st.coins); }
                    const sh = st.shield ? 1 : 0;
                    if (sh !== shown.current.shield) { shown.current.shield = sh; setShield(st.shield); }
                    // tap lives at most one frame
                    inputRef.current.tapPending = false;
                }
                draw();
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        // ---- input on the play surface only ----
        const surface = wrapRef.current;
        const press = () => { unlockArcadeAudio(); inputRef.current.held = true; inputRef.current.tapPending = true; setStarted(true); if (!isArcadeMuted() && statusRef.current === 'playing') arcadeMusic.start(); };
        const release = () => { inputRef.current.held = false; };
        const onPD = (e: PointerEvent) => { e.preventDefault(); press(); };
        const onPU = () => release();
        surface?.addEventListener('pointerdown', onPD);
        window.addEventListener('pointerup', onPU);
        window.addEventListener('pointercancel', onPU);

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); press(); }
            else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); actionsRef.current.togglePause?.(); }
        };
        const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') release(); };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        const onBlur = () => { inputRef.current.held = false; arcadeMusic.stop(); if (!overRef.current) setStatus((s) => (s === 'playing' ? 'paused' : s)); };
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onBlur);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            arcadeMusic.stop();
            surface?.removeEventListener('pointerdown', onPD);
            window.removeEventListener('pointerup', onPU);
            window.removeEventListener('pointercancel', onPU);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onBlur);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accent]);

    const toggleMute = () => { const m = !muted; setArcadeMuted(m); setMuted(m); if (!m && statusRef.current === 'playing') arcadeMusic.start(); };
    const a = actionsRef.current;

    return (
        <div className="absolute inset-0 z-[60] flex flex-col select-none" style={{ background: `radial-gradient(120% 70% at 50% -10%, ${accent}22, transparent 60%), ${PAL.void}`, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* header (OUTSIDE the play surface so its taps don't jump) */}
            <div className="flex items-center justify-between px-3 pt-2 shrink-0">
                <button onClick={onExit} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Leave Veil">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="font-ritual text-xl tracking-[0.3em]" style={{ color: accent }}>VEIL</p>
                <div className="flex items-center gap-1">
                    <button onClick={toggleMute} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Mute">
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => a.togglePause?.()} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Pause">
                        {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* HUD */}
            <div className="flex items-center justify-center gap-3.5 px-3 pt-2 shrink-0">
                <div className="text-center px-1.5"><p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/45 leading-none">Score</p><p className="font-ritual text-lg leading-tight" style={{ color: accent }}>{score.toLocaleString()}</p></div>
                <div className="text-center px-1.5"><p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/45 leading-none">Coins</p><p className="font-ritual text-lg leading-tight text-amber-300">{coins}</p></div>
                <div className="text-center px-1.5 flex flex-col items-center"><p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/45 leading-none">Aegis</p>
                    <span className="mt-1 inline-block rounded-full" style={{ width: 16, height: 16, border: `2px solid ${shield ? PAL.shard : 'rgba(255,255,255,0.25)'}`, background: shield ? PAL.shard : 'transparent', boxShadow: shield ? `0 0 8px ${PAL.shard}` : 'none' }} /></div>
                <div className="text-center px-1.5"><p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/45 leading-none">Try</p><p className="font-ritual text-lg leading-tight text-white">{attempt}</p></div>
            </div>

            {/* play surface — taps/holds here drive the game */}
            <div ref={wrapRef} className="relative flex-1 min-h-0 mx-3 my-2 rounded-xl overflow-hidden border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" style={{ touchAction: 'none', cursor: 'pointer' }}>
                <canvas ref={canvasRef} className="block" style={{ touchAction: 'none' }} />

                {!started && status === 'playing' && (
                    <div className="absolute inset-0 flex items-end justify-center pb-[18%] pointer-events-none">
                        <p className="font-ritual text-sm tracking-[0.2em] uppercase animate-pulse text-center px-4" style={{ color: accent }}>Tap to jump · hold to fly · gather the Source</p>
                    </div>
                )}

                {status === 'paused' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="text-center">
                            <p className="font-ritual text-2xl gold-shimmer mb-4">Paused</p>
                            <button onClick={() => a.togglePause?.()} className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>Resume</button>
                        </div>
                    </div>
                )}

                {status === 'over' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/82 backdrop-blur-sm p-4">
                        <div className="w-full max-w-xs text-center">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-1">The veil holds</p>
                            <h2 className="font-ritual text-3xl gold-shimmer mb-1">Game Over</h2>
                            {isNewBest && <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>✦ New personal best</p>}
                            <div className="grid grid-cols-3 gap-2 my-4">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Score</p><p className="font-ritual text-xl" style={{ color: accent }}>{score.toLocaleString()}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Coins</p><p className="font-ritual text-xl text-amber-300">{coins}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Try</p><p className="font-ritual text-xl text-white">{attempt}</p></div>
                            </div>
                            <p className="text-[11px] font-mono tracking-wide mb-4 min-h-[1.2em]" style={{ color: submitState === 'error' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                                {submitState === 'saving' && 'Recording your score…'}
                                {submitState === 'saved' && (submitMessage || '✦ Score recorded on the leaderboard')}
                                {submitState === 'error' && (submitMessage || 'Could not record score.')}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => a.replay?.()} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-black" style={{ background: accent }}>Try Again</button>
                                <button onClick={onExit} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-white border border-white/15 bg-white/[0.04]">Leaderboard</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
