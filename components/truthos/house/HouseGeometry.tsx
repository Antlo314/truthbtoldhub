'use client';

const WALL = '#3d3550';
const FLOOR = '#2a2438';
const WOOD = '#4a3c2e';
const RUG = '#5a3d62';
const GOLD = '#fbbf24';

function Box({
    pos,
    size,
    color,
    emissive,
    eInt = 0,
    shadows = true,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    color: string;
    emissive?: string;
    eInt?: number;
    shadows?: boolean;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color={color}
                roughness={0.88}
                emissive={emissive ?? '#000'}
                emissiveIntensity={eInt}
            />
        </mesh>
    );
}

/**
 * Expanded house (~22×20) — media bay, forge bay, unique station props.
 */
export default function HouseGeometry({
    low = false,
    cinematic = false,
}: {
    low?: boolean;
    cinematic?: boolean;
}) {
    const sh = !low;
    const rich = cinematic && !low;
    const floorW = 21.2;
    const floorD = 19.2;

    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={sh}>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color={FLOOR} roughness={0.9} />
            </mesh>
            {!low && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <planeGeometry args={[floorW, floorD]} />
                    <meshBasicMaterial color="#3a3250" transparent opacity={0.12} />
                </mesh>
            )}
            {rich && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.5]} receiveShadow>
                    <planeGeometry args={[1.7, 14]} />
                    <meshStandardMaterial color="#4a2840" roughness={0.95} />
                </mesh>
            )}

            {/* Outer walls */}
            <Box pos={[0, 1.5, -9.5]} size={[floorW, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[0, 1.5, 9.5]} size={[floorW, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[-10.5, 1.5, 0]} size={[0.3, 3, floorD]} color={WALL} shadows={sh} />
            <Box pos={[10.5, 1.5, 0]} size={[0.3, 3, floorD]} color={WALL} shadows={sh} />

            {rich &&
                [-7, -3.5, 0, 3.5, 7].map((z) => (
                    <Box key={`beam-${z}`} pos={[0, 2.85, z]} size={[20.4, 0.14, 0.22]} color={WOOD} shadows={false} />
                ))}
            {rich && (
                <>
                    <Box pos={[0, 0.08, -9.32]} size={[20.8, 0.16, 0.08]} color="#1a1520" shadows={false} />
                    <Box pos={[0, 0.08, 9.32]} size={[20.8, 0.16, 0.08]} color="#1a1520" shadows={false} />
                    <Box pos={[-10.32, 0.08, 0]} size={[0.08, 0.16, 18.8]} color="#1a1520" shadows={false} />
                    <Box pos={[10.32, 0.08, 0]} size={[0.08, 0.16, 18.8]} color="#1a1520" shadows={false} />
                </>
            )}

            {/* ── BEDROOM (south / +Z) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.01, 6.2]} receiveShadow={sh}>
                <planeGeometry args={[8, 6]} />
                <meshStandardMaterial color="#1c1628" roughness={0.95} />
            </mesh>
            <Box pos={[-0.5, 0.35, 7.0]} size={[2.2, 0.4, 1.6]} color="#1e1830" shadows={sh} />
            <Box pos={[-0.5, 0.6, 7.0]} size={[2.0, 0.15, 1.4]} color="#2a2240" shadows={sh} />
            {/* desk + computer */}
            <Box pos={[3.4, 0.72, 5.15]} size={[1.7, 0.08, 0.75]} color={WOOD} shadows={sh} />
            <Box pos={[3.4, 0.36, 5.15]} size={[0.1, 0.72, 0.55]} color="#221c16" shadows={sh} />
            <Box pos={[3.4, 1.18, 4.9]} size={[0.9, 0.58, 0.06]} color="#1a1a1e" shadows={sh} />
            <mesh position={[3.4, 1.18, 4.94]}>
                <planeGeometry args={[0.8, 0.48]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={1.15}
                    toneMapped={false}
                />
            </mesh>
            {/* soul mirror */}
            <Box pos={[3.15, 1.4, 7.85]} size={[0.08, 1.35, 0.72]} color="#1a1a22" shadows={sh} />
            <mesh position={[3.1, 1.4, 7.85]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.58, 1.15]} />
                <meshStandardMaterial
                    color="#4a6a8a"
                    metalness={0.75}
                    roughness={0.18}
                    emissive="#1a3048"
                    emissiveIntensity={0.28}
                />
            </mesh>
            <mesh position={[6.2, 1.85, 9.32]}>
                <planeGeometry args={[1.5, 1.15]} />
                <meshStandardMaterial color="#1e1b4b" emissive="#6366f1" emissiveIntensity={rich ? 0.65 : 0.4} />
            </mesh>
            {rich && (
                <>
                    <Box pos={[-0.5, 0.85, 7.75]} size={[0.5, 0.35, 0.35]} color="#2a2038" shadows={sh} />
                    <Box pos={[3.4, 0.95, 5.45]} size={[0.38, 0.12, 0.28]} color="#1a1a1e" shadows={false} />
                    <mesh position={[-0.5, 1.15, 7.75]}>
                        <sphereGeometry args={[0.1, 10, 10]} />
                        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.8} />
                    </mesh>
                </>
            )}

            {/* ── LIVING + MEDIA ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.012, -1.2]} receiveShadow={sh}>
                <planeGeometry args={[8.5, 7]} />
                <meshStandardMaterial color={RUG} roughness={0.95} />
            </mesh>
            {/* sofa facing north media wall */}
            <Box pos={[1.6, 0.4, -2.6]} size={[2.5, 0.5, 0.95]} color="#2a2038" shadows={sh} />
            <Box pos={[1.6, 0.78, -2.95]} size={[2.5, 0.42, 0.28]} color="#322848" shadows={sh} />
            {/* coffee table — controller sits here (see HouseDecor) */}
            <Box pos={[0.15, 0.32, -1.15]} size={[1.05, 0.08, 0.65]} color={WOOD} shadows={sh} />
            <Box pos={[0.15, 0.16, -1.15]} size={[0.9, 0.28, 0.5]} color="#221c16" shadows={sh} />
            {/* offering side table */}
            <Box pos={[-1.8, 0.4, -0.4]} size={[1.15, 0.08, 0.7]} color={WOOD} shadows={sh} />
            <Box pos={[-1.8, 0.18, -0.4]} size={[0.08, 0.36, 0.5]} color="#221c16" shadows={sh} />
            {/* media stand under TV */}
            <Box pos={[0, 0.28, -3.85]} size={[2.1, 0.5, 0.45]} color="#1a1520" shadows={sh} />
            {/* wall TV bezel (cyan arcade — not cinema purple) */}
            <Box pos={[0, 1.55, -4.15]} size={[2.4, 1.35, 0.08]} color="#0a0a0c" shadows={sh} />
            <mesh position={[0, 1.55, -4.1]}>
                <planeGeometry args={[2.15, 1.15]} />
                <meshStandardMaterial
                    color="#020814"
                    emissive="#22d3ee"
                    emissiveIntensity={0.42}
                    toneMapped={false}
                />
            </mesh>
            {/* console under TV */}
            <Box pos={[0, 0.55, -3.7]} size={[0.7, 0.18, 0.38]} color="#111118" shadows={sh} />
            <mesh position={[0, 0.55, -3.5]}>
                <boxGeometry args={[0.12, 0.04, 0.04]} />
                <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>

            {/* ── LIBRARY (west) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.8, 0.01, -4.8]} receiveShadow={sh}>
                <planeGeometry args={[5.5, 5.5]} />
                <meshStandardMaterial color="#141018" roughness={0.95} />
            </mesh>
            {(low ? [-4.8] : [-5.6, -4.8, -4.0]).map((z, i) => (
                <group key={`lib-${i}`}>
                    <Box pos={[-8.7, 1.2, z]} size={[0.38, 2.2, low ? 2.4 : 1.15]} color={WOOD} shadows={sh} />
                    {!low &&
                        [0.4, 0.9, 1.4, 1.9].map((y) => (
                            <Box key={y} pos={[-8.55, y, z]} size={[0.12, 0.06, 1.0]} color="#3a2e22" shadows={false} />
                        ))}
                </group>
            ))}
            <mesh position={[-6.5, 2.45, -4.8]}>
                <planeGeometry args={[2.6, 0.15]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.25} />
            </mesh>

            {/* ── STUDY / CODEX (east-south) ── */}
            <Box pos={[6.2, 0.75, -4.6]} size={[1.5, 0.08, 0.85]} color={WOOD} shadows={sh} />
            <Box pos={[6.2, 0.92, -4.6]} size={[0.4, 0.1, 0.5]} color="#1a1520" shadows={sh} />
            <Box pos={[8.0, 1.3, -5.8]} size={[0.42, 2.4, 2.0]} color={WOOD} shadows={sh} />

            {/* ── FORGE BAY (SE) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.6, 0.012, -7.0]} receiveShadow={sh}>
                <planeGeometry args={[4.5, 3.5]} />
                <meshStandardMaterial color="#1a1210" roughness={0.95} />
            </mesh>
            <Box pos={[7.6, 0.55, -7.0]} size={[1.6, 0.9, 0.9]} color="#2a2018" shadows={sh} />
            <Box pos={[7.6, 1.05, -7.0]} size={[1.4, 0.12, 0.75]} color="#3a2a1c" shadows={sh} />
            {/* anvil silhouette */}
            <Box pos={[7.35, 1.25, -6.85]} size={[0.55, 0.28, 0.35]} color="#3a3a42" shadows={sh} />
            <mesh position={[7.9, 1.15, -7.15]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color="#ff6b2c" emissive="#ff6b2c" emissiveIntensity={1.0} toneMapped={false} />
            </mesh>
            {!low && (
                <pointLight position={[7.9, 1.4, -7.1]} intensity={1.4} color="#ff8a3d" distance={5} decay={2} />
            )}

            {/* ── CINEMA (east — purple film wall, NOT arcade) ── */}
            <Box pos={[8.7, 1.55, 1.2]} size={[0.12, 1.55, 2.5]} color="#111" shadows={sh} />
            <mesh position={[8.62, 1.55, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.25, 1.35]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={0.5} toneMapped={false} />
            </mesh>

            {/* ── HALL ARCH (west) ── */}
            <Box pos={[-7.7, 1.25, 1.8]} size={[0.32, 2.5, 0.18]} color={WALL} shadows={sh} />
            <Box pos={[-6.7, 1.25, 1.8]} size={[0.32, 2.5, 0.18]} color={WALL} shadows={sh} />
            <Box pos={[-7.2, 2.45, 1.8]} size={[1.2, 0.2, 0.2]} color={WALL} shadows={sh} />
            <mesh position={[-7.2, 2.35, 1.9]}>
                <torusGeometry args={[0.38, 0.045, 6, low ? 12 : 20]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} />
            </mesh>

            {/* ── LEDGER + HEARTH (west living) ── */}
            <Box pos={[-5.0, 0.45, 2.0]} size={[0.55, 0.9, 0.55]} color="#2c241c" shadows={sh} />
            <Box pos={[-7.6, 0.4, 3.6]} size={[1.25, 0.8, 0.75]} color="#1a1410" shadows={sh} />

            {/* ── WAYFINDER (north wall map) ── */}
            <Box pos={[0, 1.55, -9.15]} size={[2.0, 1.35, 0.1]} color="#1a1520" shadows={sh} />
            <mesh position={[0, 1.55, -9.08]}>
                <planeGeometry args={[1.75, 1.15]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={0.5}
                    toneMapped={false}
                />
            </mesh>
            <Box pos={[-1.5, 1.3, -9.2]} size={[0.35, 2.6, 0.2]} color="#1a1230" shadows={sh} />
            <Box pos={[1.5, 1.3, -9.2]} size={[0.35, 2.6, 0.2]} color="#1a1230" shadows={sh} />

            {/* Interior partial walls (bedroom doorway) */}
            <Box pos={[-3.2, 1.2, 3.0]} size={[4.0, 2.4, 0.22]} color={WALL} shadows={sh} />
            <Box pos={[3.2, 1.2, 3.0]} size={[4.0, 2.4, 0.22]} color={WALL} shadows={sh} />

            {/* Ceiling */}
            <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color="#0c0a10" roughness={1} />
            </mesh>

            {rich && (
                <>
                    <mesh position={[-10.32, 1.8, -4]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[1.1, 1.0]} />
                        <meshStandardMaterial color="#0f172a" emissive="#4c1d95" emissiveIntensity={0.35} />
                    </mesh>
                    <mesh position={[10.32, 1.9, -2]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[1.0, 0.9]} />
                        <meshStandardMaterial color="#0f172a" emissive="#1e3a5f" emissiveIntensity={0.4} />
                    </mesh>
                </>
            )}
        </group>
    );
}
