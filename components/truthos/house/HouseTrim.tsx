'use client';

/**
 * Architectural finish layer — baseboards, crown molding, REAL glazed windows
 * (transparent panes set into actual wall openings — the yard, sky dome and
 * moon show through), wall sconces, ceiling cove strips, chandeliers, porch
 * lights. Mounted from HouseGeometry so it shares one material set.
 *
 * Baseboards + crown derive from WALL_RUNS (same data as meshes/colliders),
 * so trim always follows the walls exactly.
 */
import type * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';
import { WALL_RUNS, WINDOWS, WIN, SHELL, type WallRun } from './houseMap';

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

const BB = 0.06;

/** Wall spans between door openings (baseboard + crown runs) */
function doorSpans(r: WallRun): [number, number][] {
    const doors = r.holes.filter((h) => h.sill < 0.01).sort((a, b) => a.c - b.c);
    const spans: [number, number][] = [];
    let cur = r.from;
    for (const d of doors) {
        spans.push([cur, d.c - d.hw]);
        cur = d.c + d.hw;
    }
    spans.push([cur, r.to]);
    return spans.filter(([a, b]) => b - a > 0.05);
}

/** Emissive cove strips — living + bedroom ceiling perimeter (cheap, no lights) */
const COVE: { x: number; z: number; w: number; d: number }[] = [
    { x: 0, z: -11.85, w: 11.2, d: 0.08 },
    { x: 0, z: -1.55, w: 11.2, d: 0.08 },
    { x: -5.98, z: -6.7, w: 0.08, d: 10.2 },
    { x: 5.98, z: -6.7, w: 0.08, d: 10.2 },
    { x: 0, z: 3.72, w: 11.2, d: 0.08 },
    { x: 0, z: 11.9, w: 11.2, d: 0.08 },
    { x: -5.98, z: 7.8, w: 0.08, d: 8.1 },
    { x: 5.98, z: 7.8, w: 0.08, d: 8.1 },
];

const SCONCES: { pos: [number, number, number]; rotY: number }[] = [
    { pos: [2.6, 1.95, -1.04], rotY: 0 }, // hall, living partition face
    { pos: [-2.6, 1.95, -1.04], rotY: 0 },
    { pos: [1.85, 1.95, 2.99], rotY: Math.PI }, // hall, bedroom partition face (clear of doorway)
    { pos: [-1.85, 1.95, 2.99], rotY: Math.PI },
    { pos: [-5.35, 2.05, 12.32], rotY: Math.PI }, // bedroom S wall
    { pos: [-0.55, 2.05, 12.32], rotY: Math.PI }, // bedroom, above east nightstand
    { pos: [-13.62, 1.9, -1.5], rotY: Math.PI / 2 }, // library W wall
    { pos: [6.31, 1.95, 9.5], rotY: Math.PI / 2 }, // cinema room, partition face
];

/** World transform per exterior wall — local +z faces the room interior */
const WALL_XFORM: Record<
    'N' | 'S' | 'W' | 'E',
    (c: number) => { pos: [number, number, number]; rotY: number }
> = {
    N: (c) => ({ pos: [c, 1.72, SHELL.north], rotY: 0 }),
    S: (c) => ({ pos: [c, 1.72, SHELL.south], rotY: Math.PI }),
    W: (c) => ({ pos: [SHELL.west, 1.72, c], rotY: Math.PI / 2 }),
    E: (c) => ({ pos: [SHELL.east, 1.72, c], rotY: -Math.PI / 2 }),
};

function CurtainPanel({ x, y, h, m, sh }: { x: number; y: number; h: number; m: HouseMaterials; sh: boolean }) {
    return (
        <group position={[x, y, 0.3]}>
            <MatBox pos={[-0.13, 0, 0]} size={[0.13, h, 0.05]} material={m.fabric} shadows={sh} />
            <MatBox pos={[0, 0, 0.028]} size={[0.13, h, 0.05]} material={m.fabricLight} />
            <MatBox pos={[0.13, 0, -0.012]} size={[0.13, h, 0.05]} material={m.fabric} />
        </group>
    );
}

/**
 * Real glazed window — sits in an actual hole cut through the shell wall.
 * Transparent pane at the wall center; casing wraps the cut on both faces.
 */
