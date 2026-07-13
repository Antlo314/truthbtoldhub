'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const WOOD = '#3d2a1a';
const WOOD_DARK = '#24180f';
const STONE = '#2a2e38';
const RUG = '#5c2e1a';
const GOLD = '#fbbf24';
const EMBER = '#ff6b2c';

function Box({
    args, position, color, roughness = 0.85, metalness = 0, emissive, emissiveIntensity = 0,
}: {
    args: [number, number, number];
    position: [number, number, number];
    color: string;
    roughness?: number;
    metalness?: number;
    emissive?: string;
    emissiveIntensity?: number;
}) {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial
                color={color}
                roughness={roughness}
                metalness={metalness}
                emissive={emissive ?? '#000'}
                emissiveIntensity={emissiveIntensity}
            />
        </mesh>
    );
}

/** Ceremonial chamber — restrained geometry, strong lighting, readable floor plan */
export default function HutRoom() {
    const floorMat = useMemo(
        () => new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.92 }),
        [],
    );

    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[18, 16]} />
                <primitive object={floorMat} attach="material" />
            </mesh>

            {/* Center aisle carpet */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]} receiveShadow>
                <planeGeometry args={[2.2, 11]} />
                <meshStandardMaterial color={RUG} roughness={0.95} />
            </mesh>
            {/* gold aisle edge */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.15, 0.012, 0.5]}>
                <planeGeometry args={[0.06, 11]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.15, 0.012, 0.5]}>
                <planeGeometry args={[0.06, 11]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.2} />
            </mesh>

            {/* Walls */}
            <Box args={[18, 4.2, 0.35]} position={[0, 2.1, -7.5]} color={STONE} />
            <Box args={[18, 4.2, 0.35]} position={[0, 2.1, 7.5]} color={STONE} />
            <Box args={[0.35, 4.2, 15]} position={[-9, 2.1, 0]} color={STONE} />
            <Box args={[0.35, 4.2, 15]} position={[9, 2.1, 0]} color={STONE} />

            {/* Beams */}
            {[-4, 0, 4].map((z) => (
                <Box key={z} args={[17.5, 0.22, 0.28]} position={[0, 3.9, z]} color={WOOD} />
            ))}
            {[-6, -2, 2, 6].map((x) => (
                <Box key={x} args={[0.22, 0.22, 14.5]} position={[x, 3.95, 0]} color={WOOD} />
            ))}

            {/* North dais for Truth */}
            <mesh position={[0, 0.12, 5.2]} receiveShadow>
                <cylinderGeometry args={[1.6, 1.75, 0.24, 24]} />
                <meshStandardMaterial color="#2c2118" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.26, 5.2]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.35, 1.55, 40]} />
                <meshStandardMaterial
                    color={GOLD}
                    emissive={GOLD}
                    emissiveIntensity={0.35}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Hearth west */}
            <group position={[-5.5, 0, 0]}>
                <Box args={[1.8, 1.1, 0.9]} position={[0, 0.55, 0]} color="#1a1410" />
                <mesh position={[0, 0.85, 0.2]}>
                    <sphereGeometry args={[0.28, 12, 12]} />
                    <meshStandardMaterial color={EMBER} emissive={EMBER} emissiveIntensity={1.4} />
                </mesh>
                <pointLight position={[0, 1.2, 0.3]} color={EMBER} intensity={8} distance={9} decay={2} castShadow />
            </group>

            {/* Soul mirror east */}
            <group position={[5.8, 0, 1.5]}>
                <Box args={[0.15, 2.4, 1.1]} position={[0, 1.3, 0]} color="#1c1c24" metalness={0.4} roughness={0.3} />
                <mesh position={[-0.08, 1.35, 0]}>
                    <planeGeometry args={[0.9, 1.9]} />
                    <meshStandardMaterial
                        color="#4a6a8a"
                        metalness={0.85}
                        roughness={0.15}
                        emissive="#1a3048"
                        emissiveIntensity={0.4}
                    />
                </mesh>
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.7, 0.9, 28]} />
                    <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.25} side={THREE.DoubleSide} />
                </mesh>
            </group>

            {/* Wayfinder table south-center */}
            <group position={[0, 0, -4.2]}>
                <Box args={[2.2, 0.12, 1.2]} position={[0, 0.85, 0]} color={WOOD} />
                <Box args={[0.12, 0.85, 0.12]} position={[-0.9, 0.42, -0.4]} color={WOOD_DARK} />
                <Box args={[0.12, 0.85, 0.12]} position={[0.9, 0.42, -0.4]} color={WOOD_DARK} />
                <Box args={[0.12, 0.85, 0.12]} position={[-0.9, 0.42, 0.4]} color={WOOD_DARK} />
                <Box args={[0.12, 0.85, 0.12]} position={[0.9, 0.42, 0.4]} color={WOOD_DARK} />
                {/* map glow */}
                <mesh position={[0, 0.93, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.55, 24]} />
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
                </mesh>
            </group>

            {/* Ledger lectern north-west */}
            <group position={[-4.2, 0, 4.8]}>
                <Box args={[0.7, 1.1, 0.5]} position={[0, 0.55, 0]} color={WOOD} />
                <Box args={[0.85, 0.08, 0.55]} position={[0, 1.15, 0.05]} color={WOOD_DARK} />
            </group>

            {/* Sanctum door north wall */}
            <group position={[0, 0, -7.2]}>
                <Box args={[2.2, 3.2, 0.2]} position={[0, 1.6, 0]} color="#1a1230" />
                <mesh position={[0, 1.7, 0.12]}>
                    <planeGeometry args={[1.6, 2.6]} />
                    <meshStandardMaterial
                        color="#4c1d95"
                        emissive="#7c5cff"
                        emissiveIntensity={0.35}
                        metalness={0.3}
                        roughness={0.4}
                    />
                </mesh>
            </group>

            {/* Soft pillars */}
            {[[-7, -5], [7, -5], [-7, 5], [7, 5]].map(([x, z], i) => (
                <mesh key={i} position={[x, 1.8, z]} castShadow>
                    <cylinderGeometry args={[0.28, 0.32, 3.6, 10]} />
                    <meshStandardMaterial color="#3a3530" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}
