'use client';

/**
 * Expanded multi-room house — foyer · hallway · living · bedroom · wings.
 * Fully skinned free materials.
 */
import type * as THREE from 'three';
import SoulMirrorMesh from './SoulMirrorMesh';
import Fireplace from './Fireplace';
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

function Wall({
    pos,
    size,
    m,
    sh,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    m: HouseMaterials;
    sh: boolean;
}) {
    return <MatBox pos={pos} size={size} material={m.plaster} shadows={sh} />;
}

function WallBookcase({
    wallX,
    wallZ,
    depth = 0.4,
    height = 2.6,
    width = 4.2,
    face = 'west' as 'west' | 'east',
    sh,
    rich,
    m,
    low,
}: {
    wallX: number;
    wallZ: number;
    depth?: number;
    height?: number;
    width?: number;
    face?: 'west' | 'east';
    sh: boolean;
    rich: boolean;
    m: HouseMaterials;
    low?: boolean;
}) {
    const into = face === 'west' ? 1 : -1;
    const cx = wallX + into * (depth / 2 + 0.02);
    const cz = wallZ;
    const sx = depth;
    const sz = width;
    const y = height / 2;
    const shelfCount = low ? 4 : 5;
    const shelves: number[] = [];
    for (let i = 0; i < shelfCount; i++) {
        shelves.push(0.22 + (i / (shelfCount - 1)) * (height - 0.45));
    }
    const bookSlots = low ? 10 : 16;

    return (
        <group>
            <MatBox pos={[cx, y, cz]} size={[sx, height, sz]} material={m.wood} shadows={sh} />
            <MatBox
                pos={[wallX + into * 0.03, y, cz]}
                size={[0.04, height - 0.08, sz - 0.08]}
                material={m.woodDark}
                shadows={false}
            />
            <MatBox pos={[cx, y, cz - sz / 2 + 0.05]} size={[depth + 0.02, height, 0.1]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[cx, y, cz + sz / 2 - 0.05]} size={[depth + 0.02, height, 0.1]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[cx, height - 0.04, cz]} size={[depth + 0.08, 0.1, sz + 0.08]} material={m.wood} shadows={false} />
            {shelves.map((sy, row) => (
                <group key={row}>
                    <MatBox
                        pos={[cx + into * 0.02, sy, cz]}
                        size={[depth - 0.08, 0.05, sz - 0.2]}
                        material={m.woodDark}
                        shadows={false}
                    />
                    {rich &&
                        Array.from({ length: bookSlots }).map((_, j) => {
                            const t = (j + 0.5) / bookSlots - 0.5;
                            const pull = ((row * 5 + j) % 4) * 0.022;
                            const tall = 0.15 + ((j + row) % 4) * 0.05;
                            const thick = 0.05 + (j % 3) * 0.014;
                            return (
                                <MatBox
                                    key={j}
                                    pos={[cx + into * (0.02 + pull), sy + tall * 0.5 + 0.02, cz + t * (sz - 0.3)]}
                                    size={[depth * 0.55 + pull, tall, thick]}
                                    material={m.book}
                                    shadows={false}
                                />
                            );
                        })}
                </group>
            ))}
        </group>
    );
}

