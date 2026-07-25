/**
 * Free house surface skins — procedural CanvasTexture + local brand photos.
 * $0 · no paid APIs · full color / depth / spectrum under cinematic light.
 */
import * as THREE from 'three';

export type HouseSkinId =
    | 'wood'
    | 'woodDark'
    | 'woodFloor'
    | 'stone'
    | 'plaster'
    | 'plasterPurple'
    | 'rug'
    | 'fabric'
    | 'fabricLight'
    | 'leather'
    | 'metal'
    | 'metalDark'
    | 'gold'
    | 'book'
    | 'leaf'
    | 'grass'
    | 'pathStone'
    | 'dirt'
    | 'screen'
    | 'tile'
    | 'tileKitchen'
    | 'carpet'
    | 'woodFloorDark'
    | 'marble'
    | 'concrete'
    | 'artDomain'
    | 'artAsWithin'
    | 'artStillPoint'
    | 'artUnnamed'
    | 'nightGlass'
    | 'skyNight'
    | 'moon';

/**
 * Deterministic PRNG (mulberry32) for scatter placement — stable across
 * renders so instanced props never jump between frames/mounts.
 */
export function seededRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a += 0x6d2b79f5;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type SkinOpts = { repeat?: [number, number]; low?: boolean };

const cache = new Map<string, THREE.Texture>();

function canvasTex(
    key: string,
    size: number,
    paint: (ctx: CanvasRenderingContext2D, s: number) => void,
    repeat: [number, number] = [1, 1],
): THREE.CanvasTexture {
    const ck = `${key}_${size}_${repeat[0]}x${repeat[1]}`;
    const hit = cache.get(ck);
    if (hit) return hit as THREE.CanvasTexture;

    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    paint(ctx, size);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    cache.set(ck, tex);
    return tex;
}

/* ───────────────────────────── painting primitives ─────────────────────────
 * Shared building blocks. Everything below is seam-aware: features that land
 * near a canvas edge are re-drawn on the opposite edge so the maps stay
 * tileable at any repeat, and detail counts scale with the canvas size so the
 * `low` (192px) mobile pass stays cheap.
 * ──────────────────────────────────────────────────────────────────────────*/

type RGB = readonly [number, number, number];

const rgb = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c: RGB, a: number): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Multiply a tone; `warm` pushes red up / blue down for wood + candlelight. */
function shade(c: RGB, k: number, warm = 0): RGB {
    return [c[0] * k + warm, c[1] * k, c[2] * k - warm] as const;
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as const;
}

/** 1 at the full 512 canvas, ~0.375 on the low-detail 192 canvas. */
function detail(s: number): number {
    return s / 512;
}

/** Per-texel feature count (specks, pores) — density stays constant across res. */
function areaCount(s: number, nAt512: number): number {
    const k = detail(s);
    return Math.max(4, Math.round(nAt512 * k * k));
}

/** Linear feature count (courses, planks, threads). */
function lineCount(s: number, nAt512: number): number {
    return Math.max(2, Math.round(nAt512 * detail(s)));
}

/**
 * Draw a feature of radius `r` at (x,y) plus every wrapped copy it overlaps,
 * so blobs/knots/pebbles are never cut in half at the tile seam.
 */
function wrapped(s: number, x: number, y: number, r: number, draw: (px: number, py: number) => void): void {
    const xs: number[] = [x];
    const ys: number[] = [y];
    if (x < r) xs.push(x + s);
    if (x > s - r) xs.push(x - s);
    if (y < r) ys.push(y + s);
    if (y > s - r) ys.push(y - s);
    for (let i = 0; i < xs.length; i++) {
        for (let j = 0; j < ys.length; j++) draw(xs[i], ys[j]);
    }
}

/** Reused low-res buffer for the mottling pass (see `mottle`). */
let scratchCanvas: HTMLCanvasElement | null = null;

function getScratch(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const cv = scratchCanvas ?? document.createElement('canvas');
    scratchCanvas = cv;
    if (cv.width !== n || cv.height !== n) {
        cv.width = n;
        cv.height = n;
    }
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, n, n);
    return [cv, c];
}

/**
 * Soft low-frequency blotches — what keeps large spans from reading uniform.
 * These are pure gradients, so they are composed on a small buffer and scaled
 * up: a full-canvas blob costs ~6% of what it would drawn at native size, and
 * the result is identical to the eye.
 */
function mottle(
    ctx: CanvasRenderingContext2D,
    s: number,
    rnd: () => number,
    count: number,
    radius: readonly [number, number],
    colors: readonly RGB[],
    alpha: readonly [number, number],
): void {
    const n = Math.min(s, 128);
    const k = n / s;
    const buf = getScratch(n);
    const sc = buf[1];
    for (let i = 0; i < count; i++) {
        const r = Math.max(1, (radius[0] + rnd() * (radius[1] - radius[0])) * k);
        const x = rnd() * n;
        const y = rnd() * n;
        const col = colors[Math.floor(rnd() * colors.length) % colors.length];
        const a = alpha[0] + rnd() * (alpha[1] - alpha[0]);
        wrapped(n, x, y, r, (px, py) => {
            const g = sc.createRadialGradient(px, py, r * 0.05, px, py, r);
            g.addColorStop(0, rgba(col, a));
            g.addColorStop(0.6, rgba(col, a * 0.42));
            g.addColorStop(1, rgba(col, 0));
            sc.fillStyle = g;
            sc.fillRect(px - r, py - r, r * 2, r * 2);
        });
    }
    ctx.drawImage(buf[0], 0, 0, s, s);
}

/**
 * Quantised light/dark fill styles. Building a fresh `rgba()` string per speck
 * dominates the cost of the noise passes (millions of chars parsed by the CSS
 * colour parser); eight alpha steps are indistinguishable in noise and let the
 * canvas reuse parsed colours.
 */
function gritPalette(light: RGB, dark: RGB, alpha: number): string[] {
    const pal: string[] = [];
    for (let i = 0; i < 8; i++) {
        const a = alpha * (0.3 + (i / 7) * 1.05);
        pal.push(rgba(light, a));
        pal.push(rgba(dark, a));
    }
    return pal;
}

/** Fine grit / tooth — the micro-contrast that stops a surface looking flat. */
function grit(
    ctx: CanvasRenderingContext2D,
    s: number,
    rnd: () => number,
    count: number,
    light: RGB,
    dark: RGB,
    maxW = 2,
    maxH = 2,
    alpha = 0.09,
): void {
    const pal = gritPalette(light, dark, alpha);
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = pal[Math.floor(rnd() * pal.length) % pal.length];
        ctx.fillRect(rnd() * s, rnd() * s, 1 + rnd() * maxW, 1 + rnd() * maxH);
    }
}

/**
 * Rect-scoped grit — used inside a clipped plank/block, where canvas-wide
 * scatter would throw away nearly every speck. Coordinates are relative to the
 * rect, so a feature drawn twice for seam wrapping lands identically in both.
 */
function gritIn(
    ctx: CanvasRenderingContext2D,
    rnd: () => number,
    x: number,
    y: number,
    w: number,
    h: number,
    count: number,
    light: RGB,
    dark: RGB,
    maxW = 2,
    maxH = 2,
    alpha = 0.09,
): void {
    const pal = gritPalette(light, dark, alpha);
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = pal[Math.floor(rnd() * pal.length) % pal.length];
        ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * maxW, 1 + rnd() * maxH);
    }
}

/** Rect-scoped soft blotches (see `mottle`, but bounded to a plank/block). */
function mottleIn(
    ctx: CanvasRenderingContext2D,
    rnd: () => number,
    x: number,
    y: number,
    w: number,
    h: number,
    count: number,
    radius: readonly [number, number],
    colors: readonly RGB[],
    alpha: readonly [number, number],
): void {
    for (let i = 0; i < count; i++) {
        const r = radius[0] + rnd() * (radius[1] - radius[0]);
        const px = x + rnd() * w;
        const py = y + rnd() * h;
        const col = colors[Math.floor(rnd() * colors.length) % colors.length];
        const g = ctx.createRadialGradient(px, py, r * 0.05, px, py, r);
        g.addColorStop(0, rgba(col, alpha[0] + rnd() * (alpha[1] - alpha[0])));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
}

/**
 * Seam-safe wobble: a sum of integer-frequency sines over `period`, so
 * f(0) === f(period). Grain arcs, marble veins and mortar lines all ride on
 * this to survive tiling.
 */
function waveFn(rnd: () => number, period: number, amps: readonly number[]): (t: number) => number {
    const ph: number[] = [];
    for (let i = 0; i < amps.length; i++) ph.push(rnd() * Math.PI * 2);
    return (t: number) => {
        let v = 0;
        for (let i = 0; i < amps.length; i++) {
            v += amps[i] * Math.sin((2 * Math.PI * (i + 1) * t) / period + ph[i]);
        }
        return v;
    };
}

/** Split `total` into `n` jittered spans that still sum to exactly `total`. */
function spans(rnd: () => number, total: number, n: number, jitter: number): number[] {
    const w: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const v = 1 - jitter + rnd() * jitter * 2;
        w.push(v);
        sum += v;
    }
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((w[i] / sum) * total);
    return out;
}

/* ──────────────────────────────────── wood ────────────────────────────────*/

type WoodTone = { base: RGB; grain: RGB; light: RGB; deep: RGB };

const WOOD: Record<'wall' | 'wallDark' | 'floor' | 'floorDark', WoodTone> = {
    wall: { base: [74, 52, 32], grain: [107, 74, 46], light: [142, 102, 66], deep: [32, 21, 12] },
    wallDark: { base: [26, 16, 10], grain: [44, 28, 17], light: [72, 50, 30], deep: [11, 6, 3] },
    floor: { base: [58, 40, 24], grain: [92, 64, 40], light: [132, 98, 60], deep: [18, 12, 6] },
    floorDark: { base: [37, 23, 15], grain: [63, 41, 26], light: [101, 68, 42], deep: [12, 8, 4] },
};

