'use client';

/**
 * Flowing grass. Instanced blades in chunks around the walker; a vertex
 * shader bends them in a wind that rolls across the plain and flattens
 * them where you stand. Colour runs root to tip and takes the sky's light.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { grassDensityAt, heightAt } from '@/lib/world/terrain';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import { plainWind } from './PlainWeather';

const CHUNK = 24;
const PER_FRAME = 2;

const VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uPlayer;
uniform float uWind;
attribute vec3 aOffset;
attribute vec4 aSpin; // cos, sin, height, tint
varying float vT;
varying float vTint;
#include <fog_pars_vertex>

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vT = position.y;
  vTint = aSpin.w;
  float h = aSpin.z;
  vec3 p = position;
  p.x *= 1.0 - vT * 0.78;
  p.y *= h;
  // turn the blade
  vec3 r = vec3(p.x * aSpin.x - p.z * aSpin.y, p.y, p.x * aSpin.y + p.z * aSpin.x);
  // wind: a slow swell plus a fast flutter, strongest at the tip
  vec2 w = aOffset.xz;
  float gust = noise(w * 0.035 + vec2(uTime * 0.22 * uWind, uTime * 0.13 * uWind)) * 2.0 - 1.0;
  float flutter = sin(uTime * 2.4 * uWind + w.x * 0.9 + w.y * 0.6) * 0.5;
  float sway = (gust * 0.9 * uWind + flutter * 0.25) * vT * vT * h;
  r.x += sway * 0.85;
  r.z += sway * 0.45;
  // trample: push out and down near the walker
  vec2 d = w - uPlayer.xz;
  float dl = length(d);
  float tr = smoothstep(1.35, 0.25, dl) * step(abs(aOffset.y - uPlayer.y), 2.5);
  vec2 dir = dl > 0.001 ? d / dl : vec2(1.0, 0.0);
  r.xz += dir * tr * vT * 0.9;
  r.y *= 1.0 - tr * 0.75;
  vec3 world = r + aOffset;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform vec3 uRoot;
uniform vec3 uTip;
uniform vec3 uSun;
uniform float uDay;
varying float vT;
varying float vTint;
#include <fog_pars_fragment>
void main() {
  vec3 col = mix(uRoot, uTip, pow(vT, 1.3));
  col *= 0.86 + vTint * 0.28;
  // a little translucence toward the sun, ambient from the sky
  float light = 0.55 + 0.45 * uDay;
  col *= light * (0.78 + 0.22 * vT);
  col += uSun * 0.08 * vT * uDay;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
`;

function bladeGeometry(): THREE.BufferGeometry {
    const segs = 3;
    const w = 0.055;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        pos.push(-w / 2, t, 0, w / 2, t, 0);
    }
    for (let i = 0; i < segs; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
}

function hash(x: number, z: number, k: number): number {
    const s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
    return s - Math.floor(s);
}

/** Build one chunk's blades: density from a coarse grid, height from a fine one */
function buildChunk(cx: number, cz: number, perM2: number, base: THREE.BufferGeometry, material: THREE.Material): THREE.InstancedMesh | null {
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    // coarse density (every 3 m) and height (every 2 m) samples
    const dn = CHUNK / 3 + 1;
    const dens = new Float32Array(dn * dn);
    let any = false;
    for (let j = 0; j < dn; j++) {
        for (let i = 0; i < dn; i++) {
            const d = grassDensityAt(x0 + i * 3, z0 + j * 3);
            dens[j * dn + i] = d;
            if (d > 0.02) any = true;
        }
    }
    if (!any) return null;
    const hn = CHUNK / 2 + 1;
    const hts = new Float32Array(hn * hn);
    for (let j = 0; j < hn; j++) for (let i = 0; i < hn; i++) hts[j * hn + i] = heightAt(x0 + i * 2, z0 + j * 2);
    const lerp2 = (arr: Float32Array, n: number, cell: number, lx: number, lz: number) => {
        const fx = Math.min(n - 1.001, lx / cell);
        const fz = Math.min(n - 1.001, lz / cell);
        const i = Math.floor(fx);
        const j = Math.floor(fz);
        const tx = fx - i;
        const tz = fz - j;
        const a = arr[j * n + i];
        const b = arr[j * n + i + 1];
        const c = arr[(j + 1) * n + i];
        const d = arr[(j + 1) * n + i + 1];
        return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
    };
    const target = Math.floor(perM2 * CHUNK * CHUNK);
    const offsets: number[] = [];
    const spins: number[] = [];
    for (let k = 0; k < target; k++) {
        const lx = hash(cx, cz, k * 2) * CHUNK;
        const lz = hash(cx, cz, k * 2 + 1) * CHUNK;
        const d = lerp2(dens, dn, 3, lx, lz);
        if (hash(cz, cx, k * 7 + 3) > d) continue;
        const y = lerp2(hts, hn, 2, lx, lz);
        const yaw = hash(cx, cz, k * 11 + 5) * Math.PI * 2;
        const h = 0.38 + hash(cx, cz, k * 13 + 9) * 0.5;
        const tint = hash(cx, cz, k * 17 + 1);
        offsets.push(x0 + lx, y - 0.02, z0 + lz);
        spins.push(Math.cos(yaw), Math.sin(yaw), h, tint);
    }
    const count = offsets.length / 3;
    if (count === 0) return null;
    const geo = base.clone();
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(new Float32Array(spins), 4));
    const mesh = new THREE.InstancedMesh(geo, material, count);
    // instanceMatrix is unused by the shader; keep it identity
    mesh.frustumCulled = true;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x0 + CHUNK / 2, 0, z0 + CHUNK / 2), CHUNK * 0.8 + 30);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}

