'use client';

/**
 * The Sanctum, built — the hall itself.
 *
 * Generated from homeMap: eight facets, seven apses, one threshold, a
 * pyramid roof that opens into an oculus over the Source. The walls ARE
 * the plan's geometry (facet frames, apse widths, door width), so the
 * mesh cannot drift from the walkable region.
 *
 * Light, deliberately few: the sun and moon through the oculus and the
 * door, the Source at the centre (SourceLight, mounted outside the lamp
 * group so it never dims), seven sconces and two porch lanterns that do.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { useHouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import {
    ALCOVE,
    ALCOVES,
    ARCH,
    DAIS,
    ENTRANCE_FACET,
    FACET_HALF,
    facetAngle,
    facetToWorld,
    facetYaw,
    HALL,
    VERTEX_R,
    solid,
} from './homeMap';
import { getSky } from './DayNightCycle';
import type { QualityProfile } from './renderQuality';

type Mats = ReturnType<typeof useHouseMaterials>;

function Box({
    pos,
    size,
    mat,
    shadow,
    rot,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    mat: THREE.Material;
    shadow: boolean;
    rot?: [number, number, number];
}) {
    return (
        <mesh position={pos} rotation={rot} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={size} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

/**
 * A wall piece with a tall slit window in it: four boxes around a hole,
 * glass in the hole. Local x along the wall, z through it.
 */
function SlitWall({
    x,
    w,
    h,
    t,
    m,
    shadow,
    glass,
}: {
    x: number;
    w: number;
    h: number;
    t: number;
    m: Mats;
    shadow: boolean;
    glass: THREE.Material;
}) {
    const sw = 0.5;
    const sill = 2.3;
    const head = 4.7;
    const side = (w - sw) / 2;
    return (
        <group position={[x, 0, t / 2]}>
            <Box pos={[-(sw / 2 + side / 2), h / 2, 0]} size={[side, h, t]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[sw / 2 + side / 2, h / 2, 0]} size={[side, h, t]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[0, sill / 2, 0]} size={[sw + 0.02, sill, t]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[0, (head + h) / 2, 0]} size={[sw + 0.02, h - head, t]} mat={m.rockFace} shadow={shadow} />
            <mesh position={[0, (sill + head) / 2, 0]}>
                <boxGeometry args={[sw, head - sill, 0.04]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {/* gold reveal */}
            <Box pos={[0, (sill + head) / 2, 0]} size={[sw + 0.1, head - sill + 0.1, 0.05]} mat={m.gold} shadow={false} />
        </group>
    );
}

/** The arch, lintel, sconces and banner that frame one apse opening — in the facet frame. */
function ApseOpening({ m, shadow, index }: { m: Mats; shadow: boolean; index: number }) {
    const W = ALCOVE.width;
    const H = HALL.eave;
    const AH = ALCOVE.height;
    const T = HALL.wallT;
    const banner = index % 2 ? 'ftBannerRed' : 'ftBannerGreen';
    return (
        <group>
            {/* lintel over the opening, up to the eave */}
            <Box pos={[0, (H + AH) / 2, T / 2]} size={[W + 0.2, H - AH, T]} mat={m.rockFace} shadow={shadow} />
            {/* gold arch: two jamb bands and a head band on the hall side */}
            <Box pos={[-(W / 2 + 0.07), AH / 2, -0.03]} size={[0.14, AH, 0.1]} mat={m.gold} shadow={false} />
            <Box pos={[W / 2 + 0.07, AH / 2, -0.03]} size={[0.14, AH, 0.1]} mat={m.gold} shadow={false} />
            <Box pos={[0, AH + 0.07, -0.03]} size={[W + 0.28, 0.14, 0.1]} mat={m.gold} shadow={false} />
            {/* sconces either side of the opening, on the hall face */}
            {[-1, 1].map((s) => (
                <group key={s} position={[s * (W / 2 + 0.75), 2.55, -0.12]}>
                    <mesh position={[0, -0.1, 0.03]}>
                        <boxGeometry args={[0.16, 0.26, 0.1]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 0.12, -0.08]}>
                        <sphereGeometry args={[0.09, 10, 8]} />
                        <primitive object={m.bulbWarm} attach="material" />
                    </mesh>
                </group>
            ))}
            {/* one warm practical per apse — dimmed by daylight through LampGroup */}
            <pointLight position={[0, 2.9, -0.6]} color="#ffd2a1" intensity={0.9} distance={6.5} decay={2} />
            {/* a banner over the arch */}
            <group position={[0, AH + 0.35, -0.08]}>
                <HouseProp model={banner} anchor="base" fit={{ h: 1.4 }} shadows={false}>
                    {null}
                </HouseProp>
            </group>
        </group>
    );
}

