'use client';

/**
 * The plain, drawn. One Canvas keyed on the quality tier (shadow maps,
 * MSAA and the composer are creation-time decisions in three). The sky
 * dome, stars, sun and moon ride with the camera so a kilometre of
 * walking never reaches the edge of the sky; the cloud sea sits below the
 * rim and the far islets hang beyond it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Cloud, Clouds, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import DayNightCycle, { getSky } from '@/components/truthos/house/DayNightCycle';
import AetherSky from '@/components/truthos/house/AetherSky';
import SkyEnvironment from '@/components/truthos/house/SkyEnvironment';
import { NightStars } from '@/components/truthos/house/WeatherFx';
import PostFX from '@/components/truthos/house/PostFX';
import RemotePlayers from '@/components/truthos/house/RemotePlayers';
import LocalPlayerBody from '@/components/truthos/house/LocalPlayerBody';
import { preloadVessels } from '@/components/truthos/house/Vessel';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { setHousePhotoMode } from '@/components/truthos/house/HouseMaterials';
import { profileFor, resolveTier } from '@/components/truthos/house/renderQuality';
import { seededRng } from '@/components/truthos/house/houseSkins';
import type { HousePeer } from '@/lib/truthos/housePresence';
import type { AvatarConfig } from '@/lib/game/avatar';
import { ISLAND_C, ISLAND_R } from '@/lib/world/terrain';
import { groundAt, type NpcId, type PickupKind } from '@/lib/world/plain';
import Terrain from './Terrain';
import Grass from './Grass';
import Water from './Water';
import Props, { preloadProps } from './Props';
import Creatures, { preloadCreatures } from './Creatures';
import Npcs, { type NpcMarker } from './Npcs';
import LairExterior from './LairExterior';
import { Fixtures, Pickups, preloadFixtures } from './PlainFixtures';
import PlainController, { type PlainHotspot } from './PlainController';

/** Sky dome, stars, sun and moon follow the camera; scaled up to fit the far plane */
function SkyRig({ low }: { low: boolean }) {
    const g = useRef<THREE.Group>(null);
    const { camera } = useThree();
    useFrame(() => {
        if (g.current) g.current.position.copy(camera.position);
    });
    return (
        <group ref={g} scale={low ? 4.6 : 4.2}>
            <AetherSky low={low} />
            {!low && <NightStars />}
        </group>
    );
}

/** The cloud sea the island floats over, and the islets beyond the rim */
function CloudSea({ low, volumetric }: { low: boolean; volumetric: boolean }) {
    const a = useRef<THREE.Mesh>(null);
    const matA = useRef<THREE.MeshStandardMaterial>(null);
    const rnd = useMemo(() => seededRng(0x5ea), []);
    const puffs = useMemo(
        () =>
            Array.from({ length: 22 }, (_, i) => {
                const ang = (i / 22) * Math.PI * 2 + rnd() * 0.25;
                const r = ISLAND_R + 60 + rnd() * 120;
                return { pos: [ISLAND_C.x + Math.cos(ang) * r, -42 + rnd() * 14, ISLAND_C.z + Math.sin(ang) * r] as [number, number, number], seed: i * 13 + 1, vol: 40 + rnd() * 30, speed: 0.04 + rnd() * 0.04 };
            }),
        [rnd],
    );
    const isles = useMemo(
        () =>
            Array.from({ length: low ? 6 : 14 }, () => {
                const ang = rnd() * Math.PI * 2;
                const r = ISLAND_R + 260 + rnd() * 420;
                return { x: ISLAND_C.x + Math.cos(ang) * r, z: ISLAND_C.z + Math.sin(ang) * r, y: -30 + rnd() * 50, s: 30 + rnd() * 60 };
            }),
        [rnd, low],
    );
    useFrame((_, dt) => {
        if (a.current) a.current.rotation.z += dt * 0.004;
        if (matA.current) {
            const s = getSky();
            matA.current.color.setRGB(s.fogColor[0] / 255, s.fogColor[1] / 255, s.fogColor[2] / 255).multiplyScalar(0.92);
        }
    });
    return (
        <group>
            <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]} position={[ISLAND_C.x, -58, ISLAND_C.z]}>
                <circleGeometry args={[2600, 48]} />
                <meshStandardMaterial ref={matA} color="#b9aec8" roughness={1} fog={false} />
            </mesh>
            {/* the island's underside — basalt falling away into the sea */}
            <mesh position={[ISLAND_C.x, -62, ISLAND_C.z]}>
                <cylinderGeometry args={[ISLAND_R - 30, ISLAND_R * 0.45, 110, 40, 1, true]} />
                <meshStandardMaterial color="#1b1624" roughness={0.95} side={THREE.DoubleSide} />
            </mesh>
            {volumetric && (
                <Clouds material={THREE.MeshLambertMaterial} texture="/textures/cloud_puff.png" limit={400} range={1400}>
                    {puffs.map((p, i) => (
                        <Cloud key={i} seed={p.seed} position={p.pos} segments={12} bounds={[60, 10, 60]} volume={p.vol} concentrate="inside" color="#e2dbea" opacity={0.6} speed={p.speed} growth={6} fade={60} />
                    ))}
                </Clouds>
            )}
            {isles.map((p, i) => (
                <mesh key={i} position={[p.x, p.y, p.z]}>
                    <coneGeometry args={[p.s, p.s * 0.9, 7]} />
                    <meshStandardMaterial color="#201a2c" roughness={0.95} />
                </mesh>
            ))}
        </group>
    );
}

