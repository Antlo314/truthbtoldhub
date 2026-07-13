'use client';

import type { Extra } from '@/lib/game/avatar';
import { Mat, type VesselColors } from './materials';

/** Accessories on head / torso. */
export function ExtraParts({
    extra,
    c,
    headR,
    hipW,
}: {
    extra: Extra;
    c: VesselColors;
    headR: number;
    hipW: number;
}) {
    if (!extra || extra === 'none') return null;
    const y = headR + 0.06;

    switch (extra) {
        case 'circlet':
            return (
                <mesh position={[0, y + 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[headR * 0.78, 0.018, 8, 24]} />
                    <Mat color={c.gold} roughness={0.3} metalness={0.55} />
                </mesh>
            );
        case 'hood':
            return (
                <group>
                    <mesh position={[0, y + 0.08, -0.02]} castShadow scale={[1.25, 1.15, 1.2]}>
                        <sphereGeometry args={[headR * 1.15, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
                        <Mat color={c.topDeep} roughness={0.88} />
                    </mesh>
                    <mesh position={[0, y - 0.02, 0.08]} castShadow scale={[1.1, 0.7, 0.5]}>
                        <sphereGeometry args={[headR * 0.9, 10, 8]} />
                        <Mat color={c.topDeep} roughness={0.88} />
                    </mesh>
                </group>
            );
        case 'earrings':
            return (
                <group>
                    <mesh position={[-headR * 0.95, y - 0.02, 0]} castShadow>
                        <sphereGeometry args={[0.018, 8, 8]} />
                        <Mat color={c.gold} roughness={0.35} metalness={0.5} />
                    </mesh>
                    <mesh position={[headR * 0.95, y - 0.02, 0]} castShadow>
                        <sphereGeometry args={[0.018, 8, 8]} />
                        <Mat color={c.gold} roughness={0.35} metalness={0.5} />
                    </mesh>
                </group>
            );
        case 'glasses':
            return (
                <group position={[0, y + 0.01, headR * 0.75]}>
                    <mesh position={[-0.04, 0, 0]}>
                        <torusGeometry args={[0.028, 0.006, 6, 12]} />
                        <Mat color={c.gold} roughness={0.4} metalness={0.4} />
                    </mesh>
                    <mesh position={[0.04, 0, 0]}>
                        <torusGeometry args={[0.028, 0.006, 6, 12]} />
                        <Mat color={c.gold} roughness={0.4} metalness={0.4} />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.03, 0.006, 0.006]} />
                        <Mat color={c.gold} roughness={0.4} metalness={0.4} />
                    </mesh>
                </group>
            );
        case 'warpaint':
            return (
                <group>
                    <mesh position={[-0.05, y - 0.02, headR * 0.9]} castShadow>
                        <boxGeometry args={[0.04, 0.012, 0.01]} />
                        <Mat color="#7c3aed" roughness={0.7} />
                    </mesh>
                    <mesh position={[0.05, y - 0.02, headR * 0.9]} castShadow>
                        <boxGeometry args={[0.04, 0.012, 0.01]} />
                        <Mat color="#7c3aed" roughness={0.7} />
                    </mesh>
                </group>
            );
        case 'flower':
            return (
                <group position={[headR * 0.7, y + 0.08, 0.05]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.035, 8, 8]} />
                        <Mat color="#e11d48" roughness={0.7} />
                    </mesh>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <mesh
                            key={i}
                            position={[Math.cos((i / 5) * Math.PI * 2) * 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.03, 0]}
                            castShadow
                        >
                            <sphereGeometry args={[0.02, 6, 6]} />
                            <Mat color="#f472b6" roughness={0.75} />
                        </mesh>
                    ))}
                </group>
            );
        case 'scar':
            return (
                <mesh position={[0.05, y - 0.04, headR * 0.88]} rotation={[0, 0, 0.6]} castShadow>
                    <boxGeometry args={[0.05, 0.008, 0.008]} />
                    <Mat color={c.skinDeep} roughness={0.9} />
                </mesh>
            );
        case 'belt':
            // belt is default on many outfits; extra belt = satchel
            return (
                <mesh position={[hipW * 0.55, 0.02, 0.08]} castShadow>
                    <boxGeometry args={[0.1, 0.12, 0.06]} />
                    <Mat color={c.leather} roughness={0.9} />
                </mesh>
            );
        default:
            return null;
    }
}
