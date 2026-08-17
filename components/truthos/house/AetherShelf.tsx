'use client';

/**
 * The Aether Shelf — exterior world around the hut.
 * Not woods. Stone terrace over a cloud sea, lantern ring, Source well,
 * light-bridges to sister islets. Instanced scatter. Mobile strips lights
 * and halves counts. Blender GLBs in /models/aether are authored separately;
 * this file never depends on them so a missing file cannot black-screen /world.
 */
import { useMemo, useRef } from 'react';
import type { Group, Mesh, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { useHouseMaterials } from './HouseMaterials';
import { seededRng } from './houseSkins';
import { FRONT_DOOR, SHELL } from './homeMap';
import { CLEARING_R, CORRIDORS, DESTINATIONS, destCenter, inCorridor } from './jungleMap';

function inHouse(x: number, z: number, pad = 2.6) {
    return x > SHELL.minX - pad && x < SHELL.maxX + pad && z > SHELL.minZ - pad && z < SHELL.maxZ + pad;
}

function CloudSea({ low }: { low: boolean }) {
    const a = useRef<Mesh>(null);
    const b = useRef<Mesh>(null);
    useFrame((_, dt) => {
        if (a.current) a.current.rotation.y += dt * 0.008;
        if (b.current) b.current.rotation.y -= dt * 0.005;
    });
    return (
        <group>
            <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.2, 0]}>
                <circleGeometry args={[220, low ? 24 : 48]} />
                <meshStandardMaterial color="#b9aec8" roughness={1} transparent opacity={0.72} />
            </mesh>
            <mesh ref={b} rotation={[-Math.PI / 2, 0, 0.2]} position={[0, -5.4, 0]}>
                <circleGeometry args={[180, low ? 20 : 40]} />
                <meshStandardMaterial color="#8d7eaa" roughness={1} transparent opacity={0.38} />
            </mesh>
        </group>
    );
}