/**
 * Flat-sawn cathedral figure into the rect (x0,y0,w,h). The arc shape is built
 * from integer-frequency sines over `w` plus a few "peaks" that pull nearby
 * rings into nested arcs — that nesting is what separates real timber from
 * striped noise. Because the shape is periodic over `w`, a plank that straddles
 * the tile seam matches its wrapped copy exactly.
 */
function woodGrain(
    ctx: CanvasRenderingContext2D,
    rnd: () => number,
    t: WoodTone,
    x0: number,
    y0: number,
    w: number,
    h: number,
    rings: number,
): void {
    const wob = waveFn(rnd, w, [h * 0.05, h * 0.028, h * 0.014]);
    const nPeaks = 1 + Math.floor(rnd() * 3);
    const peaks: { x: number; y: number; hgt: number; sig: number; span: number }[] = [];
    for (let i = 0; i < nPeaks; i++) {
        peaks.push({
            x: rnd() * w,
            y: rnd() * h,
            hgt: (0.14 + rnd() * 0.36) * h * (rnd() > 0.5 ? 1 : -1),
            sig: w * (0.045 + rnd() * 0.1),
            span: h * (0.16 + rnd() * 0.3),
        });
    }
    const step = Math.max(3, w / 24);
    for (let i = 0; i < rings; i++) {
        const yb = ((i + 0.5) / rings) * h;
        const late = rnd() > 0.74; // dense latewood band
        const tone = mixRgb(t.grain, late ? t.deep : t.light, rnd() * (late ? 0.6 : 0.8));
        ctx.strokeStyle = rgba(tone, late ? 0.2 + rnd() * 0.2 : 0.08 + rnd() * 0.13);
        ctx.lineWidth = late ? 1.1 + rnd() * 1.2 : 0.6 + rnd() * 0.7;
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
            const xx = x > w ? w : x;
            let dy = wob(xx) * (0.22 + (i % 5) * 0.05);
            for (let p = 0; p < peaks.length; p++) {
                const pk = peaks[p];
                let dx = Math.abs(xx - pk.x);
                if (dx > w / 2) dx = w - dx; // wrapped distance keeps it periodic
                dy +=
                    pk.hgt *
                    Math.exp(-(dx * dx) / (2 * pk.sig * pk.sig)) *
                    Math.exp(-Math.abs(yb - pk.y) / pk.span);
            }
            const px = x0 + xx;
            const py = y0 + yb + dy;
            if (x === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    // Open pores — short dashes lying along the grain
    const pores = Math.max(10, Math.round((w * h) / 460));
    for (let i = 0; i < pores; i++) {
        ctx.fillStyle = rgba(rnd() > 0.72 ? t.light : t.deep, 0.05 + rnd() * 0.11);
        ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, 2 + rnd() * 6, rnd() > 0.85 ? 2 : 1);
    }
}

/** Knot: dark core, concentric rings, soft halo of disturbed grain. */
function woodKnot(ctx: CanvasRenderingContext2D, rnd: () => number, t: WoodTone, cx: number, cy: number, r: number): void {
    const squash = 0.5 + rnd() * 0.35;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rnd() * Math.PI);
    const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.6);
    halo.addColorStop(0, rgba(t.deep, 0.45));
    halo.addColorStop(1, rgba(t.deep, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
    for (let i = 6; i >= 1; i--) {
        const rr = (i / 6) * r;
        ctx.strokeStyle = rgba(i % 2 === 0 ? t.deep : t.grain, 0.22 + rnd() * 0.3);
        ctx.lineWidth = 0.7 + rnd() * 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.62);
    core.addColorStop(0, rgba(shade(t.deep, 0.55), 0.92));
    core.addColorStop(1, rgba(t.deep, 0.08));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.62, r * 0.62 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Wall / furniture timber — two jointed boards per tile so the seam reads as a joint. */
function paintWood(ctx: CanvasRenderingContext2D, s: number, dark = false) {
    const rnd = seededRng(dark ? 60217 : 41103);
    const t = dark ? WOOD.wallDark : WOOD.wall;
    const boards = 2;
    const bh = s / boards;
    ctx.fillStyle = rgb(t.deep);
    ctx.fillRect(0, 0, s, s);

    for (let b = 0; b < boards; b++) {
        const y0 = b * bh;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y0 + 1, s, bh - 2);
        ctx.clip();
        const base = shade(t.base, 0.86 + rnd() * 0.3, (rnd() - 0.5) * 8);
        ctx.fillStyle = rgb(base);
        ctx.fillRect(0, y0 - 1, s, bh + 2);
        mottle(
            ctx,
            s,
            rnd,
            lineCount(s, 6),
            [s * 0.16, s * 0.4],
            [shade(base, 1.28), shade(base, 0.74)],
            [0.05, 0.13],
        );
        woodGrain(ctx, rnd, t, 0, y0, s, bh, Math.max(12, Math.round(bh / 7)));
        if (rnd() > 0.3) {
            const kx = rnd() * s;
            const ky = y0 + bh * (0.25 + rnd() * 0.5);
            const kr = s * (0.012 + rnd() * 0.022);
            const kSeed = 1 + Math.floor(rnd() * 0xffffff);
            // Wrapped, and re-seeded per copy so both halves of a seam knot match
            wrapped(s, kx, ky, kr * 2.6, (px, py) => woodKnot(ctx, seededRng(kSeed), t, px, py, kr));
        }
        // Cross-panel sheen so light rakes along the board
        const sh = ctx.createLinearGradient(0, y0, 0, y0 + bh);
        sh.addColorStop(0, rgba(t.light, 0.07));
        sh.addColorStop(0.45, rgba(t.light, 0.015));
        sh.addColorStop(1, rgba(t.deep, 0.1));
        ctx.fillStyle = sh;
        ctx.fillRect(0, y0, s, bh);
        ctx.restore();
    }

    // Board joints (the one at y=0 doubles as cover for the tile seam)
    for (let b = 0; b <= boards; b++) {
        const y = b * bh;
        ctx.fillStyle = rgba(t.deep, 0.75);
        ctx.fillRect(0, y - 1, s, 2);
        ctx.fillStyle = rgba(t.light, 0.09);
        ctx.fillRect(0, y + 1, s, 1);
    }
    // Micro scratches + dust settled in the grain
    grit(ctx, s, rnd, areaCount(s, 260), t.light, t.deep, 3, 1, 0.1);
}

/**
 * Real plank floor: rows of varied height, boards of varied length with
 * staggered end joints, per-board tone + grain + bevel, dark seams between.
 * Rows are normalised to sum to exactly `s` and boards wrap across the seam,
 * so the whole layout tiles at any repeat.
 */
function paintPlankFloor(ctx: CanvasRenderingContext2D, s: number, dark = false) {
    const t = dark ? WOOD.floorDark : WOOD.floor;
    const rnd = seededRng(dark ? 77431 : 19073);

    // Seam / sub-floor colour shows through the gaps between boards
    ctx.fillStyle = rgb(shade(t.deep, 0.8));
    ctx.fillRect(0, 0, s, s);

    // Plank count is resolution-independent — `low` drops texel detail, not the
    // size a board reads at on the floor.
    const rows = 5;
    const heights = spans(rnd, s, rows, 0.24);
    const gap = Math.max(1, s / 300);
    let y = 0;

    for (let r = 0; r < rows; r++) {
        const h = heights[r];
        const nPlanks = 2 + Math.floor(rnd() * 2);
        const widths = spans(rnd, s, nPlanks, 0.34);
        let x = rnd() * s; // per-row phase: this is what staggers the end joints
        for (let p = 0; p < nPlanks; p++) {
            const w = widths[p];
            const tone = 0.78 + rnd() * 0.44;
            const warm = (rnd() - 0.5) * 14;
            const gloss = 0.03 + rnd() * 0.07;
            const seed = 1 + Math.floor(rnd() * 0xffffff);
            const rings = Math.max(8, Math.round(h / 6));
            const knot = rnd() > 0.55;
            const knotAt = [rnd(), rnd()] as const;
            const knotR = h * (0.1 + rnd() * 0.13);

            const paint = (px: number) => {
                const r2 = seededRng(seed); // identical draw for both wrapped copies
                ctx.save();
                ctx.beginPath();
                ctx.rect(px + gap, y + gap, w - gap * 2, h - gap * 2);
                ctx.clip();
                const base = shade(t.base, tone, warm);
                ctx.fillStyle = rgb(base);
                ctx.fillRect(px, y, w, h);
                mottleIn(ctx, r2, px, y, w, h, 5, [h * 0.5, h * 1.3], [shade(base, 1.22), shade(base, 0.78)], [0.05, 0.12]);
                woodGrain(ctx, r2, t, px, y, w, h, rings);
                if (knot) woodKnot(ctx, r2, t, px + knotAt[0] * w, y + h * (0.2 + knotAt[1] * 0.6), knotR);
                // Chamfered edges: lit top, shadowed bottom
                const bev = ctx.createLinearGradient(0, y, 0, y + h);
                bev.addColorStop(0, rgba(t.light, 0.16));
                bev.addColorStop(0.14, rgba(t.light, 0.03));
                bev.addColorStop(0.82, rgba(t.deep, 0.06));
                bev.addColorStop(1, rgba(t.deep, 0.42));
                ctx.fillStyle = bev;
                ctx.fillRect(px, y, w, h);
                // End-grain darkening at the butt joints
                const end = ctx.createLinearGradient(px, 0, px + w, 0);
                end.addColorStop(0, rgba(t.deep, 0.4));
                end.addColorStop(0.06, rgba(t.deep, 0));
                end.addColorStop(0.94, rgba(t.deep, 0));
                end.addColorStop(1, rgba(t.deep, 0.4));
                ctx.fillStyle = end;
                ctx.fillRect(px, y, w, h);
                // Per-plank varnish sheen — some boards catch more light
                const vg = ctx.createLinearGradient(px, y, px + w * 0.6, y + h);
                vg.addColorStop(0, rgba([255, 232, 196], 0));
                vg.addColorStop(0.5, rgba([255, 232, 196], gloss));
                vg.addColorStop(1, rgba([255, 232, 196], 0));
                ctx.fillStyle = vg;
                ctx.fillRect(px, y, w, h);
                ctx.restore();
            };

            const sx = x % s;
            paint(sx);
            if (sx + w > s) paint(sx - s);
            x += w;
        }
        y += h;
    }

    // Traffic wear, spill shadow and settled dust across the whole floor
    mottle(
        ctx,
        s,
        rnd,
        lineCount(s, 7),
        [s * 0.14, s * 0.4],
        [shade(t.deep, 1.1), [255, 226, 186], shade(t.base, 1.3)],
        [0.03, 0.075],
    );
    grit(ctx, s, rnd, areaCount(s, 420), t.light, t.deep, 2, 1, 0.09);
}

/* ─────────────────────────────────── masonry ──────────────────────────────*/

type MasonryCfg = {
    seed: number;
    mortar: RGB;
    block: RGB;
    accent: RGB;
    courses: number;
    blocks: number;
    joint: number;
    chip: number;
    tone: number;
    round: number;
    moss: number;
};

/**
 * Irregular coursed masonry: jittered course heights and block widths (both
 * normalised to sum to `s`, so it tiles), recessed mortar, per-block tone,
 * chipped edges, lit top / shadowed underside, speckle and grime.
 * Drives both the wall `stone` and the outdoor `pathStone`.
 */
function paintMasonry(ctx: CanvasRenderingContext2D, s: number, cfg: MasonryCfg) {
    const rnd = seededRng(cfg.seed);
    const joint = Math.max(1, cfg.joint * detail(s));

    // Mortar bed with its own sandy tooth
    ctx.fillStyle = rgb(cfg.mortar);
    ctx.fillRect(0, 0, s, s);
    grit(ctx, s, rnd, areaCount(s, 2600), shade(cfg.mortar, 1.5), shade(cfg.mortar, 0.5), 2, 2, 0.16);

    // Layout counts stay resolution-independent: the `low` pass drops texel
    // detail, it must not change how big a stone reads on the wall.
    const courses = cfg.courses;
    const heights = spans(rnd, s, courses, 0.22);
    let y = 0;

    for (let c = 0; c < courses; c++) {
        const h = heights[c];
        const n = cfg.blocks + Math.floor(rnd() * 2);
        const widths = spans(rnd, s, n, 0.34);
        let x = rnd() * s;
        for (let i = 0; i < n; i++) {
            const w = widths[i];
            const seed = 1 + Math.floor(rnd() * 0xffffff);
            const tone = 1 - cfg.tone + rnd() * cfg.tone * 2;
            const hue = rnd();

            const paint = (px: number) => {
                const r2 = seededRng(seed);
                const bx = px + joint;
                const by = y + joint;
                const bw = w - joint * 2;
                const bh = h - joint * 2;
                if (bw <= 2 || bh <= 2) return;

                // Chipped, slightly irregular outline
                const pts: number[][] = [];
                const chip = cfg.chip * detail(s);
                const edge = (ax: number, ay: number, tx: number, ty: number) => {
                    for (let k = 0; k < 3; k++) {
                        const tt = k / 3;
                        pts.push([
                            ax + (tx - ax) * tt + (r2() - 0.5) * chip,
                            ay + (ty - ay) * tt + (r2() - 0.5) * chip,
                        ]);
                    }
                };
                edge(bx, by, bx + bw, by);
                edge(bx + bw, by, bx + bw, by + bh);
                edge(bx + bw, by + bh, bx, by + bh);
                edge(bx, by + bh, bx, by);

                ctx.beginPath();
                if (cfg.round > 0) {
                    const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    const m0 = mid(pts[pts.length - 1], pts[0]);
                    ctx.moveTo(m0[0], m0[1]);
                    for (let k = 0; k < pts.length; k++) {
                        const cur = pts[k];
                        const nxt = pts[(k + 1) % pts.length];
                        const m = mid(cur, nxt);
                        ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
                    }
                } else {
                    ctx.moveTo(pts[0][0], pts[0][1]);
                    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
                }
                ctx.closePath();

                const face = mixRgb(shade(cfg.block, tone), cfg.accent, hue * 0.35);
                const g = ctx.createLinearGradient(bx, by, bx, by + bh);
                g.addColorStop(0, rgb(shade(face, 1.14)));
                g.addColorStop(0.55, rgb(face));
                g.addColorStop(1, rgb(shade(face, 0.8)));
                ctx.fillStyle = g;
                ctx.fill();

                ctx.save();
                ctx.clip();
                // Grain, pitting and the odd hairline crack
                gritIn(ctx, r2, bx, by, bw, bh, Math.max(12, Math.round((bw * bh) / 26)), shade(face, 1.45), shade(face, 0.45), 3, 2, 0.2);
                const pits = Math.max(2, Math.round((bw * bh) / 900));
                for (let k = 0; k < pits; k++) {
                    const cxp = bx + r2() * bw;
                    const cyp = by + r2() * bh;
                    const pr = 1 + r2() * 3 * detail(s) * 2;
                    const pg = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, pr);
                    pg.addColorStop(0, rgba(shade(cfg.mortar, 0.55), 0.5));
                    pg.addColorStop(1, rgba(cfg.mortar, 0));
                    ctx.fillStyle = pg;
                    ctx.fillRect(cxp - pr, cyp - pr, pr * 2, pr * 2);
                }
                if (r2() > 0.55) {
                    ctx.strokeStyle = rgba(shade(face, 0.4), 0.35);
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    let cxp = bx + r2() * bw;
                    let cyp = by;
                    ctx.moveTo(cxp, cyp);
                    while (cyp < by + bh) {
                        cxp += (r2() - 0.5) * bw * 0.22;
                        cyp += bh * 0.22;
                        ctx.lineTo(cxp, cyp);
                    }
                    ctx.stroke();
                }
                // Lit top edge / shadowed underside for fake relief
                ctx.strokeStyle = rgba(shade(face, 1.7), 0.34);
                ctx.lineWidth = Math.max(1, joint * 0.8);
                ctx.beginPath();
                ctx.moveTo(bx, by + 0.5);
                ctx.lineTo(bx + bw, by + 0.5);
                ctx.stroke();
                ctx.strokeStyle = rgba(shade(cfg.mortar, 0.35), 0.5);
                ctx.beginPath();
                ctx.moveTo(bx, by + bh - 0.5);
                ctx.lineTo(bx + bw, by + bh - 0.5);
                ctx.stroke();
                ctx.restore();
            };

            const sx = x % s;
            paint(sx);
            if (sx + w > s) paint(sx - s);
            x += w;
        }
        y += h;
    }

    // Moss / damp creeping out of the joints
    if (cfg.moss > 0) {
        const blobs = lineCount(s, Math.round(14 * cfg.moss));
        for (let i = 0; i < blobs; i++) {
            const r = s * (0.015 + rnd() * 0.05);
            wrapped(s, rnd() * s, rnd() * s, r, (px, py) => {
                const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0, rgba([46, 68, 34], 0.28 * cfg.moss));
                g.addColorStop(1, rgba([30, 48, 26], 0));
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            });
        }
    }
    // Broad grime / weathering so the wall isn't uniform across big spans
    mottle(
        ctx,
        s,
        rnd,
        lineCount(s, 8),
        [s * 0.12, s * 0.36],
        [shade(cfg.mortar, 0.5), shade(cfg.block, 1.25)],
        [0.03, 0.085],
    );
}

