'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarConfig } from '@/lib/game/avatar';
import PlayerController from './scene/PlayerController';
import { StationMarkers } from './scene/Stations';
import HutRoom from './scene/HutRoom';
import { ContactShadows } from '@react-three/drei';
import { useState, useCallback, Suspense, useEffect } from 'react';

/**
 * Truth's Hut — textured structure + cinematic lighting.
 * Mobile: lower dpr, no soft shadows, fewer samples.
 */
export default function HutCanvas({
    avatar,
    onPlayerPosition,
}: {
    avatar: AvatarConfig;
    onPlayerPosition?: (p: THREE.Vector3) => void;
}) {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const compute = () => {
            const narrow = window.matchMedia('(max-width: 768px)').matches;
            const coarse = window.matchMedia('(pointer: coarse)').matches;
            setMobile(narrow || (coarse && navigator.maxTouchPoints > 0));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    return (
        <Canvas
            className="absolute inset-0"
            shadows={!mobile}
            dpr={mobile ? [1, 1.35] : [1, 1.85]}
            gl={{
                antialias: !mobile,
                powerPreference: mobile ? 'low-power' : 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: mobile ? 1.12 : 1.22,
            }}
            camera={{ position: [0, 3.2, -7.5], fov: mobile ? 55 : 50, near: 0.1, far: 55 }}
            onCreated={({ gl }) => {
                gl.setClearColor('#0a0c14');
                if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
            }}
        >
            <Scene avatar={avatar} onPlayerPosition={onPlayerPosition} mobile={mobile} />
        </Canvas>
    );
}

function Scene({
    avatar,
    onPlayerPosition,
    mobile,
}: {
    avatar: AvatarConfig;
    onPlayerPosition?: (p: THREE.Vector3) => void;
    mobile: boolean;
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
            <fog attach="fog" args={['#0e121c', mobile ? 10 : 14, mobile ? 26 : 32]} />

            {/* Ambient volume — warm sanctuary */}
            <ambientLight intensity={mobile ? 0.28 : 0.22} color="#c4b5a0" />
            <hemisphereLight args={['#5a6578', '#1a120c', mobile ? 0.45 : 0.38]} />

            {/* Key sun-shaft from high window angle */}
            <directionalLight
                position={[6, 12, 4]}
                intensity={mobile ? 0.95 : 1.25}
                color="#fff1d6"
                castShadow={!mobile}
                shadow-mapSize={mobile ? [512, 512] : [1024, 1024]}
                shadow-camera-far={35}
                shadow-camera-left={-14}
                shadow-camera-right={14}
                shadow-camera-top={14}
                shadow-camera-bottom={-14}
                shadow-bias={-0.0002}
            />
            {/* Cool fill opposite */}
            {!mobile && (
                <directionalLight position={[-5, 6, -4]} intensity={0.35} color="#8b9dc4" />
            )}

            {/* Ceiling gold pool over Truth dais */}
            <pointLight position={[0, 3.8, 5.2]} intensity={mobile ? 4 : 6} distance={14} color="#fbbf24" decay={2} />
            {/* Wayfinder green accent */}
            <pointLight position={[0, 2.6, -4.2]} intensity={mobile ? 2 : 3.2} distance={10} color="#22c55e" decay={2} />
            {/* Sanctum violet */}
            <pointLight position={[0, 2.4, -6.5]} intensity={mobile ? 2.2 : 3.5} distance={9} color="#a78bfa" decay={2} />
            {/* Center overhead */}
            {!mobile && (
                <spotLight
                    position={[0, 4.0, 0.5]}
                    angle={0.9}
                    penumbra={0.55}
                    intensity={0.7}
                    color="#e8dcc8"
                    castShadow
                />
            )}

            <HutRoom low={mobile} />
            <StationMarkers playerPos={playerPos} />
            <Suspense fallback={null}>
                <PlayerController avatar={avatar} onPosition={onPos} />
            </Suspense>
            {!mobile && (
                <ContactShadows position={[0, 0.015, 0]} opacity={0.42} scale={22} blur={2.4} far={10} />
            )}
        </>
    );
}
