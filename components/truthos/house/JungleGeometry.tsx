'use client';

/**
 * The jungle — an enclosed world around one safe house.
 *
 * v1 read as an open sandbox: 120 trees over forty thousand square
 * metres is a savanna. v2 is a room. Three concentric GREEN WALL rings
 * of packed foliage seal the clearing visually (the colliders were
 * always there — now the eye agrees with them), a concentrated trunk
 * forest fills the band behind the wall, heavy understory carpets the
 * ground the player can actually see, an overhead canopy lip leans in
 * above the wall, and ground mist + fireflies keep the air alive. The
 * far horizon (DistantScenery) hugs the wall so nothing empty ever
 * shows between layers.
 *
 * Depth is an illusion by construction: each ring is taller and darker
 * than the last, which is aerial perspective — the same trick the
 * horizon uses, brought close.
 *
 * Everything is seeded and instanced (~12 draw calls desktop). Corridors
 * come from jungleMap.CORRIDORS — every population here parts around
 * them automatically, so opening a new path later touches one file.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useHouseMaterials } from './HouseMaterials';
import { seededRng } from './houseSkins';
import GrassField from './GrassField';
import Grove from './Grove';
import {
    CLEARING_R,
    CORRIDORS,
    DESTINATIONS,
    destCenter,
    inCorridor,
    inDestination,
    inOpenGround,
} from './jungleMap';

/** True when a spot must stay clear — any clearing, any corridor. */
function keepOut(x: number, z: number): boolean {
    return inOpenGround(x, z, 2.2);
}

/** Scatter n points in a radial band, rejecting the keep-out shapes. */
function scatter(
    rnd: () => number,
    n: number,
    rMin: number,
    rMax: number,
): { x: number; z: number }[] {
    const pts: { x: number; z: number }[] = [];
    let guard = n * 30;
    while (pts.length < n && guard-- > 0) {
        const r = Math.sqrt(rnd()) * (rMax - rMin) + rMin;
        const a = rnd() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (keepOut(x, z)) continue;
        pts.push({ x, z });
    }
    return pts;
}

/**
 * Points along a ring at radius r, skipping corridor sectors. jitter
 * roughens the circle so the wall reads as growth, not architecture.
 */
function ringPoints(
    rnd: () => number,
    count: number,
    r: number,
    jitter: number,
): { x: number; z: number }[] {
    const pts: { x: number; z: number }[] = [];
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.05;
        const rr = r + (rnd() - 0.5) * jitter;
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        if (inCorridor(x, z, 2.6) || inDestination(x, z, 1.6)) continue;
        pts.push({ x, z });
    }
    return pts;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