export default function PlainCanvas({
    locked,
    mobile,
    peers,
    selfId,
    avatar,
    aura = '#a78bfa',
    saidBy,
    markers,
    taken,
    wanted,
    findHotspot,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
    onTick,
    onReady,
}: {
    locked: boolean;
    mobile: boolean;
    peers: HousePeer[];
    selfId?: string;
    avatar: AvatarConfig;
    aura?: string;
    saidBy?: Record<string, string>;
    markers: Partial<Record<NpcId, NpcMarker>>;
    taken: Set<string>;
    wanted: Set<PickupKind>;
    findHotspot: (x: number, z: number) => PlainHotspot | null;
    onHotspot: (h: PlainHotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
    onTick?: (x: number, z: number, speed: number, dt: number) => void;
    onReady?: () => void;
}) {
    const quality = useHouseUi((s) => s.quality);
    const drop = useHouseUi((s) => s.qualityDrop);
    const dropQuality = useHouseUi((s) => s.dropQuality);
    const tier = resolveTier(quality, mobile, drop);
    const profile = profileFor(tier);
    const low = tier === 'low';
    setHousePhotoMode(tier === 'low' ? 'none' : tier === 'balanced' ? 'diffuse' : 'full');

    const bg = '#9fb4d8';
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
            } else floorHits.current = 0;
            return next;
        });
    }, [profile.dpr, tier, dropQuality]);
    const onIncline = useCallback(() => {
        floorHits.current = 0;
        setDpr((d) => Math.min(profile.dpr[2], +(d + 0.1).toFixed(2)));
    }, [profile.dpr]);

    useEffect(() => {
        preloadVessels(['masc', 'fem']);
        preloadProps();
        preloadCreatures();
        preloadFixtures();
    }, []);

    const grassRadius = tier === 'ultra' ? 140 : tier === 'high' ? 110 : tier === 'balanced' ? 80 : 46;
    const grassPerM2 = tier === 'ultra' ? 9 : tier === 'high' ? 7 : tier === 'balanced' ? 5 : 3;

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: '100dvh', background: bg }}>
            <Canvas
                key={tier}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: mobile ? 'default' : 'crosshair' }}
                shadows={profile.shadows}
                dpr={dpr}
                performance={{ min: low ? 0.4 : 0.8 }}
                gl={{
                    antialias: !profile.post,
                    alpha: false,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: low ? 1.15 : 0.95,
                    stencil: false,
                    depth: true,
                    logarithmicDepthBuffer: false,
                }}
                camera={{ fov: mobile ? 76 : 66, near: 0.1, far: low ? 560 : 1000, position: [0, 1.62, 66] }}
                onCreated={({ gl, camera, scene }) => {
                    onReady?.();
                    if (process.env.NODE_ENV !== 'production') {
                        (window as unknown as { __plain?: unknown }).__plain = { gl, camera, scene, THREE };
                    }
                    gl.setClearColor(bg, 1);
                    camera.up.set(0, 1, 0);
                    camera.rotation.order = 'YXZ';
                    camera.rotation.set(0, Math.PI, 0);
                    camera.layers.disable(1);
                }}
            >
                <PerformanceMonitor ms={250} iterations={8} onDecline={onDecline} onIncline={onIncline} />
                <color attach="background" args={[bg]} />
                <fog attach="fog" args={[bg, 90, low ? 420 : 640]} />

                <SkyRig low={low} />
                {profile.env && <SkyEnvironment resolution={profile.envResolution} every={profile.envEvery} intensity={0.45} />}
                {/* the sky keyframes were written for a clearing; out here the fog
                    reaches most of a kilometre and the shadow box rides 60 m with you */}
                <DayNightCycle mobile={low} shadows={profile.shadows} shadowMap={profile.shadowMap} fogScale={low ? [5.5, 4.6] : [8, 7]} shadowHalf={low ? 40 : 64} />
                {low && <hemisphereLight args={['#dfe8ff', '#4a5a2a', 0.55]} />}

                <CloudSea low={low} volumetric={profile.clouds} />
                <Terrain low={low} shadows={profile.shadows} />
                <Grass low={low} radius={grassRadius} perM2={grassPerM2} />
                <Water />
                <Props low={low} shadows={profile.shadows} />
                <LairExterior low={low} shadows={profile.shadows} />
                <Fixtures low={low} shadows={profile.shadows} />
                <Pickups taken={taken} wanted={wanted} low={low} />
                <Creatures low={low} shadows={profile.shadows} />
                <Npcs markers={markers} rigged={profile.riggedVessels} shadows={profile.shadows} low={low} />

                <RemotePlayers peers={peers} selfId={selfId} mobile={low} rigged={profile.riggedVessels} saidBy={saidBy} ground={groundAt} />
                <LocalPlayerBody avatar={avatar} aura={aura} rigged={profile.riggedVessels} shadows={profile.shadows} />
                <PlainController
                    locked={locked}
                    mobile={mobile}
                    findHotspot={findHotspot}
                    onHotspot={onHotspot}
                    onPose={onPose}
                    onInteractRequest={onInteractRequest}
                    onMoveActivity={onMoveActivity}
                    onTick={onTick}
                />
                <PostFX profile={profile} />
            </Canvas>
        </div>
    );
}