/** One apse pocket: side walls, back wall, its own lower ceiling and a flat roof outside. */
function Apse({ m, shadow, rug }: { m: Mats; shadow: boolean; rug: boolean }) {
    const W = ALCOVE.width;
    const D = ALCOVE.depth;
    const T = HALL.wallT;
    const AH = ALCOVE.height;
    const EH = ALCOVE.apseH;
    return (
        <group>
            {/* side walls start where the hall wall ends (z = T) so no face is
                shared with it — coplanar faces flicker */}
            <Box pos={[-(W / 2 + T / 2), EH / 2, T + D / 2]} size={[T, EH, D]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[W / 2 + T / 2, EH / 2, T + D / 2]} size={[T, EH, D]} mat={m.rockFace} shadow={shadow} />
            {/* back wall, plastered inside */}
            <Box pos={[0, EH / 2, D + T / 2]} size={[W + 2 * T, EH, T]} mat={m.rockFace} shadow={shadow} />
            <mesh position={[0, AH / 2, D - 0.02]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[W, AH]} />
                <primitive object={m.wallPlaster} attach="material" />
            </mesh>
            {/* inner ceiling at AH (beyond the lintel), apse roof at EH */}
            <Box pos={[0, AH + 0.1, T + (D - T) / 2]} size={[W, 0.2, D - T]} mat={m.woodDark} shadow={false} />
            <Box pos={[0, EH + 0.15, T + D / 2]} size={[W + 2 * T + 0.6, 0.3, D + 0.6]} mat={m.concrete} shadow={shadow} />
            <Box pos={[0, EH - 0.1, T + D / 2]} size={[W + 2 * T + 0.7, 0.1, D + 0.7]} mat={m.gold} shadow={false} />
            {/* floor finish: a rug in the soft apses, stone in the rest */}
            {rug ? (
                <group position={[0, 0.012, D / 2 + 0.05]}>
                    <HouseProp model="rugRoundSm" fit={{ w: 2.6 }} shadows={false}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadow}>
                            <circleGeometry args={[1.3, 24]} />
                            <primitive object={m.rug} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            ) : (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, D / 2]} receiveShadow={shadow}>
                    <planeGeometry args={[W, D]} />
                    <primitive object={m.marble} attach="material" />
                </mesh>
            )}
        </group>
    );
}

