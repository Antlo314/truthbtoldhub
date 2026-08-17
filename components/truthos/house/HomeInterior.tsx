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
 *   · one ceiling, with a shadow-gap cove instead of a butt joint
 *   · concealed cove lighting washing the ceiling plane
 *
 * One storey. No stair, no second lid. A phone gets the clean shell.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useHouseMaterials } from './HouseMaterials';
import {
    DOORWAYS,
    MAIN_COLLIDERS,
    MAIN_Y,
    SHELL,
    STOREY,
    ART,
    DOOR_LEAVES,
    furn,
    u,
    type Collider,
} from './homeMap';
import { JUNGLE_COLLIDERS } from './jungleMap';
import { RoomPracticals } from './HouseLights';

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

/* ── The front doors ───────────────────────────────────────
   The entry was a 1.8 m hole punched in the front wall — no leaf, no
   frame, nothing to walk through but air, which is why it looked wrong
   and why you passed through it. A pair of panelled leaves stand open
   into the foyer, hinged at their jambs, solid to the body. */
function FrontDoors({
    m,
    shadow,
}: {
    m: ReturnType<typeof useHouseMaterials>;
    shadow: boolean;
}) {
    const H = 2.35;
    return (
        <group>
            {DOOR_LEAVES.map((d) => (
                <group key={d.name} position={[d.x, 0, d.z]} rotation={[0, d.dir * -d.swing, 0]}>
                    {/* leaf, hinged at the group origin so it swings true */}
                    <mesh position={[(d.w / 2) * d.dir, H / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
                        <boxGeometry args={[d.w, H, d.t]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                    {/* two sunk panels per leaf — a flat slab reads as plywood */}
                    {[0.62, 1.62].map((py) => (
                        <mesh key={py} position={[(d.w / 2) * d.dir, py, d.t / 2 + 0.005]}>
                            <boxGeometry args={[d.w - 0.22, 0.72, 0.012]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                    ))}
                    {/* handle on the swinging edge */}
                    <mesh position={[(d.w - 0.11) * d.dir, 1.06, d.t / 2 + 0.05]} castShadow={shadow}>
                        <boxGeometry args={[0.05, 0.05, 0.12]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                </group>
            ))}
            {/* threshold plate under the pair */}
            <mesh position={[u(-1.2), 0.02, SHELL.maxZ]} receiveShadow={shadow}>
                <boxGeometry args={[1.9, 0.04, 0.34]} />
                <primitive object={m.stone} attach="material" />
            </mesh>
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
            cove: new THREE.MeshBasicMaterial({ color: '#ffdfae', toneMapped: false }),
        }),
        [],
    );

    const mainWalls = useMemo(() => houseWalls(MAIN_COLLIDERS), []);

    if (low) {
        // Phones get the carpentry that makes a room read as a room, and
        // skip only what genuinely costs: shadows, the cove strips and the
        // per-doorway casings.
        return (
            <>
                <RoomPracticals low />
                <FrontDoors m={m} shadow={false} />
                <Skirting cols={mainWalls} y={MAIN_Y} mat={mats.skirting} />
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, STOREY - 0.08, 0]}>
                    <planeGeometry args={[X1 - X0 - 0.4, Z1 - Z0 - 0.4]} />
                    <primitive object={mats.ceiling} attach="material" />
                </mesh>
            </>
        );
    }

    const coveInset = 0.35;

    return (
        <group>
            <Skirting cols={mainWalls} y={MAIN_Y} mat={mats.skirting} />

            {/* One ceiling. The old two-storey cutouts used SHAFT/VOID = 0
                and stacked a second lid on this one. */}
            {[
                { label: 'main', y: STOREY - 0.08, rects: [{ x: 0, z: 0, w: X1 - X0 - 0.5, d: Z1 - Z0 - 0.5 }] },
            ].map((c) => (
                <group key={c.label}>
                    {c.rects.map((r, i) => (
                        <mesh
                            key={i}
                            rotation={[Math.PI / 2, 0, 0]}
                            position={[r.x, c.y, r.z]}
                            receiveShadow={sh}
                        >
                            <planeGeometry args={[Math.max(0, r.w - coveInset * 2), Math.max(0, r.d - coveInset * 2)]} />
                            <primitive object={mats.ceiling} attach="material" />
                        </mesh>
                    ))}
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

            {/* One fixture per room, from the ROOMS table — four lights for
                nineteen rooms is what made the interior read flat. */}
            <RoomPracticals />

            <FrontDoors m={m} shadow={sh} />

            {/* ── Cased openings — a doorway is joinery, not a hole ────
                Two jambs and a head per opening, from the same DOORWAYS
                table the colliders were punched from. */}
            {DOORWAYS.map((d, i) => {
                const H = 2.3;
                const along = d.axis === 'x';
                return (
                    <group key={`case-${i}`} position={[d.x, MAIN_Y, d.z]}>
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
                a home. The four house artworks hang where people pause.
                Positions come from ART in homeMap so validate-house.mjs can
                hold them to the same doorway clearance as the furniture —
                artDomain used to hang across half the stair-room door. */}
            {ART.map((spec, i) => {
                const a = { ...spec, art: m[spec.art as keyof typeof m] as THREE.Material };
                return (
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
                );
            })}

            {/* Kitchen uppers hang above the counter run only — not over the fridge. */}
            {[9.4, 10.7, 12.0].map((x, i) => (
                <mesh
                    key={`upper-${i}`}
                    position={[x, 2.22, SHELL.minZ + 0.5]}
                    castShadow={sh}
                >
                    <boxGeometry args={[1.15, 0.7, 0.36]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}

            {/* Pendants hang over the island and dining table solids. */}
            {[
                { x: furn('island').x - 0.7, z: furn('island').z },
                { x: furn('island').x + 0.7, z: furn('island').z },
                { x: furn('dining table').x, z: furn('dining table').z },
            ].map((pd, i) => (
                <group key={`pend-${i}`} position={[pd.x, MAIN_Y, pd.z]}>
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

        </group>
    );
}
