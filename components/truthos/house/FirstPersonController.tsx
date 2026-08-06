'use client';

/**
 * First-person locomotion — keyboard + mobile stick.
 * Hard input reset on blur/lock so movement never runs away on its own.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { type Hotspot } from './houseMap';
import {
    groundAt,
    INTRO,
    levelAfter,
    moveOn,
    nearestHomeHotspot,
    SIT_HEIGHT,
    SPAWN_YAW,
    type Level,
} from './homeMap';
import { houseInput } from './houseInput';
import { hubAudio } from '@/lib/truthos/hubAudio';
import {
    WALK_SPEED,
    SPRINT_MULT,
    STRAFE_MULT,
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
import { setWalkerPose } from './walkerPose';

/** Soft footsteps on the two rugs (rec room + living) */
function onRug(x: number, z: number): boolean {
    if (x > -12.6 && x < -5.6 && z > 9.6 && z < 15.0) return true;
    if (x > 6.4 && x < 11.8 && z > -1.6 && z < 5.0) return true;
    return false;
}

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
    const yaw = useRef(SPAWN_YAW);
    const pitch = useRef(0);
    const yawS = useRef(SPAWN_YAW);
    const pitchS = useRef(0);
    const pos = useRef(new THREE.Vector3(INTRO.seat.x, SIT_HEIGHT, INTRO.seat.z));
    const level = useRef<Level>('main');
    // Every session opens seated at the desk: hold on the glow, then rise.
    const intro = useRef<{ phase: 'hold' | 'rise' | 'done'; t: number }>({ phase: 'hold', t: 0 });
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
    const lastBobSin = useRef(0);

    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            intro.current = { phase: 'done', t: 0 };
            pos.current.set(INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z);
        } else {
            intro.current = { phase: 'hold', t: 0 };
            pos.current.set(INTRO.seat.x, SIT_HEIGHT, INTRO.seat.z);
        }
        level.current = 'main';
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        yaw.current = SPAWN_YAW;
        pitch.current = 0;
        yawS.current = SPAWN_YAW;
        pitchS.current = 0;
        camera.position.copy(pos.current);
        // Lock Y-up FPS orientation (no roll) — residual lookAt/quaternion roll = ceiling walk
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(0, SPAWN_YAW, 0);
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
            // Prefer pointer lock for cinematic PC look (no OS cursor fight)
            if (e.button === 0) {
                if (!document.pointerLockElement) {
                    try {
                        void el.requestPointerLock();
                    } catch {
                        /* */
                    }
                }
                dragging = true;
                lx = e.clientX;
                ly = e.clientY;
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (lockedRef.current || mobile) return;
            const sens = LOOK_SENS_DESKTOP;
            // Pointer lock: movementX/Y is the only reliable delta
            if (document.pointerLockElement === el) {
                const dx = e.movementX || 0;
                const dy = e.movementY || 0;
                if (dx === 0 && dy === 0) return;
                yaw.current -= dx * sens;
                pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens, -PITCH_MAX, PITCH_MAX);
                emit('look');
                return;
            }
            if (!dragging) return;
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
        const onLockChange = () => {
            if (!document.pointerLockElement) dragging = false;
        };

        const onVis = () => {
            if (document.hidden) hardStop();
        };

        window.addEventListener('keydown', down, { passive: false });
        window.addEventListener('keyup', up);
        window.addEventListener('blur', hardStop);
        document.addEventListener('visibilitychange', onVis);
        document.addEventListener('pointerlockchange', onLockChange);
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
            document.removeEventListener('pointerlockchange', onLockChange);
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('contextmenu', ctx);
            try {
                if (document.pointerLockElement === el) document.exitPointerLock();
            } catch {
                /* */
            }
        };
    }, [gl, mobile]);

    useFrame((_, dtRaw) => {
        const d = Math.min(Math.max(dtRaw, 0), 0.05) || 0.016;
        const lockedNow = lockedRef.current;
        // Every frame: force Y-up, zero roll — prevents upside-down / ceiling walking
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';

        // ── The opening: seated at the terminal, then you stand ──
        // You were just at Truth.OS; the world begins with the same screen
        // in front of you. Hold on the glow, push back, rise to full
        // height, and only then does the world hand you your legs.
        if (intro.current.phase !== 'done') {
            const st = intro.current;
            st.t += d;
            // Any input skips the ceremony
            if (houseInput.consumeInteract() || keys.current.size > 0) {
                st.phase = 'done';
                pos.current.set(INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z);
            } else if (st.phase === 'hold') {
                // Seated: a slow breath so the frame is alive, not frozen
                const breathe = Math.sin(st.t * 1.8) * 0.006;
                pos.current.set(INTRO.seat.x, SIT_HEIGHT + breathe, INTRO.seat.z);
                pitch.current = -0.06;
                if (st.t >= INTRO.holdS) {
                    st.phase = 'rise';
                    st.t = 0;
                }
            } else {
                // Rise: ease up and step back off the chair in one motion
                const p = Math.min(1, st.t / INTRO.riseS);
                const e = p * p * (3 - 2 * p); // smoothstep
                pos.current.set(
                    INTRO.seat.x + (INTRO.stand.x - INTRO.seat.x) * e,
                    SIT_HEIGHT + (EYE_HEIGHT - SIT_HEIGHT) * e,
                    INTRO.seat.z + (INTRO.stand.z - INTRO.seat.z) * e,
                );
                pitch.current = -0.06 * (1 - e);
                if (p >= 1) st.phase = 'done';
            }
            yaw.current = SPAWN_YAW;
            yawS.current = SPAWN_YAW;
            pitchS.current = pitch.current;
            camera.position.copy(pos.current);
            camera.rotation.set(pitchS.current, yawS.current, 0);
            onHotspot(null);
            houseInput.consumeJump();
            return;
        }
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
        // set() applies pitch/yaw/roll together so z never drifts to π (world invert)
        camera.rotation.set(pitchS.current, yawS.current, 0);

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
                wishX -= rx * STRAFE_MULT;
                wishZ -= rz * STRAFE_MULT;
                hasInput = true;
            }
            if (k.has('KeyD') || k.has('ArrowRight')) {
                wishX += rx * STRAFE_MULT;
                wishZ += rz * STRAFE_MULT;
                hasInput = true;
            }

            const jx = houseInput.axisX;
            const jf = houseInput.axisFwd;
            if (Math.abs(jx) > 0.02 || Math.abs(jf) > 0.02) {
                // Strafe axis slightly boosted; forward uses base walk speed
                wishX += fx * jf + rx * jx * STRAFE_MULT;
                wishZ += fz * jf + rz * jx * STRAFE_MULT;
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
                const next = moveOn(
                    level.current,
                    pos.current.x,
                    pos.current.z,
                    pos.current.x + vel.current.x * d,
                    pos.current.z + vel.current.z * d,
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
            // Two-storey ground: the floor under you depends on where you are
            // AND which storey you're on; the stair is a ramp between them.
            level.current = levelAfter(pos.current.x, pos.current.z, level.current);
            const eyeFloor = groundAt(pos.current.x, pos.current.z, level.current) + EYE_HEIGHT;
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (pos.current.y <= eyeFloor) {
                pos.current.y = eyeFloor;
                vy.current = 0;
                grounded.current = true;
            }

            const spd = Math.hypot(vel.current.x, vel.current.z);
            // Foot plant only while intentional move + grounded + real speed (no ghost steps)
            const stepping = hasInput && grounded.current && spd > 0.55;
            if (stepping) {
                bobT.current += d * BOB_FREQ * Math.min(1.35, spd / WALK_SPEED);
                const s = Math.sin(bobT.current);
                const prev = lastBobSin.current;
                // Heel-down on each zero-cross of walk cycle
                if ((prev <= 0 && s > 0) || (prev >= 0 && s < 0)) {
                    hubAudio.footPlant(onRug(pos.current.x, pos.current.z));
                }
                lastBobSin.current = s;
            } else {
                bobT.current *= 1 - Math.min(1, d * 10);
                lastBobSin.current = 0;
                // Stop moving immediately for HUD/audio — no 1.5s ghost steps
                if (!hasInput && lastKind.current === 'move') {
                    emit('idle');
                }
            }
            const bob =
                Math.sin(bobT.current) * BOB_AMP * (stepping ? Math.min(1, spd / WALK_SPEED) : 0);
            camera.position.set(pos.current.x, pos.current.y + bob, pos.current.z);
        } else {
            houseInput.consumeJump();
            vel.current = { x: 0, z: 0 };
            lastBobSin.current = 0;
            camera.position.set(pos.current.x, pos.current.y, pos.current.z);
        }

        const hs = nearestHomeHotspot(pos.current.x, pos.current.z, level.current);
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
        if (activityT.current > 0.35 && lastKind.current !== 'idle') {
            lastKind.current = 'idle';
            activityCb.current?.('idle');
        }

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            const p = {
                x: pos.current.x,
                // Body-ground height (0 on main, ~UPPER_Y upstairs, rises in
                // jumps) — eye Y minus eye height, bob is camera-only.
                y: Math.max(0, pos.current.y - EYE_HEIGHT),
                z: pos.current.z,
                yaw: yawS.current,
            };
            setWalkerPose(p);
            onPose(p);
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
