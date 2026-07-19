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

/**
 * Hollow wall bookcase — open bays, books rest ON shelf tops (no solid fill clip).
 */
function WallBookcase({
    wallX,
    wallZ,
    depth = 0.42,
    height = 2.55,
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
    const sz = width;
    const shelfT = 0.04;
    const sideT = 0.08;
    const backT = 0.05;
    const shelfCount = low ? 4 : 5;
    // Even shelf tops from plinth to under crown — leave bay clearance
    const bottomY = 0.12;
    const topInner = height - 0.12;
    const shelves: number[] = [];
    for (let i = 0; i < shelfCount; i++) {
        shelves.push(bottomY + (i / (shelfCount - 1)) * (topInner - bottomY - shelfT));
    }
    const bayH =
        shelfCount > 1
            ? (shelves[1] - shelves[0] - shelfT) * 0.92
            : 0.28;
    const bookSlots = low ? 9 : 14;
    const bookDepth = depth * 0.52;
    const bookX = cx + into * (backT * 0.5 + bookDepth * 0.35);

    return (
        <group>
            {/* Thin back panel only (not a solid filled volume) */}
            <MatBox
                pos={[wallX + into * (backT / 2 + 0.01), height / 2, cz]}
                size={[backT, height - 0.04, sz - 0.06]}
                material={m.woodDark}
                shadows={false}
            />
            {/* Sides */}
            <MatBox
                pos={[cx, height / 2, cz - sz / 2 + sideT / 2]}
                size={[depth, height, sideT]}
                material={m.wood}
                shadows={sh}
            />
            <MatBox
                pos={[cx, height / 2, cz + sz / 2 - sideT / 2]}
                size={[depth, height, sideT]}
                material={m.wood}
                shadows={sh}
            />
            {/* Plinth + crown */}
            <MatBox pos={[cx, bottomY / 2, cz]} size={[depth + 0.04, bottomY, sz]} material={m.wood} shadows={sh} />
            <MatBox
                pos={[cx, height - 0.05, cz]}
                size={[depth + 0.06, 0.1, sz + 0.06]}
                material={m.wood}
                shadows={false}
            />
            {shelves.map((sy, row) => {
                const shelfTop = sy + shelfT;
                const nextShelf = shelves[row + 1];
                const maxBookH = nextShelf
                    ? Math.max(0.12, nextShelf - shelfTop - 0.03)
                    : Math.min(bayH, height - shelfTop - 0.14);
                return (
                    <group key={row}>
                        <MatBox
                            pos={[cx + into * 0.01, sy + shelfT / 2, cz]}
                            size={[depth - 0.06, shelfT, sz - sideT * 2 - 0.04]}
                            material={m.woodDark}
                            shadows={false}
                        />
                        {rich &&
                            Array.from({ length: bookSlots }).map((_, j) => {
                                const t = (j + 0.5) / bookSlots - 0.5;
                                const tall = Math.min(
                                    maxBookH,
                                    0.14 + ((j + row) % 4) * 0.035,
                                );
                                const thick = 0.045 + (j % 3) * 0.012;
                                // Bottom of book sits flush on shelf top
                                const by = shelfTop + tall * 0.5 + 0.002;
                                return (
                                    <MatBox
                                        key={j}
                                        pos={[bookX, by, cz + t * (sz - sideT * 2 - 0.22)]}
                                        size={[bookDepth, tall, thick]}
                                        material={m.book}
                                        shadows={false}
                                    />
                                );
                            })}
                    </group>
                );
            })}
        </group>
    );
}

/** Desk + room-side chair (staging: work corner, clear approach path). */
function Desk({
    pos,
    sh,
    rich,
    m,
    monitor,
    chairSign = 1,
}: {
    pos: [number, number, number];
    sh: boolean;
    rich: boolean;
    m: HouseMaterials;
    monitor?: boolean;
    /** +1 chair toward +Z, −1 toward −Z */
    chairSign?: number;
}) {
    const [x, , z] = pos;
    const cz = z + chairSign * 0.85;
    const monZ = z - chairSign * 0.22;
    return (
        <group>
            {/* Top + apron + legs */}
            <MatBox pos={[x, 0.74, z]} size={[1.8, 0.055, 0.82]} material={m.wood} shadows={sh} />
            <MatBox pos={[x, 0.66, z]} size={[1.72, 0.06, 0.74]} material={m.woodDark} shadows={false} />
            {[
                [x - 0.78, z - 0.3],
                [x + 0.78, z - 0.3],
                [x - 0.78, z + 0.3],
                [x + 0.78, z + 0.3],
            ].map(([lx, lz], i) => (
                <MatBox key={i} pos={[lx, 0.35, lz]} size={[0.08, 0.7, 0.08]} material={m.woodDark} shadows={sh} />
            ))}
            {/* Drawer fronts */}
            <MatBox pos={[x - 0.4, 0.48, z + chairSign * 0.38]} size={[0.55, 0.18, 0.04]} material={m.wood} shadows={false} />
            <MatBox pos={[x + 0.4, 0.48, z + chairSign * 0.38]} size={[0.55, 0.18, 0.04]} material={m.wood} shadows={false} />
            <MatCyl pos={[x - 0.4, 0.48, z + chairSign * 0.42]} r={0.018} h={0.04} material={m.gold} shadows={false} segs={6} />
            <MatCyl pos={[x + 0.4, 0.48, z + chairSign * 0.42]} r={0.018} h={0.04} material={m.gold} shadows={false} segs={6} />
            {/* Task chair (room side) */}
            <MatBox pos={[x, 0.42, cz]} size={[0.48, 0.07, 0.48]} material={m.fabric} shadows={sh} />
            <MatCyl pos={[x, 0.2, cz]} r={0.05} h={0.32} material={m.metal} shadows={false} segs={8} />
            <MatCyl pos={[x, 0.05, cz]} r={0.22} h={0.04} material={m.metalDark} shadows={false} segs={8} />
            <MatBox pos={[x, 0.78, cz + chairSign * 0.18]} size={[0.48, 0.55, 0.07]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[x - 0.28, 0.62, cz]} size={[0.06, 0.12, 0.35]} material={m.fabric} shadows={false} />
            <MatBox pos={[x + 0.28, 0.62, cz]} size={[0.06, 0.12, 0.35]} material={m.fabric} shadows={false} />
            {monitor && (
                <>
                    <MatBox pos={[x, 0.82, monZ]} size={[0.28, 0.04, 0.18]} material={m.metalDark} shadows={false} />
                    <MatBox pos={[x, 1.05, monZ]} size={[0.08, 0.28, 0.06]} material={m.metalDark} shadows={false} />
                    <MatBox pos={[x, 1.28, monZ]} size={[0.98, 0.58, 0.05]} material={m.black} shadows={sh} />
                    <mesh position={[x, 1.28, monZ + chairSign * 0.04]} rotation={[0, chairSign > 0 ? Math.PI : 0, 0]}>
                        <planeGeometry args={[0.88, 0.48]} />
                        <meshStandardMaterial color="#041208" emissive="#22c55e" emissiveIntensity={1.15} toneMapped={false} />
                    </mesh>
                    <MatBox pos={[x, 0.78, z + chairSign * 0.05]} size={[0.42, 0.02, 0.16]} material={m.black} shadows={false} />
                </>
            )}
            {rich && !monitor && <MatBox pos={[x, 0.9, z]} size={[0.42, 0.07, 0.52]} material={m.leather} shadows={false} />}
        </group>
    );
}

/** Living sofa — faces −Z (fireplace), floated off wall, arms + legs. */
function StagedSofa({
    x,
    z,
    sh,
    m,
}: {
    x: number;
    z: number;
    sh: boolean;
    m: HouseMaterials;
}) {
    return (
        <group>
            {/* Frame base */}
            <MatBox pos={[x, 0.22, z]} size={[3.0, 0.28, 1.05]} material={m.woodDark} shadows={sh} />
            {/* Seat cushions */}
            <MatBox pos={[x - 0.72, 0.48, z + 0.05]} size={[1.35, 0.22, 0.88]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x + 0.72, 0.48, z + 0.05]} size={[1.35, 0.22, 0.88]} material={m.fabric} shadows={sh} />
            {/* Back cushions face fire (−Z) */}
            <MatBox pos={[x, 0.88, z + 0.38]} size={[2.95, 0.72, 0.22]} material={m.fabricLight} shadows={sh} />
            {/* Arms */}
            <MatBox pos={[x - 1.42, 0.55, z]} size={[0.22, 0.55, 1.0]} material={m.fabric} shadows={sh} />
            <MatBox pos={[x + 1.42, 0.55, z]} size={[0.22, 0.55, 1.0]} material={m.fabric} shadows={sh} />
            {/* Legs */}
            {[
                [x - 1.3, z - 0.4],
                [x + 1.3, z - 0.4],
                [x - 1.3, z + 0.4],
                [x + 1.3, z + 0.4],
            ].map(([lx, lz], i) => (
                <MatCyl key={i} pos={[lx, 0.08, lz]} r={0.04} h={0.14} material={m.woodDark} shadows={false} segs={6} />
            ))}
            {/* Throw pillows */}
            <MatBox pos={[x - 1.0, 0.72, z + 0.15]} size={[0.32, 0.28, 0.18]} material={m.leather} shadows={false} />
            <MatBox pos={[x + 1.0, 0.72, z + 0.15]} size={[0.32, 0.28, 0.18]} material={m.gold} shadows={false} />
        </group>
    );
}

