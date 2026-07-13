'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTarget } from './types';
import { ANCHORS } from './types';

/**
 * Emissive screen + procedural flicker (Matrix / first-contact signal).
 * Reports intensity 0..1 via onFlicker for coupling PointLight.
 */
export function FlickerScreen({
    target,
    active = true,
    onFlicker,
    onSelect,
}: {
    target: DeviceTarget;
    active?: boolean;
    onFlicker?: (v: number) => void;
    onSelect?: () => void;
}) {
    const mat = useRef<THREE.MeshStandardMaterial>(null);
    const t = useRef(0);
    const flickerVal = useRef(0.7);

    const isPhone = target === 'phone';
    const anchor = ANCHORS[target];

    // Subtle noise-ish flicker without textures
    useFrame((_, dt) => {
        if (!active) return;
        t.current += dt;
        const n =
            0.62 +
            Math.sin(t.current * 11.3) * 0.08 +
            Math.sin(t.current * 27.1) * 0.05 +
            (Math.random() > 0.97 ? -0.25 : 0) +
            (Math.random() > 0.992 ? 0.2 : 0);
        flickerVal.current = THREE.MathUtils.clamp(n, 0.15, 1);
        if (mat.current) {
            mat.current.emissiveIntensity = 0.4 + flickerVal.current * 1.4;
            mat.current.opacity = 0.92;
        }
        onFlicker?.(flickerVal.current);
    });

    const geo = useMemo(() => {
        if (isPhone) return { w: 0.14, h: 0.28, d: 0.012 };
        return { w: 0.72, h: 0.42, d: 0.02 };
    }, [isPhone]);

    return (
        <group position={anchor.position}>
            {/* Bezel */}
            <mesh
                castShadow
                position={[0, 0, -geo.d * 0.6]}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                }}
                onPointerOver={() => {
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    document.body.style.cursor = 'auto';
                }}
            >
                <boxGeometry args={[geo.w + 0.04, geo.h + 0.04, geo.d]} />
                <meshStandardMaterial color="#1a1a1e" roughness={0.45} metalness={0.4} />
            </mesh>

            {/* Active panel */}
            <mesh position={[0, 0, 0]} castShadow>
                <planeGeometry args={[geo.w, geo.h]} />
                <meshStandardMaterial
                    ref={mat}
                    color="#041208"
                    emissive={isPhone ? '#22d3ee' : '#22c55e'}
                    emissiveIntensity={1.2}
                    roughness={0.35}
                    metalness={0.1}
                    toneMapped={false}
                />
            </mesh>

            {/* Stand (monitor only) */}
            {!isPhone && (
                <>
                    <mesh position={[0, -geo.h * 0.55, -0.04]} castShadow>
                        <cylinderGeometry args={[0.03, 0.04, 0.18, 8]} />
                        <meshStandardMaterial color="#222" roughness={0.5} metalness={0.3} />
                    </mesh>
                    <mesh position={[0, -geo.h * 0.68, -0.02]} castShadow>
                        <boxGeometry args={[0.28, 0.02, 0.16]} />
                        <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
                    </mesh>
                </>
            )}
        </group>
    );
}
