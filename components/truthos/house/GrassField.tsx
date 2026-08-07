'use client';

/**
 * Real grass — instanced blades, not a texture pretending to be grass.
 *
 * The ground stays a textured disc (it reads the distance and the paths),
 * but everything the walker gets close to is now geometry: a tapered
 * three-segment blade, scattered only where jungleMap says the ground is
 * actually open, bending in the wind from the vertex shader.
 *
 * Cost control, in order of how much it saves:
 *   · placement is rejected inside the house footprint and on the dirt
 *     corridors, so no blade is ever drawn where you cannot see it;
 *   · blades are split into quadrant chunks so the frustum can cull the
 *     three you are not looking at;
 *   · density and radius drop hard on `low` (phones), and the wind is a
 *     two-sine vertex offset — no per-frame CPU work, one uniform;
 *   · no shadows, cast or received: a blade's shadow is invisible and a
 *     shadow map of 20k blades is not.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHELL } from './homeMap';
import { inCorridor, inOpenGround } from './jungleMap';

const BLADE_H = 0.46;
const BLADE_W = 0.055;

/** Seeded so the field is identical every session (mulberry32). */
function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * One blade: a plane narrowed toward the tip, its base moved to y=0, with
 * a vertex-colour gradient (dark at the root, bright at the tip) so the
 * field has depth before a single light touches it.
 */
function bladeGeometry(): THREE.BufferGeometry {
    const g = new THREE.PlaneGeometry(BLADE_W, BLADE_H, 1, 3);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) + BLADE_H / 2; // 0 at base → BLADE_H at tip
        const t = y / BLADE_H;
        // taper: full width at the root, a point at the tip
        pos.setX(i, pos.getX(i) * (1 - t * 0.82));
        pos.setY(i, y);
        // slight natural lean so a blade is never a perfect flat card
        pos.setZ(i, pos.getZ(i) + t * t * 0.06);
        const shade = 0.42 + t * 0.58;
        col[i * 3] = shade;
        col[i * 3 + 1] = shade;
        col[i * 3 + 2] = shade;
    }
    pos.needsUpdate = true;
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
}

/** Lambert + a wind hook. Lambert, not Standard: grass needs no PBR. */
function bladeMaterial(uTime: { value: number }) {
    const m = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uTime;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n uniform float uTime;`)
            .replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 float bladeT = clamp(transformed.y / ${BLADE_H.toFixed(3)}, 0.0, 1.0);
                 // phase from the instance's world position — neighbours sway together,
                 // the far side of the clearing does not
                 vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
                 float phase = iPos.x * 0.34 + iPos.z * 0.27;
                 float gust = sin(uTime * 0.31 + iPos.x * 0.05) * 0.5 + 0.5;
                 float sway = sin(uTime * 1.7 + phase) * 0.13
                            + sin(uTime * 3.3 + phase * 1.7) * 0.045;
                 sway *= 0.55 + gust * 0.75;
                 // bend, don't shear: the root stays planted (t²)
                 float bend = bladeT * bladeT;
                 transformed.x += sway * bend;
                 transformed.z += sway * 0.55 * bend;
                 transformed.y -= abs(sway) * bend * 0.22;`,
            );
    };
    return m;
}

/** House footprint plus a skirt — no blades under the slab. */
const HOUSE_PAD = 0.9;
function inHouse(x: number, z: number) {
    return (
        x > SHELL.minX - HOUSE_PAD &&
        x < SHELL.maxX + HOUSE_PAD &&
        z > SHELL.minZ - HOUSE_PAD &&
        z < SHELL.maxZ + HOUSE_PAD
    );
}

function Chunk({
    seed,
    count,
    radius,
    a0,
    a1,
    geo,
    mat,
}: {
    seed: number;
    count: number;
    radius: number;
    a0: number;
    a1: number;
    geo: THREE.BufferGeometry;
    mat: THREE.Material;
}) {
    const ref = useRef<THREE.InstancedMesh>(null);

    const placed = useMemo(() => {
        const r = rng(seed);
        const dummy = new THREE.Object3D();
        const colour = new THREE.Color();
        const mats: THREE.Matrix4[] = [];
        const cols: THREE.Color[] = [];
        // Rejection sampling against the SAME open-ground test the trees,
        // colliders and corridors use, so grass can never grow inside a
        // wall or across a path.
        let guard = count * 24;
        while (mats.length < count && guard-- > 0) {
            const ang = a0 + r() * (a1 - a0);
            // sqrt keeps the density even instead of crowding the centre
            const dist = Math.sqrt(r()) * radius;
            const x = Math.cos(ang) * dist;
            const z = Math.sin(ang) * dist;
            if (inHouse(x, z)) continue;
            if (!inOpenGround(x, z, 0.4)) continue;
            if (inCorridor(x, z, -0.35)) continue; // paths stay bare dirt
            dummy.position.set(x, 0, z);
            dummy.rotation.set((r() - 0.5) * 0.18, r() * Math.PI * 2, (r() - 0.5) * 0.22);
            const s = 0.72 + r() * 0.7;
            dummy.scale.set(0.85 + r() * 0.4, s, 1);
            dummy.updateMatrix();
            mats.push(dummy.matrix.clone());
            // Colour drift: yellower in the open, deeper green near cover
            const hue = 0.246 + (r() - 0.5) * 0.035;
            const sat = 0.34 + r() * 0.22;
            const lum = 0.24 + r() * 0.16;
            cols.push(colour.clone().setHSL(hue, sat, lum));
        }
        return { mats, cols };
    }, [seed, count, radius, a0, a1]);

    if (!placed.mats.length) return null;
    return (
        <instancedMesh
            ref={(node) => {
                ref.current = node;
                if (!node) return;
                placed.mats.forEach((m, i) => node.setMatrixAt(i, m));
                placed.cols.forEach((c, i) => node.setColorAt(i, c));
                node.instanceMatrix.needsUpdate = true;
                if (node.instanceColor) node.instanceColor.needsUpdate = true;
                node.computeBoundingSphere();
            }}
            args={[geo, mat, placed.mats.length]}
            frustumCulled
            castShadow={false}
            receiveShadow={false}
        />
    );
}

export default function GrassField({ low = false }: { low?: boolean }) {
    const uTime = useRef({ value: 0 }).current;
    const geo = useMemo(() => bladeGeometry(), []);
    const mat = useMemo(() => bladeMaterial(uTime), [uTime]);

    useFrame((_, dt) => {
        // Clamp: a tab that slept for 4 s must not teleport the wind
        uTime.value += Math.min(dt, 0.1);
    });

    // Phones: a quarter of the blades over a much tighter radius — the
    // band you actually walk through, and nothing beyond it.
    const radius = low ? 21 : 44;
    const perChunk = low ? 2600 : 6400;
    const chunks = low ? 2 : 4;

    return (
        <group>
            {Array.from({ length: chunks }, (_, i) => (
                <Chunk
                    key={i}
                    seed={4801 + i * 977}
                    count={perChunk}
                    radius={radius}
                    a0={(i / chunks) * Math.PI * 2}
                    a1={((i + 1) / chunks) * Math.PI * 2}
                    geo={geo}
                    mat={mat}
                />
            ))}
        </group>
    );
}
