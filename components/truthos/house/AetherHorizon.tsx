'use client';

/**
 * Far layer of the Aether Shelf — floating islets and haze.
 * No trees. Desktop only (HouseCanvas already gates !mobile).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { seededRng } from './houseSkins';

export default function AetherHorizon({ low = false }: { low?: boolean }) {
    const rnd = useMemo(() => seededRng(0x51e1f), []);
    const isles = useMemo(() => {
        const n = low ? 8 : 16;
        return Array.from({ length: n }, () => {
            const a = rnd() * Math.PI * 2;
            const r = 95 + rnd() * 50;
            return {
                x: Math.cos(a) * r,
                z: Math.sin(a) * r,
                y: -4 + rnd() * 6,
                s: 4 + rnd() * 7,
            };
        });
    }, [low, rnd]);

    return (
        <group>
            {isles.map((p, i) => (
                <mesh key={i} position={[p.x, p.y, p.z]}>
                    <coneGeometry args={[p.s, p.s * 0.7, 6]} />
                    <meshStandardMaterial color="#1a1624" roughness={0.9} />
                </mesh>
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8.4, 0]}>
                <ringGeometry args={[70, 220, 40]} />
                <meshBasicMaterial
                    color="#241832"
                    transparent
                    opacity={0.42}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    fog
                />
            </mesh>
            <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[78, 110, 22, 28, 1, true]} />
                <meshBasicMaterial
                    color="#161022"
                    transparent
                    opacity={0.38}
                    side={THREE.BackSide}
                    depthWrite={false}
                    fog
                />
            </mesh>
        </group>
    );
}
