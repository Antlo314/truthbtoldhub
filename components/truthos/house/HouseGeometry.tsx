'use client';

/**
 * Staged house — furniture on walls, conversation distance, low poly form pass.
 * Sharper corners (crisp boxes) + slightly higher-seg cylinders for smooth edges.
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
const SEGS = 12; // smooth curves, still cheap

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
    segs = SEGS,
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

/** Crisp multi-part bed against south wall */
function StagedBed({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = -0.7;
    const z = 7.7;
    return (
        <group>
            <Box pos={[x, 0.22, z]} size={[2.35, 0.28, 1.85]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x, 0.42, z]} size={[2.15, 0.22, 1.65]} color="#1e1830" shadows={sh} />
            <Box pos={[x, 0.58, z + 0.08]} size={[2.0, 0.12, 1.35]} color={FABRIC_LT} shadows={sh} />
            <Box pos={[x, 0.95, z + 0.88]} size={[2.25, 1.0, 0.12]} color={WOOD} shadows={sh} />
            {rich && (
                <>
                    <Box pos={[x, 1.35, z + 0.88]} size={[1.8, 0.06, 0.05]} color={GOLD} eInt={0.15} emissive={GOLD} shadows={false} />
                    <Box pos={[x - 0.45, 0.72, z + 0.55]} size={[0.55, 0.16, 0.32]} color="#3a3050" shadows={sh} />
                    <Box pos={[x + 0.45, 0.72, z + 0.55]} size={[0.55, 0.16, 0.32]} color="#3a3050" shadows={sh} />
                </>
            )}
            <Box pos={[-2.15, 0.35, z]} size={[0.48, 0.55, 0.48]} color={WOOD} shadows={sh} />
            <Box pos={[0.75, 0.35, z]} size={[0.48, 0.55, 0.48]} color={WOOD} shadows={sh} />
            {rich && (
                <>
                    <Cyl pos={[-2.15, 0.72, z]} r={0.07} h={0.12} color="#1a1520" shadows={false} />
                    <mesh position={[-2.15, 0.88, z]}>
                        <sphereGeometry args={[0.09, SEGS, SEGS]} />
                        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.85} />
                    </mesh>
                </>
            )}
        </group>
    );
}

