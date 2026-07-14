'use client';

import { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import HouseGeometry from './HouseGeometry';
import HouseDecor from './HouseDecor';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import LocalPlayerBody, { type PlayerPose } from './LocalPlayerBody';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';
import type { AvatarConfig } from '@/lib/game/avatar';

/**
 * PC: high fidelity skins + environment light
 * Mobile: lower res maps, fewer lights — same layout
 */
export default function HouseCanvas({
    locked,
    mobile,
    peers,
    selfId,
    avatar,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
}: {
    locked: boolean;
    mobile: boolean;
    peers: HousePeer[];
    selfId?: string;
    avatar: AvatarConfig;
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
}) {
    const bg = mobile ? '#1c1630' : '#120e1c';
    const [localPose, setLocalPose] = useState<PlayerPose | null>(null);
    const poseCb = useRef(onPose);
    poseCb.current = onPose;

    const handlePose = useCallback((p: PlayerPose) => {
        setLocalPose(p);
        poseCb.current(p);
    }, []);

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
                dpr={mobile ? [1, 1.25] : [1, 2]}
                performance={{ min: mobile ? 0.4 : 0.8 }}
                gl={{
                    antialias: !mobile,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: mobile ? 1.22 : 1.38,
                    stencil: false,
                    depth: true,
                }}
                camera={{
                    fov: mobile ? 78 : 68,
                    near: 0.08,
                    far: mobile ? 48 : 90,
                    position: [4.55, 1.62, 6.35],
                }}
                onCreated={({ gl, camera }) => {
                    gl.setClearColor(bg, 1);
                    if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
                    // Ensure camera up direction is correct
                    camera.up.set(0, 1, 0);
                    camera.position.set(4.55, 1.62, 6.35);
                    camera.lookAt(4.55, 1.35, 8.2);
                    // Local body only for mirror FBO
                    camera.layers.disable(1);
                }}
            >
                <color attach="background" args={[bg]} />
                {!mobile && <fog attach="fog" args={[bg, 12, 40]} />}
                {mobile && <fog attach="fog" args={[bg, 8, 24]} />}

                {/* Soft IBL for material depth (free preset, no paid assets) */}
                {!mobile && <Environment preset="night" environmentIntensity={0.35} />}
                {mobile && <Environment preset="night" environmentIntensity={0.22} />}

                {!mobile && (
                    <Stars radius={40} depth={28} count={900} factor={2.2} saturation={0.2} fade speed={0.3} />
                )}

                <hemisphereLight args={[mobile ? '#b8c4ff' : '#c8d4ff', '#2a2038', mobile ? 0.85 : 0.5]} />
                <ambientLight intensity={mobile ? 0.7 : 0.38} color="#e0d8f0" />

                <directionalLight
                    position={[6, 9, 4]}
                    intensity={mobile ? 1.0 : 1.45}
                    color="#eef2ff"
                    castShadow={!mobile}
                    shadow-mapSize-width={mobile ? 512 : 1024}
                    shadow-mapSize-height={mobile ? 512 : 1024}
                />
                {!mobile && (
                    <>
                        <directionalLight position={[-5, 5, -3]} intensity={0.4} color="#9b7cff" />
                        <directionalLight position={[0, 3, 8]} intensity={0.3} color="#ffc9a0" />
                    </>
                )}

                {/* Zone practicals — pull color from textured materials */}
                <pointLight position={[3.55, 1.4, 4.9]} intensity={mobile ? 2.0 : 3.1} color="#4ade80" distance={mobile ? 7 : 11} decay={2} />
                <pointLight position={[0, 1.75, -4.2]} intensity={mobile ? 1.65 : 2.4} color="#22d3ee" distance={8} decay={2} />
                <pointLight position={[3.15, 1.7, 8.5]} intensity={mobile ? 1.2 : 1.85} color="#c8dcf0" distance={6} decay={2} />
                {!mobile && (
                    <>
                        <pointLight position={[-2.5, 1.45, 0.2]} intensity={1.55} color="#fbbf24" distance={8} decay={2} />
                        <pointLight position={[0, 2.35, -8.2]} intensity={2.3} color="#22c55e" distance={12} decay={2} />
                        <pointLight position={[-6.5, 2.0, -4.4]} intensity={1.4} color="#e8d5b0" distance={10} decay={2} />
                        <pointLight position={[0, 2.5, 6.2]} intensity={1.05} color="#ffffff" distance={11} decay={2} />
                        <pointLight position={[8.2, 1.9, 1.25]} intensity={1.6} color="#c084fc" distance={9} decay={2} />
                        <pointLight position={[-7.4, 1.25, 3.6]} intensity={1.55} color="#ff8a3d" distance={7} decay={2} />
                        <pointLight position={[7.6, 1.55, -7.0]} intensity={1.35} color="#fb923c" distance={6} decay={2} />
                        <pointLight position={[-5.5, 1.8, 2.05]} intensity={1.05} color="#38bdf8" distance={5} decay={2} />
                        <pointLight position={[-9.2, 1.6, 0.15]} intensity={0.85} color="#e8d5b0" distance={5} decay={2} />
                        {
                            if (document.pointerLockElement === el) {
                              // Ensure camera up direction remains correct when pointer lock changes
                              camera.up.set(0, 1, 0);
                            }
                            // Existing logic continues
                            const dx = e.movementX || 0;
                            const dy = e.movementY || 0;
                            if (dx === 0 && dy === 0) return;
                             yaw.current -= dx * sens;
                             pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens, -PITCH_MAX, PITCH_MAX);
                             emit('look');
                            return;
                        }
                        <spotLight
                            position={[0.2, 2.9, -1.2]}
                            angle={0.7}
                            penumbra={0.65}
                            intensity={0.6}
                            color="#c4b5fd"
                            castShadow
                        />
                    </>
                )}
                {mobile && (
                    <pointLight position={[0, 2.5, 0]} intensity={1.25} color="#e0d4ff" distance={14} decay={2} />
                )}

                <HouseGeometry low={mobile} cinematic={!mobile} />
                <HouseDecor low={mobile} />
                <RemotePlayers peers={peers} selfId={selfId} mobile={mobile} />
                {/* Vessel body — mirror-only layer */}
                <LocalPlayerBody avatar={avatar} pose={localPose} />
                <FirstPersonController
                    locked={locked}
                    mobile={mobile}
                    onHotspot={onHotspot}
                    onPose={handlePose}
                    onInteractRequest={onInteractRequest}
                    onMoveActivity={onMoveActivity}
                />
                {!mobile && (
                    <ContactShadows position={[0, 0.02, 0]} opacity={0.34} scale={32} blur={2.8} far={14} />
                )}
            </Canvas>
        </div>
    );
}
