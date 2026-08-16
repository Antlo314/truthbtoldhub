'use client';

/**
 * The Safe House, built — at world scale.
 *
 * Generated from homeMap: walls ARE the collider segments, floors are
 * the room rectangles, treads step along the walker's own ramp. All
 * coordinates pass through the same u() the plan uses, so the geometry
 * doubled the day the plan did, without a second set of numbers.
 *
 * Exterior is the Aether hut: basalt masses, gold-vein trim, violet glass,
 * a single stone walk to the Source well. No driveway, no garage, no woods.
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
    SHELL,
    STOREY,
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
const HOUSE_MAIN = MAIN_COLLIDERS.filter(
    (c) => !JUNGLE_COLLIDERS.includes(c) && !(c.hx > 1.5 && c.hz > 1.5),
);

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
        if (moonRef.current) {
            moonRef.current.visible = sky.moonOpacity > 0.02;
            moonRef.current.lookAt(0, 1.6, 0);
        }
    });

    skyMat.side = THREE.BackSide;
    skyMat.depthWrite = false;
    moonMat.depthWrite = false;
    moonMat.transparent = true;

    return (
        <>
            <mesh frustumCulled={false} scale={[-1, 1, 1]}>
                <sphereGeometry args={[low ? 70 : 110, 24, 16]} />
                <primitive object={skyMat} attach="material" />
            </mesh>
            <mesh ref={moonRef} position={[-38, 52, -44]} frustumCulled={false}>
                <circleGeometry args={[low ? 3.2 : 4.4, 20]} />
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
            stucco: new THREE.MeshStandardMaterial({ color: '#1c1824', roughness: 0.88, metalness: 0.08 }),
            trim: new THREE.MeshStandardMaterial({ color: '#e8c478', roughness: 0.32, metalness: 0.62 }),
            brick: new THREE.MeshStandardMaterial({ color: '#141018', roughness: 0.9, metalness: 0.12 }),
            soffit: new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.7, metalness: 0.08 }),
            inner: new THREE.MeshStandardMaterial({ color: '#241c28', roughness: 0.92 }),
            glass: new THREE.MeshStandardMaterial({
                color: '#6b5cff', transparent: true, opacity: 0.22,
                roughness: 0.08, metalness: 0.45, envMapIntensity: 1.4, side: THREE.DoubleSide,
            }),
            garage: new THREE.MeshStandardMaterial({
                color: '#1a1620', roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.88,
            }),
            rail: new THREE.MeshStandardMaterial({
                color: '#e8c478', transparent: true, opacity: 0.28,
                roughness: 0.2, metalness: 0.55, side: THREE.DoubleSide,
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

    /**
     * Flooring per room, the way a real house is finished. The library has
     * carried tileKitchen / carpet / woodFloorDark / marble since the PBR
     * pass, but every floor in the building drew one of three materials
     * chosen by storey - so the kitchen, the bedrooms and the library all
     * wore the same boards.
     */
    const floorMat = (mm: ReturnType<typeof useHouseMaterials>, f: { id: string; open: boolean }) => {
        if (f.open) return mm.stone;                            // terrace stone
        switch (f.id) {
            case 'kitchen':  return mm.tileKitchen;
            case 'dining':
            case 'living':   return mm.woodHerring;            // hero parquet
            case 'rec':      return mm.woodFloorDark;
            case 'foyer':
            case 'hall_m':
            case 'landing':  return mm.marble;                 // circulation
            case 'bath':
            case 'ensuite':
            case 'pwdr':
            case 'laundry':  return mm.tile;                   // ceramic
            case 'bed_w':
            case 'bed_n':
            case 'bed_u':
            case 'master':
            case 'wic':      return mm.carpet;
            default:         return mm.woodFloor;
        }
    };

    const floors = useMemo(
        () =>
            ROOMS.filter((r) => !r.solid).map((r) => ({
                id: r.id,
                x: (r.minX + r.maxX) / 2,
                z: (r.minZ + r.maxZ) / 2,
                w: r.maxX - r.minX,
                d: r.maxZ - r.minZ,
                y: MAIN_Y,
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
                    <primitive object={floorMat(m, f)} attach="material" />
                </mesh>
            ))}

            {/* ── Walls — one storey ─────────────────────────── */}
            <Walls cols={HOUSE_MAIN} y={MAIN_Y} h={STOREY} mat={m.stone} shadow={sh} />

            {/* The stair, its enclosure and all finish carpentry live in
                HomeInterior — built as joinery, not extruded boxes. */}

            {/* ── Entry: one-storey pier + warm door glow ── */}
            <mesh position={[u(0.7), STOREY / 2, Z1 - 0.12]} castShadow={sh}>
                <boxGeometry args={[2.1, STOREY, 0.5]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>
            <mesh position={[u(-0.4), 1.25, Z1 + 0.02]}>
                <planeGeometry args={[1.6, 2.5]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[u(-0.4), 2.55, Z1 - 0.12]}>
                <planeGeometry args={[2.8, 1.6]} />
                <primitive object={mats.warm} attach="material" />
            </mesh>

            {/* ── Glazing — one band, no stacked storeys ── */}
            {[
                { x: u(-4.8), y: 1.7, w: 3.2, h: 2.15 },
                { x: u(1.8), y: 1.7, w: 2.4, h: 2.15 },
            ].map((wd, i) => (
                <Window key={`s${i}`} x={wd.x} y={wd.y} z={Z1 + 0.03} w={wd.w} h={wd.h} facing="z" glass={mats.glass} frame={mats.trim} />
            ))}
            <Window x={X1 + 0.03} y={1.7} z={u(1.6)} w={3.0} h={2.15} facing="x" glass={mats.glass} frame={mats.trim} />
            {[u(5.8), u(-2.2)].map((z, i) => (
                <Window key={`w${i}`} x={X0 - 0.03} y={1.7} z={z} w={2.6} h={2.1} facing="x" glass={mats.glass} frame={mats.trim} />
            ))}
            <Window x={u(5.2)} y={1.7} z={Z0 - 0.03} w={4.6} h={2.0} facing="z" glass={mats.glass} frame={mats.trim} />

            <mesh position={[X1 - 0.45, STOREY / 2, Z1 - 0.16]} castShadow={sh}>
                <boxGeometry args={[0.9, STOREY, 0.42]} />
                <primitive object={mats.brick} attach="material" />
            </mesh>

            {/* ── One roof ───────────────────────────────────── */}
            <mesh position={[0, ROOF_Y + 0.12, 0]} castShadow={sh} receiveShadow={sh}>
                <boxGeometry args={[W + OVER * 2, 0.26, D + OVER * 2]} />
                <primitive object={mats.trim} attach="material" />
            </mesh>

            {/* ── Gold eve band + stone walk to the Source well ─ */}
            <mesh position={[0, ROOF_Y - 0.08, 0]}>
                <boxGeometry args={[W + OVER * 2 + 0.2, 0.08, D + OVER * 2 + 0.2]} />
                <primitive object={mats.trim} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[u(-0.4), 0.02, Z1 + 2.8]} receiveShadow={sh}>
                <planeGeometry args={[2.6, 6.0]} />
                <primitive object={m.stone} attach="material" />
            </mesh>

            {/* ── Practicals ─────────────────────────────────── */}
            {!low && (
                <>
                    <pointLight position={[u(-0.4), 2.5, Z1 - 1.5]} intensity={2.4} color="#ffd9a0" distance={11} decay={2} />
                    <pointLight position={[u(5.2), 2.2, u(1.4)]} intensity={2.0} color="#ffe6bd" distance={12} decay={2} />
                    <pointLight position={[u(-5.2), 1.8, u(5.2)]} intensity={1.6} color="#ffd9a0" distance={9} decay={2} />
                </>
            )}
        </group>
    );
}
