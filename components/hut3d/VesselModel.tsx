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

type BoneMap = Record<string, THREE.Object3D>;

function findBones(root: THREE.Object3D): BoneMap {
    const map: BoneMap = {};
    root.traverse((o) => {
        // Blender bones often export as Bone_* or plain names
        const n = o.name.replace(/^Armature_?(man|woman)?_?/i, '').replace(/^mixamorig:/, '');
        if (n && !map[n]) map[n] = o;
        // also index short aliases
        const lower = n.toLowerCase();
        if (lower.includes('leftupperleg') || lower === 'leftupleg') map.LeftUpperLeg = o;
        if (lower.includes('rightupperleg') || lower === 'rightupleg') map.RightUpperLeg = o;
        if (lower.includes('leftlowerleg') || lower === 'leftleg') map.LeftLowerLeg = o;
        if (lower.includes('rightlowerleg') || lower === 'rightleg') map.RightLowerLeg = o;
        if (lower.includes('leftupperarm') || lower === 'leftarm') map.LeftUpperArm = o;
        if (lower.includes('rightupperarm') || lower === 'rightarm') map.RightUpperArm = o;
        if (lower.includes('leftlowerarm') || lower === 'leftforearm') map.LeftLowerArm = o;
        if (lower.includes('rightlowerarm') || lower === 'rightforearm') map.RightLowerArm = o;
        if (lower === 'hips' || lower === 'pelvis') map.Hips = o;
        if (lower === 'spine') map.Spine = o;
        if (lower === 'chest' || lower === 'spine1' || lower === 'spine2') map.Chest = o;
        if (lower === 'head') map.Head = o;
    });
    return map;
}

function applyAvatarColors(root: THREE.Object3D, avatar: AvatarConfig) {
    const palette = {
        skin: new THREE.Color(SKIN_TONES[avatar.skin] ?? SKIN_TONES[6]),
        hair: new THREE.Color(HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0]),
        top: new THREE.Color(CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5]),
        bottom: new THREE.Color(CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12]),
        boots: new THREE.Color(BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0]),
        eyes: new THREE.Color(EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0]),
    };

    root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const next = list.map((raw) => {
            if (!raw) return raw;
            const mat = (raw as THREE.Material).clone() as THREE.MeshStandardMaterial;
            if (!('color' in mat) || !mat.color) return mat;
            const n = `${mat.name} ${raw.name} ${mesh.name}`.toLowerCase();
            if (n.includes('skin') || n.includes('head') || n.includes('hand') || n.includes('arm'))
                mat.color.copy(palette.skin);
            else if (n.includes('hair')) mat.color.copy(palette.hair);
            else if (n.includes('top') || n.includes('torso') || n.includes('chest'))
                mat.color.copy(palette.top);
            else if (
                n.includes('bottom') || n.includes('thigh') || n.includes('shin')
                || n.includes('hip') || n.includes('leg')
            ) mat.color.copy(palette.bottom);
            else if (n.includes('boot') || n.includes('foot')) mat.color.copy(palette.boots);
            else if (n.includes('eye')) mat.color.copy(palette.eyes);
            mat.needsUpdate = true;
            return mat;
        });
        mesh.material = next.length === 1 ? next[0] : next;
    });
}

function dampEuler(obj: THREE.Object3D | undefined, axis: 'x' | 'y' | 'z', target: number, lambda: number, dt: number) {
    if (!obj) return;
    obj.rotation[axis] = THREE.MathUtils.damp(obj.rotation[axis], target, lambda, dt);
}

/**
 * Rigged Blender vessel — limbs bone-parented, walk/jump driven in Three.js.
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

    const gait = useRef(0);
    const jump = useRef(0);
    const phase = useRef(0);
    const bones = useRef<BoneMap>({});

    const cloned = useMemo(() => gltf.scene.clone(true), [gltf.scene, kind]);

    useEffect(() => {
        applyAvatarColors(cloned, avatar);
        bones.current = findBones(cloned);
        // Debug once in dev
        if (process.env.NODE_ENV === 'development') {
            const keys = Object.keys(bones.current).filter((k) =>
                /Leg|Arm|Hips|Spine|Chest|Head/i.test(k),
            );
            console.log('[VesselModel] bones', kind, keys);
        }
    }, [cloned, avatar, kind]);

    useImperativeHandle(ref, () => ({
        setGait: (s) => { gait.current = THREE.MathUtils.clamp(s, 0, 1); },
        setJump: (a) => { jump.current = THREE.MathUtils.clamp(a, 0, 1); },
    }), []);

    useFrame((_, dt) => {
        const b = bones.current;
        const g = gait.current;
        const j = jump.current;
        const groundGait = g * (1 - j * 0.85);

        const rate = THREE.MathUtils.lerp(0, 9.0, groundGait);
        phase.current += dt * (rate || (j > 0.1 ? 1.5 : 0.3));

        const swing = Math.sin(phase.current) * groundGait;
        const opp = -swing;

        // Jump pose overlays
        const jLeg = -0.7 * j;
        const jKnee = 0.9 * j;
        const jArm = -0.95 * j;
        const jArmOut = 0.25 * j;

        // Legs (swing in local X — forward/back)
        dampEuler(b.LeftUpperLeg, 'x', swing * 0.75 + jLeg, 14, dt);
        dampEuler(b.RightUpperLeg, 'x', opp * 0.75 + jLeg * 0.95, 14, dt);
        dampEuler(b.LeftLowerLeg, 'x', Math.max(0, -swing) * 0.55 + jKnee, 14, dt);
        dampEuler(b.RightLowerLeg, 'x', Math.max(0, -opp) * 0.55 + jKnee * 0.95, 14, dt);

        // Arms opposite to legs — attached via bones
        dampEuler(b.LeftUpperArm, 'x', opp * 0.55 + jArm, 14, dt);
        dampEuler(b.RightUpperArm, 'x', swing * 0.55 + jArm * 0.95, 14, dt);
        dampEuler(b.LeftUpperArm, 'z', 0.15 + jArmOut, 10, dt);
        dampEuler(b.RightUpperArm, 'z', -0.15 - jArmOut, 10, dt);
        dampEuler(b.LeftLowerArm, 'x', Math.max(0, opp) * 0.25 + 0.15 * j, 12, dt);
        dampEuler(b.RightLowerArm, 'x', Math.max(0, swing) * 0.25 + 0.15 * j, 12, dt);

        // Hips / spine sway
        dampEuler(b.Hips, 'y', -swing * 0.06, 10, dt);
        dampEuler(b.Hips, 'x', j * -0.05, 10, dt);
        dampEuler(b.Spine ?? b.Chest, 'y', swing * 0.05, 10, dt);
        dampEuler(b.Chest, 'x', j * -0.08, 10, dt);
        dampEuler(b.Head, 'y', -swing * 0.04, 8, dt);

        // Idle settle
        if (groundGait < 0.06 && j < 0.05) {
            dampEuler(b.LeftUpperLeg, 'x', 0, 8, dt);
            dampEuler(b.RightUpperLeg, 'x', 0, 8, dt);
            dampEuler(b.LeftLowerLeg, 'x', 0, 8, dt);
            dampEuler(b.RightLowerLeg, 'x', 0, 8, dt);
            dampEuler(b.LeftUpperArm, 'x', 0, 8, dt);
            dampEuler(b.RightUpperArm, 'x', 0, 8, dt);
            dampEuler(b.Hips, 'y', 0, 8, dt);
            dampEuler(b.Hips, 'x', 0, 8, dt);
        }
    });

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Face +Z (our player forward) */}
            <primitive object={cloned} />
        </group>
    );
});
