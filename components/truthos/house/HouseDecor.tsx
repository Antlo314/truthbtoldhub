'use client';

/**
 * Stage Hut assets into the house: Truth figure, vessel near mirror,
 * station rings, wayfinder map, ledger pedestal, hearth glow.
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
}: {
    accent: string;
    radius?: number;
}) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (ref.current) ref.current.rotation.z += dt * 0.35;
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[radius, radius + 0.1, 28]} />
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

function TruthDais() {
    return (
        <group position={[0.2, 0, -0.2]}>
            <mesh position={[0, 0.1, 0]} receiveShadow>
                <cylinderGeometry args={[0.85, 0.95, 0.2, 24]} />
                <meshStandardMaterial color="#2c2118" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 0.85, 32]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <TruthMesh position={[0, 0.22, 0]} />
            <pointLight position={[0, 1.6, 0.3]} intensity={1.4} color="#f97316" distance={5} decay={2} />
        </group>
    );
}

function MirrorVessel() {
    const avatar = useGameStore((s) => s.character.avatar);
    return (
        <group position={[2.35, 0, 6.35]} rotation={[0, Math.PI / 2, 0]}>
            <VesselModel avatar={avatar} scale={0.92} />
            <pointLight position={[0, 1.4, 0.4]} intensity={0.9} color="#c4d0ff" distance={4} decay={2} />
        </group>
    );
}

function LedgerPedestal() {
    return (
        <group position={[-4.2, 0, 1.2]}>
            <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.55, 0.9, 0.55]} />
                <meshStandardMaterial color="#2c241c" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.95, 0]} castShadow rotation={[-0.15, 0.2, 0]}>
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
            <mesh castShadow>
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
            {/* Simple path marks */}
            <mesh position={[0, -0.1, 0.06]}>
                <circleGeometry args={[0.08, 12]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0.25, 0.15, 0.06]}>
                <circleGeometry args={[0.06, 12]} />
                <meshBasicMaterial color="#a78bfa" />
            </mesh>
        </group>
    );
}

function HearthWest() {
    const flame = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (flame.current) {
            const t = clock.elapsedTime;
            flame.current.scale.y = 1 + Math.sin(t * 8) * 0.12;
            flame.current.position.y = 0.55 + Math.sin(t * 6) * 0.03;
        }
    });
    return (
        <group position={[-6.8, 0, 3.2]}>
            <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[1.2, 0.8, 0.7]} />
                <meshStandardMaterial color="#1a1410" roughness={0.95} />
            </mesh>
            <mesh ref={flame} position={[0, 0.55, 0.15]}>
                <coneGeometry args={[0.18, 0.45, 8]} />
                <meshStandardMaterial
                    color="#ff6b2c"
                    emissive="#ff6b2c"
                    emissiveIntensity={1.2}
                    toneMapped={false}
                />
            </mesh>
            <pointLight position={[0, 0.9, 0.2]} intensity={1.6} color="#ff8a3d" distance={6} decay={2} />
        </group>
    );
}

/**
 * Decorative Hut staging + animated rings on every hotspot.
 */
export default function HouseDecor() {
    return (
        <group>
            <TruthDais />
            <MirrorVessel />
            <LedgerPedestal />
            <WayfinderMap />
            <HearthWest />

            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing accent={ACCENT[h.id] || '#fbbf24'} />
                </group>
            ))}
        </group>
    );
}