export default function Grass({ low = false, radius = 96, perM2 = 5.5 }: { low?: boolean; radius?: number; perM2?: number }) {
    const group = useRef<THREE.Group>(null);
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: VERT,
                fragmentShader: FRAG,
                uniforms: THREE.UniformsUtils.merge([
                    THREE.UniformsLib.fog,
                    {
                        uTime: { value: 0 },
                        uPlayer: { value: new THREE.Vector3() },
                        uRoot: { value: new THREE.Color('#2a5a1e') },
                        uTip: { value: new THREE.Color('#8fcf4a') },
                        uSun: { value: new THREE.Color('#ffe2bf') },
                        uDay: { value: 1 },
                        uWind: { value: 1 },
                    },
                ]),
                side: THREE.DoubleSide,
                fog: true,
            }),
        [],
    );
    const base = useMemo(() => bladeGeometry(), []);
    const chunks = useRef(new Map<string, THREE.InstancedMesh | null>());
    const queue = useRef<{ cx: number; cz: number; d: number }[]>([]);
    const lastCell = useRef('');

    useEffect(() => {
        const map = chunks.current;
        return () => {
            map.forEach((m) => m?.geometry.dispose());
            map.clear();
            material.dispose();
            base.dispose();
        };
    }, [material, base]);

    useFrame((state) => {
        const g = group.current;
        if (!g) return;
        const p = getWalkerPose();
        material.uniforms.uTime.value = state.clock.elapsedTime;
        material.uniforms.uWind.value = plainWind();
        material.uniforms.uPlayer.value.set(p.x, p.y, p.z);
        const sky = getSky();
        material.uniforms.uDay.value = sky.daylight;
        (material.uniforms.uSun.value as THREE.Color).setRGB(sky.sunColor[0] / 255, sky.sunColor[1] / 255, sky.sunColor[2] / 255);

        const cell = `${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}`;
        if (cell !== lastCell.current) {
            lastCell.current = cell;
            const n = Math.ceil(radius / CHUNK);
            const pcx = Math.floor(p.x / CHUNK);
            const pcz = Math.floor(p.z / CHUNK);
            const want: { cx: number; cz: number; d: number }[] = [];
            const keep = new Set<string>();
            for (let dx = -n; dx <= n; dx++) {
                for (let dz = -n; dz <= n; dz++) {
                    const cx = pcx + dx;
                    const cz = pcz + dz;
                    const mx = (cx + 0.5) * CHUNK;
                    const mz = (cz + 0.5) * CHUNK;
                    const d = Math.hypot(mx - p.x, mz - p.z);
                    if (d > radius + CHUNK * 0.5) continue;
                    const key = `${cx},${cz}`;
                    keep.add(key);
                    if (!chunks.current.has(key)) want.push({ cx, cz, d });
                }
            }
            // drop what is now out of reach
            for (const [key, m] of Array.from(chunks.current)) {
                if (keep.has(key)) continue;
                if (m) {
                    g.remove(m);
                    m.geometry.dispose();
                }
                chunks.current.delete(key);
            }
            want.sort((a, b) => a.d - b.d);
            queue.current = want;
        }
        for (let i = 0; i < PER_FRAME && queue.current.length; i++) {
            const next = queue.current.shift()!;
            const key = `${next.cx},${next.cz}`;
            if (chunks.current.has(key)) continue;
            const m = buildChunk(next.cx, next.cz, low ? perM2 * 0.45 : perM2, base, material);
            chunks.current.set(key, m);
            if (m) g.add(m);
        }
    });

    return <group ref={group} />;
}
