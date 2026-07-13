'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTarget } from './types';
import { BedroomSceneRoot } from './BedroomScene';

/**
 * R3F canvas for Truth.OS room.
 * Keep dpr capped; no post stack until lightmaps land.
 */
export default function ImmersiveCanvas({
    target,
    interactive,
    onEnterDevice,
}: {
    target: DeviceTarget;
    interactive: boolean;
    onEnterDevice: () => void;
}) {
    return (
        <Canvas
            className="absolute inset-0"
            shadows
            dpr={[1, 1.5]}
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.0,
            }}
            camera={{ fov: 45, near: 0.05, far: 40, position: [0.2, 1.45, 2.4] }}
            onCreated={({ gl }) => {
                gl.setClearColor('#0a0a12');
            }}
        >
            <BedroomSceneRoot
                target={target}
                interactive={interactive}
                onEnterDevice={onEnterDevice}
            />
        </Canvas>
    );
}
