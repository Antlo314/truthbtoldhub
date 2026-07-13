'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarMesh, type AvatarHandle } from '../AvatarMesh';
import { useHutUi } from '../hutUiStore';
import type { AvatarConfig } from '@/lib/game/avatar';

const SPEED = 4.0;
const BOUNDS = { minX: -8.2, maxX: 8.2, minZ: -6.6, maxZ: 6.4 };

const keys = new Set<string>();

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
 * Third-person walk:
 * - W / ↑ = into the scene (camera forward)
 * - S / ↓ = toward camera
 * - A/D = strafe left/right from camera view
 * Camera sits behind the soul looking toward Truth (+Z).
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
    const facing = useRef(0);
    const { camera } = useThree();
    const inputLocked = useHutUi((s) => s.inputLocked);

    useEffect(() => bindKeys(), []);

    useFrame((_, dt) => {
        const g = group.current;
        if (!g) return;

        // Camera planar basis (third-person standard)
        const camFwd = new THREE.Vector3();
        camera.getWorldDirection(camFwd);
        camFwd.y = 0;
        if (camFwd.lengthSq() < 1e-6) camFwd.set(0, 0, 1);
        else camFwd.normalize();
        // Right = forward × up
        const camRight = new THREE.Vector3().crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();

        // Input: forward along camera look, strafe on camera right
        // (Previous world-axis mapping felt inverted relative to the follow cam.)
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
            vel.current.lerp(targetVel, 1 - Math.exp(-14 * dt));

            // Face movement direction (+Z is character front)
            const targetFace = Math.atan2(vel.current.x, vel.current.z);
            // shortest-path damp on angle
            let delta = targetFace - facing.current;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            facing.current += delta * (1 - Math.exp(-14 * dt));
            g.rotation.y = facing.current;
        } else {
            vel.current.lerp(new THREE.Vector3(), 1 - Math.exp(-16 * dt));
        }

        g.position.x = THREE.MathUtils.clamp(
            g.position.x + vel.current.x * dt,
            BOUNDS.minX,
            BOUNDS.maxX,
        );
        g.position.z = THREE.MathUtils.clamp(
            g.position.z + vel.current.z * dt,
            BOUNDS.minZ,
            BOUNDS.maxZ,
        );
        // Keep feet planted — gait handles vertical micro-motion
        g.position.y = 0;

        const planar = Math.hypot(vel.current.x, vel.current.z);
        const gait = THREE.MathUtils.clamp(planar / SPEED, 0, 1);
        avatarRef.current?.setGait(gait);

        // Follow cam: stay south of player, look at chest
        const ideal = new THREE.Vector3(g.position.x, 3.45, g.position.z - 5.5);
        camera.position.lerp(ideal, 1 - Math.exp(-5 * dt));
        camera.lookAt(g.position.x, 1.35, g.position.z);

        onPosition?.(g.position.clone());
    });

    return (
        <group ref={group} position={[0, 0, -2.5]}>
            <AvatarMesh ref={avatarRef} avatar={avatar} />
        </group>
    );
}
