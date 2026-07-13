'use client';

/**
 * First-person locomotion — always enabled when not in a panel.
 * Keyboard (WASD) + mobile stick share the same wish-velocity path.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collideMove, resolveStuck, SPAWN, nearestHotspot, type Hotspot } from './houseMap';
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
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
}) {
    const { camera, gl } = useThree();
    const lockedRef = useRef(locked);
    lockedRef.current = locked;

    const yaw = useRef(Math.PI);
    const pitch = useRef(0);
    const yawS = useRef(Math.PI);
    const pitchS = useRef(0);
    const pos = useRef(new THREE.Vector3(SPAWN[0], EYE_HEIGHT, SPAWN[2]));
    const vel = useRef({ x: 0, z: 0 });
    const vy = useRef(0);
    const grounded = useRef(true);
    const poseT = useRef(0);
    const bobT = useRef(0);
    const interactLatch = useRef(false);
    const activityT = useRef(0);
    const lastKind = useRef<'move' | 'look' | 'jump' | 'idle'>('idle');
    const activityCb = useRef(onMoveActivity);
    activityCb.current = onMoveActivity;

    // Spawn once — unstick if colliders ever overlap
    useEffect(() => {
        const free = resolveStuck(SPAWN[0], SPAWN[2]);
        pos.current.set(free.x, EYE_HEIGHT, free.z);
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        yaw.current = Math.PI;
        pitch.current = 0;
        yawS.current = Math.PI;
        pitchS.current = 0;
        camera.position.copy(pos.current);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = Math.PI;
        camera.rotation.x = 0;
    }, [camera]);

    // Input — stable listeners (use lockedRef, not rebind on locked)
    useEffect(() => {
        const el = gl.domElement;

        const down = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            keys.add(e.code);
            if (e.code === 'Space') {
                e.preventDefault();
                if (!lockedRef.current) houseInput.queueJump();
            }
        };
        const up = (e: KeyboardEvent) => keys.delete(e.code);
        const blur = () => keys.clear();

        let dragging = false;
        let lx = 0;
        let ly = 0;

        const onPointerDown = (e: PointerEvent) => {
            if (lockedRef.current || mobile) return;
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
            if (!dragging || lockedRef.current) return;
            const sens = LOOK_SENS_DESKTOP;
            const dx = e.clientX - lx;
            const dy = e.clientY - ly;
            lx = e.clientX;
            ly = e.clientY;
            yaw.current -= dx * sens;
            pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens, -PITCH_MAX, PITCH_MAX);
            emit('look');
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

        window.addEventListener('keydown', down, { passive: false });
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('contextmenu', ctx);

        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('contextmenu', ctx);
            keys.clear();
        };
    }, [gl, mobile]);

    useFrame((_, dtRaw) => {
        const d = Math.min(Math.max(dtRaw, 0), 0.05) || 0.016;
        const lockedNow = lockedRef.current;
        camera.rotation.order = 'YXZ';
        const lookSens = mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP;

        // ── Look ──
        if (!lockedNow) {
            const pix = houseInput.consumeLookPixels();
            if (pix.dx || pix.dy) {
                yaw.current -= pix.dx * lookSens;
                pitch.current = THREE.MathUtils.clamp(
                    pitch.current - pix.dy * lookSens,
                    -PITCH_MAX,
                    PITCH_MAX,
                );
                if (Math.abs(pix.dx) + Math.abs(pix.dy) > 0.4) emit('look');
            }
        } else {
            houseInput.consumeLookPixels();
            houseInput.clearLook();
        }

        // Smooth look slightly
        yawS.current = damp(yawS.current, yaw.current, LOOK_SMOOTH, d);
        // Unwrap yaw for smooth interp
        let err = yaw.current - yawS.current;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        yawS.current = yaw.current - err;
        yawS.current = damp(yawS.current, yaw.current, LOOK_SMOOTH, d);
        pitchS.current = damp(pitchS.current, pitch.current, LOOK_SMOOTH, d);

        camera.rotation.y = yawS.current;
        camera.rotation.x = pitchS.current;

        // ── Move ──
        if (!lockedNow) {
            const yawUse = yawS.current;
            const fx = -Math.sin(yawUse);
            const fz = -Math.cos(yawUse);
            const rx = Math.cos(yawUse);
            const rz = -Math.sin(yawUse);

            let wishX = 0;
            let wishZ = 0;

            // Keyboard — always live
            if (keys.has('KeyW') || keys.has('ArrowUp')) {
                wishX += fx;
                wishZ += fz;
            }
            if (keys.has('KeyS') || keys.has('ArrowDown')) {
                wishX -= fx;
                wishZ -= fz;
            }
            if (keys.has('KeyA') || keys.has('ArrowLeft')) {
                wishX -= rx;
                wishZ -= rz;
            }
            if (keys.has('KeyD') || keys.has('ArrowRight')) {
                wishX += rx;
                wishZ += rz;
            }

            // Mobile stick: axisFwd = +1 forward, axisX = strafe
            const jx = houseInput.axisX;
            const jf = houseInput.axisFwd;
            if (Math.abs(jx) > 0.001 || Math.abs(jf) > 0.001) {
                wishX += fx * jf + rx * jx;
                wishZ += fz * jf + rz * jx;
            }

            let speed = WALK_SPEED;
            if (keys.has('ShiftLeft') || keys.has('ShiftRight')) speed *= SPRINT_MULT;

            const wLen = Math.hypot(wishX, wishZ);
            let tx = 0;
            let tz = 0;
            if (wLen > 1e-4) {
                const inv = 1 / wLen;
                // Stick magnitude scales speed (keyboard is full speed)
                const stickMag =
                    Math.abs(jx) > 0.001 || Math.abs(jf) > 0.001
                        ? Math.min(1, Math.hypot(jx, jf))
                        : 1;
                const useStick = Math.abs(jx) > 0.001 || Math.abs(jf) > 0.001;
                const mag = useStick ? stickMag : 1;
                // If both keys + stick, prefer full
                const keyMove =
                    keys.has('KeyW') ||
                    keys.has('KeyA') ||
                    keys.has('KeyS') ||
                    keys.has('KeyD') ||
                    keys.has('ArrowUp') ||
                    keys.has('ArrowDown') ||
                    keys.has('ArrowLeft') ||
                    keys.has('ArrowRight');
                const m = keyMove ? 1 : mag;
                tx = wishX * inv * speed * m;
                tz = wishZ * inv * speed * m;
                emit('move');
            }

            const lambda = wLen > 1e-4 ? MOVE_ACCEL : MOVE_FRICTION;
            vel.current.x = damp(vel.current.x, tx, lambda, d);
            vel.current.z = damp(vel.current.z, tz, lambda, d);

            if (Math.hypot(vel.current.x, vel.current.z) < 0.015 && wLen < 1e-4) {
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
                // Soft stop against walls without freezing forever
                if (Math.abs(next.x - pos.current.x) < 1e-5) vel.current.x *= 0.15;
                if (Math.abs(next.z - pos.current.z) < 1e-5) vel.current.z *= 0.15;
                pos.current.x = next.x;
                pos.current.z = next.z;
            } else {
                // Idle unstick pass (escape bad embeds)
                const free = resolveStuck(pos.current.x, pos.current.z);
                pos.current.x = free.x;
                pos.current.z = free.z;
            }

            if (houseInput.consumeJump() && grounded.current) {
                vy.current = JUMP_V;
                grounded.current = false;
                emit('jump');
            }
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (pos.current.y <= EYE_HEIGHT) {
                pos.current.y = EYE_HEIGHT;
                vy.current = 0;
                grounded.current = true;
            }

            const spd = Math.hypot(vel.current.x, vel.current.z);
            if (grounded.current && spd > 0.35) {
                bobT.current += d * BOB_FREQ * (spd / WALK_SPEED);
            } else {
                bobT.current *= 1 - Math.min(1, d * 8);
            }
            const bob = Math.sin(bobT.current) * BOB_AMP * Math.min(1, spd / WALK_SPEED);
            camera.position.set(pos.current.x, pos.current.y + bob, pos.current.z);
        } else {
            houseInput.consumeJump();
            vel.current = { x: 0, z: 0 };
            camera.position.set(pos.current.x, pos.current.y, pos.current.z);
        }

        const hs = nearestHotspot(pos.current.x, pos.current.z);
        onHotspot(hs);

        if (!lockedNow && houseInput.consumeInteract()) {
            if (hs && onInteractRequest && !interactLatch.current) {
                interactLatch.current = true;
                onInteractRequest();
                window.setTimeout(() => {
                    interactLatch.current = false;
                }, 300);
            }
        }

        activityT.current += d;
        if (activityT.current > 1.4 && lastKind.current !== 'idle') {
            lastKind.current = 'idle';
            activityCb.current?.('idle');
        }

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            onPose({
                x: pos.current.x,
                y: 0,
                z: pos.current.z,
                yaw: yawS.current,
            });
        }
    });

    function emit(kind: 'move' | 'look' | 'jump' | 'idle') {
        activityT.current = 0;
        if (lastKind.current === kind && kind !== 'jump') return;
        lastKind.current = kind;
        activityCb.current?.(kind);
    }

    return null;
}