/** Sofa faces −Z (TV), further back from media wall */
function StagedSofa({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = 0.4;
    const z = 0.15; // further from TV at ~-4.5
    return (
        <group>
            <Box pos={[x, 0.28, z]} size={[2.7, 0.3, 1.05]} color={FABRIC} shadows={sh} />
            <Box pos={[x - 0.55, 0.48, z + 0.06]} size={[1.18, 0.15, 0.85]} color={FABRIC_LT} shadows={sh} />
            <Box pos={[x + 0.55, 0.48, z + 0.06]} size={[1.18, 0.15, 0.85]} color={FABRIC_LT} shadows={sh} />
            {/* back toward +Z (away from TV) */}
            <Box pos={[x, 0.78, z + 0.4]} size={[2.7, 0.55, 0.26]} color={FABRIC} shadows={sh} />
            <Box pos={[x - 1.28, 0.55, z]} size={[0.2, 0.5, 0.95]} color={FABRIC} shadows={sh} />
            <Box pos={[x + 1.28, 0.55, z]} size={[0.2, 0.5, 0.95]} color={FABRIC} shadows={sh} />
            {rich && <Box pos={[x + 0.9, 0.62, z - 0.1]} size={[0.32, 0.1, 0.26]} color="#4a3860" shadows={false} />}
        </group>
    );
}

function StagedCoffeeTable({ sh }: { sh: boolean }) {
    const x = 0.2;
    const z = -1.9;
    return (
        <group>
            <Box pos={[x, 0.34, z]} size={[1.08, 0.05, 0.72]} color={WOOD} shadows={sh} />
            {[
                [-0.4, -0.24],
                [0.4, -0.24],
                [-0.4, 0.24],
                [0.4, 0.24],
            ].map(([ox, oz], i) => (
                <Box key={i} pos={[x + ox, 0.16, z + oz]} size={[0.07, 0.3, 0.07]} color={WOOD_DK} shadows={sh} />
            ))}
        </group>
    );
}

/** TV + console flush against media wall (−Z) */
function StagedMediaWall({ sh, rich }: { sh: boolean; rich: boolean }) {
    const zWall = -4.55;
    return (
        <group>
            {/* low media console against wall */}
            <Box pos={[0, 0.32, zWall]} size={[2.35, 0.55, 0.48]} color="#1a1520" shadows={sh} />
            <Box pos={[0, 0.58, zWall + 0.02]} size={[2.2, 0.04, 0.4]} color={WOOD_DK} shadows={sh} />
            <Box pos={[0, 0.58, zWall + 0.12]} size={[0.72, 0.14, 0.32]} color="#111118" shadows={sh} metalness={0.4} roughness={0.4} />
            <mesh position={[0, 0.58, zWall + 0.28]}>
                <boxGeometry args={[0.12, 0.035, 0.035]} />
                <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.25} toneMapped={false} />
            </mesh>
            {/* TV on wall */}
            <Box pos={[0, 1.62, zWall - 0.12]} size={[2.55, 1.42, 0.08]} color="#0a0a0c" shadows={sh} />
            <mesh position={[0, 1.62, zWall - 0.06]}>
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
                    <Box pos={[-0.95, 0.22, zWall]} size={[0.32, 0.1, 0.24]} color="#151520" shadows={false} />
                    <Box pos={[0.9, 0.22, zWall]} size={[0.36, 0.08, 0.2]} color="#1a1a22" shadows={false} />
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
            <Box pos={[x, 0.74, z]} size={[1.7, 0.06, 0.75]} color={WOOD} shadows={sh} />
            <Box pos={[x - 0.7, 0.36, z]} size={[0.09, 0.7, 0.6]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x + 0.7, 0.36, z]} size={[0.09, 0.7, 0.6]} color={WOOD_DK} shadows={sh} />
            <Box pos={[x, 0.38, z - 0.7]} size={[0.52, 0.07, 0.48]} color={FABRIC} shadows={sh} />
            <Cyl pos={[x, 0.2, z - 0.7]} r={0.055} h={0.28} color={METAL} shadows={false} />
            <Box pos={[x, 0.7, z - 0.88]} size={[0.52, 0.52, 0.07]} color={FABRIC_LT} shadows={sh} />
            {monitor && (
                <>
                    <Box pos={[x, 1.18, z - 0.25]} size={[0.92, 0.58, 0.05]} color="#1a1a1e" shadows={sh} />
                    <mesh position={[x, 1.18, z - 0.21]}>
                        <planeGeometry args={[0.8, 0.48]} />
                        <meshStandardMaterial
                            color="#041208"
                            emissive="#22c55e"
                            emissiveIntensity={1.2}
                            toneMapped={false}
                        />
                    </mesh>
                    <Box pos={[x, 0.86, z - 0.15]} size={[0.16, 0.07, 0.1]} color="#151518" shadows={false} />
                    {rich && <Box pos={[x + 0.52, 0.82, z + 0.08]} size={[0.3, 0.07, 0.2]} color="#1a1a1e" shadows={false} />}
                </>
            )}
        </group>
    );
}

/** Books at mixed depths — some pulled out */
function StagedShelf({
    pos,
    size,
    sh,
    rich,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    sh: boolean;
    rich: boolean;
}) {
    const [x, y, z] = pos;
    const [sx, sy, sz] = size;
    const shelfYs = [0.4, 0.9, 1.4, 1.9];
    const bookColors = ['#4a3060', '#2a4060', '#5a3040', '#1e3a2f', '#4a2a20', '#2a2a48'];
    return (
        <group>
            <Box pos={[x, y, z]} size={[sx, sy, sz]} color={WOOD} shadows={sh} />
            {shelfYs.map((by) => (
                <Box
                    key={by}
                    pos={[x + sx * 0.32, by, z]}
                    size={[sx * 0.28, 0.045, sz * 0.88]}
                    color="#3a2e22"
                    shadows={false}
                />
            ))}
            {rich &&
                shelfYs.flatMap((by, row) =>
                    [-0.55, -0.28, 0, 0.28, 0.52].map((oz, j) => {
                        const pull = ((row * 3 + j) % 5) * 0.028; // depth variance
                        const tall = 0.18 + ((j + row) % 3) * 0.04;
                        return (
                            <Box
                                key={`${by}-${j}`}
                                pos={[x + sx * 0.42 + pull, by + tall * 0.5 + 0.02, z + oz * (sz * 0.35)]}
                                size={[0.07 + (j % 2) * 0.02, tall, 0.12 + (j % 3) * 0.03]}
                                color={bookColors[(row + j) % bookColors.length]}
                                shadows={false}
                            />
                        );
                    }),
                )}
        </group>
    );
}

