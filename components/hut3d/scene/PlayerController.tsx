'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarMesh, type AvatarHandle } from '../AvatarMesh';
import { useHutUi } from '../hutUiStore';
import type { AvatarConfig } from '@/lib/game/avatar';

const SPEED = 4.0;
const JUMP_V = 6.2;
const GRAVITY = -22;
const BOUNDS = { minX: -8.2, maxX: 8.2, minZ: -6.6, maxZ: 6.4 };

const keys = new Set<string>();
/** One-shot jump from touch button */
let jumpQueued = false;

export function queueHutJump() {
    jumpQueued = true;
}

function bindKeys() {
    const down = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        keys.add(e.code);
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
        window.removeEventListener('blur', blur);
    };
}

/**
 * Third-person walk + jump.
 * W into scene · S toward cam · A/D strafe · Space jump
 */
export default function PlayerController({
    avatar,
    onPosition,
}: {
    avatar: AvatarConfig;
    onPosition?: (p: THREE.Vector3) => void;
}) {
    const group = useRef<THREE.Group>(null);
    const avatarRef = useRef<AvatarHandle>(null);
    const vel = useRef(new THREE.Vector3());
    const vy = useRef(0);
    const grounded = useRef(true);
    const facing = useRef(0);
    const jumpHeld = useRef(false);
    const { camera } = useThree();
    const inputLocked = useHutUi((s) => s.inputLocked);

    useEffect(() => bindKeys(), []);

    useFrame((_, dt) => {
        const g = group.current;
        if (!g) return;
        const clampedDt = Math.min(dt, 0.05);

        const camFwd = new THREE.Vector3();
        camera.getWorldDirection(camFwd);
        camFwd.y = 0;
        if (camFwd.lengthSq() < 1e-6) camFwd.set(0, 0, 1);
        else camFwd.normalize();
        const camRight = new THREE.Vector3().crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();

        let fwd = 0;
        let strafe = 0;
        if (!inputLocked) {
            if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
            if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
            if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
            if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
        }

        const wish = new THREE.Vector3()
            .addScaledVector(camFwd, fwd)
            .addScaledVector(camRight, strafe);

        if (wish.lengthSq() > 1e-6) {
            wish.normalize();
            const targetVel = wish.multiplyScalar(SPEED);
            // Slightly less air control
            const accel = grounded.current ? 14 : 6;
            vel.current.lerp(targetVel, 1 - Math.exp(-accel * clampedDt));

            const targetFace = Math.atan2(vel.current.x, vel.current.z);
            let delta = targetFace - facing.current;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            facing.current += delta * (1 - Math.exp(-14 * clampedDt));
            g.rotation.y = facing.current;
        } else {
            const damp = grounded.current ? 16 : 4;
            vel.current.lerp(new THREE.Vector3(), 1 - Math.exp(-damp * clampedDt));
        }

        // Jump
        const wantJump =
            !inputLocked &&
            (jumpQueued || keys.has('Space'));
        if (wantJump && grounded.current && !jumpHeld.current) {
            vy.current = JUMP_V;
            grounded.current = false;
            jumpHeld.current = true;
            jumpQueued = false;
        }
        if (!keys.has('Space') && !jumpQueued) jumpHeld.current = false;

        vy.current += GRAVITY * clampedDt;
        g.position.y += vy.current * clampedDt;

        if (g.position.y <= 0) {
            g.position.y = 0;
            vy.current = 0;
            grounded.current = true;
        }

        g.position.x = THREE.MathUtils.clamp(
            g.position.x + vel.current.x * clampedDt,
            BOUNDS.minX,
            BOUNDS.maxX,
        );
        g.position.z = THREE.MathUtils.clamp(
            g.position.z + vel.current.z * clampedDt,
            BOUNDS.minZ,
            BOUNDS.maxZ,
        );

        const planar = Math.hypot(vel.current.x, vel.current.z);
        const gait = grounded.current ? THREE.MathUtils.clamp(planar / SPEED, 0, 1) : 0;
        // Jump amount: peak near apex / leave-ground
        let jumpAmt = 0;
        if (!grounded.current) {
            // 1 at liftoff, softens near apex, holds tuck until land
            const upness = THREE.MathUtils.clamp(vy.current / JUMP_V, -1, 1);
            jumpAmt = THREE.MathUtils.clamp(0.55 + upness * 0.45, 0.35, 1);
        }
        avatarRef.current?.setGait(gait);
        avatarRef.current?.setJump(jumpAmt);

        const ideal = new THREE.Vector3(g.position.x, 3.45 + g.position.y * 0.15, g.position.z - 5.5);
        camera.position.lerp(ideal, 1 - Math.exp(-5 * clampedDt));
        camera.lookAt(g.position.x, 1.25 + g.position.y * 0.4, g.position.z);

        onPosition?.(g.position.clone());
    });

    return (
        <group ref={group} position={[0, 0, -2.5]}>
            <AvatarMesh ref={avatarRef} avatar={avatar} />
        </group>
    );
}
