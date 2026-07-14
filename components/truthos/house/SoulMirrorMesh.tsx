'use client';

/**
 * Soul Mirror — flush on the south bedroom wall.
 * - MeshReflectorMaterial reflects the room / other LIVE players
 * - Local vessel is placed behind the glass (flipped) so you see yourself
 */
import { Suspense, useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { VesselModel } from '@/components/hut3d/VesselModel';
import type { AvatarConfig } from '@/lib/game/avatar';
import type { PlayerPose } from './LocalPlayerBody';

const WOOD = '#2c241c';
const GOLD = '#fbbf24';

/** World placement: south outer wall, east of bed — glass faces into room (−Z) */
export const MIRROR_WALL = {
    x: 3.15,
    y: 1.48,
    z: 9.32,
    glassW: 0.72,
    glassH: 1.38,
};

/** Max distance (xz) for showing the personal reflection vessel */
const SELF_REFLECT_DIST = 3.2;

function SelfInMirror({
    avatar,
    pose,
    low,
}: {
    avatar: AvatarConfig;
    pose: PlayerPose | null;
    low?: boolean;
}) {
    const show = useMemo(() => {
        if (!pose) return false;
        const dx = pose.x - MIRROR_WALL.x;
        const dz = pose.z - MIRROR_WALL.z;
        return Math.hypot(dx, dz) < SELF_REFLECT_DIST;
    }, [pose]);

    if (!show || !pose) return null;

    // Vessel sits just on the room side of the glass so it reads as "you" in the frame.
    // (Opaque reflector materials cannot show meshes behind the glass.)
    const relX = (pose.x - MIRROR_WALL.x) * 0.4;
    const reflectX = MIRROR_WALL.x + Math.max(-0.22, Math.min(0.22, relX));
    const reflectZ = MIRROR_WALL.z - 0.13;
    // Face the viewer in the room (−Z) with a touch of their turn
    const faceYaw = Math.PI + (pose.yaw - Math.PI) * 0.2;

    return (
        <group position={[reflectX, 0, reflectZ]} rotation={[0, faceYaw, 0]}>
            <Suspense fallback={null}>
                <VesselModel avatar={avatar} scale={low ? 0.86 : 0.9} />
            </Suspense>
        </group>
    );
}

export default function SoulMirrorMesh({
    low = false,
    rich = true,
    avatar,
    pose,
}: {
    low?: boolean;
    rich?: boolean;
    avatar?: AvatarConfig;
    pose?: PlayerPose | null;
}) {
    const { x, y, z, glassW, glassH } = MIRROR_WALL;
    const res = low ? 256 : 512;

    return (
        <group>
            {/* Wall backplate flush to south wall */}
            <mesh position={[x, y, z + 0.02]} castShadow receiveShadow>
                <boxGeometry args={[glassW + 0.28, glassH + 0.32, 0.06]} />
                <meshStandardMaterial color="#1a1520" roughness={0.9} />
            </mesh>
            {/* Wood frame */}
            <mesh position={[x, y, z - 0.01]} castShadow>
                <boxGeometry args={[glassW + 0.18, glassH + 0.22, 0.08]} />
                <meshStandardMaterial color={WOOD} roughness={0.75} />
            </mesh>
            {/* Gold inner trim */}
            <mesh position={[x, y, z - 0.04]}>
                <boxGeometry args={[glassW + 0.08, glassH + 0.1, 0.03]} />
                <meshStandardMaterial
                    color={GOLD}
                    metalness={0.6}
                    roughness={0.32}
                    emissive={GOLD}
                    emissiveIntensity={rich ? 0.16 : 0.08}
                />
            </mesh>

            {/* Self reflection — slightly behind glass, clipped by frame */}
            {avatar && (
                <group>
                    {/* Soft clip volume: keep vessel inside frame silhouette via depth */}
                    <SelfInMirror avatar={avatar} pose={pose ?? null} low={low} />
                </group>
            )}

            {/* Reflective glass — room + peers (and any world meshes) */}
            <mesh position={[x, y, z - 0.07]}>
                <planeGeometry args={[glassW, glassH]} />
                <MeshReflectorMaterial
                    blur={low ? [0, 0] : [160, 50]}
                    resolution={res}
                    mixBlur={low ? 0 : 0.55}
                    mixStrength={low ? 28 : 42}
                    roughness={0.12}
                    depthScale={low ? 0.35 : 0.7}
                    minDepthThreshold={0.3}
                    maxDepthThreshold={1.35}
                    color="#8aa4b8"
                    metalness={0.85}
                    mirror={0.88}
                    reflectorOffset={0.03}
                    transparent
                    opacity={0.92}
                />
            </mesh>

            {!low && (
                <mesh position={[x, y, z - 0.072]}>
                    <planeGeometry args={[glassW * 0.94, glassH * 0.94]} />
                    <meshBasicMaterial color="#c8d8e8" transparent opacity={0.05} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
}
