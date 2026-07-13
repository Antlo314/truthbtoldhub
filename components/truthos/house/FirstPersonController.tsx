'use client';

/**
 * First-person locomotion — keyboard + mobile stick.
 * Hard input reset on blur/lock so movement never runs away on its own.
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

/** Per-instance keys — never shared across remounts in a sticky way */
function createKeyState() {
    return new Set<string>();
}

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

    const keys = useRef(createKeyState());
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
    const lastKeyAt = useRef(0);

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
        houseInput.clearAll();
        keys.current.clear();
    }, [camera]);

    // When UI locks, kill all motion input immediately
    useEffect(() => {
        if (locked) {
            houseInput.clearAll();
            keys.current.clear();
            vel.current = { x: 0, z: 0 };
        }
    }, [locked]);

    useEffect(() => {
        const el = gl.domElement;
        const k = keys.current;

        const hardStop = () => {
            k.clear();
            houseInput.clearAll();
            vel.current = { x: 0, z: 0 };
        };

        const down = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable)
                return;
            if (lockedRef.current) return;
            k.add(e.code);
            lastKeyAt.current = performance.now();
            houseInput.touchInput();
            if (e.code === 'Space') {
                e.preventDefault();
                houseInput.queueJump();
            }
        };
        const up = (e: KeyboardEvent) => {
            k.delete(e.code);
        };

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
        const onPointerUp = () => {
            dragging = false;
        };
        const ctx = (e: Event) => e.preventDefault();

        const onVis = () => {
            if (document.hidden) hardStop();
        };

        window.addEventListener('keydown', down, { passive: false });
        window.addEventListener('keyup', up);
        window.addEventListener('blur', hardStop);
        document.addEventListener('visibilitychange', onVis);
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('contextmenu', ctx);

        return () => {
            hardStop();
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', hardStop);
            document.removeEventListener('visibilitychange', onVis);
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('contextmenu', ctx);
        };
    }, [gl, mobile]);

    useFrame((_, dtRaw) => {
        const d = Math.min(Math.max(dtRaw, 0), 0.05) || 0.016;
        const lockedNow = lockedRef.current;
        camera.rotation.order = 'YXZ';
        const lookSens = mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP;
        const k = keys.current;

        // Safety: if keys claim held but no key event for 3s, clear (stuck key)
        if (k.size > 0 && performance.now() - lastKeyAt.current > 3000) {
            k.clear();
        }
        // Safety: stick input without recent touch → clear (stuck stick)
        if (
            !houseInput.movingTouch &&
            (Math.abs(houseInput.axisX) > 0.01 || Math.abs(houseInput.axisFwd) > 0.01) &&
            performance.now() - houseInput.lastInputAt > 400
        ) {
            houseInput.clearMove();
        }

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

        let err = yaw.current - yawS.current;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        yawS.current = yaw.current - err;
        yawS.current = damp(yawS.current, yaw.current, LOOK_SMOOTH, d);
        pitchS.current = damp(pitchS.current, pitch.current, LOOK_SMOOTH, d);
        camera.rotation.y = yawS.current;
        camera.rotation.x = pitchS.current;

        if (!lockedNow) {
            const yawUse = yawS.current;
            const fx = -Math.sin(yawUse);
            const fz = -Math.cos(yawUse);
            const rx = Math.cos(yawUse);
            const rz = -Math.sin(yawUse);

            let wishX = 0;
            let wishZ = 0;
            let hasInput = false;

            if (k.has('KeyW') || k.has('ArrowUp')) {
                wishX += fx;
                wishZ += fz;
                hasInput = true;
            }
            if (k.has('KeyS') || k.has('ArrowDown')) {
                wishX -= fx;
                wishZ -= fz;
                hasInput = true;
            }
            if (k.has('KeyA') || k.has('ArrowLeft')) {
                wishX -= rx;
                wishZ -= rz;
                hasInput = true;
            }
            if (k.has('KeyD') || k.has('ArrowRight')) {
                wishX += rx;
                wishZ += rz;
                hasInput = true;
            }

            const jx = houseInput.axisX;
            const jf = houseInput.axisFwd;
            if (Math.abs(jx) > 0.02 || Math.abs(jf) > 0.02) {
                wishX += fx * jf + rx * jx;
                wishZ += fz * jf + rz * jx;
                hasInput = true;
            }

            // No intentional input → hard zero wish (prevents ghost drift)
            if (!hasInput) {
                wishX = 0;
                wishZ = 0;
            }

            let speed = WALK_SPEED;
            if (k.has('ShiftLeft') || k.has('ShiftRight')) speed *= SPRINT_MULT;

            const wLen = Math.hypot(wishX, wishZ);
            let tx = 0;
            let tz = 0;
            if (wLen > 1e-4) {
                const inv = 1 / wLen;
                const stickMag = Math.min(1, Math.hypot(jx, jf) || 1);
                const keyMove =
                    k.has('KeyW') ||
                    k.has('KeyA') ||
                    k.has('KeyS') ||
                    k.has('KeyD') ||
                    k.has('ArrowUp') ||
                    k.has('ArrowDown') ||
                    k.has('ArrowLeft') ||
                    k.has('ArrowRight');
                const m = keyMove ? 1 : stickMag;
                tx = wishX * inv * speed * m;
                tz = wishZ * inv * speed * m;
                emit('move');
            }

            const lambda = wLen > 1e-4 ? MOVE_ACCEL : MOVE_FRICTION;
            vel.current.x = damp(vel.current.x, tx, lambda, d);
            vel.current.z = damp(vel.current.z, tz, lambda, d);

            if (!hasInput && Math.hypot(vel.current.x, vel.current.z) < 0.08) {
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
                if (Math.abs(next.x - pos.current.x) < 1e-5) vel.current.x *= 0.1;
                if (Math.abs(next.z - pos.current.z) < 1e-5) vel.current.z *= 0.1;
                pos.current.x = next.x;
                pos.current.z = next.z;
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
            if (grounded.current && spd > 0.4) {
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
        if (activityT.current > 1.5 && lastKind.current !== 'idle') {
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
