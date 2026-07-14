'use client';

import type { HairStyle } from '@/lib/game/avatar';
import { Mat, type VesselColors } from './materials';

/** Procedural hair volumes — distinct silhouette per style. */
export function HairParts({
    style,
    c,
    headR,
    fem,
}: {
    style: HairStyle;
    c: VesselColors;
    headR: number;
    fem: boolean;
}) {
    const y = headR + 0.06;
    const hc = c.hair;

    switch (style) {
        case 'buzz':
            return (
                <mesh position={[0, y + 0.02, -0.01]} castShadow scale={[1.02, 0.55, 1.02]}>
                    <sphereGeometry args={[headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                    <Mat color={hc} kind="hair" roughness={0.95} />
                </mesh>
            );
        case 'short':
            return (
                <mesh position={[0, y + 0.06, -0.015]} castShadow scale={[1.08, 0.72, 1.05]}>
                    <sphereGeometry args={[headR * 1.04, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                    <Mat color={hc} kind="hair" roughness={0.92} />
                </mesh>
            );
        case 'afro':
            return (
                <mesh position={[0, y + 0.12, 0]} castShadow>
                    <sphereGeometry args={[headR * 1.35, 14, 12]} />
                    <Mat color={hc} kind="hair" roughness={0.95} />
                </mesh>
            );
        case 'long':
            return (
                <group>
                    <mesh position={[0, y + 0.08, -0.02]} castShadow scale={[1.1, 0.85, 1.08]}>
                        <sphereGeometry args={[headR * 1.06, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, y - 0.15, -0.08]} castShadow scale={[0.75, 1.4, 0.45]}>
                        <sphereGeometry args={[headR * 0.75, 10, 8]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                </group>
            );
        case 'bun':
            return (
                <group>
                    <mesh position={[0, y + 0.05, -0.02]} castShadow scale={[1.05, 0.65, 1.02]}>
                        <sphereGeometry args={[headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, y + 0.16, -0.06]} castShadow>
                        <sphereGeometry args={[headR * 0.45, 10, 8]} />
                        <Mat color={hc} kind="hair" roughness={0.88} />
                    </mesh>
                </group>
            );
        case 'braids':
            return (
                <group>
                    <mesh position={[0, y + 0.06, -0.02]} castShadow scale={[1.06, 0.7, 1.04]}>
                        <sphereGeometry args={[headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    {[-0.08, 0, 0.08].map((x, i) => (
                        <mesh key={i} position={[x, y - 0.12, -0.1]} castShadow rotation={[0.3, 0, x * 2]}>
                            <capsuleGeometry args={[0.025, 0.22, 4, 6]} />
                            <Mat color={hc} kind="hair" roughness={0.9} />
                        </mesh>
                    ))}
                </group>
            );
        case 'locs':
            return (
                <group>
                    <mesh position={[0, y + 0.06, -0.02]} castShadow scale={[1.08, 0.75, 1.06]}>
                        <sphereGeometry args={[headR * 1.04, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.92} />
                    </mesh>
                    {Array.from({ length: 7 }, (_, i) => {
                        const a = (i / 7) * Math.PI * 1.4 - 0.7;
                        return (
                            <mesh
                                key={i}
                                position={[Math.sin(a) * 0.1, y - 0.08 - (i % 3) * 0.04, -0.06 + Math.cos(a) * 0.06]}
                                castShadow
                                rotation={[0.4, a, 0]}
                            >
                                <capsuleGeometry args={[0.02, 0.18 + (i % 2) * 0.05, 3, 5]} />
                                <Mat color={hc} kind="hair" roughness={0.93} />
                            </mesh>
                        );
                    })}
                </group>
            );
        case 'twists':
            return (
                <group>
                    <mesh position={[0, y + 0.05, -0.02]} castShadow scale={[1.05, 0.68, 1.03]}>
                        <sphereGeometry args={[headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    {[-0.07, 0.07].map((x, i) => (
                        <mesh key={i} position={[x, y + 0.02, -0.08]} castShadow rotation={[0.5, 0, x * 3]}>
                            <capsuleGeometry args={[0.03, 0.2, 4, 6]} />
                            <Mat color={hc} kind="hair" roughness={0.9} />
                        </mesh>
                    ))}
                </group>
            );
        case 'highTop':
            return (
                <group>
                    <mesh position={[0, y + 0.02, -0.02]} castShadow scale={[1.02, 0.4, 1.02]}>
                        <sphereGeometry args={[headR, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                        <Mat color={hc} kind="hair" roughness={0.92} />
                    </mesh>
                    <mesh position={[0, y + 0.16, 0]} castShadow>
                        <cylinderGeometry args={[headR * 0.85, headR * 0.9, 0.18, 12]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                </group>
            );
        case 'waves':
            return (
                <mesh position={[0, y + 0.07, -0.01]} castShadow scale={[1.12, 0.8, 1.1]}>
                    <sphereGeometry args={[headR * 1.06, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                    <Mat color={hc} kind="hair" roughness={0.88} />
                </mesh>
            );
        case 'coils':
            return (
                <group>
                    <mesh position={[0, y + 0.1, 0]} castShadow>
                        <sphereGeometry args={[headR * 1.2, 12, 10]} />
                        <Mat color={hc} kind="hair" roughness={0.94} />
                    </mesh>
                    {[-0.1, 0.1].map((x, i) => (
                        <mesh key={i} position={[x, y + 0.05, 0.05]} castShadow>
                            <sphereGeometry args={[0.06, 8, 8]} />
                            <Mat color={hc} kind="hair" roughness={0.94} />
                        </mesh>
                    ))}
                </group>
            );
        case 'ponytail':
            return (
                <group>
                    <mesh position={[0, y + 0.05, -0.02]} castShadow scale={[1.05, 0.65, 1.02]}>
                        <sphereGeometry args={[headR * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, y - 0.05, -0.14]} castShadow rotation={[0.9, 0, 0]}>
                        <capsuleGeometry args={[0.035, 0.28, 4, 6]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                </group>
            );
        case 'crown':
            return (
                <group>
                    <mesh position={[0, y + 0.06, -0.02]} castShadow scale={[1.06, 0.7, 1.04]}>
                        <sphereGeometry args={[headR * 1.03, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, y + 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[headR * 0.75, 0.02, 8, 20]} />
                        <Mat color={c.gold} roughness={0.35} metalness={0.5} />
                    </mesh>
                </group>
            );
        case 'curls':
        default:
            return (
                <group>
                    <mesh position={[0, y + 0.08, -0.01]} castShadow scale={[1.1, fem ? 0.95 : 0.8, 1.08]}>
                        <sphereGeometry args={[headR * 1.08, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                        <Mat color={hc} kind="hair" roughness={0.9} />
                    </mesh>
                    {[-0.09, 0.09].map((x, i) => (
                        <mesh key={i} position={[x, y - 0.02, 0.04]} castShadow>
                            <sphereGeometry args={[0.055, 8, 8]} />
                            <Mat color={hc} kind="hair" roughness={0.9} />
                        </mesh>
                    ))}
                </group>
            );
    }
}
