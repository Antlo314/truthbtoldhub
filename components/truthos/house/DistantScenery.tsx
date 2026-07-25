'use client';

/**
 * The land beyond the neighbourhood.
 *
 * Without this the street just stops and the eye hits a fog wall — the "staring
 * into a void" problem. Real distance reads as *layers*: something close enough
 * to have detail, something mid-range with shape, and something far enough to be
 * pure silhouette. So this builds three rings at different depths, each flatter
 * and bluer than the last, which is how aerial perspective actually works.
 *
 * All of it is procedural geometry — no models — and every ring is instanced, so
 * a horizon full of trees and hills costs a handful of draw calls rather than
 * hundreds. Nothing here is collidable; you can never reach it.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRng } from './houseSkins';
import { getSky } from './DayNightCycle';
import { useFrame } from '@react-three/fiber';

/** Keep-out radius — nothing spawns inside the playable neighbourhood */
const INNER = 118;

type Ring = {
    /** Distance band from world centre */
    from: number;
    to: number;
    count: number;
    minH: number;
    maxH: number;
    /** Base colour before the sky tints it */
    color: string;
    /** How strongly this ring takes the sky's colour (further = more) */
    haze: number;
    kind: 'tree' | 'hill';
};

const RINGS: Ring[] = [
    // Treeline just past the houses — still has individual shapes
    { from: 122, to: 168, count: 190, minH: 7, maxH: 13, color: '#2f4a34', haze: 0.3, kind: 'tree' },
    // Wooded mass — reads as bulk, not individual trees
    { from: 178, to: 250, count: 150, minH: 12, maxH: 22, color: '#2a3f42', haze: 0.58, kind: 'tree' },
    // Far hills — silhouette only
    { from: 265, to: 400, count: 46, minH: 26, maxH: 62, color: '#2b3550', haze: 0.82, kind: 'hill' },
];

function ScenicRing({ ring, low }: { ring: Ring; low: boolean }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const count = low ? Math.floor(ring.count * 0.45) : ring.count;

    // Cones read as conifers; wide flattened cones read as hills
    const geo = useMemo(
        () =>
            ring.kind === 'tree'
                ? new THREE.ConeGeometry(1, 1, low ? 5 : 7)
                : new THREE.ConeGeometry(1, 1, low ? 6 : 9),
        [ring.kind, low],
    );

    const mat = useMemo(
        () =>
            new THREE.MeshLambertMaterial({
                color: new THREE.Color(ring.color),
                // Flat-shaded silhouettes; they never need to catch highlights
                flatShading: true,
                fog: true,
            }),
        [ring.color],
    );

    useLayoutEffect(() => {
        const im = mesh.current;
        if (!im) return;
        // Seeded per ring so the horizon is identical every load
        const rnd = seededRng(Math.floor(ring.from) * 7717 + count);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            // Even angular spread with jitter, so no bald patches or clumping
            const a = ((i + rnd() * 0.85) / count) * Math.PI * 2;
            const r = ring.from + rnd() * (ring.to - ring.from);
            if (r < INNER) continue;

            const h = ring.minH + rnd() * (ring.maxH - ring.minH);
            const w = ring.kind === 'tree' ? h * (0.26 + rnd() * 0.14) : h * (1.5 + rnd() * 1.4);

            dummy.position.set(Math.cos(a) * r, ring.kind === 'hill' ? -h * 0.18 : 0, Math.sin(a) * r);
            dummy.scale.set(w, h, w);
            dummy.rotation.y = rnd() * Math.PI;
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
        }
        im.count = count;
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false;
    }, [ring, count]);

    // Distant things take the sky's colour — that's what sells depth
    const base = useMemo(() => new THREE.Color(ring.color), [ring.color]);
    const scratch = useMemo(() => new THREE.Color(), []);
    useFrame(() => {
        const sky = getSky();
        scratch.setRGB(sky.fogColor[0] / 255, sky.fogColor[1] / 255, sky.fogColor[2] / 255);
        // Darken toward night as well, so silhouettes don't glow after dark
        const lit = 0.35 + sky.daylight * 0.65;
        mat.color.copy(base).multiplyScalar(lit).lerp(scratch, ring.haze);
    });

    return <instancedMesh ref={mesh} args={[geo, mat, count]} />;
}

export default function DistantScenery({ low = false }: { low?: boolean }) {
    // Mobile drops the middle band; the near treeline and far hills carry depth
    const rings = low ? [RINGS[0], RINGS[2]] : RINGS;
    return (
        <group>
            {rings.map((r, i) => (
                <ScenicRing key={i} ring={r} low={low} />
            ))}

            {/* Ground plane out to the hills so the grass never ends mid-air */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow={false}>
                <circleGeometry args={[420, low ? 24 : 48]} />
                <meshLambertMaterial color="#33422f" fog />
            </mesh>
        </group>
    );
}
