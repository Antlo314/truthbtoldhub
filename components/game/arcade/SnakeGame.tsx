'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { asfx, unlockArcadeAudio, isArcadeMuted, setArcadeMuted } from '@/lib/game/arcadeSfx';

// ============================================================
//  SERPENT — a mobile-first Snake for the Sanctum Arcade.
//  Gather luminous orbs, grow, and quicken; strike a wall or
//  your own coils and the run ends. Swipe or use the d-pad.
//  Same render model as Tetra: the loop mutates a ref and only
//  pushes HUD numbers to React state when they change.
// ============================================================

const COLS = 17;
const ROWS = 17;
const MAX_CELL = 26;
const BASE_STEP = 210;       // ms per move at speed 1 (calmer start)
const MIN_STEP = 100;        // fastest the serpent ever moves
const BONUS_TTL = 38;        // steps a golden orb lingers
const BONUS_EVERY = 5;       // orbs between golden-orb chances
const VEIL_EVERY = 11;       // regular-food eats between Veil-pickup offers
const VEIL_CHANCE = 0.30;
const VEIL_MS = 4000;        // duration of the self-phase grace
const PICKUP_TTL = 46;       // steps the Veil pickup lingers
const MAGNET_MS = 5000;      // duration of the Lodestone pull
const FRENZY_MS = 6000;      // duration of the Ardor score doubler
const CHAIN_WINDOW = 14;     // STEPS a chain survives without an eat (scales with speed)
const POPS_CAP = 6;          // fixed-cap ring buffer for eat pops

// themed arena names (index = zone) + the serpent's quickening, named
const ZONE_NAMES = ['The Open Field', 'The Pillars', 'The Serpent Gates', 'The Labyrinth', 'The Inner Coil'];
const SPEED_TIERS = ['Wandering', 'Slithering', 'Coiling', 'Striking', 'Frenzy', 'Venom', 'Apex', 'Boundless'];
const speedTier = (s: number) => SPEED_TIERS[Math.min(SPEED_TIERS.length - 1, Math.max(0, s - 1))];

type Vec = { x: number; y: number };
type PickupKind = 'veil' | 'magnet' | 'shrink' | 'frenzy';
type EffectKind = 'veil' | 'magnet' | 'frenzy';
type Pop = { x: number; y: number; age: number };

function vibrate(ms: number) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(ms); } catch { /* ignore */ }
    }
}

interface SnakeState {
    snake: Vec[];          // head first
    dir: Vec;
    nextDir: Vec;
    food: Vec;
    bonus: (Vec & { ttl: number }) | null;
    sinceBonus: number;
    pickup: (Vec & { ttl: number; kind: PickupKind }) | null;  // shared boon slot
    sinceVeil: number;
    effect: { kind: EffectKind; ttlMs: number } | null;        // single active boon
    grow: number;
    score: number;
    orbs: number;
    speed: number;
    stepMs: number;
    acc: number;
    last: number;
    // chain / combo
    chain: number;
    chainTimer: number;
    chainTier: number;      // last announced multiplier tier
    // arena zones
    zone: number;
    walls: Vec[];
    portals: [Vec, Vec][];
    portalCooldown: number;
    // render-only juice
    pops: Pop[];
    lastNearMiss: number;   // step index of last near-miss cue
    steps: number;          // step counter (for throttling)
    zoneSweepUntil: number; // wall-clock end of the zone-shift sweep
}

export type SnakeResult = { score: number; lines: number; level: number };

interface Props {
    accent: string;
    onExit: () => void;
    onGameOver: (r: SnakeResult) => void;
    onReset?: () => void;
    submitState?: 'idle' | 'saving' | 'saved' | 'error';
    submitMessage?: string;
    isNewBest?: boolean;
}