function CoffeeTable({ x, z, sh, m }: { x: number; z: number; sh: boolean; m: HouseMaterials }) {
    return (
        <group>
            <MatBox pos={[x, 0.4, z]} size={[1.15, 0.05, 0.72]} material={m.wood} shadows={sh} />
            <MatBox pos={[x, 0.22, z]} size={[0.9, 0.04, 0.55]} material={m.woodDark} shadows={false} />
            {[
                [x - 0.45, z - 0.25],
                [x + 0.45, z - 0.25],
                [x - 0.45, z + 0.25],
                [x + 0.45, z + 0.25],
            ].map(([lx, lz], i) => (
                <MatCyl key={i} pos={[lx, 0.2, lz]} r={0.035} h={0.38} material={m.metalDark} shadows={false} segs={6} />
            ))}
        </group>
    );
}

/** Media console + TV on side wall (east) — staging: don't compete with fireplace hero. */
function MediaWall({ x, z, sh, m, rich }: { x: number; z: number; sh: boolean; m: HouseMaterials; rich: boolean }) {
    return (
        <group>
            <MatBox pos={[x, 0.38, z]} size={[0.42, 0.72, 2.1]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[x - 0.02, 0.55, z]} size={[0.38, 0.04, 1.95]} material={m.wood} shadows={false} />
            <MatBox pos={[x - 0.02, 0.28, z]} size={[0.38, 0.04, 1.95]} material={m.wood} shadows={false} />
            {/* TV faces into room (−X) */}
            <MatBox pos={[x - 0.12, 1.55, z]} size={[0.08, 1.15, 1.85]} material={m.black} shadows={sh} />
            <mesh position={[x - 0.18, 1.55, z]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1.7, 0.95]} />
                <primitive object={m.screen} attach="material" />
            </mesh>
            {rich && (
                <>
                    <MatBox pos={[x - 0.12, 0.78, z - 0.55]} size={[0.2, 0.12, 0.28]} material={m.black} shadows={false} />
                    <MatBox pos={[x - 0.12, 0.78, z + 0.55]} size={[0.18, 0.1, 0.22]} material={m.metalDark} shadows={false} />
                </>
            )}
        </group>
    );
}

