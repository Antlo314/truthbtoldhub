'use client';

/**
 * Committed marks on The Mark's plaster. One plane per cell, textures
 * reused from the data-URL the wall API already stores.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { WALL_CELLS, WALL_CELL, type WallMark } from '@/lib/truthos/wall';

export default function WallMural() {
    const [marks, setMarks] = useState<WallMark[]>([]);

    useEffect(() => {
        let alive = true;
        fetch('/api/wall')
            .then((r) => r.json())
            .then((j) => {
                if (alive) setMarks(j.marks ?? []);
            })
            .catch(() => {
                if (alive) setMarks([]);
            });
        return () => {
            alive = false;
        };
    }, []);

    const placed = useMemo(() => {
        return marks
            .map((m) => {
                const cell = WALL_CELLS.find((c) => c.face === m.face && c.col === m.col && c.row === m.row);
                if (!cell) return null;
                return { m, cell };
            })
            .filter((x): x is { m: WallMark; cell: (typeof WALL_CELLS)[number] } => !!x);
    }, [marks]);

    return (
        <group>
            {placed.map(({ m, cell }) => (
                <MarkPlane key={`${m.face}-${m.col}-${m.row}`} mark={m} x={cell.x} y={cell.y} z={cell.z} ry={cell.ry} />
            ))}
        </group>
    );
}

function MarkPlane({
    mark,
    x,
    y,
    z,
    ry,
}: {
    mark: WallMark;
    x: number;
    y: number;
    z: number;
    ry: number;
}) {
    const tex = useMemo(() => {
        const t = new THREE.TextureLoader().load(mark.png);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.NearestFilter;
        t.magFilter = THREE.NearestFilter;
        return t;
    }, [mark.png]);

    useEffect(() => () => tex.dispose(), [tex]);

    return (
        <group position={[x, y, z]} rotation={[0, ry, 0]}>
            {mark.goldFrame && (
                <mesh position={[0, 0, -0.012]}>
                    <planeGeometry args={[WALL_CELL + 0.04, WALL_CELL + 0.04]} />
                    <meshBasicMaterial color="#f5c451" />
                </mesh>
            )}
            <mesh>
                <planeGeometry args={[WALL_CELL - 0.02, WALL_CELL - 0.02]} />
                <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
        </group>
    );
}
