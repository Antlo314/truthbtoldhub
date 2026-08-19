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
import HouseProp, { HOUSE_MODELS } from './HouseProp';
import { seededRng } from './houseSkins';
import { clearOfHouse, FLOWERS } from './groveScatter';
import { CORRIDORS, corridorDistance, DESTINATIONS, destCenter, inCorridor, type Corridor, type Destination } from './jungleMap';

function useDest(id: Destination['id']) {
    return useMemo(() => {
        const d = DESTINATIONS.find((x) => x.id === id)!;
        const c = destCenter(d);
        // Face back down the path toward home
        return { d, c, yaw: Math.atan2(-c.x, -c.z) };
    }, [id]);
}

/* ── Outdoor dressing — CC0 Kenney props, keys from HOUSE_MODELS ── */

/** One prop in a site's local frame. y is only for things set on top of something. */
type Dress = {
    key: string;
    x: number;
    z: number;
    y?: number;
    yaw?: number;
    fit?: { w?: number; h?: number; d?: number };
};

/** Site-local → world for a group at c turned by yaw about Y (three's Ry). */
function toWorld(c: { x: number; z: number }, yaw: number, x: number, z: number) {
    return {
        x: c.x + x * Math.cos(yaw) + z * Math.sin(yaw),
        z: c.z - x * Math.sin(yaw) + z * Math.cos(yaw),
    };
}

/**
 * The ground rules the grove keeps, applied to hand-placed dressing:
 * never on the house, never on a path. A row that breaks them is not
 * drawn — and says so in dev, because a prop that quietly goes missing
 * is the kind of bug this repo keeps finding a year later. The same
 * warning covers a key that is not in HOUSE_MODELS: the props audit
 * only sees literal model="…" strings, so a typo in these tables would
 * otherwise render nothing and tell no one.
 */
function useDressing(list: Dress[], c: { x: number; z: number }, yaw: number): Dress[] {
    return useMemo(() => {
        const ok = list.filter((p) => {
            const w = toWorld(c, yaw, p.x, p.z);
            return HOUSE_MODELS[p.key]?.url && clearOfHouse(w.x, w.z) && !inCorridor(w.x, w.z, 0);
        });
        if (process.env.NODE_ENV !== 'production' && ok.length !== list.length) {
            console.warn('[WorldDestinations] dressing dropped (unknown key, on the house, or on a path):', list.filter((p) => !ok.includes(p)));
        }
        return ok;
    }, [list, c, yaw]);
}

/** Draws a dressing list inside the site group. No fallback: phones skip the kit. */
function Dressing({ list, low }: { list: Dress[]; low: boolean }) {
    return (
        <>
            {list.map((p, i) => (
                <HouseProp
                    key={`${p.key}-${i}`}
                    model={p.key}
                    position={[p.x, p.y ?? 0, p.z]}
                    rotation={[0, p.yaw ?? 0, 0]}
                    fit={p.fit}
                    shadows={!low}
                >
                    {null}
                </HouseProp>
            ))}
        </>
    );
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
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]} receiveShadow={!low}>
                <circleGeometry args={[Math.min(3.2, r * 0.22), low ? 16 : 24]} />
                <primitive object={m.stone} attach="material" />
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

/**
 * A knee-high rail behind the last bench row (local +z is toward the
 * path). Split around the walkway (|x| < 2, off the corridor at margin
 * 0) so nobody walks through timber; the gate piece takes the path end
 * of the rail — the way in is here. Corners turn the ends toward the
 * screen; every piece scales the same so the rail stays one height.
 */
const CINEMA_RAIL: Dress[] = [
    // gate at the path side of the walkway (manifest is 2.6 wide; 2.0 keeps the rail level)
    { key: 'fenceGate', x: -3, z: 9.2, fit: { w: 2.0 } },
    // plain panel mirroring the gate across the walkway
    { key: 'fencePanel', x: 3, z: 9.2 },
    // left corner: rail arm x[-6,-4], return arm at x=-6 running toward the screen
    { key: 'fenceCorner', x: -5, z: 8.2, yaw: Math.PI },
    // right corner: rail arm x[4,6], return arm at x=6 running toward the screen
    { key: 'fenceCorner', x: 5, z: 8.2, yaw: -Math.PI / 2 },
];

/* ── The Cinema Grove — films under the canopy ─────────────── */
function CinemaGrove({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c, yaw } = useDest('cinema');
    const rail = useDressing(CINEMA_RAIL, c, yaw);
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
            {/* The screen is ALIVE on desktop — the panel's film plays here
                via VideoTexture; phones keep the cheap static surface. */}
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
            <Dressing list={rail} low={low} />
        </group>
    );
}

