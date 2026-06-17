'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { MinigameDef } from '@/lib/game/minigames';

interface Props {
    game: MinigameDef;
    accent: string;
    onWin: () => void;
}

type Dir = 'up' | 'down' | 'left' | 'right';

export default function SnakeGame({ game, accent, onWin }: Props) {
    const grid = game.config?.gridSize ?? 16;
    const target = game.targetScore;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [dead, setDead] = useState(false);
    const wonRef = useRef(false);

    const stateRef = useRef({
        snake: [{ x: 8, y: 8 }],
        dir: 'right' as Dir,
        nextDir: 'right' as Dir,
        food: { x: 12, y: 8 },
        tick: 0,
    });

    const spawnFood = useCallback((snake: { x: number; y: number }[]) => {
        for (let t = 0; t < 40; t++) {
            const f = { x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) };
            if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
        }
        return { x: 0, y: 0 };
    }, [grid]);

    const queueDir = (d: Dir) => {
        const st = stateRef.current;
        const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (d !== opp[st.dir]) st.nextDir = d;
    };

    useEffect(() => {
        wonRef.current = false;
        setDead(false);
        setScore(0);
        stateRef.current = {
            snake: [{ x: Math.floor(grid / 2), y: Math.floor(grid / 2) }],
            dir: 'right',
            nextDir: 'right',
            food: spawnFood([{ x: 0, y: 0 }]),
            tick: 0,
        };
    }, [grid, spawnFood]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const cell = Math.floor(Math.min(canvas.clientWidth, 320) / grid);
        const size = cell * grid;

        let raf = 0;
        let last = 0;
        const interval = game.tier >= 4 ? 110 : 140;

        const loop = (now: number) => {
            if (now - last >= interval) {
                last = now;
                const st = stateRef.current;
                st.dir = st.nextDir;
                const head = { ...st.snake[0] };
                if (st.dir === 'up') head.y--;
                if (st.dir === 'down') head.y++;
                if (st.dir === 'left') head.x--;
                if (st.dir === 'right') head.x++;

                if (head.x < 0 || head.y < 0 || head.x >= grid || head.y >= grid ||
                    st.snake.some((s) => s.x === head.x && s.y === head.y)) {
                    setDead(true);
                    return;
                }

                st.snake.unshift(head);
                if (head.x === st.food.x && head.y === st.food.y) {
                    const ns = st.snake.length;
                    setScore(ns);
                    if (ns >= target && !wonRef.current) {
                        wonRef.current = true;
                        setTimeout(onWin, 300);
                    }
                    st.food = spawnFood(st.snake);
                } else {
                    st.snake.pop();
                }
            }

            const ctx = canvas.getContext('2d')!;
            canvas.width = size;
            canvas.height = size;
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, size, size);

            const st = stateRef.current;
            ctx.fillStyle = accent + '33';
            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    if ((i + j) % 2 === 0) ctx.fillRect(i * cell, j * cell, cell, cell);
                }
            }

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(st.food.x * cell + cell / 2, st.food.y * cell + cell / 2, cell * 0.35, 0, Math.PI * 2);
            ctx.fill();

            st.snake.forEach((s, i) => {
                ctx.fillStyle = i === 0 ? accent : accent + 'aa';
                ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
            });

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [grid, target, accent, game.tier, onWin, spawnFood]);

    const restart = () => {
        setDead(false);
        setScore(0);
        wonRef.current = false;
        stateRef.current = {
            snake: [{ x: Math.floor(grid / 2), y: Math.floor(grid / 2) }],
            dir: 'right',
            nextDir: 'right',
            food: spawnFood([{ x: 0, y: 0 }]),
            tick: 0,
        };
    };

    const btn = 'px-4 py-3 rounded-xl text-lg font-black border border-white/15 bg-black/40 active:scale-95';

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex justify-between w-full max-w-[320px] text-[10px] uppercase tracking-widest">
                <span style={{ color: accent }}>Length · {score} / {target}</span>
                {dead && <button type="button" onClick={restart} className="text-red-400">Retry</button>}
            </div>
            <canvas ref={canvasRef} className="rounded-xl border border-white/10 max-w-[320px] w-full" style={{ touchAction: 'none' }} />
            <div className="grid grid-cols-3 gap-2 max-w-[200px] w-full">
                <div />
                <button type="button" className={btn} onClick={() => queueDir('up')}>▲</button>
                <div />
                <button type="button" className={btn} onClick={() => queueDir('left')}>◀</button>
                <button type="button" className={btn} onClick={() => queueDir('down')}>▼</button>
                <button type="button" className={btn} onClick={() => queueDir('right')}>▶</button>
            </div>
        </div>
    );
}