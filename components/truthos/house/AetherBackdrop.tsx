'use client';

/**
 * What lies outside the glass — the cloud sea the lair floats over,
 * drifting obsidian, the volumetric clouds below the Overlook. Nothing
 * here is walkable; it is seen through the oculus, the skylights and the
 * Overlook's wall. The far islets live in AetherHorizon.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Cloud, Clouds } from '@react-three/drei';
import { seededRng } from './houseSkins';
import { useHouseMaterials } from './HouseMaterials';
import { VERTEX_R, ALCOVE, HALL } from './homeMap';
import type { QualityProfile } from './renderQuality';

export default function AetherBackdrop({ low = false, profile }: { low?: boolean; profile?: QualityProfile }) {
    const m = useHouseMaterials(low);
    const a = useRef<THREE.Mesh>(null);
    const b = useRef<THREE.Mesh>(null);
    const shardGroup = useRef<THREE.Group>(null);
    const volumetric = !!profile?.clouds;

    const rnd = useMemo(() => seededRng(0xbacd), []);
    const puffs = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => {
                const ang = (i / 12) * Math.PI * 2 + rnd() * 0.3;
                const r = 34 + rnd() * 30;
                return {
                    pos: [Math.cos(ang) * r, -9 + rnd() * 5, Math.sin(ang) * r + 10] as [number, number, number],
                    seed: i * 7 + 3,
                    vol: 9 + rnd() * 7,
                    speed: 0.05 + rnd() * 0.05,
                };
            }),
        [rnd],
    );
    const shards = useMemo(
        () =>
            Array.from({ length: low ? 8 : 18 }, () => {
                const ang = rnd() * Math.PI * 2;
                const r = 30 + rnd() * 40;
                return { x: Math.cos(ang) * r, z: Math.sin(ang) * r + 10, y: 2 + rnd() * 9, s: 0.7 + rnd() * 1.4 };
            }),
        [rnd, low],
    );

    useFrame((_, dt) => {
        if (a.current) a.current.rotation.y += dt * 0.008;
        if (b.current) b.current.rotation.y -= dt * 0.005;
        if (!shardGroup.current || low) return;
        const t = performance.now() * 0.0004;
        shardGroup.current.children.forEach((ch: THREE.Object3D, i: number) => {
            ch.rotation.y = t * (0.4 + (i % 5) * 0.08);
            ch.position.y = shards[i].y + Math.sin(t * 2 + i) * 0.25;
        });
    });

    // The lair stands on a basalt root — what you see of it from the glass
    const footR = VERTEX_R + HALL.wallT + ALCOVE.depth + 2;

    return (
        <group>
            <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.4, 10]}>
                <circleGeometry args={[220, low ? 24 : 48]} />
                <meshStandardMaterial color="#b9aec8" roughness={1} transparent opacity={volumetric ? 0.5 : 0.72} />
            </mesh>
            <mesh ref={b} rotation={[-Math.PI / 2, 0, 0.2]} position={[0, -6.2, 10]}>
                <circleGeometry args={[180, low ? 20 : 40]} />
                <meshStandardMaterial color="#8d7eaa" roughness={1} transparent opacity={volumetric ? 0.26 : 0.38} />
            </mesh>
            {/* the root under the building and a skirt of rock beyond the walls */}
            <mesh position={[0, -2.6, 12]}>
                <cylinderGeometry args={[footR + 6, footR - 2, 5.2, 24, 1, true]} />
                <primitive object={m.rockFace} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 12]}>
                <circleGeometry args={[footR + 6, 32]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            {volumetric && (
                <Clouds material={THREE.MeshLambertMaterial} texture="/textures/cloud_puff.png" limit={240} range={200}>
                    {puffs.map((p, i) => (
                        <Cloud key={i} seed={p.seed} position={p.pos} segments={14} bounds={[16, 3.2, 16]} volume={p.vol} concentrate="inside" color="#d9d0e6" opacity={0.62} speed={p.speed} growth={3} fade={28} />
                    ))}
                </Clouds>
            )}
            <group ref={shardGroup}>
                {shards.map((s, i) => (
                    <mesh key={i} position={[s.x, s.y, s.z]} scale={s.s} rotation={[0.3, i, 0.2]}>
                        <coneGeometry args={[0.22, 1.0, 5]} />
                        <meshStandardMaterial color="#0c0a12" metalness={0.4} roughness={0.2} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}
