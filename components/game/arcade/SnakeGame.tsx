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
const BASE_STEP = 150;       // ms per move at speed 1
const MIN_STEP = 62;
const BONUS_TTL = 38;        // steps a golden orb lingers
const BONUS_EVERY = 5;       // orbs between golden-orb chances

type Vec = { x: number; y: number };

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
    grow: number;
    score: number;
    orbs: number;
    speed: number;
    stepMs: number;
    acc: number;
    last: number;
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

    const [status, setStatus] = useState<'playing' | 'paused' | 'over'>('playing');
    const [score, setScore] = useState(0);
    const [orbs, setOrbs] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [muted, setMuted] = useState(false);

    useEffect(() => { propsRef.current = { onGameOver, onReset }; }, [onGameOver, onReset]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { setMuted(isArcadeMuted()); }, []);

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
        const cellEq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
        const onSnake = (st: SnakeState, v: Vec, skipTail: boolean) => {
            const n = st.snake.length - (skipTail ? 1 : 0);
            for (let i = 0; i < n; i++) if (cellEq(st.snake[i], v)) return true;
            return false;
        };
        const randEmpty = (st: SnakeState): Vec => {
            // pick a free cell not on the snake / food / bonus
            for (let tries = 0; tries < 200; tries++) {
                const v = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
                if (onSnake(st, v, false)) continue;
                if (st.food && cellEq(v, st.food)) continue;
                if (st.bonus && cellEq(v, st.bonus)) continue;
                return v;
            }
            return { x: 0, y: 0 };
        };

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

        const step = (st: SnakeState) => {
            // commit a queued turn that isn't a direct reversal
            if (!(st.nextDir.x === -st.dir.x && st.nextDir.y === -st.dir.y)) st.dir = st.nextDir;
            const head = st.snake[0];
            const nh = { x: head.x + st.dir.x, y: head.y + st.dir.y };
            if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) { gameOver(st); return; }
            const willGrow = (cellEq(nh, st.food)) || (st.bonus != null && cellEq(nh, st.bonus));
            if (onSnake(st, nh, !willGrow)) { gameOver(st); return; }

            st.snake.unshift(nh);
            if (st.bonus && cellEq(nh, st.bonus)) {
                st.score += 50 + st.speed * 5;
                st.orbs += 1;
                st.grow += 2;
                st.bonus = null;
                asfx.bonus();
                vibrate(18);
            } else if (cellEq(nh, st.food)) {
                st.orbs += 1;
                st.score += 10 + st.speed * 2;
                st.grow += 1;
                st.food = randEmpty(st);
                const newSpeed = Math.floor(st.orbs / 5) + 1;
                if (newSpeed !== st.speed) { st.speed = newSpeed; st.stepMs = Math.max(MIN_STEP, BASE_STEP - (newSpeed - 1) * 11); asfx.levelUp(); }
                else asfx.eat();
                // periodically offer a golden orb
                st.sinceBonus += 1;
                if (!st.bonus && st.sinceBonus >= BONUS_EVERY && Math.random() < 0.7) { st.bonus = { ...randEmpty(st), ttl: BONUS_TTL }; st.sinceBonus = 0; }
                vibrate(10);
            }
            if (st.grow > 0) st.grow -= 1; else st.snake.pop();

            if (st.bonus) { st.bonus.ttl -= 1; if (st.bonus.ttl <= 0) st.bonus = null; }
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
                food: { x: 0, y: 0 }, bonus: null, sinceBonus: 0, grow: 0,
                score: 0, orbs: 0, speed: 1, stepMs: BASE_STEP, acc: 0, last: 0,
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
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#07120c';
            ctx.fillRect(0, 0, w, h);
            // faint grid
            ctx.strokeStyle = 'rgba(255,255,255,0.035)';
            ctx.lineWidth = 1;
            for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cell + 0.5, 0); ctx.lineTo(c * cell + 0.5, h); ctx.stroke(); }
            for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cell + 0.5); ctx.lineTo(w, r * cell + 0.5); ctx.stroke(); }

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
            if (st.bonus) orbAt(st.bonus, '#fcd34d', cell * 0.7);

            // snake — head brightest, tail darker
            const n = st.snake.length;
            for (let i = n - 1; i >= 0; i--) {
                const seg = st.snake[i];
                const t = 1 - i / Math.max(1, n);  // 1 at head
                const shade = i === 0 ? '#eafff4' : accent;
                roundedCell(ctx, seg.x, seg.y, cell, shade, i === 0 ? 1 : 1.5);
                if (i !== 0) { ctx.globalAlpha = 0.25 + 0.35 * (1 - t); ctx.fillStyle = '#000'; ctx.fillRect(seg.x * cell + 1.5, seg.y * cell + 1.5, cell - 3, cell - 3); ctx.globalAlpha = 1; }
            }
            // eyes on the head — forward along travel, offset to each side
            const head = st.snake[0];
            const cxh = head.x * cell + cell / 2, cyh = head.y * cell + cell / 2;
            const e = cell * 0.13, fwd = cell * 0.16, spread = cell * 0.2;
            const perpX = -st.dir.y, perpY = st.dir.x; // dir rotated 90°
            ctx.fillStyle = '#0b1f15';
            ctx.beginPath(); ctx.arc(cxh + st.dir.x * fwd + perpX * spread, cyh + st.dir.y * fwd + perpY * spread, e, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cxh + st.dir.x * fwd - perpX * spread, cyh + st.dir.y * fwd - perpY * spread, e, 0, Math.PI * 2); ctx.fill();
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
            {/* header */}
            <div className="flex items-center justify-between px-3 pt-2 shrink-0">
                <button onClick={onExit} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Leave Serpent">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="font-ritual text-xl tracking-[0.3em]" style={{ color: accent }}>SERPENT</p>
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
                {stat('Speed', speed)}
            </div>

            {/* board */}
            <div ref={wrapRef} className="relative flex-1 min-h-0 flex items-center justify-center px-3 py-2">
                <canvas ref={canvasRef} className="rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" style={{ touchAction: 'none' }} />

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
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Speed</p><p className="font-ritual text-xl text-white">{speed}</p></div>
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

            {/* d-pad */}
            <div className="shrink-0 px-3 pb-3 pt-1 mx-auto w-full max-w-[260px]" style={{ touchAction: 'none' }}>
                <div className="grid grid-cols-3 gap-2">
                    <div />
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(0, -1); }} aria-label="Up"><ChevronUp className="w-6 h-6" /></button>
                    <div />
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(-1, 0); }} aria-label="Left"><ChevronLeft className="w-6 h-6" /></button>
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(0, 1); }} aria-label="Down"><ChevronDown className="w-6 h-6" /></button>
                    <button className={dpad} onPointerDown={(e) => { e.preventDefault(); a.setDir?.(1, 0); }} aria-label="Right"><ChevronRight className="w-6 h-6" /></button>
                </div>
                <p className="text-center text-[9px] font-mono uppercase tracking-[0.25em] text-white/30 mt-2">swipe the board or use the pad</p>
            </div>
        </div>
    );
}
