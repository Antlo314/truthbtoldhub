'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import HutScene from './scene/HutScene';
import type { AvatarConfig } from '@/lib/game/avatar';
import PlayerController from './scene/PlayerController';
import { StationMarkers } from './scene/Stations';
import HutRoom from './scene/HutRoom';
import { ContactShadows } from '@react-three/drei';
import { useState, useCallback } from 'react';

/**
 * Isolated so dynamic(ssr:false) never pulls three into the server bundle.
 */
export default function HutCanvas({
    avatar,
    onPlayerPosition,
}: {
    avatar: AvatarConfig;
    onPlayerPosition?: (p: THREE.Vector3) => void;
}) {
    return (
        <Canvas
            className="absolute inset-0"
            shadows
            dpr={[1, 1.75]}
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
            }}
            camera={{ position: [0, 3.5, -8], fov: 48, near: 0.1, far: 60 }}
            onCreated={({ gl }) => {
                gl.setClearColor('#0a0c14');
            }}
        >
            <Scene avatar={avatar} onPlayerPosition={onPlayerPosition} />
        </Canvas>
    );
}

function Scene({
    avatar,
    onPlayerPosition,
}: {
    avatar: AvatarConfig;
    onPlayerPosition?: (p: THREE.Vector3) => void;
}) {
    const [playerPos, setPlayerPos] = useState<THREE.Vector3 | null>(null);
    const onPos = useCallback(
        (p: THREE.Vector3) => {
            setPlayerPos(p);
            onPlayerPosition?.(p);
        },
        [onPlayerPosition],
    );

    return (
        <>
            <color attach="background" args={['#0a0c14']} />
            <fog attach="fog" args={['#0c1018', 12, 30]} />

            <ambientLight intensity={0.32} color="#c4b5a0" />
            <directionalLight
                position={[5, 11, 3]}
                intensity={1.2}
                color="#fff1d6"
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <pointLight position={[0, 3.6, 5.2]} intensity={5} distance={14} color="#fbbf24" />
            <pointLight position={[0, 2.4, -4]} intensity={2.2} distance={10} color="#22c55e" />
            <hemisphereLight args={['#4a5568', '#1a120c', 0.4]} />

            <HutRoom />
            <StationMarkers playerPos={playerPos} />
            <PlayerController avatar={avatar} onPosition={onPos} />
            <ContactShadows position={[0, 0.015, 0]} opacity={0.4} scale={22} blur={2.2} far={9} />
        </>
    );
}
