'use client';

/**
 * Hierarchical humanoid vessel — joints as groups, feet on y=0.
 * Face = local +Z (eyes). Walk uses +rotation.x so feet push "back"
 * relative to facing for a natural forward stride (moonwalk was inverted).
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

function Mat({
    color,
    roughness = 0.8,
    metalness = 0.04,
}: {
    color: string;
    roughness?: number;
    metalness?: number;
}) {
    return (
        <meshStandardMaterial
            color={color}
            roughness={roughness}
            metalness={metalness}
        />
    );
}

/** Limb along local −Y, pivot at joint (y=0). */
function Limb({
    radius,
    length,
    color,
    taper = 1,
}: {
    radius: number;
    length: number;
    color: string;
    taper?: number;
}) {
    const r2 = radius * taper;
    return (
        <group>
            <mesh position={[0, -length * 0.5, 0]} castShadow>
                <capsuleGeometry args={[radius, Math.max(0.02, length - radius * 1.6), 5, 10]} />
                <Mat color={color} />
            </mesh>
            {/* slight taper cue at end */}
            {taper < 0.99 && (
                <mesh position={[0, -length * 0.85, 0]} castShadow>
                    <sphereGeometry args={[r2, 8, 8]} />
                    <Mat color={color} />
                </mesh>
            )}
        </group>
    );
}

