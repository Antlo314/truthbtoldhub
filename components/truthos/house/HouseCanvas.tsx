'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { PropDetailProvider } from './HouseProp';
import DayNightCycle from './DayNightCycle';
import LampGroup from './LampGroup';
import { NightStars } from './WeatherFx';
import AetherSky from './AetherSky';
import AetherBackdrop from './AetherBackdrop';
import AetherHorizon from './AetherHorizon';
import SanctumHall, { SourceLight } from './SanctumHall';
import SanctumStations from './SanctumStations';
import LairWings from './LairWings';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import LocalPlayerBody from './LocalPlayerBody';
import SkyEnvironment from './SkyEnvironment';
import PostFX from './PostFX';
import AetherShards from './AetherShards';
import { preloadVessels } from './Vessel';
import { useHouseUi } from './houseUiStore';
import { setHousePhotoMode } from './HouseMaterials';
import { profileFor, resolveTier } from './renderQuality';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';
import type { AvatarConfig } from '@/lib/game/avatar';

/**
 * One scene, spent differently per tier (renderQuality.ts). The Canvas is
 * keyed on the tier so a change rebuilds the renderer cleanly — shadow
 * maps, MSAA and the composer are creation-time decisions in three.
 */
export default function HouseCanvas({
    locked,
    mobile,
    peers,
    selfId,
    avatar,
    aura = '#a78bfa',
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
    aura?: string;
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
    /** peer id -> their live speech bubble */
    saidBy?: Record<string, string>;
    onReady?: () => void;
}) {
    const quality = useHouseUi((s) => s.quality);
    const drop = useHouseUi((s) => s.qualityDrop);
    const dropQuality = useHouseUi((s) => s.dropQuality);
    const tier = resolveTier(quality, mobile, drop);
    const profile = profileFor(tier);
    const low = tier === 'low';
    // Photo PBR scans by tier — the material library reads this when it
    // builds, so it must be decided before any child asks for materials.
    setHousePhotoMode(tier === 'low' ? 'none' : tier === 'balanced' ? 'diffuse' : 'full');

    const bg = low ? '#161022' : '#0a0814';

    /**
     * Adaptive resolution. A fixed dpr ceiling assumes every phone is the
     * same phone; PerformanceMonitor walks this down when frames are being
     * missed and back up when there is headroom. Pinned at the floor and
     * still declining, it hands the tier down a step instead.
     */
    const [dpr, setDpr] = useState(profile.dpr[1]);
    useEffect(() => {
        setDpr(profile.dpr[1]);
    }, [tier, profile.dpr]);
    const floorHits = useRef(0);
    const onDecline = useCallback(() => {
        setDpr((d) => {
            const next = Math.max(profile.dpr[0], +(d - 0.2).toFixed(2));
            if (next === d) {
                floorHits.current += 1;
                if (floorHits.current >= 2 && tier !== 'low') {
                    floorHits.current = 0;
                    dropQuality();
                }
            } else {
                floorHits.current = 0;
            }
            return next;
        });
    }, [profile.dpr, tier, dropQuality]);
    const onIncline = useCallback(() => {
        floorHits.current = 0;
        setDpr((d) => Math.min(profile.dpr[2], +(d + 0.1).toFixed(2)));
    }, [profile.dpr]);

    useEffect(() => {
        preloadVessels([avatar.build === 'fem' ? 'fem' : 'masc']);
    }, [avatar.build]);

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
                key={tier}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none',
                    cursor: mobile ? 'default' : 'crosshair',
                }}
                shadows={profile.shadows}
                dpr={dpr}
                performance={{ min: low ? 0.4 : 0.8 }}
                gl={{
                    // MSAA only when there is no composer; SMAA takes over inside it
                    antialias: !profile.post,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    // The hall is lit by the Source and the oculus, not by nine room
                    // lamps — neutral exposure keeps the plaster from blowing out
                    toneMappingExposure: low ? 1.3 : 1.0,
                    stencil: false,
                    depth: true,
                }}
                camera={{
                    fov: mobile ? 78 : 68,
                    near: 0.08,
                    far: low ? 100 : 170,
                    position: [-11.8, 1.12, 10.1],
                }}
                onCreated={({ gl, camera }) => {
                    onReady?.();
                    gl.setClearColor(bg, 1);
                    // Pure euler FPS pose — avoid lookAt residual roll (flips world / ceiling walk)
                    camera.up.set(0, 1, 0);
                    camera.position.set(-11.8, 1.12, 10.1);
                    camera.rotation.order = 'YXZ';
                    camera.rotation.set(0, Math.PI, 0);
                    // Your own body hides on layer 1 in first person
                    camera.layers.disable(1);
                }}
            >
                <PerformanceMonitor ms={250} iterations={8} onDecline={onDecline} onIncline={onIncline} />
                <color attach="background" args={[bg]} />
                {/* Fog reaches to the rim (r≈70) so the enclosure reads as layered
                    haze, not swallowed grey; the interior band (<15) is untouched
                    either way. Phones keep the short fog — there, the fog IS the wall. */}
                {!low && <fog attach="fog" args={[bg, 14, 88]} />}
                {low && <fog attach="fog" args={['#1a1428', 10, 52]} />}

                <AetherSky low={low} />
                {profile.env && (
                    <SkyEnvironment resolution={profile.envResolution} every={profile.envEvery} intensity={0.35} />
                )}
                {!low && <NightStars />}

                {/* Sun, ambient and hemisphere are owned by the day/night cycle
                    so there is one place the time of day is expressed. */}
                <DayNightCycle mobile={low} shadows={profile.shadows} shadowMap={profile.shadowMap} />

                {/* What the glass looks out on: the cloud sea and the far islets */}
                <AetherBackdrop low={low} profile={profile} />
                {!low && <AetherHorizon low />}

                {/* Phones keep procedural solids (no GLB fetch). Desktop
                    loads the Kenney meshes — HouseProp never draws both. */}
                <PropDetailProvider primitiveOnly={!profile.props}>
                    <LampGroup floor={0.22}>
                        <SanctumHall low={low} profile={profile} />
                        <SanctumStations low={low} />
                        <LairWings low={low} profile={profile} />
                    </LampGroup>
                    {/* The Source never dims — it is the hall's light, day and night */}
                    <SourceLight low={low} />
                    <AetherShards profile={profile} />
                </PropDetailProvider>

                <RemotePlayers peers={peers} selfId={selfId} mobile={low} rigged={profile.riggedVessels} saidBy={saidBy} />
                <LocalPlayerBody avatar={avatar} aura={aura} rigged={profile.riggedVessels} shadows={profile.shadows} />
                <FirstPersonController
                    locked={locked}
                    mobile={mobile}
                    onHotspot={onHotspot}
                    onPose={onPose}
                    onInteractRequest={onInteractRequest}
                    onMoveActivity={onMoveActivity}
                />
                <PostFX profile={profile} />
            </Canvas>
        </div>
    );
}
