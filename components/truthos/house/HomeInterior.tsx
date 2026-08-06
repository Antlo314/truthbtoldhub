'use client';

/**
 * The finish carpentry — what separates a box from a room.
 *
 * Untrimmed geometry always reads as a diagram: walls meet floors on a
 * hard zero-width line, doorways are holes, ceilings are absent, and the
 * eye has nothing to measure scale against. This file adds the things a
 * real interior has and a modelled one usually forgets:
 *
 *   · skirting at every wall/floor junction, cast from the SAME collider
 *     table the walls are, so trim can never drift from architecture
 *   · cased openings — every doorway gets a lining and a head
 *   · ceilings per storey, with a shadow-gap cove instead of a butt joint
 *   · concealed cove lighting washing the ceiling plane
 *   · the stair as real joinery: closed stringer, treads AND risers, a
 *     glass balustrade with a timber handrail, newels at both ends
 *
 * Everything is derived, nothing is hand-placed, and the whole file is
 * gated off on `low` — a phone gets the clean shell.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useHouseMaterials } from './HouseMaterials';
import {
    DOORWAYS,
    MAIN_COLLIDERS,
    MAIN_DOORWAYS_END,
    MAIN_Y,
    SHAFT,
    SHELL,
    STAIR,
    STAIR_WALLS,
    STOREY,
    UPPER_COLLIDERS,
    UPPER_Y,
    u,
    type Collider,
} from './homeMap';
import { JUNGLE_COLLIDERS } from './jungleMap';

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;

/** House walls only — jungle boxes are terrain */
const houseWalls = (cols: Collider[]) => cols.filter((c) => !JUNGLE_COLLIDERS.includes(c));

/* ── Skirting ──────────────────────────────────────────────
   One low box per wall, inset a hair so it reads as applied trim
   rather than a thicker wall. Instanced: ~60 walls, one draw call. */
function Skirting({
    cols,
    y,
    mat,
}: {
    cols: Collider[];
    y: number;
    mat: THREE.Material;
}) {
    const ref = (mesh: THREE.InstancedMesh | null) => {
        if (!mesh) return;
        const m = new THREE.Matrix4();
        cols.forEach((c, i) => {
            const long = c.hx > c.hz;
            m.compose(
                new THREE.Vector3(c.x, y + 0.06, c.z),
                new THREE.Quaternion(),
                new THREE.Vector3(
                    long ? c.hx * 2 : c.hx * 2 + 0.05,
                    0.12,
                    long ? c.hz * 2 + 0.05 : c.hz * 2,
                ),
            );
            mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    };
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, cols.length]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <primitive object={mat} attach="material" />
        </instancedMesh>
    );
}

/* ── The stair, as joinery ─────────────────────────────────
   Treads and risers both — a flight of floating slabs is the single
   loudest tell that a stair was modelled rather than built. */
