'use client';

/**
 * Local vessel body for real-time mirror reflection.
 * Layer 1 = hidden from main FP camera, visible to mirror virtual cam (all layers).
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Humanoid from './Humanoid';
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
            {/* Your own body — the SAME vessel everyone else sees, so the
                mirror shows the person other players are looking at. */}
            <Humanoid
                look={{
                    skin: avatar.skin,
                    hair: avatar.hairColor,
                    cloth: avatar.top,
                    // The aura is the soul's colour, not the avatar's — the
                    // presence layer owns it, so the mirror uses the brand
                    // violet until a soul colour is threaded through.
                    aura: '#a78bfa',
                    build: avatar.build === 'fem' ? 'fem' : 'masc',
                }}
                trackPosition={{ x: pose.x, z: pose.z }}
            />
        </group>
    );
}
