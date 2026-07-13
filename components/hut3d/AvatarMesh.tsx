'use client';

import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';

export type AvatarHandle = {
    setGait: (speed: number) => void;
    setJump: (amount: number) => void;
};

type LimbRefs = {
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    torso: THREE.Group;
    hips: THREE.Group;
};

/**
 * ~7.5-head adult proportions (see public/references/characters/NOTES.md)
 * Total height ≈ 1.72
 * Legs ≈ 50% · compact torso · normal head
 *
 * y layout (soles at 0):
 *   foot sole 0 → hip ~0.90 → shoulder ~1.38 → crown ~1.72
 */
const TOTAL_H = 1.72;
const HIP_Y = 0.90;          // crotch / hip joint
const LEG_LEN = 0.52;        // hip pivot down to mid-boot
const BOOT_DROP = 0.78;      // hip pivot to sole-ish boot center
const TORSO_BASE = 0.98;     // bottom of torso group (above hips)
const TORSO_CAPSULE_H = 0.28; // short torso volume (was too tall)
const TORSO_CAPSULE_Y = 0.18;
const SHOULDER_Y = 0.36;     // relative to torso group
const HEAD_Y = 0.58;         // relative to torso group
const HEAD_R = 0.15;

/** Stylized vessel — long legs, short torso, full adult height. */
export const AvatarMesh = forwardRef<AvatarHandle, {
    avatar: AvatarConfig;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}>(function AvatarMesh(
    { avatar, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 },
    ref,
) {
    const gait = useRef(0);
    const jump = useRef(0);
    const phase = useRef(0);
    const limbs = useRef<Partial<LimbRefs>>({});

    useImperativeHandle(ref, () => ({
        setGait: (speed: number) => {
            gait.current = THREE.MathUtils.clamp(speed, 0, 1);
        },
        setJump: (amount: number) => {
            jump.current = THREE.MathUtils.clamp(amount, 0, 1);
        },
    }), []);

    const colors = useMemo(() => ({
        skin: SKIN_TONES[avatar.skin] ?? SKIN_TONES[6],
        hair: HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0],
        top: CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5],
        bottom: CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12],
        boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
        eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
    }), [avatar]);

    const isFem = avatar.build === 'fem';
    const bodyW = isFem ? 0.34 : 0.40;
    const hipW = isFem ? 0.38 : 0.40;
    const legSpread = isFem ? 0.10 : 0.12;

    useFrame((_, dt) => {
        const g = gait.current;
        const j = jump.current;
        const groundGait = g * (1 - j);

        const targetRate = THREE.MathUtils.lerp(0, 9.2, groundGait);
        phase.current += dt * (targetRate || (j > 0.1 ? 2 : 0.35));

        const swing = Math.sin(phase.current) * groundGait;
        const swingOpp = -swing;
        const lift = Math.max(0, Math.sin(phase.current)) * groundGait;
        const liftOpp = Math.max(0, Math.sin(phase.current + Math.PI)) * groundGait;

        const { leftLeg, rightLeg, leftArm, rightArm, torso, hips } = limbs.current;

        const jumpLeg = -0.55 * j;
        const jumpLegSpread = 0.12 * j;
        const jumpArm = -0.85 * j;
        const jumpArmOut = 0.32 * j;
        const jumpTorsoX = -0.1 * j;

        if (leftLeg) {
            leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, swing * 0.7 + jumpLeg, 14, dt);
            leftLeg.rotation.z = THREE.MathUtils.damp(leftLeg.rotation.z, -jumpLegSpread, 12, dt);
            leftLeg.position.y = THREE.MathUtils.damp(leftLeg.position.y, HIP_Y - lift * 0.03 + j * 0.03, 14, dt);
        }
        if (rightLeg) {
            rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, swingOpp * 0.7 + jumpLeg * 0.92, 14, dt);
            rightLeg.rotation.z = THREE.MathUtils.damp(rightLeg.rotation.z, jumpLegSpread, 12, dt);
            rightLeg.position.y = THREE.MathUtils.damp(rightLeg.position.y, HIP_Y - liftOpp * 0.03 + j * 0.03, 14, dt);
        }
        if (leftArm) {
            leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, swingOpp * 0.5 + jumpArm, 14, dt);
            leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, 0.1 + jumpArmOut, 12, dt);
        }
        if (rightArm) {
            rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, swing * 0.5 + jumpArm * 0.95, 14, dt);
            rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.1 - jumpArmOut, 12, dt);
        }
        if (torso) {
            const breath = (groundGait < 0.08 && j < 0.05)
                ? Math.sin(performance.now() * 0.0018) * 0.008
                : 0;
            torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, swing * 0.05, 10, dt);
            torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, swing * 0.035, 10, dt);
            torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, jumpTorsoX, 12, dt);
            torso.position.y = THREE.MathUtils.damp(
                torso.position.y,
                TORSO_BASE + Math.abs(swing) * 0.012 + breath + j * 0.025,
                12,
                dt,
            );
        }
        if (hips) {
            hips.rotation.y = THREE.MathUtils.damp(hips.rotation.y, -swing * 0.04, 10, dt);
            hips.position.y = THREE.MathUtils.damp(
                hips.position.y,
                HIP_Y - 0.02 + Math.abs(Math.sin(phase.current * 2)) * 0.008 * groundGait,
                12,
                dt,
            );
        }
    });

    // silence unused total height constant for tree-shaking clarity
    void TOTAL_H;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* —— long legs (≈ half height) —— */}
            <group
                ref={(n) => { if (n) limbs.current.leftLeg = n; }}
                position={[-legSpread, HIP_Y, 0]}
            >
                <mesh position={[0, -LEG_LEN * 0.55, 0]} castShadow>
                    <capsuleGeometry args={[0.075, LEG_LEN * 0.55, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
                <mesh position={[0, -BOOT_DROP + 0.06, 0.04]} castShadow>
                    <boxGeometry args={[0.12, 0.09, 0.2]} />
                    <meshStandardMaterial color={colors.boots} roughness={0.9} />
                </mesh>
            </group>
            <group
                ref={(n) => { if (n) limbs.current.rightLeg = n; }}
                position={[legSpread, HIP_Y, 0]}
            >
                <mesh position={[0, -LEG_LEN * 0.55, 0]} castShadow>
                    <capsuleGeometry args={[0.075, LEG_LEN * 0.55, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
                <mesh position={[0, -BOOT_DROP + 0.06, 0.04]} castShadow>
                    <boxGeometry args={[0.12, 0.09, 0.2]} />
                    <meshStandardMaterial color={colors.boots} roughness={0.9} />
                </mesh>
            </group>

            {/* hips */}
            <group ref={(n) => { if (n) limbs.current.hips = n; }} position={[0, HIP_Y - 0.02, 0]}>
                <mesh castShadow>
                    <capsuleGeometry args={[hipW * 0.42, 0.1, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
            </group>

            {/* short torso + arms + head */}
            <group ref={(n) => { if (n) limbs.current.torso = n; }} position={[0, TORSO_BASE, 0]}>
                <mesh position={[0, TORSO_CAPSULE_Y, 0]} castShadow>
                    <capsuleGeometry args={[bodyW * 0.48, TORSO_CAPSULE_H, 4, 10]} />
                    <meshStandardMaterial color={colors.top} roughness={0.75} />
                </mesh>

                <group
                    ref={(n) => { if (n) limbs.current.leftArm = n; }}
                    position={[-bodyW * 0.58, SHOULDER_Y, 0]}
                    rotation={[0, 0, 0.1]}
                >
                    <mesh position={[0, -0.2, 0]} castShadow>
                        <capsuleGeometry args={[0.055, 0.26, 4, 8]} />
                        <meshStandardMaterial color={colors.skin} roughness={0.7} />
                    </mesh>
                </group>
                <group
                    ref={(n) => { if (n) limbs.current.rightArm = n; }}
                    position={[bodyW * 0.58, SHOULDER_Y, 0]}
                    rotation={[0, 0, -0.1]}
                >
                    <mesh position={[0, -0.2, 0]} castShadow>
                        <capsuleGeometry args={[0.055, 0.26, 4, 8]} />
                        <meshStandardMaterial color={colors.skin} roughness={0.7} />
                    </mesh>
                </group>

                <mesh position={[0, HEAD_Y, 0]} castShadow>
                    <sphereGeometry args={[HEAD_R, 16, 16]} />
                    <meshStandardMaterial color={colors.skin} roughness={0.65} />
                </mesh>
                <mesh position={[0, HEAD_Y + 0.07, -0.012]} castShadow>
                    <sphereGeometry args={[HEAD_R + 0.01, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                    <meshStandardMaterial color={colors.hair} roughness={0.9} />
                </mesh>
                <mesh position={[-0.05, HEAD_Y + 0.01, HEAD_R * 0.88]}>
                    <sphereGeometry args={[0.022, 8, 8]} />
                    <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
                </mesh>
                <mesh position={[0.05, HEAD_Y + 0.01, HEAD_R * 0.88]}>
                    <sphereGeometry args={[0.022, 8, 8]} />
                    <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
                </mesh>
            </group>
        </group>
    );
});

/** Hooded Truth — adult proportions, slightly taller presence */
export function TruthMesh({ position = [0, 0, 0] as [number, number, number] }) {
    const robe = '#1e2a4a';
    const hood = '#151c30';
    const gold = '#fbbf24';
    const skin = '#c68642';

    return (
        <group position={position}>
            {/* long robe lower */}
            <mesh position={[0, 0.45, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.32, 0.9, 10]} />
                <meshStandardMaterial color={robe} roughness={0.9} />
            </mesh>
            {/* short upper body */}
            <mesh position={[0, 1.05, 0]} castShadow>
                <cylinderGeometry args={[0.26, 0.24, 0.45, 10]} />
                <meshStandardMaterial color={robe} roughness={0.88} />
            </mesh>
            <mesh position={[0, 1.42, -0.02]} castShadow>
                <sphereGeometry args={[0.24, 14, 14]} />
                <meshStandardMaterial color={hood} roughness={0.95} />
            </mesh>
            <mesh position={[0, 1.36, 0.1]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.28, 0.022, 8, 20]} />
                <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.72, 32]} />
                <meshStandardMaterial
                    color={gold}
                    emissive={gold}
                    emissiveIntensity={0.45}
                    transparent
                    opacity={0.85}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}
