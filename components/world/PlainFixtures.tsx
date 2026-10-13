'use client';

/**
 * The hand-placed things: signposts at the forks, the pier over the still
 * water, the shrine on the summit, lanterns that light at dusk, the
 * shepherd's camp — and the pickups the quests send you after, glowing
 * where they lie until you take them.
 */
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { heightAt, WATER_Y } from '@/lib/world/terrain';
import { FIXTURES, PICKUP_LIFT, PIER, pickups, type Pickup, type PickupKind } from '@/lib/world/plain';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import { useHouseMaterials } from '@/components/truthos/house/HouseMaterials';

const K = '/models/kenney';
const MODEL = {
    signpost: `${K}/survival-kit/signpost.glb`,
    lantern: `${K}/fantasy-town-kit/lantern.glb`,
    campfire: `${K}/survival-kit/campfire-pit.glb`,
    tent: `${K}/survival-kit/tent-canvas.glb`,
};

function Model({ url, scale, shadows }: { url: string; scale: number; shadows: boolean }) {
    const gltf = useGLTF(url);
    const scene = useMemo(() => {
        const s = gltf.scene.clone(true);
        s.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
                m.castShadow = shadows;
                m.receiveShadow = shadows;
            }
        });
        return s;
    }, [gltf.scene, shadows]);
    return <primitive object={scene} scale={scale} />;
}

/** A flame-coloured point that only burns in the dark */
function NightLight({ position, color = '#ffb366', intensity = 7, distance = 16 }: { position: [number, number, number]; color?: string; intensity?: number; distance?: number }) {
    const ref = useRef<THREE.PointLight>(null);
    useFrame(({ clock }) => {
        const l = ref.current;
        if (!l) return;
        const dark = 1 - Math.min(1, getSky().daylight * 1.4);
        const flicker = 0.9 + Math.sin(clock.elapsedTime * 9 + position[0]) * 0.06 + Math.sin(clock.elapsedTime * 23 + position[2]) * 0.04;
        l.intensity = intensity * dark * flicker;
        l.visible = l.intensity > 0.05;
    });
    return <pointLight ref={ref} position={position} color={color} intensity={0} distance={distance} decay={2} />;
}

function Pier({ x, z, yaw, shadows }: { x: number; z: number; yaw: number; shadows: boolean }) {
    const m = useHouseMaterials(false);
    const y = PIER.deckY - 0.08;
    return (
        <group position={[x, y, z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0, (PIER.len - 1) / 2]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[PIER.w, 0.16, PIER.len + 1]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            {[-1.1, 1.1].map((px) =>
                [1, 5, 9, 13].map((pz) => (
                    <mesh key={`${px}-${pz}`} position={[px, -1.1, pz]} castShadow={shadows}>
                        <cylinderGeometry args={[0.12, 0.14, 2.6, 8]} />
                        <primitive object={m.woodDark} attach="material" />
                    </mesh>
                )),
            )}
            {/* a lantern post at the end */}
            <mesh position={[1.05, 0.9, 14.4]} castShadow={shadows}>
                <cylinderGeometry args={[0.06, 0.07, 1.8, 8]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            <NightLight position={[1.05, 1.9, 14.4]} color="#ffd08a" intensity={5} distance={12} />
        </group>
    );
}

function Shrine({ x, z, shadows }: { x: number; z: number; shadows: boolean }) {
    const m = useHouseMaterials(false);
    const y = heightAt(x, z);
    const ring = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.12;
    });
    return (
        <group position={[x, y, z]}>
            {/* a stone platform and a ring of seven standing stones */}
            <mesh position={[0, 0.2, 0]} receiveShadow={shadows}>
                <cylinderGeometry args={[7.5, 8.2, 0.5, 24]} />
                <primitive object={m.cobble} attach="material" />
            </mesh>
            {Array.from({ length: 7 }, (_, i) => {
                const a = (i / 7) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(a) * 6, 1.6, Math.sin(a) * 6]} rotation={[0, -a, 0]} castShadow={shadows} receiveShadow={shadows}>
                        <boxGeometry args={[1.1, 2.8, 0.6]} />
                        <primitive object={m.basalt} attach="material" />
                    </mesh>
                );
            })}
            {/* the altar and the mark above it */}
            <mesh position={[0, 0.85, 0]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[1.8, 0.8, 1.2]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh ref={ring} position={[0, 3.2, 0]}>
                <torusGeometry args={[1.1, 0.07, 10, 48]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <pointLight position={[0, 3.2, 0]} color="#ffe2a8" intensity={6} distance={18} decay={2} />
        </group>
    );
}

