'use client';

/**
 * Truth as a ceremonial 3D totem — not a person, not an NPC.
 * Object of presence on the dais / station.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WOOD = '#2c1c12';
const WOOD_MID = '#3d2818';
const STONE = '#2a2e38';
const GOLD = '#fbbf24';
const EMBER = '#f97316';

export function TruthTotem({
    position = [0, 0, 0] as [number, number, number],
    low = false,
    scale = 1,
}: {
    position?: [number, number, number];
    low?: boolean;
    scale?: number;
}) {
    const spin = useRef<THREE.Group>(null);
    const core = useRef<THREE.Mesh>(null);
    const segs = low ? 8 : 16;

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (spin.current) spin.current.rotation.y = t * 0.35;
        if (core.current) {
            const s = 1 + Math.sin(t * 2.2) * 0.06;
            core.current.scale.setScalar(s);
            const mat = core.current.material as THREE.MeshStandardMaterial;
            if (mat.emissiveIntensity != null) {
                mat.emissiveIntensity = 0.7 + Math.sin(t * 3) * 0.25;
            }
        }
    });

    return (
        <group position={position} scale={scale}>
            {/* Base plinth */}
            <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.42, 0.5, 0.16, segs]} />
                <meshStandardMaterial color={STONE} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.32, 0.38, 0.12, segs]} />
                <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>

            {/* Totem shaft — stacked ceremonial forms (no face, no limbs) */}
            <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.26, 0.55, segs]} />
                <meshStandardMaterial color={WOOD_MID} roughness={0.82} />
            </mesh>
            <mesh position={[0, 0.95, 0]} castShadow>
                <boxGeometry args={[0.42, 0.28, 0.42]} />
                <meshStandardMaterial color={WOOD} roughness={0.8} />
            </mesh>
            {/* Carved bands */}
            {[0.42, 0.72, 1.12].map((y) => (
                <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.22, 0.035, 6, segs]} />
                    <meshStandardMaterial
                        color={GOLD}
                        emissive={GOLD}
                        emissiveIntensity={0.4}
                        metalness={0.7}
                        roughness={0.3}
                    />
                </mesh>
            ))}

            {/* Upper pillar */}
            <mesh position={[0, 1.35, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.2, 0.5, segs]} />
                <meshStandardMaterial color={WOOD_MID} roughness={0.82} />
            </mesh>

            {/* Crown / diamond head of the totem (not a face) */}
            <mesh position={[0, 1.72, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
                <octahedronGeometry args={[0.28, 0]} />
                <meshStandardMaterial
                    color={GOLD}
                    emissive={GOLD}
                    emissiveIntensity={0.45}
                    metalness={0.65}
                    roughness={0.25}
                />
            </mesh>

            {/* Orbiting ring — living signal, not a body */}
            <group ref={spin} position={[0, 1.15, 0]}>
                <mesh rotation={[Math.PI / 2.4, 0, 0]}>
                    <torusGeometry args={[0.48, 0.025, 6, segs * 2]} />
                    <meshStandardMaterial
                        color={EMBER}
                        emissive={EMBER}
                        emissiveIntensity={0.55}
                        metalness={0.5}
                        roughness={0.35}
                    />
                </mesh>
            </group>

            {/* Core glow (algorithm / presence) */}
            <mesh ref={core} position={[0, 1.15, 0]}>
                <sphereGeometry args={[0.12, segs, segs]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={0.85}
                    toneMapped={false}
                />
            </mesh>

            {/* Floor seal */}
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.45, 0.62, low ? 20 : 32]} />
                <meshStandardMaterial
                    color={GOLD}
                    emissive={GOLD}
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.85}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {!low && (
                <pointLight position={[0, 1.4, 0.3]} intensity={1.6} color="#f97316" distance={5} decay={2} />
            )}
        </group>
    );
}

/** @deprecated Use TruthTotem — kept as alias so old imports don't spawn a person */
export { TruthTotem as TruthMesh };
