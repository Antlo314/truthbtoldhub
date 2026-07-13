'use client';

/**
 * Stage Hut assets: Truth (hooded AA figure), vessel, stations, hearth.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TruthMesh } from '@/components/hut3d/AvatarMesh';
import { VesselModel } from '@/components/hut3d/VesselModel';
import { useGameStore } from '@/lib/store/useGameStore';
import { HOTSPOTS } from './houseMap';

const ACCENT: Record<string, string> = {
    computer: '#22c55e',
    truth: '#f97316',
    envelope: '#fbbf24',
    library: '#a78bfa',
    codex: '#e879f9',
    ledger: '#fbbf24',
    chamber: '#7c5cff',
    wayfinder: '#22c55e',
    cinema: '#c084fc',
    hall: '#38bdf8',
    soul_mirror: '#94a3b8',
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

function TruthDais({ low }: { low?: boolean }) {
    return (
        <group position={[0.2, 0, -0.2]}>
            <mesh position={[0, 0.1, 0]} receiveShadow={!low}>
                <cylinderGeometry args={[0.85, 0.95, 0.2, low ? 12 : 24]} />
                <meshStandardMaterial color="#2c2118" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 0.85, low ? 16 : 32]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Hooded African American Truth — Hut station (not multiplayer) */}
            <TruthMesh position={[0, 0.22, 0]} low={low} />
            {!low && (
                <pointLight position={[0, 1.6, 0.3]} intensity={1.4} color="#f97316" distance={5} decay={2} />
            )}
        </group>
    );
}

/**
 * Soul Mirror reflection — intentionally translucent so it never reads as an NPC.
 */
function MirrorVessel({ low }: { low?: boolean }) {
    const avatar = useGameStore((s) => s.character.avatar);
    if (low) {
        return (
            <group position={[2.35, 0, 6.35]}>
                <mesh position={[0, 0.9, 0]}>
                    <capsuleGeometry args={[0.16, 0.65, 4, 6]} />
                    <meshStandardMaterial color="#6b7c94" roughness={0.5} transparent opacity={0.35} depthWrite={false} />
                </mesh>
                <mesh position={[0, 1.45, 0]}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial color="#7a8ca3" roughness={0.5} transparent opacity={0.35} depthWrite={false} />
                </mesh>
            </group>
        );
    }
    return (
        <group position={[2.35, 0, 6.35]} rotation={[0, Math.PI / 2, 0]}>
            <group scale={0.92}>
                <VesselModel avatar={avatar} scale={1} />
            </group>
            {/* Glass wash so it reads as reflection, not a second player */}
            <mesh position={[0, 0.95, 0.15]}>
                <planeGeometry args={[0.7, 1.7]} />
                <meshStandardMaterial color="#8ab4d4" transparent opacity={0.12} depthWrite={false} metalness={0.6} roughness={0.2} />
            </mesh>
            <pointLight position={[0, 1.4, 0.4]} intensity={0.7} color="#c4d0ff" distance={4} decay={2} />
        </group>
    );
}

function LedgerPedestal() {
    return (
        <group position={[-4.2, 0, 1.2]}>
            <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[0.55, 0.9, 0.55]} />
                <meshStandardMaterial color="#2c241c" roughness={0.85} />
            </mesh>
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

function WayfinderMap() {
    return (
        <group position={[0, 1.5, -5.4]}>
            <mesh>
                <boxGeometry args={[1.4, 1.0, 0.08]} />
                <meshStandardMaterial color="#1a1520" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
                <planeGeometry args={[1.2, 0.85]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={0.55}
                    toneMapped={false}
                />
            </mesh>
            <mesh position={[0, -0.1, 0.06]}>
                <circleGeometry args={[0.08, 10]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0.25, 0.15, 0.06]}>
                <circleGeometry args={[0.06, 10]} />
                <meshBasicMaterial color="#a78bfa" />
            </mesh>
        </group>
    );
}

function HearthWest({ low }: { low?: boolean }) {
    const flame = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!flame.current || low) return;
        const t = clock.elapsedTime;
        flame.current.scale.y = 1 + Math.sin(t * 8) * 0.12;
        flame.current.position.y = 0.55 + Math.sin(t * 6) * 0.03;
    });
    return (
        <group position={[-6.8, 0, 3.2]}>
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[1.2, 0.8, 0.7]} />
                <meshStandardMaterial color="#1a1410" roughness={0.95} />
            </mesh>
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
                <pointLight position={[0, 0.9, 0.2]} intensity={1.6} color="#ff8a3d" distance={6} decay={2} />
            )}
        </group>
    );
}

export default function HouseDecor({ low = false }: { low?: boolean }) {
    return (
        <group>
            <TruthDais low={low} />
            <MirrorVessel low={low} />
            <LedgerPedestal />
            <WayfinderMap />
            <HearthWest low={low} />
            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing accent={ACCENT[h.id] || '#fbbf24'} low={low} />
                </group>
            ))}
        </group>
    );
}
