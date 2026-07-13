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
 * Full house staging — rooms map to Hut features.
 */
export default function HouseGeometry({ low = false }: { low?: boolean }) {
    const sh = !low;
    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={sh}>
                <planeGeometry args={[18, 18]} />
                <meshStandardMaterial color={FLOOR} roughness={0.9} />
            </mesh>
            {!low && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <planeGeometry args={[18, 18]} />
                    <meshBasicMaterial color="#3a3250" transparent opacity={0.12} />
                </mesh>
            )}

            {/* Outer walls */}
            <Box pos={[0, 1.5, -8.5]} size={[18, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[0, 1.5, 8.5]} size={[18, 3, 0.3]} color={WALL} shadows={sh} />
            <Box pos={[-8.5, 1.5, 0]} size={[0.3, 3, 18]} color={WALL} shadows={sh} />
            <Box pos={[8.5, 1.5, 0]} size={[0.3, 3, 18]} color={WALL} shadows={sh} />

            {/* ── BEDROOM (south / +Z) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.01, 5]} receiveShadow={sh}>
                <planeGeometry args={[6, 5]} />
                <meshStandardMaterial color="#1c1628" roughness={0.95} />
            </mesh>
            {/* bed */}
            <Box pos={[-0.5, 0.35, 6.2]} size={[2.2, 0.4, 1.6]} color="#1e1830" shadows={sh} />
            <Box pos={[-0.5, 0.6, 6.2]} size={[2.0, 0.15, 1.4]} color="#2a2240" shadows={sh} />
            {/* desk + computer */}
            <Box pos={[3.2, 0.72, 4.5]} size={[1.6, 0.08, 0.7]} color={WOOD} shadows={sh} />
            <Box pos={[3.2, 0.36, 4.5]} size={[0.1, 0.72, 0.55]} color="#221c16" shadows={sh} />
            <Box pos={[3.2, 1.15, 4.25]} size={[0.85, 0.55, 0.06]} color="#1a1a1e" shadows={sh} />
            <mesh position={[3.2, 1.15, 4.29]}>
                <planeGeometry args={[0.75, 0.45]} />
                <meshStandardMaterial
                    color="#041208"
                    emissive="#22c55e"
                    emissiveIntensity={1.1}
                    toneMapped={false}
                />
            </mesh>
            {/* mirror (soul) */}
            <Box pos={[2.8, 1.4, 6.8]} size={[0.08, 1.2, 0.7]} color="#1a1a22" shadows={sh} />
            <mesh position={[2.75, 1.4, 6.8]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.55, 1.0]} />
                <meshStandardMaterial color="#4a6a8a" metalness={0.7} roughness={0.2} emissive="#1a3048" emissiveIntensity={0.25} />
            </mesh>
            {/* window bedroom */}
            <mesh position={[5.5, 1.8, 8.3]}>
                <planeGeometry args={[1.4, 1.1]} />
                <meshStandardMaterial color="#1e1b4b" emissive="#6366f1" emissiveIntensity={0.4} />
            </mesh>

            {/* ── LIVING ROOM (center) ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.5]} receiveShadow={sh}>
                <planeGeometry args={[7, 5]} />
                <meshStandardMaterial color={RUG} roughness={0.95} />
            </mesh>
            <Box pos={[-1.5, 0.4, -1.0]} size={[1.2, 0.08, 0.7]} color={WOOD} shadows={sh} />
            <Box pos={[-1.5, 0.18, -1.0]} size={[0.08, 0.36, 0.5]} color="#221c16" shadows={sh} />
            <mesh position={[-1.5, 0.48, -1.0]} rotation={[-0.1, 0.4, 0]}>
                <boxGeometry args={[0.28, 0.02, 0.18]} />
                <meshStandardMaterial color="#f5f0e6" roughness={0.85} />
            </mesh>
            <mesh position={[-1.5, 0.5, -1.0]} rotation={[-0.1, 0.4, 0]}>
                <planeGeometry args={[0.22, 0.12]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} />
            </mesh>
            <Box pos={[1.5, 0.4, -2.2]} size={[2.4, 0.5, 0.9]} color="#2a2038" shadows={sh} />
            <Box pos={[1.5, 0.75, -2.5]} size={[2.4, 0.4, 0.25]} color="#322848" shadows={sh} />

            {/* ── LIBRARY ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5.5, 0.01, -4.5]} receiveShadow={sh}>
                <planeGeometry args={[5, 5]} />
                <meshStandardMaterial color="#141018" roughness={0.95} />
            </mesh>
            {(low ? [-5.5] : [-6.0, -5.5, -5.0]).map((z, i) => (
                <group key={i}>
                    <Box pos={[-7.2, 1.2, z]} size={[0.35, 2.2, low ? 2.2 : 1.1]} color={WOOD} shadows={sh} />
                    {!low &&
                        [0.4, 0.9, 1.4, 1.9].map((y) => (
                            <Box key={y} pos={[-7.05, y, z]} size={[0.12, 0.06, 1.0]} color="#3a2e22" shadows={false} />
                        ))}
                    <Box pos={[-7.05, 0.65, z - 0.2]} size={[0.1, 0.35, 0.12]} color="#4a3b6b" shadows={false} />
                    <Box pos={[-7.05, 0.65, z + 0.15]} size={[0.1, 0.4, 0.1]} color="#2f5b45" shadows={false} />
                </group>
            ))}
            <mesh position={[-5.5, 2.4, -4.5]}>
                <planeGeometry args={[2.5, 0.15]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.25} />
            </mesh>

            {/* ── STUDY ── */}
            <Box pos={[5.5, 0.75, -4.2]} size={[1.4, 0.08, 0.8]} color={WOOD} shadows={sh} />
            <Box pos={[5.5, 0.9, -4.2]} size={[0.35, 0.08, 0.45]} color="#1a1520" shadows={sh} />
            <Box pos={[6.5, 1.3, -5.5]} size={[0.4, 2.4, 1.8]} color={WOOD} shadows={sh} />

            {/* ── CINEMA ── */}
            <Box pos={[6.5, 1.5, 1.5]} size={[0.12, 1.4, 2.2]} color="#111" shadows={sh} />
            <mesh position={[6.42, 1.5, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.0, 1.2]} />
                <meshStandardMaterial color="#0a0a12" emissive="#7c3aed" emissiveIntensity={0.45} toneMapped={false} />
            </mesh>

            {/* ── HALL ── */}
            <Box pos={[-6.0, 1.2, 1.5]} size={[0.3, 2.4, 0.15]} color={WALL} shadows={sh} />
            <Box pos={[-5.0, 1.2, 1.5]} size={[0.3, 2.4, 0.15]} color={WALL} shadows={sh} />
            <mesh position={[-5.5, 2.2, 1.5]}>
                <torusGeometry args={[0.35, 0.04, 6, low ? 12 : 20]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.3} />
            </mesh>

            {/* ── SANCTUM DOOR ── */}
            <Box pos={[-1.3, 1.3, -7.8]} size={[0.35, 2.6, 0.35]} color="#1a1230" shadows={sh} />
            <Box pos={[1.3, 1.3, -7.8]} size={[0.35, 2.6, 0.35]} color="#1a1230" shadows={sh} />
            <mesh position={[0, 1.4, -7.65]}>
                <planeGeometry args={[1.8, 2.4]} />
                <meshStandardMaterial color="#2e1065" emissive="#7c5cff" emissiveIntensity={0.5} toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.7, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.45, low ? 12 : 24]} />
                <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.4} side={2} />
            </mesh>

            {/* Interior partial walls */}
            <Box pos={[-2.8, 1.2, 2.5]} size={[3.5, 2.4, 0.2]} color={WALL} shadows={sh} />
            <Box pos={[2.8, 1.2, 2.5]} size={[3.5, 2.4, 0.2]} color={WALL} shadows={sh} />

            {/* Ceiling */}
            <mesh position={[0, 3.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[18, 18]} />
                <meshStandardMaterial color="#0c0a10" roughness={1} />
            </mesh>
        </group>
    );
}
