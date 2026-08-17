'use client';

import { useCallback, useRef, useState } from 'react';
import type { BloomEffect } from 'postprocessing';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { PropDetailProvider } from './HouseProp';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import DayNightCycle from './DayNightCycle';
import LampGroup from './LampGroup';
import { DaylightFill } from './HouseLights';
import { BloomByDaylight, NightStars } from './WeatherFx';
import AetherSky from './AetherSky';
import AetherShelf from './AetherShelf';
import AetherHorizon from './AetherHorizon';
import WorldDestinations from './WorldDestinations';
import * as THREE from 'three';
import HomeGeometry from './HomeGeometry';
import HomeDecor from './HomeDecor';
import HomeInterior from './HomeInterior';
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
    saidBy,
    onReady,
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
    /** peer id -> their live speech bubble */
    saidBy?: Record<string, string>;
    onReady?: () => void;
}) {
    const bg = mobile ? '#161022' : '#0a0814';
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
                    toneMappingExposure: mobile ? 1.48 : 1.22,
                    stencil: false,
                    depth: true,
                }}
                camera={{
                    fov: mobile ? 78 : 68,
                    near: 0.08,
                    far: mobile ? 100 : 160,
                    position: [-11.8, 1.12, 10.1],
                }}
                onCreated={({ gl, camera }) => {
                    onReady?.();
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
                {!mobile && <fog attach="fog" args={[bg, 14, 88]} />}
                {mobile && <fog attach="fog" args={['#1a1428', 10, 52]} />}

                <AetherSky low={mobile} />
                {!mobile && <NightStars />}

                {/* Sun, ambient and hemisphere are owned by the day/night cycle
                    so there is one place the time of day is expressed. */}
                <DayNightCycle mobile={mobile} shadows={!mobile} />

                {/* Zone practicals — pull color from textured materials.
                    Wrapped so daylight dims them instead of them burning at noon. */}
                {/* Interior practicals now live inside HomeGeometry/HomeDecor,
                    placed for the new plan. */}

                {/* One exterior: the Aether Shelf. JungleGeometry used to
                    mount here too — trees, ferns and grove kits punching
                    through the hut. The shelf is the world; the house is
                    the house. */}
                <AetherShelf low={mobile} />
                {!mobile && <AetherHorizon low />}

                {/* Phones keep procedural solids (no GLB fetch). Desktop
                    loads the Kenney meshes — HouseProp never draws both. */}
                <PropDetailProvider primitiveOnly={mobile}>
                    <LampGroup floor={0.22}>
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
                {/* Atmosphere + extra post skipped — they were eating first-load frames */}
                <RemotePlayers peers={peers} selfId={selfId} mobile={mobile} saidBy={saidBy} />
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
                {!mobile && <BloomByDaylight effect={bloom} night={0.48} day={0.12} />}
                {!mobile && (
                    <EffectComposer multisampling={0}>
                        <DepthOfField
                            worldFocusDistance={7.5}
                            worldFocusRange={16}
                            bokehScale={2.35}
                            resolutionScale={0.6}
                        />
                        <Bloom
                            ref={attachBloom}
                            intensity={0.32}
                            luminanceThreshold={1.05}
                            luminanceSmoothing={0.38}
                            mipmapBlur
                            radius={0.65}
                        />
                        <Vignette eskil={false} offset={0.18} darkness={0.38} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );
}
