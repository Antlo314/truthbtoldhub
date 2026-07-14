'use client';

import type { OutfitStyle } from '@/lib/game/avatar';
import { Mat, type VesselColors } from './materials';

/** Torso / lower-body silhouette by outfit. Mounted on chest/hips groups. */
export function TorsoOutfit({
    outfit,
    c,
    chestR,
    waistR,
    chestH,
    fem,
}: {
    outfit: OutfitStyle;
    c: VesselColors;
    chestR: number;
    waistR: number;
    chestH: number;
    fem: boolean;
}) {
    const skirted = outfit === 'dress' || outfit === 'gown' || outfit === 'vestment'
        || (fem && outfit === 'robe');

    return (
        <group>
            {/* base waist */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <capsuleGeometry args={[waistR, 0.07, 4, 10]} />
                <Mat color={c.topDeep} kind="cloth" roughness={0.78} />
            </mesh>

            {outfit === 'vest' ? (
                <>
                    <mesh position={[0, chestH * 0.35, 0]} castShadow scale={[1.05, 1, 0.95]}>
                        <capsuleGeometry args={[chestR * 0.95, chestH * 0.35, 5, 12]} />
                        <Mat color={c.skin} kind="skin" roughness={0.7} />
                    </mesh>
                    {/* open vest panels */}
                    <mesh position={[-chestR * 0.45, chestH * 0.38, 0.02]} castShadow rotation={[0, 0, 0.15]}>
                        <boxGeometry args={[chestR * 0.7, chestH * 0.55, 0.08]} />
                        <Mat color={c.top} kind="cloth" roughness={0.7} />
                    </mesh>
                    <mesh position={[chestR * 0.45, chestH * 0.38, 0.02]} castShadow rotation={[0, 0, -0.15]}>
                        <boxGeometry args={[chestR * 0.7, chestH * 0.55, 0.08]} />
                        <Mat color={c.top} kind="cloth" roughness={0.7} />
                    </mesh>
                </>
            ) : outfit === 'cloak' ? (
                <>
                    <mesh position={[0, chestH * 0.35, 0]} castShadow scale={[1.05, 1, fem ? 0.92 : 1]}>
                        <capsuleGeometry args={[chestR, chestH * 0.4, 5, 12]} />
                        <Mat color={c.topDeep} kind="cloth" roughness={0.75} />
                    </mesh>
                    {/* cloak drape back */}
                    <mesh position={[0, chestH * 0.2, -0.12]} castShadow scale={[1.3, 1.4, 0.35]}>
                        <sphereGeometry args={[chestR * 1.1, 12, 10]} />
                        <Mat color={c.top} kind="cloth" roughness={0.85} />
                    </mesh>
                    <mesh position={[0, -0.15, -0.1]} castShadow scale={[1.2, 1.6, 0.3]}>
                        <sphereGeometry args={[chestR, 10, 8]} />
                        <Mat color={c.top} kind="cloth" roughness={0.85} />
                    </mesh>
                </>
            ) : outfit === 'wanderer' ? (
                <>
                    <mesh position={[0, chestH * 0.35, 0]} castShadow scale={[1.08, 1, 1]}>
                        <capsuleGeometry args={[chestR, chestH * 0.4, 5, 12]} />
                        <Mat color={c.top} kind="cloth" roughness={0.78} />
                    </mesh>
                    {/* sash */}
                    <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0.2]}>
                        <torusGeometry args={[waistR * 1.05, 0.025, 6, 16]} />
                        <Mat color={c.leather} kind="leather" roughness={0.9} />
                    </mesh>
                    {/* shoulder bag hint */}
                    <mesh position={[chestR * 0.7, chestH * 0.15, 0.05]} castShadow>
                        <boxGeometry args={[0.08, 0.12, 0.06]} />
                        <Mat color={c.leather} kind="leather" roughness={0.9} />
                    </mesh>
                </>
            ) : outfit === 'vestment' ? (
                <>
                    <mesh position={[0, chestH * 0.38, 0]} castShadow scale={[1.1, 1.1, 0.95]}>
                        <capsuleGeometry args={[chestR * 1.05, chestH * 0.5, 5, 12]} />
                        <Mat color={c.top} kind="cloth" roughness={0.7} />
                    </mesh>
                    <mesh position={[0, chestH * 0.55, chestR * 0.7]} castShadow>
                        <boxGeometry args={[0.06, chestH * 0.5, 0.02]} />
                        <Mat color={c.gold} kind="gold" roughness={0.4} metalness={0.45} />
                    </mesh>
                </>
            ) : outfit === 'robe' || outfit === 'gown' || outfit === 'dress' ? (
                <>
                    <mesh position={[0, chestH * 0.35, 0]} castShadow scale={[fem ? 1.0 : 1.05, 1, 0.92]}>
                        <capsuleGeometry args={[chestR, chestH * 0.42, 5, 12]} />
                        <Mat color={c.top} kind="cloth" roughness={0.72} />
                    </mesh>
                    {outfit === 'gown' && (
                        <mesh position={[0, chestH * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[chestR * 0.9, 0.015, 6, 18]} />
                            <Mat color={c.gold} kind="gold" roughness={0.4} metalness={0.4} />
                        </mesh>
                    )}
                </>
            ) : (
                /* tunic default */
                <mesh position={[0, chestH * 0.35, 0]} castShadow scale={[1.05, 1, fem ? 0.92 : 1]}>
                    <capsuleGeometry args={[chestR, chestH * 0.42, 5, 12]} />
                    <Mat color={c.top} kind="cloth" roughness={0.72} />
                </mesh>
            )}

            {/* collar */}
            <mesh position={[0, chestH * 0.72, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.09, 0.06, 10]} />
                <Mat color={c.skinDeep} kind="skin" />
            </mesh>

            {/* shoulders */}
            <mesh position={[-chestR * 1.15, chestH * 0.55, 0]} castShadow>
                <sphereGeometry args={[0.07, 10, 8]} />
                <Mat color={outfit === 'vest' ? c.top : c.top} />
            </mesh>
            <mesh position={[chestR * 1.15, chestH * 0.55, 0]} castShadow>
                <sphereGeometry args={[0.07, 10, 8]} />
                <Mat color={c.top} kind="cloth" />
            </mesh>

            {/* trim */}
            <mesh position={[0, chestH * 0.22, chestR * 0.9]}>
                <boxGeometry args={[chestR * 1.0, 0.015, 0.015]} />
                <Mat color={c.gold} kind="gold" roughness={0.4} metalness={0.4} />
            </mesh>
        </group>
    );
}

