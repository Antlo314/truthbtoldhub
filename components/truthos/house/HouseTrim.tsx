'use client';

/**
 * Architectural finish layer — baseboards, crown molding, night windows with
 * emissive glass + curtains, wall sconces, ceiling cove strips, chandeliers,
 * porch lights. Mounted from HouseGeometry so it shares one material set.
 *
 * Wall face math: exterior shell walls are 0.35 thick on SHELL lines (faces at
 * ±0.175), partitions are 0.22 thick (faces at ±0.11). Trim sits ~0.03 proud.
 */
import type * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';

function MatBox({
    pos,
    size,
    material,
    shadows = false,
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

type TrimRun = { x: number; z: number; w: number; d: number };

const BB = 0.06;

/** Exterior walls + horizontal partitions (rendered on every tier) */
const BASE_CORE: TrimRun[] = [
    // North shell (split at back door)
    { x: -8.96, z: -12.29, w: 9.3, d: BB },
    { x: 5.71, z: -12.29, w: 15.8, d: BB },
    // South shell (split at front door)
    { x: -7.285, z: 12.29, w: 12.65, d: BB },
    { x: 7.285, z: 12.29, w: 12.65, d: BB },
    // West / east shell
    { x: -13.59, z: 0, w: BB, d: 24.55 },
    { x: 13.59, z: 0, w: BB, d: 24.55 },
    // Living partition z=-1.15, both faces
    { x: -7.62, z: -1.29, w: 11.9, d: BB },
    { x: 7.62, z: -1.29, w: 11.9, d: BB },
    { x: -7.62, z: -1.01, w: 11.9, d: BB },
    { x: 7.62, z: -1.01, w: 11.9, d: BB },
    // Bedroom partition z=3.1, both faces
    { x: -7.5, z: 2.96, w: 12.2, d: BB },
    { x: 7.5, z: 2.96, w: 12.2, d: BB },
    { x: -7.5, z: 3.24, w: 12.2, d: BB },
    { x: 7.5, z: 3.24, w: 12.2, d: BB },
];

/** Vertical partitions x=±6.2 — desktop only (draw-call budget on mobile) */
const BASE_EXTRA: TrimRun[] = [
    { x: -6.34, z: -7.17, w: BB, d: 10.2 },
    { x: -6.06, z: -7.17, w: BB, d: 10.2 },
    { x: -6.34, z: 7.92, w: BB, d: 8.7 },
    { x: -6.06, z: 7.92, w: BB, d: 8.7 },
    { x: 6.06, z: -7.57, w: BB, d: 9.4 },
    { x: 6.34, z: -7.57, w: BB, d: 9.4 },
    { x: 6.06, z: 3.8, w: BB, d: 3.3 },
    { x: 6.34, z: 3.8, w: BB, d: 3.3 },
    { x: 6.06, z: 10.27, w: BB, d: 4.0 },
    { x: 6.34, z: 10.27, w: BB, d: 4.0 },
];

/** Emissive cove strips — living + bedroom ceiling perimeter (cheap, no lights) */
const COVE: TrimRun[] = [
    { x: 0, z: -11.85, w: 11.2, d: 0.08 },
    { x: 0, z: -1.55, w: 11.2, d: 0.08 },
    { x: -5.68, z: -6.7, w: 0.08, d: 10.2 },
    { x: 5.68, z: -6.7, w: 0.08, d: 10.2 },
    { x: 0, z: 3.72, w: 11.2, d: 0.08 },
    { x: 0, z: 11.9, w: 11.2, d: 0.08 },
    { x: -5.68, z: 7.8, w: 0.08, d: 8.1 },
    { x: 5.68, z: 7.8, w: 0.08, d: 8.1 },
];

type WindowSpec = {
    pos: [number, number, number];
    rotY: number;
    curtains?: boolean;
    /** Rendered on mobile too */
    core?: boolean;
};

const WINDOWS: WindowSpec[] = [
    { pos: [3.9, 1.72, -12.31], rotY: 0, curtains: true, core: true }, // living N
    { pos: [-9.6, 1.72, -12.31], rotY: 0 }, // library N
    { pos: [10.2, 1.72, -12.31], rotY: 0 }, // studio N
    { pos: [-3.9, 1.72, 12.31], rotY: Math.PI, curtains: true, core: true }, // bedroom S
    { pos: [3.05, 1.72, 12.31], rotY: Math.PI, curtains: true }, // bedroom S-E
    { pos: [-9.8, 1.72, 12.31], rotY: Math.PI }, // SW room
    { pos: [-13.61, 1.72, -9.6], rotY: Math.PI / 2, core: true }, // library W
    { pos: [-13.61, 1.72, 7.6], rotY: Math.PI / 2 }, // NW room
    { pos: [13.61, 1.72, -1.2], rotY: -Math.PI / 2 }, // study E
    { pos: [13.61, 1.72, 10.4], rotY: -Math.PI / 2, core: true }, // cinema E
];

const SCONCES: { pos: [number, number, number]; rotY: number }[] = [
    { pos: [2.6, 1.95, -1.04], rotY: 0 }, // hall, living partition face (z=-1.04)
    { pos: [-2.6, 1.95, -1.04], rotY: 0 },
    { pos: [1.35, 1.95, 2.99], rotY: Math.PI }, // hall, bedroom partition face (z=2.99)
    { pos: [-1.35, 1.95, 2.99], rotY: Math.PI },
    { pos: [-5.35, 2.05, 12.32], rotY: Math.PI }, // bedroom S wall, west of window+curtains
    { pos: [-0.55, 2.05, 12.32], rotY: Math.PI }, // bedroom, above east nightstand
    { pos: [-13.62, 1.9, -1.5], rotY: Math.PI / 2 }, // library W wall
    { pos: [6.31, 1.95, 9.5], rotY: Math.PI / 2 }, // cinema room, partition face
];

function CurtainPanel({ x, y, h, m, sh }: { x: number; y: number; h: number; m: HouseMaterials; sh: boolean }) {
    return (
        <group position={[x, y, 0.1]}>
            <MatBox pos={[-0.13, 0, 0]} size={[0.13, h, 0.05]} material={m.fabric} shadows={sh} />
            <MatBox pos={[0, 0, 0.028]} size={[0.13, h, 0.05]} material={m.fabricLight} />
            <MatBox pos={[0.13, 0, -0.012]} size={[0.13, h, 0.05]} material={m.fabric} />
        </group>
    );
}

function NightWindow({
    pos,
    rotY,
    w = 1.35,
    h = 1.15,
    curtains = false,
    m,
    sh,
    low,
}: {
    pos: [number, number, number];
    rotY: number;
    w?: number;
    h?: number;
    curtains?: boolean;
    m: HouseMaterials;
    sh: boolean;
    low: boolean;
}) {
    const ft = 0.075;
    const panelH = h + 0.75;
    const rodY = h / 2 + 0.24;
    return (
        <group position={pos} rotation={[0, rotY, 0]}>
            {/* Night-sky pane */}
            <mesh>
                <planeGeometry args={[w, h]} />
                <primitive object={m.nightGlass} attach="material" />
            </mesh>
            {/* Mullions */}
            <MatBox pos={[0, 0, 0.015]} size={[0.045, h, 0.03]} material={m.woodDark} />
            <MatBox pos={[0, 0, 0.015]} size={[w, 0.045, 0.03]} material={m.woodDark} />
            {/* Frame */}
            <MatBox pos={[0, h / 2 + ft / 2, 0.02]} size={[w + ft * 2, ft, 0.1]} material={m.wood} />
            <MatBox pos={[-(w / 2 + ft / 2), 0, 0.02]} size={[ft, h, 0.1]} material={m.wood} />
            <MatBox pos={[w / 2 + ft / 2, 0, 0.02]} size={[ft, h, 0.1]} material={m.wood} />
            {/* Sill */}
            <MatBox pos={[0, -(h / 2 + 0.035), 0.05]} size={[w + 0.34, 0.07, 0.18]} material={m.wood} shadows={sh} />
            {curtains && !low && (
                <>
                    <mesh position={[0, rodY, 0.1]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.022, 0.022, w + 1.15, 6]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                    <CurtainPanel x={-(w / 2 + 0.3)} y={rodY - panelH / 2 + 0.02} h={panelH} m={m} sh={sh} />
                    <CurtainPanel x={w / 2 + 0.3} y={rodY - panelH / 2 + 0.02} h={panelH} m={m} sh={sh} />
                </>
            )}
        </group>
    );
}

function Sconce({ pos, rotY, m, low }: { pos: [number, number, number]; rotY: number; m: HouseMaterials; low: boolean }) {
    return (
        <group position={pos} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0, 0.03]} size={[0.09, 0.24, 0.05]} material={m.metalDark} />
            {/* Up-opening shade */}
            <mesh position={[0, 0.09, 0.1]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.09, 0.13, low ? 6 : 8, 1, true]} />
                <primitive object={m.metal} attach="material" />
            </mesh>
            <mesh position={[0, 0.13, 0.1]}>
                <sphereGeometry args={[0.045, low ? 6 : 8, low ? 4 : 6]} />
                <primitive object={m.bulbWarm} attach="material" />
            </mesh>
        </group>
    );
}

