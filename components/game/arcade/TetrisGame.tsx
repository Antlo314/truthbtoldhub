'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, RotateCw, ChevronDown, ChevronsDown, Box, Volume2, VolumeX } from 'lucide-react';
import { asfx, unlockArcadeAudio, isArcadeMuted, setArcadeMuted } from '@/lib/game/arcadeSfx';
import { useArcadeInputProfile } from './useArcadeInputProfile';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';

// ============================================================
//  TETRA — a full, mobile-first Tetris for the Sanctum Arcade.
//  7 tetrominoes · 7-bag randomizer · hold · ghost · soft/hard
//  drop · wall-kick rotation · lock delay · levels + gravity ·
//  guideline scoring. Renders to a single canvas; the game loop
//  mutates a ref (no per-frame React renders) and only pushes
//  HUD numbers to state when they change.
// ============================================================

const COLS = 10;
const ROWS = 20;
const MAX_CELL = 40;
const LOCK_DELAY = 500; // ms a grounded piece waits before locking
const MAX_LOCK_RESETS = 15;
const LINE_SCORE = [0, 100, 300, 500, 800];

// Aether power-ups — charge is earned ONLY from line clears, so spending it
// costs the same skill the leaderboard rewards (powers stay fair).
const MAX_CHARGE = 12;
const POWER_CD_MS = 6000;   // shared cooldown between any two power fires
const SLOW_MS = 6000;       // Slow Veil duration
const MIN_POWER_COST = 3;   // cheapest power (also the ready-glow threshold)
const POWERS = { slow: { cost: 3, name: 'SLOW VEIL' }, sink: { cost: 5, name: 'AETHER SINK' } } as const;
type PowerKind = keyof typeof POWERS;

