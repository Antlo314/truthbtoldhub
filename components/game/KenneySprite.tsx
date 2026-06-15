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

// Selectable player forms from the same sheet (Truth's tile c1/r10 is reserved).
export interface CharOption { col: number; row: number; gender: Gender; }
export type Gender = 'male' | 'female';

export const CHARACTER_OPTIONS: CharOption[] = [
    { col: 0, row: 5, gender: 'female' },
    { col: 1, row: 5, gender: 'female' },
    { col: 0, row: 10, gender: 'female' },
    { col: 0, row: 6, gender: 'male' },
    { col: 1, row: 6, gender: 'male' },
    { col: 0, row: 7, gender: 'male' },
    { col: 1, row: 7, gender: 'male' },
    { col: 0, row: 8, gender: 'male' },
    { col: 1, row: 8, gender: 'male' },
    { col: 0, row: 9, gender: 'male' },
    { col: 1, row: 9, gender: 'male' },
    { col: 0, row: 11, gender: 'male' },
    { col: 1, row: 11, gender: 'male' },
];

// Aura glow colours (drawn behind the sprite — never tints the sprite itself).
export const AURA_OPTIONS: { name: string; color: string }[] = [
    { name: 'Gold', color: '#fbbf24' },
    { name: 'Indigo', color: '#6366f1' },
    { name: 'Violet', color: '#a855f7' },
    { name: 'Cyan', color: '#22d3ee' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Crimson', color: '#ef4444' },
];