function Chandelier({
    x,
    z,
    m,
    low,
    lit,
    small = false,
}: {
    x: number;
    z: number;
    m: HouseMaterials;
    low: boolean;
    lit: boolean;
    small?: boolean;
}) {
    const arms = low ? 4 : small ? 5 : 6;
    const ringR = small ? 0.32 : 0.42;
    return (
        <group position={[x, 0, z]}>
            {/* Drop rod + collar */}
            <mesh position={[0, 2.96, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            <mesh position={[0, 2.79, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.1, low ? 6 : 8]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            {/* Ring */}
            <mesh position={[0, 2.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[ringR, 0.035, 6, low ? 12 : 20]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            {/* Candle cups + bulbs around the ring */}
            {Array.from({ length: arms }).map((_, i) => {
                const a = (i / arms) * Math.PI * 2;
                const bx = Math.cos(a) * ringR;
                const bz = Math.sin(a) * ringR;
                return (
                    <group key={i}>
                        <mesh position={[bx, 2.67, bz]}>
                            <cylinderGeometry args={[0.028, 0.034, 0.08, 6]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                        <mesh position={[bx, 2.75, bz]}>
                            <sphereGeometry args={[0.045, low ? 6 : 8, low ? 4 : 6]} />
                            <primitive object={m.bulbWarm} attach="material" />
                        </mesh>
                    </group>
                );
            })}
            {lit && <pointLight position={[0, 2.48, 0]} intensity={1.35} distance={9} color="#ffd9a6" decay={2} />}
        </group>
    );
}

function PorchLight({ pos, rotY, m }: { pos: [number, number, number]; rotY: number; m: HouseMaterials }) {
    return (
        <group position={pos} rotation={[0, rotY, 0]}>
            <MatBox pos={[0, 0.06, -0.05]} size={[0.07, 0.26, 0.07]} material={m.metalDark} />
            <MatBox pos={[0, 0, 0.06]} size={[0.17, 0.26, 0.17]} material={m.metalDark} />
            <mesh position={[0, 0, 0.06]}>
                <boxGeometry args={[0.11, 0.16, 0.11]} />
                <primitive object={m.bulbWarm} attach="material" />
            </mesh>
            <mesh position={[0, 0.17, 0.06]}>
                <coneGeometry args={[0.13, 0.1, 4]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
        </group>
    );
}

export default function HouseTrim({
    m,
    low,
    sh,
    rich,
}: {
    m: HouseMaterials;
    low: boolean;
    sh: boolean;
    rich: boolean;
}) {
    return (
        <group>
            {/* ── Baseboards ── */}
            {BASE_CORE.map((r, i) => (
                <MatBox
                    key={`bb-${i}`}
                    pos={[r.x, 0.075, r.z]}
                    size={[r.w, 0.15, r.d]}
                    material={m.woodDark}
                />
            ))}
            {!low &&
                BASE_EXTRA.map((r, i) => (
                    <MatBox
                        key={`bbe-${i}`}
                        pos={[r.x, 0.075, r.z]}
                        size={[r.w, 0.15, r.d]}
                        material={m.woodDark}
                    />
                ))}

            {/* ── Crown molding — exterior shell only (partitions stop at 2.8) ── */}
            {rich &&
                BASE_CORE.slice(0, 6).map((r, i) => (
                    <MatBox
                        key={`cr-${i}`}
                        pos={[r.x, 2.99, r.z]}
                        size={[r.w === BB ? 0.1 : r.w, 0.14, r.d === BB ? 0.1 : r.d]}
                        material={m.wood}
                    />
                ))}

            {/* ── Ceiling cove strips (emissive, no lights) ── */}
            {COVE.map((r, i) => (
                <MatBox
                    key={`cv-${i}`}
                    pos={[r.x, 2.98, r.z]}
                    size={[r.w, 0.045, r.d]}
                    material={m.cove}
                />
            ))}

            {/* ── Night windows ── */}
            {WINDOWS.filter((w) => !low || w.core).map((w, i) => (
                <NightWindow
                    key={`win-${i}`}
                    pos={w.pos}
                    rotY={w.rotY}
                    curtains={w.curtains}
                    m={m}
                    sh={sh}
                    low={low}
                />
            ))}

            {/* ── Wall sconces ── */}
            {SCONCES.map((s, i) => (
                <Sconce key={`sc-${i}`} pos={s.pos} rotY={s.rotY} m={m} low={low} />
            ))}

            {/* ── Ceiling fixtures ── */}
            <Chandelier x={0.1} z={-7.3} m={m} low={low} lit={!low} />
            {!low && <Chandelier x={-1.2} z={6.6} m={m} low={low} lit={false} small />}

            {/* ── Porch lights (exterior faces beside doors) ── */}
            <PorchLight pos={[1.75, 2.1, 12.7]} rotY={0} m={m} />
            <PorchLight pos={[-1.75, 2.1, 12.7]} rotY={0} m={m} />
            <PorchLight pos={[-4.75, 2.1, -12.7]} rotY={Math.PI} m={m} />
            {!low && (
                <>
                    <pointLight position={[0, 2.0, 13.3]} intensity={0.75} distance={6} color="#ffcf8f" decay={2} />
                    <pointLight position={[-3.25, 2.0, -13.3]} intensity={0.7} distance={6} color="#ffcf8f" decay={2} />
                </>
            )}
        </group>
    );
}
