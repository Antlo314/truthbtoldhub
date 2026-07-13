'use client';

/**
 * Customizable hierarchical vessel.
 * Hair / outfit / face / extras map 1:1 to AvatarConfig (same as 2D creator).
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarConfig } from '@/lib/game/avatar';
import type { AvatarHandle } from './AvatarMesh';
import { Limb, Mat, useVesselColors } from './vessel/materials';
import { HairParts } from './vessel/HairParts';
import { TorsoOutfit, LowerOutfit, isSkirtOutfit } from './vessel/OutfitParts';
import { FaceParts } from './vessel/FaceParts';
import { ExtraParts } from './vessel/ExtraParts';

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

    const c = useVesselColors(avatar);
    const fem = avatar.build === 'fem';
    const outfit = avatar.outfit ?? (fem ? 'dress' : 'tunic');
    const hairStyle = avatar.hairStyle ?? 'short';
    const face = avatar.face ?? 'calm';
    const extra = avatar.extra ?? 'none';
    const skirt = isSkirtOutfit(outfit, fem);

    const shoulder = fem ? 0.36 : 0.42;
    const hipW = fem ? 0.38 : 0.35;
    const chestR = fem ? 0.155 : 0.175;
    const waistR = fem ? 0.13 : 0.145;
    const headR = fem ? 0.108 : 0.112;
    const thighR = fem ? 0.072 : 0.08;
    const shinR = fem ? 0.056 : 0.062;
    const armR = fem ? 0.044 : 0.05;
    const legX = fem ? 0.105 : 0.125;

    const HIP = 0.93;
    const THIGH = 0.44;
    const SHIN = 0.41;
    const SPINE = 0.12;
    const CHEST_H = 0.30;
    const ARM = 0.32;
    const FORE = 0.29;
    const shoulderLocalY = CHEST_H * 0.55;

    useFrame((_, dt) => {
        const j = joints.current;
        const g = gait.current;
        const jp = jump.current;
        const ground = g * (1 - jp * 0.9);

        phase.current += dt * (ground > 0.04 ? 8.2 * (0.55 + ground * 0.45) : 0.35);

        // +rotation.x = foot toward −Z (push-off for forward +Z travel)
        const s = Math.sin(phase.current) * ground;
        const o = -s;
        const jThigh = 0.55 * jp;
        const jKnee = 1.15 * jp;
        const jArm = 0.4 * jp;
        const jArmZ = 0.28 * jp;

        if (j.lUpLeg) j.lUpLeg.rotation.x = THREE.MathUtils.damp(j.lUpLeg.rotation.x, s * 0.78 + jThigh * 0.35, 14, dt);
        if (j.rUpLeg) j.rUpLeg.rotation.x = THREE.MathUtils.damp(j.rUpLeg.rotation.x, o * 0.78 + jThigh * 0.35, 14, dt);
        if (j.lLoLeg) j.lLoLeg.rotation.x = THREE.MathUtils.damp(j.lLoLeg.rotation.x, Math.max(0, s) * 0.95 + jKnee, 14, dt);
        if (j.rLoLeg) j.rLoLeg.rotation.x = THREE.MathUtils.damp(j.rLoLeg.rotation.x, Math.max(0, o) * 0.95 + jKnee, 14, dt);

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

    // Leg visibility: under skirts, shorten visible pant legs
    const legColor = skirt ? c.skin : c.bottom;
    const legColorDeep = skirt ? c.skinDeep : c.bottomDeep;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group ref={(n) => { if (n) joints.current.hips = n; }} position={[0, HIP, 0]}>
                <LowerOutfit outfit={outfit} c={c} hipW={hipW} fem={fem} />

                {/* Legs */}
                <group ref={(n) => { if (n) joints.current.lUpLeg = n; }} position={[-legX, 0, 0]}>
                    <Limb radius={thighR} length={THIGH} color={legColor} taper={0.92} />
                    <group ref={(n) => { if (n) joints.current.lLoLeg = n; }} position={[0, -THIGH, 0]}>
                        <Limb radius={shinR} length={SHIN} color={legColorDeep} taper={0.88} />
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
                <group ref={(n) => { if (n) joints.current.rUpLeg = n; }} position={[legX, 0, 0]}>
                    <Limb radius={thighR} length={THIGH} color={legColor} taper={0.92} />
                    <group ref={(n) => { if (n) joints.current.rLoLeg = n; }} position={[0, -THIGH, 0]}>
                        <Limb radius={shinR} length={SHIN} color={legColorDeep} taper={0.88} />
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

                {/* Torso + head + arms */}
                <group ref={(n) => { if (n) joints.current.spine = n; }} position={[0, 0.05, 0]}>
                    <group ref={(n) => { if (n) joints.current.chest = n; }} position={[0, SPINE, 0]}>
                        <TorsoOutfit
                            outfit={outfit}
                            c={c}
                            chestR={chestR}
                            waistR={waistR}
                            chestH={CHEST_H}
                            fem={fem}
                        />

                        {/* Arms */}
                        <group
                            ref={(n) => { if (n) joints.current.lUpArm = n; }}
                            position={[-shoulder * 0.52, shoulderLocalY, 0]}
                            rotation={[0.05, 0, 0.14]}
                        >
                            <Limb radius={armR} length={ARM} color={c.skin} taper={0.9} />
                            <group ref={(n) => { if (n) joints.current.lLoArm = n; }} position={[0, -ARM, 0]}>
                                <Limb radius={armR * 0.88} length={FORE} color={c.skinDeep} taper={0.85} />
                                <mesh position={[0, -FORE - 0.03, 0.01]} castShadow scale={[0.9, 1.1, 0.55]}>
                                    <sphereGeometry args={[0.045, 8, 8]} />
                                    <Mat color={c.skin} />
                                </mesh>
                            </group>
                        </group>
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

                        {/* Head */}
                        <group
                            ref={(n) => { if (n) joints.current.head = n; }}
                            position={[0, CHEST_H * 0.78 + 0.06, 0]}
                        >
                            <mesh position={[0, 0.02, 0]} castShadow>
                                <cylinderGeometry args={[0.045, 0.055, 0.08, 10]} />
                                <Mat color={c.skinDeep} />
                            </mesh>
                            <mesh position={[0, headR + 0.06, 0]} castShadow>
                                <sphereGeometry args={[headR, 18, 16]} />
                                <Mat color={c.skin} roughness={0.62} />
                            </mesh>
                            <mesh position={[0, headR * 0.55, 0.02]} castShadow scale={[0.75, 0.55, 0.7]}>
                                <sphereGeometry args={[headR * 0.85, 12, 10]} />
                                <Mat color={c.skin} roughness={0.65} />
                            </mesh>

                            <HairParts style={hairStyle} c={c} headR={headR} fem={fem} />
                            <FaceParts face={face} c={c} headR={headR} />
                            <ExtraParts extra={extra} c={c} headR={headR} hipW={hipW} />
                        </group>
                    </group>
                </group>

                {/* hip-level extras (satchel belt) */}
                {extra === 'belt' && (
                    <ExtraParts extra="belt" c={c} headR={headR} hipW={hipW} />
                )}
            </group>
        </group>
    );
});
