'use client';

/**
 * Beyond the arch — the Processional, the Overlook and the four chambers.
 *
 * Walls are boxes hugging each room's floor rectangle (homeMap.ROOMS),
 * split around the doorways (homeMap.DOORS). The corridor owns the walls
 * it shares with the chambers; a wall between two chambers is drawn as
 * two half-thickness slabs, one per room, so no two boxes ever share a
 * face (shared faces are what flickered). Every model-backed prop is
 * drawn by LairProps; this file draws the shells and the bespoke pieces
 * — the fire, the pool, the stage, the studio desk, the mast, planters —
 * and the things that sit on props.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Sparkles, useTexture } from '@react-three/drei';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import HouseProp from './HouseProp';
import CinemaScreen from './CinemaScreen';
import { getSky } from './DayNightCycle';
import { CORRIDOR_WALL_H, DOORS, FIRE, POOL, SCREEN, SOLIDS, WALL_T, room, roomCenter, solid, type Room } from './homeMap';
import { SolidGroup } from './LairProps';
import { PADS } from './worldPads';
import { getWalkerPose } from './walkerPose';
import type { QualityProfile } from './renderQuality';

type Mats = HouseMaterials;

/* ── Building blocks ────────────────────────────────────────── */

function Box({ pos, size, mat, shadow = true, rot }: { pos: [number, number, number]; size: [number, number, number]; mat: THREE.Material; shadow?: boolean; rot?: [number, number, number] }) {
    return (
        <mesh position={pos} rotation={rot} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={size} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

/** A wall along z (constant x) from z0 to z1, with door holes; the wall above each hole stays. */
function WallZ({ x, z0, z1, h, holes = [], mat, shadow, t = WALL_T }: { x: number; z0: number; z1: number; h: number; holes?: { z0: number; z1: number; h: number }[]; mat: THREE.Material; shadow: boolean; t?: number }) {
    const parts: { z0: number; z1: number; y0: number; y1: number }[] = [];
    let cur = z0;
    for (const hole of [...holes].sort((a, b) => a.z0 - b.z0)) {
        if (hole.z0 > cur) parts.push({ z0: cur, z1: hole.z0, y0: 0, y1: h });
        parts.push({ z0: hole.z0, z1: hole.z1, y0: hole.h, y1: h });
        cur = hole.z1;
    }
    if (cur < z1) parts.push({ z0: cur, z1, y0: 0, y1: h });
    return (
        <group>
            {parts.map((p, i) => (p.y1 - p.y0 > 0.01 ? <Box key={i} pos={[x, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2]} size={[t, p.y1 - p.y0, p.z1 - p.z0]} mat={mat} shadow={shadow} /> : null))}
        </group>
    );
}

/** A framed picture. Falls back to a dark panel while the image loads. */
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

function Poster({ url, x, y, z, yaw, w, h, m }: { url: string; x: number; y: number; z: number; yaw: number; w: number; h: number; m: Mats }) {
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
                <boxGeometry args={[w + 0.14, h + 0.14, 0.05]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 0, -0.012]}>
                <boxGeometry args={[w + 0.07, h + 0.07, 0.02]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
        </group>
    );
}

/** A banner that hangs flat against a wall; yaw turns its face into the room. */
function Banner({ x, y, z, yaw, red = true, h = 1.8 }: { x: number; y: number; z: number; yaw: number; red?: boolean; h?: number }) {
    return (
        <group position={[x, y, z]} rotation={[0, yaw, 0]}>
            <HouseProp model={red ? 'ftBannerRed' : 'ftBannerGreen'} fit={{ h }} shadows={false}>
                {null}
            </HouseProp>
        </group>
    );
}

/** Column with marble base, gold capital and a sconce bulb */
function Column({ name, m, shadow }: { name: string; m: Mats; shadow: boolean }) {
    const s = solid(name);
    return (
        <SolidGroup s={s}>
            <HouseProp model="nkStatueColumn" fit={{ w: 0.9, h: s.h - 0.3, d: 0.9 }} shadows={shadow}>
                <mesh position={[0, s.h / 2, 0]} castShadow={shadow}>
                    <cylinderGeometry args={[0.4, 0.46, s.h, 12]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
            </HouseProp>
            <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.24, 12]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh position={[0, s.h - 0.15, 0]}>
                <cylinderGeometry args={[0.5, 0.42, 0.3, 12]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <mesh position={[0, 3.6, 0]}>
                <sphereGeometry args={[0.12, 10, 8]} />
                <primitive object={m.bulbWarm} attach="material" />
            </mesh>
        </SolidGroup>
    );
}

/** A ceiling slab with an optional round skylight hole, at height h over the room. */
function Ceiling({ r, mat, hole = 0 }: { r: Room; mat: THREE.Material; hole?: number }) {
    const c = roomCenter(r);
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const geo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, -d / 2);
        shape.lineTo(w / 2, -d / 2);
        shape.lineTo(w / 2, d / 2);
        shape.lineTo(-w / 2, d / 2);
        shape.lineTo(-w / 2, -d / 2);
        if (hole > 0) {
            const p = new THREE.Path();
            p.absarc(0, 0, hole, 0, Math.PI * 2, true);
            shape.holes.push(p);
        }
        return new THREE.ShapeGeometry(shape, 32);
    }, [w, d, hole]);
    // +π/2 about x: shape y → world z, face points down into the room
    return (
        <group position={[c.x, r.h, c.z]}>
            <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
                <primitive object={mat} attach="material" />
            </mesh>
            {/* the slab's top, so nothing reads as paper from the skylight */}
            <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
                <meshStandardMaterial color="#1c1824" side={THREE.BackSide} />
            </mesh>
        </group>
    );
}

