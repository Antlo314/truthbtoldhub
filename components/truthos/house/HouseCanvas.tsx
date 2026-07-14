'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import HouseGeometry from './HouseGeometry';
import HouseDecor from './HouseDecor';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';

/**
 * Two cinematic paths:
 *  PC  — high fidelity, film grain fog, shadows, wider world
 *  Mobile — punchier contrast, fewer lights, tighter draw distance
 */
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
    const bg = mobile ? '#1c1630' : '#120e1c';

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                minHeight: '100dvh',
                background: bg,
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
                    cursor: mobile ? 'default' : 'crosshair',
                }}
                shadows={!mobile}
                dpr={mobile ? [1, 1.35] : [1, 2]}
                performance={{ min: mobile ? 0.45 : 0.8 }}
                gl={{
                    antialias: !mobile,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: mobile ? 1.28 : 1.42,
                    stencil: false,
                    depth: true,
                }}
                // PC: cinematic FOV · Mobile: wider for presence on small screens
                camera={{
                    fov: mobile ? 78 : 68,
                    near: 0.08,
                    far: mobile ? 36 : 70,
                    position: [0, 1.62, 4.0],
                }}
                onCreated={({ gl, camera }) => {
                    gl.setClearColor(bg, 1);
                    if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
                    camera.position.set(0, 1.62, 4.0);
                    camera.lookAt(0, 1.3, 0);
                }}
            >
                <color attach="background" args={[bg]} />
                {!mobile && <fog attach="fog" args={[bg, 11, 38]} />}
                {mobile && <fog attach="fog" args={[bg, 8, 24]} />}

                {/* PC: night sky peek through windows */}
                {!mobile && (
                    <Stars radius={40} depth={28} count={900} factor={2.2} saturation={0.2} fade speed={0.3} />
                )}

                <hemisphereLight args={[mobile ? '#b8c4ff' : '#a8b8f0', '#2a2038', mobile ? 0.9 : 0.55]} />
                <ambientLight intensity={mobile ? 0.75 : 0.42} color="#d8d0ea" />

                {/* Key light — cinematic rim */}
                <directionalLight
                    position={[6, 9, 4]}
                    intensity={mobile ? 0.95 : 1.35}
                    color="#e8ecff"
                    castShadow={!mobile}
                    shadow-mapSize-width={mobile ? 512 : 1024}
                    shadow-mapSize-height={mobile ? 512 : 1024}
                />
                {!mobile && (
                    <>
                        <directionalLight position={[-5, 5, -3]} intensity={0.35} color="#9b7cff" />
                        <directionalLight position={[0, 3, 8]} intensity={0.25} color="#ffc9a0" />
                    </>
                )}

                {/* Practicals — zone heroes (desk, media, hearth, map, cinema, forge) */}
                <pointLight
                    position={[3.55, 1.45, 4.85]}
                    intensity={mobile ? 2.1 : 3.4}
                    color="#4ade80"
                    distance={mobile ? 7 : 11}
                    decay={2}
                />
                <pointLight
                    position={[0, 1.7, -3.6]}
                    intensity={mobile ? 1.7 : 2.4}
                    color="#22d3ee"
                    distance={8}
                    decay={2}
                />
                {!mobile && (
                    <>
                        <pointLight position={[-2.3, 1.5, -0.4]} intensity={1.8} color="#fbbf24" distance={9} decay={2} />
                        <pointLight position={[0, 2.35, -8.2]} intensity={2.5} color="#22c55e" distance={12} decay={2} />
                        <pointLight position={[-6.5, 2.0, -4.4]} intensity={1.5} color="#e8d5b0" distance={10} decay={2} />
                        <pointLight position={[0, 2.55, 6]} intensity={1.1} color="#ffffff" distance={11} decay={2} />
                        <pointLight position={[8.2, 1.9, 1.25]} intensity={1.7} color="#c084fc" distance={9} decay={2} />
                        <pointLight position={[-7.4, 1.3, 3.7]} intensity={1.6} color="#ff8a3d" distance={7} decay={2} />
                        <pointLight position={[7.7, 1.5, -6.8]} intensity={1.3} color="#fb923c" distance={6} decay={2} />
                        <spotLight
                            position={[0.3, 2.9, -1.5]}
                            angle={0.75}
                            penumbra={0.65}
                            intensity={0.6}
                            color="#c4b5fd"
                            castShadow
                        />
                    </>
                )}
                {mobile && (
                    <pointLight position={[0, 2.5, 0]} intensity={1.3} color="#e0d4ff" distance={14} decay={2} />
                )}

                <HouseGeometry low={mobile} cinematic={!mobile} />
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
                    <ContactShadows position={[0, 0.02, 0]} opacity={0.32} scale={22} blur={2.4} far={10} />
                )}
            </Canvas>
        </div>
    );
}