/**
 * Firewood for the council fire: three stacks on the west half of the
 * circle, just outside the hearth and clear of the east approach, long
 * side turned to the flame. Bearing a at radius r; yaw -a lays the
 * stack tangent to the fire.
 */
const WOOD = { w: 0.9 }; // 1.5m long, 0.7m tall — a household stack, not a lumber yard
const HALL_WOOD: Dress[] = [
    // north-west stack
    { key: 'logStack', x: Math.cos(2.0) * 3.3, z: Math.sin(2.0) * 3.3, yaw: -2.0 + 0.1, fit: WOOD },
    // west stack, straight behind the fire as you come in
    { key: 'logStack', x: Math.cos(3.3) * 3.1, z: Math.sin(3.3) * 3.1, yaw: -3.3 - 0.08, fit: WOOD },
    // south-west stack
    { key: 'logStack', x: Math.cos(4.4) * 3.4, z: Math.sin(4.4) * 3.4, yaw: -4.4 + 0.05, fit: WOOD },
];

/* ── The Hall Stones — the community circle ────────────────── */
function HallStones({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c } = useDest('hall');
    const wood = useDressing(HALL_WOOD, c, 0);
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
            {/* Council fire at the centre: stone hearth, logs on top */}
            <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.8, 1.0, 0.44, 8]} />
                <primitive object={m.stone} attach="material" />
            </mesh>
            {/* campfire logs set on the hearth top (0.44); phones keep the bare hearth */}
            <HouseProp model="campfire" position={[0, 0.44, 0]} shadows={!low}>
                {null}
            </HouseProp>
            {/* flame rises out of the log pile (logs top out near 0.68) */}
            <mesh position={[0, 0.78, 0]}>
                <coneGeometry args={[0.34, 0.7, 6]} />
                <meshBasicMaterial color="#ffb347" toneMapped={false} />
            </mesh>
            <Dressing list={wood} low={low} />
        </group>
    );
}

/**
 * Loose stones at the well's foot, tucked in the gaps between the rim
 * rocks (rim is every 45°; these sit on the half-angles at r≈4.7, inside
 * the gold ring at 5.0). The approach (~122°) and both torches stay clear.
 */
const WELL_STONES: Dress[] = [
    // east-north-east, beside the first rim rock
    { key: 'stone', x: Math.cos(0.393) * 4.75, z: Math.sin(0.393) * 4.75, yaw: 1.1, fit: { w: 0.5 } },
    // south, between the two south rim rocks
    { key: 'rock', x: Math.cos(5.105) * 4.7, z: Math.sin(5.105) * 4.7, yaw: 2.6, fit: { w: 0.62 } },
    // west-south-west, opposite the approach
    { key: 'stone', x: Math.cos(3.534) * 4.7, z: Math.sin(3.534) * 4.7, yaw: 0.4, fit: { w: 0.46 } },
];

/* ── The Mirror Pool — shape your vessel ───────────────────── */
function MirrorPool({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c } = useDest('soul_mirror');
    const stones = useDressing(WELL_STONES, c, 0);
    const water = useMemo(
        () =>
            new THREE.MeshLambertMaterial({
                color: '#1a3348',
            }),
        [],
    );
    const rnd = useMemo(() => seededRng(52525), []);
    const rim = useMemo(
        () =>
            Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return {
                    x: Math.cos(a) * 4.5,
                    z: Math.sin(a) * 4.5,
                    s: 0.45 + rnd() * 0.25,
                    rot: rnd() * Math.PI,
                };
            }),
        [rnd],
    );
    const rockMat = useMemo(
        () => new THREE.MeshLambertMaterial({ color: '#6b7280' }),
        [],
    );

    return (
        <group position={[c.x, 0, c.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <circleGeometry args={[4.2, low ? 16 : 24]} />
                <primitive object={water} attach="material" />
            </mesh>
            {rim.map((s, i) => (
                <mesh key={i} position={[s.x, s.s * 0.42, s.z]} rotation={[0, s.rot, 0]}>
                    <boxGeometry args={[s.s * 1.4, s.s * 0.85, s.s]} />
                    <primitive object={rockMat} attach="material" />
                </mesh>
            ))}
            {/* The pool keeps a little aether of its own */}
            {!low && (
                <pointLight position={[0, 1.4, 0]} intensity={1.5} color="#a5b4fc" distance={9} decay={2} />
            )}
            <Torch x={-3.4} z={-3.6} m={m} h={1.5} />
            <Torch x={3.6} z={-3.2} m={m} h={1.5} />
            <Dressing list={stones} low={low} />
        </group>
    );
}

/**
 * Stones at the foot of the aerial mast (local 3.1, 2.6) — the spire
 * part of the Signal Spire, weighted down like a real guyed mast. All
 * clear of the mast, the nearest pavilion post and each other.
 */
const SPIRE_STONES: Dress[] = [
    // largest, outboard of the mast
    { key: 'rock', x: 3.62, z: 2.42, yaw: 0.8, fit: { w: 0.62 } },
    // toward the pavilion post
    { key: 'stone', x: 2.72, z: 3.02, yaw: 2.3, fit: { w: 0.5 } },
    // small one on the path side of the mast
    { key: 'rock', x: 3.38, z: 3.14, yaw: 4.1, fit: { w: 0.44 } },
];

/* ── The Signal Studio — broadcast from the wild ───────────── */
function SignalStudio({ m, low }: { m: ReturnType<typeof useHouseMaterials>; low: boolean }) {
    const { c, yaw } = useDest('studio');
    const stones = useDressing(SPIRE_STONES, c, yaw);

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
            <Dressing list={stones} low={low} />
        </group>
    );
}

