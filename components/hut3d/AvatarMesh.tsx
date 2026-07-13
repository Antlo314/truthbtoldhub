'use client';

import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS, EYE_COLORS,
    type AvatarConfig,
} from '@/lib/game/avatar';

export type AvatarHandle = {
    /** 0 = idle, higher = faster gait */
    setGait: (speed: number) => void;
};

type LimbRefs = {
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    torso: THREE.Group;
    hips: THREE.Group;
};

/** Stylized low-poly vessel with procedural walk cycle. */
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
    const phase = useRef(0);
    const limbs = useRef<Partial<LimbRefs>>({});

    useImperativeHandle(ref, () => ({
        setGait: (speed: number) => {
            gait.current = THREE.MathUtils.clamp(speed, 0, 1);
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
    const bodyW = isFem ? 0.38 : 0.44;
    const hipW = isFem ? 0.4 : 0.42;

    useFrame((_, dt) => {
        const g = gait.current;
        // Cadence scales with speed; settle to idle
        const targetRate = THREE.MathUtils.lerp(0, 9.5, g);
        phase.current += dt * targetRate;

        const swing = Math.sin(phase.current) * g;
        const swingOpp = -swing;
        // Knee-ish secondary (half period offset feel via cos)
        const lift = Math.max(0, Math.sin(phase.current)) * g;
        const liftOpp = Math.max(0, Math.sin(phase.current + Math.PI)) * g;

        const { leftLeg, rightLeg, leftArm, rightArm, torso, hips } = limbs.current;
        if (leftLeg) {
            leftLeg.rotation.x = swing * 0.72;
            leftLeg.position.y = 0.58 - lift * 0.04;
        }
        if (rightLeg) {
            rightLeg.rotation.x = swingOpp * 0.72;
            rightLeg.position.y = 0.58 - liftOpp * 0.04;
        }
        // Opposite arm swing
        if (leftArm) leftArm.rotation.x = swingOpp * 0.55;
        if (rightArm) rightArm.rotation.x = swing * 0.55;
        // Soft torso counter-rotate + bob
        if (torso) {
            torso.rotation.y = swing * 0.06;
            torso.rotation.z = swing * 0.04;
            torso.position.y = 0.78 + Math.abs(swing) * 0.02;
        }
        if (hips) {
            hips.rotation.y = -swing * 0.05;
            hips.position.y = 0.55 + Math.abs(Math.sin(phase.current * 2)) * 0.012 * g;
        }

        // Idle breath when standing
        if (g < 0.08 && torso) {
            const breath = Math.sin(phase.current * 0.35 + performance.now() * 0.0015) * 0.012;
            torso.position.y = 0.78 + breath;
            torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, 0, 6, dt);
            torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, 0, 6, dt);
        }
        if (g < 0.08) {
            if (leftLeg) {
                leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, dt);
                leftLeg.position.y = THREE.MathUtils.damp(leftLeg.position.y, 0.58, 8, dt);
            }
            if (rightLeg) {
                rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, dt);
                rightLeg.position.y = THREE.MathUtils.damp(rightLeg.position.y, 0.58, 8, dt);
            }
            if (leftArm) leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0, 8, dt);
            if (rightArm) rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0, 8, dt);
        }
    });

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* —— legs (pivot near hip) —— */}
            <group
                ref={(n) => { if (n) limbs.current.leftLeg = n; }}
                position={[-0.12, 0.58, 0]}
            >
                <mesh position={[0, -0.28, 0]} castShadow>
                    <capsuleGeometry args={[0.085, 0.26, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
                <mesh position={[0, -0.52, 0.03]} castShadow>
                    <boxGeometry args={[0.13, 0.09, 0.2]} />
                    <meshStandardMaterial color={colors.boots} roughness={0.9} />
                </mesh>
            </group>
            <group
                ref={(n) => { if (n) limbs.current.rightLeg = n; }}
                position={[0.12, 0.58, 0]}
            >
                <mesh position={[0, -0.28, 0]} castShadow>
                    <capsuleGeometry args={[0.085, 0.26, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
                <mesh position={[0, -0.52, 0.03]} castShadow>
                    <boxGeometry args={[0.13, 0.09, 0.2]} />
                    <meshStandardMaterial color={colors.boots} roughness={0.9} />
                </mesh>
            </group>

            {/* —— hips —— */}
            <group ref={(n) => { if (n) limbs.current.hips = n; }} position={[0, 0.55, 0]}>
                <mesh castShadow>
                    <capsuleGeometry args={[hipW * 0.45, 0.14, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} roughness={0.85} />
                </mesh>
            </group>

            {/* —— torso + head + arms —— */}
            <group ref={(n) => { if (n) limbs.current.torso = n; }} position={[0, 0.78, 0]}>
                <mesh position={[0, 0.22, 0]} castShadow>
                    <capsuleGeometry args={[bodyW * 0.5, 0.38, 4, 10]} />
                    <meshStandardMaterial color={colors.top} roughness={0.75} />
                </mesh>

                {/* arms — shoulder pivots */}
                <group
                    ref={(n) => { if (n) limbs.current.leftArm = n; }}
                    position={[-bodyW * 0.62, 0.38, 0]}
                    rotation={[0, 0, 0.12]}
                >
                    <mesh position={[0, -0.22, 0]} castShadow>
                        <capsuleGeometry args={[0.065, 0.28, 4, 8]} />
                        <meshStandardMaterial color={colors.skin} roughness={0.7} />
                    </mesh>
                </group>
                <group
                    ref={(n) => { if (n) limbs.current.rightArm = n; }}
                    position={[bodyW * 0.62, 0.38, 0]}
                    rotation={[0, 0, -0.12]}
                >
                    <mesh position={[0, -0.22, 0]} castShadow>
                        <capsuleGeometry args={[0.065, 0.28, 4, 8]} />
                        <meshStandardMaterial color={colors.skin} roughness={0.7} />
                    </mesh>
                </group>

                {/* head */}
                <mesh position={[0, 0.62, 0]} castShadow>
                    <sphereGeometry args={[0.195, 16, 16]} />
                    <meshStandardMaterial color={colors.skin} roughness={0.65} />
                </mesh>
                <mesh position={[0, 0.72, -0.02]} castShadow>
                    <sphereGeometry args={[0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                    <meshStandardMaterial color={colors.hair} roughness={0.9} />
                </mesh>
                <mesh position={[-0.065, 0.64, 0.155]}>
                    <sphereGeometry args={[0.028, 8, 8]} />
                    <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
                </mesh>
                <mesh position={[0.065, 0.64, 0.155]}>
                    <sphereGeometry args={[0.028, 8, 8]} />
                    <meshStandardMaterial color={colors.eyes} roughness={0.3} metalness={0.2} />
                </mesh>
            </group>
        </group>
    );
});

/** Hooded Truth — distinct silhouette, warm gold trim */
export function TruthMesh({ position = [0, 0, 0] as [number, number, number] }) {
    const robe = '#1e2a4a';
    const hood = '#151c30';
    const gold = '#fbbf24';
    const skin = '#c68642';

    return (
        <group position={position}>
            <mesh position={[0, 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.32, 0.7, 10]} />
                <meshStandardMaterial color={robe} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.95, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.26, 0.7, 10]} />
                <meshStandardMaterial color={robe} roughness={0.88} />
            </mesh>
            <mesh position={[0, 1.45, -0.02]} castShadow>
                <sphereGeometry args={[0.28, 14, 14]} />
                <meshStandardMaterial color={hood} roughness={0.95} />
            </mesh>
            <mesh position={[0, 1.38, 0.12]}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.3, 0.025, 8, 20]} />
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
