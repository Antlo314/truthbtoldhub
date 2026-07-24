'use client';

/**
 * Staged room props — interactables sit on furniture (open-house placement).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from './houseMap';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';

const ACCENT: Record<string, string> = {
    computer: '#22c55e',
    envelope: '#fbbf24',
    library: '#a78bfa',
    codex: '#e879f9',
    ledger: '#fbbf24',
    wayfinder: '#22c55e',
    cinema: '#c084fc',
    hall: '#38bdf8',
    soul_mirror: '#94a3b8',
    arcade: '#22d3ee',
    studio: '#f97316',
    front_door: '#e8d5b0',
    back_door: '#c4b5a0',
    front_bench: '#86efac',
    back_gate: '#a3e635',
    fireplace: '#ff8a3d',
};

function SpinRing({
    accent,
    radius = 0.38,
    low,
}: {
    accent: string;
    radius?: number;
    low?: boolean;
}) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (ref.current) ref.current.rotation.z += dt * (low ? 0.2 : 0.35);
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[radius, radius + 0.09, low ? 16 : 28]} />
            <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.65}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

/**
 * Potted plant — pot + soil + foliage. Every placement in walkable space has
 * a matching AABB in houseMap COLLIDERS, so it must render on mobile too.
 */
function PottedPlant({
    x,
    z,
    m,
    low,
    tall = false,
}: {
    x: number;
    z: number;
    m: HouseMaterials;
    low: boolean;
    tall?: boolean;
}) {
    const segs = low ? 8 : 12;
    return (
        <group position={[x, 0, z]}>
            <mesh position={[0, 0.17, 0]} castShadow={!low}>
                <cylinderGeometry args={[0.19, 0.15, 0.34, segs]} />
                <primitive object={m.leather} attach="material" />
            </mesh>
            <mesh position={[0, 0.335, 0]}>
                <cylinderGeometry args={[0.21, 0.21, 0.05, segs]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.03, segs]} />
                <primitive object={m.dirt} attach="material" />
            </mesh>
            {tall ? (
                <>
                    <mesh position={[0, 0.75, 0]}>
                        <cylinderGeometry args={[0.025, 0.035, 0.8, 6]} />
                        <primitive object={m.woodDark} attach="material" />
                    </mesh>
                    <mesh position={[0, 1.28, 0]} castShadow={!low}>
                        <sphereGeometry args={[0.34, low ? 8 : 10, low ? 6 : 8]} />
                        <primitive object={m.leaf} attach="material" />
                    </mesh>
                    <mesh position={[0.2, 1.0, 0.12]}>
                        <sphereGeometry args={[0.2, 8, 6]} />
                        <primitive object={m.leaf} attach="material" />
                    </mesh>
                </>
            ) : (
                <>
                    <mesh position={[0, 0.52, 0]} castShadow={!low}>
                        <sphereGeometry args={[0.26, low ? 8 : 10, low ? 6 : 8]} />
                        <primitive object={m.leaf} attach="material" />
                    </mesh>
                    <mesh position={[0.14, 0.66, 0.08]}>
                        <coneGeometry args={[0.09, 0.3, 6]} />
                        <primitive object={m.leaf} attach="material" />
                    </mesh>
                    <mesh position={[-0.15, 0.64, -0.06]}>
                        <coneGeometry args={[0.08, 0.26, 6]} />
                        <primitive object={m.leaf} attach="material" />
                    </mesh>
                </>
            )}
        </group>
    );
}

/** Floor lamp beside the sofa — warm shade + desktop point light */
function FloorLamp({ x, z, m, low }: { x: number; z: number; m: HouseMaterials; low: boolean }) {
    return (
        <group position={[x, 0, z]}>
            <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.17, 0.19, 0.06, low ? 10 : 14]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 1.5, 6]} />
                <primitive object={m.metal} attach="material" />
            </mesh>
            <mesh position={[0, 1.52, 0]}>
                <sphereGeometry args={[0.06, 8, 6]} />
                <primitive object={m.bulbWarm} attach="material" />
            </mesh>
            <mesh position={[0, 1.68, 0]} castShadow={!low}>
                <coneGeometry args={[0.24, 0.34, low ? 10 : 14]} />
                <primitive object={m.fabricLight} attach="material" />
            </mesh>
            {!low && (
                <pointLight position={[0, 1.6, 0]} intensity={0.7} distance={4.5} color="#ffd9a6" decay={2} />
            )}
        </group>
    );
}

/** Simple framed art panel */
function FramedArt({
    pos,
    rotY,
    w,
    h,
    art,
    m,
}: {
    pos: [number, number, number];
    rotY: number;
    w: number;
    h: number;
    art: THREE.Material;
    m: HouseMaterials;
}) {
    return (
        <group position={pos} rotation={[0, rotY, 0]}>
            <mesh position={[0, 0, -0.02]}>
                <boxGeometry args={[w + 0.12, h + 0.12, 0.05]} />
                <primitive object={m.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[w, h]} />
                <primitive object={art} attach="material" />
            </mesh>
        </group>
    );
}

