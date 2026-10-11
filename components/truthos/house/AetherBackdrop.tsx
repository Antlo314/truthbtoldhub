'use client';

/**
 * What lies outside the glass — the cloud sea the lair floats over,
 * drifting obsidian, the volumetric clouds below the Overlook. Nothing
 * here is walkable; it is seen through the oculus, the skylights, the
 * slit windows and the Overlook's wall. The far islets live in
 * AetherHorizon.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Cloud, Clouds } from '@react-three/drei';
import { seededRng } from './houseSkins';
import { useHouseMaterials } from './HouseMaterials';
import type { QualityProfile } from './renderQuality';

/** The lair spans z −23 → 63; the sea and the root centre on its middle */
const CZ = 20;

export default function AetherBackdrop({ low = false, profile }: { low?: boolean; profile?: QualityProfile }) {
    const m = useHouseMaterials(low);
    const a = useRef<THREE.Mesh>(null);
    const b = useRef<THREE.Mesh>(null);
    const shardGroup = useRef<THREE.Group>(null);
    const volumetric = !!profile?.clouds;

    const rnd = useMemo(() => seededRng(0xbacd), []);
    const puffs = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => {
                const ang = (i / 14) * Math.PI * 2 + rnd() * 0.3;
                const r = 58 + rnd() * 34;
                return {
                    pos: [Math.cos(ang) * r, -11 + rnd() * 5, Math.sin(ang) * r + CZ] as [number, number, number],
                    seed: i * 7 + 3,
                    vol: 11 + rnd() * 8,
                    speed: 0.05 + rnd() * 0.05,
                };
            }),
        [rnd],
    );
    const shards = useMemo(
        () =>
            Array.from({ length: low ? 8 : 18 }, () => {
                const ang = rnd() * Math.PI * 2;
                const r = 56 + rnd() * 44;
                return { x: Math.cos(ang) * r, z: Math.sin(ang) * r + CZ, y: 2 + rnd() * 12, s: 0.9 + rnd() * 1.8 };
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

    return (
        <group>
            <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, -9, CZ]}>
                <circleGeometry args={[240, low ? 24 : 48]} />
                <meshStandardMaterial color="#b9aec8" roughness={1} transparent opacity={volumetric ? 0.5 : 0.72} />
            </mesh>
            <mesh ref={b} rotation={[-Math.PI / 2, 0, 0.2]} position={[0, -7.6, CZ]}>
                <circleGeometry args={[200, low ? 20 : 40]} />
                <meshStandardMaterial color="#8d7eaa" roughness={1} transparent opacity={volumetric ? 0.26 : 0.38} />
            </mesh>
            {/* the basalt root the lair stands on, and its rock skirt */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, CZ]}>
                <circleGeometry args={[52, 40]} />
                <primitive object={m.basalt} attach="material" />
            </mesh>
            <mesh position={[0, -3.4, CZ]}>
                <cylinderGeometry args={[52, 42, 6.6, 32, 1, true]} />
                <primitive object={m.rockFace} attach="material" />
            </mesh>
            {volumetric && (
                <Clouds material={THREE.MeshLambertMaterial} texture="/textures/cloud_puff.png" limit={260} range={220}>
                    {puffs.map((p, i) => (
                        <Cloud key={i} seed={p.seed} position={p.pos} segments={14} bounds={[18, 3.6, 18]} volume={p.vol} concentrate="inside" color="#d9d0e6" opacity={0.62} speed={p.speed} growth={3} fade={30} />
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
