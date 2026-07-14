'use client';

/**
 * Staged house — every mesh fully skinned with free procedural / brand maps.
 */
import type * as THREE from 'three';
import HallArch from './HallArch';
import SoulMirrorMesh from './SoulMirrorMesh';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';

const SEGS = 12;

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
    segs = SEGS,
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

function StagedBed({ sh, rich, m }: { sh: boolean; rich: boolean; m: HouseMaterials }) {
    const x = -0.7;
    const z = 7.7;
    return (
        <group>
            <MatBox pos={[x, 0.22, z]} size={[2.35, 0.28, 1.85]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x, 0.42, z]} size={[2.15, 0.22, 1.65]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x, 0.58, z + 0.08]} size={[2.0, 0.12, 1.35]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[x, 0.95, z + 0.88]} size={[2.25, 1.0, 0.12]} material={m.wood} shadows={sh} />
            {rich && (
                <>
                    <MatBox pos={[x, 1.35, z + 0.88]} size={[1.8, 0.06, 0.05]} material={m.gold} shadows={false} />
                    <MatBox pos={[x - 0.45, 0.72, z + 0.55]} size={[0.55, 0.16, 0.32]} material={m.fabricLight} shadows={sh} />
                    <MatBox pos={[x + 0.45, 0.72, z + 0.55]} size={[0.55, 0.16, 0.32]} material={m.fabricLight} shadows={sh} />
                </>
            )}
            <MatBox pos={[-2.15, 0.35, z]} size={[0.48, 0.55, 0.48]} material={m.wood} shadows={sh} />
            <MatBox pos={[0.75, 0.35, z]} size={[0.48, 0.55, 0.48]} material={m.wood} shadows={sh} />
            {rich && (
                <>
                    <MatCyl pos={[-2.15, 0.72, z]} r={0.07} h={0.12} material={m.metalDark} shadows={false} />
                    <mesh position={[-2.15, 0.88, z]}>
                        <sphereGeometry args={[0.09, SEGS, SEGS]} />
                        <primitive object={m.ember} attach="material" />
                    </mesh>
                </>
            )}
        </group>
    );
}

function StagedSofa({ sh, rich, m }: { sh: boolean; rich: boolean; m: HouseMaterials }) {
    const x = 0.4;
    const z = 0.15;
    return (
        <group>
            <MatBox pos={[x, 0.28, z]} size={[2.7, 0.3, 1.05]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x - 0.55, 0.48, z + 0.06]} size={[1.18, 0.15, 0.85]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[x + 0.55, 0.48, z + 0.06]} size={[1.18, 0.15, 0.85]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[x, 0.78, z + 0.4]} size={[2.7, 0.55, 0.26]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x - 1.28, 0.55, z]} size={[0.2, 0.5, 0.95]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x + 1.28, 0.55, z]} size={[0.2, 0.5, 0.95]} material={m.fabric} shadows={sh} />
            {rich && (
                <MatBox pos={[x + 0.9, 0.62, z - 0.1]} size={[0.32, 0.1, 0.26]} material={m.leather} shadows={false} />
            )}
        </group>
    );
}

function StagedCoffeeTable({ sh, m }: { sh: boolean; m: HouseMaterials }) {
    const x = 0.2;
    const z = -1.9;
    return (
        <group>
            <MatBox pos={[x, 0.34, z]} size={[1.08, 0.05, 0.72]} material={m.wood} shadows={sh} />
            {[
                [-0.4, -0.24],
                [0.4, -0.24],
                [-0.4, 0.24],
                [0.4, 0.24],
            ].map(([ox, oz], i) => (
                <MatBox key={i} pos={[x + ox, 0.16, z + oz]} size={[0.07, 0.3, 0.07]} material={m.woodDark} shadows={sh} />
            ))}
        </group>
    );
}

