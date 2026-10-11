'use client';

/**
 * The Sanctum, built — the hall itself.
 *
 * Generated from homeMap: eight facets 13 m long, seven apses 7.4 m wide
 * and 6 m deep, the south arch, a pyramid roof that opens into an oculus
 * over the Source. The walls ARE the plan's geometry, so the mesh cannot
 * drift from the walkable region.
 *
 * Floors are laid edge to edge, never stacked: the octagon is one shape,
 * each apse its own quad, decals ride 8–16 mm above — coplanar floors are
 * what flickered at distance in the last build.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import { ALCOVE, ALCOVES, ARCH, DAIS, ENTRANCE_FACET, FACET_HALF, facetAngle, facetToWorld, facetYaw, HALL, SOLIDS, VERTEX_R } from './homeMap';
import { SolidGroup } from './LairProps';
import { getSky } from './DayNightCycle';
import type { QualityProfile } from './renderQuality';

type Mats = HouseMaterials;

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

/** A wall piece with a tall slit window: four boxes around a hole, glass in it. Local x along the wall. */
function SlitWall({ x, w, h, t, m, shadow, glass }: { x: number; w: number; h: number; t: number; m: Mats; shadow: boolean; glass: THREE.Material }) {
    const sw = 0.6;
    const sill = h * 0.33;
    const head = h * 0.76;
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
            {/* gold reveal on the hall face */}
            <Box pos={[0, (sill + head) / 2, -t / 2 - 0.02]} size={[sw + 0.16, head - sill + 0.16, 0.04]} mat={m.gold} shadow={false} />
        </group>
    );
}

/** The lintel, gold arch, sconces and banner that frame one apse opening — in the facet frame. */
function ApseOpening({ m, shadow, index, low }: { m: Mats; shadow: boolean; index: number; low: boolean }) {
    const W = ALCOVE.width;
    const H = HALL.eave;
    const AH = ALCOVE.height;
    const T = HALL.wallT;
    const banner = index % 2 ? 'ftBannerRed' : 'ftBannerGreen';
    return (
        <group>
            <Box pos={[0, (H + AH) / 2, T / 2]} size={[W + 0.2, H - AH, T]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[-(W / 2 + 0.08), AH / 2, -0.04]} size={[0.16, AH, 0.1]} mat={m.gold} shadow={false} />
            <Box pos={[W / 2 + 0.08, AH / 2, -0.04]} size={[0.16, AH, 0.1]} mat={m.gold} shadow={false} />
            <Box pos={[0, AH + 0.08, -0.04]} size={[W + 0.32, 0.16, 0.1]} mat={m.gold} shadow={false} />
            {[-1, 1].map((s) => (
                <group key={s} position={[s * (W / 2 + 1.0), 3.3, -0.12]}>
                    <mesh position={[0, -0.12, 0.03]}>
                        <boxGeometry args={[0.18, 0.3, 0.1]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 0.14, -0.08]}>
                        <sphereGeometry args={[0.1, 10, 8]} />
                        <primitive object={m.bulbWarm} attach="material" />
                    </mesh>
                </group>
            ))}
            {/* one warm practical per apse — dimmed by daylight through LampGroup */}
            {!low && <pointLight position={[0, 3.8, 1.6]} color="#ffd2a1" intensity={1.6} distance={10} decay={2} />}
            <group position={[0, AH + 0.5, -0.1]} rotation={[0, Math.PI / 2, 0]}>
                <HouseProp model={banner} fit={{ h: 1.8 }} shadows={false}>
                    {null}
                </HouseProp>
            </group>
        </group>
    );
}

