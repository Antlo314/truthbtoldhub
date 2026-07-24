'use client';

/**
 * Front + back yards · side wrap · fence · atmosphere props.
 * Procedural only — matches house free-material style.
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import { seededRng } from './houseSkins';
import { YARD } from './houseMap';

function MatBox({
    pos,
    size,
    material,
    shadows = true,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    material: THREE.Material;
    shadows?: boolean;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={size} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

function MatCyl({
    pos,
    r,
    h,
    material,
    shadows = true,
    segs = 10,
}: {
    pos: [number, number, number];
    r: number;
    h: number;
    material: THREE.Material;
    shadows?: boolean;
    segs?: number;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <cylinderGeometry args={[r, r, h, segs]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

function Tree({
    x,
    z,
    scale = 1,
    sh,
    m,
    low,
}: {
    x: number;
    z: number;
    scale?: number;
    sh: boolean;
    m: HouseMaterials;
    low?: boolean;
}) {
    const s = scale;
    const segs = low ? 6 : 10;
    return (
        <group position={[x, 0, z]}>
            <MatCyl pos={[0, 0.7 * s, 0]} r={0.14 * s} h={1.4 * s} material={m.woodDark} shadows={sh} segs={segs} />
            <mesh position={[0, 1.85 * s, 0]} castShadow={sh}>
                <sphereGeometry args={[0.85 * s, low ? 8 : 12, low ? 6 : 10]} />
                <primitive object={m.leaf} attach="material" />
            </mesh>
            {!low && (
                <mesh position={[0.35 * s, 1.55 * s, 0.2 * s]} castShadow={false}>
                    <sphereGeometry args={[0.45 * s, 8, 6]} />
                    <primitive object={m.leaf} attach="material" />
                </mesh>
            )}
        </group>
    );
}

function Bush({ x, z, scale = 1, m }: { x: number; z: number; scale?: number; m: HouseMaterials }) {
    return (
        <mesh position={[x, 0.35 * scale, z]}>
            <sphereGeometry args={[0.45 * scale, 8, 6]} />
            <primitive object={m.leaf} attach="material" />
        </mesh>
    );
}

function FenceRun({
    from,
    to,
    posts,
    m,
    sh,
}: {
    from: [number, number];
    to: [number, number];
    posts: number;
    m: HouseMaterials;
    sh: boolean;
}) {
    const [x0, z0] = from;
    const [x1, z1] = to;
    const items: ReactNode[] = [];
    for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        items.push(
            <MatCyl key={`p-${i}`} pos={[x, 0.55, z]} r={0.07} h={1.1} material={m.woodDark} shadows={sh} segs={6} />,
        );
    }
    // Rails along the run
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const rotY = Math.atan2(dx, dz);
    items.push(
        <group key="rails" position={[mx, 0, mz]} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.78, 0]} size={[0.08, 0.08, len]} material={m.wood} shadows={false} />
            <MatBox pos={[0, 0.42, 0]} size={[0.08, 0.08, len]} material={m.wood} shadows={false} />
        </group>,
    );
    return <group>{items}</group>;
}

function Bench({ x, z, rotY = 0, sh, m }: { x: number; z: number; rotY?: number; sh: boolean; m: HouseMaterials }) {
    return (
        <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.42, 0]} size={[1.55, 0.08, 0.48]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 0.72, -0.18]} size={[1.55, 0.42, 0.08]} material={m.woodDark} shadows={sh} />
            <MatCyl pos={[-0.6, 0.2, 0.12]} r={0.05} h={0.4} material={m.woodDark} shadows={false} segs={6} />
            <MatCyl pos={[0.6, 0.2, 0.12]} r={0.05} h={0.4} material={m.woodDark} shadows={false} segs={6} />
            <MatCyl pos={[-0.6, 0.2, -0.12]} r={0.05} h={0.4} material={m.woodDark} shadows={false} segs={6} />
            <MatCyl pos={[0.6, 0.2, -0.12]} r={0.05} h={0.4} material={m.woodDark} shadows={false} segs={6} />
        </group>
    );
}

function LanternPost({
    x,
    z,
    sh,
    m,
    lit,
}: {
    x: number;
    z: number;
    sh: boolean;
    m: HouseMaterials;
    lit?: boolean;
}) {
    return (
        <group position={[x, 0, z]}>
            <MatCyl pos={[0, 0.7, 0]} r={0.06} h={1.4} material={m.woodDark} shadows={sh} segs={6} />
            <MatBox pos={[0, 1.45, 0]} size={[0.28, 0.22, 0.28]} material={m.metalDark} shadows={false} />
            <mesh position={[0, 1.45, 0]}>
                <boxGeometry args={[0.18, 0.14, 0.18]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#f59e0b"
                    emissiveIntensity={lit ? 0.85 : 0.35}
                    toneMapped={false}
                />
            </mesh>
            {lit && <pointLight position={[0, 1.5, 0]} intensity={0.55} distance={5} color="#fbbf24" decay={2} />}
        </group>
    );
}

function GardenBed({ x, z, w, d, m, sh }: { x: number; z: number; w: number; d: number; m: HouseMaterials; sh: boolean }) {
    return (
        <group position={[x, 0, z]}>
            <MatBox pos={[0, 0.12, 0]} size={[w, 0.24, d]} material={m.woodDark} shadows={sh} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} receiveShadow={sh}>
                <planeGeometry args={[w - 0.12, d - 0.12]} />
                <primitive object={m.dirt} attach="material" />
            </mesh>
            {/* Simple plant puffs */}
            {[
                [-w * 0.25, d * 0.15],
                [0.05, -d * 0.1],
                [w * 0.22, d * 0.08],
            ].map(([px, pz], i) => (
                <mesh key={i} position={[px, 0.42, pz]}>
                    <sphereGeometry args={[0.18 + (i % 2) * 0.06, 8, 6]} />
                    <primitive object={m.leaf} attach="material" />
                </mesh>
            ))}
        </group>
    );
}

