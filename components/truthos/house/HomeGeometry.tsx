'use client';

/**
 * The Safe House, built — at world scale.
 *
 * Generated from homeMap: walls ARE the collider segments, floors are
 * the room rectangles, treads step along the walker's own ramp. All
 * coordinates pass through the same u() the plan uses, so the geometry
 * doubled the day the plan did, without a second set of numbers.
 *
 * Exterior follows the render: white stucco masses banded in charcoal,
 * deep flat-roof overhangs, dark brick entry pier, warm wood balcony
 * soffit, black-framed glazing with a two-storey stack over the entry,
 * glass balcony rail, frosted sectional garage door.
 *
 * The sky dome and moon live here now — the old YardGeometry carried
 * them for the old house, and this file replaces it.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSky } from './DayNightCycle';
import { useHouseMaterials } from './HouseMaterials';
import {
    FURNITURE,
    MAIN_COLLIDERS,
    MAIN_Y,
    ROOF_Y,
    ROOMS,
    SHAFT,
    SHELL,
    STOREY,
    UPPER_COLLIDERS,
    UPPER_Y,
    VOID,
    u,
    type Collider,
} from './homeMap';
import { JUNGLE_COLLIDERS } from './jungleMap';

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;
const W = X1 - X0;
const D = Z1 - Z0;

/** House walls only — the jungle's boxes are terrain, not architecture */
const HOUSE_MAIN = MAIN_COLLIDERS.filter((c) => !JUNGLE_COLLIDERS.includes(c));

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

/**
 * Sky that follows the world clock. The dome texture is a night gradient, so
 * instead of trying to tint it into a day sky it FADES — at noon it goes
 * transparent and the scene background (already repainted every frame by
 * DayNightCycle to the sky/fog colour) becomes the daytime sky. The moon
 * rides its own opacity from the same resolved state.
 */
function SkyAndMoon({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const skyMat = m.sky as THREE.MeshBasicMaterial;
    const moonMat = m.moon as THREE.MeshBasicMaterial;
    const moonRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        const sky = getSky();
        // Night dome fully opaque below ~35% daylight, gone by ~80%
        const nightness = Math.max(0, Math.min(1, 1 - (sky.daylight - 0.35) / 0.45));
        if (!skyMat.transparent) skyMat.transparent = true;
        skyMat.opacity = nightness;
        moonMat.opacity = sky.moonOpacity;
        if (moonRef.current) moonRef.current.visible = sky.moonOpacity > 0.02;
    });

    return (
        <>
            <mesh frustumCulled={false}>
                <sphereGeometry args={[low ? 240 : 480, low ? 24 : 40, low ? 14 : 22]} />
                <primitive object={skyMat} attach="material" />
            </mesh>
            <mesh
                ref={moonRef}
                position={low ? [-97, 123, -134] : [-195, 246, -267]}
                onUpdate={(self: THREE.Mesh) => self.lookAt(0, 3, 0)}
            >
                <planeGeometry args={low ? [41, 41] : [82, 82]} />
                <primitive object={moonMat} attach="material" />
            </mesh>
        </>
    );
}

