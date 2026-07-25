'use client';

/**
 * The neighbourhood: road, pavements, twenty houses, street furniture.
 *
 * Everything is positioned from townMap.ts so the meshes and the colliders
 * come from one description. Houses are scaled by `fit` height rather than a
 * raw scale factor, because the Kenney models are authored around 1 unit and
 * vary between types — fitting by height keeps a row of different houses
 * looking like a row of houses.
 */
import { useMemo } from 'react';
import { useHouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import { LAMPS, PARKED, PLOTS, STREET } from './townMap';

export default function TownGeometry({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;

    // Mobile keeps the near half of the street; the far ends cost the most
    const plots = useMemo(() => (low ? PLOTS.filter((p) => Math.abs(p.x) <= 52) : PLOTS), [low]);
    const lamps = useMemo(() => (low ? LAMPS.filter((l) => Math.abs(l.x) <= 52) : LAMPS), [low]);

    const roadLen = STREET.maxX - STREET.minX;
    const roadMid = (STREET.minX + STREET.maxX) / 2;

    return (
        <group>
            {/* Ground beyond the player's own lawn */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 14]} receiveShadow={sh}>
                <planeGeometry args={[210, 108]} />
                <primitive object={m.grass} attach="material" />
            </mesh>

            {/* Carriageway */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[roadMid, 0.005, STREET.z]}
                receiveShadow={sh}
            >
                <planeGeometry args={[roadLen, STREET.halfWidth * 2]} />
                <primitive object={m.concrete} attach="material" />
            </mesh>

            {/* Centre line — dashes, so the road reads as a road */}
            {!low &&
                Array.from({ length: Math.floor(roadLen / 8) }).map((_, i) => (
                    <mesh
                        key={`ln-${i}`}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[STREET.minX + 4 + i * 8, 0.012, STREET.z]}
                    >
                        <planeGeometry args={[3.4, 0.22]} />
                        <meshBasicMaterial color="#d8cfa8" toneMapped={false} />
                    </mesh>
                ))}

            {/* Pavements either side */}
            {[-1, 1].map((s) => (
                <mesh
                    key={`pv-${s}`}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[roadMid, 0.02, STREET.z + s * (STREET.halfWidth + STREET.pavement / 2)]}
                    receiveShadow={sh}
                >
                    <planeGeometry args={[roadLen, STREET.pavement]} />
                    <primitive object={m.path} attach="material" />
                </mesh>
            ))}

            {/* Kerbs — a low lip so the pavement reads as raised */}
            {[-1, 1].map((s) => (
                <mesh
                    key={`kb-${s}`}
                    position={[roadMid, 0.05, STREET.z + s * STREET.halfWidth]}
                    castShadow={false}
                    receiveShadow={sh}
                >
                    <boxGeometry args={[roadLen, 0.1, 0.22]} />
                    <primitive object={m.stone} attach="material" />
                </mesh>
            ))}

            {/* The houses */}
            {plots.map((p) => (
                <HouseProp
                    key={`h-${p.x}-${p.z}`}
                    model={`town_${p.t}`}
                    position={[p.x, 0, p.z]}
                    rotation={[0, p.rotY, 0]}
                    fit={{ h: p.h }}
                    shadows={sh}
                >
                    {/* Fallback: a plain block so a plot is never empty */}
                    <mesh position={[p.x, p.h / 2, p.z]} castShadow={sh} receiveShadow={sh}>
                        <boxGeometry args={[8, p.h, 7]} />
                        <primitive object={m.plaster} attach="material" />
                    </mesh>
                </HouseProp>
            ))}

            {/* Driveways linking each house to the kerb */}
            {!low &&
                plots.map((p) => {
                    const toStreet = p.z > STREET.z ? -1 : 1;
                    const midZ = (p.z + (STREET.z + toStreet * (STREET.halfWidth + STREET.pavement))) / 2;
                    const len = Math.abs(p.z - STREET.z) - STREET.halfWidth - STREET.pavement;
                    if (len <= 0.5) return null;
                    return (
                        <mesh
                            key={`dw-${p.x}`}
                            rotation={[-Math.PI / 2, 0, 0]}
                            position={[p.x + 2.6, 0.015, midZ]}
                            receiveShadow={sh}
                        >
                            <planeGeometry args={[3.0, len]} />
                            <primitive object={m.path} attach="material" />
                        </mesh>
                    );
                })}

            {/* Street lamps — emissive head plus a warm pool, dimmed by daylight
                through the LampGroup that wraps this scene's practicals. */}
            {lamps.map((l, i) => (
                <group key={`lamp-${i}`} position={[l.x, 0, l.z]}>
                    <mesh position={[0, 2.3, 0]} castShadow={sh}>
                        <cylinderGeometry args={[0.09, 0.13, 4.6, 6]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 4.62, 0]}>
                        <boxGeometry args={[0.5, 0.18, 0.34]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 4.5, 0]}>
                        <boxGeometry args={[0.4, 0.1, 0.26]} />
                        <primitive object={m.bulbWarm} attach="material" />
                    </mesh>
                    {!low && (
                        <pointLight
                            position={[0, 4.4, 0]}
                            intensity={2.6}
                            distance={16}
                            decay={2}
                            color="#ffd9a0"
                        />
                    )}
                </group>
            ))}

            {/* Parked cars */}
            {!low &&
                PARKED.map((c, i) => (
                    <HouseProp
                        key={`car-${i}`}
                        model={c.model}
                        position={[c.x, 0, c.z]}
                        rotation={[0, c.rotY, 0]}
                        shadows={sh}
                    >
                        <group />
                    </HouseProp>
                ))}
        </group>
    );
}