export default function SnakeGame({ accent, onExit, onGameOver, onReset, submitState = 'idle', submitMessage, isNewBest }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dimRef = useRef({ cell: 0, w: 0, h: 0 });
    const stRef = useRef<SnakeState | null>(null);
    const overRef = useRef(false);
    const statusRef = useRef<'playing' | 'paused' | 'over'>('playing');
    const propsRef = useRef({ onGameOver, onReset });
    const shown = useRef({ score: -1, orbs: -1, speed: -1 });
    const actionsRef = useRef<{ [k: string]: (...a: any[]) => void }>({});
    const reduceRef = useRef(false);
    const flashKey = useRef(0);

    const [status, setStatus] = useState<'playing' | 'paused' | 'over'>('playing');
    const [score, setScore] = useState(0);
    const [orbs, setOrbs] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [muted, setMuted] = useState(false);
    const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

    useEffect(() => { propsRef.current = { onGameOver, onReset }; }, [onGameOver, onReset]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { setMuted(isArcadeMuted()); }, []);
    useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 850); return () => clearTimeout(t); }, [flash]);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const set = () => { reduceRef.current = mq.matches; };
        set(); mq.addEventListener?.('change', set);
        return () => mq.removeEventListener?.('change', set);
    }, []);

    // ---- responsive canvas sizing ----
    useEffect(() => {
        const measure = () => {
            const el = wrapRef.current;
            const cv = canvasRef.current;
            if (!el || !cv) return;
            const cell = Math.max(8, Math.min(MAX_CELL, Math.floor(Math.min(el.clientWidth / COLS, el.clientHeight / ROWS))));
            const w = cell * COLS, h = cell * ROWS;
            const dpr = Math.min(3, window.devicePixelRatio || 1);
            cv.width = Math.floor(w * dpr);
            cv.height = Math.floor(h * dpr);
            cv.style.width = `${w}px`;
            cv.style.height = `${h}px`;
            const ctx = cv.getContext('2d');
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            dimRef.current = { cell, w, h };
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (wrapRef.current) ro.observe(wrapRef.current);
        window.addEventListener('resize', measure);
        return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    // ---- game: logic + loop + input, set up once ----
    useEffect(() => {
        const showFlash = (text: string) => { if (!text) return; flashKey.current++; setFlash({ text, key: flashKey.current }); };
        const cellEq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
        const onSnake = (st: SnakeState, v: Vec, skipTail: boolean) => {
            const n = st.snake.length - (skipTail ? 1 : 0);
            for (let i = 0; i < n; i++) if (cellEq(st.snake[i], v)) return true;
            return false;
        };
        const onWall = (st: SnakeState, v: Vec) => {
            for (let i = 0; i < st.walls.length; i++) if (cellEq(st.walls[i], v)) return true;
            return false;
        };
        const onPortal = (st: SnakeState, v: Vec) => {
            for (let i = 0; i < st.portals.length; i++) {
                if (cellEq(st.portals[i][0], v) || cellEq(st.portals[i][1], v)) return true;
            }
            return false;
        };
        const randEmpty = (st: SnakeState): Vec => {
            // pick a free cell not on the snake / food / bonus / pickup / walls / portals
            for (let tries = 0; tries < 200; tries++) {
                const v = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
                if (onSnake(st, v, false)) continue;
                if (st.food && cellEq(v, st.food)) continue;
                if (st.bonus && cellEq(v, st.bonus)) continue;
                if (st.pickup && cellEq(v, st.pickup)) continue;
                if (onWall(st, v)) continue;
                if (onPortal(st, v)) continue;
                return v;
            }
            return { x: 0, y: 0 };
        };

        // chain multiplier: 1 + min(5, floor(chain/3))*0.5 — caps at 3.5x at chain 15+
        const chainMult = (chain: number) => 1 + Math.min(5, Math.floor(chain / 3)) * 0.5;

        // ---- Arena Zones: five hand-placed 17x17 layouts (NOT generated) ----
        // All dividers are broken so the grid stays one connected component; portal
        // destinations are guaranteed empty at apply time (else the portal is dropped).
        const zoneLayout = (z: number): { walls: Vec[]; portals: [Vec, Vec][] } => {
            const W: Vec[] = [];
            const P: [Vec, Vec][] = [];
            const push = (x: number, y: number) => W.push({ x, y });
            if (z === 1) {
                // Pillars — 4 short pillars at quadrant centers
                for (const [qx, qy] of [[4, 4], [12, 4], [4, 12], [12, 12]]) {
                    push(qx, qy); push(qx + 1, qy); push(qx, qy + 1); push(qx + 1, qy + 1);
                }
            } else if (z === 2) {
                // Gates — broken row-8 + col-8 dividers, each with a 3-wide central gap
                for (let x = 0; x < COLS; x++) { if (x < 7 || x > 9) push(x, 8); }
                for (let y = 0; y < ROWS; y++) { if (y < 7 || y > 9) { if (y !== 8) push(8, y); } }
            } else if (z === 3) {
                // Veins — two short diagonal bars + side wrap-portals
                for (let i = 0; i < 4; i++) { push(3 + i, 3 + i); push(13 - i, 3 + i); }
                P.push([{ x: 0, y: 8 }, { x: 16, y: 8 }]);
            } else if (z === 4) {
                // Labyrinth — thinned pillars + gate stubs + two side portal pairs.
                // The four gate arms stop one cell short of center (no (8,7)) so the
                // center cell (8,8) stays joined to the main component — verified by
                // flood fill (free === reachable). Do NOT extend an arm onto (8,7),
                // (8,9), (7,8) or (9,8) or center becomes an isolated soft-lock cell.
                for (const [qx, qy] of [[4, 4], [12, 12]]) { push(qx, qy); push(qx + 1, qy); push(qx, qy + 1); }
                for (let x = 5; x <= 7; x++) push(x, 8);
                for (let x = 9; x <= 11; x++) push(x, 8);
                for (let y = 5; y <= 6; y++) push(8, y);
                for (let y = 9; y <= 11; y++) push(8, y);
                P.push([{ x: 0, y: 4 }, { x: 16, y: 4 }]);
                P.push([{ x: 0, y: 12 }, { x: 16, y: 12 }]);
            }
            return { walls: W, portals: P };
        };

        const applyZone = (st: SnakeState, z: number) => {
            const { walls, portals } = zoneLayout(z);
            // FAIRNESS: drop any wall cell currently under the snake / food / bonus / pickup
            const blocked = (v: Vec) =>
                onSnake(st, v, false) ||
                (st.food && cellEq(v, st.food)) ||
                (st.bonus && cellEq(v, st.bonus)) ||
                (st.pickup && cellEq(v, st.pickup));
            st.walls = walls.filter((v) => !blocked(v));
            // FAIRNESS: a portal survives only if BOTH mouths sit on empty, non-wall cells
            const isClear = (v: Vec) => !blocked(v) && !st.walls.some((w) => cellEq(w, v));
            st.portals = portals.filter(([a, b]) => isClear(a) && isClear(b));
            st.portalCooldown = 0;
            st.zone = z;
            // re-roll any orb / bonus / pickup that ended up on a wall
            if (st.food && onWall(st, st.food)) st.food = randEmpty(st);
            if (st.bonus && onWall(st, st.bonus)) { const v = randEmpty(st); st.bonus.x = v.x; st.bonus.y = v.y; }
            if (st.pickup && onWall(st, st.pickup)) { const v = randEmpty(st); st.pickup.x = v.x; st.pickup.y = v.y; }
            asfx.zoneShift();
            showFlash((ZONE_NAMES[z] ?? 'ZONE ' + (z + 1)).toUpperCase());
            vibrate(24);
            if (!reduceRef.current) st.zoneSweepUntil = performance.now() + 400;
        };
        const zoneFor = (orbs: number) => (orbs < 12 ? 0 : orbs < 24 ? 1 : orbs < 40 ? 2 : orbs < 60 ? 3 : 4);

        const gameOver = (st: SnakeState) => {
            if (overRef.current) return;
            overRef.current = true;
            statusRef.current = 'over';
            asfx.crash();
            asfx.gameOver();
            vibrate(60);
            setStatus('over');
            propsRef.current.onGameOver({ score: st.score, lines: st.orbs, level: st.speed });
        };

        const pushPop = (st: SnakeState, v: Vec) => {
            if (reduceRef.current) { st.pops[0] = { x: v.x, y: v.y, age: 0 }; if (st.pops.length > 1) st.pops.length = 1; return; }
            if (st.pops.length >= POPS_CAP) st.pops.shift();
            st.pops.push({ x: v.x, y: v.y, age: 0 });
        };

        // pull a single orb/bonus one cell toward the head if the target cell is empty
        const magnetStep = (st: SnakeState) => {
            const head = st.snake[0];
            const pull = (o: Vec) => {
                const dxAbs = Math.abs(o.x - head.x), dyAbs = Math.abs(o.y - head.y);
                if (Math.max(dxAbs, dyAbs) > 3 || (dxAbs === 0 && dyAbs === 0)) return;
                const sx = o.x === head.x ? 0 : (head.x > o.x ? 1 : -1);
                const sy = o.y === head.y ? 0 : (head.y > o.y ? 1 : -1);
                const t = { x: o.x + sx, y: o.y + sy };
                if (t.x < 0 || t.x >= COLS || t.y < 0 || t.y >= ROWS) return;
                if (onSnake(st, t, false) || onWall(st, t) || onPortal(st, t)) return;
                if (st.food && cellEq(t, st.food) && o !== st.food) return;
                if (st.bonus && cellEq(t, st.bonus) && o !== st.bonus) return;
                o.x = t.x; o.y = t.y;
            };
            if (st.food) pull(st.food);
            if (st.bonus) pull(st.bonus);
        };

        const bumpChain = (st: SnakeState) => {
            st.chain += 1;
            st.chainTimer = CHAIN_WINDOW;
            const mult = chainMult(st.chain);
            const tier = Math.floor((mult - 1) / 0.5); // 0..5 -> 1.0/1.5/.../3.5
            if (tier > st.chainTier && tier > 0) {
                st.chainTier = tier;
                showFlash('x' + mult.toFixed(1) + ' CHAIN');
                asfx.chainUp(tier);
                vibrate(14);
            }
        };

        const step = (st: SnakeState) => {
            st.steps += 1;
            // MAGNET — deterministic pull at the start of the step
            if (st.effect?.kind === 'magnet') magnetStep(st);
            if (st.portalCooldown > 0) st.portalCooldown -= 1;
            // commit a queued turn that isn't a direct reversal
            if (!(st.nextDir.x === -st.dir.x && st.nextDir.y === -st.dir.y)) st.dir = st.nextDir;
            const head = st.snake[0];
            let nh = { x: head.x + st.dir.x, y: head.y + st.dir.y };
            if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) { gameOver(st); return; }
            // PORTAL — teleport before the wall/self test; destinations are guaranteed empty
            if (st.portalCooldown === 0) {
                for (const [a, b] of st.portals) {
                    if (cellEq(nh, a)) { nh = { x: b.x, y: b.y }; st.portalCooldown = 1; asfx.portal(); break; }
                    if (cellEq(nh, b)) { nh = { x: a.x, y: a.y }; st.portalCooldown = 1; asfx.portal(); break; }
                }
            }
            // WALLS kill even under Veil grace (consistent with edges)
            if (onWall(st, nh)) { gameOver(st); return; }
            const willGrow = (cellEq(nh, st.food)) || (st.bonus != null && cellEq(nh, st.bonus));
            if (!st.effect && onSnake(st, nh, !willGrow)) { gameOver(st); return; } // Veil grace skips the self-test only

            st.snake.unshift(nh);

            const frenzyMul = st.effect?.kind === 'frenzy' ? 2 : 1;

            if (st.pickup && cellEq(nh, st.pickup)) {
                const k = st.pickup.kind;
                st.pickup = null;
                if (k === 'veil') { st.effect = { kind: 'veil', ttlMs: VEIL_MS }; asfx.veil(); showFlash('VEIL'); vibrate(20); }
                else if (k === 'magnet') { st.effect = { kind: 'magnet', ttlMs: MAGNET_MS }; asfx.magnet(); showFlash('LODESTONE'); vibrate(20); }
                else if (k === 'frenzy') { st.effect = { kind: 'frenzy', ttlMs: FRENZY_MS }; asfx.frenzy(); showFlash('ARDOR'); vibrate(20); }
                else { // shrink / Molt — instant, no stored effect; keep min length 4 after this step's tail-pop
                    const reserve = st.grow > 0 ? 4 : 5; // a non-growing step will also pop one tail below
                    const drop = Math.max(0, Math.min(4, st.snake.length - reserve));
                    for (let i = 0; i < drop; i++) st.snake.pop();
                    asfx.molt(); showFlash('MOLT'); pushPop(st, nh); vibrate(20);
                }
            }
            if (st.bonus && cellEq(nh, st.bonus)) {
                bumpChain(st);
                st.score += Math.round((50 + st.speed * 5) * chainMult(st.chain) * frenzyMul);
                st.orbs += 1;
                st.grow += 2;
                st.bonus = null;
                asfx.bonus();
                pushPop(st, nh);
                const nzb = zoneFor(st.orbs);
                if (nzb !== st.zone) applyZone(st, nzb);
                vibrate(18);
            } else if (cellEq(nh, st.food)) {
                bumpChain(st);
                st.orbs += 1;
                st.score += Math.round((10 + st.speed * 2) * chainMult(st.chain) * frenzyMul);
                st.grow += 1;
                st.food = randEmpty(st);
                pushPop(st, nh);
                const newSpeed = Math.floor(st.orbs / 5) + 1;
                if (newSpeed !== st.speed) { st.speed = newSpeed; st.stepMs = Math.max(MIN_STEP, BASE_STEP - (newSpeed - 1) * 10); asfx.levelUp(); }
                else asfx.eat();
                // arena progression keyed to orbs eaten
                const nz = zoneFor(st.orbs);
                if (nz !== st.zone) applyZone(st, nz);
                // periodically offer a golden orb
                st.sinceBonus += 1;
                if (!st.bonus && !st.pickup && st.sinceBonus >= BONUS_EVERY && Math.random() < 0.7) { st.bonus = { ...randEmpty(st), ttl: BONUS_TTL }; st.sinceBonus = 0; }
                // rare boon pickup (single shared slot — never with a bonus out)
                st.sinceVeil += 1;
                if (!st.pickup && !st.bonus && st.sinceVeil >= VEIL_EVERY && Math.random() < VEIL_CHANCE) {
                    const r = Math.random();
                    const kind: PickupKind = r < 0.40 ? 'veil' : r < 0.65 ? 'magnet' : r < 0.85 ? 'shrink' : 'frenzy';
                    st.pickup = { ...randEmpty(st), ttl: PICKUP_TTL, kind };
                    st.sinceVeil = 0;
                    asfx.pickupSpawn();
                }
                vibrate(10);
            } else {
                // NEAR-MISS — survived a step that ended adjacent to a wall/edge/body
                if (!reduceRef.current && st.steps - st.lastNearMiss >= 4) {
                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                    let tight = false;
                    for (const [dx, dy] of dirs) {
                        const nx = nh.x + dx, ny = nh.y + dy;
                        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { tight = true; break; }
                        const nv = { x: nx, y: ny };
                        if (onWall(st, nv) || onSnake(st, nv, true)) { tight = true; break; }
                    }
                    if (tight) { st.lastNearMiss = st.steps; asfx.nearMiss(); vibrate(8); }
                }
            }
            if (st.grow > 0) st.grow -= 1; else st.snake.pop();

            if (st.bonus) { st.bonus.ttl -= 1; if (st.bonus.ttl <= 0) st.bonus = null; }
            if (st.pickup) { st.pickup.ttl -= 1; if (st.pickup.ttl <= 0) st.pickup = null; }

            // CHAIN window decays per step (scales with speed for free)
            if (st.chainTimer > 0) { st.chainTimer -= 1; if (st.chainTimer === 0) { st.chain = 0; st.chainTier = 0; } }
        };

        const setDir = (x: number, y: number) => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing') return;
            // ignore a reversal relative to the committed direction
            if (x === -st.dir.x && y === -st.dir.y) return;
            st.nextDir = { x, y };
        };

        const reset = () => {
            const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
            const st: SnakeState = {
                snake: [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }, { x: cx - 3, y: cy }],
                dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
                food: { x: 0, y: 0 }, bonus: null, sinceBonus: 0, pickup: null, sinceVeil: 0, effect: null, grow: 0,
                score: 0, orbs: 0, speed: 1, stepMs: BASE_STEP, acc: 0, last: 0,
                chain: 0, chainTimer: 0, chainTier: 0,
                zone: 0, walls: [], portals: [], portalCooldown: 0,
                pops: [], lastNearMiss: -99, steps: 0, zoneSweepUntil: 0,
            };
            st.food = randEmpty(st);
            stRef.current = st;
            overRef.current = false;
            shown.current = { score: -1, orbs: -1, speed: -1 };
            statusRef.current = 'playing';
            setStatus('playing');
            propsRef.current.onReset?.();
        };

        const togglePause = () => {
            if (overRef.current) return;
            setStatus((s) => (s === 'paused' ? 'playing' : s === 'playing' ? 'paused' : s));
        };

        actionsRef.current = { setDir, reset, togglePause };
        reset();

        // ---- drawing ----
        const roundedCell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, color: string, inset = 1) => {
            ctx.fillStyle = color;
            ctx.fillRect(cx * cell + inset, cy * cell + inset, cell - inset * 2, cell - inset * 2);
        };
        const draw = () => {
            const { cell, w, h } = dimRef.current;
            const cv = canvasRef.current;
            const st = stRef.current;
            if (!cell || !cv || !st) return;
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            const reduce = reduceRef.current;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#07120c';
            ctx.fillRect(0, 0, w, h);
            // faint grid
            ctx.strokeStyle = 'rgba(255,255,255,0.035)';
            ctx.lineWidth = 1;
            for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cell + 0.5, 0); ctx.lineTo(c * cell + 0.5, h); ctx.stroke(); }
            for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cell + 0.5); ctx.lineTo(w, r * cell + 0.5); ctx.stroke(); }

            // arena walls — dim slate rounded cells beneath everything
            for (let i = 0; i < st.walls.length; i++) {
                const wv = st.walls[i];
                roundedCell(ctx, wv.x, wv.y, cell, 'rgba(100,116,139,0.55)', 1.5);
                ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1;
                ctx.strokeRect(wv.x * cell + 1.5, wv.y * cell + 1.5, cell - 3, cell - 3);
            }
            // portals — small rotating accent rings (reduced-motion: static)
            if (st.portals.length) {
                const spin = reduce ? 0 : performance.now() * 0.003;
                for (const pr of st.portals) {
                    for (const m of pr) {
                        const pxp = m.x * cell + cell / 2, pyp = m.y * cell + cell / 2;
                        ctx.save();
                        ctx.shadowColor = accent; ctx.shadowBlur = reduce ? 0 : Math.min(cell * 0.5, 10);
                        ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.5, cell * 0.09);
                        ctx.beginPath(); ctx.arc(pxp, pyp, cell * 0.30, spin, spin + Math.PI * 1.4); ctx.stroke();
                        ctx.beginPath(); ctx.arc(pxp, pyp, cell * 0.16, -spin, -spin + Math.PI * 1.2); ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            // food (glowing orb)
            const orbAt = (v: Vec, col: string, glow: number) => {
                const cxp = v.x * cell + cell / 2, cyp = v.y * cell + cell / 2;
                ctx.save();
                ctx.shadowColor = col; ctx.shadowBlur = glow;
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(cxp, cyp, cell * 0.32, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            };
            orbAt(st.food, accent, cell * 0.5);
            if (st.bonus) orbAt(st.bonus, '#fcd34d', reduce ? cell * 0.7 : cell * (0.55 + 0.25 * (0.5 + 0.5 * Math.sin(performance.now() * 0.006))));
            // orb glint — small rotating specular arc on the food rim
            if (!reduce) {
                const cxp = st.food.x * cell + cell / 2, cyp = st.food.y * cell + cell / 2;
                const g = performance.now() * 0.005;
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, cell * 0.06);
                ctx.beginPath(); ctx.arc(cxp, cyp, cell * 0.32, g, g + Math.PI * 0.5); ctx.stroke();
                ctx.restore();
            }

            // shared boon pickup — colored hollow ring keyed to its kind (distinct from solid orbs)
            if (st.pickup) {
                const k = st.pickup.kind;
                const col = k === 'magnet' ? '#60a5fa' : k === 'shrink' ? '#34d399' : k === 'frenzy' ? '#f97316' : '#fbbf24';
                const cxp = st.pickup.x * cell + cell / 2, cyp = st.pickup.y * cell + cell / 2;
                const r = cell * 0.30;
                ctx.save();
                ctx.shadowColor = col; ctx.shadowBlur = reduce ? 0 : Math.min(cell * 0.6, 12);
                ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, cell * 0.10);
                ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, Math.PI * 2); ctx.stroke();
                const a0 = reduce ? 0 : performance.now() * 0.004;
                ctx.beginPath(); ctx.arc(cxp, cyp, r * 0.6, a0, a0 + Math.PI * 0.9); ctx.stroke();
                ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(cxp, cyp, Math.max(1.5, cell * 0.07), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // eat pops — expanding fading rings (one-frame flash under reduced motion)
            if (st.pops.length) {
                ctx.save();
                for (let i = 0; i < st.pops.length; i++) {
                    const p = st.pops[i];
                    const t = reduce ? 0 : Math.min(1, p.age / 250);
                    const pxp = p.x * cell + cell / 2, pyp = p.y * cell + cell / 2;
                    ctx.globalAlpha = (1 - t) * 0.7;
                    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1, cell * 0.08);
                    ctx.beginPath(); ctx.arc(pxp, pyp, cell * (0.2 + 0.45 * t), 0, Math.PI * 2); ctx.stroke();
                }
                ctx.restore();
            }

            // snake — head brightest, tail darker; phased (translucent + gold rim) only while the Veil holds
            const n = st.snake.length;
            const phasing = st.effect?.kind === 'veil';
            ctx.save();
            if (phasing) { ctx.globalAlpha = 0.5; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = reduce ? 0 : Math.min(cell * 0.5, 10); }
            for (let i = n - 1; i >= 0; i--) {
                const seg = st.snake[i];
                const t = 1 - i / Math.max(1, n);  // 1 at head
                const shade = i === 0 ? '#eafff4' : accent;
                roundedCell(ctx, seg.x, seg.y, cell, shade, i === 0 ? 1 : 1.5);
                if (!phasing && i !== 0) { ctx.globalAlpha = 0.25 + 0.35 * (1 - t); ctx.fillStyle = '#000'; ctx.fillRect(seg.x * cell + 1.5, seg.y * cell + 1.5, cell - 3, cell - 3); ctx.globalAlpha = 1; }
            }
            // trail shimmer — a moving sheen while Frenzy is active OR the chain is hot (chain>=6)
            if (!reduce && (st.effect?.kind === 'frenzy' || st.chain >= 6)) {
                const sheen = st.effect?.kind === 'frenzy' ? '#fb923c' : '#fde68a';
                const phase = (performance.now() * 0.004) % 1;
                ctx.save();
                ctx.globalAlpha = 0.35;
                for (let i = 0; i < n; i++) {
                    const seg = st.snake[i];
                    const off = ((i / Math.max(1, n)) + phase) % 1;
                    ctx.globalAlpha = 0.10 + 0.30 * (1 - off);
                    ctx.fillStyle = sheen;
                    ctx.fillRect(seg.x * cell + 2, seg.y * cell + 2, cell - 4, cell - 4);
                }
                ctx.restore();
            }
            // eyes on the head — forward along travel, offset to each side
            const head = st.snake[0];
            const cxh = head.x * cell + cell / 2, cyh = head.y * cell + cell / 2;
            // near-miss head brighten — pulse the head ring just after a tight squeeze
            if (!reduce && st.steps - st.lastNearMiss < 2) {
                ctx.save();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, cell * 0.12);
                ctx.shadowColor = '#fff'; ctx.shadowBlur = Math.min(cell * 0.6, 12);
                ctx.beginPath(); ctx.arc(cxh, cyh, cell * 0.42, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            const e = cell * 0.13, fwd = cell * 0.16, spread = cell * 0.2;
            const perpX = -st.dir.y, perpY = st.dir.x; // dir rotated 90°
            ctx.fillStyle = '#0b1f15';
            ctx.beginPath(); ctx.arc(cxh + st.dir.x * fwd + perpX * spread, cyh + st.dir.y * fwd + perpY * spread, e, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cxh + st.dir.x * fwd - perpX * spread, cyh + st.dir.y * fwd - perpY * spread, e, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // chain pip strip — small filled dots under the top edge, accent->gold as the mult climbs
            if (st.chain > 0) {
                const count = Math.min(st.chain, 15);
                const mult = chainMult(st.chain);
                const frac = Math.min(1, (mult - 1) / 2.5); // 0 at 1.0x -> 1 at 3.5x
                const lerp = (a: number, b: number) => Math.round(a + (b - a) * frac);
                const pc = `rgb(${lerp(0x22, 0xfb)},${lerp(0xc5, 0xbf)},${lerp(0x5e, 0x24)})`;
                const dr = Math.max(2, cell * 0.10);
                const gap = dr * 2.6;
                const totalW = (count - 1) * gap;
                let dx = w / 2 - totalW / 2;
                ctx.save();
                ctx.fillStyle = pc;
                for (let i = 0; i < count; i++) { ctx.beginPath(); ctx.arc(dx, 8, dr, 0, Math.PI * 2); ctx.fill(); dx += gap; }
                ctx.restore();
            }

            // boon timer bar (top edge) — colored by the active boon kind
            if (st.effect) {
                const maxMs = st.effect.kind === 'veil' ? VEIL_MS : st.effect.kind === 'magnet' ? MAGNET_MS : FRENZY_MS;
                const barCol = st.effect.kind === 'magnet' ? '#60a5fa' : st.effect.kind === 'frenzy' ? '#f97316' : '#fbbf24';
                const frac = Math.max(0, st.effect.ttlMs / maxMs);
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 0, w, 3);
                ctx.fillStyle = barCol; ctx.fillRect(0, 0, w * frac, 3);
            }

            // frenzy vignette — pulsing warm edge while the score doubler runs
            if (st.effect?.kind === 'frenzy' && !reduce) {
                const p = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
                ctx.save();
                ctx.strokeStyle = `rgba(249,115,22,${0.25 + 0.35 * p})`;
                ctx.lineWidth = Math.max(3, cell * 0.4);
                ctx.strokeRect(2, 2, w - 4, h - 4);
                ctx.restore();
            }

            // zone-shift sweep — one-shot radial wipe tint when the arena reconfigures
            if (st.zoneSweepUntil) {
                const remain = st.zoneSweepUntil - performance.now();
                if (remain > 0 && !reduce) {
                    const k = remain / 400;
                    ctx.save();
                    ctx.globalAlpha = k * 0.5;
                    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * (1 - k));
                    grd.addColorStop(0, 'rgba(255,255,255,0)');
                    grd.addColorStop(0.8, accent);
                    grd.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = grd;
                    ctx.fillRect(0, 0, w, h);
                    ctx.restore();
                } else {
                    st.zoneSweepUntil = 0;
                }
            }
        };

        // ---- loop ----
        let raf = 0;
        let running = true;
        const loop = (now: number) => {
            if (!running) return;
            const st = stRef.current;
            if (st) {
                if (!st.last) st.last = now;
                const dt = Math.min(120, now - st.last);
                st.last = now;
                if (statusRef.current === 'playing' && !overRef.current) {
                    st.acc += dt;
                    while (st.acc >= st.stepMs && !overRef.current) { st.acc -= st.stepMs; step(st); }
                    // boon effects count down in REAL time (step cadence varies with speed)
                    if (st.effect) {
                        st.effect.ttlMs -= dt;
                        if (st.effect.ttlMs <= 0) {
                            const k = st.effect.kind;
                            st.effect = null;
                            if (k === 'frenzy') asfx.frenzyEnd(); else asfx.veilEnd();
                        }
                    }
                    // age eat pops (frozen while paused since this runs only while playing)
                    for (let i = st.pops.length - 1; i >= 0; i--) { st.pops[i].age += dt; if (st.pops[i].age > 250) st.pops.splice(i, 1); }
                    if (st.score !== shown.current.score) { shown.current.score = st.score; setScore(st.score); }
                    if (st.orbs !== shown.current.orbs) { shown.current.orbs = st.orbs; setOrbs(st.orbs); }
                    if (st.speed !== shown.current.speed) { shown.current.speed = st.speed; setSpeed(st.speed); }
                }
                draw();
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        // ---- keyboard ----
        const onKeyDown = (e: KeyboardEvent) => {
            unlockArcadeAudio();
            const a = actionsRef.current;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': e.preventDefault(); a.setDir(0, -1); break;
                case 'ArrowDown': case 's': case 'S': e.preventDefault(); a.setDir(0, 1); break;
                case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); a.setDir(-1, 0); break;
                case 'ArrowRight': case 'd': case 'D': e.preventDefault(); a.setDir(1, 0); break;
                case 'p': case 'P': case 'Escape': e.preventDefault(); a.togglePause(); break;
            }
        };
        window.addEventListener('keydown', onKeyDown);

        // ---- swipe on the board ----
        const cv = canvasRef.current;
        let sx = 0, sy = 0, swiping = false;
        const onDown = (e: PointerEvent) => { unlockArcadeAudio(); sx = e.clientX; sy = e.clientY; swiping = true; };
        const onUp = (e: PointerEvent) => {
            if (!swiping) return; swiping = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
            if (Math.abs(dx) > Math.abs(dy)) actionsRef.current.setDir(dx > 0 ? 1 : -1, 0);
            else actionsRef.current.setDir(0, dy > 0 ? 1 : -1);
        };
        cv?.addEventListener('pointerdown', onDown);
        cv?.addEventListener('pointerup', onUp);

        const onBlur = () => { if (!overRef.current) setStatus((s) => (s === 'playing' ? 'paused' : s)); };
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onBlur);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            cv?.removeEventListener('pointerdown', onDown);
            cv?.removeEventListener('pointerup', onUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onBlur);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMute = () => { const m = !muted; setArcadeMuted(m); setMuted(m); };
    const a = actionsRef.current;
    const dpad = 'flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] active:bg-white/[0.14] text-white/90 select-none touch-none h-14';
    const stat = (label: string, val: number | string) => (
        <div className="text-center px-2">
            <p className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/45 leading-none">{label}</p>
            <p className="font-ritual text-lg leading-tight" style={{ color: accent }}>{val}</p>
        </div>
    );

    return (
        <div className="absolute inset-0 z-[60] flex flex-col select-none" onPointerDown={() => unlockArcadeAudio()} style={{ background: `radial-gradient(120% 70% at 50% -10%, ${accent}1f, transparent 60%), #05060a`, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <style>{`@keyframes arcadePop{0%{transform:scale(0.6);opacity:0}20%{transform:scale(1.12);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}`}</style>
            {/* header — shared arcade chrome */}
            <div className="flex items-center justify-between px-3 pt-2 shrink-0 border-b border-white/5 pb-2">
                <button onClick={onExit} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Leave Serpent">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                    <p className="text-[8px] uppercase tracking-[0.35em] text-white/35">Arcade</p>
                    <p className="font-ritual text-xl tracking-[0.3em] leading-none" style={{ color: accent }}>SERPENT</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={toggleMute} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Mute">
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => a.togglePause?.()} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Pause">
                        {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* stats */}
            <div className="flex items-center justify-center gap-3 px-3 pt-2 shrink-0">
                {stat('Score', score)}
                {stat('Orbs', orbs)}
                {stat(speedTier(speed), speed)}
            </div>

            {/* board */}
            <div ref={wrapRef} className="relative flex-1 min-h-0 flex items-center justify-center px-3 py-2">
                <canvas ref={canvasRef} className="rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" style={{ touchAction: 'none' }} />

                {flash && status === 'playing' && (
                    <div key={flash.key} className="absolute inset-x-0 top-[16%] flex justify-center pointer-events-none px-4" style={{ animation: 'arcadePop 0.85s ease-out forwards' }}>
                        <span className="font-ritual text-2xl font-black tracking-[0.18em] text-center" style={{ color: '#fbbf24', textShadow: '0 2px 14px rgba(0,0,0,0.7)' }}>{flash.text}</span>
                    </div>
                )}

                {status === 'paused' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
                        <div className="text-center">
                            <p className="font-ritual text-2xl gold-shimmer mb-4">Paused</p>
                            <button onClick={() => a.togglePause?.()} className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>Resume</button>
                        </div>
                    </div>
                )}

                {status === 'over' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/82 backdrop-blur-sm rounded-xl p-4">
                        <div className="w-full max-w-xs text-center">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-1">The serpent stills</p>
                            <h2 className="font-ritual text-3xl gold-shimmer mb-1">Game Over</h2>
                            {isNewBest && <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>✦ New personal best</p>}
                            <div className="grid grid-cols-3 gap-2 my-4">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Score</p><p className="font-ritual text-xl" style={{ color: accent }}>{score}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Orbs</p><p className="font-ritual text-xl text-white">{orbs}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">{speedTier(speed)}</p><p className="font-ritual text-xl text-white">{speed}</p></div>
                            </div>
                            <p className="text-[11px] font-mono tracking-wide mb-4 min-h-[1.2em]" style={{ color: submitState === 'error' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                                {submitState === 'saving' && 'Recording your score…'}
                                {submitState === 'saved' && (submitMessage || '✦ Score recorded on the leaderboard')}
                                {submitState === 'error' && (submitMessage || 'Could not record score.')}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => a.reset?.()} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-black" style={{ background: accent }}>Play Again</button>
                                <button onClick={onExit} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-white border border-white/15 bg-white/[0.04]">Leaderboard</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* directional pad — a single centralized cross */}
            <div className="shrink-0 px-3 pb-3 pt-1" style={{ touchAction: 'none' }}>
                <div className="grid grid-cols-3 gap-2 w-[198px] mx-auto">
                    <div />
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(0, -1); }} aria-label="Up"><ChevronUp className="w-6 h-6" /></button>
                    <div />
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(-1, 0); }} aria-label="Left"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{ background: `${accent}66` }} /></div>
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(1, 0); }} aria-label="Right"><ChevronRight className="w-6 h-6" /></button>
                    <div />
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(0, 1); }} aria-label="Down"><ChevronDown className="w-6 h-6" /></button>
                    <div />
                </div>
                <p className="text-center text-[9px] font-mono uppercase tracking-[0.25em] text-white/30 mt-2">swipe the board or use the pad</p>
            </div>
        </div>
    );
}
