'use client';

/**
 * Interior archway built INTO a partition wall (not free-floating pillars).
 * Classical: wall mass · rectangular opening · semicircular arch head · jambs.
 * Low poly — boxes + stepped arch voussoirs.
 */
const WALL = '#3d3550';
const WOOD = '#4a3c2e';
const GOLD = '#fbbf24';

function Box({
    pos,
    size,
    color,
    shadows = true,
    emissive,
    eInt = 0,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    color: string;
    shadows?: boolean;
    emissive?: string;
    eInt?: number;
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
 * Partition along X = wallX (wall plane), opening centered at (wallX, openZ).
 * Opening width ~1.5m, height to arch spring ~2.05m, crown ~2.55m.
 */
export default function HallArch({
    low = false,
    rich = true,
}: {
    low?: boolean;
    rich?: boolean;
}) {
    // West of living — separates living from library/hearth wing
    const wallX = -5.85;
    const openZ = 2.05;
    const openHalf = 0.78; // half opening width
    const wallThick = 0.28;
    const wallH = 3.0;
    const wallTop = wallH / 2;
    const springY = 2.05; // bottom of arch curve
    const crownY = 2.55;

    // Wall runs z from -0.4 to 4.6 except opening
    const wallZ0 = -0.5;
    const wallZ1 = 4.7;
    const leftCenter = (wallZ0 + (openZ - openHalf)) / 2;
    const leftLen = openZ - openHalf - wallZ0;
    const rightCenter = (openZ + openHalf + wallZ1) / 2;
    const rightLen = wallZ1 - (openZ + openHalf);

    // Stepped semicircle (half-ring of boxes) for arch head
    const archSegs = low ? 5 : 8;
    const archR = openHalf + 0.08;
    const voussoirs: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let i = 0; i <= archSegs; i++) {
        const t = i / archSegs;
        const ang = Math.PI * t; // 0..π
        const cx = wallX;
        const cy = springY + Math.sin(ang) * (crownY - springY);
        const cz = openZ + Math.cos(ang) * archR;
        // orient box roughly tangential
        voussoirs.push({
            pos: [cx, cy, cz],
            size: [wallThick + 0.06, 0.16, 0.22],
        });
    }

    return (
        <group>
            {/* Left wall mass (full height) */}
            <Box
                pos={[wallX, wallTop, leftCenter]}
                size={[wallThick, wallH, Math.max(0.2, leftLen)]}
                color={WALL}
            />
            {/* Right wall mass (full height) */}
            <Box
                pos={[wallX, wallTop, rightCenter]}
                size={[wallThick, wallH, Math.max(0.2, rightLen)]}
                color={WALL}
            />
            {/* Spandrel / wall above arch crown → ceiling (opening stays clear below) */}
            <Box
                pos={[wallX, (crownY + wallH) / 2 + 0.05, openZ]}
                size={[wallThick, Math.max(0.2, wallH - crownY - 0.05), openHalf * 2 + 0.45]}
                color={WALL}
            />

            {/* Wood jambs framing the opening */}
            <Box
                pos={[wallX, springY / 2, openZ - openHalf]}
                size={[wallThick + 0.05, springY, 0.14]}
                color={WOOD}
            />
            <Box
                pos={[wallX, springY / 2, openZ + openHalf]}
                size={[wallThick + 0.05, springY, 0.14]}
                color={WOOD}
            />

            {/* Semicircular arch head (voussoirs) */}
            {voussoirs.map((v, i) => (
                <Box key={i} pos={v.pos} size={v.size} color={WOOD} shadows={!low} />
            ))}

            {/* Gold keystone */}
            {rich && (
                <Box
                    pos={[wallX, crownY + 0.02, openZ]}
                    size={[wallThick + 0.08, 0.14, 0.2]}
                    color={GOLD}
                    emissive={GOLD}
                    eInt={0.25}
                    shadows={false}
                />
            )}

            {/* Threshold step */}
            <Box
                pos={[wallX, 0.04, openZ]}
                size={[wallThick + 0.2, 0.08, openHalf * 2 + 0.2]}
                color="#1a1520"
            />

            {/* Soft light in arch mouth */}
            {!low && (
                <pointLight
                    position={[wallX + 0.35, 1.8, openZ]}
                    intensity={0.85}
                    color="#38bdf8"
                    distance={5}
                    decay={2}
                />
            )}
        </group>
    );
}

/** Colliders matching HallArch geometry */
export const HALL_ARCH_COLLIDERS = [
    // Left wall mass
    { x: -5.85, z: 0.55, hx: 0.16, hz: 0.72 },
    // Right wall mass  
    { x: -5.85, z: 3.4, hx: 0.16, hz: 1.15 },
    // Jambs (opening sides)
    { x: -5.85, z: 2.05 - 0.78, hx: 0.16, hz: 0.1 },
    { x: -5.85, z: 2.05 + 0.78, hx: 0.16, hz: 0.1 },
];
