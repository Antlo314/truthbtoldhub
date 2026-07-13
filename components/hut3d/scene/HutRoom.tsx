'use client';

/**
 * Ceremonial Hut chamber — structure + free material skins.
 * Stations: Truth dais · Soul mirror · Wayfinder · Ledger · Sanctum · Hearth
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHutMaterials, type HutMaterials } from '../materials/HutMaterials';

function MeshBox({
    args,
    position,
    material,
    cast = true,
    receive = true,
}: {
    args: [number, number, number];
    position: [number, number, number];
    material: THREE.Material;
    cast?: boolean;
    receive?: boolean;
}) {
    return (
        <mesh position={position} castShadow={cast} receiveShadow={receive} material={material}>
            <boxGeometry args={args} />
        </mesh>
    );
}

function HearthFlame({ mats }: { mats: HutMaterials }) {
    const ref = useRef<THREE.Mesh>(null);
    const light = useRef<THREE.PointLight>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (ref.current) {
            ref.current.scale.y = 1 + Math.sin(t * 9) * 0.14;
            ref.current.position.y = 0.85 + Math.sin(t * 7) * 0.04;
        }
        if (light.current) {
            light.current.intensity = 6.5 + Math.sin(t * 11) * 1.2 + Math.sin(t * 17) * 0.6;
        }
    });
    return (
        <group position={[-5.5, 0, 0]}>
            <MeshBox args={[2.0, 1.2, 1.0]} position={[0, 0.6, 0]} material={mats.stone} />
            <MeshBox args={[1.6, 0.35, 0.7]} position={[0, 1.25, -0.15]} material={mats.stone} />
            {/* logs */}
            <MeshBox args={[0.55, 0.12, 0.14]} position={[-0.15, 0.35, 0.15]} material={mats.woodDark} cast={false} />
            <MeshBox args={[0.5, 0.12, 0.14]} position={[0.18, 0.38, 0.08]} material={mats.woodDark} cast={false} />
            <mesh ref={ref} position={[0, 0.85, 0.2]}>
                <sphereGeometry args={[0.32, 12, 12]} />
                <primitive object={mats.ember} attach="material" />
            </mesh>
            <mesh position={[0.12, 0.7, 0.28]}>
                <sphereGeometry args={[0.18, 10, 10]} />
                <primitive object={mats.ember} attach="material" />
            </mesh>
            <pointLight
                ref={light}
                position={[0, 1.25, 0.35]}
                color="#ff6b2c"
                intensity={7}
                distance={11}
                decay={2}
                castShadow
            />
        </group>
    );
}

