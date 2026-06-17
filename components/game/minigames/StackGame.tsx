'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { MinigameDef } from '@/lib/game/minigames';

interface Props {
    game: MinigameDef;
    accent: string;
    onWin: () => void;
}

const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
];

export default function StackGame({ game, accent, onWin }: Props) {
    const cols = game.config?.cols ?? 8;
    const rows = game.config?.rows ?? 14;
    const target = game.targetScore;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lines, setLines] = useState(0);
    const [over, setOver] = useState(false);
    const wonRef = useRef(false);

    const stRef = useRef({
        board: Array.from({ length: rows }, () => Array(cols).fill(0)),
        piece: { shape: SHAPES[0], x: 3, y: 0, rot: 0 },
        dropMs: game.tier >= 5 ? 520 : 680,
        last: 0,
    });

    const rotShape = (shape: number[][]) => {
        const h = shape.length;
        const w = shape[0].length;
        const out = Array.from({ length: w }, () => Array(h).fill(0));
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out[c][h - 1 - r] = shape[r][c];
        return out;
    };

    const collides = (board: number[][], shape: number[][], px: number, py: number) => {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const bx = px + c;
                const by = py + r;
                if (bx < 0 || bx >= cols || by >= rows) return true;
                if (by >= 0 && board[by][bx]) return true;
            }
        }
        return false;
    };

    const lockPiece = useCallback(() => {
        const st = stRef.current;
        const { shape, x, y } = st.piece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const by = y + r;
                const bx = x + c;
                if (by >= 0 && by < rows && bx >= 0 && bx < cols) st.board[by][bx] = 1;
            }
        }
        let cleared = 0;
        st.board = st.board.filter((row) => {
            if (row.every((v) => v)) { cleared++; return false; }
            return true;
        });
        while (st.board.length < rows) st.board.unshift(Array(cols).fill(0));

        if (cleared > 0) {
            setLines((l) => {
                const nl = l + cleared;
                if (nl >= target && !wonRef.current) {
                    wonRef.current = true;
                    setTimeout(onWin, 400);
                }
                return nl;
            });
        }

        const ns = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        st.piece = { shape: ns, x: Math.floor(cols / 2) - 1, y: 0, rot: 0 };
        if (collides(st.board, st.piece.shape, st.piece.x, st.piece.y)) setOver(true);
    }, [cols, rows, target, onWin]);

    const move = (dx: number) => {
        const st = stRef.current;
        const { shape, x, y } = st.piece;
        if (!collides(st.board, shape, x + dx, y)) st.piece.x += dx;
    };

    const rotate = () => {
        const st = stRef.current;
        const ns = rotShape(st.piece.shape);
        if (!collides(st.board, ns, st.piece.x, st.piece.y)) st.piece.shape = ns;
    };

    const hardDrop = () => {
        const st = stRef.current;
        while (!collides(st.board, st.piece.shape, st.piece.x, st.piece.y + 1)) st.piece.y++;
        lockPiece();
    };

    useEffect(() => {
        wonRef.current = false;
        setOver(false);
        setLines(0);
        stRef.current = {
            board: Array.from({ length: rows }, () => Array(cols).fill(0)),
            piece: { shape: SHAPES[0], x: 3, y: 0, rot: 0 },
            dropMs: game.tier >= 5 ? 520 : 680,
            last: 0,
        };
    }, [cols, rows, game.tier]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const cell = Math.floor(280 / cols);
        const w = cols * cell;
        const h = rows * cell;

        let raf = 0;
        const loop = (now: number) => {
            const st = stRef.current;
            if (!over && now - st.last >= st.dropMs) {
                st.last = now;
                if (!collides(st.board, st.piece.shape, st.piece.x, st.piece.y + 1)) {
                    st.piece.y++;
                } else {
                    lockPiece();
                }
            }

            const ctx = canvas.getContext('2d')!;
            canvas.width = w;
            canvas.height = h;
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, w, h);

            st.board.forEach((row, r) => row.forEach((v, c) => {
                if (v) {
                    ctx.fillStyle = accent + 'cc';
                    ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
                }
            }));

            const { shape, x, y } = st.piece;
            ctx.fillStyle = '#fbbf24';
            shape.forEach((row, r) => row.forEach((v, c) => {
                if (v && y + r >= 0) ctx.fillRect((x + c) * cell + 1, (y + r) * cell + 1, cell - 2, cell - 2);
            }));

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [cols, rows, accent, over, lockPiece]);

    const restart = () => {
        wonRef.current = false;
        setOver(false);
        setLines(0);
        stRef.current = {
            board: Array.from({ length: rows }, () => Array(cols).fill(0)),
            piece: { shape: SHAPES[0], x: 3, y: 0, rot: 0 },
            dropMs: game.tier >= 5 ? 520 : 680,
            last: 0,
        };
    };

    const btn = 'px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/15 bg-black/40';

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex justify-between w-full max-w-[280px] text-[10px] uppercase tracking-widest">
                <span style={{ color: accent }}>Lines · {lines} / {target}</span>
                {over && <button type="button" onClick={restart} className="text-red-400">Retry</button>}
            </div>
            <canvas ref={canvasRef} className="rounded-xl border border-white/10" style={{ touchAction: 'none' }} />
            <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
                <button type="button" className={btn} onClick={() => move(-1)}>◀</button>
                <button type="button" className={btn} onClick={rotate}>Rotate</button>
                <button type="button" className={btn} onClick={() => move(1)}>▶</button>
                <button type="button" className={btn} onClick={hardDrop} style={{ color: accent }}>Drop</button>
            </div>
        </div>
    );
}