'use client';

import { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Stars } from '@react-three/drei';
import DayNightCycle from './DayNightCycle';
import JungleGeometry from './JungleGeometry';
import WorldDestinations from './WorldDestinations';
import DistantScenery from './DistantScenery';
import * as THREE from 'three';
import HomeGeometry from './HomeGeometry';
import HomeDecor from './HomeDecor';
import HomeInterior from './HomeInterior';
import HouseAtmosphere from './HouseAtmosphere';
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
                dpr={mobile ? [1, 1.2] : [1, 1.75]}
                performance={{ min: mobile ? 0.4 : 0.8 }}
                gl={{
                    antialias: !mobile,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    // Mobile was too dark — push exposure for readability
                    toneMappingExposure: mobile ? 1.72 : 1.38,
                    stencil: false,
                    depth: true,
                }}
                camera={{
                    fov: mobile ? 78 : 68,
                    near: 0.08,
                    far: mobile ? 340 : 620,
                    position: [-11.8, 1.12, 10.1],
                }}
                onCreated={({ gl, camera }) => {
                    gl.setClearColor(bg, 1);
                    if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
                    // Pure euler FPS pose — avoid lookAt residual roll (flips world / ceiling walk)
                    camera.up.set(0, 1, 0);
                    camera.position.set(-11.8, 1.12, 10.1);
                    camera.rotation.order = 'YXZ';
                    camera.rotation.set(0, Math.PI, 0);
                    // Local body only for mirror FBO
                    camera.layers.disable(1);
                }}
            >
                <color attach="background" args={[bg]} />
                {/* Fog reaches to the green wall's outer ring (r≈70) so the
                    enclosure reads as layered green, not swallowed grey; the
                    interior band (<15) is untouched either way. Mobile keeps
                    the short fog — there, the fog IS the wall. */}
                {!mobile && <fog attach="fog" args={[bg, 20, 85]} />}
                {mobile && <fog attach="fog" args={['#2a2438', 16, 48]} />}

                {/* Soft IBL for material depth (free preset, no paid assets) */}
                {!mobile && <Environment preset="night" environmentIntensity={0.35} />}
                {mobile && <Environment preset="apartment" environmentIntensity={0.55} />}

                {!mobile && (
                    <Stars radius={40} depth={28} count={900} factor={2.2} saturation={0.2} fade speed={0.3} />
                )}

                {/* Sun, ambient and hemisphere are owned by the day/night cycle
                    so there is one place the time of day is expressed. */}
                <DayNightCycle mobile={mobile} shadows={!mobile} />

                {/* Zone practicals — pull color from textured materials.
                    Wrapped so daylight dims them instead of them burning at noon. */}
                {/* Interior practicals now live inside HomeGeometry/HomeDecor,
                    placed for the new plan. */}

                {/* The jungle beyond the fence, and the green horizon past it */}
                <JungleGeometry low={mobile} />
                <WorldDestinations low={mobile} />
                <DistantScenery low={mobile} />

                <HomeGeometry low={mobile} />
                <HomeInterior low={mobile} />
                <HomeDecor low={mobile} />
                {/* Dust motes · fireflies · moon shafts — desktop only */}
                {!mobile && <HouseAtmosphere />}
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
                    <ContactShadows position={[0, 0.02, 0]} opacity={0.3} scale={48} blur={2.8} far={18} />
                )}
            </Canvas>
        </div>
    );
}