function StagedMediaWall({ sh, rich, m }: { sh: boolean; rich: boolean; m: HouseMaterials }) {
    const zWall = -4.55;
    return (
        <group>
            <MatBox pos={[0, 0.32, zWall]} size={[2.35, 0.55, 0.48]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[0, 0.58, zWall + 0.02]} size={[2.2, 0.04, 0.4]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 0.58, zWall + 0.12]} size={[0.72, 0.14, 0.32]} material={m.metalDark} shadows={sh} />
            <mesh position={[0, 0.58, zWall + 0.28]}>
                <boxGeometry args={[0.12, 0.035, 0.035]} />
                <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.25} toneMapped={false} />
            </mesh>
            <MatBox pos={[0, 1.62, zWall - 0.12]} size={[2.55, 1.42, 0.08]} material={m.black} shadows={sh} />
            <mesh position={[0, 1.62, zWall - 0.06]}>
                <planeGeometry args={[2.28, 1.2]} />
                <primitive object={m.screen} attach="material" />
            </mesh>
            {rich && (
                <>
                    <MatBox pos={[-0.95, 0.22, zWall]} size={[0.32, 0.1, 0.24]} material={m.metalDark} shadows={false} />
                    <MatBox pos={[0.9, 0.22, zWall]} size={[0.36, 0.08, 0.2]} material={m.metalDark} shadows={false} />
                </>
            )}
        </group>
    );
}

function StagedDesk({
    pos,
    sh,
    rich,
    m,
    monitor = false,
}: {
    pos: [number, number, number];
    sh: boolean;
    rich: boolean;
    m: HouseMaterials;
    monitor?: boolean;
}) {
    const [x, , z] = pos;
    return (
        <group>
            <MatBox pos={[x, 0.74, z]} size={[1.7, 0.06, 0.75]} material={m.wood} shadows={sh} />
            <MatBox pos={[x - 0.7, 0.36, z]} size={[0.09, 0.7, 0.6]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x + 0.7, 0.36, z]} size={[0.09, 0.7, 0.6]} material={m.woodDark} shadows={sh} />
            {/* Chair on the room side of the desk (+Z) so you face the monitor */}
            <MatBox pos={[x, 0.38, z + 0.72]} size={[0.52, 0.07, 0.48]} material={m.fabric} shadows={sh} />
            <MatCyl pos={[x, 0.2, z + 0.72]} r={0.055} h={0.28} material={m.metal} shadows={false} />
            <MatBox pos={[x, 0.7, z + 0.92]} size={[0.52, 0.52, 0.07]} material={m.fabricLight} shadows={sh} />
            {monitor && (
                <>
                    {/* Monitor faces the chair (+Z) */}
                    <MatBox pos={[x, 1.18, z - 0.22]} size={[0.92, 0.58, 0.05]} material={m.black} shadows={sh} />
                    <mesh position={[x, 1.18, z - 0.18]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[0.8, 0.48]} />
                        <meshStandardMaterial
                            color="#041208"
                            emissive="#22c55e"
                            emissiveIntensity={1.15}
                            toneMapped={false}
                        />
                    </mesh>
                    <MatBox pos={[x, 0.86, z - 0.12]} size={[0.16, 0.07, 0.1]} material={m.metalDark} shadows={false} />
                    {rich && (
                        <MatBox pos={[x + 0.52, 0.82, z + 0.08]} size={[0.3, 0.07, 0.2]} material={m.metalDark} shadows={false} />
                    )}
                </>
            )}
        </group>
    );
}

function StagedShelf({
    pos,
    size,
    sh,
    rich,
    m,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    sh: boolean;
    rich: boolean;
    m: HouseMaterials;
}) {
    const [x, y, z] = pos;
    const [sx, sy, sz] = size;
    const shelfYs = [0.4, 0.9, 1.4, 1.9];
    return (
        <group>
            <MatBox pos={[x, y, z]} size={[sx, sy, sz]} material={m.wood} shadows={sh} />
            {shelfYs.map((by) => (
                <MatBox
                    key={by}
                    pos={[x + sx * 0.32, by, z]}
                    size={[sx * 0.28, 0.045, sz * 0.88]}
                    material={m.woodDark}
                    shadows={false}
                />
            ))}
            {rich &&
                shelfYs.flatMap((by, row) =>
                    [-0.55, -0.28, 0, 0.28, 0.52].map((oz, j) => {
                        const pull = ((row * 3 + j) % 5) * 0.028;
                        const tall = 0.18 + ((j + row) % 3) * 0.04;
                        return (
                            <MatBox
                                key={`${by}-${j}`}
                                pos={[x + sx * 0.42 + pull, by + tall * 0.5 + 0.02, z + oz * (sz * 0.35)]}
                                size={[0.07 + (j % 2) * 0.02, tall, 0.12 + (j % 3) * 0.03]}
                                material={m.book}
                                shadows={false}
                            />
                        );
                    }),
                )}
        </group>
    );
}

