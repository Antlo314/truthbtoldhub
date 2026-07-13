'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collideMove, SPAWN, nearestHotspot, type Hotspot } from './houseMap';

const SPEED = 4.2;
const LOOK = 0.0022;
const EYE = 1.62;

const keys = new Set<string>();

export default function FirstPersonController({
    locked,
    onHotspot,
    onPose,
}: {
    locked: boolean;
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
}) {
    const { camera, gl } = useThree();
    const yaw = useRef(Math.PI); // face into house (-Z from spawn)
    const pitch = useRef(0);
    const pos = useRef(new THREE.Vector3(...SPAWN));
    const poseT = useRef(0);

    useEffect(() => {
        camera.position.copy(pos.current);
        camera.rotation.order = 'YXZ';
    }, [camera]);

    useEffect(() => {
        const el = gl.domElement;
        const down = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            keys.add(e.code);
            if (e.code === 'Space') e.preventDefault();
        };
        const up = (e: KeyboardEvent) => keys.delete(e.code);
        const blur = () => keys.clear();

        let dragging = false;
        let lx = 0;
        let ly = 0;

        const onPointerDown = (e: PointerEvent) => {
            if (locked) return;
            if (e.button === 0 || e.button === 2) {
                dragging = true;
                lx = e.clientX;
                ly = e.clientY;
                el.setPointerCapture(e.pointerId);
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging || locked) return;
            const dx = e.clientX - lx;
            const dy = e.clientY - ly;
            lx = e.clientX;
            ly = e.clientY;
            yaw.current -= dx * LOOK;
            pitch.current = THREE.MathUtils.clamp(pitch.current - dy * LOOK, -1.2, 1.2);
        };
        const onPointerUp = (e: PointerEvent) => {
            dragging = false;
            try {
                el.releasePointerCapture(e.pointerId);
            } catch { /* */ }
        };
        const ctx = (e: Event) => e.preventDefault();

        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('contextmenu', ctx);

        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('contextmenu', ctx);
        };
    }, [gl, locked]);

    useFrame((_, dt) => {
        const d = Math.min(dt, 0.05);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw.current;
        camera.rotation.x = pitch.current;

        if (!locked) {
            const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
            const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
            let mx = 0;
            let mz = 0;
            if (keys.has('KeyW') || keys.has('ArrowUp')) {
                mx += forward.x;
                mz += forward.z;
            }
            if (keys.has('KeyS') || keys.has('ArrowDown')) {
                mx -= forward.x;
                mz -= forward.z;
            }
            if (keys.has('KeyA') || keys.has('ArrowLeft')) {
                mx -= right.x;
                mz -= right.z;
            }
            if (keys.has('KeyD') || keys.has('ArrowRight')) {
                mx += right.x;
                mz += right.z;
            }
            if (mx !== 0 || mz !== 0) {
                const len = Math.hypot(mx, mz) || 1;
                const sp = SPEED * d;
                const next = collideMove(pos.current.x, pos.current.z, (mx / len) * sp, (mz / len) * sp);
                pos.current.x = next.x;
                pos.current.z = next.z;
            }
        }

        pos.current.y = EYE;
        camera.position.copy(pos.current);

        const hs = nearestHotspot(pos.current.x, pos.current.z);
        onHotspot(hs);

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            onPose({
                x: pos.current.x,
                y: 0,
                z: pos.current.z,
                yaw: yaw.current,
            });
        }
    });

    return null;
}