function FirePit({ x, z, m, sh, low }: { x: number; z: number; m: HouseMaterials; sh: boolean; low?: boolean }) {
    return (
        <group position={[x, 0, z]}>
            <MatCyl pos={[0, 0.12, 0]} r={0.85} h={0.22} material={m.stone} shadows={sh} segs={low ? 10 : 16} />
            <MatCyl pos={[0, 0.18, 0]} r={0.55} h={0.12} material={m.concrete} shadows={false} segs={low ? 8 : 12} />
            <MatBox pos={[0, 0.22, 0]} size={[0.35, 0.12, 0.12]} material={m.woodDark} shadows={false} />
            <MatBox pos={[0.08, 0.28, 0.05]} size={[0.12, 0.1, 0.28]} material={m.woodDark} shadows={false} />
            {!low && (
                <mesh position={[0, 0.38, 0]}>
                    <sphereGeometry args={[0.12, 8, 6]} />
                    <meshStandardMaterial
                        color="#ff6b2c"
                        emissive="#ff6b2c"
                        emissiveIntensity={0.9}
                        toneMapped={false}
                    />
                </mesh>
            )}
        </group>
    );
}

/** Gradient sky sphere + moon sprite — gives the yard a real horizon */
function SkyDome({ m, low }: { m: HouseMaterials; low: boolean }) {
    return (
        <group>
            {/* Radius 42: worst-case cam-to-far-side ≈ 42+28 < mobile far 72 */}
            <mesh frustumCulled={false}>
                <sphereGeometry args={[42, low ? 20 : 32, low ? 12 : 18]} />
                <primitive object={m.sky} attach="material" />
            </mesh>
            <mesh
                position={[-19, 24, -26]}
                onUpdate={(self: THREE.Mesh) => self.lookAt(0, 3, 0)}
            >
                <planeGeometry args={[8, 8]} />
                <primitive object={m.moon} attach="material" />
            </mesh>
        </group>
    );
}

const TUFT_COUNT = 180;
const FLOWER_COUNT = 84;
const FLOWER_COLORS = ['#f0abfc', '#fda4af', '#fcd34d', '#e2e8f0', '#c4b5fd', '#93c5fd'];
/** [x, z, y] — y raised on the garden beds */
const FLOWER_CLUSTERS: [number, number, number][] = [
    [-2.7, 15.7, 0.12],
    [5.6, 16.6, 0.12],
    [-5.4, 18.0, 0.12],
    [-5.5, -16.2, 0.34],
    [4.8, -15.8, 0.34],
    [6.8, -14.0, 0.12],
    [-8.0, -14.5, 0.12],
    [5.3, 13.4, 0.12], // beside the porch
    [2.0, 20.3, 0.12], // inside the front gate
    [-4.0, 17.6, 0.12], // around the birdbath
];

