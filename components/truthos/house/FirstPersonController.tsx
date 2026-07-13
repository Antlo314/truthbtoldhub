'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collideMove, SPAWN, nearestHotspot, type Hotspot } from './houseMap';
import { houseInput } from './houseInput';
import {
    WALK_SPEED,
    SPRINT_MULT,
    MOVE_ACCEL,
    MOVE_FRICTION,
    LOOK_SENS_DESKTOP,
    LOOK_SENS_MOBILE,
    PITCH_MAX,
    JUMP_V,
    GRAVITY,
    EYE_HEIGHT,
    BOB_AMP,
    BOB_FREQ,
    LOOK_SMOOTH,
    damp,
} from './houseFeel';

const keys = new Set<string>();

export default function FirstPersonController({
    locked,
    mobile,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
}: {
    locked: boolean;
    mobile: boolean;
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    /** Fires when player is actively moving / looking — for progressive hints */
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
}) {
    const { camera, gl } = useThree();
    const yaw = useRef(Math.PI);
    const pitch = useRef(0);
    const yawSmooth = useRef(Math.PI);
    const pitchSmooth = useRef(0);
    const pos = useRef(new THREE.Vector3(SPAWN[0], EYE_HEIGHT, SPAWN[2]));
    const vel = useRef(new THREE.Vector3(0, 0, 0));
    const vy = useRef(0);
    const grounded = useRef(true);
    const poseT = useRef(0);
    const bobT = useRef(0);
    const interactLatch = useRef(false);
    const activityT = useRef(0);
    const lastKind = useRef<'move' | 'look' | 'jump' | 'idle'>('idle');

    useEffect(() => {
        pos.current.set(SPAWN[0], EYE_HEIGHT, SPAWN[2]);
        vel.current.set(0, 0, 0);
        vy.current = 0;
        grounded.current = true;
        camera.position.copy(pos.current);
        camera.rotation.order = 'YXZ';
        yaw.current = Math.PI;
        pitch.current = 0;
        yawSmooth.current = Math.PI;
        pitchSmooth.current = 0;
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
        const sens = mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP;

        const onPointerDown = (e: PointerEvent) => {
            if (locked || mobile) return; // mobile look is on the HUD zones
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
            yaw.current -= dx * sens;
            pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens, -PITCH_MAX, PITCH_MAX);
            onMoveActivity?.('look');
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
    }, [gl, locked, mobile, onMoveActivity]);

    useFrame((_, dt) => {
        const d = Math.min(dt, 0.05);
        camera.rotation.order = 'YXZ';
        const lookSens = mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP;

        if (!locked) {
            // Touch / residual look: prefer pixel deltas (authoritative), then soft velocity
            const pix = houseInput.consumeLookPixels();
            let ldx = pix.dx;
            let ldy = pix.dy;
            if (!ldx && !ldy) {
                ldx = houseInput.lookVX;
                ldy = houseInput.lookVY;
            } else {
                // pixels already applied this frame — clear soft velocity to avoid double look
                houseInput.lookVX = 0;
                houseInput.lookVY = 0;
            }
            if (ldx || ldy) {
                yaw.current -= ldx * lookSens;
                pitch.current = THREE.MathUtils.clamp(
                    pitch.current - ldy * lookSens,
                    -PITCH_MAX,
                    PITCH_MAX,
                );
                if (Math.abs(ldx) + Math.abs(ldy) > 0.35) emitActivity('look');
            }
        } else {
            houseInput.consumeLookPixels();
            houseInput.clearLook();
        }

        // Smooth camera rotation (fluid feel)
        yawSmooth.current = damp(yawSmooth.current, yaw.current, LOOK_SMOOTH, d);
        pitchSmooth.current = damp(pitchSmooth.current, pitch.current, LOOK_SMOOTH, d);
        // Keep smooth within 2π of target for yaw wrap
        let yawErr = yaw.current - yawSmooth.current;
        while (yawErr > Math.PI) yawErr -= Math.PI * 2;
        while (yawErr < -Math.PI) yawErr += Math.PI * 2;
        yawSmooth.current = yaw.current - yawErr;
        yawSmooth.current = damp(yawSmooth.current, yaw.current, LOOK_SMOOTH, d);

        camera.rotation.y = yawSmooth.current;
        camera.rotation.x = pitchSmooth.current;

        if (!locked) {
            const yawUse = yawSmooth.current;
            const forward = new THREE.Vector3(-Math.sin(yawUse), 0, -Math.cos(yawUse));
            const right = new THREE.Vector3(Math.cos(yawUse), 0, -Math.sin(yawUse));

            let wishX = 0;
            let wishZ = 0;

            // Keyboard
            if (keys.has('KeyW') || keys.has('ArrowUp')) {
                wishX += forward.x;
                wishZ += forward.z;
            }
            if (keys.has('KeyS') || keys.has('ArrowDown')) {
                wishX -= forward.x;
                wishZ -= forward.z;
            }
            if (keys.has('KeyA') || keys.has('ArrowLeft')) {
                wishX -= right.x;
                wishZ -= right.z;
            }
            if (keys.has('KeyD') || keys.has('ArrowRight')) {
                wishX += right.x;
                wishZ += right.z;
            }

            // Mobile stick (already deadzoned + curved): axisFwd +1 = forward
            const jx = houseInput.axisX;
            const jf = houseInput.axisFwd;
            if (Math.abs(jx) > 0.001 || Math.abs(jf) > 0.001) {
                wishX += forward.x * jf + right.x * jx;
                wishZ += forward.z * jf + right.z * jx;
            }

            let speed = WALK_SPEED;
            if (keys.has('ShiftLeft') || keys.has('ShiftRight')) speed *= SPRINT_MULT;

            let tx = 0;
            let tz = 0;
            const wLen = Math.hypot(wishX, wishZ);
            if (wLen > 1e-4) {
                tx = (wishX / wLen) * speed;
                tz = (wishZ / wLen) * speed;
                emitActivity('move');
            }

            const lambda = wLen > 1e-4 ? MOVE_ACCEL : MOVE_FRICTION;
            vel.current.x = damp(vel.current.x, tx, lambda, d);
            vel.current.z = damp(vel.current.z, tz, lambda, d);

            // Kill micro-velocity
            if (Math.hypot(vel.current.x, vel.current.z) < 0.02 && wLen < 1e-4) {
                vel.current.x = 0;
                vel.current.z = 0;
            }

            if (vel.current.x !== 0 || vel.current.z !== 0) {
                const next = collideMove(
                    pos.current.x,
                    pos.current.z,
                    vel.current.x * d,
                    vel.current.z * d,
                );
                // If blocked on an axis, zero that velocity for less sticky feel
                if (Math.abs(next.x - pos.current.x) < 1e-6 && Math.abs(vel.current.x) > 0.01) {
                    vel.current.x *= 0.2;
                }
                if (Math.abs(next.z - pos.current.z) < 1e-6 && Math.abs(vel.current.z) > 0.01) {
                    vel.current.z *= 0.2;
                }
                pos.current.x = next.x;
                pos.current.z = next.z;
            }

            // Jump + gravity
            if (houseInput.consumeJump() && grounded.current) {
                vy.current = JUMP_V;
                grounded.current = false;
                emitActivity('jump');
            }
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (pos.current.y <= EYE_HEIGHT) {
                pos.current.y = EYE_HEIGHT;
                vy.current = 0;
                grounded.current = true;
            }

            // Head bob
            const spd = Math.hypot(vel.current.x, vel.current.z);
            if (grounded.current && spd > 0.4) {
                bobT.current += d * BOB_FREQ * (spd / WALK_SPEED);
            } else {
                bobT.current *= 1 - Math.min(1, d * 6);
            }
            const bob = Math.sin(bobT.current) * BOB_AMP * Math.min(1, spd / WALK_SPEED);
            camera.position.set(pos.current.x, pos.current.y + bob, pos.current.z);
        } else {
            houseInput.consumeJump();
            vel.current.set(0, 0, 0);
            camera.position.set(pos.current.x, pos.current.y, pos.current.z);
        }

        const hs = nearestHotspot(pos.current.x, pos.current.z);
        onHotspot(hs);

        if (!locked && houseInput.consumeInteract()) {
            if (hs && onInteractRequest && !interactLatch.current) {
                interactLatch.current = true;
                onInteractRequest();
                setTimeout(() => {
                    interactLatch.current = false;
                }, 350);
            }
        }

        // Idle signal for hints
        activityT.current += d;
        if (activityT.current > 1.2 && lastKind.current !== 'idle') {
            lastKind.current = 'idle';
            onMoveActivity?.('idle');
        }

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            onPose({
                x: pos.current.x,
                y: 0,
                z: pos.current.z,
                yaw: yawSmooth.current,
            });
        }
    });

    function emitActivity(kind: 'move' | 'look' | 'jump' | 'idle') {
        activityT.current = 0;
        if (lastKind.current === kind && kind !== 'jump') return;
        lastKind.current = kind;
        onMoveActivity?.(kind);
    }

    return null;
}