/** The roof: eight panels from the eave to the oculus, eight rafters, a gold ring, the shaft of light. */
function Roof({ m, shadow, profile }: { m: Mats; shadow: boolean; profile?: QualityProfile }) {
    const H = HALL.eave;
    const Rv = VERTEX_R + HALL.wallT + 0.9; // overhang past the outer wall
    const panels = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const pos: number[] = [];
        for (let k = 0; k < 8; k++) {
            const a0 = facetAngle(k) - Math.PI / 8;
            const a1 = facetAngle(k) + Math.PI / 8;
            const e0 = [Math.cos(a0) * Rv, H - 0.1, Math.sin(a0) * Rv];
            const e1 = [Math.cos(a1) * Rv, H - 0.1, Math.sin(a1) * Rv];
            const o0 = [Math.cos(a0) * HALL.oculusR, HALL.oculusY, Math.sin(a0) * HALL.oculusR];
            const o1 = [Math.cos(a1) * HALL.oculusR, HALL.oculusY, Math.sin(a1) * HALL.oculusR];
            // outward-facing winding (seen from above): e0 → o0 → o1, e0 → o1 → e1
            pos.push(...e0, ...o1, ...o0, ...e0, ...e1, ...o1);
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return g;
    }, [H, Rv]);

    const rafters = useMemo(() => {
        const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = [];
        for (let k = 0; k < 8; k++) {
            const a = facetAngle(k) + Math.PI / 8;
            const from = new THREE.Vector3(Math.cos(a) * (VERTEX_R - 0.3), H - 0.05, Math.sin(a) * (VERTEX_R - 0.3));
            const to = new THREE.Vector3(Math.cos(a) * (HALL.oculusR + 0.1), HALL.oculusY - 0.25, Math.sin(a) * (HALL.oculusR + 0.1));
            const dir = to.clone().sub(from);
            const len = dir.length();
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
            out.push({ pos: from.clone().add(to).multiplyScalar(0.5), quat, len });
        }
        return out;
    }, [H]);

    const roofMat = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#2a2434', roughness: 0.82, metalness: 0.08, side: THREE.DoubleSide }),
        [],
    );
    const shaft = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!shaft.current) return;
        const sky = getSky();
        const mat = shaft.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.03 + sky.daylight * 0.07 + Math.sin(clock.elapsedTime * 0.6) * 0.008;
    });

    return (
        <group>
            <mesh geometry={panels} material={roofMat} castShadow={shadow} receiveShadow={shadow} />
            {rafters.map((r, i) => (
                <mesh key={i} position={r.pos} quaternion={r.quat} castShadow={false}>
                    <boxGeometry args={[0.22, r.len, 0.3]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            {/* oculus ring and the finial that floats above it */}
            <mesh position={[0, HALL.oculusY, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[HALL.oculusR, 0.16, 10, 40]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <mesh position={[0, HALL.oculusY + 1.4, 0]}>
                <octahedronGeometry args={[0.34, 0]} />
                <meshBasicMaterial color="#8b7cff" toneMapped={false} />
            </mesh>
            {/* the shaft of light from the oculus to the dais */}
            <mesh ref={shaft} position={[0, (HALL.oculusY + DAIS.h) / 2, 0]}>
                <cylinderGeometry args={[HALL.oculusR, HALL.oculusR + 0.9, HALL.oculusY - DAIS.h, 24, 1, true]} />
                <meshBasicMaterial color="#cfc3ff" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {profile?.atmosphere && (
                <Sparkles count={120} scale={[6, HALL.oculusY - 1, 6]} position={[0, HALL.oculusY / 2, 0]} size={1.3} speed={0.12} color="#d9d0ff" opacity={0.5} />
            )}
            {/* eave band and ridge caps */}
            <mesh position={[0, H - 0.12, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
                <ringGeometry args={[Rv - 0.3, Rv + 0.1, 8]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
        </group>
    );
}

/** The floor: stone disc, gold inlay, marble around the Source, the dais and its ramp. */
function Floor({ m, shadow }: { m: Mats; shadow: boolean }) {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow={shadow}>
                <circleGeometry args={[VERTEX_R + ALCOVE.depth + 1.5, 48]} />
                <primitive object={m.cobble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[9.45, 9.75, 64]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} receiveShadow={shadow}>
                <ringGeometry args={[DAIS.rampR, 4.6, 48]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            {/* the dais — a ramped drum of basalt with a gold lip */}
            <mesh position={[0, DAIS.h / 2, 0]} receiveShadow={shadow} castShadow={shadow}>
                <cylinderGeometry args={[DAIS.r, DAIS.rampR, DAIS.h, 40]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DAIS.h + 0.005, 0]}>
                <ringGeometry args={[DAIS.r - 0.22, DAIS.r, 40]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
        </group>
    );
}

export default function SanctumHall({ low = false, profile }: { low?: boolean; profile?: QualityProfile }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const T = HALL.wallT;
    const H = HALL.eave;
    const glass = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#7b6cff',
                transparent: true,
                opacity: 0.28,
                roughness: 0.08,
                metalness: 0.4,
                envMapIntensity: 1.2,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
        [],
    );

    return (
        <group>
            <Floor m={m} shadow={sh} />

            {/* ── Eight facets ── */}
            {Array.from({ length: HALL.facets }, (_, k) => {
                const o = facetToWorld(k, 0, 0);
                const yaw = facetYaw(k);
                const isDoor = k === ENTRANCE_FACET;
                const a = ALCOVES.find((al) => al.facet === k);
                const openW = isDoor ? ARCH.width : ALCOVE.width;
                const sideW = FACET_HALF - openW / 2;
                return (
                    <group key={k} position={[o.x, 0, o.z]} rotation={[0, yaw, 0]}>
                        {/* the solid wall either side of the opening, each with a slit window */}
                        <SlitWall x={-(openW / 2 + sideW / 2)} w={sideW} h={H} t={T} m={m} shadow={sh} glass={glass} />
                        <SlitWall x={openW / 2 + sideW / 2} w={sideW} h={H} t={T} m={m} shadow={sh} glass={glass} />
                        {a && (
                            <>
                                <ApseOpening m={m} shadow={sh} index={k} />
                                <Apse m={m} shadow={sh} rug={a.soft} />
                            </>
                        )}
                        {isDoor && (
                            <>
                                {/* the arch into the Processional: lintel to the eave, gold reveal, threshold */}
                                <Box pos={[0, (H + ARCH.height) / 2, T / 2]} size={[ARCH.width + 0.2, H - ARCH.height, T]} mat={m.rockFace} shadow={sh} />
                                <Box pos={[-(ARCH.width / 2 + 0.08), ARCH.height / 2, T / 2]} size={[0.16, ARCH.height, T + 0.08]} mat={m.gold} shadow={false} />
                                <Box pos={[ARCH.width / 2 + 0.08, ARCH.height / 2, T / 2]} size={[0.16, ARCH.height, T + 0.08]} mat={m.gold} shadow={false} />
                                <Box pos={[0, ARCH.height + 0.08, T / 2]} size={[ARCH.width + 0.32, 0.16, T + 0.08]} mat={m.gold} shadow={false} />
                                <Box pos={[0, 0.02, T / 2]} size={[ARCH.width + 0.4, 0.04, T + 0.3]} mat={m.basalt} shadow={false} />
                                {/* banners either side of the arch, inside */}
                                {[-1, 1].map((s) => (
                                    <group key={s} position={[s * (ARCH.width / 2 + 0.9), 3.0, -0.08]}>
                                        <HouseProp model={s < 0 ? 'ftBannerRed' : 'ftBannerGreen'} fit={{ h: 1.6 }} shadows={false}>
                                            {null}
                                        </HouseProp>
                                    </group>
                                ))}
                                <pointLight position={[0, ARCH.height + 0.6, -0.8]} color="#ffd2a1" intensity={0.9} distance={7} decay={2} />
                            </>
                        )}
                    </group>
                );
            })}

            {/* ── Columns at the vertices ── */}
            {Array.from({ length: 8 }, (_, k) => {
                const s = solid(`column ${k}`);
                return (
                    <group key={k} position={[s.x, 0, s.z]} rotation={[0, facetAngle(k), 0]}>
                        <HouseProp model="nkStatueColumn" fit={{ w: 0.9, h: H - 0.1, d: 0.9 }} shadows={sh}>
                            <mesh position={[0, H / 2, 0]} castShadow={sh}>
                                <cylinderGeometry args={[0.42, 0.5, H, 10]} />
                                <primitive object={m.basalt} attach="material" />
                            </mesh>
                        </HouseProp>
                        <mesh position={[0, 0.12, 0]}>
                            <cylinderGeometry args={[0.66, 0.72, 0.24, 10]} />
                            <primitive object={m.marble} attach="material" />
                        </mesh>
                    </group>
                );
            })}

            <Roof m={m} shadow={sh} profile={profile} />
        </group>
    );
}

/**
 * The Source's own light — mounted OUTSIDE LampGroup in HouseCanvas so
 * daylight never dims it. A violet core low and a warm white high, with
 * a slow breath so the hall is alive at night.
 */
export function SourceLight({ low = false }: { low?: boolean }) {
    const core = useRef<THREE.PointLight>(null);
    const high = useRef<THREE.PointLight>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (core.current) core.current.intensity = 3.0 + Math.sin(t * 0.9) * 0.3;
        if (high.current) high.current.intensity = 1.5 + Math.sin(t * 0.7 + 1) * 0.15;
    });
    return (
        <group>
            <pointLight ref={core} position={[0, 2.4, 0]} color="#8f7bff" intensity={3.0} distance={22} decay={2} castShadow={false} />
            {!low && <pointLight ref={high} position={[0, 5.6, 0]} color="#ffe9cf" intensity={1.5} distance={28} decay={2} />}
        </group>
    );
}
