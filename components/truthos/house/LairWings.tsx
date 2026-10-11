'use client';

/**
 * Beyond the arch — the Processional, the Overlook and the four chambers.
 *
 * Walls are boxes along each room's inner rectangle (homeMap.ROOMS), split
 * around the doorways (homeMap.DOORS); the corridor owns the walls it
 * shares with the chambers so no two boxes ever share a face. Every prop
 * is a SOLID drawn at its own circle. The Cinema's screen is the live
 * VideoTexture surface the Cinema panel drives; the Hall's fire, the
 * Well's water and the Studio's neon each keep a light that never dims.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Sparkles, useTexture } from '@react-three/drei';
import { useHouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import CinemaScreen from './CinemaScreen';
import { getSky } from './DayNightCycle';
import { DOORS, FIRE, POOL, ROOMS, WALL_T, room, roomCenter, solid, solidWorld, type Rect, type Solid } from './homeMap';
import { PADS } from './worldPads';
import { getWalkerPose } from './walkerPose';
import type { QualityProfile } from './renderQuality';

type Mats = ReturnType<typeof useHouseMaterials>;

/* ── Building blocks ────────────────────────────────────────── */

function Box({
    pos,
    size,
    mat,
    shadow = true,
    rot,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    mat: THREE.Material;
    shadow?: boolean;
    rot?: [number, number, number];
}) {
    return (
        <mesh position={pos} rotation={rot} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={size} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

/** A world-placed solid: group at its centre, turned its way. */
function At({ s, children }: { s: Solid; children: React.ReactNode }) {
    const w = solidWorld(s);
    return (
        <group position={[w.x, 0, w.z]} rotation={[0, s.yaw ?? 0, 0]}>
            {children}
        </group>
    );
}

function Block({ s, mat, shadow, w, d, y = 0 }: { s: Solid; mat: THREE.Material; shadow: boolean; w?: number; d?: number; y?: number }) {
    return (
        <mesh position={[0, y + s.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={[w ?? s.r * 1.6, s.h, d ?? s.r * 1.2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

/**
 * A wall along z (constant x) from z0 to z1, with door holes cut out.
 * Each hole is {z0, z1, h}; the wall above a hole stays.
 */
function WallZ({ x, z0, z1, h, holes = [], mat, shadow, t = WALL_T }: { x: number; z0: number; z1: number; h: number; holes?: { z0: number; z1: number; h: number }[]; mat: THREE.Material; shadow: boolean; t?: number }) {
    const parts: { z0: number; z1: number; y0: number; y1: number }[] = [];
    let cur = z0;
    const sorted = [...holes].sort((a, b) => a.z0 - b.z0);
    for (const hole of sorted) {
        if (hole.z0 > cur) parts.push({ z0: cur, z1: hole.z0, y0: 0, y1: h });
        parts.push({ z0: hole.z0, z1: hole.z1, y0: hole.h, y1: h });
        cur = hole.z1;
    }
    if (cur < z1) parts.push({ z0: cur, z1, y0: 0, y1: h });
    return (
        <group>
            {parts.map((p, i) =>
                p.y1 - p.y0 > 0.01 ? (
                    <Box key={i} pos={[x, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2]} size={[t, p.y1 - p.y0, p.z1 - p.z0]} mat={mat} shadow={shadow} />
                ) : null,
            )}
        </group>
    );
}

/** A wall along x (constant z). */
function WallX({ z, x0, x1, h, mat, shadow, t = WALL_T }: { z: number; x0: number; x1: number; h: number; mat: THREE.Material; shadow: boolean; t?: number }) {
    return <Box pos={[(x0 + x1) / 2, h / 2, z]} size={[x1 - x0, h, t]} mat={mat} shadow={shadow} />;
}

/** A gold door frame around a hole in a z-wall. */
function DoorFrame({ x, z0, z1, h, mat, side }: { x: number; z0: number; z1: number; h: number; mat: THREE.Material; side: 'e' | 'w' }) {
    const w = z1 - z0;
    const inX = side === 'e' ? x - WALL_T / 2 - 0.02 : x + WALL_T / 2 + 0.02;
    return (
        <group position={[inX, 0, (z0 + z1) / 2]}>
            <Box pos={[0, h / 2, -(w / 2 + 0.08)]} size={[0.1, h, 0.16]} mat={mat} shadow={false} />
            <Box pos={[0, h / 2, w / 2 + 0.08]} size={[0.1, h, 0.16]} mat={mat} shadow={false} />
            <Box pos={[0, h + 0.08, 0]} size={[0.1, 0.16, w + 0.32]} mat={mat} shadow={false} />
        </group>
    );
}

/** A framed picture on a wall, facing `yaw`. Falls back to a dark panel while the image loads. */
function PosterImage({ url, w, h }: { url: string; w: number; h: number }) {
    const tex = useTexture(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return (
        <mesh>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={tex} roughness={0.7} metalness={0} />
        </mesh>
    );
}

function Poster({ url, x, y, z, yaw, w = 1.2, h = 1.7, m }: { url: string; x: number; y: number; z: number; yaw: number; w?: number; h?: number; m: Mats }) {
    return (
        <group position={[x, y, z]} rotation={[0, yaw, 0]}>
            <Suspense
                fallback={
                    <mesh>
                        <planeGeometry args={[w, h]} />
                        <primitive object={m.black} attach="material" />
                    </mesh>
                }
            >
                <PosterImage url={url} w={w} h={h} />
            </Suspense>
            <mesh position={[0, 0, -0.03]}>
                <boxGeometry args={[w + 0.12, h + 0.12, 0.05]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[w + 0.06, h + 0.06, 0.02]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
        </group>
    );
}

/** A bench solid — the Fantasy Town stall bench, a wooden block beneath it */
function Bench({ s, m, shadow }: { s: Solid; m: Mats; shadow: boolean }) {
    return (
        <At s={s}>
            <HouseProp model="ftStallBench" fit={{ w: 1.4 }} shadows={shadow}>
                <Block s={s} mat={m.wood} shadow={shadow} w={1.4} d={0.45} />
            </HouseProp>
        </At>
    );
}

/** Column with a sconce near the top */
function Column({ s, m, shadow, light }: { s: Solid; m: Mats; shadow: boolean; light: boolean }) {
    return (
        <At s={s}>
            <HouseProp model="nkStatueColumn" fit={{ w: 0.8, h: s.h - 0.1, d: 0.8 }} shadows={shadow}>
                <mesh position={[0, s.h / 2, 0]} castShadow={shadow}>
                    <cylinderGeometry args={[0.36, 0.42, s.h, 10]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
            </HouseProp>
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.56, 0.6, 0.2, 10]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh position={[0, 3.1, 0]}>
                <sphereGeometry args={[0.1, 10, 8]} />
                <primitive object={m.bulbWarm} attach="material" />
            </mesh>
            {light && <pointLight position={[0, 3.2, 0]} color="#ffd2a1" intensity={1.0} distance={8} decay={2} />}
        </At>
    );
}

/* ── The Processional + the Overlook ───────────────────────── */

const GALLERY_ART = [
    '/assets/cutscenes/dest-eden.jpg',
    '/assets/cutscenes/dest-giza.jpg',
    '/assets/cutscenes/dest-kolbrin.jpg',
    '/assets/cutscenes/dest-emerald.jpg',
    '/assets/cutscenes/dest-fair.jpg',
    '/assets/cutscenes/cutscene-source-return.jpg',
];

function Processional({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const P = room('processional');
    const O = room('overlook');
    const H = P.h;
    const glass = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#9fb4ff',
                transparent: true,
                opacity: 0.16,
                roughness: 0.04,
                metalness: 0.5,
                envMapIntensity: 1.6,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
        [],
    );
    const holes = DOORS.map((d) => ({ z0: d.rect.z0, z1: d.rect.z1, h: d.h }));
    const z0 = 11.6; // the Sanctum's outer face
    const z1 = O.z1 + WALL_T; // past the glass
    const skylight = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (!skylight.current) return;
        const mat = skylight.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.02 + getSky().daylight * 0.05;
    });

    return (
        <group>
            {/* floor: marble, a carpet runner down the centre, a gold border */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, (z0 + O.z1) / 2]} receiveShadow={sh}>
                <planeGeometry args={[P.x1 - P.x0, O.z1 - z0]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, (P.z0 + P.z1) / 2 + 0.6]} receiveShadow={sh}>
                <planeGeometry args={[2.2, P.z1 - P.z0 - 1.2]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {[-1.15, 1.15].map((x) => (
                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, (P.z0 + P.z1) / 2 + 0.6]}>
                    <planeGeometry args={[0.08, P.z1 - P.z0 - 1.2]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            ))}

            {/* the side walls, pierced by the four chamber doors */}
            <WallZ x={P.x1 + WALL_T / 2} z0={z0} z1={z1} h={H} holes={holes.filter((h) => DOORS.find((d) => d.rect.z0 === h.z0)?.side === 'e')} mat={m.plaster} shadow={sh} />
            <WallZ x={P.x0 - WALL_T / 2} z0={z0} z1={z1} h={H} holes={holes.filter((h) => DOORS.find((d) => d.rect.z0 === h.z0)?.side === 'w')} mat={m.plaster} shadow={sh} />
            {DOORS.map((d) => (
                <DoorFrame key={d.id} x={d.side === 'e' ? P.x1 + WALL_T / 2 : P.x0 - WALL_T / 2} z0={d.rect.z0} z1={d.rect.z1} h={d.h} mat={m.gold} side={d.side} />
            ))}
            {/* banners over each door */}
            {DOORS.map((d, i) => (
                <group key={`b-${d.id}`} position={[d.side === 'e' ? P.x1 - 0.1 : P.x0 + 0.1, d.h + 0.3, (d.rect.z0 + d.rect.z1) / 2]} rotation={[0, d.side === 'e' ? -Math.PI / 2 : Math.PI / 2, 0]}>
                    <HouseProp model={i % 2 ? 'ftBannerGreen' : 'ftBannerRed'} fit={{ h: 1.4 }} shadows={false}>
                        {null}
                    </HouseProp>
                </group>
            ))}

            {/* a skirting of basalt and a gold cove line */}
            {[P.x0 + 0.04, P.x1 - 0.04].map((x) => (
                <group key={x}>
                    <Box pos={[x, 0.08, (z0 + O.z1) / 2]} size={[0.08, 0.16, O.z1 - z0]} mat={m.basalt} shadow={false} />
                    <Box pos={[x, H - 0.35, (z0 + O.z1) / 2]} size={[0.06, 0.08, O.z1 - z0]} mat={m.cove} shadow={false} />
                </group>
            ))}

            {/* ceiling with a glass skylight strip down the middle and beams across */}
            <Box pos={[-(P.x1 - P.x0) / 4 - 0.45, H + 0.1, (z0 + O.z1) / 2]} size={[(P.x1 - P.x0) / 2 - 0.9 + WALL_T, 0.2, O.z1 - z0]} mat={m.woodDark} shadow={sh} />
            <Box pos={[(P.x1 - P.x0) / 4 + 0.45, H + 0.1, (z0 + O.z1) / 2]} size={[(P.x1 - P.x0) / 2 - 0.9 + WALL_T, 0.2, O.z1 - z0]} mat={m.woodDark} shadow={sh} />
            <mesh position={[0, H + 0.1, (z0 + O.z1) / 2]}>
                <boxGeometry args={[1.8, 0.06, O.z1 - z0]} />
                <primitive object={glass} attach="material" />
            </mesh>
            <mesh ref={skylight} position={[0, H / 2, (z0 + O.z1) / 2]}>
                <boxGeometry args={[1.8, H, O.z1 - z0]} />
                <meshBasicMaterial color="#d7ccff" transparent opacity={0.03} depthWrite={false} toneMapped={false} />
            </mesh>
            {Array.from({ length: 9 }, (_, i) => z0 + 1.6 + i * 3.0).map((z) => (
                <group key={z}>
                    <Box pos={[0, H - 0.14, z]} size={[P.x1 - P.x0 + WALL_T * 2, 0.26, 0.26]} mat={m.woodDark} shadow={false} />
                    <Box pos={[0, H - 0.02, z]} size={[P.x1 - P.x0 + WALL_T * 2 + 0.1, 0.04, 0.3]} mat={m.gold} shadow={false} />
                </group>
            ))}

            {/* columns with sconces — every other one carries a light */}
            {SOLIDS_GALLERY_COLUMNS.map((s, i) => (
                <Column key={s.name} s={s} m={m} shadow={sh} light={!low && i % 2 === 0} />
            ))}

            {/* the gallery between the columns */}
            {GALLERY_ART.map((url, i) => {
                const side = i % 2 === 0 ? -1 : 1;
                const z = [14.8, 14.8, 21.6, 21.6, 24.6, 24.6][i];
                return <Poster key={url} url={url} x={side * (P.x1 - 0.33)} y={2.1} z={z} yaw={side < 0 ? Math.PI / 2 : -Math.PI / 2} w={1.5} h={1.0} m={m} />;
            })}

            {/* the Daily Word and the Offering at the head of the gallery */}
            {(() => {
                const l = solid('daily word lectern');
                return (
                    <At s={l}>
                        <HouseProp model="bedsideTable" fit={{ w: 0.62, h: l.h - 0.15, d: 0.5 }} shadows={sh}>
                            <Block s={l} mat={m.wood} shadow={sh} w={0.6} d={0.5} />
                        </HouseProp>
                        <mesh position={[0, l.h - 0.13, 0]} rotation={[0, 0.3, 0]}>
                            <boxGeometry args={[0.24, 0.02, 0.17]} />
                            <primitive object={m.book} attach="material" />
                        </mesh>
                    </At>
                );
            })()}
            <At s={solid('offering chest')}>
                <HouseProp model="pkChest" fit={{ w: 0.9 }} shadows={sh}>
                    <Block s={solid('offering chest')} mat={m.woodDark} shadow={sh} w={0.9} d={0.7} />
                </HouseProp>
                <mesh position={[0, solid('offering chest').h + 0.25, 0]}>
                    <sphereGeometry args={[0.07, 8, 6]} />
                    <meshBasicMaterial color="#e8c478" toneMapped={false} />
                </mesh>
            </At>
            {/* planters with young pines */}
            {(['gallery planter W', 'gallery planter E', 'gallery planter W2', 'gallery planter E2'] as const).map((n) => {
                const s = solid(n);
                return (
                    <At key={n} s={s}>
                        <mesh position={[0, s.h / 2, 0]} castShadow={sh}>
                            <boxGeometry args={[0.8, s.h, 0.8]} />
                            <primitive object={m.basalt} attach="material" />
                        </mesh>
                        <HouseProp model="nkTreePineRoundA" position={[0, s.h, 0]} fit={{ h: 2.4 }} shadows={sh}>
                            <mesh position={[0, 1.2, 0]}>
                                <coneGeometry args={[0.5, 2.2, 7]} />
                                <primitive object={m.leaf} attach="material" />
                            </mesh>
                        </HouseProp>
                    </At>
                );
            })}

            {/* gallery lights */}
            {!low && [16.0, 23.0, 30.0].map((z) => <pointLight key={z} position={[0, H - 0.8, z]} color="#ffe2bf" intensity={1.1} distance={10} decay={2} />)}

            {/* ── The Overlook: floor to ceiling glass at the end, a balustrade, two benches ── */}
            <group>
                <mesh position={[0, H / 2, O.z1 + WALL_T / 2]}>
                    <boxGeometry args={[O.x1 - O.x0 + WALL_T * 2, H, 0.06]} />
                    <primitive object={glass} attach="material" />
                </mesh>
                {/* gold frame and mullions */}
                {[-3.9, -1.3, 1.3, 3.9].map((x) => (
                    <Box key={x} pos={[x, H / 2, O.z1 + WALL_T / 2]} size={[0.12, H, 0.14]} mat={m.gold} shadow={false} />
                ))}
                <Box pos={[0, H - 0.08, O.z1 + WALL_T / 2]} size={[O.x1 - O.x0 + WALL_T * 2, 0.16, 0.16]} mat={m.gold} shadow={false} />
                <Box pos={[0, 0.08, O.z1 + WALL_T / 2]} size={[O.x1 - O.x0 + WALL_T * 2, 0.16, 0.16]} mat={m.gold} shadow={false} />
                {/* balustrade: rail on the posts the plan reserves */}
                <Box pos={[0, 1.0, 36.35]} size={[6.6, 0.06, 0.08]} mat={m.gold} shadow={false} />
                {[-3, -2, -1, 0, 1, 2, 3].map((x) => (
                    <Box key={x} pos={[x, 0.5, 36.35]} size={[0.06, 1.0, 0.06]} mat={m.metalDark} shadow={false} />
                ))}
                <Bench s={solid('overlook bench W')} m={m} shadow={sh} />
                <Bench s={solid('overlook bench E')} m={m} shadow={sh} />
                {!low && <pointLight position={[0, H - 1, 34]} color="#c9d2ff" intensity={0.9} distance={9} decay={2} />}
                {profile?.sparkles && <Sparkles count={30} scale={[6, 3, 4]} position={[0, 2, 34.5]} size={1.6} speed={0.2} color="#c9c0ff" opacity={0.5} />}
            </group>
        </group>
    );
}

const SOLIDS_GALLERY_COLUMNS = [0, 1, 2, 3].flatMap((i) => [solid(`gallery column W${i}`), solid(`gallery column E${i}`)]);

/* ── A chamber shell: floor, outer walls, ceiling, cove ───────── */

function Shell({
    r,
    floor,
    wall,
    ceiling,
    m,
    sh,
    outerX,
    skylight,
}: {
    r: Rect & { h: number };
    floor: THREE.Material;
    wall: THREE.Material;
    ceiling: THREE.Material;
    m: Mats;
    sh: boolean;
    /** which x wall is the chamber's own (the other is the corridor's) */
    outerX: 'x0' | 'x1';
    /** a round hole in the ceiling, radius */
    skylight?: number;
}) {
    const c = roomCenter(r);
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.012, c.z]} receiveShadow={sh}>
                <planeGeometry args={[w, d]} />
                <primitive object={floor} attach="material" />
            </mesh>
            {/* north + south walls span the chamber and its own outer wall */}
            <WallX z={r.z0 - WALL_T / 2} x0={Math.min(r.x0, r.x0 - (outerX === 'x0' ? WALL_T : 0))} x1={Math.max(r.x1, r.x1 + (outerX === 'x1' ? WALL_T : 0))} h={r.h} mat={wall} shadow={sh} />
            <WallX z={r.z1 + WALL_T / 2} x0={Math.min(r.x0, r.x0 - (outerX === 'x0' ? WALL_T : 0))} x1={Math.max(r.x1, r.x1 + (outerX === 'x1' ? WALL_T : 0))} h={r.h} mat={wall} shadow={sh} />
            <WallZ x={outerX === 'x0' ? r.x0 - WALL_T / 2 : r.x1 + WALL_T / 2} z0={r.z0} z1={r.z1} h={r.h} mat={wall} shadow={sh} />
            {/* ceiling (with a hole if asked) and a cove line */}
            {skylight ? (
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[c.x, r.h, c.z]}>
                    <ringGeometry args={[skylight, Math.hypot(w, d), 40]} />
                    <primitive object={ceiling} attach="material" />
                </mesh>
            ) : (
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[c.x, r.h, c.z]}>
                    <planeGeometry args={[w, d]} />
                    <primitive object={ceiling} attach="material" />
                </mesh>
            )}
            {skylight && (
                <group position={[c.x, r.h, c.z]}>
                    {/* the ring mask hides the ceiling outside the room; a frame around the hole */}
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                        <ringGeometry args={[skylight, skylight + 0.3, 40]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                </group>
            )}
            <Box pos={[c.x, r.h - 0.3, r.z0 + 0.05]} size={[w, 0.06, 0.06]} mat={m.cove} shadow={false} />
            <Box pos={[c.x, r.h - 0.3, r.z1 - 0.05]} size={[w, 0.06, 0.06]} mat={m.cove} shadow={false} />
            <Box pos={[outerX === 'x0' ? r.x0 + 0.05 : r.x1 - 0.05, r.h - 0.3, c.z]} size={[0.06, 0.06, d]} mat={m.cove} shadow={false} />
        </group>
    );
}

/* ── The Cinema ─────────────────────────────────────────────── */

const CINEMA_POSTERS = ['/cineworks/poster1.png', '/cineworks/poster2.png', '/cineworks/poster3.png', '/assets/cutscenes/combat-eden.jpg', '/assets/cutscenes/combat-giza.jpg', '/assets/cutscenes/combat-kolbrin.jpg'];

function Cinema({ m, sh, low }: { m: Mats; sh: boolean; low: boolean }) {
    const r = room('cinema');
    const c = roomCenter(r);
    const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15111c', roughness: 0.95 }), []);
    const benches = useMemo(() => [0, 1, 2, 3].flatMap((row) => [0, 1, 2, 3].map((i) => solid(`cinema bench ${row}${i}`))), []);
    const beam = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!beam.current) return;
        (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(clock.elapsedTime * 7) * 0.012;
    });
    return (
        <group>
            <Shell r={r} floor={m.carpet} wall={m.basalt} ceiling={dark} m={m} sh={sh} outerX="x1" />
            {/* the screen on the east wall, with a timber surround */}
            <group position={[r.x1 - 0.32, 2.95, c.z]} rotation={[0, -Math.PI / 2, 0]}>
                <CinemaScreen w={9.2} h={4.5} low={low} />
                <mesh position={[0, 0, -0.06]}>
                    <planeGeometry args={[9.9, 5.2]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <Box pos={[0, -2.9, 0.1]} size={[10.4, 0.6, 0.3]} mat={m.basalt} shadow={false} />
            </group>
            {/* the projector box high on the back wall and its beam */}
            <Box pos={[r.x0 + 0.5, 4.4, c.z]} size={[0.7, 0.5, 0.6]} mat={m.metalDark} shadow={false} />
            <mesh position={[r.x0 + 0.85, 4.4, c.z]}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
            </mesh>
            <mesh ref={beam} position={[c.x + 0.4, 3.7, c.z]} rotation={[0, 0, -Math.PI / 2 + 0.1]}>
                <coneGeometry args={[2.3, r.x1 - r.x0 - 1.6, 20, 1, true]} />
                <meshBasicMaterial color="#dbe8ff" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {/* benches, the catalog table, the concession stall */}
            {benches.map((s) => (
                <Bench key={s.name} s={s} m={m} shadow={sh} />
            ))}
            {(() => {
                const t = solid('cineworks table');
                return (
                    <At s={t}>
                        <HouseProp model="diningTable" fit={{ w: 1.7, h: t.h, d: 1.3 }} shadows={sh}>
                            <Block s={t} mat={m.wood} shadow={sh} w={1.7} d={1.3} />
                        </HouseProp>
                        {/* posters fanned on the table, and the reel tins */}
                        {[-0.4, 0, 0.4].map((dx, i) => (
                            <mesh key={dx} position={[dx, t.h + 0.015 + i * 0.004, dx * 0.4]} rotation={[-Math.PI / 2, 0, dx * 0.5]}>
                                <planeGeometry args={[0.42, 0.6]} />
                                <primitive object={m.artAsWithin} attach="material" />
                            </mesh>
                        ))}
                        <HouseProp model="fkMug" position={[0.6, t.h, -0.4]} fit={{ w: 0.1 }} shadows={false}>
                            {null}
                        </HouseProp>
                    </At>
                );
            })()}
            <At s={solid('cinema stall')}>
                <HouseProp model="ftStall" fit={{ w: 2.3 }} shadows={sh}>
                    <Block s={solid('cinema stall')} mat={m.woodDark} shadow={sh} w={2.3} d={1.0} />
                </HouseProp>
                <HouseProp model="fkBowl" position={[-0.5, 0.95, 0.25]} fit={{ w: 0.3 }} shadows={false}>
                    {null}
                </HouseProp>
                <HouseProp model="fkPie" position={[0.5, 0.95, 0.2]} fit={{ w: 0.3 }} shadows={false}>
                    {null}
                </HouseProp>
            </At>
            {(['cinema stool A', 'cinema stool B'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="ftStallStool" fit={{ h: 0.5 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={0.4} d={0.4} />
                    </HouseProp>
                </At>
            ))}
            {(['cinema barrel', 'cinema barrel 2'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="skBarrel" fit={{ h: 0.95 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={0.5} d={0.5} />
                    </HouseProp>
                </At>
            ))}
            {/* posters on the north and south walls, banners by the screen */}
            {CINEMA_POSTERS.map((url, i) => {
                const north = i < 3;
                const x = 7.6 + (i % 3) * 3.6;
                return <Poster key={url} url={url} x={x} y={2.0} z={north ? r.z0 + 0.33 : r.z1 - 0.33} yaw={north ? 0 : Math.PI} w={1.3} h={1.85} m={m} />;
            })}
            {[r.z0 + 1.2, r.z1 - 1.2].map((z) => (
                <group key={z} position={[r.x1 - 0.14, 4.2, z]} rotation={[0, -Math.PI / 2, 0]}>
                    <HouseProp model="ftBannerRed" fit={{ h: 1.6 }} shadows={false}>
                        {null}
                    </HouseProp>
                </group>
            ))}
            {/* a dim amber house light either side, and the aisle lights */}
            {!low && (
                <>
                    <pointLight position={[c.x - 2, 4.6, r.z0 + 1.5]} color="#ffb070" intensity={0.55} distance={9} decay={2} />
                    <pointLight position={[c.x - 2, 4.6, r.z1 - 1.5]} color="#ffb070" intensity={0.55} distance={9} decay={2} />
                </>
            )}
            {[8.6, 11.0, 13.4, 15.8].map((x) => (
                <mesh key={x} position={[x, 0.08, c.z]}>
                    <boxGeometry args={[0.1, 0.03, 0.4]} />
                    <meshBasicMaterial color="#ffb070" toneMapped={false} />
                </mesh>
            ))}
        </group>
    );
}

/* ── The Hall Circle ───────────────────────────────────────── */

function HallCircle({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const r = room('hall');
    const flame = useRef<THREE.Mesh>(null);
    const glow = useRef<THREE.PointLight>(null);
    const shaft = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (flame.current) {
            flame.current.scale.y = 1 + Math.sin(t * 9) * 0.16;
            flame.current.rotation.y = t * 0.8;
        }
        if (glow.current) glow.current.intensity = 2.3 + Math.sin(t * 6.3) * 0.5 + Math.sin(t * 11) * 0.2;
        if (shaft.current) (shaft.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + getSky().daylight * 0.06;
    });
    const stones = useMemo(() => Array.from({ length: 9 }, (_, i) => solid(`hall stone ${i}`)), []);
    const benches = useMemo(() => Array.from({ length: 6 }, (_, i) => solid(`hall bench ${i}`)), []);
    return (
        <group>
            <Shell r={r} floor={m.basalt} wall={m.rockFace} ceiling={m.woodDark} m={m} sh={sh} outerX="x0" skylight={2.0} />
            {/* a ring of flagstones around the fire */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIRE.x, 0.02, FIRE.z]} receiveShadow={sh}>
                <ringGeometry args={[1.3, 4.0, 40]} />
                <primitive object={m.cobble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIRE.x, 0.025, FIRE.z]}>
                <ringGeometry args={[3.95, 4.2, 40]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            {/* the council fire: hearth, logs, flame, the smoke shaft to the skylight */}
            <group position={[FIRE.x, 0, FIRE.z]}>
                <mesh position={[0, 0.22, 0]} castShadow={sh}>
                    <cylinderGeometry args={[0.85, 1.05, 0.44, 10]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
                <HouseProp model="campfire" position={[0, 0.44, 0]} fit={{ w: 1.1 }} shadows={sh}>
                    {null}
                </HouseProp>
                <HouseProp model="skCampfireStand" position={[0, 0.44, 0]} fit={{ w: 1.6 }} shadows={sh}>
                    {null}
                </HouseProp>
                <mesh ref={flame} position={[0, 0.82, 0]}>
                    <coneGeometry args={[0.36, 0.74, 7]} />
                    <meshBasicMaterial color="#ffb347" toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.78, 0]} scale={1.5}>
                    <coneGeometry args={[0.36, 0.74, 7]} />
                    <meshBasicMaterial color="#ff8a3d" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
                </mesh>
                {!low && <pointLight ref={glow} position={[0, 1.4, 0]} color="#ff9a4a" intensity={2.3} distance={13} decay={2} />}
                <mesh ref={shaft} position={[0, r.h / 2 + 0.6, 0]}>
                    <cylinderGeometry args={[2.0, 2.6, r.h - 1.2, 20, 1, true]} />
                    <meshBasicMaterial color="#cfc3ff" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
                {profile?.sparkles && <Sparkles count={40} scale={[2.4, 5, 2.4]} position={[0, 3.2, 0]} size={1.4} speed={0.6} color="#ffc27a" opacity={0.6} />}
            </group>
            {/* standing stones, with a banner between every other pair */}
            {stones.map((s, i) => (
                <At key={s.name} s={s}>
                    <HouseProp model={i % 2 ? 'nkRockTallA' : 'nkStoneTallA'} fit={{ h: s.h }} shadows={sh}>
                        <mesh position={[0, s.h / 2, 0]} castShadow={sh}>
                            <boxGeometry args={[1.0, s.h, 0.6]} />
                            <primitive object={m.rockFace} attach="material" />
                        </mesh>
                    </HouseProp>
                </At>
            ))}
            {[0.7, 2.1, 3.5, 4.9].map((a) => (
                <group key={a} position={[FIRE.x + Math.cos(a) * 6.3, 0, FIRE.z + Math.sin(a) * 6.3]} rotation={[0, -a + Math.PI / 2, 0]}>
                    <HouseProp model="ckFlagBannerLong" fit={{ h: 3.6 }} shadows={false}>
                        <mesh position={[0, 1.8, 0]}>
                            <boxGeometry args={[0.07, 3.6, 0.07]} />
                            <primitive object={m.gold} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            ))}
            {benches.map((s) => (
                <Bench key={s.name} s={s} m={m} shadow={sh} />
            ))}
            {(['hall chest', 'hall chest 2'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="skChest" fit={{ w: 0.82 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={0.8} d={0.6} />
                    </HouseProp>
                </At>
            ))}
            {(['hall logs', 'hall logs 2', 'hall logs 3'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="nkLogStackLarge" fit={{ w: 1.0 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={1.0} d={0.7} />
                    </HouseProp>
                </At>
            ))}
            {(['hall bedroll', 'hall bedroll 2'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="skBedroll" fit={{ w: 0.8 }} shadows={false}>
                        <Block s={solid(n)} mat={m.wool} shadow={false} w={0.8} d={1.6} />
                    </HouseProp>
                </At>
            ))}
            {/* the speaker's stone on the far side, a lectern on it */}
            {(() => {
                const s = solid('speaker stone');
                return (
                    <At s={s}>
                        <mesh position={[0, s.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                            <cylinderGeometry args={[1.0, 1.1, s.h, 12]} />
                            <primitive object={m.basalt} attach="material" />
                        </mesh>
                        <mesh position={[0, s.h + 0.02, 0]}>
                            <cylinderGeometry args={[0.95, 0.95, 0.04, 12]} />
                            <primitive object={m.gold} attach="material" />
                        </mesh>
                        <HouseProp model="skSignpostSingle" position={[0, s.h, 0]} rotation={[0, Math.PI / 2, 0]} fit={{ h: 1.4 }} shadows={sh}>
                            {null}
                        </HouseProp>
                    </At>
                );
            })()}
            {!low && <pointLight position={[FIRE.x - 4, r.h - 1, FIRE.z]} color="#ffd2a1" intensity={0.7} distance={10} decay={2} />}
        </group>
    );
}

/* ── The Mirror Well ───────────────────────────────────────── */

function PoolWater({ profile }: { profile?: QualityProfile }) {
    const [near, setNear] = useState(false);
    const t = useRef(0);
    const canReflect = !!profile?.reflections;
    useFrame((_, dt) => {
        if (!canReflect) return;
        t.current += dt;
        if (t.current < 0.5) return;
        t.current = 0;
        const p = getWalkerPose();
        const d = Math.hypot(p.x - POOL.x, p.z - POOL.z);
        if (near && d > 26) setNear(false);
        else if (!near && d < 22) setNear(true);
    });
    if (canReflect && near) {
        return (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.05, POOL.z]}>
                <circleGeometry args={[POOL.r, 40]} />
                <MeshReflectorMaterial
                    resolution={profile?.reflectionResolution ?? 512}
                    mirror={0.7}
                    blur={[260, 80]}
                    mixBlur={0.8}
                    mixStrength={1.6}
                    depthScale={0.8}
                    minDepthThreshold={0.85}
                    maxDepthThreshold={1.15}
                    color="#1c3b54"
                    metalness={0.45}
                    roughness={0.25}
                />
            </mesh>
        );
    }
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.05, POOL.z]}>
            <circleGeometry args={[POOL.r, 32]} />
            <meshStandardMaterial color="#1a3348" roughness={0.2} metalness={0.5} />
        </mesh>
    );
}

function MirrorWell({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const r = room('soul_mirror');
    const c = roomCenter(r);
    const glass = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#9fb4ff',
                transparent: true,
                opacity: 0.14,
                roughness: 0.04,
                metalness: 0.5,
                envMapIntensity: 1.6,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
        [],
    );
    const rocks = useMemo(() => Array.from({ length: 8 }, (_, i) => solid(`pool rock ${i}`)), []);
    return (
        <group>
            <Shell r={r} floor={m.tile} wall={m.tileKitchen} ceiling={m.plaster} m={m} sh={sh} outerX="x1" skylight={3.2} />
            {/* the skylight is glazed: the sky lies on the water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, r.h - 0.02, c.z]}>
                <circleGeometry args={[3.2, 32]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {/* marble around the pool, the gold lip */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.03, POOL.z]} receiveShadow={sh}>
                <ringGeometry args={[POOL.r - 0.1, POOL.r + 1.3, 48]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.045, POOL.z]}>
                <ringGeometry args={[POOL.r - 0.05, POOL.r + 0.12, 48]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <PoolWater profile={profile} />
            {/* lilies on the water */}
            {[
                [1.6, -1.1, 0.4],
                [-2.1, 0.6, 2.1],
                [0.4, 2.4, 4.0],
                [-1.2, -2.6, 1.2],
            ].map(([dx, dz, yaw], i) => (
                <HouseProp key={i} model="nkLilyLarge" position={[POOL.x + dx, 0.06, POOL.z + dz]} rotation={[0, yaw, 0]} fit={{ w: 0.6 }} shadows={false}>
                    {null}
                </HouseProp>
            ))}
            {rocks.map((s) => (
                <At key={s.name} s={s}>
                    <HouseProp model="nkRockLargeA" fit={{ w: 0.9 }} shadows={sh}>
                        <Block s={s} mat={m.rockFace} shadow={sh} w={0.8} d={0.6} />
                    </HouseProp>
                </At>
            ))}
            {/* the ring and the obelisks behind the water, candles on the lip */}
            <At s={solid('well ring')}>
                <HouseProp model="nkStatueRing" fit={{ h: 2.8 }} shadows={sh}>
                    <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <torusGeometry args={[1.1, 0.14, 10, 30]} />
                        <primitive object={m.basalt} attach="material" />
                    </mesh>
                </HouseProp>
                <mesh position={[0, 1.5, 0]}>
                    <sphereGeometry args={[0.22, 14, 10]} />
                    <meshBasicMaterial color="#8b7cff" toneMapped={false} />
                </mesh>
            </At>
            {(['well obelisk N', 'well obelisk S'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="nkStatueObelisk" fit={{ h: 2.4 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.basalt} shadow={sh} w={0.5} d={0.5} />
                    </HouseProp>
                </At>
            ))}
            {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2 + 0.1;
                return (
                    <group key={i} position={[POOL.x + Math.cos(a) * (POOL.r + 0.95), 0.03, POOL.z + Math.sin(a) * (POOL.r + 0.95)]}>
                        <mesh position={[0, 0.12, 0]}>
                            <cylinderGeometry args={[0.035, 0.04, 0.24, 8]} />
                            <primitive object={m.linen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0.3, 0]}>
                            <sphereGeometry args={[0.035, 8, 6]} />
                            <primitive object={m.bulbWarm} attach="material" />
                        </mesh>
                    </group>
                );
            })}
            <Bench s={solid('well bench N')} m={m} shadow={sh} />
            <Bench s={solid('well bench S')} m={m} shadow={sh} />
            {!low && <pointLight position={[POOL.x, 2.2, POOL.z]} color="#a5b4fc" intensity={2.0} distance={13} decay={2} />}
            {!low && <pointLight position={[c.x - 5, r.h - 1, c.z]} color="#ffe2bf" intensity={0.6} distance={9} decay={2} />}
            {profile?.sparkles && <Sparkles count={50} scale={[7, 2, 7]} position={[POOL.x, 1.0, POOL.z]} size={2} speed={0.3} color="#b9c6ff" opacity={0.7} />}
        </group>
    );
}

/* ── The Signal Studio ─────────────────────────────────────── */

function SignalStudio({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const r = room('studio');
    const c = roomCenter(r);
    const neon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#06202a', emissive: '#22d3ee', emissiveIntensity: 1.3, toneMapped: false }), []);
    const onAir = useRef<THREE.Mesh>(null);
    const beacon = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (onAir.current) (onAir.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 2.2) * 0.35;
        if (beacon.current) (beacon.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3.2) * 0.45;
    });
    const desk = solid('studio desk');
    return (
        <group>
            <Shell r={r} floor={m.concrete} wall={m.concrete} ceiling={m.metalDark} m={m} sh={sh} outerX="x0" />
            {/* metal wainscot and a slit window band on the west wall */}
            <Box pos={[r.x0 + 0.05, 0.6, c.z]} size={[0.08, 1.2, r.z1 - r.z0]} mat={m.metalDark} shadow={false} />
            <Box pos={[r.x1 - 0.5, 0.6, r.z1 - 0.05]} size={[r.x1 - r.x0 - 1, 1.2, 0.08]} mat={m.metalDark} shadow={false} />
            {/* the desk: three screens, a console, two chairs */}
            <At s={desk}>
                <mesh position={[0, desk.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                    <boxGeometry args={[3.0, desk.h, 1.0]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, desk.h + 0.015, 0]}>
                    <boxGeometry args={[3.04, 0.03, 1.04]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
                {[-0.95, 0, 0.95].map((x) => (
                    <group key={x} position={[x, desk.h + 0.36, -0.3]} rotation={[-0.1, 0, 0]}>
                        <mesh>
                            <planeGeometry args={[0.8, 0.5]} />
                            <primitive object={m.screen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0, -0.02]}>
                            <boxGeometry args={[0.86, 0.56, 0.03]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </group>
                ))}
                <mesh position={[0, desk.h + 0.04, 0.22]} rotation={[-0.3, 0, 0]}>
                    <boxGeometry args={[1.6, 0.06, 0.34]} />
                    <primitive object={m.black} attach="material" />
                </mesh>
                {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
                    <mesh key={x} position={[x, desk.h + 0.09, 0.2]}>
                        <boxGeometry args={[0.04, 0.02, 0.04]} />
                        <meshBasicMaterial color={x === 0 ? '#ff4d4d' : '#22d3ee'} toneMapped={false} />
                    </mesh>
                ))}
                <HouseProp model="fkMug" position={[1.3, desk.h + 0.03, 0.3]} fit={{ w: 0.1 }} shadows={false}>
                    {null}
                </HouseProp>
                {!low && <pointLight position={[0, 1.4, 0.4]} color="#8ff2ff" intensity={1.1} distance={6} decay={2} />}
            </At>
            {(['studio chair L', 'studio chair R'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="deskChair" fit={{ w: 0.6 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.leather} shadow={sh} w={0.55} d={0.55} />
                    </HouseProp>
                </At>
            ))}
            {/* ON AIR over the desk, a monitor wall behind it */}
            <mesh ref={onAir} position={[c.x, 3.3, r.z0 + 0.1]}>
                <boxGeometry args={[1.6, 0.4, 0.08]} />
                <meshStandardMaterial color="#2a0a0a" emissive="#ff3b3b" emissiveIntensity={1.0} toneMapped={false} />
            </mesh>
            {[-1.6, 0, 1.6].map((dx) =>
                [1.5, 2.5].map((y) => (
                    <group key={`${dx}-${y}`} position={[c.x + dx, y, r.z0 + 0.1]}>
                        <mesh>
                            <planeGeometry args={[1.4, 0.8]} />
                            <primitive object={m.screen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0, -0.03]}>
                            <boxGeometry args={[1.5, 0.9, 0.05]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </group>
                )),
            )}
            {/* neon runs along the ceiling edge */}
            <mesh position={[c.x, r.h - 0.25, r.z0 + 0.06]}>
                <boxGeometry args={[r.x1 - r.x0 - 1, 0.06, 0.04]} />
                <primitive object={neon} attach="material" />
            </mesh>
            <mesh position={[r.x0 + 0.06, r.h - 0.25, c.z]}>
                <boxGeometry args={[0.04, 0.06, r.z1 - r.z0 - 1]} />
                <primitive object={neon} attach="material" />
            </mesh>
            {/* the mast, up through the roof, with its beacon */}
            {(() => {
                const s = solid('studio mast');
                return (
                    <At s={s}>
                        <mesh position={[0, 0.3, 0]}>
                            <cylinderGeometry args={[0.5, 0.6, 0.6, 8]} />
                            <primitive object={m.concrete} attach="material" />
                        </mesh>
                        <mesh position={[0, r.h / 2 + 0.3, 0]}>
                            <cylinderGeometry args={[0.07, 0.12, r.h + 1.2, 6]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                        {[1.6, 2.6, 3.6].map((y) => (
                            <mesh key={y} position={[0, y, 0]} rotation={[0, y, 0]}>
                                <boxGeometry args={[1.2, 0.04, 0.04]} />
                                <primitive object={m.metalDark} attach="material" />
                            </mesh>
                        ))}
                        <mesh ref={beacon} position={[0, r.h + 0.9, 0]}>
                            <sphereGeometry args={[0.14, 8, 6]} />
                            <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={1} />
                        </mesh>
                    </At>
                );
            })()}
            {/* the workshop corner */}
            <At s={solid('studio workbench')}>
                <HouseProp model="skWorkbench" fit={{ w: 1.4 }} shadows={sh}>
                    <Block s={solid('studio workbench')} mat={m.woodDark} shadow={sh} w={1.4} d={1.0} />
                </HouseProp>
            </At>
            {(['studio crate', 'studio crate 2', 'studio crate 3'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="skBoxLarge" fit={{ w: 0.8 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={0.8} d={0.8} />
                    </HouseProp>
                </At>
            ))}
            {(['studio barrel', 'studio barrel 2'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="skBarrel" fit={{ h: 0.95 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={0.5} d={0.5} />
                    </HouseProp>
                </At>
            ))}
            <At s={solid('studio lever')}>
                <HouseProp model="pkLever" fit={{ w: 0.6 }} shadows={sh}>
                    <Block s={solid('studio lever')} mat={m.metalDark} shadow={sh} w={0.5} d={0.4} />
                </HouseProp>
            </At>
            {/* broadcast stills on the south wall */}
            {['/assets/cutscenes/combat-emerald.jpg', '/assets/cutscenes/combat-fair.jpg'].map((url, i) => (
                <Poster key={url} url={url} x={c.x - 3 + i * 6} y={2.1} z={r.z1 - 0.33} yaw={Math.PI} w={1.6} h={1.0} m={m} />
            ))}
            {[r.z0 + 1.0, r.z1 - 1.0].map((z) => (
                <group key={z} position={[r.x0 + 0.14, 3.9, z]} rotation={[0, Math.PI / 2, 0]}>
                    <HouseProp model="ckFlag" fit={{ h: 1.6 }} shadows={false}>
                        {null}
                    </HouseProp>
                </group>
            ))}
            {!low && <pointLight position={[c.x, r.h - 0.9, c.z + 2]} color="#22d3ee" intensity={0.8} distance={12} decay={2} />}
            {profile?.sparkles && <Sparkles count={20} scale={[2, 4, 2]} position={[c.x - 5.6, 3.5, c.z + 4.6]} size={1.4} speed={0.5} color="#9ff3ff" opacity={0.5} />}
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

/* ── All of it ─────────────────────────────────────────────── */

export default function LairWings({ low = false, profile }: { low?: boolean; profile?: QualityProfile }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    // The corridor owns the x walls the chambers share; chambers draw only their own
    void ROOMS;
    return (
        <group>
            <Processional m={m} sh={sh} low={low} profile={profile} />
            <Cinema m={m} sh={sh} low={low} />
            <HallCircle m={m} sh={sh} low={low} profile={profile} />
            <MirrorWell m={m} sh={sh} low={low} profile={profile} />
            <SignalStudio m={m} sh={sh} low={low} profile={profile} />
            {PADS.map((p) => (
                <Spring key={p.id} x={p.x} z={p.z} low={low} />
            ))}
        </group>
    );
}
