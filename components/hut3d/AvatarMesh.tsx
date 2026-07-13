'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';

/** Stylized low-poly vessel from AvatarConfig palettes (no external mesh). */
export function AvatarMesh({
    avatar,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
}: {
    avatar: AvatarConfig;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}) {
    const colors = useMemo(() => ({
        skin: SKIN_TONES[avatar.skin] ?? SKIN_TONES[6],
        hair: HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0],
        top: CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5],
        bottom: CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12],
        boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
        eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
    }), [avatar]);

    const isFem = avatar.build === 'fem';
    const bodyW = isFem ? 0.38 : 0.44;
    const hipW = isFem ? 0.4 : 0.42;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* legs */}
            <mesh position={[-0.12, 0.28, 0]} castShadow>
                <capsuleGeometry args={[0.09, 0.28, 4, 8]} />
                <meshStandardMaterial color={colors.bottom} roughness={0.85} />
            </mesh>
            <mesh position={[0.12, 0.28, 0]} castShadow>
                <capsuleGeometry args={[0.09, 0.28, 4, 8]} />
                <meshStandardMaterial color={colors.bottom} roughness={0.85} />
            </mesh>
            {/* boots */}
            <mesh position={[-0.12, 0.06, 0.04]} castShadow>
                <boxGeometry args={[0.14, 0.1, 0.22]} />
                <meshStandardMaterial color={colors.boots} roughness={0.9} />
            </mesh>
            <mesh position={[0.12, 0.06, 0.04]} castShadow>
                <boxGeometry args={[0.14, 0.1, 0.22]} />
                <meshStandardMaterial color={colors.boots} roughness={0.9} />
            </mesh>
            {/* hips + torso */}
            <mesh position={[0, 0.62, 0]} castShadow>
                <capsuleGeometry args={[hipW * 0.45, 0.18, 4, 8]} />
                <meshStandardMaterial color={colors.bottom} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.95, 0]} castShadow>
                <capsuleGeometry args={[bodyW * 0.5, 0.42, 4, 10]} />
                <meshStandardMaterial color={colors.top} roughness={0.75} />
            </mesh>
            {/* arms */}
            <mesh position={[-bodyW * 0.72, 0.95, 0]} rotation={[0, 0, 0.15]} castShadow>
                <capsuleGeometry args={[0.07, 0.32, 4, 8]} />
                <meshStandardMaterial color={colors.skin} roughness={0.7} />
            </mesh>
            <mesh position={[bodyW * 0.72, 0.95, 0]} rotation={[0, 0, -0.15]} castShadow>
                <capsuleGeometry args={[0.07, 0.32, 4, 8]} />
                <meshStandardMaterial color={colors.skin} roughness={0.7} />
            </mesh>
            {/* head */}
            <mesh position={[0, 1.42, 0]} castShadow>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color={colors.skin} roughness={0.65} />
            </mesh>
            {/* hair cap */}
            <mesh position={[0, 1.52, -0.02]} castShadow>
                <sphereGeometry args={[0.21, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={colors.hair} roughness={0.9} />
            </mesh>
            {/* eyes */}
            <mesh position={[-0.07, 1.44, 0.16]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
            </mesh>
            <mesh position={[0.07, 1.44, 0.16]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
            </mesh>
        </group>
    );
}

/** Hooded Truth — distinct silhouette, warm gold trim */
export function TruthMesh({ position = [0, 0, 0] as [number, number, number] }) {
    const robe = '#1e2a4a';
    const hood = '#151c30';
    const gold = '#fbbf24';
    const skin = '#c68642';

    return (
        <group position={position}>
            <mesh position={[0, 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.32, 0.7, 10]} />
                <meshStandardMaterial color={robe} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.95, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.26, 0.7, 10]} />
                <meshStandardMaterial color={robe} roughness={0.88} />
            </mesh>
            {/* hood */}
            <mesh position={[0, 1.45, -0.02]} castShadow>
                <sphereGeometry args={[0.28, 14, 14]} />
                <meshStandardMaterial color={hood} roughness={0.95} />
            </mesh>
            {/* face shadow cavity */}
            <mesh position={[0, 1.38, 0.12]}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            {/* gold trim belt */}
            <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.3, 0.025, 8, 20]} />
                <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
            </mesh>
            {/* floor ring */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.72, 32]} />
                <meshStandardMaterial
                    color={gold}
                    emissive={gold}
                    emissiveIntensity={0.45}
                    transparent
                    opacity={0.85}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}
