'use client';

/**
 * Hierarchical humanoid vessel (Three.js groups = joints).
 * Blender bone-parented GLBs were mis-exported (limbs above head);
 * this rebuild keeps appendages attached and walk/jump readable.
 * Refs: public/references/characters/NOTES.md
 */
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';
import type { AvatarHandle } from './AvatarMesh';

type Joints = {
    hips: THREE.Group;
    spine: THREE.Group;
    chest: THREE.Group;
    head: THREE.Group;
    lUpLeg: THREE.Group;
    rUpLeg: THREE.Group;
    lLoLeg: THREE.Group;
    rLoLeg: THREE.Group;
    lUpArm: THREE.Group;
    rUpArm: THREE.Group;
    lLoArm: THREE.Group;
    rLoArm: THREE.Group;
};

function Mat({ color, roughness = 0.82 }: { color: string; roughness?: number }) {
    return <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />;
}

/** Capsule limb: pivot at top of joint, extends down local −Y */
function Limb({
    radius,
    length,
    color,
}: {
    radius: number;
    length: number;
    color: string;
}) {
    // capsuleGeometry is Y-aligned, centered; shift so top sits at origin
    return (
        <mesh position={[0, -length * 0.5, 0]} castShadow>
            <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 4, 8]} />
            <Mat color={color} />
        </mesh>
    );
}

