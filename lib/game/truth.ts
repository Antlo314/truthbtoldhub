import { AV_W, AV_H, type Facing } from '@/lib/game/avatar';

// ============================================================
//  TRUTH — bespoke full-body pixel character (16×24).
//  Hooded African American mystic sage with goatee and gold-trimmed robe.
//  Same dimensions as the player avatar so he reads as a person
//  in the world, not a floating head.
// ============================================================

const SKIN = '#7a4a22';
const SKIN_SH = '#523015';
const HAIR = '#1b1b1f';
const ROBE = '#1a1610';
const ROBE_SH = '#100e0a';
const HOOD = '#2a2218';
const HOOD_SH = '#1a1610';
const GOLD = '#d4a017';
const GOLD_SH = '#b9882e';
const EYE = '#2a2030';
const BOOT = '#2b2b30';

function emptyGrid(): (string | null)[][] {
    return Array.from({ length: AV_H }, () => Array<string | null>(AV_W).fill(null));
}

function rect(g: (string | null)[][], x: number, y: number, w: number, h: number, c: string) {
    for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
            if (yy >= 0 && yy < AV_H && xx >= 0 && xx < AV_W) g[yy][xx] = c;
        }
    }
}

function px(g: (string | null)[][], x: number, y: number, c: string) {
    if (y >= 0 && y < AV_H && x >= 0 && x < AV_W) g[y][x] = c;
}

function buildTruthFront(): (string | null)[][] {
    const g = emptyGrid();

    // Robe — wide, floor-length
    rect(g, 4, 11, 8, 11, ROBE);
    rect(g, 5, 10, 6, 12, ROBE);
    rect(g, 4, 19, 2, 3, ROBE_SH);
    rect(g, 10, 19, 2, 3, ROBE_SH);
    rect(g, 6, 20, 4, 2, ROBE_SH);

    // Gold trim on robe hem + vertical accents
    rect(g, 5, 21, 6, 1, GOLD_SH);
    px(g, 4, 12, GOLD); px(g, 4, 15, GOLD); px(g, 4, 18, GOLD);
    px(g, 11, 12, GOLD); px(g, 11, 15, GOLD); px(g, 11, 18, GOLD);
    rect(g, 5, 15, 6, 1, GOLD);

    // Sleeves + hands
    rect(g, 3, 11, 2, 6, ROBE);
    rect(g, 11, 11, 2, 6, ROBE);
    px(g, 3, 16, SKIN); px(g, 12, 16, SKIN);

    // Boots peeking below robe
    rect(g, 5, 22, 2, 2, BOOT);
    rect(g, 9, 22, 2, 2, BOOT);

    // Neck + collar
    rect(g, 7, 9, 2, 2, SKIN);
    rect(g, 5, 10, 6, 1, GOLD);

    // Face
    rect(g, 6, 5, 4, 4, SKIN);
    px(g, 5, 6, SKIN); px(g, 10, 6, SKIN);
    px(g, 6, 6, EYE); px(g, 9, 6, EYE);
    px(g, 7, 7, SKIN_SH);
    px(g, 7, 8, HAIR); px(g, 8, 8, HAIR);
    px(g, 7, 9, HAIR); px(g, 8, 9, HAIR);

    // Hood framing the face
    rect(g, 4, 0, 8, 3, HOOD_SH);
    rect(g, 3, 2, 10, 4, HOOD);
    rect(g, 4, 1, 8, 2, HOOD);
    px(g, 3, 5, HOOD); px(g, 12, 5, HOOD);
    px(g, 4, 5, HOOD); px(g, 11, 5, HOOD);
    rect(g, 5, 4, 6, 1, HOOD_SH);
    rect(g, 4, 9, 8, 1, GOLD);
    px(g, 3, 8, GOLD); px(g, 12, 8, GOLD);

    return g;
}

function buildTruthBack(): (string | null)[][] {
    const g = emptyGrid();
    rect(g, 4, 10, 8, 12, ROBE);
    rect(g, 5, 9, 6, 13, ROBE);
    rect(g, 4, 20, 2, 2, ROBE_SH);
    rect(g, 10, 20, 2, 2, ROBE_SH);
    rect(g, 5, 21, 6, 1, GOLD_SH);
    rect(g, 4, 0, 8, 10, HOOD);
    rect(g, 3, 1, 10, 9, HOOD);
    rect(g, 5, 0, 6, 3, HOOD_SH);
    rect(g, 3, 11, 2, 5, ROBE);
    rect(g, 11, 11, 2, 5, ROBE);
    rect(g, 5, 22, 2, 2, BOOT);
    rect(g, 9, 22, 2, 2, BOOT);
    return g;
}

function buildTruthProfile(): (string | null)[][] {
    const g = emptyGrid();
    rect(g, 5, 10, 6, 12, ROBE);
    rect(g, 4, 11, 2, 6, ROBE);
    rect(g, 5, 20, 4, 2, ROBE_SH);
    rect(g, 5, 15, 5, 1, GOLD);
    px(g, 4, 16, SKIN);
    rect(g, 6, 9, 2, 2, SKIN);
    rect(g, 6, 5, 4, 4, SKIN);
    px(g, 5, 6, EYE);
    px(g, 5, 8, HAIR); px(g, 5, 9, HAIR);
    rect(g, 5, 1, 6, 8, HOOD);
    rect(g, 4, 0, 7, 3, HOOD_SH);
    rect(g, 5, 9, 5, 1, GOLD);
    rect(g, 5, 22, 2, 2, BOOT);
    rect(g, 8, 22, 2, 2, BOOT);
    return g;
}

export function buildTruthPixels(_step = 0, dir: Facing = 'down'): (string | null)[][] {
    if (dir === 'right') return buildTruthPixels(_step, 'left').map((row) => [...row].reverse());
    if (dir === 'up') return buildTruthBack();
    if (dir === 'left') return buildTruthProfile();
    return buildTruthFront();
}

export function truthOffscreen(step = 0, dir: Facing = 'down'): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = AV_W;
    c.height = AV_H;
    const ctx = c.getContext('2d')!;
    const grid = buildTruthPixels(step, dir);
    for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        for (let x = 0; x < row.length; x++) {
            const col = row[x];
            if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    return c;
}