export function Fixtures({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    return (
        <group>
            {FIXTURES.map((f, i) => {
                if (f.kind === 'pier') return <Pier key={i} x={f.x} z={f.z} yaw={f.yaw} shadows={shadows} />;
                if (f.kind === 'shrine') return <Shrine key={i} x={f.x} z={f.z} shadows={shadows} />;
                const y = heightAt(f.x, f.z);
                if (f.kind === 'signpost')
                    return (
                        <group key={i} position={[f.x, y - 0.02, f.z]} rotation={[0, f.yaw, 0]}>
                            <Suspense fallback={null}>
                                <Model url={MODEL.signpost} scale={4.2} shadows={shadows} />
                            </Suspense>
                        </group>
                    );
                if (f.kind === 'lantern')
                    return (
                        <group key={i} position={[f.x, y - 0.02, f.z]}>
                            <Suspense fallback={null}>
                                <Model url={MODEL.lantern} scale={1.2} shadows={shadows} />
                            </Suspense>
                            <NightLight position={[0, 1.75, 0]} intensity={low ? 5 : 8} />
                        </group>
                    );
                if (f.kind === 'campfire')
                    return (
                        <group key={i} position={[f.x, y - 0.02, f.z]}>
                            <Suspense fallback={null}>
                                <Model url={MODEL.campfire} scale={2.6} shadows={shadows} />
                            </Suspense>
                            <Flame />
                            <NightLight position={[0, 0.9, 0]} color="#ff9a4a" intensity={low ? 6 : 10} distance={20} />
                        </group>
                    );
                if (f.kind === 'tent')
                    return (
                        <group key={i} position={[f.x, y - 0.02, f.z]} rotation={[0, f.yaw, 0]}>
                            <Suspense fallback={null}>
                                <Model url={MODEL.tent} scale={3.2} shadows={shadows} />
                            </Suspense>
                        </group>
                    );
                if (f.kind === 'stall') return <Stall key={i} x={f.x} z={f.z} yaw={f.yaw} y={y} shadows={shadows} />;
                if (f.kind === 'seat')
                    return (
                        <mesh key={i} position={[f.x, y + 0.2, f.z]} castShadow={shadows} receiveShadow={shadows}>
                            <cylinderGeometry args={[0.32, 0.38, 0.44, 9]} />
                            <meshStandardMaterial color="#6b6460" roughness={0.95} />
                        </mesh>
                    );
                return null;
            })}
        </group>
    );
}

/** Lydia's stall: four poles, a purple awning, a table of goods */
function Stall({ x, z, yaw, y, shadows }: { x: number; z: number; yaw: number; y: number; shadows: boolean }) {
    const m = useHouseMaterials(false);
    return (
        <group position={[x, y, z]} rotation={[0, yaw, 0]}>
            {[-1, 1].map((sx) =>
                [-0.7, 0.7].map((sz) => (
                    <mesh key={`${sx}${sz}`} position={[sx * 1.1, 1.15, sz]} castShadow={shadows}>
                        <cylinderGeometry args={[0.04, 0.05, 2.3, 6]} />
                        <primitive object={m.woodDark} attach="material" />
                    </mesh>
                )),
            )}
            <mesh position={[0, 2.32, 0]} rotation={[0.12, 0, 0]} castShadow={shadows}>
                <boxGeometry args={[2.6, 0.05, 1.8]} />
                <meshStandardMaterial color="#6d28d9" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.78, 0]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[2.1, 0.08, 1.0]} />
                <primitive object={m.wood} attach="material" />
            </mesh>
            {/* loaves, a jar of oil, a fish, a staff leaning */}
            {[[-0.6, '#c08a4a'], [-0.3, '#b97b3c'], [0.0, '#d9a35b']].map(([px, c]) => (
                <mesh key={String(px)} position={[px as number, 0.88, 0.1]} scale={[1.3, 0.8, 1]} castShadow={shadows}>
                    <sphereGeometry args={[0.11, 10, 8]} />
                    <meshStandardMaterial color={c as string} roughness={0.9} />
                </mesh>
            ))}
            <mesh position={[0.45, 0.94, -0.15]} castShadow={shadows}>
                <cylinderGeometry args={[0.08, 0.1, 0.24, 10]} />
                <meshStandardMaterial color="#a3a35a" roughness={0.6} />
            </mesh>
            <mesh position={[0.75, 0.87, 0.2]} rotation={[0, 0.4, Math.PI / 2]} castShadow={shadows}>
                <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
                <meshStandardMaterial color="#9fb3c8" roughness={0.5} metalness={0.2} />
            </mesh>
            <mesh position={[1.2, 1.1, 0.75]} rotation={[0.25, 0, 0.15]} castShadow={shadows}>
                <cylinderGeometry args={[0.025, 0.03, 2.0, 6]} />
                <meshStandardMaterial color="#5b3a1e" roughness={0.85} />
            </mesh>
        </group>
    );
}

