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

// Selectable player forms — the full human cast from the roguelike sheet.
// (Rows 0-2 are faceless skin-tone blobs, row 3 is goblins/enemies, and
//  c1/r10 is Truth — all reserved. Rows 5-11 cols 0-1 are the real avatars.)
// Each figure carries its own skin tone, hair, and clothing baked in, so a
// "form" is a whole look. `gender` is just a default identity hint — the
// creator shows every form to everyone.
export type Gender = 'male' | 'female';
export interface CharOption { col: number; row: number; label: string; gender: Gender; }

export const CHARACTER_OPTIONS: CharOption[] = [
    { col: 0, row: 5, label: 'Seeker', gender: 'female' },   // blonde braid, ember top
    { col: 1, row: 5, label: 'Matron', gender: 'female' },   // silver hair, teal robe
    { col: 1, row: 7, label: 'Weaver', gender: 'female' },   // braided, laced bodice
    { col: 0, row: 9, label: 'Ember', gender: 'female' },    // long auburn hair
    { col: 0, row: 10, label: 'Oracle', gender: 'female' },  // red hair, teal veil
    { col: 0, row: 6, label: 'Wanderer', gender: 'male' },   // bare-shouldered traveller
    { col: 1, row: 6, label: 'Warden', gender: 'male' },     // dark skin, black beard
    { col: 0, row: 7, label: 'Pilgrim', gender: 'male' },    // plain grey tunic
    { col: 0, row: 8, label: 'Monk', gender: 'male' },       // topknot, belted robe
    { col: 1, row: 8, label: 'Ascetic', gender: 'male' },    // fair hair, plain wrap
    { col: 1, row: 9, label: 'Nomad', gender: 'male' },      // deep skin, earthen cloak
    { col: 0, row: 11, label: 'Sage', gender: 'male' },      // white-bearded, grey robe
    { col: 1, row: 11, label: 'Elder', gender: 'male' },     // white-bearded, pale robe
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
