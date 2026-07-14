'use client';

/**
 * Interior archway built INTO a partition wall — fully skinned.
 */
import type * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';

function MatBox({
    pos,
    size,
    material,
    shadows = true,
}: {
    pos: [number, number, number];
    size: [number, number, number];
    material: THREE.Material;
    shadows?: boolean;
}) {
    return (
        <mesh position={pos} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={size} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

export default function HallArch({
    low = false,
    rich = true,
    mats,
}: {
    low?: boolean;
    rich?: boolean;
    mats: HouseMaterials;
}) {
    const wallX = -5.85;
    const openZ = 2.05;
    const openHalf = 0.78;
    const wallThick = 0.28;
    const wallH = 3.0;
    const wallTop = wallH / 2;
    const springY = 2.05;
    const crownY = 2.55;

    const wallZ0 = -0.5;
    const wallZ1 = 4.7;
    const leftCenter = (wallZ0 + (openZ - openHalf)) / 2;
    const leftLen = openZ - openHalf - wallZ0;
    const rightCenter = (openZ + openHalf + wallZ1) / 2;
    const rightLen = wallZ1 - (openZ + openHalf);

    const archSegs = low ? 5 : 8;
    const archR = openHalf + 0.08;
    const voussoirs: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let i = 0; i <= archSegs; i++) {
        const t = i / archSegs;
        const ang = Math.PI * t;
        const cy = springY + Math.sin(ang) * (crownY - springY);
        const cz = openZ + Math.cos(ang) * archR;
        voussoirs.push({
            pos: [wallX, cy, cz],
            size: [wallThick + 0.06, 0.16, 0.22],
        });
    }

    return (
        <group>
            <MatBox
                pos={[wallX, wallTop, leftCenter]}
                size={[wallThick, wallH, Math.max(0.2, leftLen)]}
                material={mats.plaster}
            />
            <MatBox
                pos={[wallX, wallTop, rightCenter]}
                size={[wallThick, wallH, Math.max(0.2, rightLen)]}
                material={mats.plaster}
            />
            <MatBox
                pos={[wallX, (crownY + wallH) / 2 + 0.05, openZ]}
                size={[wallThick, Math.max(0.2, wallH - crownY - 0.05), openHalf * 2 + 0.45]}
                material={mats.plaster}
            />
            <MatBox
                pos={[wallX, springY / 2, openZ - openHalf]}
                size={[wallThick + 0.05, springY, 0.14]}
                material={mats.wood}
            />
            <MatBox
                pos={[wallX, springY / 2, openZ + openHalf]}
                size={[wallThick + 0.05, springY, 0.14]}
                material={mats.wood}
            />
            {voussoirs.map((v, i) => (
                <MatBox key={i} pos={v.pos} size={v.size} material={mats.wood} shadows={!low} />
            ))}
            {rich && (
                <MatBox
                    pos={[wallX, crownY + 0.02, openZ]}
                    size={[wallThick + 0.08, 0.14, 0.2]}
                    material={mats.gold}
                    shadows={false}
                />
            )}
            <MatBox
                pos={[wallX, 0.04, openZ]}
                size={[wallThick + 0.2, 0.08, openHalf * 2 + 0.2]}
                material={mats.stone}
            />
            {!low && (
                <pointLight
                    position={[wallX + 0.35, 1.8, openZ]}
                    intensity={0.95}
                    color="#38bdf8"
                    distance={5}
                    decay={2}
                />
            )}
        </group>
    );
}
