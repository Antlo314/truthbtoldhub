'use client';

/**
 * The Aether Shelf — the terrace the Sanctum stands on.
 *
 * A basalt disc over a cloud sea, a cobbled walk around the hall, a
 * lantern ring, light-bridges to four isles. The bones are procedural
 * (so a missing file can never black-screen /world); the dressing is
 * CC0 — Fantasy Town lamps, Castle banners, Nature Kit cliffs on the
 * rim, Survival Kit signposts where the bridges leave. Everything is
 * placed against the same bridge table the walker uses, so nothing can
 * stand on a bridge head.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Cloud, Clouds, Html, Sparkles } from '@react-three/drei';
import { useHouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import { seededRng } from './houseSkins';
import { inBuilding, VERTEX_R, ALCOVE, HALL } from './homeMap';
import { BRIDGE_DECK_W, CLEARING_R, CORRIDORS, DESTINATIONS, destCenter, inCorridor } from './jungleMap';
import { PADS } from './worldPads';
import { getWalkerPose } from './walkerPose';
import type { QualityProfile } from './renderQuality';

/* ── The cloud sea ─────────────────────────────────────────── */

function CloudSea({ low, volumetric }: { low: boolean; volumetric: boolean }) {
    const a = useRef<THREE.Mesh>(null);
    const b = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (a.current) a.current.rotation.y += dt * 0.008;
        if (b.current) b.current.rotation.y -= dt * 0.005;
    });
    const puffs = useMemo(() => {
        const rnd = seededRng(0xc10d);
        return Array.from({ length: 14 }, (_, i) => {
            const ang = (i / 14) * Math.PI * 2 + rnd() * 0.3;
            const r = 32 + rnd() * 30;
            return {
                pos: [Math.cos(ang) * r, -8.5 + rnd() * 4.5, Math.sin(ang) * r] as [number, number, number],
                seed: i * 7 + 3,
                vol: 9 + rnd() * 7,
                speed: 0.05 + rnd() * 0.05,
            };
        });
    }, []);
    return (
        <group>
            <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.4, 0]}>
                <circleGeometry args={[220, low ? 24 : 48]} />
                <meshStandardMaterial color="#b9aec8" roughness={1} transparent opacity={volumetric ? 0.5 : 0.72} />
            </mesh>
            <mesh ref={b} rotation={[-Math.PI / 2, 0, 0.2]} position={[0, -5.4, 0]}>
                <circleGeometry args={[180, low ? 20 : 40]} />
                <meshStandardMaterial color="#8d7eaa" roughness={1} transparent opacity={volumetric ? 0.26 : 0.38} />
            </mesh>
            {volumetric && (
                <Clouds material={THREE.MeshLambertMaterial} texture="/textures/cloud_puff.png" limit={260} range={200}>
                    {puffs.map((p, i) => (
                        <Cloud
                            key={i}
                            seed={p.seed}
                            position={p.pos}
                            segments={14}
                            bounds={[16, 3.2, 16]}
                            volume={p.vol}
                            concentrate="inside"
                            color="#d9d0e6"
                            opacity={0.62}
                            speed={p.speed}
                            growth={3}
                            fade={28}
                        />
                    ))}
                </Clouds>
            )}
        </group>
    );
}

/* ── Signposts where the bridges leave the terrace ─────────── */

function SignLabel({ text, sub }: { text: string; sub: string }) {
    return (
        <div className="pointer-events-none select-none rounded-xl border border-amber-300/35 bg-black/70 px-3 py-1.5 text-center backdrop-blur-md whitespace-nowrap">
            <p className="text-[11px] font-semibold tracking-wide text-amber-50">{text}</p>
            <p className="text-[9px] uppercase tracking-[0.22em] text-amber-200/70">{sub}</p>
        </div>
    );
}