export default function AetherShelf({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const rnd = useMemo(() => seededRng(0xa37e12), []);
    const basalt = m.stone;
    const gold = m.gold;

    const lanterns = useMemo(() => {
        const n = low ? 8 : 14;
        return Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 + 0.08;
            const r = 27.2 + (rnd() - 0.5) * 1.2;
            return { x: Math.cos(a) * r, z: Math.sin(a) * r };
        });
    }, [low, rnd]);

    const shards = useMemo(() => {
        const n = low ? 10 : 22;
        const out: { x: number; z: number; y: number; s: number }[] = [];
        let guard = n * 20;
        while (out.length < n && guard-- > 0) {
            const a = rnd() * Math.PI * 2;
            const r = 26 + rnd() * 40;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            if (inHouse(x, z)) continue;
            out.push({
                x,
                z,
                y: 3.2 + rnd() * 7,
                s: 0.7 + rnd() * 1.4,
            });
        }
        return out;
    }, [low, rnd]);

    const sentinels = useMemo(
        () =>
            [0.55, 2.2, 4.0].map((a) => ({
                x: Math.cos(a) * 28.5,
                z: Math.sin(a) * 28.5,
                yaw: a + Math.PI,
            })),
        [],
    );

    const rim = useMemo(() => {
        const n = low ? 16 : 26;
        const out: { x: number; z: number; yaw: number; h: number; w: number }[] = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + 0.04;
            const x = Math.cos(a) * (CLEARING_R + 0.6);
            const z = Math.sin(a) * (CLEARING_R + 0.6);
            if (inCorridor(x, z, 3.4)) continue;
            out.push({
                x,
                z,
                yaw: a,
                h: 2.2 + (i % 5) * 0.62,
                w: 3.6 + (i % 3) * 0.4,
            });
        }
        return out;
    }, [low]);

    const shardGroup = useRef<Group>(null);
    useFrame(() => {
        if (!shardGroup.current || low) return;
        const t = performance.now() * 0.0004;
        shardGroup.current.children.forEach((ch: Object3D, i: number) => {
            ch.rotation.y = t * (0.4 + (i % 5) * 0.08);
            ch.position.y = shards[i].y + Math.sin(t * 2 + i) * 0.25;
        });
    });

    return (
        <group>
            <CloudSea low={low} />

            {/* Terrace is a RING outside the hut. A full disc plus a
                sideways 34 m cone used to occupy the entire interior. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow={!low}>
                <ringGeometry args={[23.4, CLEARING_R + 1.5, low ? 24 : 40]} />
                <primitive object={basalt} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <ringGeometry args={[24.0, 24.8, low ? 20 : 32]} />
                <meshStandardMaterial color="#e8c478" metalness={0.7} roughness={0.28} />
            </mesh>

            <group position={[FRONT_DOOR.x, 0, SHELL.maxZ + 3.5]}>
                <mesh position={[0, 0.16, 0]}>
                    <cylinderGeometry args={[1.2, 1.35, 0.34, 10]} />
                    <primitive object={basalt} attach="material" />
                </mesh>
                <mesh position={[0, 0.4, 0]}>
                    <sphereGeometry args={[0.36, 10, 8]} />
                    <meshBasicMaterial color="#7c5cff" toneMapped={false} />
                </mesh>
                {!low && (
                    <pointLight position={[0, 1.6, 0]} color="#7c5cff" intensity={1.6} distance={14} decay={2} />
                )}
            </group>

            {lanterns.map((p, i) => (
                <group key={i} position={[p.x, 0, p.z]}>
                    <mesh position={[0, 1.1, 0]}>
                        <cylinderGeometry args={[0.12, 0.18, 2.2, 6]} />
                        <primitive object={basalt} attach="material" />
                    </mesh>
                    <mesh position={[0, 2.28, 0]}>
                        <boxGeometry args={[0.42, 0.1, 0.42]} />
                        <primitive object={gold} attach="material" />
                    </mesh>
                    <mesh position={[0, 2.58, 0]}>
                        <sphereGeometry args={[0.16, 8, 6]} />
                        <meshBasicMaterial color="#e8c478" toneMapped={false} />
                    </mesh>
                </group>
            ))}

            <group ref={shardGroup}>
                {shards.map((s, i) => (
                    <mesh key={i} position={[s.x, s.y, s.z]} scale={s.s} rotation={[0.3, i, 0.2]}>
                        <coneGeometry args={[0.22, 1.0, 5]} />
                        <meshStandardMaterial color="#0c0a12" metalness={0.4} roughness={0.2} />
                    </mesh>
                ))}
            </group>

            {sentinels.map((s, i) => (
                <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]}>
                    <mesh position={[0, 1.3, 0]}>
                        <boxGeometry args={[0.55, 2.5, 0.4]} />
                        <primitive object={basalt} attach="material" />
                    </mesh>
                    <mesh position={[0, 2.72, 0.18]}>
                        <sphereGeometry args={[0.08, 6, 6]} />
                        <meshBasicMaterial color="#7c5cff" toneMapped={false} />
                    </mesh>
                    <mesh position={[0.38, 1.5, 0]}>
                        <boxGeometry args={[0.07, 1.5, 0.07]} />
                        <primitive object={gold} attach="material" />
                    </mesh>
                </group>
            ))}

            {CORRIDORS.map((c, i) => {
                const dx = c.bx - c.ax;
                const dz = c.bz - c.az;
                const len = Math.hypot(dx, dz);
                const yaw = Math.atan2(dx, dz);
                const steps = Math.max(2, Math.floor(len / 2.7));
                return (
                    <group key={i}>
                        {Array.from({ length: steps }, (_, k) => {
                            const t = (k + 0.5) / steps;
                            return (
                                <group
                                    key={k}
                                    position={[c.ax + dx * t, 0.02, c.az + dz * t]}
                                    rotation={[0, yaw, 0]}
                                >
                                    <mesh receiveShadow={!low}>
                                        <boxGeometry args={[1.55, 0.12, 2.6]} />
                                        <primitive object={basalt} attach="material" />
                                    </mesh>
                                    <mesh position={[0.68, 0.28, 0]}>
                                        <boxGeometry args={[0.06, 0.08, 2.5]} />
                                        <primitive object={gold} attach="material" />
                                    </mesh>
                                    <mesh position={[-0.68, 0.28, 0]}>
                                        <boxGeometry args={[0.06, 0.08, 2.5]} />
                                        <primitive object={gold} attach="material" />
                                    </mesh>
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            {DESTINATIONS.map((d) => {
                const c = destCenter(d);
                return (
                    <group key={d.id} position={[c.x, 0, c.z]}>
                        {/* Landmark beacon — BotW-style readable POI from the hut */}
                        <mesh position={[0, 6.2, 0]}>
                            <cylinderGeometry args={[0.07, 0.11, 12.4, 6]} />
                            <meshStandardMaterial color="#e8c478" metalness={0.7} roughness={0.28} />
                        </mesh>
                        <mesh position={[0, 12.6, 0]}>
                            <sphereGeometry args={[0.38, 10, 8]} />
                            <meshBasicMaterial
                                color={
                                    d.id === 'cinema'
                                        ? '#f97316'
                                        : d.id === 'hall'
                                          ? '#e8c478'
                                          : d.id === 'soul_mirror'
                                            ? '#7c5cff'
                                            : '#22d3ee'
                                }
                                toneMapped={false}
                            />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow={!low}>
                            <circleGeometry args={[d.r + 0.6, low ? 16 : 28]} />
                            <primitive object={basalt} attach="material" />
                        </mesh>
                        <mesh position={[0, -3.4, 0]} rotation={[Math.PI, 0, 0]}>
                            <coneGeometry args={[d.r * 0.55, 6.4, 8]} />
                            <primitive object={basalt} attach="material" />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                            <ringGeometry args={[d.r * 0.42, d.r * 0.48, 16]} />
                            <meshStandardMaterial color="#e8c478" metalness={0.65} roughness={0.3} />
                        </mesh>
                    </group>
                );
            })}

            {rim.map((p, i) => (
                <mesh
                    key={`rim-${i}`}
                    position={[p.x, p.h / 2, p.z]}
                    rotation={[0, p.yaw, 0]}
                    castShadow={!low}
                    receiveShadow={!low}
                >
                    <boxGeometry args={[p.w, p.h, 1.15]} />
                    <primitive object={basalt} attach="material" />
                </mesh>
            ))}
            {/* Haze curtain — the world edge blends into the sky */}
            <mesh position={[0, 5.5, 0]}>
                <cylinderGeometry args={[40, 52, 16, low ? 20 : 32, 1, true]} />
                <meshBasicMaterial
                    color="#1a142c"
                    transparent
                    opacity={0.32}
                    side={2}
                    depthWrite={false}
                    fog
                />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <ringGeometry args={[CLEARING_R - 0.15, CLEARING_R + 0.55, low ? 24 : 40]} />
                <meshStandardMaterial color="#e8c478" metalness={0.65} roughness={0.32} />
            </mesh>

            <group position={[FRONT_DOOR.x, 3.4, SHELL.maxZ + 3.5]}>
                <mesh position={[0, 0.5, 0]}>
                    <coneGeometry args={[0.22, 1.2, 6]} />
                    <primitive object={gold} attach="material" />
                </mesh>
                <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[0.16, 8, 6]} />
                    <meshBasicMaterial color="#7c5cff" toneMapped={false} />
                </mesh>
            </group>
        </group>
    );
}
