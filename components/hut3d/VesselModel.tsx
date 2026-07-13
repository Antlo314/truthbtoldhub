'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';
import type { AvatarHandle } from './AvatarMesh';

const MAN_URL = '/models/vessels/vessel_man.glb';
const WOMAN_URL = '/models/vessels/vessel_woman.glb';

useGLTF.preload(MAN_URL);
useGLTF.preload(WOMAN_URL);

function colorFrom(hex: string) {
    return new THREE.Color(hex);
}

function applyAvatarColors(root: THREE.Object3D, avatar: AvatarConfig) {
    const palette = {
        skin: colorFrom(SKIN_TONES[avatar.skin] ?? SKIN_TONES[6]),
        hair: colorFrom(HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0]),
        top: colorFrom(CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5]),
        bottom: colorFrom(CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12]),
        boots: colorFrom(BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0]),
        eyes: colorFrom(EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0]),
    };

    root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        list.forEach((raw, i) => {
            if (!raw) return;
            const mat = (raw as THREE.Material).clone() as THREE.MeshStandardMaterial;
            if (!('color' in mat) || !mat.color) {
                if (Array.isArray(mesh.material)) mesh.material[i] = mat;
                else mesh.material = mat;
                return;
            }
            const n = (mat.name || raw.name || mesh.name || '').toLowerCase();
            if (n.includes('skin') || n.includes('head')) mat.color.copy(palette.skin);
            else if (n.includes('hair')) mat.color.copy(palette.hair);
            else if (n.includes('top') || n.includes('torso')) mat.color.copy(palette.top);
            else if (
                n.includes('bottom') || n.includes('thigh') || n.includes('shin')
                || n.includes('hip') || n.includes('leg')
            ) mat.color.copy(palette.bottom);
            else if (n.includes('boot')) mat.color.copy(palette.boots);
            else if (n.includes('eye')) mat.color.copy(palette.eyes);

            mat.roughness = mat.roughness ?? 0.8;
            mat.needsUpdate = true;
            if (Array.isArray(mesh.material)) mesh.material[i] = mat;
            else mesh.material = mat;
        });
    });
}

/**
 * Blender-exported vessel GLB (man/woman blockouts).
 * Preview build — simple root sway until meshes are skinned.
 */
export const VesselModel = forwardRef<AvatarHandle, {
    avatar: AvatarConfig;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}>(function VesselModel(
    { avatar, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 },
    ref,
) {
    const kind = avatar.build === 'fem' ? 'woman' : 'man';
    const url = kind === 'woman' ? WOMAN_URL : MAN_URL;
    const gltf = useGLTF(url);

    const motion = useRef<THREE.Group>(null);
    const gait = useRef(0);
    const jump = useRef(0);
    const phase = useRef(0);

    const cloned = useMemo(() => {
        const c = gltf.scene.clone(true);
        return c;
    }, [gltf.scene, kind]);

    useEffect(() => {
        applyAvatarColors(cloned, avatar);
    }, [cloned, avatar]);

    useImperativeHandle(ref, () => ({
        setGait: (s) => { gait.current = THREE.MathUtils.clamp(s, 0, 1); },
        setJump: (a) => { jump.current = THREE.MathUtils.clamp(a, 0, 1); },
    }), []);

    useFrame((_, dt) => {
        const g = motion.current;
        if (!g) return;
        const speed = gait.current;
        const j = jump.current;
        phase.current += dt * (6 + speed * 8);

        if (j > 0.05) {
            g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.12 * j, 12, dt);
            const sy = 1 - 0.04 * j;
            const sx = 1 + 0.03 * j;
            g.scale.y = THREE.MathUtils.damp(g.scale.y, sy, 10, dt);
            g.scale.x = THREE.MathUtils.damp(g.scale.x, sx, 10, dt);
            g.scale.z = THREE.MathUtils.damp(g.scale.z, sx, 10, dt);
        } else if (speed > 0.05) {
            const sway = Math.sin(phase.current) * 0.04 * speed;
            g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.03 * speed, 10, dt);
            g.rotation.z = THREE.MathUtils.damp(g.rotation.z, sway, 12, dt);
            g.position.y = Math.abs(Math.sin(phase.current * 2)) * 0.02 * speed;
            g.scale.x = THREE.MathUtils.damp(g.scale.x, 1, 10, dt);
            g.scale.y = THREE.MathUtils.damp(g.scale.y, 1, 10, dt);
            g.scale.z = THREE.MathUtils.damp(g.scale.z, 1, 10, dt);
        } else {
            g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0, 8, dt);
            g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0, 8, dt);
            g.position.y = THREE.MathUtils.damp(g.position.y, 0, 8, dt);
            g.scale.x = THREE.MathUtils.damp(g.scale.x, 1, 8, dt);
            g.scale.y = THREE.MathUtils.damp(g.scale.y, 1, 8, dt);
            g.scale.z = THREE.MathUtils.damp(g.scale.z, 1, 8, dt);
        }
    });

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group ref={motion}>
                <primitive object={cloned} />
            </group>
        </group>
    );
});