/** Full ceremonial room */
export default function HutRoom({ low = false }: { low?: boolean }) {
    const mats = useHutMaterials(low);

    return (
        <group>
            {/* ── Floor ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={mats.floor}>
                <planeGeometry args={[18, 16]} />
            </mesh>

            {/* Aisle carpet */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.5]} receiveShadow material={mats.rug}>
                <planeGeometry args={[2.4, 11.5]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.25, 0.014, 0.5]} material={mats.gold}>
                <planeGeometry args={[0.07, 11.5]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.25, 0.014, 0.5]} material={mats.gold}>
                <planeGeometry args={[0.07, 11.5]} />
            </mesh>

            {/* ── Walls (stone outer + plaster inner feel via maps) ── */}
            <MeshBox args={[18, 4.4, 0.4]} position={[0, 2.2, -7.6]} material={mats.stone} />
            <MeshBox args={[18, 4.4, 0.4]} position={[0, 2.2, 7.6]} material={mats.stone} />
            <MeshBox args={[0.4, 4.4, 15.5]} position={[-9.1, 2.2, 0]} material={mats.stone} />
            <MeshBox args={[0.4, 4.4, 15.5]} position={[9.1, 2.2, 0]} material={mats.stone} />

            {/* Inner plaster panels for depth */}
            {!low && (
                <>
                    <mesh position={[0, 2.0, -7.35]} material={mats.plaster}>
                        <boxGeometry args={[16, 3.6, 0.08]} />
                    </mesh>
                    <mesh position={[-8.85, 2.0, 0]} material={mats.plaster}>
                        <boxGeometry args={[0.08, 3.6, 14]} />
                    </mesh>
                    <mesh position={[8.85, 2.0, 0]} material={mats.plaster}>
                        <boxGeometry args={[0.08, 3.6, 14]} />
                    </mesh>
                </>
            )}

            {/* Baseboards */}
            <MeshBox args={[17.8, 0.18, 0.12]} position={[0, 0.09, -7.35]} material={mats.woodDark} cast={false} />
            <MeshBox args={[17.8, 0.18, 0.12]} position={[0, 0.09, 7.35]} material={mats.woodDark} cast={false} />
            <MeshBox args={[0.12, 0.18, 14.8]} position={[-8.85, 0.09, 0]} material={mats.woodDark} cast={false} />
            <MeshBox args={[0.12, 0.18, 14.8]} position={[8.85, 0.09, 0]} material={mats.woodDark} cast={false} />

            {/* Ceiling */}
            <mesh position={[0, 4.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.woodDark} receiveShadow>
                <planeGeometry args={[18, 16]} />
            </mesh>

            {/* Roof beams — denser grid */}
            {[-5.5, -2.5, 0.5, 3.5].map((z) => (
                <MeshBox key={`bz${z}`} args={[17.6, 0.28, 0.32]} position={[0, 3.95, z]} material={mats.wood} />
            ))}
            {[-7, -3.5, 0, 3.5, 7].map((x) => (
                <MeshBox key={`bx${x}`} args={[0.28, 0.28, 14.8]} position={[x, 4.0, 0]} material={mats.wood} cast={false} />
            ))}

            {/* Corner pillars with capitals */}
            {(
                [
                    [-7.2, -5.2],
                    [7.2, -5.2],
                    [-7.2, 5.2],
                    [7.2, 5.2],
                ] as const
            ).map(([x, z], i) => (
                <group key={i} position={[x, 0, z]}>
                    <mesh position={[0, 1.9, 0]} castShadow material={mats.stone}>
                        <cylinderGeometry args={[0.32, 0.38, 3.8, low ? 8 : 12]} />
                    </mesh>
                    <MeshBox args={[0.7, 0.18, 0.7]} position={[0, 3.85, 0]} material={mats.wood} cast={false} />
                    <mesh position={[0, 0.08, 0]} material={mats.stone}>
                        <cylinderGeometry args={[0.42, 0.45, 0.16, low ? 8 : 12]} />
                    </mesh>
                </group>
            ))}

            {/* ── TRUTH DAIS (north +Z) ── */}
            <group position={[0, 0, 5.2]}>
                <mesh position={[0, 0.14, 0]} receiveShadow material={mats.woodDark}>
                    <cylinderGeometry args={[1.75, 1.95, 0.28, low ? 16 : 28]} />
                </mesh>
                <mesh position={[0, 0.3, 0]} receiveShadow material={mats.wood}>
                    <cylinderGeometry args={[1.55, 1.65, 0.12, low ? 16 : 28]} />
                </mesh>
                <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.gold}>
                    <ringGeometry args={[1.4, 1.62, low ? 24 : 40]} />
                </mesh>
                {/* torch posts */}
                {[-1.5, 1.5].map((x) => (
                    <group key={x} position={[x, 0, 0.9]}>
                        <MeshBox args={[0.12, 1.4, 0.12]} position={[0, 0.7, 0]} material={mats.woodDark} />
                        <mesh position={[0, 1.5, 0]}>
                            <sphereGeometry args={[0.12, 10, 10]} />
                            <primitive object={mats.ember} attach="material" />
                        </mesh>
                        <pointLight position={[0, 1.55, 0]} color="#ff8a3d" intensity={2.2} distance={5} decay={2} />
                    </group>
                ))}
            </group>

            {/* ── HEARTH west ── */}
            <HearthFlame mats={mats} />

            {/* ── SOUL MIRROR east ── */}
            <group position={[5.8, 0, 1.5]}>
                <MeshBox args={[0.22, 2.6, 1.25]} position={[0, 1.4, 0]} material={mats.woodDark} />
                <MeshBox args={[0.08, 2.35, 1.05]} position={[-0.12, 1.4, 0]} material={mats.wood} cast={false} />
                <mesh position={[-0.18, 1.42, 0]}>
                    <planeGeometry args={[0.95, 2.05]} />
                    <primitive object={mats.mirror} attach="material" />
                </mesh>
                <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.gold}>
                    <ringGeometry args={[0.75, 0.95, 28]} />
                </mesh>
                {/* candle shelf */}
                <MeshBox args={[0.35, 0.08, 0.35]} position={[-0.4, 0.55, 0.7]} material={mats.wood} cast={false} />
                <pointLight position={[-0.4, 0.85, 0.7]} color="#fde68a" intensity={1.4} distance={4} decay={2} />
            </group>

            {/* ── WAYFINDER table south ── */}
            <group position={[0, 0, -4.2]}>
                <MeshBox args={[2.4, 0.14, 1.35]} position={[0, 0.88, 0]} material={mats.wood} />
                {(
                    [
                        [-0.95, -0.45],
                        [0.95, -0.45],
                        [-0.95, 0.45],
                        [0.95, 0.45],
                    ] as const
                ).map(([x, z], i) => (
                    <MeshBox key={i} args={[0.14, 0.88, 0.14]} position={[x, 0.44, z]} material={mats.woodDark} />
                ))}
                <mesh position={[0, 0.97, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.62, 28]} />
                    <meshStandardMaterial
                        color="#041208"
                        emissive="#22c55e"
                        emissiveIntensity={0.65}
                        toneMapped={false}
                    />
                </mesh>
                <mesh position={[0, 0.98, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.gold}>
                    <ringGeometry args={[0.62, 0.72, 28]} />
                </mesh>
                <pointLight position={[0, 1.4, 0]} color="#4ade80" intensity={2.5} distance={6} decay={2} />
            </group>

            {/* ── LEDGER lectern NW ── */}
            <group position={[-4.2, 0, 4.8]}>
                <MeshBox args={[0.75, 1.15, 0.55]} position={[0, 0.58, 0]} material={mats.wood} />
                <MeshBox args={[0.95, 0.1, 0.65]} position={[0, 1.2, 0.08]} material={mats.woodDark} />
                {/* open book */}
                <MeshBox args={[0.55, 0.04, 0.4]} position={[0, 1.28, 0.1]} material={mats.plaster} cast={false} />
                <mesh position={[0, 1.32, 0.1]} rotation={[-0.5, 0, 0]}>
                    <planeGeometry args={[0.48, 0.32]} />
                    <meshStandardMaterial color="#f5f0e6" roughness={0.85} />
                </mesh>
                <pointLight position={[0, 1.6, 0.2]} color="#fbbf24" intensity={1.6} distance={4} decay={2} />
            </group>

            {/* ── SANCTUM door south wall ── */}
            <group position={[0, 0, -7.25]}>
                <MeshBox args={[2.5, 3.4, 0.28]} position={[0, 1.7, 0]} material={mats.woodDark} />
                <MeshBox args={[0.35, 3.5, 0.4]} position={[-1.35, 1.75, 0.05]} material={mats.stone} />
                <MeshBox args={[0.35, 3.5, 0.4]} position={[1.35, 1.75, 0.05]} material={mats.stone} />
                <mesh position={[0, 1.75, 0.16]}>
                    <planeGeometry args={[1.75, 2.8]} />
                    <primitive object={mats.sanctumDoor} attach="material" />
                </mesh>
                <mesh position={[0, 3.35, 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.gold}>
                    <ringGeometry args={[0.28, 0.42, 24]} />
                </mesh>
                <pointLight position={[0, 2.2, 0.6]} color="#a78bfa" intensity={3.2} distance={8} decay={2} />
            </group>

            {/* Wall tapestries (brand skins) */}
            {!low && (
                <>
                    <mesh position={[-8.7, 2.1, -2]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[2.4, 2.0]} />
                        <primitive object={mats.tapestry} attach="material" />
                    </mesh>
                    <mesh position={[8.7, 2.1, 2]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[2.2, 1.8]} />
                        <primitive object={mats.tapestry} attach="material" />
                    </mesh>
                </>
            )}

            {/* Torches on long walls */}
            {([-6, -2, 2, 6] as const).map((z) => (
                <group key={`tl${z}`}>
                    <group position={[-8.7, 2.2, z]}>
                        <MeshBox args={[0.15, 0.5, 0.15]} position={[0, 0, 0]} material={mats.woodDark} cast={false} />
                        <mesh position={[0.12, 0.35, 0]}>
                            <sphereGeometry args={[0.1, 8, 8]} />
                            <primitive object={mats.ember} attach="material" />
                        </mesh>
                        <pointLight position={[0.25, 0.4, 0]} color="#ff8a3d" intensity={1.8} distance={5} decay={2} />
                    </group>
                    <group position={[8.7, 2.2, z]}>
                        <MeshBox args={[0.15, 0.5, 0.15]} position={[0, 0, 0]} material={mats.woodDark} cast={false} />
                        <mesh position={[-0.12, 0.35, 0]}>
                            <sphereGeometry args={[0.1, 8, 8]} />
                            <primitive object={mats.ember} attach="material" />
                        </mesh>
                        <pointLight position={[-0.25, 0.4, 0]} color="#ff8a3d" intensity={1.8} distance={5} decay={2} />
                    </group>
                </group>
            ))}
        </group>
    );
}