/** Instanced grass tufts + flower patches — desktop only (2 draw calls) */
function Meadow({ m }: { m: HouseMaterials }) {
    const tuftGeo = useMemo(() => new THREE.ConeGeometry(0.055, 0.3, 4), []);
    const flowerGeo = useMemo(() => new THREE.SphereGeometry(0.05, 6, 4), []);
    const flowerMat = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65 }),
        [],
    );
    const tuftRef = useRef<THREE.InstancedMesh>(null);
    const flowerRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        const tufts = tuftRef.current;
        const flowers = flowerRef.current;
        if (!tufts || !flowers) return;
        const rnd = seededRng(4242);
        const dummy = new THREE.Object3D();
        let placed = 0;
        let guard = 0;
        while (placed < TUFT_COUNT && guard++ < TUFT_COUNT * 40) {
            const x = -17 + rnd() * 34;
            const z = -20.6 + rnd() * 41.2;
            if (Math.abs(x) < 14.4 && Math.abs(z) < 13.4) continue; // house + margin
            if (Math.abs(x - 3.5) < 1.6 && z > 12) continue; // front walk
            if (x > -4.6 && x < -1.9 && z < -12.6) continue; // back walk
            if (Math.abs(Math.abs(x) - 15.2) < 1.0) continue; // side paths
            if (Math.hypot(x - 0.15, z + 16.8) < 1.5) continue; // fire pit
            if (Math.abs(x) < 1.9 && z < -18.2) continue; // gate path
            if (x < -11.9 && z < -16.9) continue; // garden shed
            const sc = 0.7 + rnd() * 0.9;
            const sy = 0.75 + rnd();
            dummy.position.set(x, 0.15 * sy, z);
            dummy.rotation.set(0, rnd() * Math.PI, 0);
            dummy.scale.set(sc, sy, sc);
            dummy.updateMatrix();
            tufts.setMatrixAt(placed, dummy.matrix);
            placed++;
        }
        tufts.count = placed;
        tufts.instanceMatrix.needsUpdate = true;

        const color = new THREE.Color();
        for (let i = 0; i < FLOWER_COUNT; i++) {
            const [cx, cz, cy] = FLOWER_CLUSTERS[i % FLOWER_CLUSTERS.length];
            const sc = 0.7 + rnd() * 0.7;
            dummy.position.set(
                cx + (rnd() - 0.5) * 1.5,
                cy + 0.05 + rnd() * 0.08,
                cz + (rnd() - 0.5) * 1.1,
            );
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(sc, sc * 0.75, sc);
            dummy.updateMatrix();
            flowers.setMatrixAt(i, dummy.matrix);
            flowers.setColorAt(i, color.set(FLOWER_COLORS[i % FLOWER_COLORS.length]));
        }
        flowers.instanceMatrix.needsUpdate = true;
        if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    }, []);

    return (
        <group>
            <instancedMesh ref={tuftRef} args={[tuftGeo, m.leaf, TUFT_COUNT]} frustumCulled={false} receiveShadow />
            <instancedMesh ref={flowerRef} args={[flowerGeo, flowerMat, FLOWER_COUNT]} frustumCulled={false} />
        </group>
    );
}

/** Flat stepping-stone discs — back step → fire pit, front walk → bench */
const STEPPING_STONES: [number, number][] = [
    [-2.8, -14.1],
    [-2.15, -14.9],
    [-1.4, -15.55],
    [-0.65, -16.1],
    [2.3, 15.9],
    [1.5, 16.15],
];

function Gate({ x, z, m, sh }: { x: number; z: number; m: HouseMaterials; sh: boolean }) {
    return (
        <group position={[x, 0, z]}>
            <MatCyl pos={[-1.35, 0.85, 0]} r={0.1} h={1.7} material={m.woodDark} shadows={sh} segs={6} />
            <MatCyl pos={[1.35, 0.85, 0]} r={0.1} h={1.7} material={m.woodDark} shadows={sh} segs={6} />
            <MatBox pos={[0, 1.55, 0]} size={[2.5, 0.12, 0.12]} material={m.wood} shadows={false} />
            {/* Closed-looking panels with a small gap feel — still walkable in map */}
            <MatBox pos={[-0.55, 0.75, 0.05]} size={[1.0, 1.2, 0.08]} material={m.wood} shadows={sh} />
            <MatBox pos={[0.55, 0.75, 0.05]} size={[1.0, 1.2, 0.08]} material={m.wood} shadows={sh} />
            <MatCyl pos={[-0.1, 0.7, 0.12]} r={0.04} h={0.08} material={m.gold} shadows={false} segs={6} />
        </group>
    );
}

