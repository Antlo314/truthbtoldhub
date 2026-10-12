/**
 * Arcade sprite skins — Kenney CC0 sprites (public/assets/kenney, pulled by
 * scripts/fetch-kenney-2d.mjs), tinted per colour and cached.
 *
 * Every getter returns null until its image has decoded, and the games fall
 * back to their old procedural drawing when it does — a skin is an upgrade,
 * never a loading screen. Nothing here touches game state: it is render-only,
 * which keeps Veil's deterministic simulation deterministic.
 *
 * Two tints:
 *   'shade' — multiply, for the glossy grey tiles: keeps the bevel lighting
 *   'glow'  — recolour, for the white particle sprites: drawn additively
 */

const BASE = '/assets/kenney';

export const SPRITE_URL = {
    block: `${BASE}/puzzle-pack-2/block.png`,
    diamond: `${BASE}/puzzle-pack-2/diamond.png`,
    gem: `${BASE}/puzzle-pack-2/gem.png`,
    star: `${BASE}/puzzle-pack-2/star.png`,
    star4: `${BASE}/puzzle-pack-2/star4.png`,
    orb: `${BASE}/puzzle-pack-2/orb.png`,
    heart: `${BASE}/puzzle-pack-2/heart.png`,
    coin: `${BASE}/puzzle-pack-2/coin.png`,
    ship: `${BASE}/simple-space/ship.png`,
    sparkle: `${BASE}/particle-pack/sparkle.png`,
    glint: `${BASE}/particle-pack/glint.png`,
    nova: `${BASE}/particle-pack/nova.png`,
    glow: `${BASE}/particle-pack/glow.png`,
    ring: `${BASE}/particle-pack/ring.png`,
    rune: `${BASE}/particle-pack/rune.png`,
    burst: `${BASE}/particle-pack/burst.png`,
    bolt: `${BASE}/particle-pack/bolt.png`,
    arc: `${BASE}/particle-pack/arc.png`,
    halo: `${BASE}/particle-pack/halo.png`,
    smoke: `${BASE}/particle-pack/smoke.png`,
    flare: `${BASE}/particle-pack/flare.png`,
} as const;

export type SpriteName = keyof typeof SPRITE_URL;

const images = new Map<SpriteName, HTMLImageElement>();
const tints = new Map<string, HTMLCanvasElement>();
let started = false;

/** Start decoding every sprite. Safe to call repeatedly; cheap after the first. */
export function loadArcadeSprites() {
    if (started || typeof window === 'undefined') return;
    started = true;
    for (const name of Object.keys(SPRITE_URL) as SpriteName[]) {
        const img = new Image();
        img.decoding = 'async';
        img.src = SPRITE_URL[name];
        images.set(name, img);
    }
}

function ready(name: SpriteName): HTMLImageElement | null {
    const img = images.get(name);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** The raw sprite, or null while it loads */
export function sprite(name: SpriteName): HTMLImageElement | null {
    if (!started) loadArcadeSprites();
    return ready(name);
}

/**
 * A tinted copy at a pixel size (DPR included by the caller), or null while
 * the source loads. Cached per (sprite, colour, size, mode) — sizes are
 * rounded so a resizing board doesn't grow the cache without bound.
 */
export function tinted(name: SpriteName, color: string, size: number, mode: 'shade' | 'glow' = 'shade'): HTMLCanvasElement | null {
    if (!started) loadArcadeSprites();
    const img = ready(name);
    if (!img) return null;
    const px = Math.max(4, Math.round(size / 2) * 2);
    const key = `${name}|${color}|${px}|${mode}`;
    const hit = tints.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, px, px);
    if (mode === 'shade') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, px, px);
        // multiply paints the transparent margin too — cut back to the sprite's own alpha
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(img, 0, 0, px, px);
    } else {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, 0, px, px);
    }
    if (tints.size > 600) tints.clear();
    tints.set(key, c);
    return c;
}

/**
 * Draw a glowing particle sprite centred at (x, y), additively.
 * Returns false (drawing nothing) while the sprite loads, so callers can
 * fall back to a plain square.
 */
export function drawGlow(
    ctx: CanvasRenderingContext2D,
    name: SpriteName,
    color: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
    rotation = 0,
): boolean {
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const t = tinted(name, color, Math.min(256, size * dpr), 'glow');
    if (!t) return false;
    const prevOp = ctx.globalCompositeOperation;
    const prevA = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    if (rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(t, -size / 2, -size / 2, size, size);
        ctx.restore();
    } else {
        ctx.drawImage(t, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalCompositeOperation = prevOp;
    ctx.globalAlpha = prevA;
    return true;
}