/** Wall-mounted soul mirror (flush to east wall) */
function WallMirror({ sh, rich }: { sh: boolean; rich: boolean }) {
    // East bedroom wall ≈ x=4.2 interior
    const x = 4.12;
    const z = 7.55;
    return (
        <group>
            {/* wall plate / recess */}
            <Box pos={[x, 1.45, z]} size={[0.08, 1.65, 0.95]} color="#1a1520" shadows={sh} />
            {/* outer frame */}
            <Box pos={[x - 0.02, 1.45, z]} size={[0.06, 1.55, 0.85]} color={WOOD_DK} shadows={sh} />
            {/* gold trim */}
            <Box
                pos={[x - 0.04, 1.45, z]}
                size={[0.03, 1.48, 0.78]}
                color={GOLD}
                eInt={rich ? 0.18 : 0.1}
                emissive={GOLD}
                shadows={false}
                metalness={0.55}
                roughness={0.35}
            />
            {/* glass plane faces into room (−X) */}
            <mesh position={[x - 0.08, 1.45, z]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[0.68, 1.32]} />
                <meshStandardMaterial
                    color="#6a8aaa"
                    metalness={0.82}
                    roughness={0.12}
                    emissive="#1a3048"
                    emissiveIntensity={0.35}
                />
            </mesh>
            {rich && (
                <mesh position={[x - 0.09, 1.45, z]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[0.55, 0.9]} />
                    <meshBasicMaterial color="#a8c4e0" transparent opacity={0.08} />
                </mesh>
            )}
        </group>
    );
}