function Window({
    x, y, z, w, h, facing, glass, frame,
}: {
    x: number; y: number; z: number; w: number; h: number;
    facing: 'z' | 'x';
    glass: THREE.Material;
    frame: THREE.Material;
}) {
    const rot: [number, number, number] = facing === 'z' ? [0, 0, 0] : [0, Math.PI / 2, 0];
    const t = 0.08;
    return (
        <group position={[x, y, z]} rotation={rot}>
            <mesh>
                <planeGeometry args={[w, h]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {[
                [0, h / 2, w, t],
                [0, -h / 2, w, t],
                [-w / 2, 0, t, h],
                [w / 2, 0, t, h],
                [0, 0, t * 0.7, h], // centre mullion
            ].map(([px, py, pw, ph], i) => (
                <mesh key={i} position={[px, py, 0.02]}>
                    <boxGeometry args={[pw, ph, 0.07]} />
                    <primitive object={frame} attach="material" />
                </mesh>
            ))}
        </group>
    );
}

export default function HomeGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;

    const mats = useMemo(
        () => ({
            stucco: new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.92, metalness: 0.02 }),
            trim: new THREE.MeshStandardMaterial({ color: '#2f3237', roughness: 0.62, metalness: 0.18 }),
            brick: new THREE.MeshStandardMaterial({ color: '#3a3b40', roughness: 0.95, metalness: 0.03 }),
            soffit: new THREE.MeshStandardMaterial({ color: '#a9793f', roughness: 0.72, metalness: 0.05 }),
            inner: new THREE.MeshStandardMaterial({ color: '#dedad2', roughness: 0.95 }),
            glass: new THREE.MeshStandardMaterial({
                color: '#9fc4d8', transparent: true, opacity: 0.28,
                roughness: 0.05, metalness: 0.6, envMapIntensity: 1.5, side: THREE.DoubleSide,
            }),
            garage: new THREE.MeshStandardMaterial({
                color: '#b9c3c7', roughness: 0.42, metalness: 0.25, transparent: true, opacity: 0.9,
            }),
            rail: new THREE.MeshStandardMaterial({
                color: '#cfe0ea', transparent: true, opacity: 0.22,
                roughness: 0.06, metalness: 0.4, side: THREE.DoubleSide,
            }),
            warm: (() => {
                // Entry glow pane — dims with daylight via LampGroup's glow tag
                const w = new THREE.MeshBasicMaterial({
                    color: '#ffd9a0',
                    toneMapped: false,
                    transparent: true,
                });
                w.userData.lampGlow = true;
                return w;
            })(),
        }),
        [],
    );

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


    const OVER = 1.4;

    return (
        <group>
            {/* ── Sky — the dome and moon this world looks up into ── */}
            <SkyAndMoon m={m} low={low} />

            {/* ── Floors ─────────────────────────────────────── */}
            {floors.map((f) => (
                <mesh
                    key={f.id}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[f.x, f.y + 0.01, f.z]}
                    receiveShadow={sh}
                >
                    <planeGeometry args={[f.w, f.d]} />
                    <primitive object={f.open ? m.concrete : f.y > 1 ? m.woodFloor : m.tile} attach="material" />
                </mesh>
            ))}
            {/* The upper storey is ONE slab with two holes — the stairwell
                and the foyer void — cut as five rectangles. Room floors above
                are finishes; this is the structure you actually stand on, and
                it is the same shape onUpperFootprint tests against. */}
            {[
                { x: 0, z: (Z0 + SHAFT.minZ) / 2, w: W, d: SHAFT.minZ - Z0 },
                { x: (X0 + SHAFT.minX) / 2, z: (SHAFT.minZ + SHAFT.maxZ) / 2, w: SHAFT.minX - X0, d: SHAFT.maxZ - SHAFT.minZ },
                { x: (SHAFT.maxX + X1) / 2, z: (SHAFT.minZ + SHAFT.maxZ) / 2, w: X1 - SHAFT.maxX, d: SHAFT.maxZ - SHAFT.minZ },
                { x: (X0 + VOID.minX) / 2, z: (VOID.minZ + Z1) / 2, w: VOID.minX - X0, d: Z1 - VOID.minZ },
                { x: (VOID.maxX + X1) / 2, z: (VOID.minZ + Z1) / 2, w: X1 - VOID.maxX, d: Z1 - VOID.minZ },
            ].map((p, i) => (
                <mesh key={i} position={[p.x, UPPER_Y - 0.15, p.z]} castShadow={sh} receiveShadow={sh}>
                    <boxGeometry args={[p.w, 0.3, p.d]} />
                    <primitive object={mats.trim} attach="material" />
                </mesh>
            ))}

            {/* ── Walls ──────────────────────────────────────── */}
            <Walls cols={HOUSE_MAIN} y={MAIN_Y} h={STOREY} mat={mats.stucco} shadow={sh} />
            <Walls cols={UPPER_COLLIDERS} y={UPPER_Y} h={STOREY} mat={mats.stucco} shadow={sh} />

            {/* The stair, its enclosure and all finish carpentry live in
                HomeInterior — built as joinery, not extruded boxes. */}

            {/* ── Entry: brick pier, door, warm two-storey glow ── */}
            <mesh position={[u(0.55), STOREY, Z1 - 0.12]} castShadow={sh}>
                <boxGeometry args={[2.4, ROOF_Y, 0.55]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>
            <mesh position={[u(-1.2), 1.25, Z1 + 0.02]}>
                <planeGeometry args={[1.5, 2.5]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[u(-1.2), 3.4, Z1 - 0.14]}>
                <planeGeometry args={[3.4, 6.0]} />
                <primitive object={mats.warm} attach="material" />
            </mesh>

            {/* ── Glazing ────────────────────────────────────── */}
            {/* South stack over the entry + rec-room front windows */}
            {[
                { x: u(-4.6), y: 1.7, w: 3.6, h: 2.3 },
                { x: u(-1.9), y: 1.7, w: 2.2, h: 2.3 },
                { x: u(-4.6), y: UPPER_Y + 1.75, w: 3.6, h: 2.6 },
                { x: u(-1.9), y: UPPER_Y + 1.75, w: 2.2, h: 2.6 },
                { x: u(-0.35), y: UPPER_Y + 1.75, w: 1.4, h: 2.6 },
            ].map((wd, i) => (
                <Window key={`s${i}`} x={wd.x} y={wd.y} z={Z1 + 0.03} w={wd.w} h={wd.h} facing="z" glass={mats.glass} frame={mats.trim} />
            ))}
            {/* East living glazing + west master/rec windows */}
            {[u(-0.2), u(2.4)].map((z, i) => (
                <Window key={`e${i}`} x={X1 + 0.03} y={UPPER_Y + 1.75} z={z} w={3.2} h={2.6} facing="x" glass={mats.glass} frame={mats.trim} />
            ))}
            {[
                { z: u(5.6), y: 1.7 },
                { z: u(-2.0), y: 1.7 },
                { z: u(5.6), y: UPPER_Y + 1.75 },
                { z: u(0.9), y: UPPER_Y + 1.75 },
            ].map((wd, i) => (
                <Window key={`w${i}`} x={X0 - 0.03} y={wd.y} z={wd.z} w={2.8} h={2.4} facing="x" glass={mats.glass} frame={mats.trim} />
            ))}
            {/* Kitchen band, north */}
            <Window x={u(2.6)} y={UPPER_Y + 1.8} z={Z0 - 0.03} w={5.2} h={2.2} facing="z" glass={mats.glass} frame={mats.trim} />

            {/* ── Garage door ────────────────────────────────── */}
            <mesh position={[u(4.0), 1.5, Z1 + 0.04]}>
                <planeGeometry args={[9.4, 3.0]} />
                <primitive object={mats.garage} attach="material" />
            </mesh>
            {[0.25, 1.0, 1.75, 2.5].map((y, i) => (
                <mesh key={i} position={[u(4.0), y, Z1 + 0.07]}>
                    <boxGeometry args={[9.45, 0.06, 0.04]} />
                    <primitive object={mats.trim} attach="material" />
                </mesh>
            ))}
            <mesh position={[X1 - 0.5, STOREY / 2, Z1 - 0.16]} castShadow={sh}>
                <boxGeometry args={[1.0, STOREY, 0.45]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>

            {/* ── Balcony rails + wood soffit ────────────────── */}
            {(() => {
                const balcW = X1 - u(1.5);
                const balcCX = (u(1.5) + X1) / 2;
                const balcD = Z1 - u(3.8);
                const balcCZ = (u(3.8) + Z1) / 2;
                return (
                    <>
                        <group position={[balcCX, UPPER_Y, Z1 - 0.06]}>
                            <mesh position={[0, 0.55, 0]}>
                                <planeGeometry args={[balcW, 1.1]} />
                                <primitive object={mats.rail} attach="material" />
                            </mesh>
                            <mesh position={[0, 1.12, 0]}>
                                <boxGeometry args={[balcW, 0.06, 0.1]} />
                                <primitive object={mats.trim} attach="material" />
                            </mesh>
                        </group>
                        <group position={[u(1.5) + 0.06, UPPER_Y, balcCZ]} rotation={[0, Math.PI / 2, 0]}>
                            <mesh position={[0, 0.55, 0]}>
                                <planeGeometry args={[balcD, 1.1]} />
                                <primitive object={mats.rail} attach="material" />
                            </mesh>
                            <mesh position={[0, 1.12, 0]}>
                                <boxGeometry args={[balcD, 0.06, 0.1]} />
                                <primitive object={mats.trim} attach="material" />
                            </mesh>
                        </group>
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[balcCX, ROOF_Y - 0.18, balcCZ]} receiveShadow={sh}>
                            <planeGeometry args={[balcW + OVER, balcD + OVER]} />
                            <primitive object={mats.soffit} attach="material" />
                        </mesh>
                    </>
                );
            })()}

            {/* ── Roofs ──────────────────────────────────────── */}
            <mesh position={[0, ROOF_Y + 0.14, 0]} castShadow={sh} receiveShadow={sh}>
                <boxGeometry args={[W + OVER * 2, 0.28, D + OVER * 2]} />
                <primitive object={mats.trim} attach="material" />
            </mesh>
            {/* Stepped lower roof over the west wing */}
            <mesh position={[u(-4.2), UPPER_Y - 0.02, u(5.4)]} castShadow={sh}>
                <boxGeometry args={[u(5.6), 0.26, u(5.4)]} />
                <primitive object={mats.trim} attach="material" />
            </mesh>

            {/* ── Driveway + front walk ──────────────────────── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[u(4.0), 0.015, Z1 + 5.4]} receiveShadow={sh}>
                <planeGeometry args={[10.0, 10.8]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[u(-1.2), 0.02, Z1 + 2.6]} receiveShadow={sh}>
                <planeGeometry args={[2.4, 5.2]} />
                <primitive object={m.path} attach="material" />
            </mesh>

            {/* ── Practicals ─────────────────────────────────── */}
            {!low && (
                <>
                    <pointLight position={[u(-1.2), 2.6, Z1 - 1.6]} intensity={2.6} color="#ffd9a0" distance={12} decay={2} />
                    <pointLight position={[u(4.4), UPPER_Y + 1.7, u(1.2)]} intensity={2.4} color="#ffe6bd" distance={14} decay={2} />
                    <pointLight position={[u(3.6), UPPER_Y + 1.7, u(-2.8)]} intensity={2.0} color="#fff1d6" distance={12} decay={2} />
                    <pointLight position={[u(-5.0), 1.8, u(5.2)]} intensity={1.8} color="#ffd9a0" distance={10} decay={2} />
                    <pointLight position={[u(-5.0), UPPER_Y + 1.8, u(5.4)]} intensity={1.5} color="#ffe6bd" distance={10} decay={2} />
                    <pointLight position={[(u(1.5) + X1) / 2, ROOF_Y - 0.6, (u(3.8) + Z1) / 2]} intensity={1.6} color="#ffcf94" distance={9} decay={2} />
                </>
            )}
        </group>
    );
}