function shade(hex: string, mult: number) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(mult);
    return `#${c.getHexString()}`;
}

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

    const c = useMemo(() => {
        const skin = SKIN_TONES[avatar.skin] ?? SKIN_TONES[6];
        const top = CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5];
        const bottom = CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12];
        return {
            skin,
            skinDeep: shade(skin, 0.82),
            hair: HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0],
            top,
            topDeep: shade(top, 0.72),
            bottom,
            bottomDeep: shade(bottom, 0.75),
            boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
            eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
            gold: '#d4a017',
        };
    }, [avatar]);

    const fem = avatar.build === 'fem';
    const shoulder = fem ? 0.36 : 0.42;
    const hipW = fem ? 0.38 : 0.35;
    const chestR = fem ? 0.155 : 0.175;
    const waistR = fem ? 0.13 : 0.145;
    const headR = fem ? 0.108 : 0.112;
    const thighR = fem ? 0.072 : 0.08;
    const shinR = fem ? 0.056 : 0.062;
    const armR = fem ? 0.044 : 0.05;
    const legX = fem ? 0.105 : 0.125;

    // Adult ~1.72m: long legs, compact torso
    const HIP = 0.93;
    const THIGH = 0.44;
    const SHIN = 0.41;
    const SPINE = 0.12;
    const CHEST_H = 0.30;
    const ARM = 0.32;
    const FORE = 0.29;

    useFrame((_, dt) => {
        const j = joints.current;
        const g = gait.current;
        const jp = jump.current;
        const ground = g * (1 - jp * 0.9);

        phase.current += dt * (ground > 0.04 ? 8.2 * (0.55 + ground * 0.45) : 0.35);

        /**
         * Limb hangs −Y. Right-hand rule: +rotation.x moves the foot toward −Z.
         * Character face = +Z. Natural forward walk swings the free leg toward +Z
         * (negative X) on the PASSING side… but the STANCE foot pushes back (−Z),
         * which is +rotation.x. Prior “always −s” looked like reverse skating.
         *
         * Use +s on upper legs so the driving foot swings back (−Z) and the
         * body reads as moving forward (+Z). Arms opposite.
         */
        const s = Math.sin(phase.current) * ground;
        const o = -s;

        const jThigh = 0.55 * jp; // knees lift (foot back/up a bit)
        const jKnee = 1.15 * jp;
        const jArm = 0.4 * jp;
        const jArmZ = 0.28 * jp;

        // Legs — +X = foot back (−Z) = push-off for forward travel
        if (j.lUpLeg) j.lUpLeg.rotation.x = THREE.MathUtils.damp(j.lUpLeg.rotation.x, s * 0.78 + jThigh * 0.35, 14, dt);
        if (j.rUpLeg) j.rUpLeg.rotation.x = THREE.MathUtils.damp(j.rUpLeg.rotation.x, o * 0.78 + jThigh * 0.35, 14, dt);
        // Knee bends when thigh is back (s > 0 for left)
        if (j.lLoLeg) j.lLoLeg.rotation.x = THREE.MathUtils.damp(j.lLoLeg.rotation.x, Math.max(0, s) * 0.95 + jKnee, 14, dt);
        if (j.rLoLeg) j.rLoLeg.rotation.x = THREE.MathUtils.damp(j.rLoLeg.rotation.x, Math.max(0, o) * 0.95 + jKnee, 14, dt);

        // Arms opposite
        if (j.lUpArm) {
            j.lUpArm.rotation.x = THREE.MathUtils.damp(j.lUpArm.rotation.x, o * 0.58 + jArm * 0.4, 14, dt);
            j.lUpArm.rotation.z = THREE.MathUtils.damp(j.lUpArm.rotation.z, 0.14 + jArmZ, 12, dt);
        }
        if (j.rUpArm) {
            j.rUpArm.rotation.x = THREE.MathUtils.damp(j.rUpArm.rotation.x, s * 0.58 + jArm * 0.4, 14, dt);
            j.rUpArm.rotation.z = THREE.MathUtils.damp(j.rUpArm.rotation.z, -0.14 - jArmZ, 12, dt);
        }
        if (j.lLoArm) j.lLoArm.rotation.x = THREE.MathUtils.damp(j.lLoArm.rotation.x, Math.max(0, -o) * 0.4 + 0.08, 12, dt);
        if (j.rLoArm) j.rLoArm.rotation.x = THREE.MathUtils.damp(j.rLoArm.rotation.x, Math.max(0, -s) * 0.4 + 0.08, 12, dt);

        if (j.hips) {
            j.hips.rotation.y = THREE.MathUtils.damp(j.hips.rotation.y, s * 0.06, 10, dt);
            j.hips.position.y = THREE.MathUtils.damp(
                j.hips.position.y,
                HIP + Math.abs(Math.sin(phase.current * 2)) * 0.018 * ground - jp * 0.025,
                12,
                dt,
            );
        }
        if (j.spine) j.spine.rotation.y = THREE.MathUtils.damp(j.spine.rotation.y, -s * 0.04, 10, dt);
        if (j.chest) {
            j.chest.rotation.y = THREE.MathUtils.damp(j.chest.rotation.y, -s * 0.05, 10, dt);
            j.chest.rotation.x = THREE.MathUtils.damp(j.chest.rotation.x, 0.06 * ground - 0.1 * jp, 10, dt);
        }
        if (j.head) j.head.rotation.y = THREE.MathUtils.damp(j.head.rotation.y, s * 0.05, 8, dt);

        if (ground < 0.05 && jp < 0.05) {
            const breath = Math.sin(performance.now() * 0.0016) * 0.01;
            if (j.chest) j.chest.position.y = THREE.MathUtils.damp(j.chest.position.y, SPINE + breath, 6, dt);
            for (const k of ['lUpLeg', 'rUpLeg', 'lLoLeg', 'rLoLeg'] as const) {
                const part = j[k];
                if (part) part.rotation.x = THREE.MathUtils.damp(part.rotation.x, 0, 8, dt);
            }
            if (j.lUpArm) {
                j.lUpArm.rotation.x = THREE.MathUtils.damp(j.lUpArm.rotation.x, 0.05, 8, dt);
                j.lUpArm.rotation.z = THREE.MathUtils.damp(j.lUpArm.rotation.z, 0.12, 8, dt);
            }
            if (j.rUpArm) {
                j.rUpArm.rotation.x = THREE.MathUtils.damp(j.rUpArm.rotation.x, 0.05, 8, dt);
                j.rUpArm.rotation.z = THREE.MathUtils.damp(j.rUpArm.rotation.z, -0.12, 8, dt);
            }
        } else if (j.chest) {
            j.chest.position.y = THREE.MathUtils.damp(j.chest.position.y, SPINE, 10, dt);
        }
    });

    const shoulderLocalY = CHEST_H * 0.62;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group ref={(n) => { if (n) joints.current.hips = n; }} position={[0, HIP, 0]}>
                {/* pelvis */}
                <mesh castShadow position={[0, -0.02, 0]}>
                    <sphereGeometry args={[hipW * 0.48, 12, 10]} />
                    <Mat color={c.bottom} />
                </mesh>
                <mesh castShadow position={[0, 0.04, 0]} scale={[1, 0.55, 0.85]}>
                    <sphereGeometry args={[hipW * 0.5, 12, 10]} />
                    <Mat color={c.bottomDeep} />
                </mesh>
                {/* belt */}
                <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[hipW * 0.48, 0.018, 8, 20]} />
                    <Mat color={c.gold} roughness={0.45} metalness={0.35} />
                </mesh>

                {/* LEFT LEG */}
                <group ref={(n) => { if (n) joints.current.lUpLeg = n; }} position={[-legX, 0, 0]}>
                    <Limb radius={thighR} length={THIGH} color={c.bottom} taper={0.92} />
                    <group ref={(n) => { if (n) joints.current.lLoLeg = n; }} position={[0, -THIGH, 0]}>
                        <Limb radius={shinR} length={SHIN} color={c.bottomDeep} taper={0.88} />
                        {/* boot */}
                        <mesh position={[0, -SHIN - 0.015, 0.05]} castShadow>
                            <boxGeometry args={[0.12, 0.1, 0.24]} />
                            <Mat color={c.boots} roughness={0.92} />
                        </mesh>
                        <mesh position={[0, -SHIN + 0.06, 0.02]} castShadow>
                            <cylinderGeometry args={[0.055, 0.06, 0.12, 8]} />
                            <Mat color={c.boots} roughness={0.92} />
                        </mesh>
                    </group>
                </group>

                {/* RIGHT LEG */}
                <group ref={(n) => { if (n) joints.current.rUpLeg = n; }} position={[legX, 0, 0]}>
                    <Limb radius={thighR} length={THIGH} color={c.bottom} taper={0.92} />
                    <group ref={(n) => { if (n) joints.current.rLoLeg = n; }} position={[0, -THIGH, 0]}>
                        <Limb radius={shinR} length={SHIN} color={c.bottomDeep} taper={0.88} />
                        <mesh position={[0, -SHIN - 0.015, 0.05]} castShadow>
                            <boxGeometry args={[0.12, 0.1, 0.24]} />
                            <Mat color={c.boots} roughness={0.92} />
                        </mesh>
                        <mesh position={[0, -SHIN + 0.06, 0.02]} castShadow>
                            <cylinderGeometry args={[0.055, 0.06, 0.12, 8]} />
                            <Mat color={c.boots} roughness={0.92} />
                        </mesh>
                    </group>
                </group>

                {/* TORSO */}
                <group ref={(n) => { if (n) joints.current.spine = n; }} position={[0, 0.05, 0]}>
                    <group ref={(n) => { if (n) joints.current.chest = n; }} position={[0, SPINE, 0]}>
                        {/* waist */}
                        <mesh position={[0, 0.06, 0]} castShadow>
                            <capsuleGeometry args={[waistR, 0.08, 4, 10]} />
                            <Mat color={c.topDeep} roughness={0.78} />
                        </mesh>
                        {/* chest — short, wider shoulders */}
                        <mesh position={[0, CHEST_H * 0.38, 0]} castShadow scale={[1.05, 1, fem ? 0.92 : 1]}>
                            <capsuleGeometry args={[chestR, CHEST_H * 0.42, 5, 12]} />
                            <Mat color={c.top} roughness={0.72} />
                        </mesh>
                        {/* collar / neck base */}
                        <mesh position={[0, CHEST_H * 0.72, 0]} castShadow>
                            <cylinderGeometry args={[0.07, 0.09, 0.06, 10]} />
                            <Mat color={c.skinDeep} />
                        </mesh>
                        {/* shoulder pads */}
                        <mesh position={[-shoulder * 0.48, shoulderLocalY, 0]} castShadow>
                            <sphereGeometry args={[0.07, 10, 8]} />
                            <Mat color={c.top} />
                        </mesh>
                        <mesh position={[shoulder * 0.48, shoulderLocalY, 0]} castShadow>
                            <sphereGeometry args={[0.07, 10, 8]} />
                            <Mat color={c.top} />
                        </mesh>
                        {/* gold trim line */}
                        <mesh position={[0, CHEST_H * 0.2, chestR * 0.85]}>
                            <boxGeometry args={[chestR * 1.1, 0.02, 0.02]} />
                            <Mat color={c.gold} roughness={0.4} metalness={0.4} />
                        </mesh>

                        {/* LEFT ARM */}
                        <group
                            ref={(n) => { if (n) joints.current.lUpArm = n; }}
                            position={[-shoulder * 0.52, shoulderLocalY, 0]}
                            rotation={[0.05, 0, 0.14]}
                        >
                            <Limb radius={armR} length={ARM} color={c.skin} taper={0.9} />
                            <group ref={(n) => { if (n) joints.current.lLoArm = n; }} position={[0, -ARM, 0]}>
                                <Limb radius={armR * 0.88} length={FORE} color={c.skinDeep} taper={0.85} />
                                {/* hand */}
                                <mesh position={[0, -FORE - 0.03, 0.01]} castShadow scale={[0.9, 1.1, 0.55]}>
                                    <sphereGeometry args={[0.045, 8, 8]} />
                                    <Mat color={c.skin} />
                                </mesh>
                            </group>
                        </group>

                        {/* RIGHT ARM */}
                        <group
                            ref={(n) => { if (n) joints.current.rUpArm = n; }}
                            position={[shoulder * 0.52, shoulderLocalY, 0]}
                            rotation={[0.05, 0, -0.14]}
                        >
                            <Limb radius={armR} length={ARM} color={c.skin} taper={0.9} />
                            <group ref={(n) => { if (n) joints.current.rLoArm = n; }} position={[0, -ARM, 0]}>
                                <Limb radius={armR * 0.88} length={FORE} color={c.skinDeep} taper={0.85} />
                                <mesh position={[0, -FORE - 0.03, 0.01]} castShadow scale={[0.9, 1.1, 0.55]}>
                                    <sphereGeometry args={[0.045, 8, 8]} />
                                    <Mat color={c.skin} />
                                </mesh>
                            </group>
                        </group>

                        {/* HEAD */}
                        <group
                            ref={(n) => { if (n) joints.current.head = n; }}
                            position={[0, CHEST_H * 0.78 + 0.06, 0]}
                        >
                            {/* neck */}
                            <mesh position={[0, 0.02, 0]} castShadow>
                                <cylinderGeometry args={[0.045, 0.055, 0.08, 10]} />
                                <Mat color={c.skinDeep} />
                            </mesh>
                            {/* skull */}
                            <mesh position={[0, headR + 0.06, 0]} castShadow>
                                <sphereGeometry args={[headR, 18, 16]} />
                                <Mat color={c.skin} roughness={0.62} />
                            </mesh>
                            {/* jaw soft */}
                            <mesh position={[0, headR * 0.55, 0.02]} castShadow scale={[0.75, 0.55, 0.7]}>
                                <sphereGeometry args={[headR * 0.85, 12, 10]} />
                                <Mat color={c.skin} roughness={0.65} />
                            </mesh>
                            {/* hair */}
                            <mesh position={[0, headR + 0.14, -0.015]} castShadow scale={[1.08, fem ? 1.15 : 0.75, 1.05]}>
                                <sphereGeometry args={[headR * 1.05, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                                <Mat color={c.hair} roughness={0.92} />
                            </mesh>
                            {fem && (
                                <mesh position={[0, headR * 0.3, -0.06]} castShadow scale={[0.7, 1.2, 0.5]}>
                                    <sphereGeometry args={[headR * 0.7, 10, 8]} />
                                    <Mat color={c.hair} roughness={0.92} />
                                </mesh>
                            )}
                            {/* eyes on +Z face */}
                            <mesh position={[-0.038, headR + 0.07, headR * 0.78]}>
                                <sphereGeometry args={[0.018, 8, 8]} />
                                <Mat color="#f5f5f5" roughness={0.4} />
                            </mesh>
                            <mesh position={[0.038, headR + 0.07, headR * 0.78]}>
                                <sphereGeometry args={[0.018, 8, 8]} />
                                <Mat color="#f5f5f5" roughness={0.4} />
                            </mesh>
                            <mesh position={[-0.038, headR + 0.07, headR * 0.9]}>
                                <sphereGeometry args={[0.011, 8, 8]} />
                                <Mat color={c.eyes} roughness={0.25} metalness={0.15} />
                            </mesh>
                            <mesh position={[0.038, headR + 0.07, headR * 0.9]}>
                                <sphereGeometry args={[0.011, 8, 8]} />
                                <Mat color={c.eyes} roughness={0.25} metalness={0.15} />
                            </mesh>
                            {/* nose */}
                            <mesh position={[0, headR + 0.02, headR * 0.92]} castShadow scale={[0.35, 0.45, 0.5]}>
                                <sphereGeometry args={[0.03, 8, 6]} />
                                <Mat color={c.skinDeep} />
                            </mesh>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
});
