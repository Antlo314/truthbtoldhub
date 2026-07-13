'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTarget } from './types';
import { ANCHORS } from './types';

/**
 * Evening bedroom lighting:
 * - Cool window wash (ambient key from night sky)
 * - Warm dim fill (room practicals)
 * - Real-time emissive screens (monitor or phone) with flicker-driven intensity
 *
 * Static soft shadows: ContactShadows / future lightmaps.
 * Dynamic: only screen PointLights (cheap, local).
 */
export function EveningLights({
    target,
    flicker,
}: {
    target: DeviceTarget;
    /** 0..1 from FlickerController */
    flicker: number;
}) {
    const screenLight = useRef<THREE.PointLight>(null);
    const anchor = ANCHORS[target];

    useFrame(() => {
        if (!screenLight.current) return;
        // Base emissive presence + flicker modulation
        const base = target === 'monitor' ? 1.35 : 0.85;
        screenLight.current.intensity = base * (0.55 + flicker * 0.75);
    });

    return (
        <>
            {/* Night ambient — violet/blue from window */}
            <hemisphereLight args={['#6b7fd7', '#1a1218', 0.35]} />
            <ambientLight intensity={0.12} color="#a8b4e0" />

            {/* Window cool key */}
            <directionalLight
                position={[4.5, 3.2, -2.5]}
                intensity={0.55}
                color="#8b9cff"
                castShadow={false}
            />

            {/* Soft warm room bounce (lamp / hallway leak) */}
            <pointLight
                position={[-2.2, 1.6, 1.5]}
                intensity={0.35}
                color="#c4a574"
                distance={8}
                decay={2}
            />

            {/* Screen practical — real-time only light on desk/bed */}
            <pointLight
                ref={screenLight}
                position={anchor.position}
                color={target === 'monitor' ? '#5dff9a' : '#6ee7ff'}
                distance={target === 'monitor' ? 3.2 : 1.8}
                decay={2}
                castShadow={false}
            />

            {/* Very soft fog for depth */}
            <fog attach="fog" args={['#0a0a12', 4.5, 14]} />
            <color attach="background" args={['#0a0a12']} />
        </>
    );
}
