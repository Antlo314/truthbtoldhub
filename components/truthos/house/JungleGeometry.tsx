'use client';

/**
 * The jungle — a living landscape wrapped around one safe house.
 *
 * Replaces the suburban street. Everything is procedural and instanced:
 * canopy trees in a band from the clearing edge to the horizon ring,
 * emergent giants above them, ferns and broadleaf understory where the
 * player can see them up close, rocks and fallen logs for age, fireflies
 * over the clearing at night. Roughly nine draw calls for the whole biome.
 *
 * Placement is seeded — the same jungle grows every visit, because a
 * place you return to must be the same place. Nothing spawns inside the
 * clearing or the path corridor (jungleMap owns those shapes; the
 * colliders come from the same description).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useHouseMaterials } from './HouseMaterials';
import { seededRng } from './houseSkins';
import { CLEARING_R, PATH } from './jungleMap';

const BAND_OUT = 118; // hand off to DistantScenery's treeline just past here

/** True when a spot must stay clear — clearing, or the walked corridor. */
function keepOut(x: number, z: number): boolean {
    if (Math.hypot(x, z) < CLEARING_R + 1.5) return true;
    if (z > 0 && z < PATH.to + 6 && Math.abs(x) < PATH.halfWidth + 3.4) return true;
    return false;
}

