'use client';

/**
 * Dims every practical light inside it as the sun comes up.
 *
 * The room lamps were authored for a permanently-dark house. Once the world
 * has a day, leaving them at full through noon reads as flat and blown out —
 * so this scales each child light's intensity by `lampLevel` (1 at night, 0 in
 * daylight) while remembering what each light was originally set to.
 *
 * It walks the light objects directly rather than re-rendering: this runs
 * every frame, and a React update per frame for a dozen lights would cost far
 * more than the traversal.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSky } from './DayNightCycle';

export default function LampGroup({
    children,
    /** Fraction of original brightness kept at full daylight */
    floor = 0.06,
}: {
    children: ReactNode;
    floor?: number;
}) {
    const group = useRef<THREE.Group>(null);
    const base = useRef<Map<THREE.Light, number>>(new Map());
    // Emissive surfaces (cove strips, bulb cores) and glow planes opt in via
    // material.userData.lampEmissive / .lampGlow — Maps keyed by material so
    // shared materials are captured once no matter how many meshes use them.
    const baseEmissive = useRef<Map<THREE.MeshStandardMaterial, number>>(new Map());
    const baseGlow = useRef<Map<THREE.Material, number>>(new Map());

    // Capture authored intensities once the children exist
    useEffect(() => {
        const g = group.current;
        if (!g) return;
        const map = base.current;
        g.traverse((o) => {
            const l = o as THREE.Light;
            if (l.isLight && !map.has(l)) map.set(l, l.intensity);
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const mat of mats) {
                    if (!mat) continue;
                    const std = mat as THREE.MeshStandardMaterial;
                    if (mat.userData.lampEmissive && 'emissiveIntensity' in std && !baseEmissive.current.has(std)) {
                        baseEmissive.current.set(std, std.emissiveIntensity);
                    }
                    if (mat.userData.lampGlow && !baseGlow.current.has(mat)) {
                        mat.transparent = true;
                        baseGlow.current.set(mat, mat.opacity);
                    }
                }
            }
        });
    });

    useFrame(() => {
        const g = group.current;
        if (!g) return;
        const level = getSky().lampLevel;
        const scale = floor + (1 - floor) * level;
        base.current.forEach((original, light) => {
            light.intensity = original * scale;
        });
        baseEmissive.current.forEach((original, mat) => {
            mat.emissiveIntensity = original * scale;
        });
        baseGlow.current.forEach((original, mat) => {
            mat.opacity = original * scale;
        });
    });

    return <group ref={group}>{children}</group>;
}