/**
 * A chamber shell: floor, its own north / south / outer walls (half
 * thickness, hugging the room), a ceiling, a cove line. The corridor
 * draws the fourth wall.
 */
function Shell({ r, floor, wall, ceiling, m, sh, outer, hole = 0 }: { r: Room; floor: THREE.Material; wall: THREE.Material; ceiling: THREE.Material; m: Mats; sh: boolean; outer: 'x0' | 'x1'; hole?: number }) {
    const c = roomCenter(r);
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const t = WALL_T / 2;
    const xa = outer === 'x0' ? r.x0 - t : r.x0;
    const xb = outer === 'x1' ? r.x1 + t : r.x1;
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0, c.z]} receiveShadow={sh}>
                <planeGeometry args={[w, d]} />
                <primitive object={floor} attach="material" />
            </mesh>
            <Box pos={[(xa + xb) / 2, r.h / 2, r.z0 - t / 2]} size={[xb - xa, r.h, t]} mat={wall} shadow={sh} />
            <Box pos={[(xa + xb) / 2, r.h / 2, r.z1 + t / 2]} size={[xb - xa, r.h, t]} mat={wall} shadow={sh} />
            <Box pos={[outer === 'x0' ? r.x0 - t / 2 : r.x1 + t / 2, r.h / 2, c.z]} size={[t, r.h, d]} mat={wall} shadow={sh} />
            <Ceiling r={r} mat={ceiling} hole={hole} />
            {/* skirting and a cove line on the three walls the chamber owns */}
            <Box pos={[c.x, 0.09, r.z0 + 0.04]} size={[w, 0.18, 0.08]} mat={m.basalt} shadow={false} />
            <Box pos={[c.x, 0.09, r.z1 - 0.04]} size={[w, 0.18, 0.08]} mat={m.basalt} shadow={false} />
            <Box pos={[c.x, r.h - 0.35, r.z0 + 0.05]} size={[w, 0.07, 0.06]} mat={m.cove} shadow={false} />
            <Box pos={[c.x, r.h - 0.35, r.z1 - 0.05]} size={[w, 0.07, 0.06]} mat={m.cove} shadow={false} />
            <Box pos={[outer === 'x0' ? r.x0 + 0.05 : r.x1 - 0.05, r.h - 0.35, c.z]} size={[0.06, 0.07, d]} mat={m.cove} shadow={false} />
        </group>
    );
}

/* ── The Processional + the Overlook ───────────────────────── */

const GALLERY_ART: { url: string; z: number; side: -1 | 1 }[] = [
    { url: '/assets/cutscenes/cutscene-world-crossroads.jpg', z: 19.2, side: -1 },
    { url: '/assets/cutscenes/dest-giza.jpg', z: 19.2, side: 1 },
    { url: '/assets/cutscenes/dest-kolbrin.jpg', z: 36.8, side: -1 },
    { url: '/assets/cutscenes/dest-emerald.jpg', z: 36.8, side: 1 },
    { url: '/assets/cutscenes/dest-fair.jpg', z: 56.0, side: -1 },
    { url: '/brand/keyart-return-source.jpg', z: 56.0, side: 1 },
];

