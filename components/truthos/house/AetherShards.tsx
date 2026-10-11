'use client';

/**
 * Aether shards — twenty-four pieces of the Source hanging in the world.
 *
 * Walk into one and it is yours: a chime, a flare, a count in the HUD.
 * Positions are data (aetherShards.ts), pickup is a distance test in one
 * frame loop over all of them, and the models are the Platformer Kit's
 * jewel with an octahedron underneath for phones and failed fetches.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { SHARDS } from './shardSites';
import { useShards } from './shardStore';
import { getWalkerPose } from './walkerPose';
import { hubAudio } from '@/lib/truthos/hubAudio';
import type { QualityProfile } from './renderQuality';

const PICK_R = 1.15;

function ShardMesh({
    index,
    x,
    y,
    z,
    sparkles,
    shadows,
}: {
    index: number;
    x: number;
    y: number;
    z: number;
    sparkles: boolean;
    shadows: boolean;
}) {
    const spin = useRef<THREE.Group>(null);
    const glow = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#c4b5fd',
                emissive: '#7c5cff',
                emissiveIntensity: 1.4,
                roughness: 0.25,
                metalness: 0.2,
                toneMapped: false,
            }),
        [],
    );
    useFrame(({ clock }) => {
        const g = spin.current;
        if (!g) return;
        const t = clock.elapsedTime + index * 0.7;
        g.rotation.y = t * 1.3;
        g.position.y = y + Math.sin(t * 1.8) * 0.12;
    });
    return (
        <group position={[x, 0, z]}>
            <group ref={spin} position={[0, y, 0]}>
                <HouseProp model="pkJewel" anchor="center" fit={{ h: 0.5 }} shadows={shadows}>
                    <mesh>
                        <octahedronGeometry args={[0.22, 0]} />
                        <primitive object={glow} attach="material" />
                    </mesh>
                </HouseProp>
                {/* A shard carries its own faint light so it reads at night */}
                <mesh scale={1.35}>
                    <octahedronGeometry args={[0.26, 0]} />
                    <meshBasicMaterial color="#8b7cff" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
                </mesh>
            </group>
            {sparkles && <Sparkles count={10} scale={[0.9, 1.1, 0.9]} position={[0, y, 0]} size={2.2} speed={0.35} color="#d6ccff" opacity={0.8} />}
            {/* a pool of light on the ground beneath */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.18, 0.42, 20]} />
                <meshBasicMaterial color="#7c5cff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

export default function AetherShards({ profile }: { profile: QualityProfile }) {
    const hydrate = useShards((s) => s.hydrate);
    const collected = useShards((s) => s.collected);
    const collect = useShards((s) => s.collect);
    const [, force] = useState(0);
    const lastCheck = useRef(0);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Pickup: one distance test per shard, a few times a second
    useFrame(({ clock }) => {
        if (clock.elapsedTime - lastCheck.current < 0.12) return;
        lastCheck.current = clock.elapsedTime;
        const p = getWalkerPose();
        const taken = useShards.getState().collected;
        for (const s of SHARDS) {
            if (taken[s.id]) continue;
            const dx = p.x - s.x;
            const dz = p.z - s.z;
            if (dx * dx + dz * dz < PICK_R * PICK_R) {
                if (collect(s)) {
                    const n = Object.keys(useShards.getState().collected).length;
                    hubAudio.playSfx('arcade_coin', { volume: 0.34, rate: 1 + Math.min(0.5, n * 0.02) });
                    if (n === SHARDS.length) hubAudio.playSfx('ui_success', { volume: 0.4, duck: true });
                    force((v) => v + 1);
                }
            }
        }
    });

    const remaining = useMemo(() => SHARDS.filter((s) => !collected[s.id]), [collected]);

    return (
        <group>
            {remaining.map((s, i) => (
                <ShardMesh key={s.id} index={i} x={s.x} y={s.y} z={s.z} sparkles={profile.sparkles} shadows={profile.shadows} />
            ))}
        </group>
    );
}
