'use client';

/**
 * Locomotion — keyboard + mobile stick, first or third person.
 *
 * The walker is one point on the floor plan; the camera is either at its
 * eyes or on a boom behind it. Everything the body needs to animate
 * (speed, air, seat, emote) is published through walkerPose so the vessel
 * reads it in the frame loop and nothing re-renders.
 *
 * Hard input reset on blur/lock so movement never runs away on its own.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { type Hotspot } from './houseMap';
import {
    blockedAt,
    FRONT_DOOR,
    groundAt,
    HALL_SPINE,
    INTRO,
    isOutdoors,
    moveOn,
    nearestHomeHotspot,
    onSoftFloor,
    RECENTER,
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
import { setWalkerPose, setWalkerState } from './walkerPose';
import { useHouseUi } from './houseUiStore';
import { loadPose, savePose } from './housePose';
import { padUnder } from './worldPads';

/** Per-instance keys — never shared across remounts in a sticky way */
function createKeyState() {
    return new Set<string>();
}

/** Third-person boom: how far behind the eyes the camera rides */
const BOOM_LEN = 3.3;
const BOOM_MIN = 0.85;
const BOOM_SIDE = 0.42;
/** Degrees the lens opens while sprinting — speed you can feel */
const SPRINT_FOV_KICK = 9;
const THIRD_FOV_ADD = 4;

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
    const seated = useHouseUi((s) => s.seated);
    const lookInvert = useHouseUi((s) => s.lookInvert);
    const lookSensMul = useHouseUi((s) => s.lookSens);
    const recenterToken = useHouseUi((s) => s.recenterToken);
    const faceHomeToken = useHouseUi((s) => s.faceHomeToken);
    const lookInvertRef = useRef(lookInvert);
    lookInvertRef.current = lookInvert;
    const lookSensRef = useRef(lookSensMul);
    lookSensRef.current = lookSensMul;
    const lockedRef = useRef(locked);
    lockedRef.current = locked;
    const seatedRef = useRef(seated);
    seatedRef.current = seated;

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
    const airT = useRef(0);
    const landDip = useRef(0);
    const padCooldown = useRef(0);
    const poseT = useRef(0);
    const saveClock = useRef(0);
    const bobT = useRef(0);
    const interactLatch = useRef(false);
    const activityT = useRef(0);
    const lastKind = useRef<'move' | 'look' | 'jump' | 'idle'>('idle');
    const activityCb = useRef(onMoveActivity);
    activityCb.current = onMoveActivity;
    const lastKeyAt = useRef(0);
    const lastBobSin = useRef(0);
    const boom = useRef(BOOM_LEN);
    const fovKick = useRef(0);
    const baseFov = useRef((camera as THREE.PerspectiveCamera).fov);
    const tmpDir = useRef(new THREE.Vector3());
    const tmpRight = useRef(new THREE.Vector3());

    useEffect(() => {
        const saved = loadPose();
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (saved) {
            intro.current = { phase: 'done', t: 0 };
            pos.current.set(saved.x, EYE_HEIGHT, saved.z);
            yaw.current = saved.yaw;
            pitch.current = THREE.MathUtils.clamp(saved.pitch ?? 0, -PITCH_MAX, PITCH_MAX);
        } else if (reduce) {
            intro.current = { phase: 'done', t: 0 };
            pos.current.set(INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z);
            yaw.current = SPAWN_YAW;
            pitch.current = 0;
        } else {
            intro.current = { phase: 'hold', t: 0 };
            pos.current.set(INTRO.seat.x, SIT_HEIGHT, INTRO.seat.z);
            yaw.current = SPAWN_YAW;
            pitch.current = 0;
        }
        level.current = 'main';
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        yawS.current = yaw.current;
        pitchS.current = pitch.current;
        baseFov.current = (camera as THREE.PerspectiveCamera).fov;
        camera.position.copy(pos.current);
        // Lock Y-up FPS orientation (no roll) — residual lookAt/quaternion roll = ceiling walk
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(pitch.current, yaw.current, 0);
        houseInput.clearAll();
        keys.current.clear();
        return () => {
            savePose({
                x: pos.current.x,
                z: pos.current.z,
                yaw: yaw.current,
                pitch: pitch.current,
            });
        };
    }, [camera]);

    const lastRecenter = useRef(recenterToken);
    const lastFace = useRef(faceHomeToken);

    useEffect(() => {
        if (recenterToken === lastRecenter.current) return;
        lastRecenter.current = recenterToken;
        intro.current = { phase: 'done', t: 0 };
        pos.current.set(RECENTER.x, EYE_HEIGHT, RECENTER.z);
        yaw.current = RECENTER.yaw;
        pitch.current = 0;
        yawS.current = RECENTER.yaw;
        pitchS.current = 0;
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        camera.position.copy(pos.current);
        camera.rotation.set(0, RECENTER.yaw, 0);
        savePose({ x: RECENTER.x, z: RECENTER.z, yaw: RECENTER.yaw, pitch: 0 });
    }, [recenterToken, camera]);

    useEffect(() => {
        if (faceHomeToken === lastFace.current) return;
        lastFace.current = faceHomeToken;
        const target = isOutdoors(pos.current.x, pos.current.z)
            ? { x: FRONT_DOOR.x, z: FRONT_DOOR.z }
            : HALL_SPINE;
        const dx = target.x - pos.current.x;
        const dz = target.z - pos.current.z;
        const next = Math.atan2(-dx, -dz);
        yaw.current = next;
        yawS.current = next;
    }, [faceHomeToken]);

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
            const sens = LOOK_SENS_DESKTOP * lookSensRef.current;
            const sign = lookInvertRef.current ? -1 : 1;
            // Pointer lock: movementX/Y is the only reliable delta
            if (document.pointerLockElement === el) {
                const dx = e.movementX || 0;
                const dy = e.movementY || 0;
                if (dx === 0 && dy === 0) return;
                yaw.current -= dx * sens;
                pitch.current = THREE.MathUtils.clamp(
                    pitch.current - dy * sens * sign,
                    -PITCH_MAX,
                    PITCH_MAX,
                );
                emit('look');
                return;
            }
            if (!dragging) return;
            const dx = e.clientX - lx;
            const dy = e.clientY - ly;
            lx = e.clientX;
            ly = e.clientY;
            yaw.current -= dx * sens;
            pitch.current = THREE.MathUtils.clamp(
                pitch.current - dy * sens * sign,
                -PITCH_MAX,
                PITCH_MAX,
            );
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

    /**
     * Place the camera for the current view. First person: at the eyes.
     * Third person: on a boom behind and slightly over the right shoulder,
     * shortened whenever it would sit inside a wall, so the body is always
     * between you and the room and never clipped through plaster.
     */
    function placeCamera(eyeX: number, eyeY: number, eyeZ: number, d: number) {
        const third = useHouseUi.getState().view === 'third' && intro.current.phase === 'done';
        const cam = camera as THREE.PerspectiveCamera;
        const wantFov = baseFov.current + (third ? THIRD_FOV_ADD : 0) + fovKick.current;
        if (Math.abs(cam.fov - wantFov) > 0.05) {
            cam.fov = damp(cam.fov, wantFov, 8, d);
            cam.updateProjectionMatrix();
        }
        if (!third) {
            boom.current = damp(boom.current, BOOM_LEN, 6, d);
            camera.position.set(eyeX, eyeY, eyeZ);
            return;
        }
        // Forward from the smoothed look, exactly as the camera sees it
        const dir = tmpDir.current.set(
            -Math.sin(yawS.current) * Math.cos(pitchS.current),
            Math.sin(pitchS.current),
            -Math.cos(yawS.current) * Math.cos(pitchS.current),
        );
        const right = tmpRight.current.set(Math.cos(yawS.current), 0, -Math.sin(yawS.current));
        const tx = eyeX + right.x * BOOM_SIDE;
        const ty = eyeY + 0.1;
        const tz = eyeZ + right.z * BOOM_SIDE;
        // Shrink the boom until the lens is out of the walls
        let len = BOOM_LEN;
        while (len > BOOM_MIN) {
            const cx = tx - dir.x * len;
            const cz = tz - dir.z * len;
            if (!blockedAt(cx, cz, 0.28)) break;
            len -= 0.18;
        }
        // Lengthening eases out; shortening is instant so we never clip
        boom.current = len < boom.current ? len : damp(boom.current, len, 5, d);
        const floor = groundAt(tx, tz, level.current) + 0.25;
        camera.position.set(
            tx - dir.x * boom.current,
            Math.max(floor, ty - dir.y * boom.current),
            tz - dir.z * boom.current,
        );
    }

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
            setWalkerPose({ x: pos.current.x, y: 0, z: pos.current.z, yaw: SPAWN_YAW });
            setWalkerState({ speed: 0, grounded: true, sprinting: false, seated: st.phase === 'hold' });
            return;
        }
        const lookSens = (mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP) * lookSensRef.current;
        const lookSign = lookInvertRef.current ? -1 : 1;
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
                    pitch.current - pix.dy * lookSens * lookSign,
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

        const seatedNow = seatedRef.current;
        let sprinting = false;
        let hasInput = false;
        let bob = 0;

        if (!lockedNow && !seatedNow) {
            const yawUse = yawS.current;
            const fx = -Math.sin(yawUse);
            const fz = -Math.cos(yawUse);
            const rx = Math.cos(yawUse);
            const rz = -Math.sin(yawUse);

            let wishX = 0;
            let wishZ = 0;

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
            sprinting = hasInput && (k.has('ShiftLeft') || k.has('ShiftRight') || houseInput.sprint);
            if (sprinting) speed *= SPRINT_MULT;

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
            // Aether springs — step on one and the shelf throws you
            padCooldown.current = Math.max(0, padCooldown.current - d);
            if (grounded.current && padCooldown.current <= 0) {
                const pad = padUnder(pos.current.x, pos.current.z);
                if (pad) {
                    vy.current = pad.launch;
                    grounded.current = false;
                    padCooldown.current = 0.7;
                    emit('jump');
                    hubAudio.playSfx('arcade_jump', { volume: 0.32, rate: 0.9 });
                }
            }
            level.current = 'main';
            const eyeFloor = groundAt(pos.current.x, pos.current.z, 'main') + EYE_HEIGHT;
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (!grounded.current) airT.current += d;
            if (pos.current.y <= eyeFloor) {
                pos.current.y = eyeFloor;
                if (!grounded.current) {
                    // Knees take the landing: a dip the size of the fall
                    landDip.current = Math.min(0.16, Math.max(0, -vy.current) * 0.014 + airT.current * 0.04);
                    if (airT.current > 0.5) hubAudio.jumpLand();
                }
                vy.current = 0;
                grounded.current = true;
                airT.current = 0;
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
                    hubAudio.footPlant(onSoftFloor(pos.current.x, pos.current.z));
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
            bob = Math.sin(bobT.current) * BOB_AMP * (stepping ? Math.min(1, spd / WALK_SPEED) : 0);
        } else {
            houseInput.consumeJump();
            vel.current = { x: 0, z: 0 };
            lastBobSin.current = 0;
            if (seatedNow) {
                pos.current.y = groundAt(pos.current.x, pos.current.z, 'main') + SIT_HEIGHT;
            }
        }

        // Landing dip eases out; sprint opens the lens
        landDip.current *= Math.exp(-9 * d);
        fovKick.current = damp(fovKick.current, sprinting ? SPRINT_FOV_KICK : 0, 6, d);
        placeCamera(pos.current.x, pos.current.y + bob - landDip.current, pos.current.z, d);

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

        // The body reads these every frame — speed over ground, feet on it.
        // bodyY is WORLD height (the dais lifts it), never below the floor.
        const groundY = groundAt(pos.current.x, pos.current.z, 'main');
        const bodyY = Math.max(groundY, pos.current.y - (seatedNow ? SIT_HEIGHT : EYE_HEIGHT));
        setWalkerPose({ x: pos.current.x, y: bodyY, z: pos.current.z, yaw: yawS.current });
        setWalkerState({
            speed: Math.hypot(vel.current.x, vel.current.z),
            grounded: grounded.current,
            sprinting,
            seated: seatedNow,
        });

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            onPose({
                x: pos.current.x,
                // Body height in world (floor, dais or mid-jump) — eye Y
                // minus eye height, bob is camera-only.
                y: bodyY,
                z: pos.current.z,
                yaw: yawS.current,
            });
        }
        saveClock.current += d;
        if (saveClock.current > 2) {
            saveClock.current = 0;
            if (intro.current.phase === 'done') {
                savePose({
                    x: pos.current.x,
                    z: pos.current.z,
                    yaw: yaw.current,
                    pitch: pitch.current,
                });
            }
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