function paintStone(ctx: CanvasRenderingContext2D, s: number) {
    paintMasonry(ctx, s, {
        seed: 33017,
        mortar: [30, 30, 36],
        block: [50, 54, 64],
        accent: [64, 60, 58],
        courses: 5,
        blocks: 3,
        joint: 3,
        chip: 4,
        tone: 0.24,
        round: 0,
        moss: 0,
    });
}

/**
 * Hand-floated plaster: skim-coat mottling at three scales, trowel sweeps,
 * a fine stucco tooth and the odd pinhole/hairline crack.
 *
 * Note: no per-tile vignette — the wall repeats 5×3.5, so any corner-darkening
 * would print as a visible grid. The same "don't look uniform" job is done by
 * wrapped low-frequency mottling instead, which carries across the seams.
 */
function paintPlaster(ctx: CanvasRenderingContext2D, s: number, purple = false) {
    const rnd = seededRng(purple ? 51829 : 27311);
    const base: RGB = purple ? [46, 40, 56] : [58, 52, 44];
    const warm: RGB = purple ? [72, 58, 92] : [86, 76, 60];
    const cool: RGB = purple ? [34, 30, 48] : [40, 36, 30];

    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, s, s);

    // Broad skim-coat unevenness (large → medium → small)
    mottle(ctx, s, rnd, lineCount(s, 5), [s * 0.3, s * 0.6], [warm, cool], [0.05, 0.11]);
    mottle(ctx, s, rnd, lineCount(s, 14), [s * 0.1, s * 0.26], [warm, cool], [0.035, 0.08]);
    mottle(ctx, s, rnd, lineCount(s, 30), [s * 0.03, s * 0.09], [shade(warm, 1.1), cool], [0.02, 0.055]);

    // Trowel sweeps — long shallow arcs left by the float
    const sweeps = lineCount(s, 16);
    for (let i = 0; i < sweeps; i++) {
        const r = s * (0.25 + rnd() * 0.7);
        const cx = rnd() * s;
        const cy = rnd() * s;
        const a0 = rnd() * Math.PI * 2;
        const lw = s * (0.01 + rnd() * 0.035);
        const light = rnd() > 0.5;
        const stroke = rgba(light ? shade(warm, 1.12) : cool, 0.03 + rnd() * 0.045);
        const a1 = a0 + 0.5 + rnd() * 1.1;
        wrapped(s, cx, cy, r + lw, (px, py) => {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.arc(px, py, r, a0, a1);
            ctx.stroke();
        });
    }

    // Fine tooth — the sand in the finish coat
    grit(ctx, s, rnd, areaCount(s, 6500), shade(warm, 1.25), shade(cool, 0.7), 3, 2, 0.075);

    // Pinholes: a dark pit with a lit upper rim reads as real relief
    const holes = areaCount(s, 420);
    for (let i = 0; i < holes; i++) {
        const x = rnd() * s;
        const y = rnd() * s;
        const r = 0.7 + rnd() * 1.6;
        ctx.fillStyle = rgba(shade(cool, 0.55), 0.16 + rnd() * 0.24);
        ctx.fillRect(x, y, r, r);
        ctx.fillStyle = rgba(shade(warm, 1.35), 0.1 + rnd() * 0.14);
        ctx.fillRect(x, y - 1, r, 1);
    }

    // Hairline settlement cracks — tapered, and wrapped so they cross the seam
    const cracks = lineCount(s, 6);
    for (let c = 0; c < cracks; c++) {
        const x0 = rnd() * s;
        const y0 = rnd() * s;
        const len = s * (0.08 + rnd() * 0.3);
        const steps = 8;
        // Walk the crack once, then replay the same walk on every wrapped copy
        const walk: number[][] = [];
        let a = rnd() * Math.PI * 2;
        let wx = 0;
        let wy = 0;
        for (let i = 0; i < steps; i++) {
            wx += Math.cos(a) * (len / steps);
            wy += Math.sin(a) * (len / steps);
            walk.push([wx, wy]);
            a += (rnd() - 0.5) * 0.9;
        }
        wrapped(s, x0, y0, len, (px, py) => {
            let x = px;
            let y = py;
            for (let i = 0; i < steps; i++) {
                const nx = px + walk[i][0];
                const ny = py + walk[i][1];
                ctx.strokeStyle = rgba(shade(cool, 0.45), 0.26 * (1 - i / steps) + 0.05);
                ctx.lineWidth = 1.1 * (1 - i / steps) + 0.3;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(nx, ny);
                ctx.stroke();
                x = nx;
                y = ny;
            }
        });
    }
}

