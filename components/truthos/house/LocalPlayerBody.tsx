'use client';

/**
 * Local vessel body for real-time mirror reflection.
 * Layer 1 = hidden from main FP camera, visible to mirror virtual cam (all layers).
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VesselModel } from '@/components/hut3d/VesselModel';
import type { AvatarConfig } from '@/lib/game/avatar';

export const LOCAL_BODY_LAYER = 1;

export type PlayerPose = { x: number; y: number; z: number; yaw: number };

export default function LocalPlayerBody({
    avatar,
    pose,
}: {
    avatar: AvatarConfig;
    pose: PlayerPose | null;
}) {
    const group = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useLayoutEffect(() => {
        camera.layers.disable(LOCAL_BODY_LAYER);
    }, [camera]);

    useFrame(() => {
        if (!group.current || !pose) return;
        group.current.position.set(pose.x, 0, pose.z);
        group.current.rotation.y = pose.yaw;
        group.current.visible = true;
        group.current.traverse((o) => o.layers.set(LOCAL_BODY_LAYER));
    });

    if (!pose) return null;

    return (
        <group ref={group} position={[pose.x, 0, pose.z]} rotation={[0, pose.yaw, 0]}>
            <VesselModel avatar={avatar} scale={1} />
        </group>
    );
}
