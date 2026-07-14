'use client';

import type { FaceStyle } from '@/lib/game/avatar';
import { Mat, type VesselColors } from './materials';

export function FaceParts({
    face,
    c,
    headR,
}: {
    face: FaceStyle;
    c: VesselColors;
    headR: number;
}) {
    const ey = headR + 0.07;
    const ez = headR * 0.78;
    const keen = face === 'keen';

    return (
        <group>
            {/* sclera + iris */}
            <mesh position={[-0.038, ey, ez]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <Mat color={c.white} roughness={0.4} />
            </mesh>
            <mesh position={[0.038, ey, ez]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <Mat color={c.white} roughness={0.4} />
            </mesh>
            <mesh position={[-0.038, ey + (keen ? 0.004 : 0), ez + 0.012]}>
                <sphereGeometry args={[keen ? 0.012 : 0.011, 8, 8]} />
                <Mat color={c.eyes} kind="eyes" roughness={0.25} metalness={0.15} />
            </mesh>
            <mesh position={[0.038, ey + (keen ? 0.004 : 0), ez + 0.012]}>
                <sphereGeometry args={[keen ? 0.012 : 0.011, 8, 8]} />
                <Mat color={c.eyes} kind="eyes" roughness={0.25} metalness={0.15} />
            </mesh>
            {/* brows for keen */}
            {keen && (
                <>
                    <mesh position={[-0.04, ey + 0.025, ez + 0.01]} rotation={[0, 0, 0.25]} castShadow>
                        <boxGeometry args={[0.045, 0.008, 0.012]} />
                        <Mat color={c.beard} kind="hair" roughness={0.9} />
                    </mesh>
                    <mesh position={[0.04, ey + 0.025, ez + 0.01]} rotation={[0, 0, -0.25]} castShadow>
                        <boxGeometry args={[0.045, 0.008, 0.012]} />
                        <Mat color={c.beard} kind="hair" roughness={0.9} />
                    </mesh>
                </>
            )}
            {/* nose */}
            <mesh position={[0, headR + 0.02, headR * 0.92]} castShadow scale={[0.35, 0.45, 0.5]}>
                <sphereGeometry args={[0.03, 8, 6]} />
                <Mat color={c.skinDeep} kind="skin" />
            </mesh>

            {/* facial hair */}
            {(face === 'goatee' || face === 'beard' || face === 'mustache') && (
                <group>
                    {(face === 'mustache' || face === 'beard') && (
                        <mesh position={[0, headR * 0.55, headR * 0.85]} castShadow scale={[0.9, 0.35, 0.4]}>
                            <sphereGeometry args={[0.04, 8, 6]} />
                            <Mat color={c.beard} kind="hair" roughness={0.92} />
                        </mesh>
                    )}
                    {(face === 'goatee' || face === 'beard') && (
                        <mesh position={[0, headR * 0.35, headR * 0.75]} castShadow scale={[0.55, 0.7, 0.5]}>
                            <sphereGeometry args={[0.045, 8, 6]} />
                            <Mat color={c.beard} kind="hair" roughness={0.92} />
                        </mesh>
                    )}
                    {face === 'beard' && (
                        <mesh position={[0, headR * 0.25, headR * 0.55]} castShadow scale={[1.1, 0.7, 0.7]}>
                            <sphereGeometry args={[0.07, 10, 8]} />
                            <Mat color={c.beard} kind="hair" roughness={0.93} />
                        </mesh>
                    )}
                </group>
            )}
        </group>
    );
}
