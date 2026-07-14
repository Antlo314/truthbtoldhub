'use client';

/**
 * Staged house shell + multi-part furniture (form pass).
 * Flat materials only — full texturing comes later.
 */

const WALL = '#3d3550';
const FLOOR = '#2a2438';
const WOOD = '#4a3c2e';
const WOOD_DK = '#2c241c';
const RUG = '#5a3d62';
const FABRIC = '#2a2038';
const FABRIC_LT = '#322848';
const GOLD = '#fbbf24';
const METAL = '#3a3a42';

function Box({
    pos,
    size,
    color,
    emissive,
    eInt = 0,
    shadows = true,
    metalness = 0,
    roughness = 0.88,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    color: string;
    emissive?: string;
    eInt?: number;
    shadows?: boolean;
    metalness?: number;
    roughness?: number;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color={color}
                roughness={roughness}
                metalness={metalness}
                emissive={emissive ?? '#000'}
                emissiveIntensity={eInt}
            />
        </mesh>
    );
}

function Cyl({
    pos,
    r,
    h,
    color,
    shadows = true,
    segs = 10,
}: {
    pos: [number, number, number];
    r: number;
    h: number;
    color: string;
    shadows?: boolean;
    segs?: number;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <cylinderGeometry args={[r, r, h, segs]} />
            <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
    );
}

/** Multi-part bed with headboard + pillows */
function StagedBed({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = -0.7;
    const z = 7.55;
    return (
        <group>
            {/* frame */}
            <Box pos={[x, 0.22, z]} size={[2.35, 0.28, 1.85]} color={WOOD_DK} shadows={sh} />
            {/* mattress */}
            <Box pos={[x, 0.42, z]} size={[2.15, 0.22, 1.65]} color="#1e1830" shadows={sh} />
            {/* duvet */}
            <Box pos={[x, 0.58, z + 0.08]} size={[2.0, 0.12, 1.35]} color={FABRIC_LT} shadows={sh} />
            {/* headboard */}
            <Box pos={[x, 0.95, z + 0.88]} size={[2.25, 1.0, 0.12]} color={WOOD} shadows={sh} />
            {rich && (
                <>
                    <Box pos={[x, 1.35, z + 0.88]} size={[1.8, 0.08, 0.06]} color={GOLD} eInt={0.15} emissive={GOLD} shadows={false} />
                    {/* pillows */}
                    <Box pos={[x - 0.45, 0.72, z + 0.55]} size={[0.55, 0.18, 0.35]} color="#3a3050" shadows={sh} />
                    <Box pos={[x + 0.45, 0.72, z + 0.55]} size={[0.55, 0.18, 0.35]} color="#3a3050" shadows={sh} />
                </>
            )}
            {/* nightstands */}
            <Box pos={[-2.15, 0.35, z]} size={[0.5, 0.55, 0.48]} color={WOOD} shadows={sh} />
            <Box pos={[0.75, 0.35, z]} size={[0.5, 0.55, 0.48]} color={WOOD} shadows={sh} />
            {rich && (
                <>
                    <Cyl pos={[-2.15, 0.72, z]} r={0.08} h={0.12} color="#1a1520" shadows={false} segs={8} />
                    <mesh position={[-2.15, 0.88, z]}>
                        <sphereGeometry args={[0.1, 10, 10]} />
                        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.85} />
                    </mesh>
                    <Cyl pos={[0.75, 0.72, z]} r={0.06} h={0.1} color="#2a2038" shadows={false} segs={8} />
                </>
            )}
        </group>
    );
}