function fill(
    mesh: THREE.InstancedMesh | null,
    pts: { x: number; z: number }[],
    place: (i: number, p: { x: number; z: number }) => void,
) {
    if (!mesh) return;
    pts.forEach((p, i) => {
        place(i, p);
        _q.setFromEuler(_e);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
}

/** Soft radial alpha disc for the ground mist. */
function mistTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, 'rgba(210,235,220,0.5)');
    grad.addColorStop(0.6, 'rgba(190,225,205,0.22)');
    grad.addColorStop(1, 'rgba(180,220,200,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

export default function JungleGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const k = low ? 0.4 : 1;

    // ── The green wall: three rings, each taller and darker ──
    const wallA = useMemo(() => ringPoints(seededRng(11801), Math.floor(150 * (low ? 0.6 : 1)), 37, 4), [low]);
    const wallAlow = useMemo(() => ringPoints(seededRng(11901), Math.floor(150 * (low ? 0.6 : 1)), 35.5, 3), [low]);
    const wallB = useMemo(() => ringPoints(seededRng(22802), Math.floor(110 * (low ? 0.55 : 1)), 52, 7), [low]);
    const wallC = useMemo(() => (low ? [] : ringPoints(seededRng(33803), 84, 70, 9)), [low]);

    // ── The forest behind the wall — concentrated, not scattered thin ──
    const trees = useMemo(() => scatter(seededRng(90210), Math.floor(240 * k), CLEARING_R + 3, 86), [k]);
    const giants = useMemo(() => scatter(seededRng(71177), low ? 5 : 12, CLEARING_R + 12, 78), [low]);

    // ── Understory where the player actually looks ──
    const ferns = useMemo(() => scatter(seededRng(33311), Math.floor(230 * k), CLEARING_R - 1.5, 58), [k]);
    const leaves = useMemo(() => scatter(seededRng(55522), Math.floor(130 * k), CLEARING_R - 1.5, 62), [k]);
    const rocks = useMemo(() => scatter(seededRng(12909), Math.floor(30 * k), CLEARING_R - 4, 55), [k]);
    const logs = useMemo(() => (low ? [] : scatter(seededRng(80841), 14, CLEARING_R + 1, 52)), [low]);

    // ── Walls around each destination clearing — same grammar as home ──
    const wallD = useMemo(() => {
        const rnd = seededRng(66906);
        const pts: { x: number; z: number }[] = [];
        for (const d of DESTINATIONS) {
            const c = destCenter(d);
            const count = Math.floor((low ? 26 : 44) * (d.r / 14));
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.06;
                const rr = d.r + 3.2 + (rnd() - 0.5) * 3;
                const x = c.x + Math.cos(a) * rr;
                const z = c.z + Math.sin(a) * rr;
                if (inCorridor(x, z, 2.6)) continue;
                pts.push({ x, z });
            }
        }
        return pts;
    }, [low]);

    // ── Canopy lip — foliage leaning IN over the wall, sealing the sky line ──
    const lip = useMemo(() => (low ? [] : ringPoints(seededRng(44904), 64, 44, 10)), [low]);

    const mats = useMemo(
        () => ({
            canopy: new THREE.MeshStandardMaterial({ color: '#2e6b3a', roughness: 0.92, flatShading: true }),
            canopyDeep: new THREE.MeshStandardMaterial({ color: '#1f4d2e', roughness: 0.95, flatShading: true }),
            canopyDark: new THREE.MeshStandardMaterial({ color: '#14361f', roughness: 0.97, flatShading: true }),
            frond: new THREE.MeshStandardMaterial({
                color: '#3f7d46',
                roughness: 0.9,
                flatShading: true,
                side: THREE.DoubleSide,
            }),
            broad: new THREE.MeshStandardMaterial({ color: '#2a5f38', roughness: 0.88, flatShading: true }),
        }),
        [],
    );

    const wallARef = useRef<THREE.InstancedMesh>(null);
    const wallDRef = useRef<THREE.InstancedMesh>(null);
    const wallALowRef = useRef<THREE.InstancedMesh>(null);
    const wallBRef = useRef<THREE.InstancedMesh>(null);
    const wallCRef = useRef<THREE.InstancedMesh>(null);
    const lipRef = useRef<THREE.InstancedMesh>(null);
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const canopyRef = useRef<THREE.InstancedMesh>(null);
    const giantTrunkRef = useRef<THREE.InstancedMesh>(null);
    const giantCanopyRef = useRef<THREE.InstancedMesh>(null);
    const fernRef = useRef<THREE.InstancedMesh>(null);
    const leafRef = useRef<THREE.InstancedMesh>(null);
    const rockRef = useRef<THREE.InstancedMesh>(null);
    const logRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        const rnd = seededRng(46664);

        // Wall ring A — the hedge line the player can nearly touch.
        // Two layers: chest-height bushes, then a taller mass behind them.
        fill(wallALowRef.current, wallAlow, (_i, p) => {
            const w = 2.6 + rnd() * 1.6;
            _p.set(p.x, 0.9 + rnd() * 0.5, p.z);
            _e.set(rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3);
            _s.set(w, w * (0.5 + rnd() * 0.25), w);
        });
        fill(wallARef.current, wallA, (_i, p) => {
            const w = 3.2 + rnd() * 2.0;
            _p.set(p.x, 2.6 + rnd() * 2.2, p.z);
            _e.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
            _s.set(w, w * (0.7 + rnd() * 0.3), w);
        });
        // Destination walls — hedge + mass in one pass, alternating
        fill(wallDRef.current, wallD, (i, p) => {
            const tall = i % 2 === 0;
            const w = tall ? 3.4 + rnd() * 2 : 2.4 + rnd() * 1.4;
            _p.set(p.x, tall ? 2.8 + rnd() * 2 : 1 + rnd() * 0.5, p.z);
            _e.set(rnd() * 0.35, rnd() * Math.PI, rnd() * 0.35);
            _s.set(w, w * (0.6 + rnd() * 0.3), w);
        });
        // Ring B — taller, darker, half-hidden
        fill(wallBRef.current, wallB, (_i, p) => {
            const w = 4.5 + rnd() * 3;
            _p.set(p.x, 4.5 + rnd() * 3.5, p.z);
            _e.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
            _s.set(w, w * (0.8 + rnd() * 0.3), w);
        });
        // Ring C — silhouette mass before the horizon takes over
        fill(wallCRef.current, wallC, (_i, p) => {
            const w = 6 + rnd() * 4;
            _p.set(p.x, 7 + rnd() * 5, p.z);
            _e.set(rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3);
            _s.set(w, w * (0.85 + rnd() * 0.3), w);
        });
        // Canopy lip — leans in over the wall so even looking UP reads green
        fill(lipRef.current, lip, (_i, p) => {
            const w = 5 + rnd() * 3.5;
            const pull = 0.82 + rnd() * 0.08; // lean toward the clearing
            _p.set(p.x * pull, 8.5 + rnd() * 2.5, p.z * pull);
            _e.set(rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3);
            _s.set(w, w * 0.42, w);
        });

        // Forest band
        const heights = trees.map(() => 6 + rnd() * 7);
        fill(trunkRef.current, trees, (i, p) => {
            const h = heights[i];
            _p.set(p.x, h / 2, p.z);
            _e.set((rnd() - 0.5) * 0.08, rnd() * Math.PI, (rnd() - 0.5) * 0.08);
            _s.set(0.8 + rnd() * 0.5, h / 7, 0.8 + rnd() * 0.5);
        });
        fill(canopyRef.current, trees, (i, p) => {
            const h = heights[i];
            const w = 2.8 + rnd() * 2.4;
            _p.set(p.x + (rnd() - 0.5) * 1.2, h - 0.3, p.z + (rnd() - 0.5) * 1.2);
            _e.set(rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3);
            _s.set(w, w * (0.55 + rnd() * 0.2), w);
        });

        const gh = giants.map(() => 15 + rnd() * 6);
        fill(giantTrunkRef.current, giants, (i, p) => {
            _p.set(p.x, gh[i] / 2, p.z);
            _e.set(0, rnd() * Math.PI, (rnd() - 0.5) * 0.05);
            _s.set(1.7 + rnd() * 0.6, gh[i] / 7, 1.7 + rnd() * 0.6);
        });
        fill(giantCanopyRef.current, giants, (i, p) => {
            const w = 6.5 + rnd() * 3;
            _p.set(p.x, gh[i] + 0.5, p.z);
            _e.set(0, rnd() * Math.PI, 0);
            _s.set(w, w * 0.5, w);
        });

        // Understory
        fill(fernRef.current, ferns, (_i, p) => {
            _p.set(p.x, 0.55 + rnd() * 0.2, p.z);
            _e.set((rnd() - 0.5) * 0.3, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.3);
            const s = 0.7 + rnd() * 0.9;
            _s.set(s, s * (0.8 + rnd() * 0.4), s);
        });
        fill(leafRef.current, leaves, (_i, p) => {
            _p.set(p.x, 0.35, p.z);
            _e.set(0, rnd() * Math.PI * 2, 0);
            const s = 0.9 + rnd() * 1.3;
            _s.set(s, s * 0.4, s);
        });
        fill(rockRef.current, rocks, (_i, p) => {
            const s = 0.35 + rnd() * 0.9;
            _p.set(p.x, s * 0.3, p.z);
            _e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
            _s.set(s, s * (0.55 + rnd() * 0.3), s);
        });
        fill(logRef.current, logs, (_i, p) => {
            _p.set(p.x, 0.35, p.z);
            _e.set((rnd() - 0.5) * 0.15, rnd() * Math.PI, Math.PI / 2 + (rnd() - 0.5) * 0.1);
            _s.set(0.35 + rnd() * 0.2, 2.2 + rnd() * 2.4, 0.35 + rnd() * 0.2);
        });
    }, [wallA, wallAlow, wallB, wallC, wallD, lip, trees, giants, ferns, leaves, rocks, logs]);

    // ── Ground mist — humidity you can see (desktop only) ──
    const mistTex = useMemo(() => (low ? null : mistTexture()), [low]);
    const mistRefs = useRef<(THREE.Mesh | null)[]>([]);
    const MISTS = useMemo(
        () =>
            low
                ? []
                : [
                      { x: -14, z: 10, s: 26, y: 0.5, spin: 0.008 },
                      { x: 16, z: -12, s: 30, y: 0.8, spin: -0.006 },
                      { x: 0, z: 26, s: 24, y: 0.6, spin: 0.005 },
                      { x: -6, z: -24, s: 28, y: 0.9, spin: -0.007 },
                  ],
        [low],
    );

    // ── Fireflies ──
    const flyRef = useRef<THREE.Points>(null);
    const flies = useMemo(() => {
        if (low) return null;
        const N = 110;
        const pos = new Float32Array(N * 3);
        const phase = new Float32Array(N);
        const rnd = seededRng(24601);
        for (let i = 0; i < N; i++) {
            // r >= 22 clears the house footprint (corner diagonal 20.5)
            const r = 22 + rnd() * 20;
            const a = rnd() * Math.PI * 2;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = 0.6 + rnd() * 2.6;
            pos[i * 3 + 2] = Math.sin(a) * r;
            phase[i] = rnd() * Math.PI * 2;
        }
        return { pos, phase, N };
    }, [low]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (flyRef.current && flies) {
            const arr = (flyRef.current.geometry.attributes.position as THREE.BufferAttribute)
                .array as Float32Array;
            for (let i = 0; i < flies.N; i++) {
                arr[i * 3] += Math.sin(t * 0.22 + flies.phase[i]) * 0.004;
                arr[i * 3 + 1] =
                    0.9 + Math.sin(t * 0.5 + flies.phase[i] * 2) * 0.7 + Math.sin(flies.phase[i]) * 0.8;
                arr[i * 3 + 2] += Math.cos(t * 0.18 + flies.phase[i]) * 0.004;
            }
            (flyRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
            (flyRef.current.material as THREE.PointsMaterial).opacity = 0.45 + Math.sin(t * 0.7) * 0.2;
        }
        mistRefs.current.forEach((mm, i) => {
            if (mm) mm.rotation.z += MISTS[i].spin * 0.016;
        });
    });

    return (
        <group>
            {/* The jungle floor — the texture is now the DISTANCE only;
                everything you walk through is real blades (GrassField). */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow={sh}>
                <circleGeometry args={[240, low ? 40 : 64]} />
                <primitive object={m.grass} attach="material" />
            </mesh>

            <GrassField low={low} />

            {/* Real trees in the band you walk through. The instanced
                rings still carry the far wall, where a cylinder reads
                fine; up close it only ever read as a cylinder. */}
            <Grove low={low} />

            {/* Dirt strips — one per corridor, drawn from the same list the
                walls and colliders part around */}
            {CORRIDORS.map((c, i) => {
                const len = Math.hypot(c.bx - c.ax, c.bz - c.az);
                const yaw = Math.atan2(c.bx - c.ax, c.bz - c.az);
                return (
                    <mesh
                        key={`path-${i}`}
                        rotation={[-Math.PI / 2, 0, yaw]}
                        position={[(c.ax + c.bx) / 2, 0.02, (c.az + c.bz) / 2]}
                        receiveShadow={sh}
                    >
                        <planeGeometry args={[c.halfWidth * 2, len]} />
                        <primitive object={m.dirt} attach="material" />
                    </mesh>
                );
            })}

            {/* The green wall — three rings + the low hedge + the lip */}
            <instancedMesh ref={wallALowRef} args={[undefined, undefined, wallAlow.length]} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopy} attach="material" />
            </instancedMesh>
            <instancedMesh ref={wallARef} args={[undefined, undefined, wallA.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDeep} attach="material" />
            </instancedMesh>
            <instancedMesh ref={wallDRef} args={[undefined, undefined, wallD.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDeep} attach="material" />
            </instancedMesh>
            <instancedMesh ref={wallBRef} args={[undefined, undefined, wallB.length]} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDark} attach="material" />
            </instancedMesh>
            {wallC.length > 0 && (
                <instancedMesh ref={wallCRef} args={[undefined, undefined, wallC.length]} frustumCulled={false}>
                    <icosahedronGeometry args={[1, 1]} />
                    <primitive object={mats.canopyDark} attach="material" />
                </instancedMesh>
            )}
            {lip.length > 0 && (
                <instancedMesh ref={lipRef} args={[undefined, undefined, lip.length]} frustumCulled={false}>
                    <icosahedronGeometry args={[1, 1]} />
                    <primitive object={mats.canopyDeep} attach="material" />
                </instancedMesh>
            )}

            {/* Forest band behind the wall */}
            <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow={sh} frustumCulled={false}>
                <cylinderGeometry args={[0.32, 0.55, 7, low ? 5 : 9]} />
                {/* Bark, not the interior's dark furniture wood */}
                <primitive object={m.bark} attach="material" />
            </instancedMesh>
            <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopy} attach="material" />
            </instancedMesh>
            <instancedMesh ref={giantTrunkRef} args={[undefined, undefined, giants.length]} castShadow={sh} frustumCulled={false}>
                <cylinderGeometry args={[0.5, 0.9, 7, 10]} />
                <primitive object={m.bark} attach="material" />
            </instancedMesh>
            <instancedMesh ref={giantCanopyRef} args={[undefined, undefined, giants.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDeep} attach="material" />
            </instancedMesh>

            {/* Understory */}
            <instancedMesh ref={fernRef} args={[undefined, undefined, ferns.length]} frustumCulled={false}>
                <coneGeometry args={[1.05, 1.5, 6]} />
                <primitive object={mats.frond} attach="material" />
            </instancedMesh>
            <instancedMesh ref={leafRef} args={[undefined, undefined, leaves.length]} frustumCulled={false}>
                <sphereGeometry args={[1, low ? 6 : 8, 5]} />
                <primitive object={mats.broad} attach="material" />
            </instancedMesh>
            <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 0]} />
                <primitive object={m.stone} attach="material" />
            </instancedMesh>
            {logs.length > 0 && (
                <instancedMesh ref={logRef} args={[undefined, undefined, logs.length]} castShadow={sh} frustumCulled={false}>
                    <cylinderGeometry args={[1, 1, 1, 7]} />
                    <primitive object={m.woodDark} attach="material" />
                </instancedMesh>
            )}

            {/* Ground mist — slow-turning soft discs of humid air */}
            {mistTex &&
                MISTS.map((mi, i) => (
                    <mesh
                        key={`mist-${i}`}
                        ref={(el) => {
                            mistRefs.current[i] = el;
                        }}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[mi.x, mi.y, mi.z]}
                    >
                        <planeGeometry args={[mi.s, mi.s]} />
                        <meshBasicMaterial
                            map={mistTex}
                            transparent
                            opacity={0.16}
                            depthWrite={false}
                            fog={false}
                        />
                    </mesh>
                ))}

            {/* Fireflies */}
            {flies && (
                <points ref={flyRef} frustumCulled={false}>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" args={[flies.pos, 3]} />
                    </bufferGeometry>
                    <pointsMaterial
                        size={0.16}
                        color="#fbbf24"
                        transparent
                        opacity={0.55}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        sizeAttenuation
                    />
                </points>
            )}
        </group>
    );
}