export default function YardGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;

    // Ground covers house footprint + yards; house floor sits slightly above (y=0 wood)
    const groundY = -0.02;

    return (
        <group>
            {/* Sky dome + moon — horizon instead of flat fog color */}
            <SkyDome m={m} low={low} />

            {/* Base grass under whole property */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, 0]} receiveShadow={sh}>
                <planeGeometry args={[36, 44]} />
                <primitive object={m.grass} attach="material" />
            </mesh>

            {/* Front path — porch to the front gate */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, groundY + 0.015, 17.3]} receiveShadow={sh}>
                <planeGeometry args={[2.2, 8.2]} />
                <primitive object={m.path} attach="material" />
            </mesh>
            {/* Side path strips (wrap feel) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15.2, groundY + 0.012, 0]} receiveShadow={sh}>
                <planeGeometry args={[1.4, 28]} />
                <primitive object={m.path} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15.2, groundY + 0.012, 0]} receiveShadow={sh}>
                <planeGeometry args={[1.4, 28]} />
                <primitive object={m.path} attach="material" />
            </mesh>
            {/* Back yard path to gate */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.25, groundY + 0.015, -16.5]} receiveShadow={sh}>
                <planeGeometry args={[1.8, 7.5]} />
                <primitive object={m.path} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY + 0.015, -18.8]} receiveShadow={sh}>
                <planeGeometry args={[2.4, 3.2]} />
                <primitive object={m.path} attach="material" />
            </mesh>

            {/* Property fence — front run split at the new front gate */}
            <FenceRun from={[-17.5, 21.4]} to={[2.2, 21.4]} posts={low ? 6 : 10} m={m} sh={sh} />
            <FenceRun from={[4.8, 21.4]} to={[17.5, 21.4]} posts={low ? 4 : 7} m={m} sh={sh} />
            <FenceRun from={[-17.5, -21.4]} to={[-1.6, -21.4]} posts={low ? 5 : 8} m={m} sh={sh} />
            <FenceRun from={[1.6, -21.4]} to={[17.5, -21.4]} posts={low ? 5 : 8} m={m} sh={sh} />
            <FenceRun from={[-17.5, -21.4]} to={[-17.5, 21.4]} posts={low ? 8 : 14} m={m} sh={sh} />
            <FenceRun from={[17.5, -21.4]} to={[17.5, 21.4]} posts={low ? 8 : 14} m={m} sh={sh} />

            <Gate x={0} z={-21.35} m={m} sh={sh} />
            {/* Front gate at the walk */}
            <Gate x={YARD.frontGate.x} z={YARD.frontGate.z} m={m} sh={sh} />

            {/* Mailbox beside the front gate */}
            <group position={[YARD.mailbox.x, 0, YARD.mailbox.z]} rotation={[0, -0.2, 0]}>
                <MatCyl pos={[0, 0.5, 0]} r={0.05} h={1.0} material={m.woodDark} shadows={sh} segs={6} />
                <MatBox pos={[0, 1.12, 0]} size={[0.32, 0.28, 0.5]} material={m.metal} shadows={sh} />
                <MatBox pos={[0, 1.12, -0.26]} size={[0.3, 0.26, 0.03]} material={m.metalDark} shadows={false} />
                <MatBox pos={[0.18, 1.28, 0.1]} size={[0.03, 0.18, 0.04]} material={m.ember} shadows={false} />
            </group>

            {/* Birdbath in the west front yard */}
            <group position={[YARD.birdbath.x, 0, YARD.birdbath.z]}>
                <MatCyl pos={[0, 0.42, 0]} r={0.12} h={0.84} material={m.stone} shadows={sh} segs={low ? 8 : 12} />
                <MatCyl pos={[0, 0.88, 0]} r={0.42} h={0.09} material={m.stone} shadows={sh} segs={low ? 10 : 16} />
                <MatCyl pos={[0, 0.93, 0]} r={0.34} h={0.02} material={m.glassTint} shadows={false} segs={low ? 10 : 16} />
            </group>

            {/* Garden shed — back NW corner */}
            <group position={[YARD.shed.x, 0, YARD.shed.z]}>
                <MatBox pos={[0, 0.05, 0]} size={[2.9, 0.1, 2.4]} material={m.concrete} shadows={false} />
                {/* Walls (door on the south face, panel closed) */}
                <MatBox pos={[0, 1.0, -1.1]} size={[2.8, 1.9, 0.1]} material={m.wood} shadows={sh} />
                <MatBox pos={[-0.925, 1.0, 1.1]} size={[0.95, 1.9, 0.1]} material={m.wood} shadows={sh} />
                <MatBox pos={[0.925, 1.0, 1.1]} size={[0.95, 1.9, 0.1]} material={m.wood} shadows={sh} />
                <MatBox pos={[-1.35, 1.0, 0]} size={[0.1, 1.9, 2.3]} material={m.wood} shadows={sh} />
                <MatBox pos={[1.35, 1.0, 0]} size={[0.1, 1.9, 2.3]} material={m.wood} shadows={sh} />
                {/* Closed door leaf + handle */}
                <MatBox pos={[0, 0.92, 1.12]} size={[0.85, 1.72, 0.06]} material={m.woodDark} shadows={sh} />
                <MatCyl pos={[0.28, 0.95, 1.17]} r={0.03} h={0.05} material={m.gold} shadows={false} segs={6} />
                {/* Mono-pitch roof */}
                <group rotation={[0.14, 0, 0]}>
                    <MatBox pos={[0, 2.12, 0]} size={[3.15, 0.1, 2.75]} material={m.woodDark} shadows={sh} />
                </group>
            </group>

            {/* Back patio behind the garden door */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.25, groundY + 0.018, -14.0]} receiveShadow={sh}>
                <planeGeometry args={[3.4, 2.6]} />
                <primitive object={m.stone} attach="material" />
            </mesh>

            {/* Front yard props */}
            <Bench x={YARD.benchFront.x} z={YARD.benchFront.z} rotY={-0.35} sh={sh} m={m} />
            <LanternPost x={YARD.lanternL.x} z={YARD.lanternL.z} sh={sh} m={m} lit={!low} />
            <LanternPost x={YARD.lanternR.x} z={YARD.lanternR.z} sh={sh} m={m} lit={!low} />

            {/* Trees clear of house shell (canopy margin ≥1m past walls at ±13.8 / ±12.5) */}
            {YARD.trees.map((t, i) =>
                low && i >= 4 ? null : (
                    <Tree key={`t-${i}`} x={t.x} z={t.z} scale={0.9 + (i % 3) * 0.08} sh={sh} m={m} low={low} />
                ),
            )}
            {YARD.bushes.map((b, i) =>
                low && i >= 3 ? null : <Bush key={`b-${i}`} x={b.x} z={b.z} scale={0.7 + b.r} m={m} />,
            )}

            {/* Back yard */}
            <GardenBed x={YARD.bedW.x} z={YARD.bedW.z} w={2.2} d={1.1} m={m} sh={sh} />
            <GardenBed x={YARD.bedE.x} z={YARD.bedE.z} w={1.9} d={1.0} m={m} sh={sh} />
            <FirePit x={YARD.firePit.x} z={YARD.firePit.z} m={m} sh={sh} low={low} />
            <Bench x={YARD.benchBack.x} z={YARD.benchBack.z} rotY={Math.PI * 0.85} sh={sh} m={m} />

            {/* Stepping stones — flat, walkable, no colliders */}
            {STEPPING_STONES.map(([sx, sz], i) => (
                <MatCyl
                    key={`ss-${i}`}
                    pos={[sx, 0.03, sz]}
                    r={0.3 + (i % 3) * 0.04}
                    h={0.06}
                    material={m.path}
                    shadows={false}
                    segs={low ? 8 : 10}
                />
            ))}

            {/* Instanced grass tufts + flower patches (desktop) */}
            {!low && <Meadow m={m} />}

            {/* Soft outdoor fill (desktop) */}
            {!low && (
                <>
                    <pointLight position={[0, 3.5, 16]} intensity={0.45} distance={18} color="#a8c4ff" decay={2} />
                    <pointLight position={[-3, 3.2, -16]} intensity={0.4} distance={16} color="#c4b5fd" decay={2} />
                    <pointLight position={[0, 2.2, -16.8]} intensity={0.55} distance={7} color="#ff8a3d" decay={2} />
                </>
            )}
        </group>
    );
}
