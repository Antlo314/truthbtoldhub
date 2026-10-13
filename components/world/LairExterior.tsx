'use client';

/**
 * The Lair as it stands on the plain — the same plan homeMap draws from
 * the inside, seen from outside. The octagonal Sanctum with its seven
 * apses and pyramid roof, the long Processional ending in the glass
 * Overlook, the four chambers off its flanks. Walls are the plan's own
 * rectangles pushed out by one wall thickness, so the door you walk up
 * to is exactly where the house thinks it is.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useHouseMaterials } from '@/components/truthos/house/HouseMaterials';
import { ALCOVE, ALCOVES, FACET_HALF, facetAngle, HALL, ROOMS, VERTEX_R, WALL_T } from '@/components/truthos/house/homeMap';

const OUTER_AP = HALL.apothem + HALL.wallT;
const ROOF_Y = HALL.eave;
const PEAK_Y = HALL.oculusY + 1.2;
/** Door posts: the walkable gap is |x| < 3.2 at the walker's centre, plus a body */
const DOOR_HALF = 3.65;

export default function LairExterior({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    const m = useHouseMaterials(low);

    // The octagon's eight outer wall slabs
    const facets = useMemo(
        () =>
            Array.from({ length: 8 }, (_, k) => {
                const a = facetAngle(k);
                return { x: Math.cos(a) * (OUTER_AP - HALL.wallT / 2), z: Math.sin(a) * (OUTER_AP - HALL.wallT / 2), yaw: -a + Math.PI / 2, len: (FACET_HALF + HALL.wallT * Math.tan(Math.PI / 8)) * 2 + 0.3 };
            }),
        [],
    );
    // Pyramid roof: an 8-sided cone, apex over the oculus
    const roof = useMemo(() => {
        const g = new THREE.CylinderGeometry(HALL.oculusR + 0.6, VERTEX_R + 1.4, PEAK_Y - ROOF_Y, 8, 1, true);
        g.rotateY(Math.PI / 8);
        return g;
    }, []);
    // Apses: a box each, out from its facet
    const apses = useMemo(
        () =>
            ALCOVES.map((al) => {
                const a = facetAngle(al.facet);
                const depth = ALCOVE.depth + HALL.wallT;
                const d = HALL.apothem + depth / 2;
                return { x: Math.cos(a) * d, z: Math.sin(a) * d, yaw: -a + Math.PI / 2, w: ALCOVE.width + WALL_T * 2, depth, h: ALCOVE.apseH + 0.4 };
            }),
        [],
    );
    const wing = { x0: -5.5 - WALL_T, x1: 5.5 + WALL_T, z0: OUTER_AP - 0.2, z1: 62.5 + WALL_T, h: 8.0 };
    const chambers = ROOMS.filter((r) => r.id !== 'processional' && r.id !== 'overlook');

    return (
        <group>
            {/* plinth under the whole footprint */}
            <mesh position={[0, -0.53, 20]} receiveShadow={shadows}>
                <boxGeometry args={[62, 0.9, 94]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            {/* the Sanctum */}
            {/* all eight facets stand whole — the plain never draws the inside, so the arch is the wing's business */}
            {facets.map((f, i) => (
                <mesh key={i} position={[f.x, ROOF_Y / 2, f.z]} rotation={[0, f.yaw, 0]} castShadow={shadows} receiveShadow={shadows}>
                    <boxGeometry args={[f.len, ROOF_Y, HALL.wallT]} />
                    <primitive object={m.rockFace} attach="material" />
                </mesh>
            ))}
            <mesh geometry={roof} position={[0, (ROOF_Y + PEAK_Y) / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
                <primitive object={m.basalt} attach="material" />
            </mesh>
            {/* oculus ring */}
            <mesh position={[0, PEAK_Y + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[HALL.oculusR, HALL.oculusR + 0.6, 24]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            {apses.map((a, i) => (
                <group key={i} position={[a.x, 0, a.z]} rotation={[0, a.yaw, 0]}>
                    <mesh position={[0, a.h / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
                        <boxGeometry args={[a.w, a.h, a.depth]} />
                        <primitive object={m.rockFace} attach="material" />
                    </mesh>
                    <mesh position={[0, a.h + 0.9, 0]} castShadow={shadows}>
                        <boxGeometry args={[a.w + 0.3, 1.8, a.depth + 0.3]} />
                        <primitive object={m.basalt} attach="material" />
                    </mesh>
                </group>
            ))}
            {/* the Processional and the Overlook — one long wing south */}
            <mesh position={[wing.x0 + WALL_T / 2, wing.h / 2, (wing.z0 + wing.z1) / 2]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[WALL_T, wing.h, wing.z1 - wing.z0]} />
                <primitive object={m.rockFace} attach="material" />
            </mesh>
            <mesh position={[wing.x1 - WALL_T / 2, wing.h / 2, (wing.z0 + wing.z1) / 2]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[WALL_T, wing.h, wing.z1 - wing.z0]} />
                <primitive object={m.rockFace} attach="material" />
            </mesh>
            <mesh position={[0, wing.h + 0.35, (wing.z0 + wing.z1) / 2]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[wing.x1 - wing.x0 + 0.4, 0.7, wing.z1 - wing.z0 + 0.4]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            {/* the Overlook's glass wall, with the door cut out of its middle */}
            <group position={[0, 0, 62.5 + WALL_T / 2]}>
                <mesh position={[-(DOOR_HALF + 0.14 + 5.85) / 2, wing.h / 2, 0]}>
                    <boxGeometry args={[5.85 - DOOR_HALF - 0.14, wing.h, 0.12]} />
                    <primitive object={m.windowGlass} attach="material" />
                </mesh>
                <mesh position={[(DOOR_HALF + 0.14 + 5.85) / 2, wing.h / 2, 0]}>
                    <boxGeometry args={[5.85 - DOOR_HALF - 0.14, wing.h, 0.12]} />
                    <primitive object={m.windowGlass} attach="material" />
                </mesh>
                <mesh position={[0, (wing.h + 3.66) / 2, 0]}>
                    <boxGeometry args={[DOOR_HALF * 2 + 0.3, wing.h - 3.66, 0.12]} />
                    <primitive object={m.windowGlass} attach="material" />
                </mesh>
                {/* door frame */}
                <mesh position={[-DOOR_HALF, 1.76, 0]} castShadow={shadows}>
                    <boxGeometry args={[0.28, 3.5, 0.5]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                <mesh position={[DOOR_HALF, 1.76, 0]} castShadow={shadows}>
                    <boxGeometry args={[0.28, 3.5, 0.5]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                <mesh position={[0, 3.66, 0]} castShadow={shadows}>
                    <boxGeometry args={[DOOR_HALF * 2 + 0.3, 0.28, 0.5]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                {/* the threshold and three steps down to the road */}
                <mesh position={[0, -0.05, 0.9]} receiveShadow={shadows}>
                    <boxGeometry args={[7.4, 0.3, 1.8]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
                {/* a warm wash inside the door at night */}
                <pointLight position={[0, 2.6, -1.2]} color="#ffd9a8" intensity={low ? 6 : 10} distance={14} decay={2} />
            </group>
            {/* the four chambers */}
            {chambers.map((r) => {
                const w = r.x1 - r.x0 + WALL_T * 2;
                const d = r.z1 - r.z0 + WALL_T * 2;
                const cx = (r.x0 + r.x1) / 2;
                const cz = (r.z0 + r.z1) / 2;
                return (
                    <group key={r.id} position={[cx, 0, cz]}>
                        <mesh position={[0, r.h / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
                            <boxGeometry args={[w, r.h, d]} />
                            <primitive object={m.rockFace} attach="material" />
                        </mesh>
                        <mesh position={[0, r.h + 0.35, 0]} castShadow={shadows} receiveShadow={shadows}>
                            <boxGeometry args={[w + 0.5, 0.7, d + 0.5]} />
                            <primitive object={m.basalt} attach="material" />
                        </mesh>
                        {/* a skylight dome on each */}
                        <mesh position={[0, r.h + 0.7, 0]}>
                            <sphereGeometry args={[Math.min(w, d) * 0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                            <meshStandardMaterial color="#8fb3c9" metalness={0.5} roughness={0.18} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}
