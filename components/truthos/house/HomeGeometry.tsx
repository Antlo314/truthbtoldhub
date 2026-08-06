'use client';

/**
 * The Safe House, built.
 *
 * Everything here is generated from homeMap: the walls ARE the collider
 * segments (a wall you cannot walk through is a wall you can see — one
 * table, no drift), the floors are the room rectangles, the stair treads
 * step along the same ramp the walker climbs.
 *
 * The exterior follows the render: white stucco masses banded with dark
 * charcoal fascia, deep flat-roof overhangs, a dark brick pier at the
 * entry, warm wood soffits under the balcony, black-framed glazing
 * including the two-storey window stack over the front door, a glass
 * balcony rail with a metal cap, and a wide frosted garage door.
 *
 * Materials come from the shared library so the photo-scanned PBR set
 * already loaded for the world is reused rather than duplicated.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useHouseMaterials } from './HouseMaterials';
import {
    FURNITURE,
    MAIN_COLLIDERS,
    MAIN_Y,
    ROOF_Y,
    ROOMS,
    SHELL,
    STAIR,
    STOREY,
    UPPER_COLLIDERS,
    UPPER_Y,
    type Collider,
} from './homeMap';

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;
const W = X1 - X0;
const D = Z1 - Z0;

/** Wall boxes drawn straight off the collider table for one storey. */
function Walls({
    cols,
    y,
    h,
    mat,
    shadow,
}: {
    cols: Collider[];
    y: number;
    h: number;
    mat: THREE.Material;
    shadow: boolean;
}) {
    return (
        <group>
            {cols.map((c, i) => (
                <mesh key={i} position={[c.x, y + h / 2, c.z]} castShadow={shadow} receiveShadow={shadow}>
                    <boxGeometry args={[c.hx * 2, h, c.hz * 2]} />
                    <primitive object={mat} attach="material" />
                </mesh>
            ))}
        </group>
    );
}

