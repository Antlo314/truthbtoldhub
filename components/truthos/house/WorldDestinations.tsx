'use client';

/**
 * The destinations — the Hut's stations, moved out into the world.
 *
 * Each site is a small stage built from primitives and the shared
 * material library, sitting in its own clearing at the end of a path
 * (jungleMap.DESTINATIONS drives where; this file decides what).
 * Interaction is unchanged: the hotspots in houseMap moved to these
 * clearings and open the same panels they always did — the world got
 * bigger, the product stayed wired.
 *
 * Every site gets one practical light on desktop (four total), gold —
 * a lit destination at the end of a dark path is the whole reason to
 * walk it.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useHouseMaterials } from './HouseMaterials';
import { seededRng } from './houseSkins';
import { DESTINATIONS, destCenter, type Destination } from './jungleMap';

function useDest(id: Destination['id']) {
    return useMemo(() => {
        const d = DESTINATIONS.find((x) => x.id === id)!;
        const c = destCenter(d);
        // Face back down the path toward home
        return { d, c, yaw: Math.atan2(-c.x, -c.z) };
    }, [id]);
}

/** Shared: a dirt floor disc + a gold practical for a site. */
function SiteBase({
    x,
    z,
    r,
    m,
    low,
    lightY = 3.2,
}: {
    x: number;
    z: number;
    r: number;
    m: ReturnType<typeof useHouseMaterials>;
    low: boolean;
    lightY?: number;
}) {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, z]} receiveShadow={!low}>
                <circleGeometry args={[r * 0.55, low ? 20 : 32]} />
                <primitive object={m.dirt} attach="material" />
            </mesh>
            {!low && (
                <pointLight position={[x, lightY, z]} intensity={2.2} color="#fbbf24" distance={r * 1.9} decay={2} />
            )}
        </group>
    );
}

/** A flame: emissive cone on a stick. Cheap, warm, alive at night. */
function Torch({ x, z, m, h = 1.9 }: { x: number; z: number; m: ReturnType<typeof useHouseMaterials>; h?: number }) {
    return (
        <group position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]}>
                <cylinderGeometry args={[0.05, 0.07, h, 5]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, h + 0.16, 0]}>
                <coneGeometry args={[0.11, 0.34, 6]} />
                <meshBasicMaterial color="#ffb347" toneMapped={false} />
            </mesh>
        </group>
    );
}