/** Skirt / robe lower volume under hips (world, not rotating with legs much — parent to hips). */
export function LowerOutfit({
    outfit,
    c,
    hipW,
    fem,
}: {
    outfit: OutfitStyle;
    c: VesselColors;
    hipW: number;
    fem: boolean;
}) {
    const skirted = outfit === 'dress' || outfit === 'gown' || outfit === 'vestment'
        || (fem && outfit === 'robe');

    if (skirted) {
        const flare = outfit === 'gown' ? 1.35 : outfit === 'dress' ? 1.2 : 1.15;
        return (
            <group>
                <mesh position={[0, -0.15, 0]} castShadow scale={[flare, 1.1, flare * 0.9]}>
                    <coneGeometry args={[hipW * 0.95, 0.55, 12, 1, true]} />
                    <Mat color={c.top} kind="cloth" roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.38, 0]} castShadow scale={[flare * 1.05, 0.5, flare * 0.95]}>
                    <cylinderGeometry args={[hipW * 1.05, hipW * 1.15, 0.2, 12, 1, true]} />
                    <Mat color={c.topDeep} kind="cloth" roughness={0.82} />
                </mesh>
                {outfit === 'gown' && (
                    <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[hipW * 0.7, 0.015, 6, 18]} />
                        <Mat color={c.gold} kind="gold" roughness={0.4} metalness={0.4} />
                    </mesh>
                )}
            </group>
        );
    }

    // trousers / tunic hem
    return (
        <group>
            <mesh position={[0, -0.02, 0]} castShadow scale={[1, 0.55, 0.85]}>
                <sphereGeometry args={[hipW * 0.5, 12, 10]} />
                <Mat color={c.bottom} kind="cloth" />
            </mesh>
            {outfit === 'cloak' && (
                <mesh position={[0, -0.25, -0.12]} castShadow scale={[1.4, 1.8, 0.35]}>
                    <sphereGeometry args={[hipW * 0.9, 10, 8]} />
                    <Mat color={c.top} kind="cloth" roughness={0.85} />
                </mesh>
            )}
            {outfit === 'tunic' && (
                <mesh position={[0, -0.12, 0]} castShadow>
                    <cylinderGeometry args={[hipW * 0.55, hipW * 0.65, 0.18, 12, 1, true]} />
                    <Mat color={c.topDeep} kind="cloth" roughness={0.8} />
                </mesh>
            )}
            {/* belt */}
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[hipW * 0.48, 0.016, 8, 20]} />
                <Mat color={c.gold} kind="gold" roughness={0.45} metalness={0.35} />
            </mesh>
        </group>
    );
}

export function isSkirtOutfit(outfit: OutfitStyle, fem: boolean) {
    return outfit === 'dress' || outfit === 'gown' || outfit === 'vestment'
        || (fem && outfit === 'robe');
}
