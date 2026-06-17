import type { WeaponKind } from '@/lib/game/weapons';

/** Draw equipped weapon overlay on avatar canvas (world/combat). */
export function drawWeaponOverlay(
    ctx: CanvasRenderingContext2D,
    kind: WeaponKind,
    facing: 'down' | 'up' | 'left' | 'right',
    ox: number,
    oy: number,
    cell: number,
) {
    const wood = '#6b4a28';
    const metal = '#cbd5e1';
    const gold = '#fbbf24';
    const blade = '#94a3b8';

    const r = (x: number, y: number, w: number, h: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * cell, oy + y * cell, w * cell, h * cell);
    };

    if (kind === 'staff') {
        if (facing === 'left' || facing === 'right') {
            r(2, 12, 1, 8, wood);
            r(1, 11, 2, 2, gold);
        } else if (facing === 'up') {
            r(7, 14, 2, 6, wood);
        } else {
            r(12, 10, 2, 10, wood);
            r(12, 9, 2, 2, gold);
        }
    } else if (kind === 'blade') {
        if (facing === 'left') {
            r(1, 11, 2, 6, wood);
            r(0, 10, 1, 4, blade);
        } else if (facing === 'right') {
            r(13, 11, 2, 6, wood);
            r(15, 10, 1, 4, blade);
        } else if (facing === 'up') {
            r(6, 13, 4, 1, blade);
        } else {
            r(11, 11, 2, 7, wood);
            r(13, 10, 1, 5, blade);
        }
    } else {
        // sword
        if (facing === 'left') {
            r(1, 10, 2, 7, wood);
            r(0, 9, 1, 5, metal);
            r(0, 8, 1, 1, gold);
        } else if (facing === 'right') {
            r(13, 10, 2, 7, wood);
            r(15, 9, 1, 5, metal);
            r(15, 8, 1, 1, gold);
        } else if (facing === 'up') {
            r(6, 12, 4, 2, metal);
        } else {
            r(11, 10, 2, 8, wood);
            r(13, 9, 1, 6, metal);
            r(13, 8, 1, 1, gold);
        }
    }
}