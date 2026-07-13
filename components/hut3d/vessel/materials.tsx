'use client';

import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';

export function Mat({
    color,
    roughness = 0.8,
    metalness = 0.04,
}: {
    color: string;
    roughness?: number;
    metalness?: number;
}) {
    return (
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    );
}

export function shade(hex: string, mult: number) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(mult);
    return `#${c.getHexString()}`;
}

export function useVesselColors(avatar: AvatarConfig) {
    const skin = SKIN_TONES[avatar.skin] ?? SKIN_TONES[6];
    const top = CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5];
    const bottom = CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12];
    const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
    const beard = HAIR_COLORS[avatar.beardColor ?? avatar.hairColor] ?? hair;
    return {
        skin,
        skinDeep: shade(skin, 0.82),
        hair,
        beard,
        top,
        topDeep: shade(top, 0.72),
        bottom,
        bottomDeep: shade(bottom, 0.75),
        boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
        eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
        gold: '#d4a017',
        leather: '#4a3324',
        white: '#f0ebe3',
    };
}

export type VesselColors = ReturnType<typeof useVesselColors>;

/** Limb along local −Y, pivot at joint. */
export function Limb({
    radius,
    length,
    color,
    taper = 1,
}: {
    radius: number;
    length: number;
    color: string;
    taper?: number;
}) {
    return (
        <group>
            <mesh position={[0, -length * 0.5, 0]} castShadow>
                <capsuleGeometry args={[radius, Math.max(0.02, length - radius * 1.6), 5, 10]} />
                <Mat color={color} />
            </mesh>
            {taper < 0.99 && (
                <mesh position={[0, -length * 0.85, 0]} castShadow>
                    <sphereGeometry args={[radius * taper, 8, 8]} />
                    <Mat color={color} />
                </mesh>
            )}
        </group>
    );
}
