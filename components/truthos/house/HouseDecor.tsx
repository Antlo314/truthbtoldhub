'use client';

/**
 * House staging: Truth totem (not a person), stations, hearth.
 * No fake NPCs / no mirror vessel body.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TruthTotem } from '@/components/hut3d/TruthTotem';
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
            {/* Totem — never a person */}
            <TruthTotem position={[0, 0.22, 0]} low={low} scale={0.95} />
        </group>
    );
}

/** Soul mirror — glass only, no second body */
function SoulMirrorOnly({ low }: { low?: boolean }) {
    return (
        <group position={[2.75, 0, 6.8]}>
            <mesh position={[0, 1.3, 0]} castShadow={!low}>
                <boxGeometry args={[0.1, 1.4, 0.75]} />
                <meshStandardMaterial color="#1a1a22" roughness={0.6} metalness={0.3} />
            </mesh>
            <mesh position={[-0.06, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.6, 1.15]} />
                <meshStandardMaterial
                    color="#4a6a8a"
                    metalness={0.85}
                    roughness={0.12}
                    emissive="#1a3048"
                    emissiveIntensity={0.3}
                />
            </mesh>
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
            <SoulMirrorOnly low={low} />
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