function Flame() {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        const m = ref.current;
        if (!m) return;
        const t = clock.elapsedTime;
        m.scale.set(1 + Math.sin(t * 11) * 0.08, 1 + Math.sin(t * 7.3) * 0.16, 1 + Math.cos(t * 9.1) * 0.08);
        m.rotation.y = t * 1.3;
    });
    return (
        <mesh ref={ref} position={[0, 0.55, 0]}>
            <coneGeometry args={[0.32, 0.9, 7]} />
            <meshBasicMaterial color="#ffb347" transparent opacity={0.85} toneMapped={false} />
        </mesh>
    );
}

/* ── pickups ─────────────────────────────────────────────────── */

const PICK_COLOR: Record<PickupKind, string> = { mote: '#ffe9a8', lily: '#f6b2d6', ember: '#ff7a3a', scroll: '#d9c7a0' };

function PickupMesh({ p, wanted, taken }: { p: Pickup; wanted: boolean; taken: boolean }) {
    const ref = useRef<THREE.Group>(null);
    const base = p.kind === 'lily' ? WATER_Y : heightAt(p.x, p.z);
    const lift = PICKUP_LIFT[p.kind];
    useFrame(({ clock }) => {
        const g = ref.current;
        if (!g) return;
        const t = clock.elapsedTime + p.x * 0.3;
        g.position.y = base + lift + Math.sin(t * 1.7) * 0.12;
        g.rotation.y = t * 0.8;
        const s = taken ? Math.max(0, g.scale.x - 0.08) : Math.min(1, g.scale.x + 0.05);
        g.scale.setScalar(s);
        g.visible = s > 0.01;
    });
    const color = PICK_COLOR[p.kind];
    return (
        <group ref={ref} position={[p.x, base + lift, p.z]} scale={0}>
            {p.kind === 'scroll' ? (
                <mesh castShadow>
                    <cylinderGeometry args={[0.09, 0.09, 0.5, 10]} />
                    <meshStandardMaterial color={color} roughness={0.8} />
                </mesh>
            ) : p.kind === 'lily' ? (
                <mesh>
                    <coneGeometry args={[0.22, 0.2, 6, 1, true]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} side={THREE.DoubleSide} />
                </mesh>
            ) : (
                <mesh>
                    <icosahedronGeometry args={[p.kind === 'mote' ? 0.16 : 0.13, 1]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={wanted ? 2.2 : 1.2} toneMapped={false} />
                </mesh>
            )}
            {/* a glow ring on the ground under the wanted ones */}
            {wanted && (
                <mesh position={[0, -lift + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.3, 0.42, 20]} />
                    <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
                </mesh>
            )}
            <pointLight color={color} intensity={wanted ? 1.6 : 0.6} distance={5} decay={2} />
        </group>
    );
}

export function Pickups({ taken, wanted, low = false }: { taken: Set<string>; wanted: Set<PickupKind>; low?: boolean }) {
    const list = useMemo(() => pickups(), []);
    return (
        <group>
            {list.map((p) => (
                <PickupMesh key={p.id} p={p} wanted={wanted.has(p.kind)} taken={taken.has(p.id)} />
            ))}
            {!low && <Fireflies />}
        </group>
    );
}

/** Points of light over the meadow at night — nothing to collect, just alive */
function Fireflies() {
    const ref = useRef<THREE.Points>(null);
    const mat = useRef<THREE.PointsMaterial>(null);
    const geo = useMemo(() => {
        const n = 260;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = 20 + Math.sqrt(Math.random()) * 180;
            const x = Math.cos(a) * d;
            const z = 130 + Math.sin(a) * d;
            pos[i * 3] = x;
            pos[i * 3 + 1] = heightAt(x, z) + 0.6 + Math.random() * 1.6;
            pos[i * 3 + 2] = z;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return g;
    }, []);
    useFrame(({ clock }) => {
        const dark = 1 - Math.min(1, getSky().daylight * 1.6);
        if (mat.current) mat.current.opacity = dark * (0.55 + Math.sin(clock.elapsedTime * 2.1) * 0.25);
        if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.3;
    });
    return (
        <points ref={ref} geometry={geo} frustumCulled={false}>
            <pointsMaterial ref={mat} color="#d8ff9a" size={0.14} transparent opacity={0} depthWrite={false} sizeAttenuation />
        </points>
    );
}

export function preloadFixtures() {
    for (const u of Object.values(MODEL)) useGLTF.preload(u);
}
