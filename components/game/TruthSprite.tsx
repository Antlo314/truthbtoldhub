'use client';

import { useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { paintGrid } from '@/components/game/AvatarCanvas';
import { buildTruthPixels } from '@/lib/game/truth';
import { AV_W, AV_H } from '@/lib/game/avatar';

// Truth — full-body hooded sage (16×24), same scale system as the player.

export default function TruthSprite({
    scale = 8,
    className,
    style,
}: {
    scale?: number;
    className?: string;
    style?: CSSProperties;
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
        paintGrid(ctx, buildTruthPixels(), scale);
    }, [scale]);

    return (
        <canvas
            ref={ref}
            className={className}
            role="img"
            aria-label="Truth"
            style={{
                width: AV_W * scale,
                height: AV_H * scale,
                imageRendering: 'pixelated',
                ...style,
            }}
        />
    );
}