function AccentChair({ x, z, sh, m, rotY = 0 }: { x: number; z: number; sh: boolean; m: HouseMaterials; rotY?: number }) {
    return (
        <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.32, 0]} size={[0.72, 0.28, 0.72]} material={m.fabric} shadows={sh} />
            <MatBox pos={[0, 0.72, 0.22]} size={[0.7, 0.55, 0.14]} material={m.fabricLight} shadows={sh} />
            <MatBox pos={[-0.32, 0.5, 0]} size={[0.1, 0.35, 0.6]} material={m.fabric} shadows={false} />
            <MatBox pos={[0.32, 0.5, 0]} size={[0.1, 0.35, 0.6]} material={m.fabric} shadows={false} />
            {[
                [-0.28, -0.28],
                [0.28, -0.28],
                [-0.28, 0.28],
                [0.28, 0.28],
            ].map(([lx, lz], i) => (
                <MatCyl key={i} pos={[lx, 0.1, lz]} r={0.035} h={0.18} material={m.woodDark} shadows={false} segs={6} />
            ))}
        </group>
    );
}

function Nightstand({ x, z, sh, m }: { x: number; z: number; sh: boolean; m: HouseMaterials }) {
    return (
        <group>
            <MatBox pos={[x, 0.42, z]} size={[0.48, 0.52, 0.42]} material={m.wood} shadows={sh} />
            <MatBox pos={[x, 0.7, z]} size={[0.52, 0.04, 0.46]} material={m.woodDark} shadows={false} />
            <MatBox pos={[x, 0.38, z + 0.2]} size={[0.38, 0.12, 0.04]} material={m.woodDark} shadows={false} />
            <MatCyl pos={[x, 0.82, z]} r={0.06} h={0.12} material={m.gold} shadows={false} segs={8} />
            <MatCyl pos={[x, 0.95, z]} r={0.1} h={0.02} material={m.gold} shadows={false} segs={8} />
        </group>
    );
}