function GlazedWindow({
    pos,
    rotY,
    curtains = false,
    m,
    sh,
    low,
}: {
    pos: [number, number, number];
    rotY: number;
    curtains?: boolean;
    m: HouseMaterials;
    sh: boolean;
    low: boolean;
}) {
    const w = WIN.w;
    const h = WIN.h;
    const caseD = SHELL.wallT + 0.07; // pokes past both wall faces
    const panelH = h + 0.75;
    const rodY = h / 2 + 0.24;
    return (
        <group position={pos} rotation={[0, rotY, 0]}>
            {/* Transparent pane — the real outdoors shows through */}
            <mesh>
                <planeGeometry args={[w, h]} />
                <primitive object={m.windowGlass} attach="material" />
            </mesh>
            {/* Mullion cross */}
            <MatBox pos={[0, 0, 0]} size={[0.05, h, 0.06]} material={m.woodDark} />
            <MatBox pos={[0, 0, 0]} size={[w, 0.05, 0.06]} material={m.woodDark} />
            {/* Casing around the cut (both faces) */}
            <MatBox pos={[0, h / 2 + 0.03, 0]} size={[w + 0.26, 0.1, caseD]} material={m.wood} />
            <MatBox pos={[0, -(h / 2 + 0.025), 0]} size={[w + 0.26, 0.09, caseD]} material={m.wood} />
            <MatBox pos={[-(w / 2 + 0.03), 0, 0]} size={[0.1, h + 0.2, caseD]} material={m.wood} />
            <MatBox pos={[w / 2 + 0.03, 0, 0]} size={[0.1, h + 0.2, caseD]} material={m.wood} />
            {/* Interior sill ledge */}
            <MatBox
                pos={[0, -(h / 2 + 0.035), 0.14]}
                size={[w + 0.4, 0.07, 0.24]}
                material={m.wood}
                shadows={sh}
            />
            {curtains && !low && (
                <>
                    <mesh position={[0, rodY, 0.28]} rotation={[0, 0, Math.PI / 2]}>
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
            {/* ── Baseboards — generated from WALL_RUNS, both faces where interior ── */}
            {WALL_RUNS.flatMap((r, ri) =>
                doorSpans(r).flatMap(([a, b], si) => {
                    const c = (a + b) / 2;
                    const len = b - a;
                    const sides = r.trim === 'both' ? [1, -1] : r.trim === '+' ? [1] : [-1];
                    return sides.map((s) => {
                        const off = r.at + s * (r.t / 2 + 0.03);
                        return (
                            <MatBox
                                key={`bb-${ri}-${si}-${s}`}
                                pos={r.axis === 'x' ? [c, 0.075, off] : [off, 0.075, c]}
                                size={r.axis === 'x' ? [len, 0.15, BB] : [BB, 0.15, len]}
                                material={m.woodDark}
                            />
                        );
                    });
                }),
            )}

            {/* ── Crown molding — walls now reach the ceiling, so crown every run ── */}
            {rich &&
                WALL_RUNS.flatMap((r, ri) =>
                    doorSpans(r).map(([a, b], si) => {
                        const c = (a + b) / 2;
                        const len = b - a;
                        return (
                            <MatBox
                                key={`cr-${ri}-${si}`}
                                pos={r.axis === 'x' ? [c, 3.0, r.at] : [r.at, 3.0, c]}
                                size={
                                    r.axis === 'x'
                                        ? [len, 0.13, r.t + 0.1]
                                        : [r.t + 0.1, 0.13, len]
                                }
                                material={m.wood}
                            />
                        );
                    }),
                )}

            {/* ── Ceiling cove strips (emissive, no lights) ── */}
            {COVE.map((r, i) => (
                <MatBox
                    key={`cv-${i}`}
                    pos={[r.x, 2.98, r.z]}
                    size={[r.w, 0.045, r.d]}
                    material={m.cove}
                />
            ))}

            {/* ── Real glazed windows (all tiers — the holes are always there) ── */}
            {WINDOWS.map((w, i) => {
                const t = WALL_XFORM[w.wall](w.c);
                return (
                    <GlazedWindow
                        key={`win-${i}`}
                        pos={t.pos}
                        rotY={t.rotY}
                        curtains={w.curtains}
                        m={m}
                        sh={sh}
                        low={low}
                    />
                );
            })}

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