/** Scatter n points in the band, rejecting the keep-out shapes. */
function scatter(
    rnd: () => number,
    n: number,
    rMin: number,
    rMax: number,
): { x: number; z: number; r: number }[] {
    const pts: { x: number; z: number; r: number }[] = [];
    let guard = n * 30;
    while (pts.length < n && guard-- > 0) {
        // sqrt keeps density even by area rather than bunching at the centre
        const r = Math.sqrt(rnd()) * (rMax - rMin) + rMin;
        const a = rnd() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (keepOut(x, z)) continue;
        pts.push({ x, z, r });
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

export default function JungleGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const k = low ? 0.45 : 1;

    // ── Populations (seeded — the same jungle every visit) ──
    const trees = useMemo(() => scatter(seededRng(90210), Math.floor(120 * k), CLEARING_R + 4, BAND_OUT), [k]);
    const giants = useMemo(() => scatter(seededRng(71177), low ? 4 : 10, CLEARING_R + 14, 95), [low]);
    const ferns = useMemo(() => scatter(seededRng(33311), Math.floor(150 * k), CLEARING_R - 1, 70), [k]);
    const leaves = useMemo(() => scatter(seededRng(55522), Math.floor(80 * k), CLEARING_R - 1, 78), [k]);
    const rocks = useMemo(() => scatter(seededRng(12909), Math.floor(26 * k), CLEARING_R - 4, 60), [k]);
    const logs = useMemo(() => (low ? [] : scatter(seededRng(80841), 12, CLEARING_R + 2, 58)), [low]);

    // ── Shared foliage materials — three greens make a jungle, one makes a lawn ──
    const mats = useMemo(
        () => ({
            canopy: new THREE.MeshStandardMaterial({ color: '#2e6b3a', roughness: 0.92, flatShading: true }),
            canopyDeep: new THREE.MeshStandardMaterial({ color: '#1f4d2e', roughness: 0.95, flatShading: true }),
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

    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const canopyRef = useRef<THREE.InstancedMesh>(null);
    const canopy2Ref = useRef<THREE.InstancedMesh>(null);
    const giantTrunkRef = useRef<THREE.InstancedMesh>(null);
    const giantCanopyRef = useRef<THREE.InstancedMesh>(null);
    const fernRef = useRef<THREE.InstancedMesh>(null);
    const leafRef = useRef<THREE.InstancedMesh>(null);
    const rockRef = useRef<THREE.InstancedMesh>(null);
    const logRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        const rnd = seededRng(46664);

        // Trees: tapered trunk, then two canopy blobs stacked with jitter
        const heights = trees.map(() => 6 + rnd() * 7);
        fill(trunkRef.current, trees, (i, p) => {
            const h = heights[i];
            _p.set(p.x, h / 2, p.z);
            _e.set((rnd() - 0.5) * 0.08, rnd() * Math.PI, (rnd() - 0.5) * 0.08);
            _s.set(0.8 + rnd() * 0.5, h / 7, 0.8 + rnd() * 0.5);
        });
        fill(canopyRef.current, trees, (i, p) => {
            const h = heights[i];
            const w = 2.6 + rnd() * 2.2;
            _p.set(p.x + (rnd() - 0.5) * 1.2, h - 0.4, p.z + (rnd() - 0.5) * 1.2);
            _e.set(rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3);
            _s.set(w, w * (0.55 + rnd() * 0.2), w);
        });
        fill(canopy2Ref.current, trees, (i, p) => {
            const h = heights[i];
            const w = 1.7 + rnd() * 1.6;
            _p.set(p.x + (rnd() - 0.5) * 2.2, h - 1.5 - rnd(), p.z + (rnd() - 0.5) * 2.2);
            _e.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
            _s.set(w, w * 0.5, w);
        });

        // Emergents — the giants that break the canopy line
        const gh = giants.map(() => 15 + rnd() * 6);
        fill(giantTrunkRef.current, giants, (i, p) => {
            _p.set(p.x, gh[i] / 2, p.z);
            _e.set(0, rnd() * Math.PI, (rnd() - 0.5) * 0.05);
            _s.set(1.7 + rnd() * 0.6, gh[i] / 7, 1.7 + rnd() * 0.6);
        });
        fill(giantCanopyRef.current, giants, (i, p) => {
            const w = 6 + rnd() * 3;
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
    }, [trees, giants, ferns, leaves, rocks, logs]);

    // ── Fireflies — gold aether over the clearing at dusk ──
    const flyRef = useRef<THREE.Points>(null);
    const flies = useMemo(() => {
        if (low) return null;
        const N = 80;
        const pos = new Float32Array(N * 3);
        const phase = new Float32Array(N);
        const rnd = seededRng(24601);
        for (let i = 0; i < N; i++) {
            const r = 10 + rnd() * 34;
            const a = rnd() * Math.PI * 2;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = 0.6 + rnd() * 2.6;
            pos[i * 3 + 2] = Math.sin(a) * r;
            phase[i] = rnd() * Math.PI * 2;
        }
        return { pos, phase, N };
    }, [low]);

    useFrame(({ clock }) => {
        if (!flyRef.current || !flies) return;
        const t = clock.elapsedTime;
        const arr = (flyRef.current.geometry.attributes.position as THREE.BufferAttribute)
            .array as Float32Array;
        for (let i = 0; i < flies.N; i++) {
            // Slow figure-of-light wander; y bobs on its own phase
            arr[i * 3] += Math.sin(t * 0.22 + flies.phase[i]) * 0.004;
            arr[i * 3 + 1] = 0.9 + Math.sin(t * 0.5 + flies.phase[i] * 2) * 0.7 + Math.sin(flies.phase[i]) * 0.8;
            arr[i * 3 + 2] += Math.cos(t * 0.18 + flies.phase[i]) * 0.004;
        }
        (flyRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (flyRef.current.material as THREE.PointsMaterial).opacity =
            0.45 + Math.sin(t * 0.7) * 0.2;
    });

    const pathLen = PATH.to - PATH.from;

    return (
        <group>
            {/* The jungle floor — one big disc under everything */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow={sh}>
                <circleGeometry args={[240, low ? 40 : 64]} />
                <primitive object={m.grass} attach="material" />
            </mesh>

            {/* The dirt path north — the one way out, and it ends */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.02, PATH.from + pathLen / 2]}
                receiveShadow={sh}
            >
                <planeGeometry args={[PATH.halfWidth * 2, pathLen]} />
                <primitive object={m.dirt} attach="material" />
            </mesh>

            {/* Canopy trees */}
            <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow={sh} frustumCulled={false}>
                <cylinderGeometry args={[0.32, 0.55, 7, low ? 5 : 7]} />
                <primitive object={m.woodDark} attach="material" />
            </instancedMesh>
            <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopy} attach="material" />
            </instancedMesh>
            <instancedMesh ref={canopy2Ref} args={[undefined, undefined, trees.length]} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDeep} attach="material" />
            </instancedMesh>

            {/* Emergent giants */}
            <instancedMesh ref={giantTrunkRef} args={[undefined, undefined, giants.length]} castShadow={sh} frustumCulled={false}>
                <cylinderGeometry args={[0.5, 0.9, 7, 8]} />
                <primitive object={m.woodDark} attach="material" />
            </instancedMesh>
            <instancedMesh ref={giantCanopyRef} args={[undefined, undefined, giants.length]} castShadow={sh} frustumCulled={false}>
                <icosahedronGeometry args={[1, 1]} />
                <primitive object={mats.canopyDeep} attach="material" />
            </instancedMesh>

            {/* Understory — ferns (spiky cones) and broadleaf mounds */}
            <instancedMesh ref={fernRef} args={[undefined, undefined, ferns.length]} frustumCulled={false}>
                <coneGeometry args={[1.05, 1.5, 6]} />
                <primitive object={mats.frond} attach="material" />
            </instancedMesh>
            <instancedMesh ref={leafRef} args={[undefined, undefined, leaves.length]} frustumCulled={false}>
                <sphereGeometry args={[1, low ? 6 : 8, 5]} />
                <primitive object={mats.broad} attach="material" />
            </instancedMesh>

            {/* Rocks and fallen logs — a jungle has a history */}
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

            {/* Fireflies — the clearing keeps a little aether */}
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