function FrontDoor({ sh, rich, m }: { sh: boolean; rich: boolean; m: HouseMaterials }) {
    const x = -10.22;
    const z = 0.15;
    return (
        <group>
            <MatBox pos={[x, 1.35, z - 0.62]} size={[0.22, 2.55, 0.14]} material={m.wood} shadows={sh} />
            <MatBox pos={[x, 1.35, z + 0.62]} size={[0.22, 2.55, 0.14]} material={m.wood} shadows={sh} />
            <MatBox pos={[x, 2.55, z]} size={[0.22, 0.14, 1.35]} material={m.wood} shadows={sh} />
            <MatBox pos={[x + 0.06, 1.25, z]} size={[0.1, 2.35, 1.15]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x + 0.12, 1.7, z]} size={[0.04, 0.7, 0.85]} material={m.leather} shadows={false} />
            <MatBox pos={[x + 0.12, 0.85, z]} size={[0.04, 0.7, 0.85]} material={m.leather} shadows={false} />
            <MatCyl pos={[x + 0.14, 1.15, z + 0.38]} r={0.035} h={0.08} material={m.gold} shadows={false} segs={8} />
            {rich && (
                <mesh position={[x + 0.16, 1.15, z + 0.38]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            )}
        </group>
    );
}

function SignalStudio({ sh, rich, m }: { sh: boolean; rich: boolean; m: HouseMaterials }) {
    const x = 7.65;
    const z = -7.15;
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.5, 0.012, -7.0]} receiveShadow={sh}>
                <planeGeometry args={[4.4, 3.4]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>
            <MatBox pos={[x, 0.72, z]} size={[1.85, 0.06, 0.85]} material={m.metalDark} shadows={sh} />
            <MatBox pos={[x + 0.55, 0.72, z - 0.55]} size={[0.75, 0.06, 1.1]} material={m.metalDark} shadows={sh} />
            <MatBox pos={[x - 0.75, 0.36, z]} size={[0.08, 0.7, 0.7]} material={m.metal} shadows={sh} />
            <MatBox pos={[x + 0.75, 0.36, z]} size={[0.08, 0.7, 0.7]} material={m.metal} shadows={sh} />
            <MatBox pos={[x - 0.25, 1.2, z - 0.28]} size={[0.7, 0.48, 0.04]} material={m.black} shadows={sh} />
            <MatBox pos={[x + 0.45, 1.2, z - 0.28]} size={[0.7, 0.48, 0.04]} material={m.black} shadows={sh} />
            <mesh position={[x - 0.25, 1.2, z - 0.25]}>
                <planeGeometry args={[0.62, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#f97316" emissiveIntensity={rich ? 0.55 : 0.4} toneMapped={false} />
            </mesh>
            <mesh position={[x + 0.45, 1.2, z - 0.25]}>
                <planeGeometry args={[0.62, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#22d3ee" emissiveIntensity={rich ? 0.45 : 0.32} toneMapped={false} />
            </mesh>
            <MatBox pos={[x + 0.15, 0.8, z + 0.15]} size={[0.28, 0.04, 0.2]} material={m.metalDark} shadows={false} />
            <MatCyl pos={[x - 0.55, 0.95, z + 0.1]} r={0.02} h={0.4} material={m.metal} shadows={false} segs={8} />
            {rich && (
                <pointLight position={[x, 1.5, z]} intensity={1.25} color="#fb923c" distance={5} decay={2} />
            )}
        </group>
    );
}

function Lamp({
    pos,
    m,
    low,
}: {
    pos: [number, number, number];
    m: HouseMaterials;
    low?: boolean;
}) {
    return (
        <group position={pos}>
            <MatCyl pos={[0, 0.55, 0]} r={0.035} h={1.1} material={m.woodDark} shadows={false} segs={8} />
            <mesh position={[0, 1.18, 0]}>
                <coneGeometry args={[0.16, 0.26, low ? 8 : SEGS]} />
                <primitive object={m.fabric} attach="material" />
            </mesh>
            <mesh position={[0, 1.05, 0]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.95} />
            </mesh>
            {!low && <pointLight position={[0, 1.12, 0]} intensity={0.55} color="#fde68a" distance={4.2} decay={2} />}
        </group>
    );
}

function Plant({ pos, m, low }: { pos: [number, number, number]; m: HouseMaterials; low?: boolean }) {
    return (
        <group position={pos}>
            <MatCyl pos={[0, 0.16, 0]} r={0.13} h={0.26} material={m.woodDark} shadows={!low} segs={8} />
            <mesh position={[0, 0.52, 0]}>
                <sphereGeometry args={[0.26, low ? 6 : 10, low ? 6 : 10]} />
                <primitive object={m.leaf} attach="material" />
            </mesh>
        </group>
    );
}

export default function HouseGeometry({
    low = false,
    cinematic = false,
}: {
    low?: boolean;
    cinematic?: boolean;
}) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const rich = cinematic && !low;
    const floorW = 21.2;
    const floorD = 19.2;

    return (
        <group>
            {/* Main floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={sh}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.woodFloor} attach="material" />
            </mesh>

            {/* Outer walls */}
            <MatBox pos={[0, 1.5, -9.5]} size={[floorW, 3, 0.3]} material={m.plaster} shadows={sh} />
            <MatBox pos={[0, 1.5, 9.5]} size={[floorW, 3, 0.3]} material={m.plaster} shadows={sh} />
            <MatBox pos={[-10.5, 1.5, 0]} size={[0.3, 3, floorD]} material={m.plaster} shadows={sh} />
            <MatBox pos={[10.5, 1.5, 0]} size={[0.3, 3, floorD]} material={m.plaster} shadows={sh} />

            {rich &&
                [-7, -3.5, 0, 3.5, 7].map((bz) => (
                    <MatBox key={`beam-${bz}`} pos={[0, 2.85, bz]} size={[20.4, 0.12, 0.18]} material={m.wood} shadows={false} />
                ))}

            {/* ── BEDROOM ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.01, 6.4]} receiveShadow={sh}>
                <planeGeometry args={[8.5, 6]} />
                <primitive object={m.tile} attach="material" />
            </mesh>
            <StagedBed sh={sh} rich={rich} m={m} />
            <StagedDesk pos={[3.7, 0, 5.15]} sh={sh} rich={rich} m={m} monitor />
            <SoulMirrorMesh low={low} rich={rich} mats={m} />
            <mesh position={[6.2, 1.85, 9.32]}>
                <planeGeometry args={[1.55, 1.15]} />
                <meshStandardMaterial color="#1e1b4b" emissive="#6366f1" emissiveIntensity={rich ? 0.7 : 0.4} />
            </mesh>
            {rich && <Plant pos={[-3.2, 0, 6.0]} m={m} />}

            {/* Bedroom doorway */}
            <MatBox pos={[-3.45, 1.2, 3.0]} size={[4.4, 2.4, 0.2]} material={m.plaster} shadows={sh} />
            <MatBox pos={[3.45, 1.2, 3.0]} size={[4.4, 2.4, 0.2]} material={m.plaster} shadows={sh} />
            <MatBox pos={[-1.15, 1.2, 3.0]} size={[0.1, 2.4, 0.26]} material={m.wood} shadows={false} />
            <MatBox pos={[1.15, 1.2, 3.0]} size={[0.1, 2.4, 0.26]} material={m.wood} shadows={false} />
            <MatBox pos={[0, 2.35, 3.0]} size={[2.4, 0.1, 0.26]} material={m.wood} shadows={false} />

            {/* ── LIVING ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.012, -1.8]} receiveShadow={sh}>
                <planeGeometry args={[7.2, 7.2]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            <StagedSofa sh={sh} rich={rich} m={m} />
            <StagedCoffeeTable sh={sh} m={m} />
            <StagedMediaWall sh={sh} rich={rich} m={m} />
            <MatBox pos={[2.85, 0.32, -0.4]} size={[0.72, 0.32, 0.72]} material={m.fabric} shadows={sh} />
            <MatBox pos={[2.85, 0.68, -0.58]} size={[0.72, 0.42, 0.16]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[-2.7, 0.42, 0.2]} size={[0.95, 0.06, 0.7]} material={m.wood} shadows={sh} />
            <MatBox pos={[-2.7, 0.2, 0.2]} size={[0.82, 0.32, 0.55]} material={m.woodDark} shadows={sh} />
            {rich && (
                <>
                    <Lamp pos={[-3.2, 0, 1.1]} m={m} low={low} />
                    <Plant pos={[3.5, 0, -3.2]} m={m} low={low} />
                    {/* Wall art */}
                    <mesh position={[-3.75, 1.7, 0.2]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[0.85, 0.65]} />
                        <primitive object={m.tapestry} attach="material" />
                    </mesh>
                    <MatBox pos={[-3.82, 1.7, 0.2]} size={[0.05, 0.72, 0.92]} material={m.wood} shadows={false} />
                </>
            )}

            <FrontDoor sh={sh} rich={rich} m={m} />

            {/* ── LIBRARY ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.6, 0.01, -4.5]} receiveShadow={sh}>
                <planeGeometry args={[5.6, 5.6]} />
                <primitive object={m.woodFloor} attach="material" />
            </mesh>
            {(low ? [-4.5] : [-5.4, -4.5, -3.6]).map((sz, i) => (
                <StagedShelf
                    key={`lib-${i}`}
                    pos={[-8.75, 1.2, sz]}
                    size={[0.4, 2.25, low ? 2.4 : 1.15]}
                    sh={sh}
                    rich={rich}
                    m={m}
                />
            ))}
            <MatBox pos={[-5.6, 0.32, -3.85]} size={[0.7, 0.32, 0.7]} material={m.fabric} shadows={sh} />
            <MatBox pos={[-5.6, 0.66, -4.08]} size={[0.7, 0.4, 0.14]} material={m.fabricLight} shadows={sh} />
            {rich && <Lamp pos={[-5.6, 0, -3.1]} m={m} low={low} />}

            {/* ── STUDY ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.01, -4.7]} receiveShadow={sh}>
                <planeGeometry args={[4.8, 4.4]} />
                <primitive object={m.woodFloor} attach="material" />
            </mesh>
            <StagedDesk pos={[6.4, 0, -4.55]} sh={sh} rich={rich} m={m} />
            <MatBox pos={[6.4, 0.88, -4.55]} size={[0.42, 0.07, 0.5]} material={m.leather} shadows={sh} />
            <StagedShelf pos={[8.6, 1.25, -5.7]} size={[0.38, 2.3, 2.0]} sh={sh} rich={rich} m={m} />

            <SignalStudio sh={sh} rich={rich} m={m} />

            {/* ── CINEMA ── */}
            <MatBox pos={[8.95, 0.4, 1.25]} size={[0.5, 0.7, 2.55]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[8.95, 1.58, 1.25]} size={[0.12, 1.6, 2.6]} material={m.black} shadows={sh} />
            <mesh position={[8.88, 1.58, 1.25]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.3, 1.38]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={rich ? 0.62 : 0.45} toneMapped={false} />
            </mesh>

            <HallArch low={low} rich={rich} mats={m} />

            {/* ── LEDGER + HEARTH ── */}
            <MatBox pos={[-5.1, 0.48, 2.1]} size={[0.55, 0.92, 0.55]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[-5.1, 0.98, 2.1]} size={[0.62, 0.07, 0.62]} material={m.wood} shadows={sh} />
            <MatBox pos={[-7.55, 0.55, 3.7]} size={[1.35, 1.0, 0.82]} material={m.stone} shadows={sh} />
            <MatBox pos={[-7.55, 0.45, 4.0]} size={[0.9, 0.65, 0.12]} material={m.black} shadows={false} />

            {/* ── WAYFINDER ── */}
            <MatBox pos={[0, 1.55, -9.18]} size={[2.1, 1.4, 0.1]} material={m.woodDark} shadows={sh} />
            <mesh position={[0, 1.55, -9.1]}>
                <planeGeometry args={[1.8, 1.18]} />
                <primitive object={m.sanctum} attach="material" />
            </mesh>
            <MatBox pos={[-1.5, 1.35, -9.22]} size={[0.35, 2.65, 0.2]} material={m.stone} shadows={sh} />
            <MatBox pos={[1.5, 1.35, -9.22]} size={[0.35, 2.65, 0.2]} material={m.stone} shadows={sh} />

            {/* Ceiling */}
            <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>

            {rich && (
                <>
                    <mesh position={[-10.32, 1.85, -4]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[1.2, 1.05]} />
                        <primitive object={m.hallArt} attach="material" />
                    </mesh>
                    <mesh position={[10.32, 1.95, -2]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[1.1, 0.95]} />
                        <primitive object={m.tapestry} attach="material" />
                    </mesh>
                </>
            )}
        </group>
    );
}