/* ── Path blooms — the last stretch to the Spire and the Well ── */

/** The corridor whose far end lands in this destination. */
function corridorTo(id: Destination['id']): Corridor {
    const c = destCenter(DESTINATIONS.find((d) => d.id === id)!);
    return CORRIDORS.reduce((best, k) =>
        Math.hypot(k.bx - c.x, k.bz - c.z) < Math.hypot(best.bx - c.x, best.bz - c.z) ? k : best,
    );
}

/**
 * Flowers along the last ~6m of a path, INSIDE the corridor's edge
 * (1.25–1.85m off the centreline, halfWidth is 2.4) so they line the
 * walk rather than the wood — the one place dressing is meant to be on
 * a corridor. Alternating sides, never on the centre line. Deterministic.
 */
function pathBlooms(id: Destination['id'], seed: number, count = 5) {
    const k = corridorTo(id);
    const dest = DESTINATIONS.find((d) => d.id === id)!;
    const c = destCenter(dest);
    // The ground here is not soil. In the mounted world (AetherShelf) a
    // corridor is a 1.55m light-bridge over a cloud sea, and the only
    // solid beside it is the isle's basalt disc, radius d.r + 0.6. A
    // flower validated against jungleMap's 2.4m dirt corridor can land
    // off the bridge — measured: two of ten sat in mid-air over the void.
    // So blooms must ALSO be on the disc, with 0.3m of margin from its lip.
    const discR = dest.r + 0.6 - 0.3;
    const len = Math.hypot(k.bx - k.ax, k.bz - k.az) || 1;
    const ux = (k.bx - k.ax) / len;
    const uz = (k.bz - k.az) / len;
    const rnd = seededRng(seed);
    const out: { key: string; x: number; z: number; rot: number; scale: number }[] = [];
    for (let i = 0; i < count; i++) {
        const back = 0.6 + i * 1.25 + (rnd() - 0.5) * 0.4; // metres short of the path's end
        const side = i % 2 === 0 ? 1 : -1;
        const off = 1.25 + rnd() * 0.6;
        const x = k.bx - ux * back - uz * side * off;
        const z = k.bz - uz * back + ux * side * off;
        if (!clearOfHouse(x, z) || !inCorridor(x, z, 0) || corridorDistance(x, z, k) < 1.0) continue;
        if (Math.hypot(x - c.x, z - c.z) > discR) continue; // nothing floats over the sea
        out.push({ key: FLOWERS[i % FLOWERS.length], x, z, rot: rnd() * Math.PI * 2, scale: 0.9 + rnd() * 0.4 });
    }
    return out;
}

function PathBlooms({ low }: { low: boolean }) {
    const blooms = useMemo(
        () => [...pathBlooms('studio', 480113), ...pathBlooms('soul_mirror', 480227)],
        [],
    );
    return (
        <group>
            {blooms.map((b, i) => (
                <group key={`${b.key}-${i}`} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]} scale={b.scale}>
                    <HouseProp model={b.key} shadows={!low}>
                        {null}
                    </HouseProp>
                </group>
            ))}
        </group>
    );
}

/** Dead south walk cap — "the house is behind you", not a station. */
function ScenicPost({ m }: { m: ReturnType<typeof useHouseMaterials> }) {
    return (
        <group position={[0, 0, 46]}>
            <mesh position={[0, 0.72, 0]}>
                <boxGeometry args={[0.18, 1.44, 0.12]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 1.15, 0.07]}>
                <boxGeometry args={[0.42, 0.22, 0.03]} />
                <meshLambertMaterial color="#c4b59a" />
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
            <PathBlooms low={low} />
            <ScenicPost m={m} />
        </group>
    );
}