function Desk({
    pos,
    sh,
    rich,
    m,
    monitor,
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
            <MatBox pos={[x, 0.74, z]} size={[1.75, 0.07, 0.8]} material={m.wood} shadows={sh} />
            <MatBox pos={[x - 0.72, 0.36, z]} size={[0.1, 0.72, 0.62]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x + 0.72, 0.36, z]} size={[0.1, 0.72, 0.62]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x, 0.38, z + 0.75]} size={[0.52, 0.08, 0.5]} material={m.fabric} shadows={sh} />
            <MatCyl pos={[x, 0.2, z + 0.75]} r={0.055} h={0.28} material={m.metal} shadows={false} />
            <MatBox pos={[x, 0.72, z + 0.95]} size={[0.52, 0.52, 0.08]} material={m.fabricLight} shadows={sh} />
            {monitor && (
                <>
                    <MatBox pos={[x, 1.2, z - 0.25]} size={[0.95, 0.6, 0.06]} material={m.black} shadows={sh} />
                    <mesh position={[x, 1.2, z - 0.2]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[0.82, 0.5]} />
                        <meshStandardMaterial color="#041208" emissive="#22c55e" emissiveIntensity={1.2} toneMapped={false} />
                    </mesh>
                </>
            )}
            {rich && !monitor && <MatBox pos={[x, 0.9, z]} size={[0.4, 0.08, 0.5]} material={m.leather} shadows={false} />}
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
    const floorW = 27.2;
    const floorD = 24.8;

    return (
        <group>
            {/* Floors */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={sh}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.woodFloor} attach="material" />
            </mesh>
            {/* Hallway runner */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.0]} receiveShadow={sh}>
                <planeGeometry args={[4.2, 14]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Living rug */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -5.5]} receiveShadow={sh}>
                <planeGeometry args={[9, 8]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Bedroom floor tint */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.01, 7.5]} receiveShadow={sh}>
                <planeGeometry args={[10, 8]} />
                <primitive object={m.tile} attach="material" />
            </mesh>

            {/* Outer walls */}
            <Wall pos={[0, 1.55, -12.5]} size={[floorW, 3.1, 0.35]} m={m} sh={sh} />
            <Wall pos={[0, 1.55, 12.5]} size={[floorW, 3.1, 0.35]} m={m} sh={sh} />
            <Wall pos={[-13.8, 1.55, 0]} size={[0.35, 3.1, floorD]} m={m} sh={sh} />
            <Wall pos={[13.8, 1.55, 0]} size={[0.35, 3.1, floorD]} m={m} sh={sh} />

            {rich &&
                [-9, -4.5, 0, 4.5, 9].map((bz) => (
                    <MatBox key={bz} pos={[0, 2.95, bz]} size={[26, 0.12, 0.18]} material={m.wood} shadows={false} />
                ))}

            {/* ── HALLWAY partitions ── */}
            <Wall pos={[-7.5, 1.4, -1.15]} size={[8.4, 2.8, 0.22]} m={m} sh={sh} />
            <Wall pos={[7.5, 1.4, -1.15]} size={[8.4, 2.8, 0.22]} m={m} sh={sh} />
            {/* living entry opening framed */}
            <MatBox pos={[-2.4, 1.4, -1.15]} size={[0.18, 2.8, 0.28]} material={m.wood} shadows={false} />
            <MatBox pos={[2.4, 1.4, -1.15]} size={[0.18, 2.8, 0.28]} material={m.wood} shadows={false} />
            <MatBox pos={[0, 2.7, -1.15]} size={[5.0, 0.18, 0.28]} material={m.wood} shadows={false} />

            <Wall pos={[-5.5, 1.4, 3.1]} size={[11, 2.8, 0.22]} m={m} sh={sh} />
            <Wall pos={[5.5, 1.4, 3.1]} size={[11, 2.8, 0.22]} m={m} sh={sh} />
            <MatBox pos={[-1.35, 1.4, 3.1]} size={[0.16, 2.8, 0.28]} material={m.wood} shadows={false} />
            <MatBox pos={[1.35, 1.4, 3.1]} size={[0.16, 2.8, 0.28]} material={m.wood} shadows={false} />
            <MatBox pos={[0, 2.7, 3.1]} size={[2.9, 0.16, 0.28]} material={m.wood} shadows={false} />

            <Wall pos={[-6.2, 1.4, -6.5]} size={[0.22, 2.8, 8.4]} m={m} sh={sh} />
            <Wall pos={[-6.2, 1.4, 7.5]} size={[0.22, 2.8, 7.6]} m={m} sh={sh} />
            <MatBox pos={[-6.2, 1.4, 0.4]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[-6.2, 1.4, 1.8]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[-6.2, 2.7, 1.1]} size={[0.28, 0.16, 1.6]} material={m.wood} shadows={false} />

            <Wall pos={[6.2, 1.4, -7.0]} size={[0.22, 2.8, 7.6]} m={m} sh={sh} />
            <Wall pos={[6.2, 1.4, 6.5]} size={[0.22, 2.8, 8.4]} m={m} sh={sh} />
            <MatBox pos={[6.2, 1.4, -0.2]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 1.4, 1.4]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 2.7, 0.6]} size={[0.28, 0.16, 1.8]} material={m.wood} shadows={false} />

            {/* Front door (south foyer) */}
            <MatBox pos={[-1.15, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[1.15, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 2.7, 12.25]} size={[2.5, 0.25, 0.3]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 1.3, 12.15]} size={[1.7, 2.5, 0.12]} material={m.woodDark} shadows={sh} />
            <MatCyl pos={[0.55, 1.2, 12.05]} r={0.04} h={0.1} material={m.gold} shadows={false} segs={8} />

            {/* Wayfinder kiosk in hall */}
            <MatBox pos={[0, 1.1, -0.5]} size={[1.4, 2.0, 0.35]} material={m.woodDark} shadows={sh} />
            <mesh position={[0, 1.35, -0.3]}>
                <planeGeometry args={[1.15, 1.1]} />
                <primitive object={m.sanctum} attach="material" />
            </mesh>

            {/* ── LIVING ── */}
            <MatBox pos={[0.5, 0.35, -3.8]} size={[2.8, 0.35, 1.05]} material={m.fabric} shadows={sh} />
            <MatBox pos={[0.5, 0.55, -3.8]} size={[2.5, 0.18, 0.9]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[0.5, 0.85, -4.15]} size={[2.8, 0.5, 0.28]} material={m.fabric} shadows={sh} />
            <MatBox pos={[0.2, 0.34, -5.3]} size={[1.1, 0.06, 0.75]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 0.35, -7.6]} size={[2.4, 0.55, 0.5]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[0, 1.65, -7.95]} size={[2.6, 1.45, 0.1]} material={m.black} shadows={sh} />
            <mesh position={[0, 1.65, -7.88]}>
                <planeGeometry args={[2.3, 1.2]} />
                <primitive object={m.screen} attach="material" />
            </mesh>
            <MatBox pos={[-3.2, 0.42, -4.0]} size={[1.0, 0.08, 0.7]} material={m.wood} shadows={sh} />
            <MatBox pos={[3.2, 0.35, -4.5]} size={[0.75, 0.35, 0.75]} material={m.fabric} shadows={sh} />
            <Fireplace mats={m} low={low} rich={rich} />

            {/* ── BEDROOM ── */}
            <MatBox pos={[-1.2, 0.35, 9.2]} size={[2.4, 0.35, 1.85]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[-1.2, 0.55, 9.2]} size={[2.2, 0.2, 1.65]} material={m.fabric} shadows={sh} />
            <MatBox pos={[-1.2, 0.95, 10.0]} size={[2.35, 0.9, 0.14]} material={m.wood} shadows={sh} />
            <Desk pos={[4.4, 0, 7.4]} sh={sh} rich={rich} m={m} monitor />
            <SoulMirrorMesh low={low} rich={rich} mats={m} />

            {/* ── LIBRARY (west) ── */}
            <WallBookcase wallX={-13.4} wallZ={-2.5} width={5.2} face="west" sh={sh} rich={rich} m={m} low={low} />
            <MatBox pos={[-9.5, 0.35, -1.5]} size={[0.75, 0.35, 0.75]} material={m.fabric} shadows={sh} />
            <MatBox pos={[-8.5, 0.5, 2.5]} size={[0.6, 1.0, 0.6]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[-8.5, 1.05, 2.5]} size={[0.45, 0.08, 0.4]} material={m.leather} shadows={false} />

            {/* Community hall doorway (NW) */}
            <group position={[-8.8, 0, 6.2]}>
                <MatBox pos={[-0.75, 1.3, 0]} size={[0.35, 2.6, 0.35]} material={m.stone} shadows={sh} />
                <MatBox pos={[0.75, 1.3, 0]} size={[0.35, 2.6, 0.35]} material={m.stone} shadows={sh} />
                <MatBox pos={[0, 2.55, 0]} size={[1.9, 0.25, 0.4]} material={m.stone} shadows={sh} />
                <mesh position={[0, 2.35, 0.15]}>
                    <torusGeometry args={[0.45, 0.05, 6, low ? 12 : 20]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            </group>

            {/* ── EAST WING ── */}
            <Desk pos={[9.5, 0, -2.0]} sh={sh} rich={rich} m={m} />
            <WallBookcase wallX={13.4} wallZ={-4.5} width={3.2} face="east" sh={sh} rich={rich} m={m} low={low} />
            {/* Cinema */}
            <MatBox pos={[12.6, 0.45, 3.5]} size={[0.55, 0.8, 2.8]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[12.7, 1.65, 3.5]} size={[0.14, 1.7, 2.9]} material={m.black} shadows={sh} />
            <mesh position={[12.6, 1.65, 3.5]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.5, 1.45]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={rich ? 0.65 : 0.45} toneMapped={false} />
            </mesh>
            {/* Studio */}
            <MatBox pos={[10.5, 0.72, -8.5]} size={[2.0, 0.08, 1.0]} material={m.metalDark} shadows={sh} />
            <MatBox pos={[10.0, 1.25, -8.85]} size={[0.75, 0.5, 0.05]} material={m.black} shadows={sh} />
            <MatBox pos={[11.0, 1.25, -8.85]} size={[0.75, 0.5, 0.05]} material={m.black} shadows={sh} />
            <mesh position={[10.0, 1.25, -8.8]}>
                <planeGeometry args={[0.65, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#f97316" emissiveIntensity={0.55} toneMapped={false} />
            </mesh>
            <mesh position={[11.0, 1.25, -8.8]}>
                <planeGeometry args={[0.65, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#22d3ee" emissiveIntensity={0.45} toneMapped={false} />
            </mesh>

            {/* Ceiling */}
            <mesh position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>

        </group>
    );
}
