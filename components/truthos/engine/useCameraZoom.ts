'use client';

import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import type { DeviceTarget } from './types';
import { ANCHORS } from './types';

/**
 * GSAP cinematic zoom: room framing → flush with device glass.
 * On complete, host should set phase = 'os' and show HTML Truth.OS overlay.
 */
export function useCameraZoom() {
    const { camera } = useThree();
    const tweening = useRef(false);
    const lookProxy = useRef({ x: 0, y: 1, z: 0 });

    const frameRoom = useCallback(
        (target: DeviceTarget, immediate = false) => {
            const a = ANCHORS[target];
            const [cx, cy, cz] = a.cameraStart;
            const [lx, ly, lz] = a.lookAtStart;
            if (immediate) {
                camera.position.set(cx, cy, cz);
                lookProxy.current = { x: lx, y: ly, z: lz };
                camera.lookAt(lx, ly, lz);
                return;
            }
            gsap.to(camera.position, {
                x: cx,
                y: cy,
                z: cz,
                duration: 1.4,
                ease: 'power2.inOut',
                onUpdate: () => {
                    camera.lookAt(lookProxy.current.x, lookProxy.current.y, lookProxy.current.z);
                },
            });
            gsap.to(lookProxy.current, {
                x: lx,
                y: ly,
                z: lz,
                duration: 1.4,
                ease: 'power2.inOut',
            });
        },
        [camera],
    );

    const zoomIntoDevice = useCallback(
        (target: DeviceTarget, onComplete?: () => void) => {
            if (tweening.current) return;
            tweening.current = true;
            const a = ANCHORS[target];
            const [ex, ey, ez] = a.cameraEnd;
            const [px, py, pz] = a.position;

            // Kill any room idle drift
            gsap.killTweensOf(camera.position);
            gsap.killTweensOf(lookProxy.current);

            const tl = gsap.timeline({
                onComplete: () => {
                    tweening.current = false;
                    onComplete?.();
                },
            });

            // Phase 1: ease toward device (anticipation)
            tl.to(
                camera.position,
                {
                    x: THREE.MathUtils.lerp(camera.position.x, ex, 0.45),
                    y: THREE.MathUtils.lerp(camera.position.y, ey, 0.45),
                    z: THREE.MathUtils.lerp(camera.position.z, ez, 0.35),
                    duration: 0.85,
                    ease: 'power2.in',
                    onUpdate: () => camera.lookAt(px, py, pz),
                },
                0,
            );

            // Phase 2: commit into the glass (Matrix “fall in”)
            tl.to(
                camera.position,
                {
                    x: ex,
                    y: ey,
                    z: ez,
                    duration: 1.15,
                    ease: 'power3.in',
                    onUpdate: () => camera.lookAt(px, py, pz),
                },
                0.75,
            );

            // Subtle FOV punch if perspective camera
            if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
                const persp = camera as THREE.PerspectiveCamera;
                const startFov = persp.fov;
                tl.to(
                    persp,
                    {
                        fov: startFov * 0.82,
                        duration: 1.1,
                        ease: 'power2.in',
                        onUpdate: () => persp.updateProjectionMatrix(),
                    },
                    0.8,
                );
                tl.to(
                    persp,
                    {
                        fov: startFov,
                        duration: 0.01,
                        onUpdate: () => persp.updateProjectionMatrix(),
                    },
                    '>',
                );
            }
        },
        [camera],
    );

    return { frameRoom, zoomIntoDevice, isTweening: () => tweening.current };
}