function Processional({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const P = room('processional');
    const O = room('overlook');
    const z0 = P.z0;
    const z1 = O.z1;
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    const half = P.x1;
    const H = P.h;
    const glass = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.5, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }),
        [],
    );
    const skylight = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (!skylight.current) return;
        (skylight.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + getSky().daylight * 0.05;
    });
    const holes = (side: 'e' | 'w') => DOORS.filter((d) => d.side === side).map((d) => ({ z0: d.rect.z0, z1: d.rect.z1, h: d.h }));
    const columns = useMemo(() => SOLIDS.filter((s) => s.name.startsWith('gallery column')).map((s) => s.name), []);
    const planters = useMemo(() => SOLIDS.filter((s) => s.name.startsWith('gallery planter')), []);

    return (
        <group>
            {/* floor: marble, a long runner, gold borders */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zc]} receiveShadow={sh}>
                <planeGeometry args={[half * 2, len]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, (z0 + P.z1) / 2 + 0.4]} receiveShadow={sh}>
                <planeGeometry args={[2.8, P.z1 - z0 - 1.6]} />
                <primitive object={m.rug} attach="material" />
            </mesh>
            {[-1.46, 1.46].map((x) => (
                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.024, (z0 + P.z1) / 2 + 0.4]}>
                    <planeGeometry args={[0.1, P.z1 - z0 - 1.6]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
            ))}

            {/* side walls, pierced by the chamber doors; tall enough to meet every chamber ceiling */}
            <WallZ x={half + WALL_T / 2} z0={z0} z1={z1 + WALL_T} h={CORRIDOR_WALL_H} holes={holes('e')} mat={m.plaster} shadow={sh} />
            <WallZ x={-half - WALL_T / 2} z0={z0} z1={z1 + WALL_T} h={CORRIDOR_WALL_H} holes={holes('w')} mat={m.plaster} shadow={sh} />
            {DOORS.map((d, i) => {
                const zc2 = (d.rect.z0 + d.rect.z1) / 2;
                const wd = d.rect.z1 - d.rect.z0;
                const xin = d.side === 'e' ? half - 0.02 : -half + 0.02;
                const xout = d.side === 'e' ? half + WALL_T + 0.02 : -half - WALL_T - 0.02;
                return (
                    <group key={d.id}>
                        {/* threshold */}
                        <Box pos={[(d.rect.x0 + d.rect.x1) / 2, 0.012, zc2]} size={[WALL_T, 0.024, wd]} mat={m.basalt} shadow={false} />
                        {/* gold frame on both faces */}
                        {[xin, xout].map((x) => (
                            <group key={x} position={[x, 0, zc2]}>
                                <Box pos={[0, d.h / 2, -(wd / 2 + 0.09)]} size={[0.06, d.h, 0.18]} mat={m.gold} shadow={false} />
                                <Box pos={[0, d.h / 2, wd / 2 + 0.09]} size={[0.06, d.h, 0.18]} mat={m.gold} shadow={false} />
                                <Box pos={[0, d.h + 0.09, 0]} size={[0.06, 0.18, wd + 0.36]} mat={m.gold} shadow={false} />
                            </group>
                        ))}
                        {/* a banner over each door, gallery side */}
                        <Banner x={d.side === 'e' ? half - 0.12 : -half + 0.12} y={d.h + 0.5} z={zc2} yaw={0} red={i % 2 === 0} h={1.8} />
                    </group>
                );
            })}

            {/* skirting and a cove line along both walls */}
            {[-half + 0.04, half - 0.04].map((x) => (
                <group key={x}>
                    <Box pos={[x, 0.09, zc]} size={[0.08, 0.18, len]} mat={m.basalt} shadow={false} />
                    <Box pos={[x, H - 0.4, zc]} size={[0.06, 0.08, len]} mat={m.cove} shadow={false} />
                </group>
            ))}

            {/* ceiling: two timber halves, a glass skylight down the middle, beams across */}
            {[-1, 1].map((s) => (
                <Box key={s} pos={[s * ((half - 1.2) / 2 + 1.2), H + 0.1, zc]} size={[half - 1.2 + WALL_T, 0.2, len]} mat={m.woodDark} shadow={sh} />
            ))}
            <mesh position={[0, H + 0.1, zc]}>
                <boxGeometry args={[2.4, 0.06, len]} />
                <primitive object={glass} attach="material" />
            </mesh>
            <mesh ref={skylight} position={[0, H / 2, zc]}>
                <boxGeometry args={[2.4, H, len]} />
                <meshBasicMaterial color="#d7ccff" transparent opacity={0.03} depthWrite={false} toneMapped={false} />
            </mesh>
            {Array.from({ length: Math.floor(len / 4) }, (_, i) => z0 + 2 + i * 4).map((z) => (
                <group key={z}>
                    <Box pos={[0, H - 0.16, z]} size={[half * 2, 0.3, 0.3]} mat={m.woodDark} shadow={false} />
                    <Box pos={[0, H - 0.02, z]} size={[half * 2 + 0.1, 0.04, 0.34]} mat={m.gold} shadow={false} />
                </group>
            ))}

            {columns.map((n) => (
                <Column key={n} name={n} m={m} shadow={sh} />
            ))}

            {/* the gallery: stills between the columns */}
            {GALLERY_ART.map((a) => (
                <Poster key={a.url} url={a.url} x={a.side * (half - 0.33)} y={2.7} z={a.z} yaw={a.side < 0 ? Math.PI / 2 : -Math.PI / 2} w={2.0} h={1.3} m={m} />
            ))}

            {/* the Daily Word's paper; the Offering's glow */}
            <SolidGroup s="daily word lectern">
                <mesh position={[0, 0.82, 0]} rotation={[0, 0.3, 0]}>
                    <boxGeometry args={[0.26, 0.02, 0.18]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </SolidGroup>
            <SolidGroup s="offering chest">
                <mesh position={[0, 1.1, 0]}>
                    <sphereGeometry args={[0.08, 10, 8]} />
                    <meshBasicMaterial color="#e8c478" toneMapped={false} />
                </mesh>
            </SolidGroup>

            {/* planters with young pines */}
            {planters.map((s) => (
                <SolidGroup key={s.name} s={s}>
                    <mesh position={[0, s.h / 2, 0]} castShadow={sh}>
                        <boxGeometry args={[s.w, s.h, s.d]} />
                        <primitive object={m.basalt} attach="material" />
                    </mesh>
                    <mesh position={[0, s.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[s.w - 0.12, s.d - 0.12]} />
                        <primitive object={m.dirt} attach="material" />
                    </mesh>
                    <HouseProp model="nkTreePineRoundA" position={[0, s.h, 0]} fit={{ h: 2.6 }} shadows={sh}>
                        <mesh position={[0, 1.3, 0]}>
                            <coneGeometry args={[0.45, 2.4, 7]} />
                            <primitive object={m.leaf} attach="material" />
                        </mesh>
                    </HouseProp>
                </SolidGroup>
            ))}

            {/* gallery light */}
            {[22, 33, 44].filter((z) => !low || z !== 33).map((z) => <pointLight key={z} position={[0, H - 1.0, z]} color="#ffe2bf" intensity={low ? 2.6 : 2.0} distance={low ? 20 : 16} decay={2} />)}

            {/* ── The Overlook: floor-to-ceiling glass at the end, a balustrade ── */}
            <mesh position={[0, H / 2, z1 + WALL_T / 2]}>
                <boxGeometry args={[half * 2 + WALL_T * 2, H, 0.06]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {[-3.3, -1.1, 1.1, 3.3].map((x) => (
                <Box key={x} pos={[x, H / 2, z1 + WALL_T / 2]} size={[0.14, H, 0.16]} mat={m.gold} shadow={false} />
            ))}
            <Box pos={[0, H - 0.08, z1 + WALL_T / 2]} size={[half * 2 + WALL_T * 2, 0.16, 0.18]} mat={m.gold} shadow={false} />
            <Box pos={[0, 0.08, z1 + WALL_T / 2]} size={[half * 2 + WALL_T * 2, 0.16, 0.18]} mat={m.gold} shadow={false} />
            {(() => {
                const b = solid('balustrade');
                return (
                    <SolidGroup s={b}>
                        <Box pos={[0, 1.0, 0]} size={[b.w, 0.07, 0.1]} mat={m.gold} shadow={false} />
                        <Box pos={[0, 0.06, 0]} size={[b.w, 0.12, b.d]} mat={m.basalt} shadow={false} />
                        {Array.from({ length: 10 }, (_, i) => -b.w / 2 + 0.3 + i * ((b.w - 0.6) / 9)).map((x) => (
                            <Box key={x} pos={[x, 0.52, 0]} size={[0.07, 0.92, 0.07]} mat={m.metalDark} shadow={false} />
                        ))}
                    </SolidGroup>
                );
            })()}
            {!low && <pointLight position={[0, H - 1.2, 57.5]} color="#c9d2ff" intensity={1.4} distance={12} decay={2} />}
            {profile?.sparkles && <Sparkles count={40} scale={[9, 4, 6]} position={[0, 2.4, 58.5]} size={1.6} speed={0.2} color="#c9c0ff" opacity={0.5} />}
        </group>
    );
}

/* ── The Cinema ─────────────────────────────────────────────── */

const CINEMA_POSTERS = [
    '/cineworks/poster3.png',
    '/images/destroyer-globe.png',
    '/images/aether_bg.png',
    '/assets/cutscenes/dest-giza.jpg',
    '/assets/cutscenes/dest-kolbrin.jpg',
    '/assets/cutscenes/dest-emerald.jpg',
    '/assets/cutscenes/dest-fair.jpg',
    '/brand/bg-portal.jpg',
];

function Cinema({ m, sh, low }: { m: Mats; sh: boolean; low: boolean }) {
    const r = room('cinema');
    const c = roomCenter(r);
    const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15111c', roughness: 0.95 }), []);
    /**
     * The projector beam: brightest at the lens, gone a metre before the
     * screen, thin at its silhouette — dust in a light, not a grey cone.
     * (A flat additive cone composited in linear light read as a veil
     * over the whole screen on the desktop tiers.)
     */
    const beamMat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: { uColor: { value: new THREE.Color('#a9c2ee') }, uK: { value: 0.04 } },
                vertexShader: `
                    varying float vAlong;
                    varying float vFacing;
                    void main() {
                        vAlong = uv.y;
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        vec3 n = normalize(normalMatrix * normal);
                        vFacing = abs(dot(n, normalize(-mv.xyz)));
                        gl_Position = projectionMatrix * mv;
                    }`,
                fragmentShader: `
                    uniform vec3 uColor;
                    uniform float uK;
                    varying float vAlong;
                    varying float vFacing;
                    void main() {
                        float along = smoothstep(0.08, 0.9, vAlong);
                        float a = uK * along * along * pow(vFacing, 2.0);
                        gl_FragColor = vec4(uColor * a, 1.0);
                    }`,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                toneMapped: false,
                fog: false,
            }),
        [],
    );
    useFrame(({ clock }) => {
        beamMat.uniforms.uK.value = (low ? 0.045 : 0.04) * (1 + Math.sin(clock.elapsedTime * 7) * 0.12);
    });
    const stage = solid('cinema stage');
    const beamLen = SCREEN.x - (r.x0 + 0.9);
    return (
        <group>
            <Shell r={r} floor={m.carpet} wall={m.basalt} ceiling={dark} m={m} sh={sh} outer="x1" />
            {/* acoustic panels down both long walls */}
            {[r.z0 + 0.06, r.z1 - 0.06].map((z) =>
                [8.4, 12.0, 15.6, 19.2, 22.8].map((x) => <Box key={`${z}-${x}`} pos={[x, 4.8, z]} size={[2.6, 1.6, 0.08]} mat={m.fabric} shadow={false} />),
            )}
            {/* the screen, its surround, a gold proscenium */}
            <group position={[SCREEN.x, SCREEN.y, SCREEN.z]} rotation={[0, -Math.PI / 2, 0]}>
                <CinemaScreen w={SCREEN.w} h={SCREEN.h} low={low} />
                <mesh position={[0, 0, -0.06]}>
                    <planeGeometry args={[SCREEN.w + 0.8, SCREEN.h + 0.8]} />
                    <primitive object={m.black} attach="material" />
                </mesh>
                <Box pos={[0, SCREEN.h / 2 + 0.5, 0.05]} size={[SCREEN.w + 1.4, 0.24, 0.12]} mat={m.gold} shadow={false} />
                <Box pos={[-(SCREEN.w / 2 + 0.6), 0, 0.05]} size={[0.24, SCREEN.h + 1.0, 0.12]} mat={m.gold} shadow={false} />
                <Box pos={[SCREEN.w / 2 + 0.6, 0, 0.05]} size={[0.24, SCREEN.h + 1.0, 0.12]} mat={m.gold} shadow={false} />
            </group>
            {/* the stage under it */}
            <SolidGroup s={stage}>
                <Box pos={[0, stage.h / 2, 0]} size={[stage.w, stage.h, stage.d]} mat={m.basalt} shadow={sh} />
                <Box pos={[-stage.w / 2 - 0.01, stage.h - 0.04, 0]} size={[0.04, 0.08, stage.d]} mat={m.gold} shadow={false} />
            </SolidGroup>
            {/* the projector box high on the back wall, and its beam */}
            <Box pos={[r.x0 + 0.5, 6.4, c.z]} size={[0.8, 0.55, 0.7]} mat={m.metalDark} shadow={false} />
            <mesh position={[r.x0 + 0.92, 6.4, c.z]}>
                <sphereGeometry args={[0.11, 8, 6]} />
                <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
            </mesh>
            <mesh position={[r.x0 + 0.9 + beamLen / 2, (6.4 + SCREEN.y) / 2, c.z]} rotation={[0, 0, Math.PI / 2 - Math.atan2(6.4 - SCREEN.y, beamLen)]} material={beamMat}>
                <coneGeometry args={[SCREEN.h / 2, Math.hypot(beamLen, 6.4 - SCREEN.y), 32, 1, true]} />
            </mesh>
            {/* the catalog table: posters fanned, a mug */}
            <SolidGroup s="cineworks table">
                {[-0.5, 0, 0.5].map((dx, i) => (
                    <mesh key={dx} position={[dx, 0.81 + i * 0.004, dx * 0.3]} rotation={[-Math.PI / 2, 0, dx * 0.5]}>
                        <planeGeometry args={[0.46, 0.66]} />
                        <primitive object={m.artAsWithin} attach="material" />
                    </mesh>
                ))}
                <HouseProp model="fkMug" position={[0.65, 0.8, -0.4]} fit={{ w: 0.1 }} shadows={false}>
                    {null}
                </HouseProp>
            </SolidGroup>
            {/* something on the stall's counter */}
            <SolidGroup s="cinema stall">
                <HouseProp model="fkBowl" position={[0, 0.9, -0.6]} fit={{ w: 0.32 }} shadows={false}>
                    {null}
                </HouseProp>
                <HouseProp model="fkPie" position={[0, 0.9, 0.5]} fit={{ w: 0.32 }} shadows={false}>
                    {null}
                </HouseProp>
            </SolidGroup>
            {/* posters down both long walls, banners either side of the screen */}
            {CINEMA_POSTERS.map((url, i) => {
                const north = i < 4;
                const x = 9.6 + (i % 4) * 4.0;
                return <Poster key={url} url={url} x={x} y={2.3} z={north ? r.z0 + 0.36 : r.z1 - 0.36} yaw={north ? 0 : Math.PI} w={1.3} h={1.85} m={m} />;
            })}
            {[c.z - 7.4, c.z + 7.4].map((z, i) => (
                <Banner key={z} x={r.x1 - 0.14} y={4.6} z={z} yaw={0} red={i === 0} h={2.4} />
            ))}
            {/* aisle lights */}
            {[11.2, 13.6, 16.0, 18.4].map((x) => (
                <mesh key={x} position={[x, 0.03, c.z]}>
                    <boxGeometry args={[0.12, 0.04, 0.5]} />
                    <meshBasicMaterial color="#ffb070" toneMapped={false} />
                </mesh>
            ))}
            {low ? (
                <pointLight position={[c.x - 3, 6.8, c.z]} color="#ffb070" intensity={2.2} distance={20} decay={2} />
            ) : (
                <>
                    <pointLight position={[c.x - 3, 7.2, r.z0 + 2]} color="#ffb070" intensity={1.0} distance={12} decay={2} />
                    <pointLight position={[c.x - 3, 7.2, r.z1 - 2]} color="#ffb070" intensity={1.0} distance={12} decay={2} />
                </>
            )}
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
        if (glow.current) glow.current.intensity = 3.2 + Math.sin(t * 6.3) * 0.6 + Math.sin(t * 11) * 0.25;
        if (shaft.current) (shaft.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + getSky().daylight * 0.06;
    });
    const fire = solid('council fire');
    const speaker = solid('speaker stone');
    return (
        <group>
            <Shell r={r} floor={m.basalt} wall={m.rockFace} ceiling={m.woodDark} m={m} sh={sh} outer="x0" hole={2.8} />
            {/* flagstones around the fire, a gold ring at the bench line */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIRE.x, 0.008, FIRE.z]} receiveShadow={sh}>
                <ringGeometry args={[1.2, 4.8, 48]} />
                <primitive object={m.cobble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIRE.x, 0.016, FIRE.z]}>
                <ringGeometry args={[4.8, 5.05, 48]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            {/* the council fire */}
            <SolidGroup s={fire}>
                <mesh position={[0, 0.22, 0]} castShadow={sh}>
                    <cylinderGeometry args={[fire.w / 2 - 0.15, fire.w / 2, 0.44, 12]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
                <HouseProp model="campfire" position={[0, 0.44, 0]} fit={{ w: 1.2 }} shadows={sh}>
                    {null}
                </HouseProp>
                <HouseProp model="skCampfireStand" position={[0, 0.44, 0]} fit={{ w: 1.7 }} shadows={sh}>
                    {null}
                </HouseProp>
                <mesh ref={flame} position={[0, 0.84, 0]}>
                    <coneGeometry args={[0.4, 0.82, 7]} />
                    <meshBasicMaterial color="#ffb347" toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.8, 0]} scale={1.5}>
                    <coneGeometry args={[0.4, 0.82, 7]} />
                    <meshBasicMaterial color="#ff8a3d" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
                </mesh>
                <pointLight ref={glow} position={[0, 1.5, 0]} color="#ff9a4a" intensity={3.2} distance={low ? 20 : 16} decay={2} userData={{ noLampDim: true }} />
                <mesh ref={shaft} position={[0, r.h / 2 + 0.6, 0]}>
                    <cylinderGeometry args={[2.8, 3.4, r.h - 1.2, 24, 1, true]} />
                    <meshBasicMaterial color="#cfc3ff" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
                {profile?.sparkles && <Sparkles count={50} scale={[2.6, 6, 2.6]} position={[0, 3.6, 0]} size={1.4} speed={0.6} color="#ffc27a" opacity={0.6} />}
            </SolidGroup>
            {/* banners between the stones */}
            {[0, 2, 4, 6].map((k) => {
                const a = 0.35 + (k + 0.5) * ((Math.PI * 2) / 9);
                return (
                    <group key={k} position={[FIRE.x + Math.cos(a) * 6.4, 0, FIRE.z + Math.sin(a) * 6.4]} rotation={[0, -a, 0]}>
                        <HouseProp model="ckFlagBannerLong" fit={{ h: 3.8 }} shadows={false}>
                            <mesh position={[0, 1.9, 0]}>
                                <boxGeometry args={[0.07, 3.8, 0.07]} />
                                <primitive object={m.gold} attach="material" />
                            </mesh>
                        </HouseProp>
                    </group>
                );
            })}
            {/* the speaker's stone on the far side */}
            <SolidGroup s={speaker}>
                <mesh position={[0, speaker.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                    <cylinderGeometry args={[speaker.w / 2 - 0.06, speaker.w / 2, speaker.h, 14]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
                <mesh position={[0, speaker.h + 0.02, 0]}>
                    <cylinderGeometry args={[speaker.w / 2 - 0.1, speaker.w / 2 - 0.1, 0.04, 14]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                <HouseProp model="skSignpostSingle" position={[0, speaker.h, 0]} rotation={[0, Math.PI / 2, 0]} fit={{ h: 1.4 }} shadows={sh}>
                    {null}
                </HouseProp>
            </SolidGroup>
            {/* tapestries on the long walls */}
            {[r.z0 + 0.2, r.z1 - 0.2].map((z, i) =>
                [-22.2, -10.2].map((x) => <Banner key={`${z}-${x}`} x={x} y={5.4} z={z} yaw={i === 0 ? Math.PI / 2 : -Math.PI / 2} red={x < -16} h={3.0} />),
            )}
            {!low && <pointLight position={[FIRE.x - 5, r.h - 1.4, FIRE.z]} color="#ffd2a1" intensity={1.0} distance={13} decay={2} />}
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
        if (near && d > 28) setNear(false);
        else if (!near && d < 24) setNear(true);
    });
    if (canReflect && near) {
        return (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.05, POOL.z]}>
                <circleGeometry args={[POOL.r, 48]} />
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
            <circleGeometry args={[POOL.r, 40]} />
            <meshStandardMaterial color="#1a3348" roughness={0.2} metalness={0.5} />
        </mesh>
    );
}

