'use client';

/**
 * Wall fireplace — living room north wall. Visible fire + crackle audio anchor.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';
import { FIREPLACE } from './houseMap';

export default function Fireplace({
    mats,
    low = false,
    rich = true,
}: {
    mats: HouseMaterials;
    low?: boolean;
    rich?: boolean;
}) {
    const flameA = useRef<THREE.Mesh>(null);
    const flameB = useRef<THREE.Mesh>(null);
    const glow = useRef<THREE.PointLight>(null);
    const { x, z } = FIREPLACE;

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (flameA.current) {
            flameA.current.scale.y = 1 + Math.sin(t * 9) * 0.14;
            flameA.current.position.y = 0.72 + Math.sin(t * 7) * 0.04;
        }
        if (flameB.current) {
            flameB.current.scale.y = 1 + Math.sin(t * 11 + 1) * 0.18;
            flameB.current.position.y = 0.58 + Math.cos(t * 8) * 0.03;
        }
        if (glow.current && !low) {
            glow.current.intensity = 1.8 + Math.sin(t * 6) * 0.35;
        }
    });

    return (
        <group position={[x, 0, z]}>
            {/* Chimney breast against north wall */}
            <mesh position={[0, 1.55, -0.35]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 3.1, 0.55]} />
                <primitive object={mats.stone} attach="material" />
            </mesh>
            {/* Mantel */}
            <mesh position={[0, 1.55, 0.05]} castShadow>
                <boxGeometry args={[3.5, 0.14, 0.45]} />
                <primitive object={mats.wood} attach="material" />
            </mesh>
            {/* Inner firebox */}
            <mesh position={[0, 0.75, 0.05]}>
                <boxGeometry args={[1.7, 1.15, 0.5]} />
                <primitive object={mats.black} attach="material" />
            </mesh>
            {/* Hearth slab into room */}
            <mesh position={[0, 0.06, 0.55]} receiveShadow>
                <boxGeometry args={[2.4, 0.12, 0.9]} />
                <primitive object={mats.stone} attach="material" />
            </mesh>
            {/* Side pillars */}
            <mesh position={[-1.1, 0.85, 0.12]} castShadow>
                <boxGeometry args={[0.35, 1.5, 0.4]} />
                <primitive object={mats.stone} attach="material" />
            </mesh>
            <mesh position={[1.1, 0.85, 0.12]} castShadow>
                <boxGeometry args={[0.35, 1.5, 0.4]} />
                <primitive object={mats.stone} attach="material" />
            </mesh>
            {/* Logs */}
            <mesh position={[-0.2, 0.28, 0.15]} rotation={[0, 0.3, 0.1]} castShadow>
                <cylinderGeometry args={[0.08, 0.09, 0.7, 8]} />
                <primitive object={mats.woodDark} attach="material" />
            </mesh>
            <mesh position={[0.25, 0.3, 0.1]} rotation={[0, -0.4, -0.05]} castShadow>
                <cylinderGeometry args={[0.07, 0.08, 0.65, 8]} />
                <primitive object={mats.woodDark} attach="material" />
            </mesh>
            {/* Flames */}
            <mesh ref={flameA} position={[0, 0.72, 0.18]}>
                <coneGeometry args={[0.28, 0.7, low ? 6 : 10]} />
                <primitive object={mats.ember} attach="material" />
            </mesh>
            <mesh ref={flameB} position={[0.12, 0.58, 0.22]}>
                <coneGeometry args={[0.16, 0.45, low ? 5 : 8]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.2}
                    toneMapped={false}
                />
            </mesh>
            {!low && (
                <pointLight
                    ref={glow}
                    position={[0, 1.0, 0.5]}
                    color="#ff8a3d"
                    intensity={2.0}
                    distance={9}
                    decay={2}
                />
            )}
            {rich && (
                <mesh position={[0, 2.35, 0.0]}>
                    <boxGeometry args={[0.9, 0.08, 0.2]} />
                    <primitive object={mats.gold} attach="material" />
                </mesh>
            )}
        </group>
    );
}