/** Sofa with arms, back, cushions — faces media (−Z) */
function StagedSofa({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = 0.55;
    const z = -2.55;
    return (
        <group>
            <Box pos={[x, 0.28, z]} size={[2.65, 0.32, 1.05]} color={FABRIC} shadows={sh} />
            {/* seat cushions */}
            <Box pos={[x - 0.55, 0.48, z + 0.05]} size={[1.15, 0.16, 0.85]} color={FABRIC_LT} shadows={sh} />
            <Box pos={[x + 0.55, 0.48, z + 0.05]} size={[1.15, 0.16, 0.85]} color={FABRIC_LT} shadows={sh} />
            {/* back */}
            <Box pos={[x, 0.78, z - 0.38]} size={[2.65, 0.55, 0.28]} color={FABRIC} shadows={sh} />
            {/* arms */}
            <Box pos={[x - 1.25, 0.55, z]} size={[0.22, 0.5, 0.95]} color={FABRIC} shadows={sh} />
            <Box pos={[x + 1.25, 0.55, z]} size={[0.22, 0.5, 0.95]} color={FABRIC} shadows={sh} />
            {rich && (
                <Box pos={[x + 0.9, 0.62, z + 0.15]} size={[0.35, 0.12, 0.28]} color="#4a3860" shadows={false} />
            )}
        </group>
    );
}

function StagedCoffeeTable({ sh }: { sh: boolean }) {
    const x = 0.15;
    const z = -0.95;
    return (
        <group>
            <Box pos={[x, 0.34, z]} size={[1.05, 0.06, 0.7]} color={WOOD} shadows={sh} />
            <Box pos={[x - 0.38, 0.16, z - 0.22]} size={[0.08, 0.32, 0.08]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x + 0.38, 0.16, z - 0.22]} size={[0.08, 0.32, 0.08]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x - 0.38, 0.16, z + 0.22]} size={[0.08, 0.32, 0.08]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x + 0.38, 0.16, z + 0.22]} size={[0.08, 0.32, 0.08]} color={WOOD_DK} shadows={sh} />
        </group>
    );
}

function StagedMediaWall({ sh, rich }: { sh: boolean; rich: boolean }) {
    return (
        <group>
            {/* console cabinet */}
            <Box pos={[0, 0.32, -4.05]} size={[2.25, 0.55, 0.5]} color="#1a1520" shadows={sh} />
            <Box pos={[0, 0.58, -4.0]} size={[2.15, 0.04, 0.42]} color={WOOD_DK} shadows={sh} />
            {/* console unit */}
            <Box pos={[0, 0.58, -3.85]} size={[0.72, 0.16, 0.36]} color="#111118" shadows={sh} metalness={0.35} roughness={0.45} />
            <mesh position={[0, 0.58, -3.65]}>
                <boxGeometry args={[0.14, 0.04, 0.04]} />
                <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.25} toneMapped={false} />
            </mesh>
            {/* TV bezel + screen */}
            <Box pos={[0, 1.58, -4.28]} size={[2.55, 1.42, 0.1]} color="#0a0a0c" shadows={sh} />
            <mesh position={[0, 1.58, -4.22]}>
                <planeGeometry args={[2.28, 1.2]} />
                <meshStandardMaterial
                    color="#020814"
                    emissive="#22d3ee"
                    emissiveIntensity={rich ? 0.55 : 0.38}
                    toneMapped={false}
                />
            </mesh>
            {rich && (
                <>
                    <Box pos={[-0.9, 0.22, -4.05]} size={[0.35, 0.12, 0.28]} color="#151520" shadows={false} />
                    <Box pos={[0.85, 0.22, -4.05]} size={[0.4, 0.1, 0.22]} color="#1a1a22" shadows={false} />
                </>
            )}
        </group>
    );
}

