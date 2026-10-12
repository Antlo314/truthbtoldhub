'use client';

/**
 * The ground of the Aether Plain — chunks of mesh sampled from heightAt(),
 * coloured per vertex by region, slope, road and shore, built progressively
 * around the walker so the island never costs a load screen.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { groundColor, heightAt, ISLAND_C, ISLAND_R } from '@/lib/world/terrain';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';

const CHUNK = 60;
/** Chunks whose centre is farther than this from the walker are not built */
const BUILD_R = 330;
const PER_FRAME = 2;

function detailTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    const img = g.createImageData(256, 256);
    let seed = 1234;
    const r = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    for (let i = 0; i < 256 * 256; i++) {
        const v = 190 + r() * 65;
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.35, 0.35);
    t.anisotropy = 4;
    return t;
}

function buildChunk(cx: number, cz: number, segs: number): THREE.BufferGeometry {
    const n = segs + 1;
    const step = CHUNK / segs;
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    const pos = new Float32Array(n * n * 3);
    const nor = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const uv = new Float32Array(n * n * 2);
    const heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            heights[j * n + i] = heightAt(x0 + i * step, z0 + j * step);
        }
    }
    const c: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const k = j * n + i;
            const x = x0 + i * step;
            const z = z0 + j * step;
            const h = heights[k];
            pos[k * 3] = x;
            pos[k * 3 + 1] = h;
            pos[k * 3 + 2] = z;
            // central differences; at the chunk edge sample the function
            const hl = i > 0 ? heights[k - 1] : heightAt(x - step, z);
            const hr = i < segs ? heights[k + 1] : heightAt(x + step, z);
            const hd = j > 0 ? heights[k - n] : heightAt(x, z - step);
            const hu = j < segs ? heights[k + n] : heightAt(x, z + step);
            let nx = hl - hr;
            let ny = 2 * step;
            let nz = hd - hu;
            const l = Math.hypot(nx, ny, nz) || 1;
            nx /= l;
            ny /= l;
            nz /= l;
            nor[k * 3] = nx;
            nor[k * 3 + 1] = ny;
            nor[k * 3 + 2] = nz;
            groundColor(x, z, c);
            col[k * 3] = c[0];
            col[k * 3 + 1] = c[1];
            col[k * 3 + 2] = c[2];
            uv[k * 2] = x;
            uv[k * 2 + 1] = z;
        }
    }
    const idx = new Uint32Array(segs * segs * 6);
    let p = 0;
    for (let j = 0; j < segs; j++) {
        for (let i = 0; i < segs; i++) {
            const a = j * n + i;
            const b = a + 1;
            const cI = a + n;
            const d = cI + 1;
            idx[p++] = a;
            idx[p++] = cI;
            idx[p++] = b;
            idx[p++] = b;
            idx[p++] = cI;
            idx[p++] = d;
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
}

export default function Terrain({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    const group = useRef<THREE.Group>(null);
    const segs = low ? 20 : 40;
    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                map: detailTexture(),
                roughness: 0.96,
                metalness: 0,
            }),
        [],
    );
    const built = useRef(new Map<string, THREE.Mesh>());
    const queue = useRef<{ cx: number; cz: number; d: number }[]>([]);
    const lastCell = useRef('');

    useEffect(() => {
        const map = built.current;
        return () => {
            for (const m of Array.from(map.values())) {
                m.geometry.dispose();
            }
            map.clear();
            material.dispose();
        };
    }, [material]);

    useFrame(() => {
        const g = group.current;
        if (!g) return;
        const p = getWalkerPose();
        const cell = `${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}`;
        if (cell !== lastCell.current) {
            lastCell.current = cell;
            // re-plan: every unbuilt chunk within reach, nearest first
            const want: { cx: number; cz: number; d: number }[] = [];
            const cxMin = Math.floor((ISLAND_C.x - ISLAND_R - 30) / CHUNK);
            const cxMax = Math.floor((ISLAND_C.x + ISLAND_R + 30) / CHUNK);
            const czMin = Math.floor((ISLAND_C.z - ISLAND_R - 30) / CHUNK);
            const czMax = Math.floor((ISLAND_C.z + ISLAND_R + 30) / CHUNK);
            for (let cx = cxMin; cx <= cxMax; cx++) {
                for (let cz = czMin; cz <= czMax; cz++) {
                    const key = `${cx},${cz}`;
                    if (built.current.has(key)) continue;
                    const mx = (cx + 0.5) * CHUNK;
                    const mz = (cz + 0.5) * CHUNK;
                    // skip chunks entirely in the cloud sea
                    if (Math.hypot(mx - ISLAND_C.x, mz - ISLAND_C.z) > ISLAND_R + CHUNK) continue;
                    const d = Math.hypot(mx - p.x, mz - p.z);
                    if (d < BUILD_R) want.push({ cx, cz, d });
                }
            }
            want.sort((a, b) => a.d - b.d);
            queue.current = want;
        }
        for (let i = 0; i < PER_FRAME && queue.current.length; i++) {
            const next = queue.current.shift()!;
            const key = `${next.cx},${next.cz}`;
            if (built.current.has(key)) continue;
            const mesh = new THREE.Mesh(buildChunk(next.cx, next.cz, segs), material);
            mesh.receiveShadow = shadows;
            mesh.castShadow = false;
            mesh.matrixAutoUpdate = false;
            built.current.set(key, mesh);
            g.add(mesh);
        }
    });

    return <group ref={group} />;
}
