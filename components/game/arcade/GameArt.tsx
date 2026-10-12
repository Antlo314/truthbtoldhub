'use client';

/**
 * Cover art for each arcade game, painted on a canvas from the same Kenney
 * sprites the games draw with — so the shelf looks like the thing you play.
 * Redraws on resize and once more when the sprites finish decoding.
 */
import { useEffect, useRef, useState } from 'react';
import { loadArcadeSprites, sprite, tinted } from '@/lib/game/arcadeSprites';

type Ctx = CanvasRenderingContext2D;

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
}

function tile(ctx: Ctx, name: Parameters<typeof tinted>[0], color: string, x: number, y: number, s: number, dpr: number) {
    const t = tinted(name, color, s * dpr);
    if (t) ctx.drawImage(t, x, y, s, s);
    else {
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
}

const TETRA_SHAPES: { c: string; cells: [number, number][] }[] = [
    { c: '#22d3ee', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { c: '#fbbf24', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { c: '#a855f7', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    { c: '#22c55e', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    { c: '#ef4444', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { c: '#3b82f6', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    { c: '#f97316', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
];

function drawTetra(ctx: Ctx, w: number, h: number, accent: string, dpr: number) {
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.7, h * 0.15, w * 0.6, accent, 0.35);
    const s = Math.max(12, Math.round(h / 9));
    const cols = Math.ceil(w / s);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < w; x += s) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
    }
    // a settled stack along the floor, with one gap waiting for the I-piece
    const gapCol = Math.floor(cols * 0.62);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < cols; c++) {
            if (c === gapCol) continue;
            if (r === 2 && (c % 5 === 1 || c % 7 === 3)) continue;
            const shape = TETRA_SHAPES[(c * 3 + r * 5) % TETRA_SHAPES.length];
            tile(ctx, 'block', shape.c, c * s, h - (r + 1) * s, s, dpr);
        }
    }
    // the I-piece, falling into the well
    for (let i = 0; i < 4; i++) tile(ctx, 'block', '#22d3ee', gapCol * s, h * 0.18 + i * s, s, dpr);
    // a T-piece tumbling at left
    const t = TETRA_SHAPES[2];
    for (const [cx, cy] of t.cells) tile(ctx, 'block', t.c, s * 2 + cx * s, h * 0.28 + cy * s, s, dpr);
}

function drawSerpent(ctx: Ctx, w: number, h: number, accent: string, dpr: number) {
    ctx.fillStyle = '#06110b';
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.25, h * 0.6, w * 0.5, accent, 0.3);
    const s = Math.max(14, Math.round(h / 8));
    const n = 14;
    for (let i = n - 1; i >= 0; i--) {
        const x = w * 0.12 + i * s * 0.82;
        const y = h * 0.55 + Math.sin(i * 0.6) * h * 0.16;
        const head = i === n - 1;
        const t = tinted('orb', head ? '#eafff4' : accent, s * dpr);
        ctx.globalAlpha = 0.45 + (0.55 * i) / n;
        if (t) ctx.drawImage(t, x - s / 2, y - s / 2, s, s);
        ctx.globalAlpha = 1;
    }
    const gx = w * 0.88;
    const gy = h * 0.42;
    glow(ctx, gx, gy, s * 1.6, accent, 0.6);
    tile(ctx, 'gem', accent, gx - s * 0.5, gy - s * 0.5, s, dpr);
    glow(ctx, w * 0.62, h * 0.18, s * 1.4, '#fcd34d', 0.5);
    tile(ctx, 'star', '#fcd34d', w * 0.62 - s * 0.45, h * 0.18 - s * 0.45, s * 0.9, dpr);
}

function drawVeil(ctx: Ctx, w: number, h: number, accent: string, dpr: number) {
    ctx.fillStyle = '#06060d';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const sp = Math.max(16, h / 7);
    ctx.strokeStyle = 'hsla(265,70%,62%,0.09)';
    for (let x = 0; x < w; x += sp) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += sp) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    const floor = h * 0.74;
    ctx.strokeStyle = '#9d7bff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#9d7bff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, floor);
    ctx.lineTo(w, floor);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const P = h / 7;
    ctx.fillStyle = '#ff4d6d';
    for (const x of [0.52, 0.58, 0.86]) {
        ctx.beginPath();
        ctx.moveTo(w * x, floor);
        ctx.lineTo(w * x + P, floor);
        ctx.lineTo(w * x + P / 2, floor - P);
        ctx.closePath();
        ctx.fill();
    }
    const coin = sprite('coin');
    for (const [x, y] of [[0.42, 0.42], [0.55, 0.3], [0.68, 0.42]]) {
        if (coin) ctx.drawImage(coin, w * x - P * 0.32, h * y - P * 0.32, P * 0.64, P * 0.64);
    }
    // the trail and the ship
    for (let i = 0; i < 10; i++) glow(ctx, w * 0.12 + i * P * 0.32, h * 0.5 - i * 2, P * 0.35, accent, 0.06 + i * 0.02);
    glow(ctx, w * 0.24, h * 0.46, P * 1.4, accent, 0.5);
    const ship = tinted('ship', accent, P * 1.2 * dpr);
    if (ship) {
        ctx.save();
        ctx.translate(w * 0.24, h * 0.46);
        ctx.rotate(Math.PI / 2 - 0.25);
        ctx.drawImage(ship, -P * 0.6, -P * 0.6, P * 1.2, P * 1.2);
        ctx.restore();
    }
}

function drawAscent(ctx: Ctx, w: number, h: number, accent: string, dpr: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#120c2c');
    sky.addColorStop(0.42, '#4a3278');
    sky.addColorStop(0.58, '#f0b06a');
    sky.addColorStop(0.62, '#8a6aa8');
    sky.addColorStop(1, '#2d2150');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const hz = h * 0.58;
    glow(ctx, w * 0.5, hz, w * 0.35, '#ffd29a', 0.55);
    // clouds
    for (let i = 0; i < 26; i++) {
        const x = ((i * 97) % 100) / 100 * w;
        const y = hz + 6 + ((i * 53) % 40) / 100 * h;
        glow(ctx, x, y, h * (0.08 + ((i * 31) % 10) / 100), '#efe6ff', 0.18);
    }
    // the road, three lanes converging on the horizon
    const vx = w * 0.5;
    const baseL = w * 0.12;
    const baseR = w * 0.88;
    ctx.fillStyle = '#2f2747';
    ctx.beginPath();
    ctx.moveTo(baseL, h);
    ctx.lineTo(vx - 4, hz + 2);
    ctx.lineTo(vx + 4, hz + 2);
    ctx.lineTo(baseR, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d6a64e';
    ctx.lineWidth = 2;
    for (const t of [0, 1 / 3, 2 / 3, 1]) {
        ctx.globalAlpha = t === 0 || t === 1 ? 0.95 : 0.4;
        ctx.beginPath();
        ctx.moveTo(baseL + (baseR - baseL) * t, h);
        ctx.lineTo(vx - 4 + 8 * t, hz + 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // coins down the middle lane, shrinking into the distance
    const coin = sprite('coin');
    for (let i = 0; i < 6; i++) {
        const k = Math.pow(0.68, i);
        const y = hz + (h - hz) * k * 0.82;
        const s = h * 0.16 * k;
        glow(ctx, vx, y, s * 1.2, '#fcd34d', 0.35);
        if (coin) ctx.drawImage(coin, vx - s / 2, y - s / 2, s, s);
    }
    // a shard pillar at the right, a crate at the left
    tile(ctx, 'diamond', '#a78bfa', w * 0.66, h * 0.62, h * 0.14, dpr);
    tile(ctx, 'block', '#b45309', w * 0.24, h * 0.72, h * 0.12, dpr);
    glow(ctx, w * 0.5, h * 0.96, h * 0.25, accent, 0.4);
}

const PAINTERS: Record<string, (ctx: Ctx, w: number, h: number, accent: string, dpr: number) => void> = {
    tetra: drawTetra,
    serpent: drawSerpent,
    veil: drawVeil,
    ascent: drawAscent,
};

export default function GameArt({ game, accent, className = '' }: { game: string; accent: string; className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        loadArcadeSprites();
        const t1 = setTimeout(() => setTick((n) => n + 1), 400);
        const t2 = setTimeout(() => setTick((n) => n + 1), 1400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const paint = () => {
            const r = cv.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            cv.width = Math.round(r.width * dpr);
            cv.height = Math.round(r.height * dpr);
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            (PAINTERS[game] ?? drawTetra)(ctx, r.width, r.height, accent, dpr);
        };
        paint();
        const ro = new ResizeObserver(paint);
        ro.observe(cv);
        return () => ro.disconnect();
    }, [game, accent, tick]);

    return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden />;
}