type PieceId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const PIECES: Record<PieceId, { color: string; cells: number[][] }> = {
    I: { color: '#22d3ee', cells: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { color: '#fbbf24', cells: [[1, 1], [1, 1]] },
    T: { color: '#a855f7', cells: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { color: '#22c55e', cells: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { color: '#ef4444', cells: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { color: '#3b82f6', cells: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { color: '#f97316', cells: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const ALL_IDS: PieceId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// horizontal kick offsets tried when a rotation collides
const KICKS = [0, -1, 1, -2, 2];

function gravityFor(level: number): number {
    return Math.max(70, 800 - (level - 1) * 70);
}
function cloneMatrix(m: number[][]): number[][] {
    return m.map((r) => r.slice());
}
function rotateCW(m: number[][]): number[][] {
    const n = m.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
    return out;
}
function rotateCCW(m: number[][]): number[][] {
    const n = m.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[n - 1 - c][r] = m[r][c];
    return out;
}
function vibrate(ms: number) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(ms); } catch { /* ignore */ }
    }
}

interface Piece { id: PieceId; matrix: number[][]; color: string; x: number; y: number; rot: 0 | 1 | 2 | 3; }
// cell-space cosmetic particle (x in cols, y in rows)
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; }
interface Fx { kind: 'sink'; count: number; start: number; }

interface GameState {
    board: string[][];
    piece: Piece;
    queue: PieceId[];
    hold: PieceId | null;
    holdUsed: boolean;
    score: number;
    lines: number;
    level: number;
    gravityMs: number;
    dropAcc: number;
    lockAcc: number;
    lockResets: number;
    softDrop: boolean;
    combo: number;   // -1 = no active combo
    b2b: boolean;    // last clear was a difficult clear (tetris or line-clearing T-spin)
    lastWasRotation: boolean; // last successful piece action was a kick/rotate (T-spin gate)
    charge: number;  // Aether meter (0..MAX_CHARGE)
    powerCdUntil: number;
    slowUntil: number;
    wasReady: boolean;
    shakeUntil: number; // screen-shake end (cosmetic, reduceRef-gated)
    shakeMag: number;   // screen-shake magnitude in px
    fx: Fx[];
    particles: Particle[];
    last: number;
}

export type TetrisResult = { score: number; lines: number; level: number };

interface Props {
    accent: string;
    onExit: () => void;
    onGameOver: (r: TetrisResult) => void;
    onReset?: () => void;
    submitState?: 'idle' | 'saving' | 'saved' | 'error';
    submitMessage?: string;
    isNewBest?: boolean;
}

// small static preview of a piece (hold / next)
function MiniPiece({ id, size = 52 }: { id: PieceId | null; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        // DPR-back the canvas so small Next/Hold previews stay crisp on high-DPI phones
        const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
        if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        if (!id) return;
        const { cells, color } = PIECES[id];
        let minR = 99, maxR = -1, minC = 99, maxC = -1;
        for (let r = 0; r < cells.length; r++) for (let c = 0; c < cells[r].length; c++) {
            if (cells[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
        }
        const pw = maxC - minC + 1, ph = maxR - minR + 1;
        const cell = Math.floor(size / 4);
        const ox = (size - pw * cell) / 2 - minC * cell;
        const oy = (size - ph * cell) / 2 - minR * cell;
        for (let r = 0; r < cells.length; r++) for (let c = 0; c < cells[r].length; c++) {
            if (!cells[r][c]) continue;
            const x = ox + c * cell, y = oy + r * cell;
            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(x + 1, y + 1, cell - 2, Math.max(1, cell * 0.2));
        }
    }, [id, size]);
    return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, imageRendering: 'pixelated' }} />;
}

const TETRA_HINTS = [
    { keys: ['A', 'D'], label: 'Move' },
    { keys: ['S'], label: 'Soft' },
    { keys: ['W', 'X'], label: 'Rotate' },
    { keys: ['Z'], label: 'CCW' },
    { keys: ['Space'], label: 'Hard drop' },
    { keys: ['C'], label: 'Hold' },
    { keys: ['1', '2'], label: 'Powers' },
    { keys: ['P'], label: 'Pause' },
];

export default function TetrisGame({ accent, onExit, onGameOver, onReset, submitState = 'idle', submitMessage, isNewBest }: Props) {
    const inputProfile = useArcadeInputProfile();
    const isKeyboard = inputProfile === 'keyboard';
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dimRef = useRef({ cell: 0, w: 0, h: 0 });
    const stRef = useRef<GameState | null>(null);
    const overRef = useRef(false);
    const propsRef = useRef({ accent, onGameOver, onReset });
    const actionsRef = useRef<{ [k: string]: (...a: any[]) => void }>({});
    const shown = useRef({ score: -1, lines: -1, level: -1, charge: -1 });
    const statusRef = useRef<'playing' | 'paused' | 'over'>('playing');
    const reduceRef = useRef(false);

    const [status, setStatus] = useState<'playing' | 'paused' | 'over'>('playing');
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [holdId, setHoldId] = useState<PieceId | null>(null);
    const [nextIds, setNextIds] = useState<PieceId[]>([]);
    const [muted, setMuted] = useState(false);
    const [charge, setCharge] = useState(0);
    const [powerReady, setPowerReady] = useState(false);
    const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
    const flashKey = useRef(0);

    useEffect(() => { propsRef.current = { accent, onGameOver, onReset }; }, [accent, onGameOver, onReset]);
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
            const cell = Math.max(10, Math.min(MAX_CELL, Math.floor(Math.min(el.clientWidth / COLS, el.clientHeight / ROWS))));
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

    // ---- the game: logic + loop + input, set up once ----
    useEffect(() => {
        const spawnX = (m: number[][]) => Math.floor((COLS - m[0].length) / 2);
        const showFlash = (text: string) => { if (!text) return; flashKey.current++; setFlash({ text, key: flashKey.current }); };

        const refillBag = (st: GameState) => {
            while (st.queue.length < 7) {
                const bag = ALL_IDS.slice();
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bag[i], bag[j]] = [bag[j], bag[i]];
                }
                st.queue.push(...bag);
            }
        };

        const collides = (st: GameState, m: number[][], px: number, py: number) => {
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const bx = px + c, by = py + r;
                if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                if (by >= 0 && st.board[by][bx]) return true;
            }
            return false;
        };

        const gameOver = (st: GameState) => {
            if (overRef.current) return;
            overRef.current = true;
            statusRef.current = 'over';
            asfx.gameOver();
            vibrate(60);
            setStatus('over');
            propsRef.current.onGameOver({ score: st.score, lines: st.lines, level: st.level });
        };

        const newPiece = (st: GameState, id: PieceId): Piece => {
            const p = PIECES[id];
            return { id, matrix: cloneMatrix(p.cells), color: p.color, x: spawnX(p.cells), y: 0, rot: 0 };
        };

        const spawn = (st: GameState) => {
            refillBag(st);
            const id = st.queue.shift()!;
            st.piece = newPiece(st, id);
            st.holdUsed = false;
            st.dropAcc = 0;
            st.lockAcc = 0;
            st.lockResets = 0;
            st.lastWasRotation = false; // a fresh spawn is not a rotation
            setNextIds(st.queue.slice(0, 5));
            if (collides(st, st.piece.matrix, st.piece.x, st.piece.y)) gameOver(st);
        };

        // T-Spin (3-corner rule): only valid if the last action was a rotation and the
        // piece is a T. Tests the 4 diagonal corners of the 3x3 box (OOB counts as filled).
        // 'full' if BOTH front corners are filled, else 'mini'. Call BEFORE the board write,
        // while st.piece still occupies its landing cells.
        const cornerFilled = (st: GameState, bx: number, by: number) => {
            if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return true; // OOB = filled
            return !!st.board[by][bx];
        };
        const detectTSpin = (st: GameState): 'none' | 'mini' | 'full' => {
            const p = st.piece;
            if (p.id !== 'T' || !st.lastWasRotation) return 'none';
            const ox = p.x, oy = p.y; // T uses a 3x3 box; corners are box-local (0,0)(2,0)(0,2)(2,2)
            const tl = cornerFilled(st, ox + 0, oy + 0);
            const tr = cornerFilled(st, ox + 2, oy + 0);
            const bl = cornerFilled(st, ox + 0, oy + 2);
            const br = cornerFilled(st, ox + 2, oy + 2);
            const filled = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);
            if (filled < 3) return 'none';
            // front pair by rotation: 0=>TL,TR  1=>TR,BR  2=>BL,BR  3=>TL,BL
            const front =
                p.rot === 0 ? (tl && tr) :
                p.rot === 1 ? (tr && br) :
                p.rot === 2 ? (bl && br) :
                              (tl && bl);
            return front ? 'full' : 'mini';
        };

        // cosmetic squares emitted along each cleared row (mirrors spawnSinkParticles)
        const spawnClearParticles = (st: GameState, rows: number[]) => {
            if (reduceRef.current) return;
            for (const ry of rows) {
                for (let c = 0; c < COLS; c++) {
                    if (st.particles.length >= 80) st.particles.shift();
                    st.particles.push({ x: c + 0.5, y: ry + 0.5, vx: (Math.random() * 2 - 1) * 3, vy: (Math.random() * 2 - 1) * 4 - 1, life: 0, max: 0.4 + Math.random() * 0.4, color: c % 3 === 0 ? accent : 'rgba(255,255,255,0.85)' });
                }
            }
        };

        const lockAndNext = (st: GameState) => {
            asfx.lock();
            // detect T-spin while the piece still occupies its landing position (before the board write)
            const tspin = detectTSpin(st);
            const { matrix, x, y, color } = st.piece;
            for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const by = y + r, bx = x + c;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) st.board[by][bx] = color;
            }
            // clear full lines (record their y for clear particles)
            let cleared = 0;
            const clearedYs: number[] = [];
            for (let r = 0; r < ROWS; r++) { if (st.board[r].every((v) => v)) { cleared++; clearedYs.push(r); } }
            st.board = st.board.filter((row) => !row.every((v) => v));
            while (st.board.length < ROWS) st.board.unshift(Array(COLS).fill(''));
            if (cleared > 0 || tspin !== 'none') {
                st.lines += cleared;
                // any line-clearing T-spin (or a tetris) is "difficult" and sustains the x1.5 B2B chain
                const difficult = cleared >= 4 || (tspin !== 'none' && cleared > 0);
                const wasB2b = st.b2b;
                // base score by event
                const TSPIN_FULL = [400, 800, 1200, 1600];
                const TSPIN_MINI = [100, 200, 200, 200];
                let gain = (tspin === 'full' ? TSPIN_FULL[cleared] : tspin === 'mini' ? TSPIN_MINI[cleared] : LINE_SCORE[cleared]) * st.level;
                if (difficult && wasB2b) gain = Math.floor(gain * 1.5); // back-to-back bonus
                // a 0-line T-spin scores its base but leaves combo/b2b untouched
                if (cleared > 0) {
                    st.b2b = difficult;
                    st.combo += 1;
                    if (st.combo > 0) { gain += 50 * st.combo * st.level; asfx.combo(st.combo + 1); } // combo bonus + crescendo cue
                }
                st.score += gain;
                const oldLevel = st.level;
                const newLevel = Math.floor(st.lines / 10) + 1;
                if (newLevel !== oldLevel) { st.level = newLevel; st.gravityMs = gravityFor(newLevel); }
                // Perfect Clear (All Clear): board fully empty after a real clear. Big rare payoff.
                let perfectClear = false;
                if (cleared > 0) {
                    perfectClear = st.board.every((row) => row.every((v) => !v));
                    if (perfectClear) {
                        const PC = [0, 800, 1200, 1800, 2000];
                        const bonus = (cleared >= 4 && wasB2b) ? 3200 : PC[cleared];
                        st.score += bonus * st.level;
                    }
                }
                // Aether charge — earned only here, from clears/skill (+1/line, +1 difficult, +1 for a
                // 0-line full T-spin, +2 for a Perfect Clear). Keeps powers tied to scored skill.
                let gained = cleared + (difficult ? 1 : 0);
                if (cleared === 0 && tspin === 'full') gained += 1;
                if (perfectClear) gained += 2;
                for (let i = 0; i < gained && st.charge < MAX_CHARGE; i++) { st.charge++; asfx.charge(st.charge); }
                // feedback — flash + sfx
                if (cleared > 0) asfx.lineClear(cleared);
                const tName = tspin === 'mini' ? 'T-SPIN MINI'
                    : tspin === 'full' ? (cleared === 0 ? 'T-SPIN'
                        : `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][cleared] || ''}`.trim())
                    : '';
                let text = tspin !== 'none' ? tName
                    : (cleared >= 4) ? (wasB2b ? 'B2B TETRIS!' : 'TETRIS!')
                    : st.combo >= 1 ? `COMBO ×${st.combo + 1}`
                    : (['', 'SINGLE', 'DOUBLE', 'TRIPLE'][cleared] || '');
                if (newLevel !== oldLevel) { if (!perfectClear) text = `LEVEL ${newLevel}`; asfx.levelUp(); }
                if (perfectClear) text = 'PERFECT CLEAR'; // rarest payoff wins the banner over a coincident level-up
                showFlash(text);
                if (tspin !== 'none') asfx.tspin();
                if (perfectClear) asfx.perfectClear();
                vibrate(difficult ? 40 : 18);
                // big-clear juice: screen shake + clear particles (both reduceRef-gated inside)
                const mag = perfectClear ? 8 : (cleared >= 4 || (tspin === 'full' && cleared >= 2)) ? 6 : cleared >= 3 ? 4 : cleared > 0 ? 2 : 0;
                if (mag > 0 && !reduceRef.current) { st.shakeMag = mag; st.shakeUntil = performance.now() + 180; }
                if (clearedYs.length) spawnClearParticles(st, clearedYs);
            } else {
                st.combo = -1;   // a non-clearing lock breaks the combo (b2b persists)
            }
            spawn(st);
        };

        const grounded = (st: GameState) => collides(st, st.piece.matrix, st.piece.x, st.piece.y + 1);

        const touchLock = (st: GameState) => {
            // a successful move/rotate while grounded refreshes the lock timer (capped)
            if (grounded(st) && st.lockResets < MAX_LOCK_RESETS) { st.lockAcc = 0; st.lockResets++; }
        };

        const move = (dx: number) => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing') return;
            if (!collides(st, st.piece.matrix, st.piece.x + dx, st.piece.y)) { st.piece.x += dx; st.lastWasRotation = false; touchLock(st); asfx.move(); }
        };

        const rotate = (dir: 1 | -1) => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing') return;
            const rotated = dir === 1 ? rotateCW(st.piece.matrix) : rotateCCW(st.piece.matrix);
            for (const k of KICKS) {
                if (!collides(st, rotated, st.piece.x + k, st.piece.y)) {
                    st.piece.matrix = rotated; st.piece.x += k;
                    st.piece.rot = ((st.piece.rot + dir + 4) % 4) as 0 | 1 | 2 | 3;
                    st.lastWasRotation = true; // gates T-spin detection
                    touchLock(st); asfx.rotate(); return;
                }
            }
        };

        const hardDrop = () => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing') return;
            let d = 0;
            while (!collides(st, st.piece.matrix, st.piece.x, st.piece.y + 1)) { st.piece.y++; d++; }
            if (d > 0) st.lastWasRotation = false; // a hard drop that actually fell is not a rotation
            st.score += d * 2;
            vibrate(12);
            lockAndNext(st);
        };

        const doHold = () => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing' || st.holdUsed) return;
            const cur = st.piece.id;
            if (st.hold == null) { st.hold = cur; spawn(st); }
            else { const h = st.hold; st.hold = cur; st.piece = newPiece(st, h); if (collides(st, st.piece.matrix, st.piece.x, st.piece.y)) gameOver(st); }
            st.holdUsed = true;
            st.lockAcc = 0; st.lockResets = 0;
            st.lastWasRotation = false; // swapped piece is fresh, rot already 0 via newPiece
            asfx.hold();
            setHoldId(st.hold);
        };

        const setSoft = (on: boolean) => { const st = stRef.current; if (st) st.softDrop = on; };

        const spawnSinkParticles = (st: GameState, removed: number) => {
            if (reduceRef.current) return;
            const n = Math.min(40, removed * 10);
            for (let i = 0; i < n; i++) {
                if (st.particles.length >= 80) st.particles.shift();
                st.particles.push({ x: Math.random() * COLS, y: ROWS - Math.random() * removed, vx: (Math.random() * 2 - 1) * 3, vy: 2 + Math.random() * 4, life: 0, max: 0.4 + Math.random() * 0.4, color: i % 3 === 0 ? accent : 'rgba(255,255,255,0.85)' });
            }
        };

        const firePower = (kind: PowerKind) => {
            const st = stRef.current; if (!st || statusRef.current !== 'playing' || overRef.current) return;
            const now = performance.now();
            const cost = POWERS[kind].cost;
            if (st.charge < cost || now < st.powerCdUntil) { asfx.powerFizzle(); return; }
            st.charge -= cost;
            st.powerCdUntil = now + POWER_CD_MS;
            if (kind === 'slow') {
                st.slowUntil = now + SLOW_MS;
                asfx.slowVeil(); showFlash('SLOW VEIL'); vibrate(20);
            } else {
                // AETHER SINK — dissolve the lowest (<=4) filled rows. This NEVER routes through
                // lockAndNext, so it can never trigger a Perfect Clear bonus (structurally safe).
                const drop: number[] = [];
                for (let r = ROWS - 1; r >= 0 && drop.length < 4; r--) { if (st.board[r].some((v) => v)) drop.push(r); }
                const removed = drop.length;
                if (removed > 0) {
                    const ds = new Set(drop);
                    st.board = st.board.filter((_, r) => !ds.has(r));
                    while (st.board.length < ROWS) st.board.unshift(Array(COLS).fill(''));
                    // NOT a real clear: never touch st.lines (the leaderboard metric) or st.level
                    // (the score multiplier) — only a tiny tidy bonus, so Sink can't pad the board.
                    st.score += Math.min(removed, 4) * 25 * st.level;
                    st.combo = -1;                                    // powers never chain combo/B2B
                    st.fx.push({ kind: 'sink', count: removed, start: now });
                    spawnSinkParticles(st, removed);
                }
                asfx.aetherSink(); showFlash('AETHER SINK'); vibrate(30);
            }
        };

        const reset = () => {
            const st: GameState = {
                board: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
                piece: newPiece({} as GameState, 'I'),
                queue: [], hold: null, holdUsed: false,
                score: 0, lines: 0, level: 1, gravityMs: gravityFor(1),
                dropAcc: 0, lockAcc: 0, lockResets: 0, softDrop: false, combo: -1, b2b: false, lastWasRotation: false,
                charge: 0, powerCdUntil: 0, slowUntil: 0, wasReady: false, shakeUntil: 0, shakeMag: 0, fx: [], particles: [], last: 0,
            };
            stRef.current = st;
            overRef.current = false;
            shown.current = { score: -1, lines: -1, level: -1, charge: -1 };
            setHoldId(null);
            spawn(st);
            statusRef.current = 'playing';
            setStatus('playing');
            propsRef.current.onReset?.();
        };

        const togglePause = () => {
            if (overRef.current) return;
            setStatus((s) => (s === 'paused' ? 'playing' : s === 'playing' ? 'paused' : s));
        };

        actionsRef.current = { move, rotate, hardDrop, doHold, setSoft, firePower, reset, togglePause };

        reset();

        // ---- drawing ----
        const drawCell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, color: string, ghost = false) => {
            const x = cx * cell, y = cy * cell;
            if (ghost) {
                ctx.globalAlpha = 0.16; ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
                ctx.globalAlpha = 0.55; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
                ctx.globalAlpha = 1; return;
            }
            const edge = Math.max(1, cell * 0.18);
            ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 1, y + 1, cell - 2, edge);
            ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x + 1, y + cell - 1 - edge, cell - 2, edge);
        };

        const draw = () => {
            const { cell, w, h } = dimRef.current;
            const cv = canvasRef.current;
            const st = stRef.current;
            if (!cell || !cv || !st) return;
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            // big-clear screen shake — cosmetic (Math.random in draw is allowed; mirrors particles).
            // ctx.restore() at the end of draw() rebalances every save() so frames never drift.
            const nowShake = performance.now();
            let shook = false;
            if (!reduceRef.current && nowShake < st.shakeUntil) {
                const k = (st.shakeUntil - nowShake) / 180;
                const jx = (Math.random() * 2 - 1) * st.shakeMag * k;
                const jy = (Math.random() * 2 - 1) * st.shakeMag * k;
                ctx.save(); ctx.translate(jx, jy); shook = true;
            }
            ctx.fillStyle = '#070b12';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.045)';
            ctx.lineWidth = 1;
            for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cell + 0.5, 0); ctx.lineTo(c * cell + 0.5, h); ctx.stroke(); }
            for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cell + 0.5); ctx.lineTo(w, r * cell + 0.5); ctx.stroke(); }

            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
                if (st.board[r][c]) drawCell(ctx, c, r, cell, st.board[r][c]);
            }

            if (!overRef.current) {
                // ghost
                let gy = st.piece.y;
                while (!collides(st, st.piece.matrix, st.piece.x, gy + 1)) gy++;
                const m = st.piece.matrix;
                for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c] && gy + r >= 0) drawCell(ctx, st.piece.x + c, gy + r, cell, st.piece.color, true);
                }
                // active piece
                for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c] && st.piece.y + r >= 0) drawCell(ctx, st.piece.x + c, st.piece.y + r, cell, st.piece.color);
                }
            }

            const reduce = reduceRef.current;
            // Aether Sink — fading bars over the lowest rows (slide unless reduced-motion)
            const now2 = performance.now();
            for (const f of st.fx) {
                const t = (now2 - f.start) / 320;
                if (t >= 1) continue;
                ctx.fillStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
                for (let i = 0; i < f.count; i++) { const yy = (ROWS - 1 - i + (reduce ? 0 : t * 1.5)) * cell; ctx.fillRect(0, yy, w, cell - 2); }
            }
            // cosmetic particles (none spawn under reduced-motion)
            for (const p of st.particles) {
                const al = Math.max(0, 1 - p.life / p.max);
                ctx.globalAlpha = al; ctx.fillStyle = p.color;
                const s = Math.max(2, cell * 0.16);
                ctx.fillRect(p.x * cell - s / 2, p.y * cell - s / 2, s, s);
            }
            ctx.globalAlpha = 1;
            // Slow Veil — faint time-dilation wash (constant alpha under reduced-motion)
            if (now2 < st.slowUntil) {
                const k = Math.max(0, Math.min(1, (st.slowUntil - now2) / SLOW_MS));
                ctx.fillStyle = `rgba(34,211,238,${reduce ? 0.06 : 0.05 + 0.05 * k})`;
                ctx.fillRect(0, 0, w, h);
            }
            if (shook) ctx.restore(); // rebalance the screen-shake save()
        };

        // ---- loop ----
        let raf = 0;
        let running = true;
        const loop = (now: number) => {
            if (!running) return;
            const st = stRef.current;
            if (st) {
                if (!st.last) st.last = now;
                const dt = Math.min(64, now - st.last);
                st.last = now;
                if (statusRef.current === 'playing' && !overRef.current) {
                    const baseG = now < st.slowUntil ? st.gravityMs * 2 : st.gravityMs; // Slow Veil
                    const g = st.softDrop ? Math.min(baseG, 35) : baseG;
                    st.dropAcc += dt;
                    if (st.dropAcc >= g) {
                        st.dropAcc = 0;
                        if (!collides(st, st.piece.matrix, st.piece.x, st.piece.y + 1)) {
                            st.piece.y++;
                            st.lockResets = 0;
                            st.lockAcc = 0;
                            st.lastWasRotation = false; // gravity/soft-drop movement is not a rotation
                            if (st.softDrop) st.score += 1;
                        }
                    }
                    if (grounded(st)) {
                        st.lockAcc += dt;
                        if (st.lockAcc >= LOCK_DELAY) lockAndNext(st);
                    } else {
                        st.lockAcc = 0;
                    }
                    // push HUD numbers only when they change
                    if (st.score !== shown.current.score) { shown.current.score = st.score; setScore(st.score); }
                    if (st.lines !== shown.current.lines) { shown.current.lines = st.lines; setLines(st.lines); }
                    if (st.level !== shown.current.level) { shown.current.level = st.level; setLevel(st.level); }
                    if (st.charge !== shown.current.charge) { shown.current.charge = st.charge; setCharge(st.charge); }
                    // power-ready (rising-edge chime; setState bails when unchanged so no per-frame render)
                    const ready = st.charge >= MIN_POWER_COST && now >= st.powerCdUntil;
                    if (ready && !st.wasReady) asfx.powerReady();
                    st.wasReady = ready;
                    setPowerReady((prev) => (prev === ready ? prev : ready));
                    // cosmetic fx + particles (cell-space, advanced by real dt)
                    const dts = dt / 1000;
                    for (const p of st.particles) { p.life += dts; p.x += p.vx * dts; p.y += p.vy * dts; p.vy += 24 * dts; }
                    if (st.particles.length) st.particles = st.particles.filter((p) => p.life < p.max);
                    if (st.fx.length) st.fx = st.fx.filter((f) => now - f.start < 320);
                }
                draw();
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        // ---- keyboard ----
        const onKeyDown = (e: KeyboardEvent) => {
            if (overRef.current) return;
            unlockArcadeAudio();
            const a = actionsRef.current;
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); a.move(-1); break;
                case 'ArrowRight': case 'd': case 'D': e.preventDefault(); a.move(1); break;
                case 'ArrowUp': case 'x': case 'X': case 'w': case 'W': e.preventDefault(); a.rotate(1); break;
                case 'z': case 'Z': case 'Control': e.preventDefault(); a.rotate(-1); break;
                case 'ArrowDown': case 's': case 'S': e.preventDefault(); a.setSoft(true); break;
                case ' ': e.preventDefault(); a.hardDrop(); break;
                case 'c': case 'C': case 'Shift': e.preventDefault(); a.doHold(); break;
                case '1': case 'q': case 'Q': e.preventDefault(); a.firePower('slow'); break;
                case '2': case 'e': case 'E': e.preventDefault(); a.firePower('sink'); break;
                case 'p': case 'P': case 'Escape': e.preventDefault(); a.togglePause(); break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') actionsRef.current.setSoft(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // ---- board gestures (additive; the button pad still works) ----
        const surface = wrapRef.current;
        let gx = 0, gy = 0, gt = 0, lastY = 0, lastT = 0, anchorX = 0, peakVel = 0;
        let axis: '' | 'h' | 'v' = '', dragging = false, softing = false, tracking = false;
        const onPD = (e: PointerEvent) => {
            if (statusRef.current !== 'playing') return;
            if ((e.target as HTMLElement)?.closest?.('[data-noboard]')) return;
            e.preventDefault();
            try { surface?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
            gx = e.clientX; gy = lastY = e.clientY; gt = lastT = performance.now();
            anchorX = e.clientX; axis = ''; dragging = false; softing = false; peakVel = 0; tracking = true;
            unlockArcadeAudio();
        };
        const onPM = (e: PointerEvent) => {
            if (!tracking || statusRef.current !== 'playing') return;
            const x = e.clientX, y = e.clientY, t = performance.now();
            const cell = dimRef.current.cell || 24;
            const STEP = Math.max(22, cell);
            if (axis === '') {
                if (Math.abs(x - gx) > 10 || Math.abs(y - gy) > 10) { axis = Math.abs(x - gx) >= Math.abs(y - gy) ? 'h' : 'v'; dragging = true; if (axis === 'h') anchorX = x; }
            }
            if (axis === 'h') {
                while (x - anchorX >= STEP) { actionsRef.current.move(1); anchorX += STEP; }
                while (anchorX - x >= STEP) { actionsRef.current.move(-1); anchorX -= STEP; }
                if (softing) { actionsRef.current.setSoft(false); softing = false; }
            } else if (axis === 'v') {
                if (y - gy > 14 && !softing) { actionsRef.current.setSoft(true); softing = true; }
                const vy = (y - lastY) / Math.max(1, t - lastT);
                if (vy > peakVel) peakVel = vy;
            }
            lastY = y; lastT = t;
        };
        const onPU = (e: PointerEvent) => {
            if (!tracking) return;
            tracking = false;
            if (softing) { actionsRef.current.setSoft(false); softing = false; }
            if (statusRef.current === 'playing') {
                const dur = performance.now() - gt;
                const dy = e.clientY - gy, dist = Math.hypot(e.clientX - gx, dy);
                const cell = dimRef.current.cell || 24;
                if (!dragging && dur < 180 && dist < 10) actionsRef.current.rotate(1);                       // tap = rotate
                else if (axis === 'v' && dy >= Math.max(90, cell * 4) && peakVel >= 1.1) actionsRef.current.hardDrop(); // flick down = hard drop
            }
            axis = ''; dragging = false;
        };
        const onPCancel = () => { tracking = false; if (softing) { actionsRef.current.setSoft(false); softing = false; } axis = ''; dragging = false; };
        surface?.addEventListener('pointerdown', onPD, { passive: false });
        surface?.addEventListener('pointermove', onPM, { passive: false });
        surface?.addEventListener('pointerup', onPU);
        surface?.addEventListener('pointercancel', onPCancel);
        const winPU = () => { if (softing) { actionsRef.current.setSoft(false); softing = false; } };
        window.addEventListener('pointerup', winPU);

        const onBlur = () => { actionsRef.current.setSoft(false); if (!overRef.current) setStatus((s) => (s === 'playing' ? 'paused' : s)); };
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onBlur);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onBlur);
            surface?.removeEventListener('pointerdown', onPD);
            surface?.removeEventListener('pointermove', onPM);
            surface?.removeEventListener('pointerup', onPU);
            surface?.removeEventListener('pointercancel', onPCancel);
            window.removeEventListener('pointerup', winPU);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- hold-to-repeat for the move / soft-drop buttons ----
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const endPress = useCallback((key: string) => {
        const t = timers.current[key];
        if (t) clearTimeout(t);
        delete timers.current[key];
    }, []);
    const startPress = useCallback((key: string, fn: () => void, delay = 150, rep = 55) => {
        fn();
        endPress(key);
        const tick = () => { fn(); timers.current[key] = setTimeout(tick, rep); };
        timers.current[key] = setTimeout(tick, delay);
    }, [endPress]);
    useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

    const a = actionsRef.current;
    const toggleMute = () => { const m = !muted; setArcadeMuted(m); setMuted(m); };
    const canSlow = powerReady && charge >= POWERS.slow.cost;
    const canSink = powerReady && charge >= POWERS.sink.cost;
    const padBtn = 'flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] active:bg-white/[0.12] text-white/90 select-none touch-none h-11';
    const pct = MAX_CHARGE > 0 ? Math.min(100, (charge / MAX_CHARGE) * 100) : 0;

    return (
        <div className="absolute inset-0 z-[60] flex flex-col select-none" onPointerDown={() => unlockArcadeAudio()} style={{ background: `radial-gradient(100% 70% at 50% -5%, ${accent}22, transparent 55%), #06070c`, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <style>{`@keyframes arcadePop{0%{transform:scale(0.6);opacity:0}20%{transform:scale(1.12);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}@keyframes arcadeReady{0%,100%{opacity:.7}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[data-ready-glow]{animation:none!important}}`}</style>
            <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <button onClick={onExit} className="h-10 px-3 rounded-lg border border-white/12 bg-white/[0.04] text-zinc-200 hover:text-white flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" aria-label="Leave Tetra">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Exit</span>
                </button>
                <div className="text-center">
                    <p className="text-[9px] uppercase tracking-[0.35em] text-white/35 font-mono">Arcade</p>
                    <p className="font-ritual text-xl tracking-[0.2em] leading-none" style={{ color: accent }}>TETRA</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Stack · clear · charge</p>
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

            {/* inline stat strip (replaces the old hold/stats/next row + standalone Aether meter) */}
            <div className="flex items-center justify-center gap-3 px-3 pt-1 shrink-0 font-mono">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Score <b className="font-ritual text-sm align-middle" style={{ color: accent }}>{score}</b></span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Lines <b className="font-ritual text-sm align-middle text-white">{lines}</b></span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Lvl <b className="font-ritual text-sm align-middle text-white">{level}</b></span>
            </div>

            {/* board + controls — centered card on wide screens, full bleed on phones */}
            <div className="flex-1 min-h-0 flex flex-col mx-auto w-full max-w-[420px]">
            {/* board */}
            <div ref={wrapRef} className="relative flex-1 min-h-0 flex items-center justify-center px-3 py-1">
                <canvas ref={canvasRef} className="rounded-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" style={{ touchAction: 'none' }} />

                {/* Hold — top-left board overlay (0 layout px; pointer-events-none so gestures pass through) */}
                <div data-noboard className="absolute left-3 top-2 pointer-events-none rounded-lg bg-black/45 backdrop-blur px-1.5 py-1 flex flex-col items-center">
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/50 leading-none mb-0.5">Hold</span>
                    <MiniPiece id={holdId} size={30} />
                </div>

                {/* Next (5-deep) — top-right board overlay */}
                <div data-noboard className="absolute right-3 top-2 pointer-events-none rounded-lg bg-black/45 backdrop-blur px-1.5 py-1 flex flex-col items-center">
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/50 leading-none mb-0.5">Next</span>
                    {nextIds.length === 0
                        ? <MiniPiece id={null} size={30} />
                        : nextIds.map((id, i) => <MiniPiece key={i} id={id} size={i === 0 ? 30 : 22} />)}
                </div>

                {/* Aether charge — board-edge hairline; glows when a power is ready */}
                <div data-noboard className="absolute left-2 right-2 bottom-2 h-1 rounded-full pointer-events-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent, boxShadow: powerReady ? `0 0 8px ${accent}` : 'none' }} />
                </div>

                {flash && status === 'playing' && (
                    <div key={flash.key} className="absolute inset-x-0 top-[16%] flex justify-center pointer-events-none px-4" style={{ animation: 'arcadePop 0.85s ease-out forwards' }}>
                        <span className="font-ritual text-2xl font-black tracking-[0.18em] text-center" style={{ color: accent, textShadow: '0 2px 14px rgba(0,0,0,0.7)' }}>{flash.text}</span>
                    </div>
                )}

                {status === 'paused' && (
                    <div data-noboard className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
                        <div className="text-center">
                            <p className="font-ritual text-2xl gold-shimmer mb-4">Paused</p>
                            <button onClick={() => a.togglePause?.()} className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>Resume</button>
                        </div>
                    </div>
                )}

                {status === 'over' && (
                    <div data-noboard className="absolute inset-0 flex items-center justify-center bg-black/82 backdrop-blur-sm rounded-xl p-4">
                        <div className="w-full max-w-xs text-center">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-1">The stones rest</p>
                            <h2 className="font-ritual text-3xl gold-shimmer mb-1">Game Over</h2>
                            {isNewBest && <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: accent }}>✦ New personal best</p>}
                            <div className="grid grid-cols-3 gap-2 my-4">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Score</p><p className="font-ritual text-xl" style={{ color: accent }}>{score}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Lines</p><p className="font-ritual text-xl text-white">{lines}</p></div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2"><p className="text-[8px] uppercase tracking-widest text-white/40">Level</p><p className="font-ritual text-xl text-white">{level}</p></div>
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

            {/* PC: keyboard hints · Phone: full control pad */}
            {isKeyboard ? (
                <div className="shrink-0 px-2 pb-2 pt-1 flex justify-center">
                    <KeyboardHintBar hints={TETRA_HINTS} className="py-2 px-3 gap-x-3 gap-y-1.5 max-w-full" />
                </div>
            ) : (
            <div className="shrink-0 px-3 pb-2 pt-1.5 grid grid-cols-6 gap-1.5" style={{ touchAction: 'none' }}>
                {/* Row 1 */}
                <button
                    data-noboard disabled={!canSlow}
                    onPointerDown={(e) => { e.preventDefault(); a.firePower?.('slow'); }}
                    className={`${padBtn} relative ${canSlow ? '' : 'opacity-40'}`}
                    style={canSlow ? { borderColor: `${accent}66`, boxShadow: `0 0 10px ${accent}33`, color: accent } : undefined}
                    aria-label="Slow Veil power"
                ><span className="text-base leading-none">◐</span><span className="absolute top-0.5 right-1 text-[8px] font-mono opacity-70">{POWERS.slow.cost}</span></button>
                <button
                    data-noboard disabled={!canSink}
                    onPointerDown={(e) => { e.preventDefault(); a.firePower?.('sink'); }}
                    className={`${padBtn} relative ${canSink ? '' : 'opacity-40'}`}
                    style={canSink ? { borderColor: `${accent}66`, boxShadow: `0 0 10px ${accent}33`, color: accent } : undefined}
                    aria-label="Aether Sink power"
                ><span className="text-xs font-black leading-none">▼▼</span><span className="absolute top-0.5 right-1 text-[8px] font-mono opacity-70">{POWERS.sink.cost}</span></button>
                <button className={padBtn} onPointerDown={(e) => { e.preventDefault(); a.rotate?.(-1); }} aria-label="Rotate left"><RotateCcw className="w-5 h-5" /></button>
                <button className={padBtn} onPointerDown={(e) => { e.preventDefault(); a.rotate?.(1); }} aria-label="Rotate right"><RotateCw className="w-5 h-5" /></button>
                <button className={`${padBtn} col-span-2`} onPointerDown={(e) => { e.preventDefault(); a.doHold?.(); }} aria-label="Hold"><Box className="w-5 h-5 mr-1" /> <span className="text-[11px] font-black uppercase tracking-[0.2em]">Hold</span></button>

                {/* Row 2 */}
                <button
                    className={padBtn}
                    onPointerDown={(e) => { e.preventDefault(); startPress('L', () => a.move?.(-1), 140, 40); }}
                    onPointerUp={() => endPress('L')} onPointerLeave={() => endPress('L')} onPointerCancel={() => endPress('L')}
                    aria-label="Move left"
                >◀</button>
                <button
                    className={padBtn}
                    onPointerDown={(e) => { e.preventDefault(); startPress('R', () => a.move?.(1), 140, 40); }}
                    onPointerUp={() => endPress('R')} onPointerLeave={() => endPress('R')} onPointerCancel={() => endPress('R')}
                    aria-label="Move right"
                >▶</button>
                <button
                    className={`${padBtn} col-span-2`}
                    onPointerDown={(e) => { e.preventDefault(); a.setSoft?.(true); }}
                    onPointerUp={() => a.setSoft?.(false)} onPointerLeave={() => a.setSoft?.(false)} onPointerCancel={() => a.setSoft?.(false)}
                    aria-label="Soft drop"
                ><ChevronDown className="w-5 h-5" /></button>
                <button
                    className={`${padBtn} col-span-2`}
                    style={{ background: `${accent}1c`, borderColor: `${accent}55`, color: accent }}
                    onPointerDown={(e) => { e.preventDefault(); a.hardDrop?.(); }}
                    aria-label="Hard drop"
                ><ChevronsDown className="w-5 h-5 mr-1" /> <span className="text-[11px] font-black uppercase tracking-[0.3em]">Drop</span></button>
            </div>
            )}
            </div>
        </div>
    );
}