/** One apse pocket: side walls, back wall, its own ceiling, a flat roof outside, its floor. */
function Apse({ m, shadow, rug }: { m: Mats; shadow: boolean; rug: boolean }) {
    const W = ALCOVE.width;
    const D = ALCOVE.depth;
    const T = HALL.wallT;
    const AH = ALCOVE.height;
    const EH = ALCOVE.apseH;
    return (
        <group>
            {/* side walls run from the hall wall's outer face to the back wall — no shared faces */}
            <Box pos={[-(W / 2 + T / 2), EH / 2, (T + D) / 2]} size={[T, EH, D - T]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[W / 2 + T / 2, EH / 2, (T + D) / 2]} size={[T, EH, D - T]} mat={m.rockFace} shadow={shadow} />
            <Box pos={[0, EH / 2, D + T / 2]} size={[W + 2 * T, EH, T]} mat={m.rockFace} shadow={shadow} />
            {/* plaster on the inside faces */}
            <mesh position={[0, AH / 2, D - 0.02]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[W, AH]} />
                <primitive object={m.wallPlaster} attach="material" />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * (W / 2 - 0.02), AH / 2, (T + D) / 2]} rotation={[0, -s * (Math.PI / 2), 0]}>
                    <planeGeometry args={[D - T, AH]} />
                    <primitive object={m.wallPlaster} attach="material" />
                </mesh>
            ))}
            {/* coffered ceiling at AH, roof at EH */}
            <Box pos={[0, AH + 0.1, (T + D) / 2]} size={[W, 0.2, D - T]} mat={m.woodDark} shadow={false} />
            {[-1.6, 0, 1.6].map((x) => (
                <Box key={x} pos={[x, AH - 0.08, (T + D) / 2]} size={[0.14, 0.16, D - T]} mat={m.wood} shadow={false} />
            ))}
            <Box pos={[0, EH + 0.15, (T + D) / 2]} size={[W + 2 * T + 0.6, 0.3, D + 0.3]} mat={m.concrete} shadow={shadow} />
            <Box pos={[0, EH - 0.1, (T + D) / 2]} size={[W + 2 * T + 0.7, 0.1, D + 0.4]} mat={m.gold} shadow={false} />
            {/* floor: its own quad, edge to edge with the octagon */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, D / 2]} receiveShadow={shadow}>
                <planeGeometry args={[W, D]} />
                <primitive object={rug ? m.woodHerring : m.marble} attach="material" />
            </mesh>
            {rug && (
                <group position={[0, 0.016, D / 2 + 0.3]}>
                    <HouseProp model="rugRoundSm" fit={{ w: 4.0 }} shadows={false}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadow}>
                            <circleGeometry args={[2.0, 28]} />
                            <primitive object={m.rug} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            )}
        </group>
    );
}