function MirrorWell({ m, sh, low, profile }: { m: Mats; sh: boolean; low: boolean; profile?: QualityProfile }) {
    const r = room('soul_mirror');
    const c = roomCenter(r);
    const glass = useMemo(
        () => new THREE.MeshStandardMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.5, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }),
        [],
    );
    return (
        <group>
            <Shell r={r} floor={m.tile} wall={m.tileKitchen} ceiling={m.plaster} m={m} sh={sh} outer="x1" hole={3.6} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, r.h + 0.02, c.z]}>
                <circleGeometry args={[3.6, 32]} />
                <primitive object={glass} attach="material" />
            </mesh>
            {/* marble around the pool, the gold lip, the water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.008, POOL.z]} receiveShadow={sh}>
                <ringGeometry args={[POOL.r, POOL.r + 1.6, 56]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, 0.016, POOL.z]}>
                <ringGeometry args={[POOL.r - 0.04, POOL.r + 0.16, 56]} />
                <primitive object={m.gold} attach="material" />
            </mesh>
            <PoolWater profile={profile} />
            {[
                [1.9, -1.4, 0.4],
                [-2.6, 0.8, 2.1],
                [0.5, 3.0, 4.0],
                [-1.5, -3.2, 1.2],
                [3.1, 1.6, 5.1],
            ].map(([dx, dz, yaw], i) => (
                <HouseProp key={i} model="nkLilyLarge" position={[POOL.x + dx, 0.06, POOL.z + dz]} rotation={[0, yaw, 0]} fit={{ w: 0.7 }} shadows={false}>
                    {null}
                </HouseProp>
            ))}
            {/* candles between the rim rocks */}
            {Array.from({ length: 10 }, (_, i) => {
                const a = 0.31 + (i + 0.5) * ((Math.PI * 2) / 10);
                return (
                    <group key={i} position={[POOL.x + Math.cos(a) * (POOL.r + 0.7), 0, POOL.z + Math.sin(a) * (POOL.r + 0.7)]}>
                        <mesh position={[0, 0.13, 0]}>
                            <cylinderGeometry args={[0.04, 0.045, 0.26, 8]} />
                            <primitive object={m.linen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0.32, 0]}>
                            <sphereGeometry args={[0.04, 8, 6]} />
                            <primitive object={m.bulbWarm} attach="material" />
                        </mesh>
                    </group>
                );
            })}
            {/* the ring's orb */}
            <SolidGroup s="well ring">
                <mesh position={[0, 1.7, 0]}>
                    <sphereGeometry args={[0.26, 16, 12]} />
                    <meshBasicMaterial color="#8b7cff" toneMapped={false} />
                </mesh>
            </SolidGroup>
            <pointLight position={[POOL.x, 2.4, POOL.z]} color="#a5b4fc" intensity={low ? 3.2 : 2.6} distance={low ? 20 : 15} decay={2} userData={{ noLampDim: true }} />
            {!low && <pointLight position={[c.x - 6, r.h - 1.2, c.z]} color="#ffe2bf" intensity={0.9} distance={11} decay={2} />}
            {profile?.sparkles && <Sparkles count={60} scale={[9, 2, 9]} position={[POOL.x, 1.0, POOL.z]} size={2} speed={0.3} color="#b9c6ff" opacity={0.7} />}
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
    const mast = solid('studio mast');
    return (
        <group>
            <Shell r={r} floor={m.concrete} wall={m.concrete} ceiling={m.metalDark} m={m} sh={sh} outer="x0" />
            <Box pos={[r.x0 + 0.06, 0.65, c.z]} size={[0.1, 1.3, r.z1 - r.z0]} mat={m.metalDark} shadow={false} />
            {/* the desk: three screens toward the chairs, a console, a mug */}
            <SolidGroup s={desk}>
                <mesh position={[0, desk.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                    <boxGeometry args={[desk.w, desk.h, desk.d]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, desk.h + 0.015, 0]}>
                    <boxGeometry args={[desk.w + 0.04, 0.03, desk.d + 0.04]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
                {[-1.0, 0, 1.0].map((x) => (
                    <group key={x} position={[x, desk.h + 0.4, -0.3]} rotation={[-0.1, 0, 0]}>
                        <mesh>
                            <planeGeometry args={[0.86, 0.52]} />
                            <primitive object={m.screen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0, -0.02]}>
                            <boxGeometry args={[0.92, 0.58, 0.03]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </group>
                ))}
                <mesh position={[0, desk.h + 0.05, 0.24]} rotation={[-0.3, 0, 0]}>
                    <boxGeometry args={[1.8, 0.06, 0.36]} />
                    <primitive object={m.black} attach="material" />
                </mesh>
                {[-0.7, -0.35, 0, 0.35, 0.7].map((x) => (
                    <mesh key={x} position={[x, desk.h + 0.1, 0.22]}>
                        <boxGeometry args={[0.05, 0.02, 0.05]} />
                        <meshBasicMaterial color={x === 0 ? '#ff4d4d' : '#22d3ee'} toneMapped={false} />
                    </mesh>
                ))}
                <HouseProp model="fkMug" position={[1.4, desk.h + 0.03, 0.3]} fit={{ w: 0.1 }} shadows={false}>
                    {null}
                </HouseProp>
                {!low && <pointLight position={[0, 1.5, 0.5]} color="#8ff2ff" intensity={1.3} distance={7} decay={2} />}
            </SolidGroup>
            {/* ON AIR, the monitor wall on the north wall */}
            <mesh ref={onAir} position={[c.x, 4.6, r.z0 + 0.1]}>
                <boxGeometry args={[2.0, 0.5, 0.08]} />
                <meshStandardMaterial color="#2a0a0a" emissive="#ff3b3b" emissiveIntensity={1.0} toneMapped={false} />
            </mesh>
            {[-2.4, -0.8, 0.8, 2.4].map((dx) =>
                [1.7, 2.9].map((y) => (
                    <group key={`${dx}-${y}`} position={[c.x + dx, y, r.z0 + 0.1]}>
                        <mesh>
                            <planeGeometry args={[1.4, 0.95]} />
                            <primitive object={m.screen} attach="material" />
                        </mesh>
                        <mesh position={[0, 0, -0.03]}>
                            <boxGeometry args={[1.5, 1.05, 0.05]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </group>
                )),
            )}
            {/* neon along the ceiling edge */}
            <mesh position={[c.x, r.h - 0.3, r.z0 + 0.06]}>
                <boxGeometry args={[r.x1 - r.x0 - 1, 0.06, 0.04]} />
                <primitive object={neon} attach="material" />
            </mesh>
            <mesh position={[r.x0 + 0.06, r.h - 0.3, c.z]}>
                <boxGeometry args={[0.04, 0.06, r.z1 - r.z0 - 1]} />
                <primitive object={neon} attach="material" />
            </mesh>
            <mesh position={[c.x, r.h - 0.3, r.z1 - 0.06]}>
                <boxGeometry args={[r.x1 - r.x0 - 1, 0.06, 0.04]} />
                <primitive object={neon} attach="material" />
            </mesh>
            {/* the mast, base to ceiling, beacon at the top */}
            <SolidGroup s={mast}>
                <mesh position={[0, 0.3, 0]}>
                    <cylinderGeometry args={[mast.w / 2, mast.w / 2 + 0.06, 0.6, 10]} />
                    <primitive object={m.concrete} attach="material" />
                </mesh>
                <mesh position={[0, r.h / 2, 0]}>
                    <cylinderGeometry args={[0.07, 0.12, r.h, 6]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                {[1.8, 3.0, 4.2, 5.4].map((y) => (
                    <mesh key={y} position={[0, y, 0]} rotation={[0, y, 0]}>
                        <boxGeometry args={[1.3, 0.04, 0.04]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                ))}
                <mesh ref={beacon} position={[0, r.h - 0.5, 0]}>
                    <sphereGeometry args={[0.16, 8, 6]} />
                    <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={1} />
                </mesh>
            </SolidGroup>
            {/* broadcast stills on the south wall, flags on the west */}
            {['/assets/cutscenes/dest-emerald.jpg', '/images/destroyer-globe.png', '/brand/keyart-return-source.jpg'].map((url, i) => (
                <Poster key={url} url={url} x={c.x - 5.4 + i * 5.4} y={2.6} z={r.z1 - 0.36} yaw={Math.PI} w={2.0} h={1.25} m={m} />
            ))}
            {[r.z0 + 1.4, r.z1 - 1.4].map((z) => (
                <group key={z} position={[r.x0 + 0.16, 4.4, z]} rotation={[0, 0, 0]}>
                    <HouseProp model="ckFlag" fit={{ h: 1.8 }} shadows={false}>
                        {null}
                    </HouseProp>
                </group>
            ))}
            <pointLight position={[c.x, r.h - 1.0, c.z + 3]} color={low ? '#bfe9f2' : '#22d3ee'} intensity={low ? 2.2 : 1.1} distance={low ? 20 : 14} decay={2} />
            {profile?.sparkles && <Sparkles count={24} scale={[2, 5, 2]} position={[mast.x, 3.6, mast.z]} size={1.4} speed={0.5} color="#9ff3ff" opacity={0.5} />}
        </group>
    );
}

/* ── Aether springs ─────────────────────────────────────────── */

function Spring({ x, z, low }: { x: number; z: number; low: boolean }) {
    const ringRef = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ringRef.current) return;
        const s = 1 + Math.sin(clock.elapsedTime * 2.6) * 0.08;
        ringRef.current.scale.set(s, s, 1);
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
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
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