function StagedDesk({
    pos,
    sh,
    rich,
    monitor = false,
}: {
    pos: [number, number, number];
    sh: boolean;
    rich: boolean;
    monitor?: boolean;
}) {
    const [x, , z] = pos;
    return (
        <group>
            <Box pos={[x, 0.74, z]} size={[1.75, 0.07, 0.78]} color={WOOD} shadows={sh} />
            <Box pos={[x - 0.72, 0.36, z]} size={[0.1, 0.72, 0.62]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x + 0.72, 0.36, z]} size={[0.1, 0.72, 0.62]} color={WOOD_DK} shadows={sh} />
            {/* chair */}
            <Box pos={[x, 0.38, z - 0.72]} size={[0.55, 0.08, 0.5]} color={FABRIC} shadows={sh} />
            <Cyl pos={[x, 0.2, z - 0.72]} r={0.06} h={0.28} color={METAL} shadows={false} segs={8} />
            <Box pos={[x, 0.72, z - 0.9]} size={[0.55, 0.55, 0.08]} color={FABRIC_LT} shadows={sh} />
            {monitor && (
                <>
                    <Box pos={[x, 1.2, z - 0.28]} size={[0.95, 0.62, 0.06]} color="#1a1a1e" shadows={sh} />
                    <mesh position={[x, 1.2, z - 0.24]}>
                        <planeGeometry args={[0.84, 0.5]} />
                        <meshStandardMaterial
                            color="#041208"
                            emissive="#22c55e"
                            emissiveIntensity={1.2}
                            toneMapped={false}
                        />
                    </mesh>
                    <Box pos={[x, 0.88, z - 0.18]} size={[0.18, 0.08, 0.12]} color="#151518" shadows={false} />
                    {rich && (
                        <Box pos={[x + 0.55, 0.82, z + 0.1]} size={[0.32, 0.08, 0.22]} color="#1a1a1e" shadows={false} />
                    )}
                </>
            )}
        </group>
    );
}

function StagedShelf({
    pos,
    size,
    sh,
    rich,
    books = true,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    sh: boolean;
    rich: boolean;
    books?: boolean;
}) {
    const [x, y, z] = pos;
    const [sx, sy, sz] = size;
    return (
        <group>
            <Box pos={[x, y, z]} size={[sx, sy, sz]} color={WOOD} shadows={sh} />
            {books &&
                rich &&
                [0.35, 0.85, 1.35, 1.85].map((by, i) => (
                    <group key={by}>
                        <Box
                            pos={[x + sx * 0.35, by, z]}
                            size={[sx * 0.35, 0.05, sz * 0.85]}
                            color="#3a2e22"
                            shadows={false}
                        />
                        {[-0.25, 0, 0.22].map((ox, j) => (
                            <Box
                                key={j}
                                pos={[x + sx * 0.45, by + 0.14, z + ox]}
                                size={[0.08, 0.22 + (j % 2) * 0.06, 0.14]}
                                color={['#4a3060', '#2a4060', '#5a3040'][j]}
                                shadows={false}
                            />
                        ))}
                    </group>
                ))}
        </group>
    );
}

function Lamp({ pos, color = '#fde68a', low }: { pos: [number, number, number]; color?: string; low?: boolean }) {
    return (
        <group position={pos}>
            <Cyl pos={[0, 0.55, 0]} r={0.04} h={1.1} color={WOOD_DK} shadows={false} segs={8} />
            <mesh position={[0, 1.2, 0]}>
                <coneGeometry args={[0.18, 0.28, low ? 8 : 12]} />
                <meshStandardMaterial color="#2a2438" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.05, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
            </mesh>
            {!low && <pointLight position={[0, 1.15, 0]} intensity={0.55} color={color} distance={4.5} decay={2} />}
        </group>
    );
}

function Plant({ pos, low }: { pos: [number, number, number]; low?: boolean }) {
    return (
        <group position={pos}>
            <Cyl pos={[0, 0.18, 0]} r={0.14} h={0.28} color="#3a2a22" shadows={!low} segs={8} />
            <mesh position={[0, 0.55, 0]}>
                <sphereGeometry args={[0.28, low ? 6 : 10, low ? 6 : 10]} />
                <meshStandardMaterial color="#1a4a32" roughness={0.95} />
            </mesh>
            {!low && (
                <mesh position={[0.12, 0.72, 0.05]}>
                    <sphereGeometry args={[0.16, 8, 8]} />
                    <meshStandardMaterial color="#226040" roughness={0.95} />
                </mesh>
            )}
        </group>
    );
}

