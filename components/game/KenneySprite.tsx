'use client';

import type { CSSProperties } from 'react';

// Renders a single 16px tile cropped from a Kenney spritesheet, scaled up
// with crisp pixels. Reusable for Truth, the player, NPCs, enemies, items.
//
// Kenney roguelike sheets use 16px tiles with 1px spacing (17px stride).

interface KenneySpriteProps {
    sheet: string;       // public path to the spritesheet
    sheetW: number;      // sheet width in px
    sheetH: number;      // sheet height in px
    col: number;         // tile column
    row: number;         // tile row
    tile?: number;       // tile size (default 16)
    stride?: number;     // tile + spacing (default 17)
    scale?: number;      // display scale factor
    className?: string;
    style?: CSSProperties;
}

export default function KenneySprite({
    sheet,
    sheetW,
    sheetH,
    col,
    row,
    tile = 16,
    stride = 17,
    scale = 12,
    className,
    style,
}: KenneySpriteProps) {
    return (
        <div
            className={className}
            role="img"
            style={{
                width: tile * scale,
                height: tile * scale,
                backgroundImage: `url(${sheet})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `-${col * stride * scale}px -${row * stride * scale}px`,
                backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
                imageRendering: 'pixelated',
                ...style,
            }}
        />
    );
}

// The roguelike character sheet, and Truth's chosen tile.
export const ROGUELIKE_CHAR = { sheet: '/assets/kenney/roguelikeChar.png', sheetW: 918, sheetH: 203 };
export const TRUTH_TILE = { col: 1, row: 10 };
