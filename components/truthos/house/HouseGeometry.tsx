'use client';

/**
 * Expanded multi-room house — foyer · hallway · living · bedroom · wings.
 * Fully skinned free materials.
 */
import type * as THREE from 'three';
import SoulMirrorMesh from './SoulMirrorMesh';
import Fireplace from './Fireplace';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import { FURN, WALL_H, WALL_RUNS, type WallRun } from './houseMap';
import CinemaScreen from './CinemaScreen';
import HouseTrim from './HouseTrim';
import HouseProp from './HouseProp';

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

/**
 * Builds a wall run from houseMap WALL_RUNS: full-height segments between
 * holes, sill bands under windows, header bands over doors/windows/arches.
 * Colliders derive from the same data, so what you see is what blocks you.
 */
function RunWall({ run, m, sh }: { run: WallRun; m: HouseMaterials; sh: boolean }) {
    const H = WALL_H;
    const parts: { c: number; half: number; y: number; h: number }[] = [];
    const holes = [...run.holes].sort((a, b) => a.c - b.c);
    let cur = run.from;
    for (const hl of holes) {
        const a = cur;
        const b = hl.c - hl.hw;
        if (b - a > 0.02) parts.push({ c: (a + b) / 2, half: (b - a) / 2, y: H / 2, h: H });
        if (hl.sill > 0.02) parts.push({ c: hl.c, half: hl.hw, y: hl.sill / 2, h: hl.sill });
        if (hl.head < H - 0.02)
            parts.push({ c: hl.c, half: hl.hw, y: (H + hl.head) / 2, h: H - hl.head });
        cur = hl.c + hl.hw;
    }
    if (run.to - cur > 0.02)
        parts.push({ c: (cur + run.to) / 2, half: (run.to - cur) / 2, y: H / 2, h: H });
    return (
        <group>
            {parts.map((p, i) => (
                <MatBox
                    key={i}
                    pos={run.axis === 'x' ? [p.c, p.y, run.at] : [run.at, p.y, p.c]}
                    size={run.axis === 'x' ? [p.half * 2, p.h, run.t] : [run.t, p.h, p.half * 2]}
                    material={m.plaster}
                    shadows={sh}
                />
            ))}
        </group>
    );
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

function DiningChair({ x, z, rotY = 0, m, sh }: { x: number; z: number; rotY?: number; m: HouseMaterials; sh: boolean }) {
    return (
        <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.46, 0]} size={[0.44, 0.05, 0.44]} material={m.wood} shadows={sh} />
            <MatBox pos={[0, 0.82, -0.19]} size={[0.44, 0.62, 0.05]} material={m.wood} shadows={sh} />
            {[
                [-0.17, -0.17],
                [0.17, -0.17],
                [-0.17, 0.17],
                [0.17, 0.17],
            ].map(([lx, lz], i) => (
                <MatBox key={i} pos={[lx, 0.22, lz]} size={[0.05, 0.44, 0.05]} material={m.woodDark} shadows={false} />
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
            {/* Hall band runner — stays inside the crossroads */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.0]} receiveShadow={sh}>
                <planeGeometry args={[3.4, 3.9]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Living rug under conversation group (sofa front legs + table + fire path) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -7.6]} receiveShadow={sh}>
                <planeGeometry args={[7.2, 6.4]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Bedroom is carpeted wall to wall */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.2, 0.01, 7.75]} receiveShadow={sh}>
                <planeGeometry args={[7.7, 9.1]} />
                <primitive object={m.carpet} attach="material" />
            </mesh>
            {/* Library keeps darker boards */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9.9, 0.008, -6.7]} receiveShadow={sh}>
                <planeGeometry args={[7.3, 11.0]} />
                <primitive object={m.woodFloorDark} attach="material" />
            </mesh>
            {/* Foyer entry laid in marble */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.95, 0.009, 7.75]} receiveShadow={sh}>
                <planeGeometry args={[4.2, 9.1]} />
                <primitive object={m.marble} attach="material" />
            </mesh>

            {/* ── Walls — generated from WALL_RUNS (mesh ≡ colliders ≡ trim) ──
                Full-height rooms, flush corners, real window + door openings. */}
            {WALL_RUNS.map((r, i) => (
                <RunWall key={i} run={r} m={m} sh={sh} />
            ))}

            {rich &&
                [-9, -4.5, 0, 4.5, 9].map((bz) => (
                    <MatBox key={bz} pos={[0, 2.95, bz]} size={[26, 0.12, 0.18]} material={m.wood} shadows={false} />
                ))}

            {/* Front opening (south, into the FOYER) — jambs + header, no door leaf */}
            <MatBox pos={[2.4, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[4.6, 1.4, 12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[3.5, 2.7, 12.25]} size={[2.5, 0.25, 0.3]} material={m.wood} shadows={sh} />
            {/* Domain plate — flush on the foyer divider, greets you at the door */}
            <group position={[1.83, 1.55, 10.6]} rotation={[0, Math.PI / 2, 0]}>
                <MatBox pos={[0, 0, 0.02]} size={[0.9, 1.15, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.78, 1.0]} />
                    <primitive object={m.artDomain} attach="material" />
                </mesh>
            </group>
            {/* Covered porch — slab, doormat, canopy on posts */}
            <MatBox pos={[3.5, 0.06, 13.35]} size={[3.4, 0.12, 1.9]} material={m.stone} shadows={sh} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.125, 12.85]} receiveShadow={sh}>
                <planeGeometry args={[1.1, 0.55]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            <MatBox pos={[3.5, 2.78, 13.35]} size={[3.4, 0.12, 1.9]} material={m.wood} shadows={sh} />
            <MatBox pos={[3.5, 2.9, 13.35]} size={[3.6, 0.08, 2.05]} material={m.woodDark} shadows={false} />
            <MatCyl pos={[2.35, 1.36, 13.95]} r={0.08} h={2.72} material={m.wood} shadows={sh} segs={8} />
            <MatCyl pos={[4.65, 1.36, 13.95]} r={0.08} h={2.72} material={m.wood} shadows={sh} segs={8} />
            {/* House number plate beside the door */}
            <MatBox pos={[4.95, 1.9, 12.31]} size={[0.3, 0.22, 0.05]} material={m.gold} shadows={false} />
            {/* Coat rack in the foyer, tucked west of the door jamb */}
            <MatBox pos={[1.95, 1.55, 12.28]} size={[0.42, 0.1, 0.06]} material={m.woodDark} shadows={false} />
            {[1.82, 1.95, 2.08].map((hx) => (
                <MatBox key={hx} pos={[hx, 1.47, 12.26]} size={[0.04, 0.12, 0.08]} material={m.gold} shadows={false} />
            ))}
            {/* Foyer runner */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.012, 10.6]} receiveShadow={sh}>
                <planeGeometry args={[1.5, 3.0]} />
                <primitive object={m.rug} attach="material" />
            </mesh>

            {/* Back opening (north living) — exterior only, no door leaf */}
            <MatBox pos={[-4.2, 1.4, -12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[-2.3, 1.4, -12.25]} size={[0.45, 2.8, 0.25]} material={m.wood} shadows={sh} />
            <MatBox pos={[-3.25, 2.7, -12.25]} size={[2.4, 0.25, 0.3]} material={m.wood} shadows={sh} />
            {/* Rear step into garden */}
            <MatBox pos={[-3.25, 0.06, -13.15]} size={[2.8, 0.12, 1.3]} material={m.stone} shadows={sh} />

            {/* Wayfinder console — off hall spine */}
            <group position={[FURN.wayfinder.x, 0, FURN.wayfinder.z]}>
                <MatBox pos={[0, 0.95, 0]} size={[1.05, 1.7, 0.28]} material={m.woodDark} shadows={sh} />
                <MatBox pos={[0, 1.85, 0.02]} size={[1.15, 0.08, 0.32]} material={m.wood} shadows={false} />
                <mesh position={[0, 1.2, 0.16]}>
                    <planeGeometry args={[0.9, 0.95]} />
                    <primitive object={m.artStillPoint} attach="material" />
                </mesh>
            </group>

            {/* Esoteric wall art (one-liners only) */}
            {/* Living — flush on west partition east face */}
            <group position={[-6.03, 1.65, -9.2]} rotation={[0, Math.PI / 2, 0]}>
                <MatBox pos={[0, 0, 0.02]} size={[1.05, 0.85, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.92, 0.72]} />
                    <primitive object={m.artAsWithin} attach="material" />
                </mesh>
            </group>
            {/* Hall — flush on bedroom partition north face, facing the hall */}
            <group position={[-3.6, 1.7, 2.96]} rotation={[0, Math.PI, 0]}>
                <MatBox pos={[0, 0, 0.02]} size={[1.05, 0.85, 0.06]} material={m.woodDark} shadows={false} />
                <mesh position={[0, 0, 0.06]}>
                    <planeGeometry args={[0.92, 0.72]} />
                    <primitive object={m.artUnnamed} attach="material" />
                </mesh>
            </group>
            {/* Bedroom — flush on the north wall (bed now owns the west wall) */}
            {!low && (
                <group position={[-3.5, 1.7, 3.24]}>
                    <MatBox pos={[0, 0, 0.02]} size={[0.95, 0.75, 0.06]} material={m.woodDark} shadows={false} />
                    <mesh position={[0, 0, 0.06]}>
                        <planeGeometry args={[0.82, 0.62]} />
                        <primitive object={m.artStillPoint} attach="material" />
                    </mesh>
                </group>
            )}

            {/* ── LIVING — clear side aisles to back door (x≈-3.25) ──
                Each prop is a CC0 model that falls back to its procedural mesh. */}
            <HouseProp model="sofa" position={[FURN.sofa.x, 0, FURN.sofa.z]} rotation={[0, Math.PI, 0]}>
                <StagedSofa x={FURN.sofa.x} z={FURN.sofa.z} sh={sh} m={m} />
            </HouseProp>
            <HouseProp model="coffeeTable" position={[FURN.coffee.x, 0, FURN.coffee.z]}>
                <CoffeeTable x={FURN.coffee.x} z={FURN.coffee.z} sh={sh} m={m} />
            </HouseProp>
            <HouseProp
                model="mediaConsole"
                position={[FURN.media.x, 0, FURN.media.z]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <MediaWall x={FURN.media.x} z={FURN.media.z} sh={sh} m={m} rich={rich} />
            </HouseProp>
            <HouseProp
                model="television"
                position={[FURN.media.x - 0.16, 0.62, FURN.media.z]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <group />
            </HouseProp>
            {/* Offering against west living partition face */}
            <ConsoleTable x={FURN.offering.x} z={FURN.offering.z} sh={sh} m={m} rotY={Math.PI / 2} />
            <HouseProp
                model="accentChair"
                position={[FURN.chair.x, 0, FURN.chair.z]}
                rotation={[0, -0.9 + Math.PI, 0]}
            >
                <AccentChair x={FURN.chair.x} z={FURN.chair.z} sh={sh} m={m} rotY={-0.9} />
            </HouseProp>
            <HouseProp model="floorLamp" position={[2.1, 0, -5.9]}>
                <group />
            </HouseProp>
            <HouseProp model="pottedPlant" position={[-5.55, 0, -11.65]}>
                <group />
            </HouseProp>
            <Fireplace mats={m} low={low} rich={rich} />
            {/* Mantel accents */}
            {rich && (
                <>
                    <MatBox pos={[-0.7, 1.72, -11.45]} size={[0.18, 0.22, 0.12]} material={m.gold} shadows={false} />
                    <MatBox pos={[0.75, 1.68, -11.45]} size={[0.14, 0.16, 0.1]} material={m.leather} shadows={false} />
                </>
            )}

            {/* ── KITCHEN (living NE — counters on the north wall, sink under window) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.2, 0.014, -10.7]} receiveShadow={sh}>
                <planeGeometry args={[3.9, 3.4]} />
                <primitive object={m.tileKitchen} attach="material" />
            </mesh>
            {/* Base run: stove · sink under the window · cabinet (CC0 models) */}
            <HouseProp model="kitchenStove" position={[3.0, 0, -11.9]} rotation={[0, Math.PI, 0]}>
                <group />
            </HouseProp>
            <HouseProp model="kitchenSink" position={[3.9, 0, -11.9]} rotation={[0, Math.PI, 0]}>
                <group />
            </HouseProp>
            <HouseProp model="kitchenCabinet" position={[4.76, 0, -11.9]} rotation={[0, Math.PI, 0]}>
                <group />
            </HouseProp>
            {/* Base cabinets + stone counter top */}
            <MatBox pos={[3.75, 0.45, -11.95]} size={[2.9, 0.9, 0.66]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[3.75, 0.93, -11.93]} size={[3.0, 0.06, 0.74]} material={m.stone} shadows={sh} />
            {/* Sink + faucet under the kitchen window */}
            <MatBox pos={[3.9, 0.965, -11.95]} size={[0.62, 0.035, 0.44]} material={m.metal} shadows={false} />
            <MatCyl pos={[3.9, 1.06, -12.16]} r={0.026} h={0.2} material={m.metal} shadows={false} segs={8} />
            <MatBox pos={[3.9, 1.16, -12.08]} size={[0.05, 0.04, 0.2]} material={m.metal} shadows={false} />
            {/* Stove front + burners */}
            <MatBox pos={[2.95, 0.52, -11.6]} size={[0.66, 0.72, 0.06]} material={m.metalDark} shadows={false} />
            {[
                [2.78, -12.06],
                [3.12, -12.06],
                [2.78, -11.82],
                [3.12, -11.82],
            ].map(([bx, bz], i) => (
                <MatCyl key={i} pos={[bx, 0.975, bz]} r={0.085} h={0.02} material={m.black} shadows={false} segs={10} />
            ))}
            {/* Upper cabinets split around the window */}
            <HouseProp model="kitchenUpper" position={[2.85, 1.85, -12.1]} rotation={[0, Math.PI, 0]} anchor="base">
                <MatBox pos={[2.85, 2.2, -12.14]} size={[0.62, 0.7, 0.36]} material={m.wood} shadows={sh} />
            </HouseProp>
            <HouseProp model="kitchenUpper" position={[4.925, 1.85, -12.1]} rotation={[0, Math.PI, 0]} anchor="base">
                <MatBox pos={[4.925, 2.2, -12.14]} size={[0.55, 0.7, 0.36]} material={m.wood} shadows={sh} />
            </HouseProp>
            {/* Extraction hood over the stove */}
            <HouseProp model="rangeHood" position={[3.0, 1.72, -12.08]} rotation={[0, Math.PI, 0]} anchor="base">
                <group />
            </HouseProp>
            {/* Coffee machine on the counter */}
            <HouseProp model="coffeeMachine" position={[4.42, 0.96, -11.95]} rotation={[0, Math.PI - 0.3, 0]}>
                <group />
            </HouseProp>
            {/* Fridge */}
            <HouseProp model="fridge" position={[5.55, 0, -11.9]} rotation={[0, Math.PI, 0]}>
                <>
                    <MatBox pos={[5.66, 1.0, -11.9]} size={[0.78, 2.0, 0.78]} material={m.metal} shadows={sh} />
                    <MatBox pos={[5.30, 1.25, -11.62]} size={[0.05, 0.7, 0.06]} material={m.metalDark} shadows={false} />
                </>
            </HouseProp>
            {/* Dining nook — pedestal table + two chairs */}
            <HouseProp model="diningTable" position={[3.6, 0, -9.7]}>
                <>
                    <MatCyl pos={[3.6, 0.76, -9.7]} r={0.6} h={0.05} material={m.wood} shadows={sh} segs={rich ? 18 : 12} />
                    <MatCyl pos={[3.6, 0.38, -9.7]} r={0.09} h={0.72} material={m.woodDark} shadows={false} segs={8} />
                    <MatCyl pos={[3.6, 0.03, -9.7]} r={0.32} h={0.06} material={m.woodDark} shadows={false} segs={12} />
                </>
            </HouseProp>
            <HouseProp model="diningChair" position={[2.75, 0, -9.45]} rotation={[0, 1.86, 0]}>
                <DiningChair x={2.75} z={-9.45} rotY={1.86} m={m} sh={sh} />
            </HouseProp>
            <HouseProp model="diningChair" position={[4.45, 0, -9.95]} rotation={[0, -1.29, 0]}>
                <DiningChair x={4.45} z={-9.95} rotY={-1.29} m={m} sh={sh} />
            </HouseProp>
            {/* Pendant over the table */}
            {rich && (
                <group position={[3.6, 0, -9.7]}>
                    <MatCyl pos={[0, 2.75, 0]} r={0.015} h={0.7} material={m.metalDark} shadows={false} segs={6} />
                    <mesh position={[0, 2.35, 0]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.16, 0.18, 10, 1, true]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 2.3, 0]}>
                        <sphereGeometry args={[0.05, 8, 6]} />
                        <primitive object={m.bulbWarm} attach="material" />
                    </mesh>
                </group>
            )}

            {/* ── BEDROOM (private room — bed headboard on the west partition,
                clear of the south window and its curtains) ── */}
            <HouseProp model="bed" position={[-4.93, 0, 8.6]} rotation={[0, Math.PI / 2, 0]}>
            <group>
                {/* Platform + mattress — base starts at the headboard face, never in the wall */}
                <MatBox pos={[-4.88, 0.28, 8.6]} size={[2.16, 0.32, 1.85]} material={m.woodDark} shadows={sh} />
                <MatBox pos={[-4.87, 0.52, 8.6]} size={[2.02, 0.18, 1.7]} material={m.fabric} shadows={sh} />
                {/* Headboard flush on the west partition */}
                <MatBox pos={[-6.02, 1.05, 8.6]} size={[0.12, 1.05, 2.4]} material={m.wood} shadows={sh} />
                <MatBox pos={[-5.95, 1.05, 8.6]} size={[0.06, 0.85, 2.15]} material={m.fabricLight} shadows={false} />
                {/* Pillows */}
                <MatBox pos={[-5.55, 0.72, 8.15]} size={[0.35, 0.18, 0.55]} material={m.fabricLight} shadows={false} />
                <MatBox pos={[-5.55, 0.72, 9.05]} size={[0.35, 0.18, 0.55]} material={m.fabricLight} shadows={false} />
                {/* Foot rail + folded throw */}
                <MatBox pos={[-3.84, 0.45, 8.6]} size={[0.08, 0.2, 2.3]} material={m.wood} shadows={false} />
                <MatBox pos={[-4.25, 0.63, 8.6]} size={[0.7, 0.05, 1.72]} material={m.leather} shadows={false} />
                {/* Legs */}
                {[
                    [-5.82, 7.85],
                    [-4.02, 7.85],
                    [-5.82, 9.35],
                    [-4.02, 9.35],
                ].map(([lx, lz], i) => (
                    <MatCyl key={i} pos={[lx, 0.1, lz]} r={0.045} h={0.18} material={m.woodDark} shadows={false} segs={6} />
                ))}
            </group>
            </HouseProp>
            <HouseProp model="nightstand" position={[-5.79, 0, 7.3]} rotation={[0, Math.PI / 2, 0]}>
                <Nightstand x={-5.79} z={7.3} sh={sh} m={m} />
            </HouseProp>
            <HouseProp model="nightstand" position={[-5.79, 0, 9.9]} rotation={[0, Math.PI / 2, 0]}>
                <Nightstand x={-5.79} z={9.9} sh={sh} m={m} />
            </HouseProp>
            {/* Bedside lamps sit on the nightstand tops */}
            <HouseProp model="tableLamp" position={[-5.79, 0.72, 7.3]}>
                <group />
            </HouseProp>
            <HouseProp model="tableLamp" position={[-5.79, 0.72, 9.9]}>
                <group />
            </HouseProp>
            {/* Dresser under the south window (below the sill) */}
            <HouseProp model="dresser" position={[-3.9, 0, 11.95]} rotation={[0, Math.PI, 0]}>
                <MatBox pos={[-3.9, 0.5, 11.95]} size={[1.5, 1.0, 0.52]} material={m.wood} shadows={sh} />
            </HouseProp>
            <MatBox pos={[-3.9, 1.03, 11.95]} size={[1.56, 0.05, 0.56]} material={m.woodDark} shadows={false} />
            {[
                [-4.25, 0.72],
                [-3.55, 0.72],
                [-4.25, 0.36],
                [-3.55, 0.36],
            ].map(([dx, dy], i) => (
                <MatBox key={i} pos={[dx, dy, 11.67]} size={[0.55, 0.24, 0.04]} material={m.woodDark} shadows={false} />
            ))}
            <MatCyl pos={[-3.9, 1.14, 11.95]} r={0.09} h={0.14} material={m.gold} shadows={false} segs={8} />
            {/* Wardrobe on the bedroom north wall */}
            <MatBox pos={[-1.3, 1.1, 3.62]} size={[1.5, 2.2, 0.55]} material={m.wood} shadows={sh} />
            <MatBox pos={[-1.3, 2.24, 3.62]} size={[1.56, 0.08, 0.6]} material={m.woodDark} shadows={false} />
            <MatBox pos={[-1.3, 1.1, 3.33]} size={[0.03, 2.0, 0.04]} material={m.woodDark} shadows={false} />
            <MatCyl pos={[-1.44, 1.1, 3.32]} r={0.022} h={0.24} material={m.gold} shadows={false} segs={6} />
            <MatCyl pos={[-1.16, 1.1, 3.32]} r={0.022} h={0.24} material={m.gold} shadows={false} segs={6} />
            {/* Work corner SE — north of cinema door band (z 5.45–8.25) so doorway stays clear */}
            <Desk pos={[FURN.desk.x, 0, FURN.desk.z]} sh={sh} rich={rich} m={m} monitor chairSign={1} />
            <SoulMirrorMesh low={low} rich={rich} mats={m} />

            {/* ── LIBRARY (a run of cases along the west wall face) ── */}
            <HouseProp model="bookcase" position={[-13.3, 0, -5.0]} rotation={[0, Math.PI / 2, 0]}>
                <WallBookcase wallX={-13.6} wallZ={-5.0} width={4.8} face="west" sh={sh} rich={rich} m={m} low={low} />
            </HouseProp>
            {!low &&
                [-6.65, -5.55, -4.45, -3.35]
                    .filter((z) => z !== -5.0)
                    .map((z) => (
                        <HouseProp
                            key={`case-${z}`}
                            model="bookcase"
                            position={[-13.3, 0, z]}
                            rotation={[0, Math.PI / 2, 0]}
                        >
                            <group />
                        </HouseProp>
                    ))}
            {/* Reading lamp + books on the library table */}
            <HouseProp model="tableLamp" position={[FURN.libraryTable.x - 0.25, 0.75, FURN.libraryTable.z]}>
                <group />
            </HouseProp>
            <HouseProp model="booksStack" position={[FURN.libraryTable.x + 0.2, 0.75, FURN.libraryTable.z]} rotation={[0, 0.5, 0]}>
                <group />
            </HouseProp>
            <AccentChair x={FURN.libraryChair.x} z={FURN.libraryChair.z} sh={sh} m={m} rotY={Math.PI / 2} />
            <ConsoleTable x={FURN.libraryTable.x} z={FURN.libraryTable.z} sh={sh} m={m} />
            <MatBox
                pos={[FURN.libraryTable.x, 0.88, FURN.libraryTable.z]}
                size={[0.36, 0.06, 0.28]}
                material={m.leather}
                shadows={false}
            />

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
            <HouseProp model="desk" position={[FURN.studyDesk.x, 0, FURN.studyDesk.z]}>
                <Desk pos={[FURN.studyDesk.x, 0, FURN.studyDesk.z]} sh={sh} rich={rich} m={m} chairSign={1} />
            </HouseProp>
            <HouseProp model="deskChair" position={[FURN.studyChair.x, 0, FURN.studyChair.z]} rotation={[0, Math.PI, 0]}>
                <group />
            </HouseProp>
            <HouseProp model="monitor" position={[FURN.studyDesk.x, 0.78, FURN.studyDesk.z - 0.16]}>
                <group />
            </HouseProp>
            <HouseProp model="keyboard" position={[FURN.studyDesk.x, 0.78, FURN.studyDesk.z + 0.16]}>
                <group />
            </HouseProp>
            <HouseProp model="mouse" position={[FURN.studyDesk.x + 0.36, 0.78, FURN.studyDesk.z + 0.16]}>
                <group />
            </HouseProp>
            <HouseProp model="trashcan" position={[FURN.studyDesk.x - 1.15, 0, FURN.studyDesk.z + 0.1]}>
                <group />
            </HouseProp>
            <WallBookcase wallX={13.6} wallZ={-5.2} width={3.0} face="east" sh={sh} rich={rich} m={m} low={low} />
            {/* Cinema — frame + live screen (uploaded MP4s via CinemaScreen) */}
            <MatBox pos={[12.55, 0.4, 7.0]} size={[0.48, 0.7, 2.3]} material={m.woodDark} shadows={sh} />
            <MatBox pos={[12.6, 1.65, 7.0]} size={[0.1, 1.55, 2.4]} material={m.black} shadows={sh} />
            <CinemaScreen low={low} />
            <AccentChair x={FURN.cinemaChairA.x} z={FURN.cinemaChairA.z} sh={sh} m={m} rotY={-Math.PI / 2} />
            <AccentChair x={FURN.cinemaChairB.x} z={FURN.cinemaChairB.z} sh={sh} m={m} rotY={-Math.PI / 2} />
            {/* Cinema rug */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10.6, 0.012, 7.0]} receiveShadow={sh}>
                <planeGeometry args={[3.2, 3.0]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {/* Signal Studio desk SE */}
            <MatBox pos={[FURN.studio.x, 0.72, FURN.studio.z]} size={[2.0, 0.06, 0.95]} material={m.metalDark} shadows={sh} />
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
            <MatBox pos={[FURN.studioStool.x, 0.42, FURN.studioStool.z]} size={[0.5, 0.08, 0.48]} material={m.fabric} shadows={sh} />
            <MatCyl pos={[FURN.studioStool.x, 0.2, FURN.studioStool.z]} r={0.05} h={0.32} material={m.metal} shadows={false} segs={6} />

            {/* Ceiling */}
            <mesh position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>

            {/* ── Roof — the house reads as a building from the yard now ── */}
            {/* Slab with eaves overhang (bottom sits just above the interior ceiling) */}
            <MatBox pos={[0, 3.24, 0]} size={[28.6, 0.24, 26.0]} material={m.concrete} shadows={sh} />
            {/* Fascia trim around the eaves */}
            <MatBox pos={[0, 3.24, 13.06]} size={[28.8, 0.3, 0.14]} material={m.woodDark} shadows={false} />
            <MatBox pos={[0, 3.24, -13.06]} size={[28.8, 0.3, 0.14]} material={m.woodDark} shadows={false} />
            <MatBox pos={[-14.36, 3.24, 0]} size={[0.14, 0.3, 26.2]} material={m.woodDark} shadows={false} />
            <MatBox pos={[14.36, 3.24, 0]} size={[0.14, 0.3, 26.2]} material={m.woodDark} shadows={false} />
            {/* Chimney over the hearth */}
            <MatBox pos={[0, 4.15, -11.9]} size={[1.1, 2.1, 0.85]} material={m.stone} shadows={sh} />
            <MatBox pos={[0, 5.28, -11.9]} size={[1.3, 0.14, 1.05]} material={m.concrete} shadows={false} />
            <MatBox pos={[0, 5.42, -11.9]} size={[0.42, 0.18, 0.42]} material={m.black} shadows={false} />

            {/* Architectural finish — trim, windows, sconces, chandeliers */}
            <HouseTrim m={m} low={low} sh={sh} rich={rich} />
        </group>
    );
}