function Signpost({ x, z, yaw, text, sub, low }: { x: number; z: number; yaw: number; text: string; sub: string; low: boolean }) {
    const [near, setNear] = useState(false);
    const t = useRef(0);
    useFrame((_, dt) => {
        t.current += dt;
        if (t.current < 0.4) return;
        t.current = 0;
        const p = getWalkerPose();
        const d = Math.hypot(p.x - x, p.z - z);
        if (near && d > 30) setNear(false);
        else if (!near && d < 26) setNear(true);
    });
    return (
        <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
            <HouseProp model="skSignpost" fit={{ h: 2.3 }} shadows={!low}>
                <group>
                    <mesh position={[0, 1.1, 0]}>
                        <boxGeometry args={[0.12, 2.2, 0.12]} />
                        <meshStandardMaterial color="#5a4632" roughness={0.9} />
                    </mesh>
                    <mesh position={[0.22, 1.85, 0]}>
                        <boxGeometry args={[0.7, 0.22, 0.05]} />
                        <meshStandardMaterial color="#c4b59a" roughness={0.85} />
                    </mesh>
                </group>
            </HouseProp>
            {near && !low && (
                <Html position={[0, 2.55, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
                    <SignLabel text={text} sub={sub} />
                </Html>
            )}
        </group>
    );
}

/* ── Aether springs ─────────────────────────────────────────── */

function Spring({ x, z, low }: { x: number; z: number; low: boolean }) {
    const ring = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ring.current) return;
        const s = 1 + Math.sin(clock.elapsedTime * 2.6) * 0.08;
        ring.current.scale.set(s, s, 1);
    });
    return (
        <group position={[x, 0, z]}>
            <HouseProp model="pkSpring" fit={{ w: 1.15 }} shadows={!low}>
                <group>
                    <mesh position={[0, 0.08, 0]}>
                        <cylinderGeometry args={[0.5, 0.56, 0.16, 16]} />
                        <meshStandardMaterial color="#3b3350" roughness={0.6} metalness={0.3} />
                    </mesh>
                    <mesh position={[0, 0.3, 0]}>
                        <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
                        <meshStandardMaterial color="#7c5cff" emissive="#5b3fe6" emissiveIntensity={0.6} roughness={0.4} />
                    </mesh>
                </group>
            </HouseProp>
            <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.62, 0.84, 28]} />
                <meshBasicMaterial color="#8b7cff" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

/** Keep a ring placement off every bridge head and off the building. */
const clearOfBridges = (x: number, z: number, margin: number) => !inCorridor(x, z, margin) && !inBuilding(x, z, 1.2);

/* ── The shelf ──────────────────────────────────────────────── */