/** A black-framed window: glass pane inside four slim mullions. */
function Window({
    x,
    y,
    z,
    w,
    h,
    facing,
    glass,
    frame,
}: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    facing: 'z' | 'x';
    glass: THREE.Material;
    frame: THREE.Material;
}) {
    const rot: [number, number, number] = facing === 'z' ? [0, 0, 0] : [0, Math.PI / 2, 0];
    const t = 0.07;
    return (
        <group position={[x, y, z]} rotation={rot}>
            <mesh>
                <planeGeometry args={[w, h]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {/* frame: head, sill, two jambs */}
            {[
                [0, h / 2, w, t],
                [0, -h / 2, w, t],
                [-w / 2, 0, t, h],
                [w / 2, 0, t, h],
            ].map(([px, py, pw, ph], i) => (
                <mesh key={i} position={[px, py, 0.015]}>
                    <boxGeometry args={[pw, ph, 0.06]} />
                    <primitive object={frame} attach="material" />
                </mesh>
            ))}
        </group>
    );
}

export default function HomeGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;

    const mats = useMemo(() => {
        return {
            // Warm white stucco — the dominant mass in the render
            stucco: new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.92, metalness: 0.02 }),
            // Charcoal fascia / trim bands and window frames
            trim: new THREE.MeshStandardMaterial({ color: '#2f3237', roughness: 0.62, metalness: 0.18 }),
            // Dark brick pier at the entry and beside the garage
            brick: new THREE.MeshStandardMaterial({ color: '#3a3b40', roughness: 0.95, metalness: 0.03 }),
            // Warm wood soffit under the deep overhangs
            soffit: new THREE.MeshStandardMaterial({ color: '#a9793f', roughness: 0.72, metalness: 0.05 }),
            // Interior partitions
            inner: new THREE.MeshStandardMaterial({ color: '#dedad2', roughness: 0.95 }),
            // Glazing — dark, reflective, lit from within at night
            glass: new THREE.MeshStandardMaterial({
                color: '#9fc4d8',
                transparent: true,
                opacity: 0.28,
                roughness: 0.05,
                metalness: 0.6,
                envMapIntensity: 1.5,
                side: THREE.DoubleSide,
            }),
            // Frosted sectional garage door
            garage: new THREE.MeshStandardMaterial({
                color: '#b9c3c7',
                roughness: 0.42,
                metalness: 0.25,
                transparent: true,
                opacity: 0.9,
            }),
            // Glass balcony rail
            rail: new THREE.MeshStandardMaterial({
                color: '#cfe0ea',
                transparent: true,
                opacity: 0.22,
                roughness: 0.06,
                metalness: 0.4,
                side: THREE.DoubleSide,
            }),
            // Warm glow behind the glass so the house reads as lived-in
            warm: new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }),
        };
    }, []);

    /** Floor slabs, one per walkable room */
    const floors = useMemo(
        () =>
            ROOMS.filter((r) => !r.solid).map((r) => ({
                id: r.id,
                x: (r.minX + r.maxX) / 2,
                z: (r.minZ + r.maxZ) / 2,
                w: r.maxX - r.minX,
                d: r.maxZ - r.minZ,
                y: r.level === 'upper' ? UPPER_Y : MAIN_Y,
                open: !!r.open,
            })),
        [],
    );

    const treads = useMemo(() => {
        const out: { y: number; z: number; d: number }[] = [];
        const run = STAIR.zBottom - STAIR.zTop;
        const step = run / STAIR.treads;
        for (let i = 0; i < STAIR.treads; i++) {
            out.push({
                y: STAIR.yBottom + ((i + 1) / STAIR.treads) * (STAIR.yTop - STAIR.yBottom),
                z: STAIR.zBottom - i * step - step / 2,
                d: step,
            });
        }
        return out;
    }, []);

    const OVER = 0.9; // roof overhang depth

    return (
        <group>
            {/* ── Floors ─────────────────────────────────────── */}
            {floors.map((f) => (
                <mesh
                    key={f.id}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[f.x, f.y + 0.01, f.z]}
                    receiveShadow={sh}
                >
                    <planeGeometry args={[f.w, f.d]} />
                    <primitive
                        object={f.open ? m.concrete : f.y > 1 ? m.woodFloor : m.tile}
                        attach="material"
                    />
                </mesh>
            ))}
            {/* Upper floor slab edge — the house reads as two storeys from outside */}
            <mesh position={[0, UPPER_Y - 0.15, 0]} castShadow={sh}>
                <boxGeometry args={[W + 0.1, 0.3, D + 0.1]} />
                <primitive object={mats.trim} attach="material" />
            </mesh>

            {/* ── Walls ──────────────────────────────────────── */}
            <Walls cols={MAIN_COLLIDERS} y={MAIN_Y} h={STOREY} mat={mats.stucco} shadow={sh} />
            <Walls cols={UPPER_COLLIDERS} y={UPPER_Y} h={STOREY} mat={mats.stucco} shadow={sh} />
            {/* Interior partitions read lighter than the shell */}
            <Walls
                cols={FURNITURE.filter((f) => f.level === 'main')}
                y={MAIN_Y}
                h={0.75}
                mat={m.woodDark}
                shadow={sh}
            />
            <Walls
                cols={FURNITURE.filter((f) => f.level === 'upper')}
                y={UPPER_Y}
                h={0.75}
                mat={m.woodDark}
                shadow={sh}
            />

            {/* ── The stair ──────────────────────────────────── */}
            {treads.map((t, i) => (
                <mesh
                    key={i}
                    position={[(STAIR.minX + STAIR.maxX) / 2, t.y - 0.06, t.z]}
                    castShadow={sh}
                    receiveShadow={sh}
                >
                    <boxGeometry args={[STAIR.maxX - STAIR.minX, 0.12, t.d]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
            ))}
            {/* Stair stringer wall on the west side */}
            <mesh
                position={[STAIR.minX - 0.06, UPPER_Y / 2, (STAIR.zTop + STAIR.zBottom) / 2]}
                castShadow={sh}
            >
                <boxGeometry args={[0.12, UPPER_Y, STAIR.zBottom - STAIR.zTop]} />
                <primitive object={mats.inner} attach="material" />
            </mesh>

            {/* ── Entry: dark brick pier + door ──────────────── */}
            <mesh position={[0.55, STOREY, Z1 - 0.1]} castShadow={sh}>
                <boxGeometry args={[1.5, ROOF_Y, 0.5]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>
            <mesh position={[-1.2, 1.15, Z1 + 0.02]}>
                <planeGeometry args={[1.05, 2.3]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            {/* Warm spill from the double-height foyer */}
            <mesh position={[-1.2, 2.6, Z1 - 0.12]}>
                <planeGeometry args={[2.4, 4.2]} />
                <primitive object={mats.warm} attach="material" />
            </mesh>

            {/* ── The two-storey window stack over the entry ──── */}
            {[
                { x: -4.6, y: 1.55, w: 2.6, h: 1.9 },
                { x: -1.9, y: 1.55, w: 1.6, h: 1.9 },
                { x: -4.6, y: UPPER_Y + 1.7, w: 2.6, h: 2.2 },
                { x: -1.9, y: UPPER_Y + 1.7, w: 1.6, h: 2.2 },
                { x: -0.35, y: UPPER_Y + 1.7, w: 1.0, h: 2.2 },
            ].map((wd, i) => (
                <Window
                    key={`s${i}`}
                    x={wd.x}
                    y={wd.y}
                    z={Z1 + 0.03}
                    w={wd.w}
                    h={wd.h}
                    facing="z"
                    glass={mats.glass}
                    frame={mats.trim}
                />
            ))}
            {/* Living-room glazing, east elevation */}
            {[-0.2, 2.4].map((z, i) => (
                <Window
                    key={`e${i}`}
                    x={X1 + 0.03}
                    y={UPPER_Y + 1.7}
                    z={z}
                    w={2.2}
                    h={2.2}
                    facing="x"
                    glass={mats.glass}
                    frame={mats.trim}
                />
            ))}
            {/* Kitchen band, north elevation */}
            <Window
                x={2.6}
                y={UPPER_Y + 1.75}
                z={Z0 - 0.03}
                w={3.4}
                h={1.8}
                facing="z"
                glass={mats.glass}
                frame={mats.trim}
            />

            {/* ── Garage door — wide frosted sectional ────────── */}
            <mesh position={[4.0, 1.35, Z1 + 0.04]}>
                <planeGeometry args={[5.0, 2.6]} />
                <primitive object={mats.garage} attach="material" />
            </mesh>
            {[0.15, 0.85, 1.55, 2.25].map((y, i) => (
                <mesh key={i} position={[4.0, y, Z1 + 0.07]}>
                    <boxGeometry args={[5.05, 0.05, 0.04]} />
                    <primitive object={mats.trim} attach="material" />
                </mesh>
            ))}
            {/* Brick pier east of the garage door */}
            <mesh position={[X1 - 0.35, STOREY / 2, Z1 - 0.15]} castShadow={sh}>
                <boxGeometry args={[0.7, STOREY, 0.4]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>

            {/* ── Covered balcony over the garage ─────────────── */}
            {/* Glass rail + metal cap along the two open edges */}
            {[
                { x: 4.15, z: Z1 - 0.05, w: 5.3, rotY: 0 },
                { x: 1.55, z: 5.7, w: 3.9, rotY: Math.PI / 2 },
            ].map((r, i) => (
                <group key={i} position={[r.x, UPPER_Y, r.z]} rotation={[0, r.rotY, 0]}>
                    <mesh position={[0, 0.55, 0]}>
                        <planeGeometry args={[r.w, 1.1]} />
                        <primitive object={mats.rail} attach="material" />
                    </mesh>
                    <mesh position={[0, 1.12, 0]}>
                        <boxGeometry args={[r.w, 0.06, 0.09]} />
                        <primitive object={mats.trim} attach="material" />
                    </mesh>
                </group>
            ))}
            {/* Warm wood soffit above the balcony — the render's signature */}
            <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[4.15, ROOF_Y - 0.16, 5.7]}
                receiveShadow={sh}
            >
                <planeGeometry args={[5.3 + OVER, 3.9 + OVER]} />
                <primitive object={mats.soffit} attach="material" />
            </mesh>

            {/* ── Roofs: flat planes, deep overhangs, dark fascia ── */}
            {[
                // Main upper roof over the whole footprint
                { x: 0, z: 0, w: W + OVER * 2, d: D + OVER * 2, y: ROOF_Y },
                // Lower roof stepping down over the west wing (render's stepped massing)
                { x: -4.2, z: 5.4, w: 5.6, d: 5.4, y: UPPER_Y - 0.05 },
            ].map((r, i) => (
                <group key={i}>
                    <mesh position={[r.x, r.y + 0.12, r.z]} castShadow={sh} receiveShadow={sh}>
                        <boxGeometry args={[r.w, 0.24, r.d]} />
                        <primitive object={mats.trim} attach="material" />
                    </mesh>
                    {/* Underside catches warm light near the walls */}
                    {!low && (
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[r.x, r.y - 0.01, r.z]}>
                            <planeGeometry args={[r.w - 0.1, r.d - 0.1]} />
                            <primitive object={mats.soffit} attach="material" />
                        </mesh>
                    )}
                </group>
            ))}

            {/* ── Driveway + front walk ──────────────────────── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.0, 0.015, Z1 + 4.6]} receiveShadow={sh}>
                <planeGeometry args={[6.2, 9.0]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0.02, Z1 + 2.2]} receiveShadow={sh}>
                <planeGeometry args={[1.8, 4.4]} />
                <primitive object={m.path} attach="material" />
            </mesh>

            {/* ── Practicals: warm windows + entry downlights ─── */}
            {!low && (
                <>
                    <pointLight position={[-1.2, 2.2, Z1 - 1.2]} intensity={2.4} color="#ffd9a0" distance={9} decay={2} />
                    <pointLight position={[4.4, UPPER_Y + 1.6, 1.2]} intensity={2.2} color="#ffe6bd" distance={11} decay={2} />
                    <pointLight position={[3.6, UPPER_Y + 1.6, -2.8]} intensity={1.8} color="#fff1d6" distance={9} decay={2} />
                    <pointLight position={[-5.0, 1.5, 5.2]} intensity={1.6} color="#ffd9a0" distance={8} decay={2} />
                    <pointLight position={[4.15, ROOF_Y - 0.5, 5.7]} intensity={1.5} color="#ffcf94" distance={7} decay={2} />
                </>
            )}
        </group>
    );
}