/**
 * Expanded house (~22×20) — staged zones, multi-part furniture.
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
            {/* Center runner — sight line spawn → living */}
            {rich && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 1.2]} receiveShadow>
                    <planeGeometry args={[1.55, 12]} />
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
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.01, 6.3]} receiveShadow={sh}>
                <planeGeometry args={[8.5, 6.2]} />
                <meshStandardMaterial color="#1c1628" roughness={0.95} />
            </mesh>
            <StagedBed sh={sh} rich={rich} />
            <StagedDesk pos={[3.55, 0, 5.1]} sh={sh} rich={rich} monitor />
            {/* soul mirror — multi-part frame */}
            <Box pos={[3.95, 1.42, 7.85]} size={[0.1, 1.45, 0.78]} color="#1a1a22" shadows={sh} />
            <Box pos={[3.95, 1.42, 7.85]} size={[0.04, 1.55, 0.88]} color={GOLD} eInt={0.12} emissive={GOLD} shadows={false} metalness={0.4} roughness={0.4} />
            <mesh position={[3.88, 1.42, 7.85]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.62, 1.22]} />
                <meshStandardMaterial
                    color="#4a6a8a"
                    metalness={0.78}
                    roughness={0.15}
                    emissive="#1a3048"
                    emissiveIntensity={0.32}
                />
            </mesh>
            {/* bedroom window */}
            <mesh position={[6.2, 1.85, 9.32]}>
                <planeGeometry args={[1.6, 1.2]} />
                <meshStandardMaterial color="#1e1b4b" emissive="#6366f1" emissiveIntensity={rich ? 0.7 : 0.4} />
            </mesh>
            {rich && <Plant pos={[-3.2, 0, 6.2]} />}

            {/* Interior partial walls (bedroom doorway ~2.4 m gap) */}
            <Box pos={[-3.4, 1.2, 3.05]} size={[4.3, 2.4, 0.22]} color={WALL} shadows={sh} />
            <Box pos={[3.4, 1.2, 3.05]} size={[4.3, 2.4, 0.22]} color={WALL} shadows={sh} />
            {/* door frame trim */}
            <Box pos={[-1.15, 1.2, 3.05]} size={[0.12, 2.4, 0.28]} color={WOOD} shadows={false} />
            <Box pos={[1.15, 1.2, 3.05]} size={[0.12, 2.4, 0.28]} color={WOOD} shadows={false} />
            <Box pos={[0, 2.35, 3.05]} size={[2.4, 0.12, 0.28]} color={WOOD} shadows={false} />

            {/* ── LIVING + MEDIA ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.012, -1.6]} receiveShadow={sh}>
                <planeGeometry args={[7.5, 6.5]} />
                <meshStandardMaterial color={RUG} roughness={0.95} />
            </mesh>
            <StagedSofa sh={sh} rich={rich} />
            <StagedCoffeeTable sh={sh} />
            <StagedMediaWall sh={sh} rich={rich} />
            {/* accent chair — conversation group */}
            <Box pos={[2.65, 0.32, -1.35]} size={[0.75, 0.35, 0.75]} color={FABRIC} shadows={sh} />
            <Box pos={[2.65, 0.7, -1.55]} size={[0.75, 0.45, 0.18]} color={FABRIC_LT} shadows={sh} />
            {/* offering side table */}
            <Box pos={[-2.35, 0.42, -0.35]} size={[1.05, 0.07, 0.68]} color={WOOD} shadows={sh} />
            <Box pos={[-2.35, 0.2, -0.35]} size={[0.9, 0.35, 0.52]} color={WOOD_DK} shadows={sh} />
            {rich && (
                <>
                    <Lamp pos={[-2.9, 0, -2.8]} color="#ffc9a0" low={low} />
                    <Plant pos={[3.4, 0, -3.6]} low={low} />
                    {/* wall art frames living */}
                    <Box pos={[-3.8, 1.7, 0.2]} size={[0.06, 0.7, 0.9]} color="#1a1520" shadows={false} />
                    <mesh position={[-3.75, 1.7, 0.2]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[0.75, 0.55]} />
                        <meshStandardMaterial color="#3a2060" emissive="#6d28d9" emissiveIntensity={0.25} />
                    </mesh>
                </>
            )}

            {/* ── LIBRARY (west) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.6, 0.01, -4.6]} receiveShadow={sh}>
                <planeGeometry args={[5.8, 5.8]} />
                <meshStandardMaterial color="#141018" roughness={0.95} />
            </mesh>
            {(low ? [-4.6] : [-5.5, -4.6, -3.7]).map((z, i) => (
                <StagedShelf
                    key={`lib-${i}`}
                    pos={[-8.65, 1.2, z]}
                    size={[0.42, 2.25, low ? 2.5 : 1.2]}
                    sh={sh}
                    rich={rich}
                />
            ))}
            {/* reading chair + side table */}
            <Box pos={[-5.55, 0.32, -3.9]} size={[0.72, 0.35, 0.72]} color={FABRIC} shadows={sh} />
            <Box pos={[-5.55, 0.68, -4.15]} size={[0.72, 0.42, 0.16]} color={FABRIC_LT} shadows={sh} />
            <Box pos={[-5.55, 0.38, -3.15]} size={[0.45, 0.5, 0.45]} color={WOOD} shadows={sh} />
            <mesh position={[-6.3, 2.5, -4.6]}>
                <planeGeometry args={[2.8, 0.14]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.28} />
            </mesh>
            {rich && <Lamp pos={[-5.55, 0, -3.15]} color="#e8d5b0" low={low} />}

            {/* ── STUDY / CODEX (east-south) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.01, -4.8]} receiveShadow={sh}>
                <planeGeometry args={[5, 4.5]} />
                <meshStandardMaterial color="#18141f" roughness={0.95} />
            </mesh>
            <StagedDesk pos={[6.35, 0, -4.55]} sh={sh} rich={rich} />
            <Box pos={[6.35, 0.9, -4.55]} size={[0.45, 0.08, 0.55]} color="#1a1520" shadows={sh} />
            <StagedShelf pos={[8.55, 1.25, -5.7]} size={[0.4, 2.35, 2.1]} sh={sh} rich={rich} />
            {rich && <Lamp pos={[5.4, 0, -5.4]} color="#c4b5fd" low={low} />}

            {/* ── FORGE BAY (SE) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.6, 0.012, -7.0]} receiveShadow={sh}>
                <planeGeometry args={[4.6, 3.6]} />
                <meshStandardMaterial color="#1a1210" roughness={0.95} />
            </mesh>
            {/* workbench — multi-part */}
            <Box pos={[7.7, 0.48, -7.05]} size={[1.7, 0.85, 0.95]} color="#2a2018" shadows={sh} />
            <Box pos={[7.7, 0.95, -7.05]} size={[1.55, 0.1, 0.82]} color="#3a2a1c" shadows={sh} />
            <Box pos={[7.7, 0.48, -7.55]} size={[1.7, 0.85, 0.08]} color={WOOD_DK} shadows={sh} />
            {/* anvil */}
            <Box pos={[7.4, 1.18, -6.85]} size={[0.58, 0.3, 0.38]} color={METAL} shadows={sh} metalness={0.55} roughness={0.4} />
            <Box pos={[7.4, 1.02, -6.85]} size={[0.35, 0.12, 0.45]} color="#2a2a32" shadows={sh} metalness={0.5} roughness={0.45} />
            <mesh position={[7.95, 1.18, -7.2]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color="#ff6b2c" emissive="#ff6b2c" emissiveIntensity={1.05} toneMapped={false} />
            </mesh>
            {!low && (
                <pointLight position={[7.95, 1.45, -7.1]} intensity={1.5} color="#ff8a3d" distance={5.5} decay={2} />
            )}

            {/* ── CINEMA (east — purple film wall) ── */}
            <Box pos={[8.9, 0.4, 1.25]} size={[0.55, 0.75, 2.6]} color="#151018" shadows={sh} />
            <Box pos={[8.9, 1.58, 1.25]} size={[0.14, 1.65, 2.65]} color="#0e0e12" shadows={sh} />
            <mesh position={[8.82, 1.58, 1.25]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.35, 1.42]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={rich ? 0.65 : 0.48} toneMapped={false} />
            </mesh>
            {rich && (
                <Box pos={[8.9, 2.5, 1.25]} size={[0.2, 0.08, 2.7]} color={GOLD} eInt={0.2} emissive={GOLD} shadows={false} />
            )}

            {/* ── HALL ARCH (west) ── */}
            <Box pos={[-7.75, 1.25, 2.05]} size={[0.36, 2.55, 0.22]} color={WALL} shadows={sh} />
            <Box pos={[-6.55, 1.25, 2.05]} size={[0.36, 2.55, 0.22]} color={WALL} shadows={sh} />
            <Box pos={[-7.15, 2.5, 2.05]} size={[1.35, 0.22, 0.24]} color={WALL} shadows={sh} />
            <Box pos={[-7.15, 2.55, 2.05]} size={[1.5, 0.1, 0.32]} color={WOOD} shadows={false} />
            <mesh position={[-7.15, 2.4, 2.18]}>
                <torusGeometry args={[0.42, 0.05, 6, low ? 12 : 22]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.4} />
            </mesh>

            {/* ── LEDGER + HEARTH ── */}
            <Box pos={[-5.15, 0.48, 2.15]} size={[0.58, 0.95, 0.58]} color={WOOD_DK} shadows={sh} />
            <Box pos={[-5.15, 1.0, 2.15]} size={[0.65, 0.08, 0.65]} color={WOOD} shadows={sh} />
            {/* hearth surround */}
            <Box pos={[-7.55, 0.55, 3.75]} size={[1.4, 1.05, 0.85]} color="#1a1410" shadows={sh} />
            <Box pos={[-7.55, 1.2, 3.75]} size={[1.55, 0.15, 0.95]} color="#2a2018" shadows={sh} />
            <Box pos={[-7.55, 0.45, 4.05]} size={[0.95, 0.7, 0.15]} color="#0a0808" shadows={false} />
            {rich && (
                <Box pos={[-7.55, 1.55, 3.75]} size={[0.9, 0.08, 0.5]} color={GOLD} eInt={0.15} emissive={GOLD} shadows={false} />
            )}

            {/* ── WAYFINDER (north wall map) ── */}
            <Box pos={[0, 1.55, -9.18]} size={[2.15, 1.45, 0.12]} color="#1a1520" shadows={sh} />
            <Box pos={[0, 1.55, -9.18]} size={[2.3, 1.6, 0.06]} color={WOOD} shadows={false} />
            <mesh position={[0, 1.55, -9.1]}>
                <planeGeometry args={[1.85, 1.22]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={rich ? 0.62 : 0.48}
                    toneMapped={false}
                />
            </mesh>
            <Box pos={[-1.55, 1.35, -9.22]} size={[0.38, 2.7, 0.22]} color="#1a1230" shadows={sh} />
            <Box pos={[1.55, 1.35, -9.22]} size={[0.38, 2.7, 0.22]} color="#1a1230" shadows={sh} />

            {/* Ceiling */}
            <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color="#0c0a10" roughness={1} />
            </mesh>

            {rich && (
                <>
                    <mesh position={[-10.32, 1.85, -4]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[1.2, 1.05]} />
                        <meshStandardMaterial color="#0f172a" emissive="#4c1d95" emissiveIntensity={0.4} />
                    </mesh>
                    <mesh position={[10.32, 1.95, -2]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[1.1, 0.95]} />
                        <meshStandardMaterial color="#0f172a" emissive="#1e3a5f" emissiveIntensity={0.45} />
                    </mesh>
                    <mesh position={[-10.32, 1.7, 4]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[0.9, 0.85]} />
                        <meshStandardMaterial color="#0f172a" emissive="#f97316" emissiveIntensity={0.25} />
                    </mesh>
                </>
            )}
        </group>
    );
}
