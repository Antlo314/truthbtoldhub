'use client';

import { useCallback, useRef, useState } from 'react';
import type { BloomEffect } from 'postprocessing';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, PerformanceMonitor } from '@react-three/drei';
import { PropDetailProvider } from './HouseProp';
import { Bloom, EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import DayNightCycle from './DayNightCycle';
import LampGroup from './LampGroup';
import { DaylightFill } from './HouseLights';
import { BloomByDaylight, NightStars, Rain } from './WeatherFx';
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
    const bloom = useRef<BloomEffect>(null);
    /**
     * ⚠ The bloom handle MUST be attached with a callback ref, never
     * `ref={bloom}`. @react-three/postprocessing memoises an effect's args on
     * `[JSON.stringify(props)]`, and under React 19 `ref` arrives as a normal
     * prop — so an object ref serialises the live BloomEffect, walks its
     * `__r3f` instance and throws "Converting circular structure to JSON" on
     * the first re-render, killing the whole Canvas. A function is skipped by
     * JSON.stringify, so the memo key stays "{}" and the world keeps standing.
     */
    const attachBloom = useCallback((e: BloomEffect | null) => {
        bloom.current = e;
    }, []);
    /**
     * Adaptive resolution. A fixed dpr ceiling assumes every phone is the
     * same phone; PerformanceMonitor below walks this down when frames are
     * being missed and back up when there is headroom, so a weak device
     * gets a playable frame rate instead of a beautiful slideshow.
     */
    const [dpr, setDpr] = useState(mobile ? 1.1 : 1.5);
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
                dpr={dpr}
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
                    // Pixel ratio has ONE owner now — the `dpr` state above,
                    // driven by PerformanceMonitor. Setting it here too meant
                    // two writers fighting over the same value.
                    // Pure euler FPS pose — avoid lookAt residual roll (flips world / ceiling walk)
                    camera.up.set(0, 1, 0);
                    camera.position.set(-11.8, 1.12, 10.1);
                    camera.rotation.order = 'YXZ';
                    camera.rotation.set(0, Math.PI, 0);
                    // Local body only for mirror FBO
                    camera.layers.disable(1);
                }}
            >
                <PerformanceMonitor
                    onDecline={() => setDpr((d) => Math.max(mobile ? 0.65 : 1, +(d - 0.2).toFixed(2)))}
                    onIncline={() => setDpr((d) => Math.min(mobile ? 1.25 : 1.75, +(d + 0.1).toFixed(2)))}
                />
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

                {/* Stars + rain follow the world clock and weather */}
                {!mobile && <NightStars />}
                {!mobile && <Rain />}

                {/* Sun, ambient and hemisphere are owned by the day/night cycle
                    so there is one place the time of day is expressed. */}
                <DayNightCycle mobile={mobile} shadows={!mobile} />

                {/* Zone practicals — pull color from textured materials.
                    Wrapped so daylight dims them instead of them burning at noon. */}
                {/* Interior practicals now live inside HomeGeometry/HomeDecor,
                    placed for the new plan. */}

                {/* The jungle beyond the fence, and the green horizon past it */}
                <JungleGeometry low={mobile} />
                <DistantScenery low={mobile} />

                {/* Everything with practicals sits in one LampGroup, so every
                    lamp, cove strip and glow pane dims as the sun comes up —
                    the payoff the worldTime keyframes were written for. */}
                {/* Phones render every prop's procedural fallback instead of
                    its GLB — ~30 fewer model downloads, parses, materials and
                    draw calls, and the rooms stay furnished. */}
                <PropDetailProvider primitiveOnly={mobile}>
                    <LampGroup floor={0.07}>
                        <WorldDestinations low={mobile} />
                        <HomeGeometry low={mobile} />
                        <HomeInterior low={mobile} />
                        <HomeDecor low={mobile} />
                    </LampGroup>
                </PropDetailProvider>
                {/* Window bounce — rises with the sun, so noon is lit by
                    the outside instead of by lamps LampGroup is dimming. Must
                    stay OUTSIDE LampGroup or its curve gets overwritten. */}
                <DaylightFill low={mobile} />

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
                {/* Post pass — bloom lifts the emissives (torches, coves,
                    screens) into real glow; vignette seats the frame. Bloom
                    strength follows the sun so noon doesn't wash out. */}
                {!mobile && <BloomByDaylight effect={bloom} />}
                {!mobile && (
                    <EffectComposer multisampling={4}>
                        {/* Ambient occlusion first in the chain.
                            Everything indoors met its neighbour on a hard
                            unshaded seam - a single 48 m ContactShadows disc
                            cannot darken where a wall meets a floor, where a
                            sofa meets a rug, or under a counter. AO is the one
                            pass that makes a room read as built rather than
                            assembled. halfRes keeps the cost on the floor, and
                            PerformanceMonitor's dpr governor is the safety
                            valve if a weak desktop dips. */}
                        <N8AO
                            aoRadius={0.9}
                            distanceFalloff={1.0}
                            intensity={2.4}
                            quality="medium"
                            halfRes
                            depthAwareUpsampling
                            color="#0b0716"
                        />
                        <Bloom
                            ref={attachBloom}
                            intensity={0.62}
                            luminanceThreshold={0.9}
                            luminanceSmoothing={0.32}
                            mipmapBlur
                            radius={0.7}
                        />
                        <Vignette eskil={false} offset={0.22} darkness={0.45} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
