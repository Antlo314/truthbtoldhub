'use client';

import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { ContactShadows, SoftShadows } from '@react-three/drei';
import HutRoom from './HutRoom';
import PlayerController from './PlayerController';
import { StationMarkers } from './Stations';
import type { AvatarConfig } from '@/lib/game/avatar';

export default function HutScene({ avatar }: { avatar: AvatarConfig }) {
    const [playerPos, setPlayerPos] = useState<THREE.Vector3 | null>(null);
    const onPos = useCallback((p: THREE.Vector3) => setPlayerPos(p), []);

    return (
        <>
            <color attach="background" args={['#0a0c14']} />
            <fog attach="fog" args={['#0c1018', 10, 28]} />

            <ambientLight intensity={0.35} color="#c4b5a0" />
            <directionalLight
                position={[4, 10, 2]}
                intensity={1.15}
                color="#fff1d6"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-far={30}
                shadow-camera-left={-12}
                shadow-camera-right={12}
                shadow-camera-top={12}
                shadow-camera-bottom={-12}
            />
            <pointLight position={[0, 3.5, 5]} intensity={4} distance={12} color="#fbbf24" />
            <pointLight position={[0, 2.5, -4]} intensity={2.5} distance={10} color="#22c55e" />
            <hemisphereLight args={['#4a5568', '#1a120c', 0.35]} />

            <SoftShadows size={12} samples={8} focus={0.5} />

            <HutRoom />
            <StationMarkers playerPos={playerPos} />
            <PlayerController avatar={avatar} onPosition={onPos} />

            <ContactShadows
                position={[0, 0.01, 0]}
                opacity={0.45}
                scale={20}
                blur={2.5}
                far={8}
            />
        </>
    );
}