function paintRug(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(77141);
    // Deep burgundy field
    ctx.fillStyle = '#3c1a14';
    ctx.fillRect(0, 0, s, s);
    // Abrash — the horizontal dye-lot banding of a hand-knotted rug.
    // Wrapped in y so the bands read continuously across the tile seam.
    const bands = lineCount(s, 7);
    for (let i = 0; i < bands; i++) {
        const hh = s * (0.03 + rnd() * 0.07);
        const cy = rnd() * s;
        const col: RGB = rnd() > 0.5 ? [148, 74, 52] : [34, 12, 10];
        const a = 0.035 + rnd() * 0.05;
        wrapped(s, s / 2, cy, hh, (px, py) => {
            const g = ctx.createLinearGradient(0, py - hh, 0, py + hh);
            g.addColorStop(0, rgba(col, 0));
            g.addColorStop(0.5, rgba(col, a));
            g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, py - hh, s, hh * 2);
        });
    }
    // Pile mottling
    mottle(ctx, s, rnd, lineCount(s, 10), [s * 0.08, s * 0.28], [[176, 104, 70], [26, 8, 8]], [0.03, 0.07]);
    // Diagonal field lattice (clipped to the inner field)
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
    ctx.clip();
    ctx.strokeStyle = 'rgba(140,60,40,0.5)';
    ctx.lineWidth = 1.2;
    for (let i = -10; i <= 10; i++) {
        const o = i * (s / 10);
        ctx.beginPath();
        ctx.moveTo(o, 0);
        ctx.lineTo(o + s, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(o + s, 0);
        ctx.lineTo(o, s);
        ctx.stroke();
    }
    ctx.restore();
    // Triple border — gold band, violet inlay, fine gold rule
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = s * 0.035;
    ctx.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
    ctx.strokeStyle = '#6d5aa8';
    ctx.lineWidth = s * 0.014;
    ctx.strokeRect(s * 0.095, s * 0.095, s * 0.81, s * 0.81);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = s * 0.008;
    ctx.strokeRect(s * 0.13, s * 0.13, s * 0.74, s * 0.74);
    // Border guls — small diamonds marching along the band
    ctx.fillStyle = 'rgba(201,162,39,0.8)';
    const step = s / 9;
    for (let i = 1; i < 9; i++) {
        for (const [gx, gy] of [
            [i * step, s * 0.075],
            [i * step, s * 0.925],
            [s * 0.075, i * step],
            [s * 0.925, i * step],
        ] as const) {
            ctx.beginPath();
            ctx.moveTo(gx, gy - s * 0.012);
            ctx.lineTo(gx + s * 0.012, gy);
            ctx.lineTo(gx, gy + s * 0.012);
            ctx.lineTo(gx - s * 0.012, gy);
            ctx.closePath();
            ctx.fill();
        }
    }
    // Center medallion — dark halo, petal ring, concentric rings, gold heart
    const cx = s / 2;
    const cy = s / 2;
    const halo = ctx.createRadialGradient(cx, cy, s * 0.02, cx, cy, s * 0.24);
    halo.addColorStop(0, 'rgba(38,16,12,0.95)');
    halo.addColorStop(1, 'rgba(38,16,12,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - s * 0.25, cy - s * 0.25, s * 0.5, s * 0.5);
    ctx.fillStyle = 'rgba(201,162,39,0.55)';
    for (let p = 0; p < 8; p++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((p / 8) * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.13, s * 0.028, s * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = s * 0.01;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.155, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#8a6fc8';
    ctx.lineWidth = s * 0.006;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.085, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2a120e';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(201,162,39,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.018, 0, Math.PI * 2);
    ctx.fill();
    // Corner quarter-rosettes
    ctx.strokeStyle = 'rgba(201,162,39,0.6)';
    ctx.lineWidth = s * 0.008;
    for (const [ox, oy] of [
        [s * 0.15, s * 0.15],
        [s * 0.85, s * 0.15],
        [s * 0.15, s * 0.85],
        [s * 0.85, s * 0.85],
    ] as const) {
        for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(ox, oy, r * s * 0.03, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    // Knotted pile: individual tufts catching light at slightly different angles
    const tufts = areaCount(s, 8000);
    const tuftPal: string[] = [];
    for (let i = 0; i < 6; i++) {
        const a = 0.05 + (i / 5) * 0.13;
        tuftPal.push(rgba([214, 158, 112], a), rgba([126, 58, 40], a), rgba([18, 6, 6], a));
    }
    for (let i = 0; i < tufts; i++) {
        ctx.fillStyle = tuftPal[Math.floor(rnd() * tuftPal.length) % tuftPal.length];
        ctx.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 1.6, 1 + rnd() * 1.2);
    }
    // Pile lay — fine rows of shadow between knot courses
    for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(0,0,0,${0.02 + (y % 4) * 0.006})`;
        ctx.fillRect(0, y, s, 1);
    }
    // Worn / crushed patches where feet land
    mottle(ctx, s, rnd, lineCount(s, 5), [s * 0.06, s * 0.2], [[228, 196, 158], [12, 4, 4]], [0.025, 0.055]);
}

/**
 * Upholstery plain weave. The interlace is built once as a 2×2-thread unit
 * cell and stamped with createPattern — exact, seamless (the unit divides the
 * canvas), and effectively free compared with per-cell drawing.
 */
function paintFabric(ctx: CanvasRenderingContext2D, s: number, light = false) {
    const rnd = seededRng(light ? 33911 : 77173);
    const base: RGB = light ? [42, 34, 60] : [26, 20, 38];
    const warpC: RGB = light ? [104, 90, 142] : [62, 48, 90];
    const weftC: RGB = light ? [84, 74, 122] : [46, 36, 70];

    // Thread pitch — pick one whose 2-thread unit divides the canvas exactly
    let p = 4;
    for (const cand of [4, 3, 2]) {
        if (s % (cand * 2) === 0) {
            p = cand;
            break;
        }
    }

    const unit = document.createElement('canvas');
    unit.width = p * 2;
    unit.height = p * 2;
    const uc = unit.getContext('2d')!;
    uc.fillStyle = rgb(shade(base, 0.7));
    uc.fillRect(0, 0, p * 2, p * 2);

    /**
     * One thread crossing cell (i,j). Across its width it reads as a round
     * cord (dark edge → highlight → shade); along its length it darkens at
     * both cell boundaries, where it dips under the thread it crosses.
     */
    const strip = (c: RGB, i: number, j: number, vertical: boolean) => {
        const x = vertical ? i * p : 0;
        const y = vertical ? 0 : j * p;
        const w = vertical ? p : p * 2;
        const h = vertical ? p * 2 : p;
        const g = vertical ? uc.createLinearGradient(x, 0, x + p, 0) : uc.createLinearGradient(0, y, 0, y + p);
        g.addColorStop(0, rgb(shade(c, 0.42)));
        g.addColorStop(0.34, rgb(shade(c, 1.16)));
        g.addColorStop(0.62, rgb(c));
        g.addColorStop(1, rgb(shade(c, 0.38)));
        uc.fillStyle = g;
        uc.fillRect(x, y, w, h);
        const d = vertical
            ? uc.createLinearGradient(0, j * p, 0, j * p + p)
            : uc.createLinearGradient(i * p, 0, i * p + p, 0);
        d.addColorStop(0, rgba([0, 0, 0], 0.34));
        d.addColorStop(0.5, rgba([0, 0, 0], 0));
        d.addColorStop(1, rgba([0, 0, 0], 0.34));
        uc.fillStyle = d;
        uc.fillRect(i * p, j * p, p, p);
    };

    for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
            uc.save();
            uc.beginPath();
            uc.rect(i * p, j * p, p, p);
            uc.clip();
            if ((i + j) % 2 === 0) {
                strip(weftC, i, j, false);
                strip(warpC, i, j, true);
            } else {
                strip(warpC, i, j, true);
                strip(weftC, i, j, false);
            }
            uc.restore();
        }
    }
    const pat = ctx.createPattern(unit, 'repeat');
    ctx.fillStyle = pat !== null ? pat : rgb(base);
    ctx.fillRect(0, 0, s, s);

    // Slubs — the odd fat thread in the run
    const slubs = lineCount(s, 26);
    for (let i = 0; i < slubs; i++) {
        const vertical = rnd() > 0.5;
        const at = Math.floor(rnd() * (s / p)) * p;
        const len = s * (0.1 + rnd() * 0.5);
        const off = rnd() * s;
        ctx.fillStyle = rgba(rnd() > 0.5 ? shade(warpC, 1.3) : shade(base, 0.6), 0.1 + rnd() * 0.14);
        if (vertical) ctx.fillRect(at, off, p * 0.7, len);
        else ctx.fillRect(off, at, len, p * 0.7);
        // wrap the overhang back to the other edge
        if (off + len > s) {
            if (vertical) ctx.fillRect(at, off - s, p * 0.7, len);
            else ctx.fillRect(off - s, at, len, p * 0.7);
        }
    }

    // Nap, dye variation and worn patches where hands and backs rest
    mottle(ctx, s, rnd, lineCount(s, 12), [s * 0.06, s * 0.24], [shade(warpC, 1.5), shade(base, 0.5)], [0.03, 0.09]);
    grit(ctx, s, rnd, areaCount(s, 2400), shade(warpC, 1.6), [0, 0, 0], 2, 1, 0.07);
}

function paintLeather(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(48803);
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 800; i++) {
        const v = 30 + rnd() * 40;
        ctx.fillStyle = `rgba(${v + 20},${v},${v - 10},${0.06 + rnd() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(rnd() * s, rnd() * s, 2 + rnd() * 8, 1 + rnd() * 4, rnd(), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    for (let c = 0; c < 10; c++) {
        ctx.beginPath();
        ctx.moveTo(rnd() * s, rnd() * s);
        ctx.quadraticCurveTo(rnd() * s, rnd() * s, rnd() * s, rnd() * s);
        ctx.stroke();
    }
}

function paintMetal(ctx: CanvasRenderingContext2D, s: number, dark = false) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    if (dark) {
        g.addColorStop(0, '#1a1a22');
        g.addColorStop(0.5, '#2e2e38');
        g.addColorStop(1, '#18181f');
    } else {
        g.addColorStop(0, '#4a4a55');
        g.addColorStop(0.45, '#8a8a98');
        g.addColorStop(1, '#3a3a48');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const rnd = seededRng(dark ? 22409 : 11887);
    // Brushed grain — full-width strokes, so it stays seamless left/right
    for (let i = 0; i < s; i += 1) {
        const v = rnd();
        ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.012 + v * 0.05})` : `rgba(0,0,0,${0.02 + (1 - v) * 0.06})`;
        ctx.fillRect(0, i, s, 1);
    }
    // Broken brush passes that stop mid-plate
    const passes = lineCount(s, 120);
    for (let k = 0; k < passes; k++) {
        const y = rnd() * s;
        const x = rnd() * s;
        const w = s * (0.08 + rnd() * 0.5);
        ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.02 + rnd() * 0.05})` : `rgba(0,0,0,${0.03 + rnd() * 0.07})`;
        ctx.fillRect(x, y, w, 1);
        if (x + w > s) ctx.fillRect(x - s, y, w, 1);
    }
    // Soft reflectance blotches so the plate isn't a flat gradient
    mottle(
        ctx,
        s,
        rnd,
        lineCount(s, 7),
        [s * 0.16, s * 0.44],
        [[255, 255, 255], [0, 0, 0]],
        [0.02, 0.06],
    );
    // Scuffs and pitting
    const scuffs = lineCount(s, 30);
    for (let k = 0; k < scuffs; k++) {
        ctx.fillStyle = `rgba(0,0,0,${0.06 + rnd() * 0.1})`;
        ctx.fillRect(rnd() * s, rnd() * s, 6 + rnd() * 26, 1);
        ctx.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.08})`;
        ctx.fillRect(rnd() * s, rnd() * s, 3 + rnd() * 12, 1);
    }
}

function paintGold(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#8a6010');
    g.addColorStop(0.35, '#fbbf24');
    g.addColorStop(0.55, '#fde68a');
    g.addColorStop(1, '#b45309');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const rnd = seededRng(15749);
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,220,${0.05 + rnd() * 0.1})`;
        ctx.fillRect(rnd() * s, rnd() * s, 20, 1 + rnd() * 2);
    }
}

function paintBook(ctx: CanvasRenderingContext2D, s: number) {
    const hues = [
        ['#3a2040', '#5a3060'],
        ['#1a3048', '#2a5068'],
        ['#4a2018', '#6a3020'],
        ['#1e3a2f', '#2a5040'],
        ['#2a2a48', '#3a3a68'],
    ];
    const [a, b] = hues[Math.floor(seededRng(2609)() * hues.length)];
    const g = ctx.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // spine bands
    ctx.fillStyle = 'rgba(251,191,36,0.35)';
    ctx.fillRect(0, s * 0.2, s, 3);
    ctx.fillRect(0, s * 0.75, s, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, s * 0.08, s);
}

function paintLeaf(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(70123);
    ctx.fillStyle = '#0f2a18';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
        const x = rnd() * s;
        const y = rnd() * s;
        const r = 8 + rnd() * 22;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, `rgba(${20 + rnd() * 40},${80 + rnd() * 80},${30 + rnd() * 40},0.7)`);
        g.addColorStop(1, 'rgba(10,40,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintScreen(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(34211);
    ctx.fillStyle = '#020814';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(34,211,238,${0.03 + (y % 6) * 0.01})`;
        ctx.fillRect(0, y, s, 1);
    }
    // soft glow blotches
    for (let i = 0; i < 8; i++) {
        const x = rnd() * s;
        const y = rnd() * s;
        const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
        g.addColorStop(0, 'rgba(34,211,238,0.25)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 30, y - 30, 60, 60);
    }
}

type TileCfg = {
    seed: number;
    grout: RGB;
    face: RGB;
    accent: RGB;
    n: number;
    joint: number;
    tone: number;
    fleck: number;
    veins: number;
    sheen: number;
};

/**
 * Glazed / stone floor tile. `n` divides the canvas exactly and every tile is
 * inset by half a joint, so the grout at the tile seam is the same width as an
 * interior joint — the grid stays true at any repeat.
 */
function paintTileFloor(ctx: CanvasRenderingContext2D, s: number, cfg: TileCfg) {
    const rnd = seededRng(cfg.seed);
    const n = cfg.n;
    const tw = s / n;
    const half = Math.max(0.75, (cfg.joint * detail(s)) / 2);

    // Sanded grout bed
    ctx.fillStyle = rgb(cfg.grout);
    ctx.fillRect(0, 0, s, s);
    grit(ctx, s, rnd, areaCount(s, 3000), shade(cfg.grout, 1.45), shade(cfg.grout, 0.55), 2, 2, 0.2);

    for (let ty = 0; ty < n; ty++) {
        for (let tx = 0; tx < n; tx++) {
            const x = tx * tw + half;
            const y = ty * tw + half;
            const w = tw - half * 2;
            const h = tw - half * 2;
            const face = mixRgb(shade(cfg.face, 1 - cfg.tone + rnd() * cfg.tone * 2), cfg.accent, rnd() * 0.4);

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            // Body: fired tiles are never flat — light drifts across the face
            const g = ctx.createLinearGradient(x, y, x + w, y + h);
            g.addColorStop(0, rgb(shade(face, 1.1)));
            g.addColorStop(0.55, rgb(face));
            g.addColorStop(1, rgb(shade(face, 0.86)));
            ctx.fillStyle = g;
            ctx.fillRect(x, y, w, h);
            mottleIn(ctx, rnd, x, y, w, h, 4, [w * 0.2, w * 0.6], [shade(face, 1.2), shade(face, 0.8)], [0.03, 0.09]);

            // Stone flecks / glaze speckle
            if (cfg.fleck > 0) {
                gritIn(
                    ctx,
                    rnd,
                    x,
                    y,
                    w,
                    h,
                    Math.round(((w * h) / 40) * cfg.fleck),
                    shade(cfg.accent, 1.5),
                    shade(cfg.grout, 0.7),
                    2,
                    2,
                    0.16,
                );
            }
            // Faint quarry veining
            for (let v = 0; v < cfg.veins; v++) {
                ctx.strokeStyle = rgba(rnd() > 0.5 ? shade(cfg.accent, 1.35) : shade(cfg.grout, 0.8), 0.06 + rnd() * 0.1);
                ctx.lineWidth = 0.6 + rnd() * 1.4;
                ctx.beginPath();
                let vx = x + rnd() * w;
                let vy = y;
                ctx.moveTo(vx, vy);
                while (vy < y + h) {
                    vx += (rnd() - 0.5) * w * 0.5;
                    vy += h * 0.25;
                    ctx.lineTo(vx, vy);
                }
                ctx.stroke();
            }

            // Cushion-edge bevel: lit top-left, shadowed bottom-right
            const bev = Math.max(1, tw * 0.045);
            const lt = ctx.createLinearGradient(x, y, x + bev, y + bev);
            lt.addColorStop(0, rgba(shade(face, 1.9), 0.4));
            lt.addColorStop(1, rgba(shade(face, 1.9), 0));
            ctx.fillStyle = lt;
            ctx.fillRect(x, y, w, bev);
            ctx.fillRect(x, y, bev, h);
            const rb = ctx.createLinearGradient(x + w, y + h, x + w - bev, y + h - bev);
            rb.addColorStop(0, rgba(shade(cfg.grout, 0.5), 0.5));
            rb.addColorStop(1, rgba(shade(cfg.grout, 0.5), 0));
            ctx.fillStyle = rb;
            ctx.fillRect(x, y + h - bev, w, bev);
            ctx.fillRect(x + w - bev, y, bev, h);

            // Specular bloom — the wet look of a glazed floor
            if (cfg.sheen > 0) {
                const sx = x + w * (0.22 + rnd() * 0.2);
                const sy = y + h * (0.2 + rnd() * 0.2);
                const sr = w * (0.4 + rnd() * 0.25);
                const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
                sg.addColorStop(0, rgba([255, 250, 236], cfg.sheen));
                sg.addColorStop(1, rgba([255, 250, 236], 0));
                ctx.fillStyle = sg;
                ctx.fillRect(x, y, w, h);
            }
            ctx.restore();
        }
    }

    // Grime settling along the joints + broad wear across the floor
    ctx.strokeStyle = rgba(shade(cfg.grout, 0.55), 0.35);
    ctx.lineWidth = half * 2.4;
    for (let i = 0; i <= n; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tw, 0);
        ctx.lineTo(i * tw, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * tw);
        ctx.lineTo(s, i * tw);
        ctx.stroke();
    }
    mottle(ctx, s, rnd, lineCount(s, 6), [s * 0.14, s * 0.4], [shade(cfg.face, 1.3), shade(cfg.grout, 0.6)], [0.02, 0.06]);
}

/** Bath / utility tile — small format, cool glaze, tight dark joints. */
function paintTile(ctx: CanvasRenderingContext2D, s: number) {
    paintTileFloor(ctx, s, {
        seed: 55271,
        grout: [24, 20, 30],
        face: [46, 39, 60],
        accent: [62, 54, 82],
        n: 4,
        joint: 5,
        tone: 0.12,
        fleck: 0.5,
        veins: 1,
        sheen: 0.07,
    });
}

/** Kitchen tile — large format warm stone with wide sandy grout. */
function paintTileKitchen(ctx: CanvasRenderingContext2D, s: number) {
    paintTileFloor(ctx, s, {
        seed: 91613,
        grout: [66, 55, 42],
        face: [98, 85, 68],
        accent: [126, 110, 86],
        n: 2,
        joint: 9,
        tone: 0.16,
        fleck: 1,
        veins: 3,
        sheen: 0.05,
    });
}

/** Poured concrete — aggregate, form lines with tie holes, pour stains, pitting. */
function paintConcrete(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(60649);
    const base: RGB = [44, 42, 50];
    const light: RGB = [86, 84, 94];
    const dark: RGB = [22, 21, 27];

    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, s, s);

    // Pour variation — panels never cure to one flat tone
    mottle(ctx, s, rnd, lineCount(s, 6), [s * 0.25, s * 0.55], [shade(light, 0.85), dark], [0.05, 0.11]);
    mottle(ctx, s, rnd, lineCount(s, 18), [s * 0.06, s * 0.2], [light, dark], [0.025, 0.07]);

    // Exposed aggregate: fine sand plus the odd larger stone
    grit(ctx, s, rnd, areaCount(s, 5200), light, dark, 2, 2, 0.1);
    const stones = areaCount(s, 220);
    for (let i = 0; i < stones; i++) {
        const r = 1 + rnd() * 3.2 * detail(s) * 2;
        const x = rnd() * s;
        const y = rnd() * s;
        const tone = mixRgb(light, base, rnd());
        wrapped(s, x, y, r + 1, (px, py) => {
            ctx.fillStyle = rgba(tone, 0.28);
            ctx.beginPath();
            ctx.ellipse(px, py, r, r * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(dark, 0.22);
            ctx.fillRect(px - r * 0.4, py + r * 0.4, r, 1);
        });
    }

    // Air pockets — dark pit with a lit upper lip
    const pits = areaCount(s, 700);
    for (let i = 0; i < pits; i++) {
        const x = rnd() * s;
        const y = rnd() * s;
        const r = 0.8 + rnd() * 2;
        ctx.fillStyle = rgba(dark, 0.3 + rnd() * 0.3);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(light, 0.14 + rnd() * 0.16);
        ctx.fillRect(x - r, y - r - 0.5, r * 2, 1);
    }

    // Formwork: panel joints at 0 and mid-canvas so the lines tile
    const formLine = (horizontal: boolean, at: number) => {
        ctx.fillStyle = rgba(dark, 0.5);
        if (horizontal) ctx.fillRect(0, at - 1, s, 2);
        else ctx.fillRect(at - 1, 0, 2, s);
        ctx.fillStyle = rgba(light, 0.12);
        if (horizontal) ctx.fillRect(0, at + 1, s, 1);
        else ctx.fillRect(at + 1, 0, 1, s);
    };
    // Both halves of the edge line are drawn so the seam joint matches the
    // interior one in width once the texture repeats.
    formLine(true, 0);
    formLine(true, s / 2);
    formLine(true, s);
    formLine(false, 0);
    formLine(false, s / 2);
    formLine(false, s);

    // Tie holes with the rust streak running below them
    const ties = lineCount(s, 6);
    for (let i = 0; i < ties; i++) {
        const x = (Math.floor(rnd() * 4) + 0.5) * (s / 4);
        const y = rnd() > 0.5 ? s / 2 : 0;
        const r = 2.2 * detail(s) * 2;
        wrapped(s, x, y, r * 8, (px, py) => {
            const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
            g.addColorStop(0, rgba(dark, 0.75));
            g.addColorStop(1, rgba(dark, 0));
            ctx.fillStyle = g;
            ctx.fillRect(px - r * 2, py - r * 2, r * 4, r * 4);
            const st = ctx.createLinearGradient(0, py, 0, py + r * 8);
            st.addColorStop(0, rgba([92, 60, 40], 0.22));
            st.addColorStop(1, rgba([92, 60, 40], 0));
            ctx.fillStyle = st;
            ctx.fillRect(px - r, py, r * 2, r * 8);
        });
    }

    // Damp / efflorescence staining
    mottle(ctx, s, rnd, lineCount(s, 5), [s * 0.1, s * 0.3], [[168, 168, 176], [18, 20, 26]], [0.02, 0.055]);
}

/** Lawn — clumped growth, dry and lush patches, individual leaning blades. */
function paintGrass(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(12007);
    const soil: RGB = [22, 18, 12];
    ctx.fillStyle = '#0c1a10';
    ctx.fillRect(0, 0, s, s);

    // Clumping: lush, dry and shaded areas at two scales
    mottle(
        ctx,
        s,
        rnd,
        lineCount(s, 16),
        [s * 0.1, s * 0.34],
        [[26, 74, 34], [64, 78, 30], [6, 18, 10]],
        [0.14, 0.3],
    );
    mottle(
        ctx,
        s,
        rnd,
        lineCount(s, 40),
        [s * 0.03, s * 0.11],
        [[34, 96, 42], [78, 88, 36], [5, 14, 8], soil],
        [0.1, 0.26],
    );

    // Blades, batched into colour buckets so thousands cost only a few strokes
    const buckets = 8;
    const perBucket = Math.round(areaCount(s, 3200) / buckets);
    const len = 3 + 3 * detail(s) * 2;
    for (let b = 0; b < buckets; b++) {
        const t = b / (buckets - 1);
        const col = mixRgb(mixRgb([16, 52, 22], [96, 150, 58], t), [110, 118, 48], t > 0.8 ? 0.5 : 0);
        ctx.strokeStyle = rgba(col, 0.16 + t * 0.3);
        ctx.lineWidth = t > 0.7 ? 1.4 : 1;
        ctx.beginPath();
        for (let i = 0; i < perBucket; i++) {
            const x = rnd() * s;
            const y = rnd() * s;
            const lean = (rnd() - 0.5) * 1.6;
            const l = len * (0.55 + rnd());
            ctx.moveTo(x, y);
            ctx.lineTo(x + lean * l * 0.5, y - l);
        }
        ctx.stroke();
    }
    // Dew / tip highlights catching the moon
    const tips = areaCount(s, 500);
    for (let i = 0; i < tips; i++) {
        ctx.fillStyle = rgba([170, 210, 140], 0.06 + rnd() * 0.14);
        ctx.fillRect(rnd() * s, rnd() * s, 1, 1 + rnd());
    }
    // Bare soil showing through the thin spots
    mottle(ctx, s, rnd, lineCount(s, 7), [s * 0.02, s * 0.07], [soil, [40, 30, 18]], [0.12, 0.26]);
}

/** Garden path — rounded flagstones bedded in gritty sand, moss in the joints. */
function paintPathStone(ctx: CanvasRenderingContext2D, s: number) {
    paintMasonry(ctx, s, {
        seed: 40917,
        mortar: [32, 28, 24],
        block: [56, 53, 58],
        accent: [74, 66, 54],
        courses: 4,
        blocks: 3,
        joint: 5,
        chip: 9,
        tone: 0.26,
        round: 1,
        moss: 1,
    });
}

/** Bare earth — damp and dry patches, embedded pebbles, grit and dry cracks. */
function paintDirt(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(80231);
    const base: RGB = [30, 21, 14];
    const dry: RGB = [76, 58, 38];
    const damp: RGB = [16, 11, 8];

    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, s, s);
    mottle(ctx, s, rnd, lineCount(s, 10), [s * 0.14, s * 0.4], [dry, damp], [0.08, 0.2]);
    mottle(ctx, s, rnd, lineCount(s, 26), [s * 0.04, s * 0.13], [shade(dry, 1.1), damp, [52, 44, 26]], [0.05, 0.14]);

    // Clods and grit
    grit(ctx, s, rnd, areaCount(s, 5200), dry, damp, 3, 2, 0.13);

    // Pebbles pressed into the surface — lit crown, shadow underneath
    const pebbles = areaCount(s, 260);
    for (let i = 0; i < pebbles; i++) {
        const r = 1.2 + rnd() * 3.4 * detail(s) * 2;
        const x = rnd() * s;
        const y = rnd() * s;
        const tone = mixRgb([92, 84, 74], base, rnd() * 0.7);
        const rot = rnd() * Math.PI;
        wrapped(s, x, y, r + 2, (px, py) => {
            ctx.fillStyle = rgba(shade(damp, 0.8), 0.35);
            ctx.beginPath();
            ctx.ellipse(px, py + r * 0.35, r * 1.05, r * 0.7, rot, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(tone, 0.5);
            ctx.beginPath();
            ctx.ellipse(px, py, r, r * 0.72, rot, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(shade(tone, 1.5), 0.3);
            ctx.beginPath();
            ctx.ellipse(px - r * 0.25, py - r * 0.25, r * 0.4, r * 0.28, rot, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Dry cracks — seam-safe, riding an integer-frequency wobble
    const cracks = lineCount(s, 4);
    for (let c = 0; c < cracks; c++) {
        const wob = waveFn(rnd, s, [s * 0.06, s * 0.03, s * 0.015]);
        const y0 = rnd() * s;
        // Rise across the tile must be 0 or ±s, or the crack won't meet itself
        const slope = [0, 1, -1][Math.floor(rnd() * 3)];
        ctx.strokeStyle = rgba(shade(damp, 0.6), 0.3 + rnd() * 0.2);
        ctx.lineWidth = 0.8 + rnd() * 1.4;
        for (let dy = -s; dy <= s; dy += s) {
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
                const x = (i / 24) * s;
                const y = y0 + dy + slope * x + wob(x);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    // Fine dust settling on top
    grit(ctx, s, rnd, areaCount(s, 2600), [96, 82, 62], [10, 7, 5], 2, 1, 0.07);
}

/**
 * Bedroom carpet — dense cut pile. Thousands of short fibres in random
 * directions, batched into colour buckets, over soft crush/shading blotches.
 */
function paintCarpet(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(64513);
    const base: RGB = [62, 54, 62];
    const light: RGB = [116, 104, 116];
    const dark: RGB = [28, 24, 30];
    const fleck: RGB = [138, 118, 148];

    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, s, s);
    // Uneven pile lay — the soft cloudiness a carpet always has
    mottle(ctx, s, rnd, lineCount(s, 9), [s * 0.16, s * 0.44], [light, dark], [0.05, 0.12]);
    mottle(ctx, s, rnd, lineCount(s, 24), [s * 0.05, s * 0.16], [light, dark], [0.03, 0.08]);

    // Fibre pass
    const buckets = 10;
    const perBucket = Math.round(areaCount(s, 11000) / buckets);
    for (let b = 0; b < buckets; b++) {
        const t = b / (buckets - 1);
        const col = b === buckets - 1 ? fleck : mixRgb(dark, light, t);
        ctx.strokeStyle = rgba(col, 0.1 + t * 0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < perBucket; i++) {
            const x = rnd() * s;
            const y = rnd() * s;
            const a = rnd() * Math.PI * 2;
            const l = 1.4 + rnd() * 2.6 * detail(s) * 2;
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
        ctx.stroke();
    }
    // Tufted rows — the faint regular grid a tufted carpet is built on
    const pitch = Math.max(3, Math.round(6 * detail(s)));
    for (let y = 0; y < s; y += pitch) {
        ctx.fillStyle = rgba(dark, 0.05);
        ctx.fillRect(0, y, s, 1);
    }
    grit(ctx, s, rnd, areaCount(s, 2200), light, dark, 1, 1, 0.07);
}

/**
 * Marble slab — cloudy ground with veins that run edge to edge. Vein paths use
 * integer-frequency sines and a slope of 0 or ±1, so every vein leaves one edge
 * exactly where it re-enters the opposite one and the slab tiles cleanly.
 */
function paintMarble(ctx: CanvasRenderingContext2D, s: number) {
    const rnd = seededRng(30011);
    const base: RGB = [138, 134, 136];
    const pale: RGB = [178, 175, 172];
    const shadow: RGB = [96, 93, 98];
    const veinDark: RGB = [52, 48, 54];
    const veinWarm: RGB = [122, 104, 82];

    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, s, s);
    // Cloudy ground
    mottle(ctx, s, rnd, lineCount(s, 8), [s * 0.22, s * 0.5], [pale, shadow], [0.14, 0.3]);
    mottle(ctx, s, rnd, lineCount(s, 20), [s * 0.07, s * 0.2], [pale, shadow], [0.06, 0.16]);

    const vein = (slope: number, thick: number, col: RGB, alpha: number, branch: boolean) => {
        const wob = waveFn(rnd, s, [s * 0.09, s * 0.045, s * 0.02, s * 0.01]);
        const y0 = rnd() * s;
        const steps = Math.max(24, Math.round(56 * detail(s)));
        const at = (x: number) => y0 + slope * x + wob(x);
        const branches: number[][] = [];
        if (branch) {
            const n = 2 + Math.floor(rnd() * 4);
            for (let i = 0; i < n; i++) branches.push([rnd(), (rnd() - 0.5) * s * 0.18, rnd() * 0.5 + 0.15]);
        }
        const pass = (dy: number) => {
            // wide diffusion → mid body → sharp core
            for (let layer = 0; layer < 3; layer++) {
                ctx.strokeStyle = rgba(col, alpha * [0.28, 0.55, 1][layer]);
                ctx.lineWidth = thick * [4.5, 1.8, 0.6][layer];
                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const x = (i / steps) * s;
                    const y = at(x) + dy;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            for (let b = 0; b < branches.length; b++) {
                const bx = branches[b][0] * s;
                const rise = branches[b][1];
                const run = branches[b][2] * s * 0.4;
                ctx.strokeStyle = rgba(col, alpha * 0.5);
                ctx.lineWidth = thick * 0.8;
                ctx.beginPath();
                ctx.moveTo(bx, at(bx) + dy);
                ctx.quadraticCurveTo(bx + run * 0.5, at(bx) + dy + rise * 0.4, bx + run, at(bx) + dy + rise);
                ctx.stroke();
            }
        };
        for (let dy = -s; dy <= s; dy += s) pass(dy);
    };

    const majors = Math.max(2, lineCount(s, 3));
    for (let i = 0; i < majors; i++) {
        vein(i % 2 === 0 ? 1 : -1, 1.6, rnd() > 0.65 ? veinWarm : veinDark, 0.3 + rnd() * 0.2, true);
    }
    vein(0, 1.2, veinDark, 0.22, true);
    const minors = Math.max(3, lineCount(s, 7));
    for (let i = 0; i < minors; i++) {
        vein(i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : -1, 0.5, rnd() > 0.5 ? veinWarm : shadow, 0.1 + rnd() * 0.12, false);
    }

    // Polish: fine crystal sparkle plus a soft bloom, no directional streak
    // (a directional highlight would print the tile grid across the floor)
    grit(ctx, s, rnd, areaCount(s, 3000), [232, 230, 228], shadow, 2, 1, 0.07);
    mottle(ctx, s, rnd, lineCount(s, 6), [s * 0.1, s * 0.3], [[255, 253, 248]], [0.03, 0.07]);
}

/** Stylized door brand plate */
function paintDomain(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#0c0a14');
    g.addColorStop(0.5, '#1a1430');
    g.addColorStop(1, '#0a0812');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // soft gold ring
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = s * 0.018;
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.42, s * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(167,139,250,0.35)';
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.42, s * 0.16, 0.2, Math.PI * 1.7);
    ctx.stroke();
    // inner glyph — simple eye / vesica hint
    ctx.fillStyle = 'rgba(251,191,36,0.25)';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.42, s * 0.1, s * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(34,211,238,0.5)';
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.42, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // wordmark
    ctx.fillStyle = '#f5e6c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.floor(s * 0.07)}px Georgia, "Times New Roman", serif`;
    ctx.fillText('truthbtoldhub.com', s / 2, s * 0.72);
    ctx.fillStyle = 'rgba(167,139,250,0.7)';
    ctx.font = `${Math.floor(s * 0.04)}px Georgia, serif`;
    ctx.fillText('THE HOUSE OF TRUTH', s / 2, s * 0.82);
    // corner ornaments
    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
    ctx.lineWidth = 1.5;
    for (const [ox, oy] of [
        [0.08, 0.08],
        [0.92, 0.08],
        [0.08, 0.92],
        [0.92, 0.92],
    ] as const) {
        ctx.beginPath();
        ctx.moveTo(ox * s, oy * s + (oy < 0.5 ? s * 0.08 : -s * 0.08));
        ctx.lineTo(ox * s, oy * s);
        ctx.lineTo(ox * s + (ox < 0.5 ? s * 0.08 : -s * 0.08), oy * s);
        ctx.stroke();
    }
}

function paintEsoteric(
    ctx: CanvasRenderingContext2D,
    s: number,
    line1: string,
    line2: string,
    hue: 'violet' | 'gold' | 'teal',
) {
    const bg =
        hue === 'violet'
            ? ['#120e1c', '#1e1630', '#0e0a18']
            : hue === 'gold'
              ? ['#14100c', '#241a10', '#0e0a08']
              : ['#0a1214', '#0e1e22', '#081012'];
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, bg[0]);
    g.addColorStop(0.55, bg[1]);
    g.addColorStop(1, bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // parchment noise
    const rnd = seededRng(hue === 'violet' ? 9041 : hue === 'gold' ? 9042 : 9043);
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.01 + rnd() * 0.03})`;
        ctx.fillRect(rnd() * s, rnd() * s, 1, 1);
    }
    // frame
    const accent =
        hue === 'violet' ? 'rgba(167,139,250,0.55)' : hue === 'gold' ? 'rgba(251,191,36,0.55)' : 'rgba(34,211,238,0.5)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = s * 0.02;
    ctx.strokeRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
    ctx.lineWidth = s * 0.006;
    ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
    // center symbol
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.36, s * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.22);
    ctx.lineTo(s / 2, s * 0.5);
    ctx.moveTo(s * 0.38, s * 0.36);
    ctx.lineTo(s * 0.62, s * 0.36);
    ctx.stroke();
    // text
    ctx.fillStyle = '#e8dcc8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${Math.floor(s * 0.055)}px Georgia, serif`;
    ctx.fillText(line1, s / 2, s * 0.62);
    ctx.font = `italic ${Math.floor(s * 0.048)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(232,220,200,0.85)';
    ctx.fillText(line2, s / 2, s * 0.72);
}

/** Window pane at night — deep blue gradient, stars, moon glow, treeline */
function paintNightGlass(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#0a1030');
    g.addColorStop(0.45, '#131a44');
    g.addColorStop(0.8, '#26224f');
    g.addColorStop(1, '#38305c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // Stars in the upper sky
    const rnd = seededRng(11213);
    for (let i = 0; i < 90; i++) {
        const x = rnd() * s;
        const y = rnd() * s * 0.72;
        const r = 0.4 + rnd() * 1.3;
        ctx.fillStyle = `rgba(226,232,255,${0.3 + rnd() * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Moon glow + disc
    const mg = ctx.createRadialGradient(s * 0.72, s * 0.2, 2, s * 0.72, s * 0.2, s * 0.3);
    mg.addColorStop(0, 'rgba(200,215,255,0.5)');
    mg.addColorStop(1, 'rgba(200,215,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(238,242,255,0.95)';
    ctx.beginPath();
    ctx.arc(s * 0.72, s * 0.2, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Silhouetted treeline along the bottom
    ctx.fillStyle = 'rgba(8,10,20,0.85)';
    for (let x = 0; x < s; x += 7) {
        const h = s * 0.06 + Math.sin(x * 0.15) * s * 0.02 + rnd() * s * 0.035;
        ctx.fillRect(x, s - h, 7, h);
    }
    // Faint glass sheen diagonal
    const sheen = ctx.createLinearGradient(0, 0, s, s);
    sheen.addColorStop(0.3, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, s, s);
}

/** Sky dome gradient — zenith→horizon band at v≈0.5, dark under-horizon */
function paintSkyNight(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#04040c');
    g.addColorStop(0.24, '#0b0a1e');
    g.addColorStop(0.4, '#181440');
    g.addColorStop(0.48, '#31255a');
    g.addColorStop(0.52, '#241c3e');
    g.addColorStop(0.6, '#151024');
    g.addColorStop(1, '#0e0a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // Nebula wisps
    const rnd = seededRng(52711);
    for (let i = 0; i < 10; i++) {
        const x = rnd() * s;
        const y = rnd() * s * 0.42;
        const rg = ctx.createRadialGradient(x, y, 2, x, y, 30 + rnd() * 60);
        rg.addColorStop(0, 'rgba(120,90,200,0.06)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, s, s);
    }
    // Stars, denser toward the zenith
    for (let i = 0; i < 240; i++) {
        const y = Math.pow(rnd(), 1.5) * s * 0.46;
        const x = rnd() * s;
        const r = 0.3 + rnd() * 1.1;
        ctx.fillStyle = `rgba(220,228,255,${0.2 + rnd() * 0.55})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Warm horizon glow band
    const hg = ctx.createLinearGradient(0, s * 0.44, 0, s * 0.54);
    hg.addColorStop(0, 'rgba(255,180,120,0)');
    hg.addColorStop(0.6, 'rgba(210,150,130,0.1)');
    hg.addColorStop(1, 'rgba(120,80,90,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, s * 0.42, s, s * 0.14);
    // Dither noise to hide gradient banding at low res
    for (let i = 0; i < 320; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.008 + rnd() * 0.014})`;
        ctx.fillRect(rnd() * s, rnd() * s, 1, 1);
    }
}

/** Moon sprite — transparent bg, halo, cratered disc */
function paintMoon(ctx: CanvasRenderingContext2D, s: number) {
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.3;
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, s * 0.5);
    halo.addColorStop(0, 'rgba(190,205,255,0.35)');
    halo.addColorStop(0.55, 'rgba(150,160,230,0.12)');
    halo.addColorStop(1, 'rgba(120,130,210,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);
    const disc = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    disc.addColorStop(0, '#fdfdff');
    disc.addColorStop(0.7, '#dbe2f8');
    disc.addColorStop(1, '#a8b2dc');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    const rnd = seededRng(19891);
    for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * r * 0.72;
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d;
        const pr = r * (0.05 + rnd() * 0.09);
        ctx.fillStyle = `rgba(140,150,190,${0.12 + rnd() * 0.15})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

/** Grayscale roughness companion for a color map (adds micro-depth under light) */
export function makeRoughnessMap(
    colorTex: THREE.Texture,
    strength = 0.65,
): THREE.CanvasTexture | THREE.Texture {
    const ck = `rough_${(colorTex as THREE.CanvasTexture).uuid || 'x'}_${strength}`;
    const hit = cache.get(ck);
    if (hit) return hit;

    const src = colorTex.image as HTMLCanvasElement | HTMLImageElement | undefined;
    if (!src || typeof document === 'undefined') return colorTex;

    const w = 'width' in src ? (src as HTMLCanvasElement).width || 256 : 256;
    const h = 'height' in src ? (src as HTMLCanvasElement).height || 256 : 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0;
        // Invert slightly so dark grain = rougher
        const r = Math.min(255, Math.max(0, 255 - g * strength + (1 - strength) * 140));
        d[i] = d[i + 1] = d[i + 2] = r;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.copy(colorTex.repeat);
    tex.colorSpace = THREE.NoColorSpace;
    cache.set(ck, tex);
    return tex;
}

export function makeHouseMap(id: HouseSkinId, opts: SkinOpts = {}): THREE.CanvasTexture | THREE.Texture {
    const low = opts.low ?? false;
    const size = low ? 192 : 512;
    const rep = opts.repeat ?? [1, 1];

    switch (id) {
        case 'wood':
            return canvasTex('h_wood', size, (c, s) => paintWood(c, s, false), rep);
        case 'woodDark':
            return canvasTex('h_woodDark', size, (c, s) => paintWood(c, s, true), rep);
        case 'woodFloor':
            return canvasTex('h_woodFloor', size, (c, s) => paintPlankFloor(c, s, false), rep);
        case 'woodFloorDark':
            return canvasTex('h_woodFloorD', size, (c, s) => paintPlankFloor(c, s, true), rep);
        case 'stone':
            return canvasTex('h_stone', size, paintStone, rep);
        case 'plaster':
            return canvasTex('h_plaster', size, (c, s) => paintPlaster(c, s, false), rep);
        case 'plasterPurple':
            return canvasTex('h_plasterP', size, (c, s) => paintPlaster(c, s, true), rep);
        case 'rug':
            return canvasTex('h_rug', size, paintRug, rep);
        case 'fabric':
            return canvasTex('h_fabric', size, (c, s) => paintFabric(c, s, false), rep);
        case 'fabricLight':
            return canvasTex('h_fabricL', size, (c, s) => paintFabric(c, s, true), rep);
        case 'leather':
            return canvasTex('h_leather', size, paintLeather, rep);
        case 'metal':
            return canvasTex('h_metal', size, (c, s) => paintMetal(c, s, false), rep);
        case 'metalDark':
            return canvasTex('h_metalD', size, (c, s) => paintMetal(c, s, true), rep);
        case 'gold':
            return canvasTex('h_gold', size, paintGold, rep);
        case 'book':
            return canvasTex('h_book', size, paintBook, rep);
        case 'leaf':
            return canvasTex('h_leaf', size, paintLeaf, rep);
        case 'grass':
            return canvasTex('h_grass', size, paintGrass, rep);
        case 'pathStone':
            return canvasTex('h_path', size, paintPathStone, rep);
        case 'dirt':
            return canvasTex('h_dirt', size, paintDirt, rep);
        case 'screen':
            return canvasTex('h_screen', size, paintScreen, rep);
        case 'tile':
            return canvasTex('h_tile', size, paintTile, rep);
        case 'tileKitchen':
            return canvasTex('h_tileKitchen', size, paintTileKitchen, rep);
        case 'carpet':
            return canvasTex('h_carpet', size, paintCarpet, rep);
        case 'marble':
            return canvasTex('h_marble', size, paintMarble, rep);
        case 'concrete':
            return canvasTex('h_concrete', size, paintConcrete, rep);
        case 'artDomain':
            return canvasTex('h_artDomain', size, paintDomain, [1, 1]);
        case 'artAsWithin':
            return canvasTex('h_artAsWithin', size, (c, s) =>
                paintEsoteric(c, s, 'As within,', 'so without.', 'violet'),
            );
        case 'artStillPoint':
            return canvasTex('h_artStill', size, (c, s) =>
                paintEsoteric(c, s, 'The still point', 'moves the world.', 'gold'),
            );
        case 'artUnnamed':
            return canvasTex('h_artUnnamed', size, (c, s) =>
                paintEsoteric(c, s, 'Name nothing.', 'Become the witness.', 'teal'),
            );
        case 'nightGlass':
            return canvasTex('h_nightGlass', size, paintNightGlass, rep);
        case 'skyNight':
            return canvasTex('h_skyNight', size, paintSkyNight, [1, 1]);
        case 'moon':
            return canvasTex('h_moon', size, paintMoon, [1, 1]);
        default:
            return canvasTex('h_wood', size, (c, s) => paintWood(c, s, false), rep);
    }
}

export function loadBrandMap(url: string, repeat: [number, number] = [1, 1]): THREE.Texture {
    const ck = `h_brand_${url}_${repeat.join('x')}`;
    const hit = cache.get(ck);
    if (hit) return hit;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(ck, tex);
    return tex;
}
