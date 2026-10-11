'use client';

/**
 * Your own body — the SAME vessel everyone else sees.
 *
 * In first person it lives on layer 1, which the main camera does not
 * draw, so you never see your own torso clip through the lens; mirrors
 * and third person put it on layer 0. It follows walkerPose from the
 * frame loop, so moving never re-renders a React tree.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Humanoid from './Humanoid';
import Vessel, { type VesselMotion } from './Vessel';
import { wearFromAvatar } from './vesselLook';
import { getWalkerPose, getWalkerState } from './walkerPose';
import { useHouseUi } from './houseUiStore';
import type { AvatarConfig } from '@/lib/game/avatar';

export const LOCAL_BODY_LAYER = 1;

export type PlayerPose = { x: number; y: number; z: number; yaw: number };

export default function LocalPlayerBody({
    avatar,
    aura = '#a78bfa',
    rigged = true,
    shadows = true,
}: {
    avatar: AvatarConfig;
    aura?: string;
    rigged?: boolean;
    shadows?: boolean;
}) {
    const group = useRef<THREE.Group>(null);
    const wear = useMemo(
        () => wearFromAvatar(avatar, aura),
        // the wardrobe is a handful of scalars; list them so a colour change re-dresses
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [avatar.build, avatar.skin, avatar.hairStyle, avatar.hairColor, avatar.top, avatar.bottom, avatar.boots, avatar.outfit, avatar.extra, avatar.face, aura],
    );

    const motion = useCallback((): VesselMotion => {
        const s = getWalkerState();
        return {
            speed: s.speed,
            grounded: s.grounded,
            seated: s.seated,
            emote: s.emote,
            emoteAt: s.emoteAt,
            talking: s.talking,
        };
    }, []);

    useFrame(() => {
        const g = group.current;
        if (!g) return;
        const p = getWalkerPose();
        g.position.set(p.x, p.y, p.z);
        // The vessel faces its own +Z; the camera looks down −Z at yaw 0
        g.rotation.y = p.yaw + Math.PI;
        const third = useHouseUi.getState().view === 'third';
        const layer = third ? 0 : LOCAL_BODY_LAYER;
        // Re-applied every frame because the rigged body mounts late
        // (Suspense) and new meshes arrive on layer 0 by default.
        g.traverse((o) => {
            if (o.layers.mask !== 1 << layer) o.layers.set(layer);
        });
    });

    return (
        <group ref={group}>
            <Vessel
                wear={wear}
                motion={motion}
                shadows={shadows}
                rigged={rigged}
                fallback={
                    <Humanoid
                        look={{
                            skin: avatar.skin,
                            hair: avatar.hairColor,
                            cloth: avatar.top,
                            aura,
                            build: avatar.build === 'fem' ? 'fem' : 'masc',
                        }}
                        getSpeed={() => getWalkerState().speed}
                    />
                }
            />
        </group>
    );
}
