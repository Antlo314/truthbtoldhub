'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collideMove, SPAWN, nearestHotspot, type Hotspot } from './houseMap';
import { houseInput } from './houseInput';

const SPEED = 4.2;
const LOOK = 0.0022;
const LOOK_STICK = 1.8;
const EYE = 1.62;
const JUMP_V = 5.2;
const GRAVITY = 14;

const keys = new Set<string>();

export default function FirstPersonController({
    locked,
    onHotspot,
    onPose,
    onInteractRequest,
}: {
    locked: boolean;
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    /** Fired when E / mobile interact is requested near a hotspot */
    onInteractRequest?: () => void;
}) {
    const { camera, gl } = useThree();
    const yaw = useRef(Math.PI);
    const pitch = useRef(0);
    const pos = useRef(new THREE.Vector3(...SPAWN));
    const vy = useRef(0);
    const grounded = useRef(true);
    const poseT = useRef(0);
    const interactLatch = useRef(false);

    useEffect(() => {
        pos.current.set(SPAWN[0], EYE, SPAWN[2]);
        vy.current = 0;
        grounded.current = true;
        camera.position.copy(pos.current);
        camera.rotation.order = 'YXZ';
        yaw.current = Math.PI;
        pitch.current = 0;
        camera.rotation.y = Math.PI;
        camera.rotation.x = 0;
    }, [camera]);

    useEffect(() => {
        const el = gl.domElement;
        const down = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            keys.add(e.code);
            if (e.code === 'Space') {
                e.preventDefault();
                if (!locked) houseInput.queueJump();
            }
        };
        const up = (e: KeyboardEvent) => keys.delete(e.code);
        const blur = () => keys.clear();

        let dragging = false;
        let lx = 0;
        let ly = 0;

        const onPointerDown = (e: PointerEvent) => {
            if (locked) return;
            // Ignore if UI controls under pointer (shouldn't hit canvas)
            if (e.button === 0 || e.button === 2) {
                dragging = true;
                lx = e.clientX;
                ly = e.clientY;
                try {
                    el.setPointerCapture(e.pointerId);
                } catch {
                    /* */
                }
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
            } catch {
                /* */
            }
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

        // Mobile look stick / extra deltas
        const look = houseInput.consumeLook();
        if (!locked && (look.dx || look.dy)) {
            yaw.current -= look.dx * LOOK * LOOK_STICK;
            pitch.current = THREE.MathUtils.clamp(
                pitch.current - look.dy * LOOK * LOOK_STICK,
                -1.2,
                1.2,
            );
        }

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

            // Joystick: axisX strafe, axisZ forward (negative Y on stick = forward)
            const jx = houseInput.axisX;
            const jz = houseInput.axisZ;
            if (Math.abs(jx) > 0.08 || Math.abs(jz) > 0.08) {
                // jz positive (stick down) = back; jz negative (stick up) = forward
                mx += forward.x * -jz + right.x * jx;
                mz += forward.z * -jz + right.z * jx;
            }

            if (mx !== 0 || mz !== 0) {
                const len = Math.hypot(mx, mz) || 1;
                const sp = SPEED * d;
                const next = collideMove(pos.current.x, pos.current.z, (mx / len) * sp, (mz / len) * sp);
                pos.current.x = next.x;
                pos.current.z = next.z;
            }

            // Jump + gravity
            if (houseInput.consumeJump() && grounded.current) {
                vy.current = JUMP_V;
                grounded.current = false;
            }
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (pos.current.y <= EYE) {
                pos.current.y = EYE;
                vy.current = 0;
                grounded.current = true;
            }
        } else {
            houseInput.consumeJump();
            houseInput.consumeLook();
        }

        camera.position.copy(pos.current);

        const hs = nearestHotspot(pos.current.x, pos.current.z);
        onHotspot(hs);

        // Interact one-shot from mobile / external
        if (!locked && houseInput.consumeInteract()) {
            if (hs && onInteractRequest && !interactLatch.current) {
                interactLatch.current = true;
                onInteractRequest();
                // brief latch so double-fire doesn't open twice
                setTimeout(() => {
                    interactLatch.current = false;
                }, 400);
            }
        }

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
