'use client';

/**
 * Desktop-only atmosphere layer — living-room dust motes, back-garden
 * fireflies, faint moonlight shafts through the night windows.
 * Mount gated behind `!mobile` in HouseCanvas (never on the low tier).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRng } from './houseSkins';

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

/** ~120 slow-drifting motes in the living room volume */
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
    const cloud = useMemo(() => buildCloud(101, 120, [-5.4, 0.3, -11.6], [5.4, 2.75, -1.8]), []);
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

/** ~70 fireflies wandering the back garden, gentle group flicker */
function Fireflies() {
    const mat = useMemo(
        () =>
            new THREE.PointsMaterial({
                color: '#d9f99d',
                size: 0.06,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.75,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        [],
    );
    const cloud = useMemo(() => buildCloud(202, 70, [-9, 0.3, -20.4], [9, 1.9, -13.3]), []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        const attr = cloud.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < cloud.phase.length; i++) {
            const p = cloud.phase[i];
            arr[i * 3] = cloud.base[i * 3] + Math.sin(t * 0.5 + p * 2.1) * 0.6;
            arr[i * 3 + 1] = cloud.base[i * 3 + 1] + Math.sin(t * 0.9 + p) * 0.32;
            arr[i * 3 + 2] = cloud.base[i * 3 + 2] + Math.cos(t * 0.42 + p) * 0.6;
        }
        attr.needsUpdate = true;
        mat.opacity = 0.55 + Math.sin(t * 2.1) * 0.28;
    });
    return <points geometry={cloud.geometry} material={mat} frustumCulled={false} />;
}

/*
 * Moonlight shafts removed — windows are now real openings with transparent
 * glass, so the actual sky/moon show through instead of faked light planes.
 */

export default function HouseAtmosphere() {
    return (
        <group>
            <DustMotes />
            <Fireflies />
        </group>
    );
}