/* ── The Cinema Grove — films under the canopy ─────────────── */
function CinemaGrove({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c, yaw } = useDest('cinema');
    const rnd = useMemo(() => seededRng(70707), []);
    const benches = useMemo(
        () =>
            [0, 1, 2].flatMap((row) =>
                [-1, 0, 1].map((seat) => ({
                    dx: seat * 2.6 + (rnd() - 0.5) * 0.3,
                    dz: 3.4 + row * 2.2 + (rnd() - 0.5) * 0.3,
                    rot: (rnd() - 0.5) * 0.2,
                })),
            ),
        [rnd],
    );

    return (
        <group position={[c.x, 0, c.z]} rotation={[0, yaw, 0]}>
            {/* Screen on timber posts, facing the benches */}
            {[-3.4, 3.4].map((px) => (
                <mesh key={px} position={[px, 1.9, 0]} castShadow={!low}>
                    <cylinderGeometry args={[0.16, 0.2, 3.8, 6]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            <mesh position={[0, 2.4, 0.02]}>
                <planeGeometry args={[6.4, 3.0]} />
                <primitive object={m.screen} attach="material" />
            </mesh>
            <mesh position={[0, 2.4, -0.04]}>
                <planeGeometry args={[6.9, 3.5]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            {/* Log benches */}
            {benches.map((b, i) => (
                <mesh key={i} position={[b.dx, 0.32, b.dz]} rotation={[0, b.rot, Math.PI / 2]} castShadow={!low}>
                    <cylinderGeometry args={[0.3, 0.3, 2.1, 7]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            <Torch x={-4.6} z={2.4} m={m} />
            <Torch x={4.6} z={2.4} m={m} />
        </group>
    );
}

/* ── The Hall Stones — the community circle ────────────────── */
function HallStones({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c } = useDest('hall');
    const rnd = useMemo(() => seededRng(31313), []);
    const stones = useMemo(
        () =>
            Array.from({ length: 9 }, (_, i) => {
                const a = (i / 9) * Math.PI * 2;
                return {
                    x: Math.cos(a) * 6.2,
                    z: Math.sin(a) * 6.2,
                    h: 2.1 + rnd() * 1.4,
                    w: 0.9 + rnd() * 0.5,
                    lean: (rnd() - 0.5) * 0.14,
                    rot: rnd() * Math.PI,
                };
            }),
        [rnd],
    );

    return (
        <group position={[c.x, 0, c.z]}>
            {stones.map((s, i) => (
                <mesh key={i} position={[s.x, s.h / 2 - 0.15, s.z]} rotation={[s.lean, s.rot, s.lean]} castShadow={!low}>
                    <boxGeometry args={[s.w, s.h, s.w * 0.6]} />
                    <primitive object={m.stone} attach="material" />
                </mesh>
            ))}
            {/* Council fire at the centre */}
            <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.8, 1.0, 0.44, 8]} />
                <primitive object={m.stone} attach="material" />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
                <coneGeometry args={[0.34, 0.7, 6]} />
                <meshBasicMaterial color="#ffb347" toneMapped={false} />
            </mesh>
        </group>
    );
}

/* ── The Mirror Pool — shape your vessel ───────────────────── */
function MirrorPool({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c } = useDest('soul_mirror');
    const water = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#16283f',
                metalness: 0.92,
                roughness: 0.06,
                envMapIntensity: 1.6,
            }),
        [],
    );
    const rnd = useMemo(() => seededRng(52525), []);
    const rim = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return {
                    x: Math.cos(a) * 4.4,
                    z: Math.sin(a) * 4.4,
                    s: 0.4 + rnd() * 0.4,
                    rot: rnd() * Math.PI,
                };
            }),
        [rnd],
    );

    return (
        <group position={[c.x, 0, c.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
                <circleGeometry args={[4.2, low ? 24 : 40]} />
                <primitive object={water} attach="material" />
            </mesh>
            {rim.map((s, i) => (
                <mesh key={i} position={[s.x, s.s * 0.35, s.z]} rotation={[rnd() * 0.4, s.rot, 0]} castShadow={!low}>
                    <icosahedronGeometry args={[s.s, 0]} />
                    <primitive object={m.stone} attach="material" />
                </mesh>
            ))}
            {/* The pool keeps a little aether of its own */}
            {!low && (
                <pointLight position={[0, 1.4, 0]} intensity={1.5} color="#a5b4fc" distance={9} decay={2} />
            )}
            <Torch x={-3.4} z={-3.6} m={m} h={1.5} />
            <Torch x={3.6} z={-3.2} m={m} h={1.5} />
        </group>
    );
}

/* ── The Signal Studio — broadcast from the wild ───────────── */
function SignalStudio({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c, yaw } = useDest('studio');

    return (
        <group position={[c.x, 0, c.z]} rotation={[0, yaw, 0]}>
            {/* Open timber pavilion */}
            {[
                [-2.6, -2.2],
                [2.6, -2.2],
                [-2.6, 2.2],
                [2.6, 2.2],
            ].map(([px, pz], i) => (
                <mesh key={i} position={[px, 1.5, pz]} castShadow={!low}>
                    <cylinderGeometry args={[0.14, 0.18, 3.0, 6]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            <mesh position={[0, 3.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!low}>
                <coneGeometry args={[4.6, 1.7, 4]} />
                <primitive object={m.wood} attach="material" />
            </mesh>
            {/* Desk + live console */}
            <mesh position={[0, 0.78, -1.1]} castShadow={!low}>
                <boxGeometry args={[2.6, 0.12, 0.9]} />
                <primitive object={m.wood} attach="material" />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 1.1, 0.38, -1.1]}>
                    <boxGeometry args={[0.14, 0.76, 0.7]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            ))}
            <mesh position={[0, 1.42, -1.38]} rotation={[-0.12, 0, 0]}>
                <planeGeometry args={[2.1, 0.95]} />
                <primitive object={m.screen} attach="material" />
            </mesh>
            {/* Aerial — the signal part */}
            <mesh position={[3.1, 2.6, 2.6]}>
                <cylinderGeometry args={[0.03, 0.05, 5.2, 5]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            <mesh position={[3.1, 5.3, 2.6]}>
                <sphereGeometry args={[0.14, 8, 6]} />
                <meshBasicMaterial color="#fbbf24" toneMapped={false} />
            </mesh>
        </group>
    );
}

export default function WorldDestinations({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);

    return (
        <group>
            {DESTINATIONS.map((d) => {
                const c = destCenter(d);
                return <SiteBase key={d.id} x={c.x} z={c.z} r={d.r} m={m} low={low} />;
            })}
            <CinemaGrove m={m} low={low} />
            <HallStones m={m} low={low} />
            <MirrorPool m={m} low={low} />
            <SignalStudio m={m} low={low} />
        </group>
    );
}
