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
    | 'screen'
    | 'tile'
    | 'concrete';

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

function paintWood(ctx: CanvasRenderingContext2D, s: number, dark = false, floor = false) {
    const base = dark ? '#1c120c' : floor ? '#3a2818' : '#4a3420';
    const grain = dark ? '#2a1a10' : floor ? '#5c4028' : '#6b4a2e';
    const highlight = dark ? '#3a2818' : floor ? '#7a5a38' : '#8a6240';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += floor ? 3 : 2) {
        const n = Math.sin(i * 0.08) * 8 + Math.sin(i * 0.31) * 3;
        ctx.strokeStyle = i % 7 === 0 ? highlight : grain;
        ctx.globalAlpha = 0.14 + (i % 5) * 0.03;
        ctx.beginPath();
        ctx.moveTo(0, i + n * 0.15);
        for (let x = 0; x < s; x += 8) {
            ctx.lineTo(x, i + Math.sin(x * 0.05 + i) * 1.5 + n * 0.1);
        }
        ctx.stroke();
    }
    if (floor) {
        // plank seams
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#120a06';
        ctx.lineWidth = 1.5;
        for (let y = 0; y < s; y += s / 6) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(s, y + Math.sin(y) * 2);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 0.12;
    for (let k = 0; k < 90; k++) {
        ctx.fillStyle = '#0a0604';
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 2);
    }
    ctx.globalAlpha = 1;
}

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
            const shade = 0.72 + Math.random() * 0.28;
            const r = Math.floor(48 * shade);
            const g = Math.floor(52 * shade);
            const b = Math.floor(62 * shade);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(px + 1, py + 1, bw - 2, bh - 2);
            for (let n = 0; n < 14; n++) {
                ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
                ctx.fillRect(px + Math.random() * bw, py + Math.random() * bh, 2 + Math.random() * 4, 1);
            }
        }
    }
    ctx.strokeStyle = 'rgba(18,16,14,0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * bh);
        ctx.lineTo(s, y * bh);
        ctx.stroke();
    }
}

function paintPlaster(ctx: CanvasRenderingContext2D, s: number, purple = false) {
    ctx.fillStyle = purple ? '#2e2838' : '#3a342c';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
        const v = purple ? 50 + Math.random() * 35 : 40 + Math.random() * 40;
        const r = purple ? v + 8 : v;
        const g = purple ? v - 4 : v - 4;
        const b = purple ? v + 18 : v - 10;
        ctx.fillStyle = `rgba(${r},${g},${b},${0.04 + Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 6, 2 + Math.random() * 4);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 5; c++) {
        ctx.beginPath();
        let x = Math.random() * s;
        let y = Math.random() * s;
        ctx.moveTo(x, y);
        for (let s2 = 0; s2 < 7; s2++) {
            x += (Math.random() - 0.5) * 18;
            y += Math.random() * 14;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function paintRug(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#4a2018';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = s * 0.04;
    ctx.strokeRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
    // field pattern
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = 'rgba(120,40,30,0.25)';
                ctx.fillRect((i / 8) * s * 0.7 + s * 0.15, (j / 8) * s * 0.7 + s * 0.15, s * 0.08, s * 0.08);
            }
        }
    }
    ctx.fillStyle = '#2a120e';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.2, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(0,0,0,${0.03 + (y % 4) * 0.01})`;
        ctx.fillRect(0, y, s, 1);
    }
}

function paintFabric(ctx: CanvasRenderingContext2D, s: number, light = false) {
    ctx.fillStyle = light ? '#3a3050' : '#221a30';
    ctx.fillRect(0, 0, s, s);
    // weave
    for (let y = 0; y < s; y += 3) {
        ctx.strokeStyle = light ? 'rgba(80,70,110,0.35)' : 'rgba(50,40,70,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
    }
    for (let x = 0; x < s; x += 4) {
        ctx.strokeStyle = light ? 'rgba(90,80,120,0.2)' : 'rgba(40,30,55,0.25)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
    }
    // nap noise
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
}

function paintLeather(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 800; i++) {
        const v = 30 + Math.random() * 40;
        ctx.fillStyle = `rgba(${v + 20},${v},${v - 10},${0.06 + Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 2 + Math.random() * 8, 1 + Math.random() * 4, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    for (let c = 0; c < 10; c++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, Math.random() * s);
        ctx.quadraticCurveTo(Math.random() * s, Math.random() * s, Math.random() * s, Math.random() * s);
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
    for (let i = 0; i < s; i += 2) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.008})`;
        ctx.fillRect(0, i, s, 1);
    }
    for (let k = 0; k < 40; k++) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 8 + Math.random() * 20, 1);
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
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,220,${0.05 + Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 20, 1 + Math.random() * 2);
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
    const [a, b] = hues[Math.floor(Math.random() * hues.length)];
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
    ctx.fillStyle = '#0f2a18';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 8 + Math.random() * 22;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, `rgba(${20 + Math.random() * 40},${80 + Math.random() * 80},${30 + Math.random() * 40},0.7)`);
        g.addColorStop(1, 'rgba(10,40,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintScreen(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#020814';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(34,211,238,${0.03 + (y % 6) * 0.01})`;
        ctx.fillRect(0, y, s, 1);
    }
    // soft glow blotches
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
        g.addColorStop(0, 'rgba(34,211,238,0.25)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 30, y - 30, 60, 60);
    }
}

function paintTile(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(0, 0, s, s);
    const n = 4;
    const tw = s / n;
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const shade = 0.85 + Math.random() * 0.15;
            ctx.fillStyle = `rgb(${Math.floor(42 * shade)},${Math.floor(36 * shade)},${Math.floor(55 * shade)})`;
            ctx.fillRect(x * tw + 1, y * tw + 1, tw - 2, tw - 2);
        }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
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
}

function paintConcrete(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#2a2830';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2000; i++) {
        const v = 30 + Math.random() * 50;
        ctx.fillStyle = `rgba(${v},${v},${v + 5},${0.04 + Math.random() * 0.05})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1);
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
            return canvasTex('h_woodFloor', size, (c, s) => paintWood(c, s, false, true), rep);
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
        case 'screen':
            return canvasTex('h_screen', size, paintScreen, rep);
        case 'tile':
            return canvasTex('h_tile', size, paintTile, rep);
        case 'concrete':
            return canvasTex('h_concrete', size, paintConcrete, rep);
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
