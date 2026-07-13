'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarMesh } from '../AvatarMesh';
import { useHutUi } from '../hutUiStore';
import type { AvatarConfig } from '@/lib/game/avatar';

const SPEED = 4.2;
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

export default function PlayerController({
    avatar,
    onPosition,
}: {
    avatar: AvatarConfig;
    onPosition?: (p: THREE.Vector3) => void;
}) {
    const group = useRef<THREE.Group>(null);
    const vel = useRef(new THREE.Vector3());
    const { camera } = useThree();
    const inputLocked = useHutUi((s) => s.inputLocked);
    const bob = useRef(0);

    useEffect(() => bindKeys(), []);

    useFrame((_, dt) => {
        const g = group.current;
        if (!g) return;

        // World axes: +Z toward Truth (north), −Z toward wayfinder
        const wish = new THREE.Vector3();
        if (!inputLocked) {
            if (keys.has('KeyW') || keys.has('ArrowUp')) wish.z += 1;
            if (keys.has('KeyS') || keys.has('ArrowDown')) wish.z -= 1;
            if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.x -= 1;
            if (keys.has('KeyD') || keys.has('ArrowRight')) wish.x += 1;
        }

        if (wish.lengthSq() > 0) {
            wish.normalize();
            vel.current.lerp(wish.multiplyScalar(SPEED), 1 - Math.exp(-12 * dt));
            const face = Math.atan2(wish.x, wish.z);
            g.rotation.y = THREE.MathUtils.damp(g.rotation.y, face, 12, dt);
            bob.current += dt * 10;
        } else {
            vel.current.lerp(new THREE.Vector3(), 1 - Math.exp(-14 * dt));
            bob.current = THREE.MathUtils.damp(bob.current, 0, 8, dt);
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
        g.position.y = Math.abs(Math.sin(bob.current)) * 0.03;

        const target = new THREE.Vector3(g.position.x, 1.45, g.position.z);
        const ideal = new THREE.Vector3(g.position.x, 3.5, g.position.z - 5.4);
        camera.position.lerp(ideal, 1 - Math.exp(-4 * dt));
        camera.lookAt(target);

        onPosition?.(g.position.clone());
    });

    return (
        <group ref={group} position={[0, 0, -2.5]}>
            <AvatarMesh avatar={avatar} />
        </group>
    );
}