export default function HouseDecor({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const glow = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!glow.current || low) return;
        (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
    });

    return (
        <group>
            {/* Arcade pad on coffee table (living conversation group) */}
            <group position={[0.15, 0.44, -8.35]} rotation={[0, 0.28, 0]}>
                <mesh castShadow={!low}>
                    <boxGeometry args={[0.36, 0.055, 0.22]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.035, 0.04]}>
                    <boxGeometry args={[0.12, 0.02, 0.08]} />
                    <primitive object={m.black} attach="material" />
                </mesh>
                <mesh ref={glow} position={[0, 0.04, -0.05]}>
                    <boxGeometry args={[0.16, 0.014, 0.028]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} toneMapped={false} />
                </mesh>
                <mesh position={[-0.1, 0.04, 0.02]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.35} />
                </mesh>
                <mesh position={[-0.05, 0.04, 0.06]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.02, 10]} />
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
                </mesh>
            </group>

            {/* Offering tray on west living console (flush partition, clear of back door path) */}
            <group position={[-5.55, 0.78, -6.5]} rotation={[-0.04, Math.PI / 2, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.32, 0.02, 0.2]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
                <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.24, 0.14]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                <mesh position={[0.08, 0.03, 0.02]}>
                    <boxGeometry args={[0.06, 0.04, 0.04]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
            </group>

            {/* Ledger book on library reading table (deep in room) */}
            <group position={[-10.4, 0, -3.5]}>
                <mesh position={[0, 0.95, 0]} rotation={[-0.12, 0.2, 0]} castShadow>
                    <boxGeometry args={[0.36, 0.055, 0.26]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
                <mesh position={[0.02, 0.99, 0.01]} rotation={[-0.12, 0.2, 0]}>
                    <boxGeometry args={[0.28, 0.01, 0.2]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </group>

            {/* Desk lamp on bedroom workstation (desk SE, north of cinema door) */}
            <group position={[5.0, 0.78, 9.4]}>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.08, 0.03, 10]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.18, 0]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.36, 6]} />
                    <primitive object={m.metal} attach="material" />
                </mesh>
                <mesh position={[0.08, 0.32, -0.04]} rotation={[0.4, 0, 0.3]}>
                    <coneGeometry args={[0.09, 0.12, 10]} />
                    <primitive object={m.gold} attach="material" />
                </mesh>
                {!low && (
                    <pointLight position={[0.1, 0.28, -0.05]} intensity={0.35} distance={2.2} color="#fbbf24" />
                )}
            </group>

            {/* ── Decor richness pass ── */}
            {/* Potted plants (each has a COLLIDERS entry in houseMap) */}
            <PottedPlant x={5.5} z={-11.65} m={m} low={low} tall />
            <PottedPlant x={-5.75} z={4.0} m={m} low={low} />
            <PottedPlant x={13.15} z={11.7} m={m} low={low} tall />
            <PottedPlant x={2.15} z={13.35} m={m} low={low} />
            <PottedPlant x={-2.15} z={13.35} m={m} low={low} />
            {/* Floor lamp beside the sofa (COLLIDERS entry in houseMap) */}
            <FloorLamp x={2.1} z={-5.9} m={m} low={low} />

            {/* Framed art — living east partition + bedroom partition face */}
            <FramedArt pos={[6.04, 1.7, -5.2]} rotY={-Math.PI / 2} w={0.82} h={0.62} art={m.artUnnamed} m={m} />
            <FramedArt pos={[-2.6, 1.75, 3.27]} rotY={0} w={0.82} h={0.62} art={m.artAsWithin} m={m} />

            {/* Table + desk clutter (desktop only, no colliders) */}
            {!low && (
                <>
                    {/* Coffee-table book stack + candle */}
                    <group position={[-0.25, 0.45, -8.2]} rotation={[0, 0.5, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.3, 0.045, 0.22]} />
                            <primitive object={m.book} attach="material" />
                        </mesh>
                        <mesh position={[0.02, 0.042, -0.01]} rotation={[0, -0.3, 0]}>
                            <boxGeometry args={[0.26, 0.04, 0.19]} />
                            <primitive object={m.leather} attach="material" />
                        </mesh>
                    </group>
                    <group position={[0.52, 0.48, -8.55]}>
                        <mesh>
                            <cylinderGeometry args={[0.035, 0.04, 0.11, 8]} />
                            <primitive object={m.fabricLight} attach="material" />
                        </mesh>
                        <mesh position={[0, 0.075, 0]}>
                            <sphereGeometry args={[0.018, 6, 4]} />
                            <primitive object={m.ember} attach="material" />
                        </mesh>
                    </group>
                    {/* Bedroom desk papers + mug */}
                    <mesh position={[3.75, 0.775, 9.5]} rotation={[0, -0.25, 0]}>
                        <boxGeometry args={[0.3, 0.012, 0.22]} />
                        <primitive object={m.fabricLight} attach="material" />
                    </mesh>
                    <mesh position={[3.45, 0.815, 9.7]}>
                        <cylinderGeometry args={[0.042, 0.042, 0.09, 8]} />
                        <primitive object={m.gold} attach="material" />
                    </mesh>
                    {/* Study desk book stack */}
                    <group position={[8.75, 0.79, -3.6]} rotation={[0, 0.35, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.28, 0.05, 0.2]} />
                            <primitive object={m.book} attach="material" />
                        </mesh>
                        <mesh position={[-0.01, 0.048, 0.01]}>
                            <boxGeometry args={[0.24, 0.045, 0.18]} />
                            <primitive object={m.book} attach="material" />
                        </mesh>
                    </group>
                </>
            )}

            {HOTSPOTS.map((h) => (
                <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
                    <SpinRing
                        accent={ACCENT[h.id] || '#fbbf24'}
                        radius={
                            h.id === 'arcade'
                                ? 0.28
                                : h.id === 'front_door' || h.id === 'back_door'
                                  ? 0.5
                                  : h.id === 'fireplace'
                                    ? 0.55
                                    : h.id === 'front_bench' || h.id === 'back_gate'
                                      ? 0.42
                                      : 0.36
                        }
                        low={low}
                    />
                </group>
            ))}
        </group>
    );
}