export default function AetherShelf({ low = false, profile }: { low?: boolean; profile?: QualityProfile }) {
    const m = useHouseMaterials(low);
    const rnd = useMemo(() => seededRng(0xa37e12), []);
    const basalt = m.basalt;
    const rock = m.rockFace;
    const cobble = m.cobble;
    const gold = m.gold;
    const lanternLights = !low && (profile?.tier === 'ultra' || profile?.tier === 'high');
    const sparkles = !!profile?.sparkles;
    const hallR = VERTEX_R + HALL.wallT + ALCOVE.depth + 0.4;

    const lanterns = useMemo(() => {
        const n = low ? 8 : 14;
        const out: { x: number; z: number; yaw: number }[] = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + 0.22;
            const r = CLEARING_R - 3.2 + (rnd() - 0.5) * 0.8;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            if (!clearOfBridges(x, z, 3.2)) continue;
            out.push({ x, z, yaw: -a + Math.PI / 2 });
        }
        return out;
    }, [low, rnd]);

    const shards = useMemo(() => {
        const n = low ? 10 : 22;
        const out: { x: number; z: number; y: number; s: number }[] = [];
        let guard = n * 20;
        while (out.length < n && guard-- > 0) {
            const a = rnd() * Math.PI * 2;
            const r = CLEARING_R + rnd() * 36;
            out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 3.2 + rnd() * 7, s: 0.7 + rnd() * 1.4 });
        }
        return out;
    }, [low, rnd]);

    /** Sentinels stand midway between bridges, at the terrace's middle ring */
    const sentinels = useMemo(() => {
        const bridgeAngles = CORRIDORS.map((c) => Math.atan2(c.az, c.ax)).sort((a, b) => a - b);
        const mids: number[] = [];
        for (let i = 0; i < bridgeAngles.length; i++) {
            const a0 = bridgeAngles[i];
            const a1 = i + 1 < bridgeAngles.length ? bridgeAngles[i + 1] : bridgeAngles[0] + Math.PI * 2;
            mids.push((a0 + a1) / 2);
        }
        return mids.slice(0, 3).map((a) => ({
            x: Math.cos(a) * (CLEARING_R - 6.5),
            z: Math.sin(a) * (CLEARING_R - 6.5),
            yaw: -a + Math.PI / 2,
        }));
    }, []);

    const rim = useMemo(() => {
        const n = low ? 18 : 30;
        const kinds = ['nkCliffRock', 'nkRockTallA', 'nkStoneTallA', 'nkCliffLargeRock', 'nkRockTallD'];
        const out: { x: number; z: number; yaw: number; h: number; w: number; kind: string }[] = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + 0.04;
            const x = Math.cos(a) * (CLEARING_R + 0.7);
            const z = Math.sin(a) * (CLEARING_R + 0.7);
            if (inCorridor(x, z, 2.8)) continue;
            out.push({ x, z, yaw: a, h: 2.2 + (i % 5) * 0.62, w: 3.2 + (i % 3) * 0.4, kind: kinds[i % kinds.length] });
        }
        return out;
    }, [low]);

    const signposts = useMemo(
        () =>
            CORRIDORS.map((c, i) => {
                const dx = c.bx - c.ax;
                const dz = c.bz - c.az;
                const len = Math.hypot(dx, dz) || 1;
                const ux = dx / len;
                const uz = dz / len;
                // Beside the bridge head, on the terrace, turned to face the walker coming out
                const x = c.ax - ux * 1.4 - uz * (BRIDGE_DECK_W / 2 + 1.4);
                const z = c.az - uz * 1.4 + ux * (BRIDGE_DECK_W / 2 + 1.4);
                const dest = c.deadEnd ? null : DESTINATIONS[i - 1];
                return {
                    x,
                    z,
                    yaw: Math.atan2(-x, -z) + Math.PI,
                    text: dest ? dest.name : 'The walk',
                    sub: dest ? dest.blurb : 'a quiet way, for now',
                };
            }),
        [],
    );

    const shardGroup = useRef<THREE.Group>(null);
    useFrame(() => {
        if (!shardGroup.current || low) return;
        const t = performance.now() * 0.0004;
        shardGroup.current.children.forEach((ch: THREE.Object3D, i: number) => {
            ch.rotation.y = t * (0.4 + (i % 5) * 0.08);
            ch.position.y = shards[i].y + Math.sin(t * 2 + i) * 0.25;
        });
    });

    return (
        <group>
            <CloudSea low={low} volumetric={!!profile?.clouds} />

            {/* The terrace: a cobbled walk around the hall, basalt out to the rim */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow={!low}>
                <circleGeometry args={[hallR + 3.2, low ? 24 : 56]} />
                <primitive object={cobble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow={!low}>
                <ringGeometry args={[hallR + 3.1, CLEARING_R + 1.5, low ? 24 : 56]} />
                <primitive object={basalt} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <ringGeometry args={[hallR + 2.7, hallR + 3.1, low ? 20 : 56]} />
                <primitive object={gold} attach="material" />
            </mesh>
            {/* The shelf has a side — basalt falling away to the sea */}
            <mesh position={[0, -3.2, 0]}>
                <cylinderGeometry args={[CLEARING_R + 1.6, CLEARING_R - 2.5, 6.4, low ? 28 : 56, 1, true]} />
                <primitive object={rock} attach="material" />
            </mesh>

            {/* Lantern ring — Fantasy Town lamps, none on a bridge head */}
            {lanterns.map((p, i) => (
                <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
                    <HouseProp model="ftLantern" fit={{ h: 2.6 }} shadows={!low}>
                        <group>
                            <mesh position={[0, 1.1, 0]}>
                                <cylinderGeometry args={[0.12, 0.18, 2.2, 6]} />
                                <primitive object={basalt} attach="material" />
                            </mesh>
                            <mesh position={[0, 2.28, 0]}>
                                <boxGeometry args={[0.42, 0.1, 0.42]} />
                                <primitive object={gold} attach="material" />
                            </mesh>
                        </group>
                    </HouseProp>
                    <mesh position={[0, 2.3, 0]}>
                        <sphereGeometry args={[0.13, 8, 6]} />
                        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
                    </mesh>
                    {lanternLights && i % 3 === 0 && (
                        <pointLight position={[0, 2.3, 0]} color="#ffc98f" intensity={1.2} distance={9} decay={2} />
                    )}
                </group>
            ))}

            {/* Drifting obsidian over the sea */}
            <group ref={shardGroup}>
                {shards.map((s, i) => (
                    <mesh key={i} position={[s.x, s.y, s.z]} scale={s.s} rotation={[0.3, i, 0.2]}>
                        <coneGeometry args={[0.22, 1.0, 5]} />
                        <meshStandardMaterial color="#0c0a12" metalness={0.4} roughness={0.2} />
                    </mesh>
                ))}
            </group>

            {/* Aether motes over the whole terrace */}
            {sparkles && <Sparkles count={80} scale={[50, 7, 50]} position={[0, 3.2, 0]} size={1.6} speed={0.18} color="#b9a8ff" opacity={0.45} />}

            {/* Sentinels — a column and a banner each, the violet eye kept */}
            {sentinels.map((s, i) => (
                <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.yaw, 0]}>
                    <HouseProp model="nkStatueColumn" fit={{ h: 3.2 }} shadows={!low}>
                        <mesh position={[0, 1.3, 0]}>
                            <boxGeometry args={[0.55, 2.5, 0.4]} />
                            <primitive object={basalt} attach="material" />
                        </mesh>
                    </HouseProp>
                    <mesh position={[0, 3.35, 0]}>
                        <sphereGeometry args={[0.1, 8, 6]} />
                        <meshBasicMaterial color="#7c5cff" toneMapped={false} />
                    </mesh>
                    <group position={[1.1, 0, 0]}>
                        <HouseProp model="ckFlagBannerLong" fit={{ h: 3.4 }} shadows={!low}>
                            <mesh position={[0, 1.5, 0]}>
                                <boxGeometry args={[0.07, 3.0, 0.07]} />
                                <primitive object={gold} attach="material" />
                            </mesh>
                        </HouseProp>
                    </group>
                </group>
            ))}

            {/* Light bridges, with a stone pillar pair at each head */}
            {CORRIDORS.map((c, i) => {
                const dx = c.bx - c.ax;
                const dz = c.bz - c.az;
                const len = Math.hypot(dx, dz);
                const yaw = Math.atan2(dx, dz);
                const steps = Math.max(2, Math.floor(len / 2.7));
                const nx = -dz / len;
                const nz = dx / len;
                return (
                    <group key={i}>
                        {Array.from({ length: steps }, (_, k) => {
                            const t = (k + 0.5) / steps;
                            return (
                                <group key={k} position={[c.ax + dx * t, 0.02, c.az + dz * t]} rotation={[0, yaw, 0]}>
                                    <mesh receiveShadow={!low}>
                                        <boxGeometry args={[BRIDGE_DECK_W, 0.14, len / steps + 0.02]} />
                                        <primitive object={basalt} attach="material" />
                                    </mesh>
                                    {[1, -1].map((s) => (
                                        <mesh key={s} position={[s * (BRIDGE_DECK_W / 2 - 0.08), 0.3, 0]}>
                                            <boxGeometry args={[0.06, 0.08, len / steps - 0.1]} />
                                            <primitive object={gold} attach="material" />
                                        </mesh>
                                    ))}
                                </group>
                            );
                        })}
                        {[1, -1].map((side) => (
                            <group key={side} position={[c.ax + nx * side * (BRIDGE_DECK_W / 2 + 0.45), 0, c.az + nz * side * (BRIDGE_DECK_W / 2 + 0.45)]} rotation={[0, yaw, 0]}>
                                <HouseProp model="ftPillarStone" fit={{ h: 2.2 }} shadows={!low}>
                                    <mesh position={[0, 1.0, 0]}>
                                        <boxGeometry args={[0.32, 2.0, 0.32]} />
                                        <primitive object={basalt} attach="material" />
                                    </mesh>
                                </HouseProp>
                                <mesh position={[0, 2.3, 0]}>
                                    <sphereGeometry args={[0.09, 8, 6]} />
                                    <meshBasicMaterial color="#e8c478" toneMapped={false} />
                                </mesh>
                            </group>
                        ))}
                    </group>
                );
            })}

            {signposts.map((s, i) => (
                <Signpost key={i} {...s} low={low} />
            ))}

            {PADS.map((p) => (
                <Spring key={p.id} x={p.x} z={p.z} low={low} />
            ))}

            {/* The isles: a cobbled disc on a basalt root, a beacon that reads from the Sanctum */}
            {DESTINATIONS.map((d) => {
                const c = destCenter(d);
                return (
                    <group key={d.id} position={[c.x, 0, c.z]}>
                        <mesh position={[0, 6.2, 0]}>
                            <cylinderGeometry args={[0.07, 0.11, 12.4, 6]} />
                            <primitive object={gold} attach="material" />
                        </mesh>
                        <mesh position={[0, 12.6, 0]}>
                            <sphereGeometry args={[0.38, 10, 8]} />
                            <meshBasicMaterial
                                color={d.id === 'cinema' ? '#f97316' : d.id === 'hall' ? '#e8c478' : d.id === 'soul_mirror' ? '#7c5cff' : '#22d3ee'}
                                toneMapped={false}
                            />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow={!low}>
                            <circleGeometry args={[d.r + 0.6, low ? 16 : 36]} />
                            <primitive object={cobble} attach="material" />
                        </mesh>
                        <mesh position={[0, -3.4, 0]} rotation={[Math.PI, 0, 0]}>
                            <coneGeometry args={[d.r * 0.55, 6.4, 8]} />
                            <primitive object={rock} attach="material" />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                            <ringGeometry args={[d.r * 0.42, d.r * 0.48, 16]} />
                            <primitive object={gold} attach="material" />
                        </mesh>
                    </group>
                );
            })}

            {/* The rim — Nature Kit cliffs over the old basalt blocks */}
            {rim.map((p, i) => (
                <group key={`rim-${i}`} position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
                    <HouseProp model={p.kind} fit={{ w: p.w }} shadows={!low}>
                        <mesh position={[0, p.h / 2, 0]} castShadow={!low} receiveShadow={!low}>
                            <boxGeometry args={[p.w, p.h, 1.15]} />
                            <primitive object={rock} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            ))}
            {/* Haze curtain — the world edge blends into the sky */}
            <mesh position={[0, 5.5, 0]}>
                <cylinderGeometry args={[34, 46, 16, low ? 20 : 32, 1, true]} />
                <meshBasicMaterial color="#1a142c" transparent opacity={0.32} side={2} depthWrite={false} fog />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <ringGeometry args={[CLEARING_R - 0.15, CLEARING_R + 0.55, low ? 24 : 48]} />
                <primitive object={gold} attach="material" />
            </mesh>
        </group>
    );
}
