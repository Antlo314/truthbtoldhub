'use client';

/**
 * House props — skinned interactables + rings (expanded layout).
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
            {/* Arcade controller on coffee table */}
            <group position={[0.2, 0.42, -5.2]} rotation={[0, 0.35, 0]}>
                <mesh castShadow={!low}>
                    <boxGeometry args={[0.34, 0.065, 0.21]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh ref={glow} position={[0, 0.04, -0.02]}>
                    <boxGeometry args={[0.14, 0.016, 0.03]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} toneMapped={false} />
                </mesh>
            </group>
            {/* Offering tray */}
            <group position={[-3.2, 0.52, -4.0]} rotation={[-0.06, 0.2, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.3, 0.022, 0.18]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
                <mesh position={[0, 0.02, 0]}>
                    <planeGeometry args={[0.22, 0.12]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            </group>
            {/* Ledger book */}
            <group position={[-8.5, 0, 2.5]}>
                <mesh position={[0, 1.08, 0]} rotation={[-0.16, 0.15, 0]} castShadow>
                    <boxGeometry args={[0.38, 0.06, 0.28]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
            </group>
            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing
                        accent={ACCENT[h.id] || '#fbbf24'}
                        radius={
                            h.id === 'arcade'
                                ? 0.28
                                : h.id === 'front_door'
                                  ? 0.5
                                  : h.id === 'fireplace'
                                    ? 0.55
                                    : 0.36
                        }
                        low={low}
                    />
                </group>
            ))}
        </group>
    );
}
