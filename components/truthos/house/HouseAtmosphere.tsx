'use client';

/**
 * Desktop-only atmosphere layer — dust motes hanging in the upper living
 * room's window light. Mount gated behind `!mobile` in HouseCanvas.
 *
 * The volume derives from homeMap's `living` room so it moves with the
 * plan; fireflies live in JungleGeometry (outdoors), not here.
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRng } from './houseSkins';
import { ROOMS, UPPER_Y } from './homeMap';

type Cloud = {
    geometry: THREE.BufferGeometry;
    base: Float32Array;
    phase: Float32Array;
};

function buildCloud(
    seed: number,
    count: number,
    min: [number, number, number],
    max: [number, number, number],
): Cloud {
    const rnd = seededRng(seed);
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        base[i * 3] = min[0] + rnd() * (max[0] - min[0]);
        base[i * 3 + 1] = min[1] + rnd() * (max[1] - min[1]);
        base[i * 3 + 2] = min[2] + rnd() * (max[2] - min[2]);
        phase[i] = rnd() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    return { geometry, base, phase };
}

/** ~120 slow-drifting motes in the upper living room volume */
function DustMotes() {
    const mat = useMemo(
        () =>
            new THREE.PointsMaterial({
                color: '#cfc4ff',
                size: 0.03,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.32,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        [],
    );
    const cloud = useMemo(() => {
        const living = ROOMS.find((r) => r.id === 'living');
        const min: [number, number, number] = living
            ? [living.minX + 0.4, UPPER_Y + 0.3, living.minZ + 0.4]
            : [-5.4, 0.3, -11.6];
        const max: [number, number, number] = living
            ? [living.maxX - 0.4, UPPER_Y + 2.6, living.maxZ - 0.4]
            : [5.4, 2.75, -1.8];
        return buildCloud(101, 120, min, max);
    }, []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        const attr = cloud.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < cloud.phase.length; i++) {
            const p = cloud.phase[i];
            arr[i * 3] = cloud.base[i * 3] + Math.sin(t * 0.16 + p * 1.7) * 0.22;
            arr[i * 3 + 1] = cloud.base[i * 3 + 1] + Math.sin(t * 0.24 + p) * 0.28;
            arr[i * 3 + 2] = cloud.base[i * 3 + 2] + Math.cos(t * 0.12 + p) * 0.18;
        }
        attr.needsUpdate = true;
    });
    return <points geometry={cloud.geometry} material={mat} frustumCulled={false} />;
}

export default function HouseAtmosphere() {
    return <DustMotes />;
}