/** The roof: eight panels from the eave to the oculus, rafters, a gold ring, the shaft of light. */
function Roof({ m, shadow, profile }: { m: Mats; shadow: boolean; profile?: QualityProfile }) {
    const H = HALL.eave;
    const Rv = VERTEX_R + HALL.wallT + 0.9;
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
            pos.push(...e0, ...o1, ...o0, ...e0, ...e1, ...o1);
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return g;
    }, [H, Rv]);

    const rafters = useMemo(() => {
        const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = [];
        for (let k = 0; k < 16; k++) {
            const a = (k * Math.PI) / 8 + Math.PI / 16;
            const r0 = k % 2 ? VERTEX_R - 1.0 : HALL.apothem - 0.4;
            const from = new THREE.Vector3(Math.cos(a) * r0, H - 0.05, Math.sin(a) * r0);
            const to = new THREE.Vector3(Math.cos(a) * (HALL.oculusR + 0.1), HALL.oculusY - 0.25, Math.sin(a) * (HALL.oculusR + 0.1));
            const dir = to.clone().sub(from);
            const len = dir.length();
            out.push({ pos: from.clone().add(to).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), len });
        }
        return out;
    }, [H]);

    const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2434', roughness: 0.82, metalness: 0.08, side: THREE.DoubleSide }), []);
    const shaft = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!shaft.current) return;
        const mat = shaft.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.03 + getSky().daylight * 0.07 + Math.sin(clock.elapsedTime * 0.6) * 0.008;
    });

    return (
        <group>
            <mesh geometry={panels} material={roofMat} castShadow={shadow} receiveShadow={shadow} />
            {rafters.map((r, i) => (
                <mesh key={i} position={r.pos} quaternion={r.quat}>
                    <boxGeometry args={[0.26, r.len, 0.36]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            <mesh position={[0, HALL.oculusY, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[HALL.oculusR, 0.2, 10, 48]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <mesh position={[0, HALL.oculusY + 1.6, 0]}>
                <octahedronGeometry args={[0.42, 0]} />
                <meshBasicMaterial color="#8b7cff" toneMapped={false} />
            </mesh>
            <mesh ref={shaft} position={[0, (HALL.oculusY + DAIS.h) / 2, 0]}>
                <cylinderGeometry args={[HALL.oculusR, HALL.oculusR + 1.2, HALL.oculusY - DAIS.h, 28, 1, true]} />
                <meshBasicMaterial color="#cfc3ff" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {profile?.atmosphere && (
                <Sparkles count={160} scale={[8, HALL.oculusY - 1, 8]} position={[0, HALL.oculusY / 2, 0]} size={1.4} speed={0.12} color="#d9d0ff" opacity={0.5} />
            )}
            <mesh position={[0, H - 0.12, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
                <ringGeometry args={[Rv - 0.3, Rv + 0.1, 8]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
        </group>
    );
}

/** The floor: one octagon of cobble, marble around the dais, gold inlays to every apse, the dais. */
function Floor({ m, shadow }: { m: Mats; shadow: boolean }) {
    const octagon = useMemo(() => {
        const shape = new THREE.Shape();
        for (let k = 0; k <= 8; k++) {
            const a = facetAngle(k % 8) + Math.PI / 8;
            // shape y = −world z, so the −π/2 x-rotation lands it on +z
            const px = Math.cos(a) * VERTEX_R;
            const py = -Math.sin(a) * VERTEX_R;
            if (k === 0) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        }
        return new THREE.ShapeGeometry(shape);
    }, []);
    return (
        <group>
            <mesh geometry={octagon} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadow}>
                <primitive object={m.cobble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow={shadow}>
                <ringGeometry args={[DAIS.rampR - 0.05, 7.4, 64]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            {[
                [7.4, 7.62],
                [13.6, 13.95],
            ].map(([a, b]) => (
                <mesh key={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
                    <ringGeometry args={[a, b, 72]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            ))}
            {/* gold rays from the marble to every opening */}
            {Array.from({ length: 8 }, (_, k) => {
                const a = facetAngle(k);
                const r0 = 7.62;
                const r1 = HALL.apothem - 0.05;
                const mid = (r0 + r1) / 2;
                return (
                    <mesh key={k} position={[Math.cos(a) * mid, 0.016, Math.sin(a) * mid]} rotation={[-Math.PI / 2, 0, -a]}>
                        <planeGeometry args={[r1 - r0, 0.12]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                );
            })}
            {/* the dais — a ramped drum of basalt with a gold lip */}
            <mesh position={[0, DAIS.h / 2, 0]} receiveShadow={shadow} castShadow={shadow}>
                <cylinderGeometry args={[DAIS.r, DAIS.rampR, DAIS.h, 48]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DAIS.h + 0.006, 0]}>
                <ringGeometry args={[DAIS.r - 0.26, DAIS.r, 48]} />
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
    const columns = useMemo(() => SOLIDS.filter((s) => /^column \d$/.test(s.name)), []);

    return (
        <group>
            <Floor m={m} shadow={sh} />

            {/* ── Eight facets ── */}
            {Array.from({ length: HALL.facets }, (_, k) => {
                const o = facetToWorld(k, 0, 0);
                const yaw = facetYaw(k);
                const isArch = k === ENTRANCE_FACET;
                const a = ALCOVES.find((al) => al.facet === k);
                const openW = isArch ? ARCH.width : ALCOVE.width;
                const sideW = FACET_HALF - openW / 2;
                return (
                    <group key={k} position={[o.x, 0, o.z]} rotation={[0, yaw, 0]}>
                        <SlitWall x={-(openW / 2 + sideW / 2)} w={sideW} h={H} t={T} m={m} shadow={sh} glass={glass} />
                        <SlitWall x={openW / 2 + sideW / 2} w={sideW} h={H} t={T} m={m} shadow={sh} glass={glass} />
                        {a && (
                            <>
                                <ApseOpening m={m} shadow={sh} index={k} low={low} />
                                <Apse m={m} shadow={sh} rug={a.soft} />
                            </>
                        )}
                        {isArch && (
                            <>
                                <Box pos={[0, (H + ARCH.height) / 2, T / 2]} size={[ARCH.width + 0.2, H - ARCH.height, T]} mat={m.rockFace} shadow={sh} />
                                <Box pos={[-(ARCH.width / 2 + 0.09), ARCH.height / 2, T / 2]} size={[0.18, ARCH.height, T + 0.1]} mat={m.gold} shadow={false} />
                                <Box pos={[ARCH.width / 2 + 0.09, ARCH.height / 2, T / 2]} size={[0.18, ARCH.height, T + 0.1]} mat={m.gold} shadow={false} />
                                <Box pos={[0, ARCH.height + 0.09, T / 2]} size={[ARCH.width + 0.36, 0.18, T + 0.1]} mat={m.gold} shadow={false} />
                                {/* threshold slab bridging the octagon and the gallery floors */}
                                <Box pos={[0, 0.015, T / 2]} size={[ARCH.width, 0.03, T]} mat={m.basalt} shadow={false} />
                                {[-1, 1].map((s) => (
                                    <group key={s} position={[s * (ARCH.width / 2 + 1.3), 3.4, -0.1]} rotation={[0, Math.PI / 2, 0]}>
                                        <HouseProp model={s < 0 ? 'ftBannerRed' : 'ftBannerGreen'} fit={{ h: 2.0 }} shadows={false}>
                                            {null}
                                        </HouseProp>
                                    </group>
                                ))}
                                {!low && <pointLight position={[0, ARCH.height + 0.8, -1.2]} color="#ffd2a1" intensity={1.3} distance={10} decay={2} />}
                            </>
                        )}
                    </group>
                );
            })}

            {/* ── Columns at the vertices ── */}
            {columns.map((s) => (
                <SolidGroup key={s.name} s={s}>
                    <HouseProp model="nkStatueColumn" fit={{ w: 0.9, h: H - 0.3, d: 0.9 }} shadows={sh}>
                        <mesh position={[0, H / 2, 0]} castShadow={sh}>
                            <cylinderGeometry args={[0.42, 0.48, H, 12]} />
                            <primitive object={m.basalt} attach="material" />
                        </mesh>
                    </HouseProp>
                    <mesh position={[0, 0.12, 0]}>
                        <cylinderGeometry args={[0.5, 0.5, 0.24, 12]} />
                        <primitive object={m.marble} attach="material" />
                    </mesh>
                    <mesh position={[0, H - 0.15, 0]}>
                        <cylinderGeometry args={[0.5, 0.42, 0.3, 12]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                </SolidGroup>
            ))}

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
        if (core.current) core.current.intensity = 4.2 + Math.sin(t * 0.9) * 0.4;
        if (high.current) high.current.intensity = 2.4 + Math.sin(t * 0.7 + 1) * 0.2;
    });
    return (
        <group>
            <pointLight ref={core} position={[0, 2.8, 0]} color="#8f7bff" intensity={4.2} distance={30} decay={2} />
            <pointLight ref={high} position={[0, 7.4, 0]} color="#ffe9cf" intensity={2.4} distance={40} decay={2} />
        </group>
    );
}
