'use client';

import { useRef, useEffect } from 'react';
import { buildAvatarPixels, AV_W, AV_H, type AvatarConfig, type Facing } from '@/lib/game/avatar';

// ============================================================
//  AVATAR CANVAS — paints a layered AvatarConfig (lib/game/avatar)
//  onto a <canvas> with crisp pixels. Also exposes paintAvatar /
//  avatarOffscreen so the world & combat engines can draw the same
//  character imperatively.
// ============================================================

// Paint a pre-built pixel grid into a context at (ox,oy) with a cell size.
export function paintGrid(ctx: CanvasRenderingContext2D, grid: (string | null)[][], cell: number, ox = 0, oy = 0) {
    for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < row.length; x++) {
            const c = row[x];
            if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }
        }
    }
}

// Render a config to a fresh offscreen canvas at native resolution (1px cells).
// `step` selects a walk frame (0 idle, 1/2 stepping). The caller can
// drawImage() it at any scale with imageSmoothing off.
export function avatarOffscreen(config: AvatarConfig, step = 0, dir: Facing = 'down'): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = AV_W;
    c.height = AV_H;
    const ctx = c.getContext('2d')!;
    paintGrid(ctx, buildAvatarPixels(config, step, dir), 1, 0, 0);
    return c;
}

export default function AvatarCanvas({ config, scale = 8, step = 0, dir = 'down', className, style }: {
    config: AvatarConfig; scale?: number; step?: number; dir?: Facing; className?: string; style?: React.CSSProperties;
}) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = AV_W * scale * dpr;
        canvas.height = AV_H * scale * dpr;
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, AV_W * scale, AV_H * scale);
        paintGrid(ctx, buildAvatarPixels(config, step, dir), scale);
    }, [config, scale, step, dir]);

    return (
        <canvas
            ref={ref}
            className={className}
            style={{ width: AV_W * scale, height: AV_H * scale, imageRendering: 'pixelated', ...style }}
        />
    );
}
