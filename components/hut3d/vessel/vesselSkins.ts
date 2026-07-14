/**
 * Vessel surface maps — Bruno Simon–style palette×texture coloring.
 * Shared procedural CanvasTextures (free, cached). Tint via material.color.
 */
import * as THREE from 'three';

export type VesselMapKind = 'skin' | 'cloth' | 'hair' | 'leather' | 'metal' | 'eyes' | 'gold';

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTex(
    key: string,
    size: number,
    paint: (ctx: CanvasRenderingContext2D, s: number) => void,
    repeat: [number, number] = [2, 2],
): THREE.CanvasTexture {
    const ck = `${key}_${size}`;
    const hit = cache.get(ck);
    if (hit) return hit;

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
    tex.needsUpdate = true;
    cache.set(ck, tex);
    return tex;
}

/** Soft subsurface / pore field — multiplies with skin tone */
function paintSkin(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#e8d4c4';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
        const v = 200 + Math.random() * 40;
        ctx.fillStyle = `rgba(${v},${v - 20},${v - 40},${0.04 + Math.random() * 0.06})`;
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 0.5 + Math.random() * 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    // soft cheek/warmer blotches
    for (let i = 0; i < 12; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const g = ctx.createRadialGradient(x, y, 1, x, y, 18 + Math.random() * 22);
        g.addColorStop(0, 'rgba(220,140,120,0.12)');
        g.addColorStop(1, 'rgba(220,140,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 40, y - 40, 80, 80);
    }
}

function paintCloth(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#d8d0e0';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
        ctx.strokeStyle = `rgba(40,30,55,${0.08 + (y % 4) * 0.02})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
    }
    for (let x = 0; x < s; x += 3) {
        ctx.strokeStyle = `rgba(30,25,45,${0.05 + (x % 6) * 0.01})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
    }
    for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
}

function paintHair(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
        ctx.strokeStyle = `rgba(255,230,200,${0.04 + (i % 5) * 0.015})`;
        ctx.beginPath();
        ctx.moveTo(i + Math.sin(i * 0.2) * 2, 0);
        for (let y = 0; y < s; y += 6) {
            ctx.lineTo(i + Math.sin(y * 0.08 + i) * 3, y);
        }
        ctx.stroke();
    }
}

function paintLeather(ctx: CanvasRenderingContext2D, s: number) {
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
        const v = 40 + Math.random() * 50;
        ctx.fillStyle = `rgba(${v + 25},${v},${v - 10},${0.05 + Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(
            Math.random() * s,
            Math.random() * s,
            2 + Math.random() * 10,
            1 + Math.random() * 4,
            Math.random(),
            0,
            Math.PI * 2,
        );
        ctx.fill();
    }
}

function paintMetal(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#6a6a78');
    g.addColorStop(0.45, '#c8c8d4');
    g.addColorStop(1, '#4a4a58');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
        ctx.fillStyle = `rgba(255,255,255,${0.03 + (i % 5) * 0.01})`;
        ctx.fillRect(0, i, s, 1);
    }
}

function paintEyes(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 2, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#a8c4e8');
    g.addColorStop(1, '#1a2030');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
}

function paintGold(ctx: CanvasRenderingContext2D, s: number) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#8a6010');
    g.addColorStop(0.4, '#fbbf24');
    g.addColorStop(0.6, '#fde68a');
    g.addColorStop(1, '#b45309');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 25; i++) {
        ctx.fillStyle = `rgba(255,255,220,${0.06 + Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 16, 1 + Math.random() * 2);
    }
}

const PAINT: Record<VesselMapKind, (ctx: CanvasRenderingContext2D, s: number) => void> = {
    skin: paintSkin,
    cloth: paintCloth,
    hair: paintHair,
    leather: paintLeather,
    metal: paintMetal,
    eyes: paintEyes,
    gold: paintGold,
};

const REPEAT: Record<VesselMapKind, [number, number]> = {
    skin: [2.5, 2.5],
    cloth: [3, 3],
    hair: [2, 4],
    leather: [2.5, 2.5],
    metal: [2, 2],
    eyes: [1, 1],
    gold: [1.5, 1.5],
};

/** Shared albedo map for a vessel surface kind (Bruno palette×map pattern). */
export function getVesselMap(kind: VesselMapKind, low = false): THREE.CanvasTexture {
    const size = low ? 128 : 256;
    return canvasTex(`vm_${kind}`, size, PAINT[kind], REPEAT[kind]);
}

/** UV gradient helper texture (Bruno car paint A→B style) */
export function getVerticalGradientMap(low = false): THREE.CanvasTexture {
    const size = low ? 32 : 64;
    return canvasTex(
        'vm_vgrad',
        size,
        (ctx, s) => {
            const g = ctx.createLinearGradient(0, 0, 0, s);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(1, '#707070');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        },
        [1, 1],
    );
}