function ConsoleTable({ x, z, sh, m, rotY = 0 }: { x: number; z: number; sh: boolean; m: HouseMaterials; rotY?: number }) {
    return (
        <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.72, 0]} size={[0.95, 0.05, 0.42]} material={m.wood} shadows={sh} />
            <MatBox pos={[-0.38, 0.36, 0]} size={[0.06, 0.72, 0.34]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[0.38, 0.36, 0]} size={[0.06, 0.72, 0.34]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[0, 0.2, 0]} size={[0.7, 0.04, 0.3]} material={m.woodDark} shadows={false} />
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
            {/* Hallway runner — clear spine path */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.2]} receiveShadow={sh}>
                <planeGeometry args={[3.6, 12]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Living rug under conversation group (sofa front legs + table + fire path) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -7.6]} receiveShadow={sh}>
                <planeGeometry args={[7.2, 6.4]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Bedroom area rug under bed */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.8, 0.01, 9.6]} receiveShadow={sh}>
                <planeGeometry args={[4.2, 3.2]} />
                <primitive object={m.tile} attach="material" />
            </mesh>

            {/* Outer walls — N/S split for open back + front doors */}
            {/* North wall: gap for back door at x≈-3.25 (~2.4 m between wall ends) */}
            <Wall pos={[-9.075, 1.55, -12.5]} size={[9.05, 3.1, 0.35]} m={m} sh={sh} />
            <Wall pos={[5.825, 1.55, -12.5]} size={[15.55, 3.1, 0.35]} m={m} sh={sh} />
            {/* South wall: gap for front door at x≈0 (~1.9 m) */}
            <Wall pos={[-7.55, 1.55, 12.5]} size={[12.1, 3.1, 0.35]} m={m} sh={sh} />
            <Wall pos={[7.55, 1.55, 12.5]} size={[12.1, 3.1, 0.35]} m={m} sh={sh} />
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
            {/* East partition — split to leave cinema door into SE empty room */}
            <Wall pos={[6.2, 1.4, 4.15]} size={[0.22, 2.8, 3.5]} m={m} sh={sh} />
            <Wall pos={[6.2, 1.4, 9.55]} size={[0.22, 2.8, 3.5]} m={m} sh={sh} />
            {/* Cinema doorway frame (enter empty room from bedroom) */}
            <MatBox pos={[6.2, 1.4, 6.55]} size={[0.28, 2.8, 0.14]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 1.4, 8.05]} size={[0.28, 2.8, 0.14]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 2.7, 7.3]} size={[0.28, 0.16, 1.65]} material={m.wood} shadows={false} />
            {/* Hall-level east opening (study/cinema approach from corridor) */}
            <MatBox pos={[6.2, 1.4, -0.2]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 1.4, 1.4]} size={[0.28, 2.8, 0.16]} material={m.wood} shadows={false} />
            <MatBox pos={[6.2, 2.7, 0.6]} size={[0.28, 0.16, 1.8]} material={m.wood} shadows={false} />

            {/* Front door (south foyer) — open walk-through, leaf swung aside */}
            <MatBox pos={[-1.15, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[1.15, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 2.7, 12.25]} size={[2.5, 0.25, 0.3]} material={m.wood} shadows={sh} />
            {/* Open door leaf parked against east jamb (inside) */}
            <group position={[1.05, 1.3, 11.55]} rotation={[0, -1.15, 0]}>
                <MatBox pos={[0, 0, 0]} size={[0.1, 2.5, 0.85]} material={m.woodDark} shadows={sh} />
                <MatCyl pos={[-0.02, -0.15, 0.28]} r={0.035} h={0.08} material={m.gold} shadows={false} segs={8} />
            </group>
            {/* Domain plate moved to foyer side wall (not blocking path) */}
            <group position={[-2.35, 1.55, 11.9]} rotation={[0, Math.PI / 2, 0]}>
                <MatBox pos={[0, 0, 0.02]} size={[0.9, 1.15, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.78, 1.0]} />
                    <primitive object={m.artDomain} attach="material" />
                </mesh>
            </group>
            {/* Porch slab + doormat step outside */}
            <MatBox pos={[0, 0.06, 13.15]} size={[3.2, 0.12, 1.4]} material={m.stone} shadows={sh} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.125, 12.85]} receiveShadow={sh}>
                <planeGeometry args={[1.1, 0.55]} />
                <primitive object={m.rug} attach="material" />
            </mesh>

            {/* Back door (north living, west of fireplace) — open walk-through */}
            <MatBox pos={[-4.2, 1.4, -12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[-2.3, 1.4, -12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[-3.25, 2.7, -12.25]} size={[2.4, 0.25, 0.3]} material={m.wood} shadows={sh} />
            <group position={[-2.4, 1.3, -11.55]} rotation={[0, 1.15, 0]}>
                <MatBox pos={[0, 0, 0]} size={[0.1, 2.5, 0.8]} material={m.woodDark} shadows={sh} />
                <MatCyl pos={[-0.02, -0.15, -0.25]} r={0.035} h={0.08} material={m.gold} shadows={false} segs={8} />
            </group>
            {/* Rear step into garden */}
            <MatBox pos={[-3.25, 0.06, -13.15]} size={[2.8, 0.12, 1.3]} material={m.stone} shadows={sh} />

            {/* Wayfinder console — against hall wall, path stays clear (staging: off-spine) */}
            <group position={[2.5, 0, 0.35]}>
                <MatBox pos={[0, 0.95, 0]} size={[1.05, 1.7, 0.28]} material={m.woodDark} shadows={sh} />
                <MatBox pos={[0, 1.85, 0.02]} size={[1.15, 0.08, 0.32]} material={m.wood} shadows={false} />
                <mesh position={[0, 1.2, 0.16]}>
                    <planeGeometry args={[0.9, 0.95]} />
                    <primitive object={m.artStillPoint} attach="material" />
                </mesh>
            </group>

            {/* Esoteric wall art (one-liners only) */}
            {/* Living west wall */}
            <group position={[-5.0, 1.65, -9.2]} rotation={[0, Math.PI / 2, 0]}>
                <MatBox pos={[0, 0, 0.02]} size={[1.05, 0.85, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.92, 0.72]} />
                    <primitive object={m.artAsWithin} attach="material" />
                </mesh>
            </group>
            {/* Hall north face of bedroom partition */}
            <group position={[-3.6, 1.7, 2.95]}>
                <MatBox pos={[0, 0, 0.02]} size={[1.05, 0.85, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.92, 0.72]} />
                    <primitive object={m.artUnnamed} attach="material" />
                </mesh>
            </group>
            {/* Bedroom west-ish wall strip */}
            {!low && (
                <group position={[-5.0, 1.7, 7.5]} rotation={[0, Math.PI / 2, 0]}>
                    <MatBox pos={[0, 0, 0.02]} size={[0.95, 0.75, 0.06]} material={m.woodDark} shadows={false} />
                    <mesh position={[0, 0, 0.06]}>
                        <planeGeometry args={[0.82, 0.62]} />
                        <primitive object={m.artStillPoint} attach="material" />
                    </mesh>
                </group>
            )}

            {/* ── LIVING (staged conversation group) ──
                Hero = fireplace. Sofa faces fire. TV on east side wall. Paths left/right. */}
            <StagedSofa x={0} z={-6.0} sh={sh} m={m} />
            <CoffeeTable x={0.15} z={-8.35} sh={sh} m={m} />
            <MediaWall x={4.55} z={-7.8} sh={sh} m={m} rich={rich} />
            {/* Offering console against west living wall */}
            <ConsoleTable x={-4.3} z={-6.2} sh={sh} m={m} rotY={Math.PI / 2} />
            {/* Accent chair 90° conversation triangle */}
            <AccentChair x={2.85} z={-7.4} sh={sh} m={m} rotY={-0.9} />
            <Fireplace mats={m} low={low} rich={rich} />
            {/* Mantel accents */}
            {rich && (
                <>
                    <MatBox pos={[-0.7, 1.72, -11.45]} size={[0.18, 0.22, 0.12]} material={m.gold} shadows={false} />
                    <MatBox pos={[0.75, 1.68, -11.45]} size={[0.14, 0.16, 0.1]} material={m.leather} shadows={false} />
                </>
            )}

            {/* ── BEDROOM (bed left of center, desk SE, path to mirror clear) ── */}
            <group>
                {/* Platform + mattress */}
                <MatBox pos={[-2.0, 0.28, 10.0]} size={[2.35, 0.32, 1.85]} material={m.woodDark} shadows={sh} />
                <MatBox pos={[-2.0, 0.52, 10.0]} size={[2.2, 0.18, 1.7]} material={m.fabric} shadows={sh} />
                {/* Headboard on south wall */}
                <MatBox pos={[-2.0, 1.05, 10.85]} size={[2.4, 1.05, 0.12]} material={m.wood} shadows={sh} />
                <MatBox pos={[-2.0, 1.05, 10.78]} size={[2.15, 0.85, 0.06]} material={m.fabricLight} shadows={false} />
                {/* Pillows */}
                <MatBox pos={[-2.55, 0.72, 10.45]} size={[0.55, 0.18, 0.35]} material={m.fabricLight} shadows={false} />
                <MatBox pos={[-1.45, 0.72, 10.45]} size={[0.55, 0.18, 0.35]} material={m.fabricLight} shadows={false} />
                {/* Foot rail */}
                <MatBox pos={[-2.0, 0.45, 9.1]} size={[2.3, 0.2, 0.08]} material={m.wood} shadows={false} />
                {/* Legs */}
                {[
                    [-2.95, 9.2],
                    [-1.05, 9.2],
                    [-2.95, 10.7],
                    [-1.05, 10.7],
                ].map(([lx, lz], i) => (
                    <MatCyl key={i} pos={[lx, 0.1, lz]} r={0.045} h={0.18} material={m.woodDark} shadows={false} segs={6} />
                ))}
            </group>
            <Nightstand x={-3.45} z={10.0} sh={sh} m={m} />
            <Nightstand x={-0.55} z={10.0} sh={sh} m={m} />
            {/* Work corner SE — chair on room side (+Z toward bed/south) */}
            <Desk pos={[4.8, 0, 7.6]} sh={sh} rich={rich} m={m} monitor chairSign={1} />
            <SoulMirrorMesh low={low} rich={rich} mats={m} />

            {/* ── LIBRARY (deep west room — not hall threshold) ── */}
            <WallBookcase wallX={-13.4} wallZ={-5.0} width={4.8} face="west" sh={sh} rich={rich} m={m} low={low} />
            <AccentChair x={-11.2} z={-4.6} sh={sh} m={m} rotY={Math.PI / 2} />
            <ConsoleTable x={-10.4} z={-3.5} sh={sh} m={m} />
            <MatBox pos={[-10.4, 0.88, -3.5]} size={[0.36, 0.06, 0.28]} material={m.leather} shadows={false} />

            {/* Community hall doorway (NW) */}
            <group position={[-8.95, 0, 6.4]}>
                <MatBox pos={[-0.75, 1.3, 0]} size={[0.38, 2.6, 0.38]} material={m.stone} shadows={sh} />
                <MatBox pos={[0.75, 1.3, 0]} size={[0.38, 2.6, 0.38]} material={m.stone} shadows={sh} />
                <MatBox pos={[0, 2.55, 0]} size={[1.95, 0.28, 0.42]} material={m.stone} shadows={sh} />
                <MatBox pos={[0, 2.55, 0.05]} size={[1.7, 0.08, 0.48]} material={m.wood} shadows={false} />
                <mesh position={[0, 2.35, 0.18]}>
                    <torusGeometry args={[0.42, 0.045, 6, low ? 12 : 20]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            </group>

            {/* ── EAST WING ── */}
            <Desk pos={[9.4, 0, -3.5]} sh={sh} rich={rich} m={m} chairSign={1} />
            <WallBookcase wallX={13.4} wallZ={-5.2} width={3.0} face="east" sh={sh} rich={rich} m={m} low={low} />
            {/* Cinema — SE empty room (opposite of prior hall push: +3 on Z from z=1 → z=4, deeper to 7.0) */}
            <MatBox pos={[12.55, 0.4, 7.0]} size={[0.48, 0.7, 2.3]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[12.6, 1.65, 7.0]} size={[0.1, 1.55, 2.4]} material={m.black} shadows={sh} />
            <mesh position={[12.5, 1.65, 7.0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.15, 1.3]} />
                <meshStandardMaterial
                    color="#0a0a12"
                    emissive="#7c3aed"
                    emissiveIntensity={rich ? 0.65 : 0.45}
                    toneMapped={false}
                />
            </mesh>
            {/* Chairs face TV (+X) fully inside room */}
            <AccentChair x={10.0} z={6.35} sh={sh} m={m} rotY={-Math.PI / 2} />
            <AccentChair x={10.0} z={7.65} sh={sh} m={m} rotY={-Math.PI / 2} />
            {/* Cinema rug */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10.6, 0.012, 7.0]} receiveShadow={sh}>
                <planeGeometry args={[3.2, 3.0]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Signal Studio desk SE */}
            <MatBox pos={[10.3, 0.72, -9.1]} size={[2.0, 0.06, 0.95]} material={m.metalDark} shadows={sh} />
            {[
                [9.5, -9.45],
                [11.1, -9.45],
                [9.5, -8.75],
                [11.1, -8.75],
            ].map(([lx, lz], i) => (
                <MatCyl key={i} pos={[lx, 0.36, lz]} r={0.04} h={0.72} material={m.metal} shadows={false} segs={6} />
            ))}
            <MatBox pos={[9.85, 1.2, -9.45]} size={[0.72, 0.48, 0.05]} material={m.black} shadows={sh} />
            <MatBox pos={[10.85, 1.2, -9.45]} size={[0.72, 0.48, 0.05]} material={m.black} shadows={sh} />
            <mesh position={[9.85, 1.2, -9.4]}>
                <planeGeometry args={[0.62, 0.38]} />
                <meshStandardMaterial color="#0a1020" emissive="#f97316" emissiveIntensity={0.55} toneMapped={false} />
            </mesh>
            <mesh position={[10.85, 1.2, -9.4]}>
                <planeGeometry args={[0.62, 0.38]} />
                <meshStandardMaterial color="#0a1020" emissive="#22d3ee" emissiveIntensity={0.45} toneMapped={false} />
            </mesh>
            <MatBox pos={[10.3, 0.42, -8.35]} size={[0.5, 0.08, 0.48]} material={m.fabric} shadows={sh} />
            <MatCyl pos={[10.3, 0.2, -8.35]} r={0.05} h={0.32} material={m.metal} shadows={false} segs={6} />

            {/* Ceiling */}
            <mesh position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>

        </group>
    );
}