/**
 * ~7.5-head adult, feet on y=0, face +Z.
 * Legs ~50% · short torso · arms hang from shoulders.
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
    const joints = useRef<Partial<Joints>>({});
    const gait = useRef(0);
    const jump = useRef(0);
    const phase = useRef(0);

    useImperativeHandle(ref, () => ({
        setGait: (s) => { gait.current = THREE.MathUtils.clamp(s, 0, 1); },
        setJump: (a) => { jump.current = THREE.MathUtils.clamp(a, 0, 1); },
    }), []);

    const c = useMemo(() => ({
        skin: SKIN_TONES[avatar.skin] ?? SKIN_TONES[6],
        hair: HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0],
        top: CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5],
        bottom: CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12],
        boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
        eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
    }), [avatar]);

    const fem = avatar.build === 'fem';
    // widths
    const shoulder = fem ? 0.34 : 0.40;
    const hipW = fem ? 0.36 : 0.34;
    const chestR = fem ? 0.15 : 0.17;
    const headR = fem ? 0.105 : 0.11;
    const thighR = fem ? 0.07 : 0.078;
    const shinR = fem ? 0.055 : 0.06;
    const armR = fem ? 0.042 : 0.048;
    const legX = fem ? 0.10 : 0.12;

    // heights (meters-ish)
    const HIP = 0.92;          // hip joint y
    const THIGH = 0.42;        // upper leg length
    const SHIN = 0.40;         // lower leg length
    const SPINE = 0.14;        // hip → spine
    const CHEST_H = 0.28;      // short torso
    const NECK = 0.08;
    const ARM = 0.30;          // upper arm
    const FORE = 0.28;         // forearm

    useFrame((_, dt) => {
        const j = joints.current;
        const g = gait.current;
        const jp = jump.current;
        const ground = g * (1 - jp * 0.9);

        phase.current += dt * (ground > 0.04 ? 8.5 * (0.55 + ground * 0.45) : 0.35);

        // Positive swing = thigh rotates forward (+Z direction of travel)
        // Invert was "reverse walk" — use standard: left +sin with velocity +Z face
        const s = Math.sin(phase.current) * ground;
        const o = -s;

        // Jump: pull knees up (negative X tucks thigh forward/up in our layout)
        // With limbs along −Y, rotation.x > 0 swings foot toward +Z (forward)
        const jThigh = 0.85 * jp;      // tuck forward/up
        const jKnee = 1.1 * jp;        // bend knee
        const jArm = -0.9 * jp;        // arms forward/up (negative if arm hangs −Y… see below)
        const jArmZ = 0.35 * jp;

        // Legs: rotation.x positive → foot moves toward +Z (forward)
        if (j.lUpLeg) j.lUpLeg.rotation.x = THREE.MathUtils.damp(j.lUpLeg.rotation.x, s * 0.7 + jThigh * 0.5, 14, dt);
        if (j.rUpLeg) j.rUpLeg.rotation.x = THREE.MathUtils.damp(j.rUpLeg.rotation.x, o * 0.7 + jThigh * 0.5, 14, dt);
        // Knee: only bend (positive local x on lower leg folds shin back)
        if (j.lLoLeg) j.lLoLeg.rotation.x = THREE.MathUtils.damp(j.lLoLeg.rotation.x, Math.max(0, -s) * 0.85 + jKnee, 14, dt);
        if (j.rLoLeg) j.rLoLeg.rotation.x = THREE.MathUtils.damp(j.rLoLeg.rotation.x, Math.max(0, -o) * 0.85 + jKnee, 14, dt);

        // Arms opposite legs; hang down −Y, rotation.x positive swings hand toward +Z
        if (j.lUpArm) {
            j.lUpArm.rotation.x = THREE.MathUtils.damp(j.lUpArm.rotation.x, o * 0.55 + jArm * 0.35, 14, dt);
            j.lUpArm.rotation.z = THREE.MathUtils.damp(j.lUpArm.rotation.z, 0.12 + jArmZ, 12, dt);
        }
        if (j.rUpArm) {
            j.rUpArm.rotation.x = THREE.MathUtils.damp(j.rUpArm.rotation.x, s * 0.55 + jArm * 0.35, 14, dt);
            j.rUpArm.rotation.z = THREE.MathUtils.damp(j.rUpArm.rotation.z, -0.12 - jArmZ, 12, dt);
        }
        if (j.lLoArm) j.lLoArm.rotation.x = THREE.MathUtils.damp(j.lLoArm.rotation.x, Math.max(0, o) * 0.35, 12, dt);
        if (j.rLoArm) j.rLoArm.rotation.x = THREE.MathUtils.damp(j.rLoArm.rotation.x, Math.max(0, s) * 0.35, 12, dt);

        // Hips / spine
        if (j.hips) {
            j.hips.rotation.y = THREE.MathUtils.damp(j.hips.rotation.y, -s * 0.07, 10, dt);
            j.hips.position.y = THREE.MathUtils.damp(
                j.hips.position.y,
                HIP + Math.abs(Math.sin(phase.current * 2)) * 0.015 * ground - jp * 0.02,
                12,
                dt,
            );
        }
        if (j.spine) j.spine.rotation.y = THREE.MathUtils.damp(j.spine.rotation.y, s * 0.05, 10, dt);
        if (j.chest) {
            j.chest.rotation.y = THREE.MathUtils.damp(j.chest.rotation.y, s * 0.04, 10, dt);
            j.chest.rotation.x = THREE.MathUtils.damp(j.chest.rotation.x, -0.08 * jp, 10, dt);
        }
        if (j.head) j.head.rotation.y = THREE.MathUtils.damp(j.head.rotation.y, -s * 0.06, 8, dt);

        // Idle breath
        if (ground < 0.05 && jp < 0.05 && j.chest) {
            const breath = Math.sin(performance.now() * 0.0016) * 0.008;
            j.chest.position.y = THREE.MathUtils.damp(j.chest.position.y, SPINE + breath, 6, dt);
            if (j.lUpLeg) j.lUpLeg.rotation.x = THREE.MathUtils.damp(j.lUpLeg.rotation.x, 0, 8, dt);
            if (j.rUpLeg) j.rUpLeg.rotation.x = THREE.MathUtils.damp(j.rUpLeg.rotation.x, 0, 8, dt);
            if (j.lLoLeg) j.lLoLeg.rotation.x = THREE.MathUtils.damp(j.lLoLeg.rotation.x, 0, 8, dt);
            if (j.rLoLeg) j.rLoLeg.rotation.x = THREE.MathUtils.damp(j.rLoLeg.rotation.x, 0, 8, dt);
            if (j.lUpArm) {
                j.lUpArm.rotation.x = THREE.MathUtils.damp(j.lUpArm.rotation.x, 0, 8, dt);
                j.lUpArm.rotation.z = THREE.MathUtils.damp(j.lUpArm.rotation.z, 0.1, 8, dt);
            }
            if (j.rUpArm) {
                j.rUpArm.rotation.x = THREE.MathUtils.damp(j.rUpArm.rotation.x, 0, 8, dt);
                j.rUpArm.rotation.z = THREE.MathUtils.damp(j.rUpArm.rotation.z, -0.1, 8, dt);
            }
        } else if (j.chest) {
            j.chest.position.y = THREE.MathUtils.damp(j.chest.position.y, SPINE, 10, dt);
        }
    });

    const shoulderY = SPINE + CHEST_H * 0.55;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* —— HIPS (root of body) —— */}
            <group
                ref={(n) => { if (n) joints.current.hips = n; }}
                position={[0, HIP, 0]}
            >
                <mesh castShadow>
                    <capsuleGeometry args={[hipW * 0.42, 0.1, 4, 8]} />
                    <Mat color={c.bottom} />
                </mesh>

                {/* LEFT LEG */}
                <group
                    ref={(n) => { if (n) joints.current.lUpLeg = n; }}
                    position={[-legX, 0, 0]}
                >
                    <Limb radius={thighR} length={THIGH} color={c.bottom} />
                    <group
                        ref={(n) => { if (n) joints.current.lLoLeg = n; }}
                        position={[0, -THIGH, 0]}
                    >
                        <Limb radius={shinR} length={SHIN} color={c.bottom} />
                        {/* foot */}
                        <mesh position={[0, -SHIN - 0.02, 0.06]} castShadow>
                            <boxGeometry args={[0.11, 0.08, 0.22]} />
                            <Mat color={c.boots} roughness={0.9} />
                        </mesh>
                    </group>
                </group>

                {/* RIGHT LEG */}
                <group
                    ref={(n) => { if (n) joints.current.rUpLeg = n; }}
                    position={[legX, 0, 0]}
                >
                    <Limb radius={thighR} length={THIGH} color={c.bottom} />
                    <group
                        ref={(n) => { if (n) joints.current.rLoLeg = n; }}
                        position={[0, -THIGH, 0]}
                    >
                        <Limb radius={shinR} length={SHIN} color={c.bottom} />
                        <mesh position={[0, -SHIN - 0.02, 0.06]} castShadow>
                            <boxGeometry args={[0.11, 0.08, 0.22]} />
                            <Mat color={c.boots} roughness={0.9} />
                        </mesh>
                    </group>
                </group>

                {/* SPINE */}
                <group
                    ref={(n) => { if (n) joints.current.spine = n; }}
                    position={[0, 0.06, 0]}
                >
                    {/* CHEST / short torso */}
                    <group
                        ref={(n) => { if (n) joints.current.chest = n; }}
                        position={[0, SPINE, 0]}
                    >
                        <mesh position={[0, CHEST_H * 0.35, 0]} castShadow>
                            <capsuleGeometry args={[chestR, CHEST_H * 0.55, 4, 10]} />
                            <Mat color={c.top} roughness={0.75} />
                        </mesh>

                        {/* LEFT ARM — hangs from shoulder */}
                        <group
                            ref={(n) => { if (n) joints.current.lUpArm = n; }}
                            position={[-shoulder * 0.55, shoulderY - SPINE, 0]}
                            rotation={[0, 0, 0.12]}
                        >
                            <Limb radius={armR} length={ARM} color={c.skin} />
                            <group
                                ref={(n) => { if (n) joints.current.lLoArm = n; }}
                                position={[0, -ARM, 0]}
                            >
                                <Limb radius={armR * 0.9} length={FORE} color={c.skin} />
                                <mesh position={[0, -FORE - 0.02, 0]} castShadow>
                                    <sphereGeometry args={[0.04, 8, 8]} />
                                    <Mat color={c.skin} />
                                </mesh>
                            </group>
                        </group>

                        {/* RIGHT ARM */}
                        <group
                            ref={(n) => { if (n) joints.current.rUpArm = n; }}
                            position={[shoulder * 0.55, shoulderY - SPINE, 0]}
                            rotation={[0, 0, -0.12]}
                        >
                            <Limb radius={armR} length={ARM} color={c.skin} />
                            <group
                                ref={(n) => { if (n) joints.current.rLoArm = n; }}
                                position={[0, -ARM, 0]}
                            >
                                <Limb radius={armR * 0.9} length={FORE} color={c.skin} />
                                <mesh position={[0, -FORE - 0.02, 0]} castShadow>
                                    <sphereGeometry args={[0.04, 8, 8]} />
                                    <Mat color={c.skin} />
                                </mesh>
                            </group>
                        </group>

                        {/* HEAD */}
                        <group
                            ref={(n) => { if (n) joints.current.head = n; }}
                            position={[0, CHEST_H * 0.75 + NECK, 0]}
                        >
                            <mesh position={[0, headR + 0.02, 0]} castShadow>
                                <sphereGeometry args={[headR, 16, 16]} />
                                <Mat color={c.skin} roughness={0.65} />
                            </mesh>
                            <mesh position={[0, headR + 0.1, -0.01]} castShadow>
                                <sphereGeometry args={[headR * 1.05, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                                <Mat color={c.hair} roughness={0.9} />
                            </mesh>
                            <mesh position={[-0.04, headR + 0.04, headR * 0.85]}>
                                <sphereGeometry args={[0.02, 8, 8]} />
                                <Mat color={c.eyes} roughness={0.35} />
                            </mesh>
                            <mesh position={[0.04, headR + 0.04, headR * 0.85]}>
                                <sphereGeometry args={[0.02, 8, 8]} />
                                <Mat color={c.eyes} roughness={0.35} />
                            </mesh>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
});
