'use client';

/**
 * House props — unique interactables.
 * Arcade: TV + console (geometry) + controller mesh here; hotspot = controller.
 * Truth content is only inside Truth.OS.
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
    forge: '#f97316',
};

function SpinRing({
    accent,
    radius = 0.42,
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
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[radius, radius + 0.1, low ? 16 : 28]} />
            <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.55}
                transparent
                opacity={0.75}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

/** Gamepad on coffee table — the arcade interactable */
function ArcadeController({ low }: { low?: boolean }) {
    const glow = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!glow.current || low) return;
        const p = 0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
        (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p;
    });
    return (
        <group position={[0.15, 0.42, -1.15]} rotation={[0, 0.35, 0]}>
            {/* body */}
            <mesh castShadow={!low}>
                <boxGeometry args={[0.32, 0.06, 0.2]} />
                <meshStandardMaterial color="#1a1a22" roughness={0.55} metalness={0.25} />
            </mesh>
            {/* grips */}
            <mesh position={[-0.14, -0.01, 0.04]} rotation={[0.15, 0, 0.2]}>
                <boxGeometry args={[0.1, 0.05, 0.12]} />
                <meshStandardMaterial color="#121218" roughness={0.7} />
            </mesh>
            <mesh position={[0.14, -0.01, 0.04]} rotation={[0.15, 0, -0.2]}>
                <boxGeometry args={[0.1, 0.05, 0.12]} />
                <meshStandardMaterial color="#121218" roughness={0.7} />
            </mesh>
            {/* LED strip */}
            <mesh ref={glow} position={[0, 0.035, -0.02]}>
                <boxGeometry args={[0.14, 0.015, 0.03]} />
                <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={0.7}
                    toneMapped={false}
                />
            </mesh>
            {/* sticks */}
            <mesh position={[-0.08, 0.04, 0.02]}>
                <cylinderGeometry args={[0.02, 0.02, 0.03, 8]} />
                <meshStandardMaterial color="#2a2a32" />
            </mesh>
            <mesh position={[0.08, 0.04, 0.02]}>
                <cylinderGeometry args={[0.02, 0.02, 0.03, 8]} />
                <meshStandardMaterial color="#2a2a32" />
            </mesh>
        </group>
    );
}

function OfferingTray() {
    return (
        <group position={[-1.8, 0.48, -0.4]} rotation={[-0.08, 0.35, 0]}>
            <mesh>
                <boxGeometry args={[0.28, 0.02, 0.18]} />
                <meshStandardMaterial color="#f5f0e6" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
                <planeGeometry args={[0.22, 0.12]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
            </mesh>
        </group>
    );
}

function LedgerBook() {
    return (
        <group position={[-5.0, 0, 2.0]}>
            <mesh position={[0, 0.95, 0]} rotation={[-0.15, 0.2, 0]}>
                <boxGeometry args={[0.38, 0.06, 0.28]} />
                <meshStandardMaterial color="#f5f0e6" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.0, 0]} rotation={[-0.15, 0.2, 0]}>
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
        flame.current.position.y = 0.55 + Math.sin(t * 6) * 0.03;
    });
    return (
        <group position={[-7.6, 0, 3.6]}>
            <mesh ref={flame} position={[0, 0.55, 0.15]}>
                <coneGeometry args={[0.18, 0.45, 6]} />
                <meshStandardMaterial
                    color="#ff6b2c"
                    emissive="#ff6b2c"
                    emissiveIntensity={1.1}
                    toneMapped={false}
                />
            </mesh>
            {!low && (
                <pointLight position={[0, 0.9, 0.2]} intensity={1.5} color="#ff8a3d" distance={6} decay={2} />
            )}
        </group>
    );
}

function ForgeEmber({ low }: { low?: boolean }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ref.current || low) return;
        (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.85 + Math.sin(clock.elapsedTime * 5) * 0.35;
    });
    return (
        <mesh ref={ref} position={[7.95, 1.18, -7.2]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={1} toneMapped={false} />
        </mesh>
    );
}

export default function HouseDecor({ low = false }: { low?: boolean }) {
    return (
        <group>
            <ArcadeController low={low} />
            <OfferingTray />
            <LedgerBook />
            <HearthFlame low={low} />
            <ForgeEmber low={low} />
            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing
                        accent={ACCENT[h.id] || '#fbbf24'}
                        radius={h.id === 'arcade' ? 0.32 : 0.42}
                        low={low}
                    />
                </group>
            ))}
        </group>
    );
}
