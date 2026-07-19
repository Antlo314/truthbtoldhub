'use client';

/**
 * Staged room props — interactables sit on furniture (open-house placement).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from './houseMap';
import { useHouseMaterials } from './HouseMaterials';

const ACCENT: Record<string, string> = {
    computer: '#22c55e',
    envelope: '#fbbf24',
    library: '#a78bfa',
    codex: '#e879f9',
    ledger: '#fbbf24',
    wayfinder: '#22c55e',
    cinema: '#c084fc',
    hall: '#38bdf8',
    soul_mirror: '#94a3b8',
    arcade: '#22d3ee',
    studio: '#f97316',
    front_door: '#e8d5b0',
    back_door: '#c4b5a0',
    front_bench: '#86efac',
    back_gate: '#a3e635',
    fireplace: '#ff8a3d',
};

function SpinRing({
    accent,
    radius = 0.38,
    low,
}: {
    accent: string;
    radius?: number;
    low?: boolean;
}) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (ref.current) ref.current.rotation.z += dt * (low ? 0.2 : 0.35);
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[radius, radius + 0.09, low ? 16 : 28]} />
            <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.65}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default function HouseDecor({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const glow = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!glow.current || low) return;
        (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
    });

    return (
        <group>
            {/* Arcade pad on coffee table (living conversation group) */}
            <group position={[0.15, 0.44, -8.35]} rotation={[0, 0.28, 0]}>
                <mesh castShadow={!low}>
                    <boxGeometry args={[0.36, 0.055, 0.22]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.035, 0.04]}>
                    <boxGeometry args={[0.12, 0.02, 0.08]} />
                    <primitive object={m.black} attach="material" />
                </mesh>
                <mesh ref={glow} position={[0, 0.04, -0.05]}>
                    <boxGeometry args={[0.16, 0.014, 0.028]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} toneMapped={false} />
                </mesh>
                <mesh position={[-0.1, 0.04, 0.02]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.35} />
                </mesh>
                <mesh position={[-0.05, 0.04, 0.06]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.02, 10]} />
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
                </mesh>
            </group>

            {/* Offering tray on west living console */}
            <group position={[-4.3, 0.78, -6.2]} rotation={[-0.04, Math.PI / 2, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.32, 0.02, 0.2]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
                <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.24, 0.14]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                <mesh position={[0.08, 0.03, 0.02]}>
                    <boxGeometry args={[0.06, 0.04, 0.04]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
            </group>

            {/* Ledger book on library reading table (deep in room) */}
            <group position={[-10.4, 0, -3.5]}>
                <mesh position={[0, 0.95, 0]} rotation={[-0.12, 0.2, 0]} castShadow>
                    <boxGeometry args={[0.36, 0.055, 0.26]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
                <mesh position={[0.02, 0.99, 0.01]} rotation={[-0.12, 0.2, 0]}>
                    <boxGeometry args={[0.28, 0.01, 0.2]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </group>

            {/* Desk lamp on bedroom workstation */}
            <group position={[5.45, 0.78, 7.45]}>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.08, 0.03, 10]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.18, 0]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.36, 6]} />
                    <primitive object={m.metal} attach="material" />
                </mesh>
                <mesh position={[0.08, 0.32, -0.04]} rotation={[0.4, 0, 0.3]}>
                    <coneGeometry args={[0.09, 0.12, 10]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                {!low && (
                    <pointLight position={[0.1, 0.28, -0.05]} intensity={0.35} distance={2.2} color="#fbbf24" />
                )}
            </group>

            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing
                        accent={ACCENT[h.id] || '#fbbf24'}
                        radius={
                            h.id === 'arcade'
                                ? 0.28
                                : h.id === 'front_door' || h.id === 'back_door'
                                  ? 0.5
                                  : h.id === 'fireplace'
                                    ? 0.55
                                    : h.id === 'front_bench' || h.id === 'back_gate'
                                      ? 0.42
                                      : 0.36
                        }
                        low={low}
                    />
                </group>
            ))}
        </group>
    );
}