function Stair({
    m,
    mats,
    shadow,
}: {
    m: ReturnType<typeof useHouseMaterials>;
    mats: Record<string, THREE.Material>;
    shadow: boolean;
}) {
    const cx = (STAIR.minX + STAIR.maxX) / 2;
    const width = STAIR.maxX - STAIR.minX;
    const run = STAIR.zBottom - STAIR.zTop;
    const going = run / STAIR.treads;
    const rise = (STAIR.yTop - STAIR.yBottom) / STAIR.treads;

    const steps = useMemo(
        () =>
            Array.from({ length: STAIR.treads }, (_, i) => ({
                y: STAIR.yBottom + (i + 1) * rise,
                z: STAIR.zBottom - i * going - going / 2,
                zRiser: STAIR.zBottom - (i + 1) * going,
            })),
        [going, rise],
    );

    // Balustrade posts march up the open (east) side
    const posts = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => {
                const t = i / 6;
                return {
                    z: STAIR.zBottom - t * run,
                    y: STAIR.yBottom + t * (STAIR.yTop - STAIR.yBottom),
                };
            }),
        [run],
    );

    return (
        <group>
            {steps.map((s, i) => (
                <group key={i}>
                    {/* tread */}
                    <mesh position={[cx, s.y - 0.025, s.z]} castShadow={shadow} receiveShadow={shadow}>
                        <boxGeometry args={[width, 0.05, going + 0.03]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                    {/* riser — the vertical face that makes it a stair */}
                    <mesh position={[cx, s.y - rise / 2 - 0.02, s.zRiser]} receiveShadow={shadow}>
                        <boxGeometry args={[width, rise, 0.04]} />
                        <primitive object={mats.riser} attach="material" />
                    </mesh>
                </group>
            ))}

            {/* Closed stringers, raked under both edges */}
            {[STAIR.minX + 0.04, STAIR.maxX - 0.04].map((x, i) => (
                <mesh
                    key={i}
                    position={[x, (STAIR.yBottom + STAIR.yTop) / 2 - 0.28, (STAIR.zTop + STAIR.zBottom) / 2]}
                    rotation={[Math.atan2(STAIR.yTop - STAIR.yBottom, run), 0, 0]}
                    castShadow={shadow}
                >
                    <boxGeometry args={[0.08, 0.34, Math.hypot(run, STAIR.yTop - STAIR.yBottom)]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}

            {/* Glass balustrade on the open side + timber handrail */}
            <mesh
                position={[
                    STAIR.maxX + 0.05,
                    (STAIR.yBottom + STAIR.yTop) / 2 + 0.52,
                    (STAIR.zTop + STAIR.zBottom) / 2,
                ]}
                rotation={[Math.atan2(STAIR.yTop - STAIR.yBottom, run), Math.PI / 2, 0]}
            >
                <planeGeometry args={[Math.hypot(run, STAIR.yTop - STAIR.yBottom), 0.95]} />
                <primitive object={mats.rail} attach="material" />
            </mesh>
            <mesh
                position={[
                    STAIR.maxX + 0.05,
                    (STAIR.yBottom + STAIR.yTop) / 2 + 1.02,
                    (STAIR.zTop + STAIR.zBottom) / 2,
                ]}
                rotation={[Math.atan2(STAIR.yTop - STAIR.yBottom, run), 0, 0]}
                castShadow={shadow}
            >
                <boxGeometry args={[0.09, 0.06, Math.hypot(run, STAIR.yTop - STAIR.yBottom)]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            {posts.map((p, i) => (
                <mesh key={i} position={[STAIR.maxX + 0.05, p.y + 0.52, p.z]} castShadow={shadow}>
                    <boxGeometry args={[0.05, 1.04, 0.05]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
            ))}

            {/* Landing-edge rail around the top of the shaft */}
            <mesh position={[cx, STAIR.yTop + 0.52, STAIR.zTop - 0.06]}>
                <planeGeometry args={[width, 0.95]} />
                <primitive object={mats.rail} attach="material" />
            </mesh>

            {/* Stair light — the flight is the darkest place in the house */}
            <pointLight
                position={[cx, STAIR.yTop - 0.4, (STAIR.zTop + STAIR.zBottom) / 2]}
                intensity={1.7}
                color="#ffe6bd"
                distance={11}
                decay={2}
            />
        </group>
    );
}

export default function HomeInterior({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;

    const mats = useMemo(
        () => ({
            skirting: new THREE.MeshStandardMaterial({ color: '#f2efe9', roughness: 0.55 }),
            ceiling: new THREE.MeshStandardMaterial({ color: '#f6f4f0', roughness: 0.97 }),
            riser: new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.8 }),
            rail: new THREE.MeshStandardMaterial({
                color: '#cfe0ea',
                transparent: true,
                opacity: 0.2,
                roughness: 0.05,
                metalness: 0.4,
                side: THREE.DoubleSide,
            }),
            cove: new THREE.MeshBasicMaterial({ color: '#ffdfae', toneMapped: false }),
            shaftWall: new THREE.MeshStandardMaterial({ color: '#e4e0d8', roughness: 0.94 }),
        }),
        [],
    );

    const mainWalls = useMemo(() => houseWalls(MAIN_COLLIDERS), []);
    const upperWalls = useMemo(() => houseWalls(UPPER_COLLIDERS), []);

    if (low) {
        // Phones get the stair (you must be able to climb it) and nothing else
        return <Stair m={m} mats={mats} shadow={false} />;
    }

    const coveInset = 0.35;

    return (
        <group>
            {/* ── The stair enclosure, built ─────────────────── */}
            {STAIR_WALLS.map((w, i) => (
                <mesh
                    key={i}
                    position={[w.x, UPPER_Y / 2 + 0.4, w.z]}
                    castShadow={sh}
                    receiveShadow={sh}
                >
                    <boxGeometry args={[w.hx * 2, UPPER_Y + 0.8, w.hz * 2]} />
                    <primitive object={mats.shaftWall} attach="material" />
                </mesh>
            ))}

            <Stair m={m} mats={mats} shadow={sh} />

            {/* ── Skirting on both storeys ───────────────────── */}
            <Skirting cols={mainWalls} y={MAIN_Y} mat={mats.skirting} />
            <Skirting cols={upperWalls} y={UPPER_Y} mat={mats.skirting} />

            {/* ── Ceilings with a shadow-gap cove ────────────── */}
            {[
                { y: UPPER_Y - 0.18, label: 'main' },
                { y: UPPER_Y + STOREY - 0.18, label: 'upper' },
            ].map((c) => (
                <group key={c.label}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, c.y, 0]} receiveShadow={sh}>
                        <planeGeometry args={[X1 - X0 - coveInset * 2, Z1 - Z0 - coveInset * 2]} />
                        <primitive object={mats.ceiling} attach="material" />
                    </mesh>
                    {/* Concealed cove: a bright strip inside the shadow gap,
                        washing the ceiling from its perimeter */}
                    {[
                        { x: 0, z: Z0 + coveInset, w: X1 - X0, d: 0.1 },
                        { x: 0, z: Z1 - coveInset, w: X1 - X0, d: 0.1 },
                        { x: X0 + coveInset, z: 0, w: 0.1, d: Z1 - Z0 },
                        { x: X1 - coveInset, z: 0, w: 0.1, d: Z1 - Z0 },
                    ].map((s, i) => (
                        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[s.x, c.y - 0.03, s.z]}>
                            <planeGeometry args={[s.w, s.d]} />
                            <primitive object={mats.cove} attach="material" />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Ambient lift from the coves — soft, so the ceiling reads lit
                rather than the room being flooded */}
            <pointLight position={[0, UPPER_Y - 0.5, 6]} intensity={1.1} color="#ffdfae" distance={20} decay={2} />
            <pointLight position={[0, UPPER_Y - 0.5, -6]} intensity={1.0} color="#ffdfae" distance={20} decay={2} />
            <pointLight position={[4, UPPER_Y + STOREY - 0.6, 2]} intensity={1.2} color="#ffe6c8" distance={22} decay={2} />
            <pointLight position={[-4, UPPER_Y + STOREY - 0.6, -2]} intensity={1.0} color="#ffe6c8" distance={20} decay={2} />

            {/* ── Cased openings — a doorway is joinery, not a hole ────
                Two jambs and a head per opening, from the same DOORWAYS
                table the colliders were punched from. */}
            {DOORWAYS.map((d, i) => {
                const y = i < MAIN_DOORWAYS_END ? MAIN_Y : UPPER_Y;
                const H = 2.3;
                const along = d.axis === 'x';
                return (
                    <group key={`case-${i}`} position={[d.x, y, d.z]}>
                        {[-1, 1].map((s2) => (
                            <mesh
                                key={s2}
                                position={along ? [s2 * (d.w / 2), H / 2, 0] : [0, H / 2, s2 * (d.w / 2)]}
                                castShadow={sh}
                            >
                                <boxGeometry args={along ? [0.09, H, 0.3] : [0.3, H, 0.09]} />
                                <primitive object={m.woodDark} attach="material" />
                            </mesh>
                        ))}
                        <mesh position={[0, H + 0.05, 0]} castShadow={sh}>
                            <boxGeometry args={along ? [d.w + 0.18, 0.12, 0.3] : [0.3, 0.12, d.w + 0.18]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                    </group>
                );
            })}

            {/* ── Art — a wall with nothing on it reads as a texture, not
                a home. The four house artworks hang where people pause. */}
            {[
                { art: m.artDomain, x: u(-2.7) + 0.16, y: 1.7, z: u(6.2), ry: Math.PI / 2, w: 1.6, h: 1.15 },
                { art: m.artAsWithin, x: u(-2.66) + 0.16, y: UPPER_Y + 1.8, z: u(4.6), ry: Math.PI / 2, w: 1.5, h: 1.1 },
                { art: m.artStillPoint, x: 0, y: UPPER_Y + 1.75, z: SHELL.minZ + 0.16, ry: 0, w: 1.9, h: 1.3 },
                { art: m.artUnnamed, x: SHELL.minX + 0.16, y: 1.65, z: u(-2.2), ry: Math.PI / 2, w: 1.5, h: 1.1 },
            ].map((a, i) => (
                <group key={`art-${i}`} position={[a.x, a.y, a.z]} rotation={[0, a.ry, 0]}>
                    <mesh>
                        <planeGeometry args={[a.w, a.h]} />
                        <primitive object={a.art} attach="material" />
                    </mesh>
                    <mesh position={[0, 0, -0.02]}>
                        <boxGeometry args={[a.w + 0.12, a.h + 0.12, 0.05]} />
                        <primitive object={m.woodDark} attach="material" />
                    </mesh>
                </group>
            ))}

            {/* ── Kitchen uppers + range hood over the north counter ── */}
            {[0, 1, 2, 3].map((i) => (
                <mesh
                    key={`upper-${i}`}
                    position={[u(1.6) + i * 1.7, UPPER_Y + 2.1, SHELL.minZ + 0.55]}
                    castShadow={sh}
                >
                    <boxGeometry args={[1.5, 0.8, 0.42]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}

            {/* ── Pendants — island and dining. Emissive shades; the cove
                system already carries the light itself. */}
            {[
                { x: u(3.4) - 1.1, z: u(-2.6) },
                { x: u(3.4) + 1.1, z: u(-2.6) },
                { x: u(1.1), z: u(2.0) },
            ].map((pd, i) => (
                <group key={`pend-${i}`} position={[pd.x, UPPER_Y, pd.z]}>
                    <mesh position={[0, STOREY - 0.55, 0]}>
                        <cylinderGeometry args={[0.02, 0.02, 1.0, 5]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, STOREY - 1.1, 0]}>
                        <cylinderGeometry args={[0.16, 0.24, 0.26, 10, 1, true]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, STOREY - 1.2, 0]}>
                        <sphereGeometry args={[0.07, 8, 6]} />
                        <meshBasicMaterial color="#ffdfae" toneMapped={false} />
                    </mesh>
                </group>
            ))}

            {/* ── The shaft edge: a lining round the hole in the floor ── */}
            {[
                { x: (SHAFT.minX + SHAFT.maxX) / 2, z: SHAFT.minZ, w: SHAFT.maxX - SHAFT.minX, d: 0.14 },
                { x: (SHAFT.minX + SHAFT.maxX) / 2, z: SHAFT.maxZ, w: SHAFT.maxX - SHAFT.minX, d: 0.14 },
            ].map((e, i) => (
                <mesh key={i} position={[e.x, UPPER_Y - 0.16, e.z]} castShadow={sh}>
                    <boxGeometry args={[e.w, 0.32, e.d]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
        </group>
    );
}
