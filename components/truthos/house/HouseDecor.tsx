'use client';

/**
 * House props — rings + small interactables staged with furniture.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from './houseMap';

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
                emissiveIntensity={0.6}
                transparent
                opacity={0.78}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

function ArcadeController({ low }: { low?: boolean }) {
    const glow = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!glow.current || low) return;
        const p = 0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
        (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p;
    });
    // Coffee table top
    return (
        <group position={[0.2, 0.42, -1.9]} rotation={[0, 0.35, 0]}>
            <mesh castShadow={!low}>
                <boxGeometry args={[0.34, 0.065, 0.21]} />
                <meshStandardMaterial color="#1a1a22" roughness={0.48} metalness={0.32} />
            </mesh>
            <mesh position={[-0.15, -0.01, 0.05]} rotation={[0.15, 0, 0.22]}>
                <boxGeometry args={[0.1, 0.05, 0.12]} />
                <meshStandardMaterial color="#121218" roughness={0.7} />
            </mesh>
            <mesh position={[0.15, -0.01, 0.05]} rotation={[0.15, 0, -0.22]}>
                <boxGeometry args={[0.1, 0.05, 0.12]} />
                <meshStandardMaterial color="#121218" roughness={0.7} />
            </mesh>
            <mesh ref={glow} position={[0, 0.04, -0.02]}>
                <boxGeometry args={[0.14, 0.016, 0.03]} />
                <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} toneMapped={false} />
            </mesh>
            <mesh position={[-0.08, 0.045, 0.02]}>
                <cylinderGeometry args={[0.02, 0.02, 0.03, 10]} />
                <meshStandardMaterial color="#2a2a32" />
            </mesh>
            <mesh position={[0.08, 0.045, 0.02]}>
                <cylinderGeometry args={[0.02, 0.02, 0.03, 10]} />
                <meshStandardMaterial color="#2a2a32" />
            </mesh>
        </group>
    );
}

function OfferingTray() {
    return (
        <group position={[-2.7, 0.5, 0.2]} rotation={[-0.06, 0.2, 0]}>
            <mesh castShadow>
                <boxGeometry args={[0.3, 0.022, 0.18]} />
                <meshStandardMaterial color="#f5f0e6" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
                <planeGeometry args={[0.22, 0.12]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.42} />
            </mesh>
        </group>
    );
}

function LedgerBook() {
    return (
        <group position={[-5.1, 0, 2.1]}>
            <mesh position={[0, 1.05, 0]} rotation={[-0.16, 0.15, 0]} castShadow>
                <boxGeometry args={[0.38, 0.06, 0.28]} />
                <meshStandardMaterial color="#f5f0e6" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.1, 0]} rotation={[-0.16, 0.15, 0]}>
                <planeGeometry args={[0.28, 0.18]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.35} />
            </mesh>
        </group>
    );
}

function HearthFlame({ low }: { low?: boolean }) {
    const flame = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!flame.current || low) return;
        const t = clock.elapsedTime;
        flame.current.scale.y = 1 + Math.sin(t * 8) * 0.12;
        flame.current.position.y = 0.52 + Math.sin(t * 6) * 0.03;
    });
    return (
        <group position={[-7.55, 0, 3.7]}>
            <mesh ref={flame} position={[0, 0.52, 0.16]}>
                <coneGeometry args={[0.18, 0.48, 8]} />
                <meshStandardMaterial color="#ff6b2c" emissive="#ff6b2c" emissiveIntensity={1.1} toneMapped={false} />
            </mesh>
            {!low && (
                <pointLight position={[0, 0.9, 0.2]} intensity={1.5} color="#ff8a3d" distance={6} decay={2} />
            )}
        </group>
    );
}

export default function HouseDecor({ low = false }: { low?: boolean }) {
    return (
        <group>
            <ArcadeController low={low} />
            <OfferingTray />
            <LedgerBook />
            <HearthFlame low={low} />
            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing
                        accent={ACCENT[h.id] || '#fbbf24'}
                        radius={h.id === 'arcade' ? 0.28 : h.id === 'front_door' ? 0.48 : 0.36}
                        low={low}
                    />
                </group>
            ))}
        </group>
    );
}