/** West wall front door — exterior later */
function FrontDoor({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = -10.22;
    const z = 0.15;
    return (
        <group>
            {/* frame */}
            <Box pos={[x, 1.35, z - 0.62]} size={[0.22, 2.55, 0.14]} color={WOOD} shadows={sh} />
            <Box pos={[x, 1.35, z + 0.62]} size={[0.22, 2.55, 0.14]} color={WOOD} shadows={sh} />
            <Box pos={[x, 2.55, z]} size={[0.22, 0.14, 1.35]} color={WOOD} shadows={sh} />
            {/* door slab */}
            <Box pos={[x + 0.06, 1.25, z]} size={[0.1, 2.35, 1.15]} color={WOOD_DK} shadows={sh} />
            {/* panels */}
            <Box pos={[x + 0.12, 1.7, z]} size={[0.04, 0.7, 0.85]} color="#1a1410" shadows={false} />
            <Box pos={[x + 0.12, 0.85, z]} size={[0.04, 0.7, 0.85]} color="#1a1410" shadows={false} />
            {/* handle */}
            <Cyl pos={[x + 0.14, 1.15, z + 0.38]} r={0.035} h={0.08} color={GOLD} shadows={false} segs={8} />
            {rich && (
                <mesh position={[x + 0.16, 1.15, z + 0.38]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} emissive={GOLD} emissiveIntensity={0.15} />
                </mesh>
            )}
        </group>
    );
}

/** Modern Signal Studio desk (replaces forge) */
function SignalStudio({ sh, rich }: { sh: boolean; rich: boolean }) {
    const x = 7.65;
    const z = -7.15;
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.5, 0.012, -7.0]} receiveShadow={sh}>
                <planeGeometry args={[4.4, 3.4]} />
                <meshStandardMaterial color="#121018" roughness={0.95} />
            </mesh>
            {/* L-desk */}
            <Box pos={[x, 0.72, z]} size={[1.85, 0.06, 0.85]} color="#1e1a28" shadows={sh} />
            <Box pos={[x + 0.55, 0.72, z - 0.55]} size={[0.75, 0.06, 1.1]} color="#1e1a28" shadows={sh} />
            <Box pos={[x - 0.75, 0.36, z]} size={[0.08, 0.7, 0.7]} color="#15121c" shadows={sh} />
            <Box pos={[x + 0.75, 0.36, z]} size={[0.08, 0.7, 0.7]} color="#15121c" shadows={sh} />
            {/* dual monitors */}
            <Box pos={[x - 0.25, 1.2, z - 0.28]} size={[0.7, 0.48, 0.04]} color="#0a0a0e" shadows={sh} />
            <Box pos={[x + 0.45, 1.2, z - 0.28]} size={[0.7, 0.48, 0.04]} color="#0a0a0e" shadows={sh} />
            <mesh position={[x - 0.25, 1.2, z - 0.25]}>
                <planeGeometry args={[0.62, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#f97316" emissiveIntensity={rich ? 0.55 : 0.4} toneMapped={false} />
            </mesh>
            <mesh position={[x + 0.45, 1.2, z - 0.25]}>
                <planeGeometry args={[0.62, 0.4]} />
                <meshStandardMaterial color="#0a1020" emissive="#22d3ee" emissiveIntensity={rich ? 0.45 : 0.32} toneMapped={false} />
            </mesh>
            {/* mic arm / pad */}
            <Box pos={[x + 0.15, 0.8, z + 0.15]} size={[0.28, 0.04, 0.2]} color="#111" shadows={false} />
            <Cyl pos={[x - 0.55, 0.95, z + 0.1]} r={0.02} h={0.4} color={METAL} shadows={false} segs={8} />
            {rich && (
                <pointLight position={[x, 1.5, z]} intensity={1.2} color="#fb923c" distance={5} decay={2} />
            )}
        </group>
    );
}

function Lamp({ pos, color = '#fde68a', low }: { pos: [number, number, number]; color?: string; low?: boolean }) {
    return (
        <group position={pos}>
            <Cyl pos={[0, 0.55, 0]} r={0.035} h={1.1} color={WOOD_DK} shadows={false} segs={8} />
            <mesh position={[0, 1.18, 0]}>
                <coneGeometry args={[0.16, 0.26, low ? 8 : SEGS]} />
                <meshStandardMaterial color="#2a2438" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.05, 0]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
            </mesh>
            {!low && <pointLight position={[0, 1.12, 0]} intensity={0.5} color={color} distance={4.2} decay={2} />}
        </group>
    );
}

