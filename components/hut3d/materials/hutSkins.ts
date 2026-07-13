/**
 * Free Hut surface skins — procedural CanvasTexture + local brand photos.
 * $0 cost · no external paid APIs · looks real under cinematic light.
 */
import * as THREE from 'three';

export type HutSkinId =
    | 'wood'
    | 'woodDark'
    | 'stone'
    | 'plaster'
    | 'rug'
    | 'gold'
    | 'ember'
    | 'mirror'
    | 'sanctum';

type SkinOpts = {
    repeat?: [number, number];
    low?: boolean;
};

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
    tex.anisotropy = 4;
    cache.set(ck, tex);
    return tex;
}

/** Warm oak-style grain */
function paintWood(ctx: CanvasRenderingContext2D, s: number, dark = false) {
    const base = dark ? '#1c120c' : '#3d2818';
    const grain = dark ? '#2a1a10' : '#5c3d24';
    const highlight = dark ? '#3a2818' : '#6b4a2e';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
        const n = Math.sin(i * 0.08) * 8 + Math.sin(i * 0.31) * 3;
        ctx.strokeStyle = i % 7 === 0 ? highlight : grain;
        ctx.globalAlpha = 0.15 + (i % 5) * 0.03;
        ctx.beginPath();
        ctx.moveTo(0, i + n * 0.15);
        for (let x = 0; x < s; x += 8) {
            ctx.lineTo(x, i + Math.sin(x * 0.05 + i) * 1.5 + n * 0.1);
        }
        ctx.stroke();
    }
    // pores
    ctx.globalAlpha = 0.12;
    for (let k = 0; k < 80; k++) {
        ctx.fillStyle = '#0a0604';
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 2);
    }
    ctx.globalAlpha = 1;
}

/** Stone block with mortar */
function paintStone(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(0, 0, s, s);
    const cols = 4;
    const rows = 4;
    const bw = s / cols;
    const bh = s / rows;
    for (let y = 0; y < rows; y++) {
        const offset = (y % 2) * (bw * 0.5);
        for (let x = -1; x <= cols; x++) {
            const px = x * bw + offset;
            const py = y * bh;
            const shade = 0.75 + Math.random() * 0.25;
            const r = Math.floor(42 * shade);
            const g = Math.floor(46 * shade);
            const b = Math.floor(56 * shade);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(px + 1, py + 1, bw - 2, bh - 2);
            // noise
            for (let n = 0; n < 12; n++) {
                ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
                ctx.fillRect(
                    px + Math.random() * bw,
                    py + Math.random() * bh,
                    2 + Math.random() * 4,
                    1,
                );
            }
        }
    }
    // mortar lines
    ctx.strokeStyle = 'rgba(18,16,14,0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * bh);
        ctx.lineTo(s, y * bh);
        ctx.stroke();
    }
}

/** Plaster / adobe wall */
function paintPlaster(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1200; i++) {
        const v = 40 + Math.random() * 40;
        ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.04 + Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 6, 2 + Math.random() * 4);
    }
    // subtle cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        let x = Math.random() * s;
        let y = Math.random() * s;
        ctx.moveTo(x, y);
        for (let s2 = 0; s2 < 8; s2++) {
            x += (Math.random() - 0.5) * 20;
            y += Math.random() * 15;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

/** Ceremonial rug */
function paintRug(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#4a2018';
    ctx.fillRect(0, 0, s, s);
    // border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = s * 0.04;
    ctx.strokeRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
    // center medallion
    ctx.fillStyle = '#2a120e';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();
    // weave noise
    for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(0,0,0,${0.03 + (y % 4) * 0.01})`;
        ctx.fillRect(0, y, s, 1);
    }
}

export function makeHutMap(
    id: HutSkinId,
    opts: SkinOpts = {},
): THREE.CanvasTexture | THREE.Texture {
    const low = opts.low ?? false;
    const size = low ? 128 : 256;
    const rep = opts.repeat ?? [1, 1];

    switch (id) {
        case 'wood':
            return canvasTex('wood', size, (c, s) => paintWood(c, s, false), rep);
        case 'woodDark':
            return canvasTex('woodDark', size, (c, s) => paintWood(c, s, true), rep);
        case 'stone':
            return canvasTex('stone', size, paintStone, rep);
        case 'plaster':
            return canvasTex('plaster', size, paintPlaster, rep);
        case 'rug':
            return canvasTex('rug', size, paintRug, rep);
        default:
            return canvasTex('wood', size, (c, s) => paintWood(c, s, false), rep);
    }
}

/** Load optional brand photo as wall accent (local free asset) */
export function loadBrandMap(url: string, repeat: [number, number] = [1, 1]): THREE.Texture {
    const ck = `brand_${url}_${repeat.join('x')}`;
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

export function disposeHutSkins() {
    cache.forEach((t) => t.dispose());
    cache.clear();
}
