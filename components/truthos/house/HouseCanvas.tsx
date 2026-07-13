'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import HouseGeometry from './HouseGeometry';
import HouseDecor from './HouseDecor';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';

export default function HouseCanvas({
    locked,
    mobile,
    peers,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
}: {
    locked: boolean;
    mobile: boolean;
    peers: HousePeer[];
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                minHeight: '100dvh',
                background: '#1a1528',
            }}
        >
            <Canvas
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none',
                }}
                shadows={!mobile}
                dpr={mobile ? [1, 1.25] : [1, 1.75]}
                performance={{ min: mobile ? 0.5 : 0.85 }}
                gl={{
                    antialias: !mobile,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: mobile ? 1.2 : 1.35,
                    stencil: false,
                    depth: true,
                }}
                camera={{ fov: mobile ? 75 : 72, near: 0.1, far: mobile ? 40 : 60, position: [0, 1.62, 5.5] }}
                onCreated={({ gl, camera }) => {
                    gl.setClearColor('#2a2440', 1);
                    // Cap pixel ratio hard on mobile GPUs
                    if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
                    camera.position.set(0, 1.62, 5.5);
                    camera.lookAt(0, 1.35, 0);
                }}
            >
                <color attach="background" args={['#2a2440']} />
                {!mobile && <fog attach="fog" args={['#2a2440', 14, 36]} />}
                {mobile && <fog attach="fog" args={['#2a2440', 10, 26]} />}

                {/* Lighting — trimmed set on mobile */}
                <hemisphereLight args={['#c8d4ff', '#3a3048', mobile ? 0.95 : 0.85]} />
                <ambientLight intensity={mobile ? 0.85 : 0.7} color="#ddd5f0" />
                <directionalLight
                    position={[5, 8, 4]}
                    intensity={mobile ? 0.9 : 1.15}
                    color="#e8ecff"
                    castShadow={!mobile}
                />
                {!mobile && (
                    <directionalLight position={[-3, 4, -2]} intensity={0.45} color="#b8a0ff" />
                )}
                <pointLight
                    position={[3.2, 1.4, 4.3]}
                    intensity={mobile ? 1.8 : 2.8}
                    color="#4ade80"
                    distance={mobile ? 7 : 10}
                    decay={2}
                />
                <pointLight
                    position={[0.2, 1.8, -0.2]}
                    intensity={mobile ? 1.4 : 1.8}
                    color="#f97316"
                    distance={6}
                    decay={2}
                />
                {!mobile && (
                    <>
                        <pointLight position={[-1.5, 1.4, -1]} intensity={1.8} color="#fbbf24" distance={9} decay={2} />
                        <pointLight position={[0, 2.2, -7]} intensity={2.2} color="#a78bfa" distance={12} decay={2} />
                        <pointLight position={[-6, 2.2, -4]} intensity={1.3} color="#f0e0c0" distance={10} decay={2} />
                        <pointLight position={[0, 2.5, 5]} intensity={1.2} color="#ffffff" distance={12} decay={2} />
                    </>
                )}
                {mobile && (
                    <pointLight position={[0, 2.4, 0]} intensity={1.1} color="#e0d4ff" distance={14} decay={2} />
                )}

                <HouseGeometry low={mobile} />
                <HouseDecor low={mobile} />
                <RemotePlayers peers={peers} mobile={mobile} />
                <FirstPersonController
                    locked={locked}
                    mobile={mobile}
                    onHotspot={onHotspot}
                    onPose={onPose}
                    onInteractRequest={onInteractRequest}
                    onMoveActivity={onMoveActivity}
                />
                {!mobile && (
                    <ContactShadows position={[0, 0.02, 0]} opacity={0.28} scale={20} blur={2.2} far={8} />
                )}
            </Canvas>
        </div>
    );
}