function Plant({ pos, low }: { pos: [number, number, number]; low?: boolean }) {
    return (
        <group position={pos}>
            <Cyl pos={[0, 0.16, 0]} r={0.13} h={0.26} color="#3a2a22" shadows={!low} segs={8} />
            <mesh position={[0, 0.52, 0]}>
                <sphereGeometry args={[0.26, low ? 6 : 10, low ? 6 : 10]} />
                <meshStandardMaterial color="#1a4a32" roughness={0.95} />
            </mesh>
        </group>
    );
}

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
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={sh}>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color={FLOOR} roughness={0.9} />
            </mesh>
            {!low && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <planeGeometry args={[floorW, floorD]} />
                    <meshBasicMaterial color="#3a3250" transparent opacity={0.1} />
                </mesh>
            )}

            {/* Outer walls */}
            <Box pos={[0, 1.5, -9.5]} size={[floorW, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[0, 1.5, 9.5]} size={[floorW, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[-10.5, 1.5, 0]} size={[0.3, 3, floorD]} color={WALL} shadows={sh} />
            <Box pos={[10.5, 1.5, 0]} size={[0.3, 3, floorD]} color={WALL} shadows={sh} />

            {rich &&
                [-7, -3.5, 0, 3.5, 7].map((bz) => (
                    <Box key={`beam-${bz}`} pos={[0, 2.85, bz]} size={[20.4, 0.12, 0.18]} color={WOOD} shadows={false} />
                ))}

            {/* ── BEDROOM ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.01, 6.4]} receiveShadow={sh}>
                <planeGeometry args={[8.5, 6]} />
                <meshStandardMaterial color="#1c1628" roughness={0.95} />
            </mesh>
            <StagedBed sh={sh} rich={rich} />
            <StagedDesk pos={[3.7, 0, 5.15]} sh={sh} rich={rich} monitor />
            <WallMirror sh={sh} rich={rich} />
            <mesh position={[6.2, 1.85, 9.32]}>
                <planeGeometry args={[1.55, 1.15]} />
                <meshStandardMaterial color="#1e1b4b" emissive="#6366f1" emissiveIntensity={rich ? 0.7 : 0.4} />
            </mesh>
            {rich && <Plant pos={[-3.2, 0, 6.0]} />}

            {/* Bedroom doorway */}
            <Box pos={[-3.45, 1.2, 3.0]} size={[4.4, 2.4, 0.2]} color={WALL} shadows={sh} />
            <Box pos={[3.45, 1.2, 3.0]} size={[4.4, 2.4, 0.2]} color={WALL} shadows={sh} />
            <Box pos={[-1.15, 1.2, 3.0]} size={[0.1, 2.4, 0.26]} color={WOOD} shadows={false} />
            <Box pos={[1.15, 1.2, 3.0]} size={[0.1, 2.4, 0.26]} color={WOOD} shadows={false} />
            <Box pos={[0, 2.35, 3.0]} size={[2.4, 0.1, 0.26]} color={WOOD} shadows={false} />

            {/* ── LIVING — sofa back, TV on wall ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.012, -1.8]} receiveShadow={sh}>
                <planeGeometry args={[7.2, 7.2]} />
                <meshStandardMaterial color={RUG} roughness={0.95} />
            </mesh>
            <StagedSofa sh={sh} rich={rich} />
            <StagedCoffeeTable sh={sh} />
            <StagedMediaWall sh={sh} rich={rich} />
            {/* accent chair east of group */}
            <Box pos={[2.85, 0.32, -0.4]} size={[0.72, 0.32, 0.72]} color={FABRIC} shadows={sh} />
            <Box pos={[2.85, 0.68, -0.58]} size={[0.72, 0.42, 0.16]} color={FABRIC_LT} shadows={sh} />
            {/* offering console against west living wall */}
            <Box pos={[-2.7, 0.42, 0.2]} size={[0.95, 0.06, 0.7]} color={WOOD} shadows={sh} />
            <Box pos={[-2.7, 0.2, 0.2]} size={[0.82, 0.32, 0.55]} color={WOOD_DK} shadows={sh} />
            {rich && (
                <>
                    <Lamp pos={[-3.2, 0, 1.1]} color="#ffc9a0" low={low} />
                    <Plant pos={[3.5, 0, -3.2]} low={low} />
                </>
            )}

            {/* ── FRONT DOOR (west) ── */}
            <FrontDoor sh={sh} rich={rich} />

            {/* ── LIBRARY ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.6, 0.01, -4.5]} receiveShadow={sh}>
                <planeGeometry args={[5.6, 5.6]} />
                <meshStandardMaterial color="#141018" roughness={0.95} />
            </mesh>
            {(low ? [-4.5] : [-5.4, -4.5, -3.6]).map((sz, i) => (
                <StagedShelf
                    key={`lib-${i}`}
                    pos={[-8.75, 1.2, sz]}
                    size={[0.4, 2.25, low ? 2.4 : 1.15]}
                    sh={sh}
                    rich={rich}
                />
            ))}
            <Box pos={[-5.6, 0.32, -3.85]} size={[0.7, 0.32, 0.7]} color={FABRIC} shadows={sh} />
            <Box pos={[-5.6, 0.66, -4.08]} size={[0.7, 0.4, 0.14]} color={FABRIC_LT} shadows={sh} />
            {rich && <Lamp pos={[-5.6, 0, -3.1]} color="#e8d5b0" low={low} />}

            {/* ── STUDY ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.01, -4.7]} receiveShadow={sh}>
                <planeGeometry args={[4.8, 4.4]} />
                <meshStandardMaterial color="#18141f" roughness={0.95} />
            </mesh>
            <StagedDesk pos={[6.4, 0, -4.55]} sh={sh} rich={rich} />
            <Box pos={[6.4, 0.88, -4.55]} size={[0.42, 0.07, 0.5]} color="#1a1520" shadows={sh} />
            <StagedShelf pos={[8.6, 1.25, -5.7]} size={[0.38, 2.3, 2.0]} sh={sh} rich={rich} />

            {/* ── STUDIO (was forge) ── */}
            <SignalStudio sh={sh} rich={rich} />

            {/* ── CINEMA on east wall ── */}
            <Box pos={[8.95, 0.4, 1.25]} size={[0.5, 0.7, 2.55]} color="#151018" shadows={sh} />
            <Box pos={[8.95, 1.58, 1.25]} size={[0.12, 1.6, 2.6]} color="#0e0e12" shadows={sh} />
            <mesh position={[8.88, 1.58, 1.25]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.3, 1.38]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={rich ? 0.62 : 0.45} toneMapped={false} />
            </mesh>

            {/* ── HALL ── */}
            <Box pos={[-7.7, 1.25, 2.0]} size={[0.34, 2.5, 0.2]} color={WALL} shadows={sh} />
            <Box pos={[-6.5, 1.25, 2.0]} size={[0.34, 2.5, 0.2]} color={WALL} shadows={sh} />
            <Box pos={[-7.1, 2.48, 2.0]} size={[1.3, 0.18, 0.22]} color={WALL} shadows={sh} />
            <mesh position={[-7.1, 2.38, 2.12]}>
                <torusGeometry args={[0.4, 0.045, 6, low ? 12 : 20]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.38} />
            </mesh>

            {/* ── LEDGER + HEARTH ── */}
            <Box pos={[-5.1, 0.48, 2.1]} size={[0.55, 0.92, 0.55]} color={WOOD_DK} shadows={sh} />
            <Box pos={[-5.1, 0.98, 2.1]} size={[0.62, 0.07, 0.62]} color={WOOD} shadows={sh} />
            <Box pos={[-7.55, 0.55, 3.7]} size={[1.35, 1.0, 0.82]} color="#1a1410" shadows={sh} />
            <Box pos={[-7.55, 0.45, 4.0]} size={[0.9, 0.65, 0.12]} color="#0a0808" shadows={false} />

            {/* ── WAYFINDER ── */}
            <Box pos={[0, 1.55, -9.18]} size={[2.1, 1.4, 0.1]} color="#1a1520" shadows={sh} />
            <mesh position={[0, 1.55, -9.1]}>
                <planeGeometry args={[1.8, 1.18]} />
                <meshStandardMaterial color="#041208" emissive="#22c55e" emissiveIntensity={rich ? 0.6 : 0.45} toneMapped={false} />
            </mesh>
            <Box pos={[-1.5, 1.35, -9.22]} size={[0.35, 2.65, 0.2]} color="#1a1230" shadows={sh} />
            <Box pos={[1.5, 1.35, -9.22]} size={[0.35, 2.65, 0.2]} color="#1a1230" shadows={sh} />

            {/* Ceiling */}
            <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color="#0c0a10" roughness={1} />
            </mesh>

            {rich && (
                <>
                    <mesh position={[-10.32, 1.85, -4]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[1.1, 1.0]} />
                        <meshStandardMaterial color="#0f172a" emissive="#4c1d95" emissiveIntensity={0.38} />
                    </mesh>
                    <mesh position={[10.32, 1.95, -2]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[1.0, 0.9]} />
                        <meshStandardMaterial color="#0f172a" emissive="#1e3a5f" emissiveIntensity={0.42} />
                    </mesh>
                </>
            )}
        </group>
    );
}
