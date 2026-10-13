'use client';

/**
 * Walking the plain. The house walker's feel — the same keys, stick,
 * sprint, jump, look smoothing and third-person boom — on analytic ground:
 * height from groundAt(), fences from moveOnPlain(). Third person by
 * default out here; the body is the point. Wading slows you; the rim
 * stops you.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { houseInput } from '@/components/truthos/house/houseInput';
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
} from '@/components/truthos/house/houseFeel';
import { setWalkerPose, setWalkerState } from '@/components/truthos/house/walkerPose';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { WATER_Y } from '@/lib/world/terrain';
import { groundAt, moveOnPlain, walkableAt } from '@/lib/world/plain';
import { loadPlainPose, PLAIN_SPAWN, savePlainPose } from '@/lib/world/plainPose';
import { ACTIONS, actionAge, player, setAction } from '@/lib/world/combat';

export type PlainHotspot = {
    id: string;
    kind: 'npc' | 'gate' | 'place' | 'peer';
    label: string;
    hint: string;
    x: number;
    z: number;
};

const BOOM_LEN = 4.4;
const BOOM_MIN = 1.0;
const BOOM_SIDE = 0.5;
const SPRINT_FOV_KICK = 9;
const THIRD_FOV_ADD = 4;
/** The plain is bigger than a hall; you cover it faster */
const PLAIN_SPEED = WALK_SPEED * 1.08;

export default function PlainController({
    locked,
    mobile,
    findHotspot,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
    onTick,
}: {
    locked: boolean;
    mobile: boolean;
    findHotspot: (x: number, z: number) => PlainHotspot | null;
    onHotspot: (h: PlainHotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
    /** every frame, with the walker's spot and ground speed — the experience's cheap loop */
    onTick?: (x: number, z: number, speed: number, dt: number) => void;
}) {
    const { camera, gl } = useThree();
    const lookInvert = useHouseUi((s) => s.lookInvert);
    const lookSensMul = useHouseUi((s) => s.lookSens);
    const recenterToken = useHouseUi((s) => s.recenterToken);
    const lookInvertRef = useRef(lookInvert);
    lookInvertRef.current = lookInvert;
    const lookSensRef = useRef(lookSensMul);
    lookSensRef.current = lookSensMul;
    const lockedRef = useRef(locked);
    lockedRef.current = locked;
    const findRef = useRef(findHotspot);
    findRef.current = findHotspot;
    const tickRef = useRef(onTick);
    tickRef.current = onTick;

    const keys = useRef(new Set<string>());
    const yaw = useRef(PLAIN_SPAWN.yaw);
    const pitch = useRef(0);
    const yawS = useRef(PLAIN_SPAWN.yaw);
    const pitchS = useRef(0);
    const pos = useRef(new THREE.Vector3(PLAIN_SPAWN.x, EYE_HEIGHT, PLAIN_SPAWN.z));
    const vel = useRef({ x: 0, z: 0 });
    const vy = useRef(0);
    const grounded = useRef(true);
    const airT = useRef(0);
    const landDip = useRef(0);
    const poseT = useRef(0);
    const saveClock = useRef(0);
    const bobT = useRef(0);
    const lastBobSin = useRef(0);
    const interactLatch = useRef(false);
    const activityT = useRef(0);
    const lastKind = useRef<'move' | 'look' | 'jump' | 'idle'>('idle');
    const activityCb = useRef(onMoveActivity);
    activityCb.current = onMoveActivity;
    const lastKeyAt = useRef(0);
    const boom = useRef(BOOM_LEN);
    const fovKick = useRef(0);
    const baseFov = useRef((camera as THREE.PerspectiveCamera).fov);
    const tmpDir = useRef(new THREE.Vector3());
    const tmpRight = useRef(new THREE.Vector3());
    const lastHotspotId = useRef<string | null | undefined>(undefined);
    const hotspotT = useRef(0);

    useEffect(() => {
        const saved = loadPlainPose() ?? PLAIN_SPAWN;
        const y = groundAt(saved.x, saved.z) + EYE_HEIGHT;
        pos.current.set(saved.x, y, saved.z);
        yaw.current = saved.yaw;
        pitch.current = THREE.MathUtils.clamp(saved.pitch ?? 0, -PITCH_MAX, PITCH_MAX);
        yawS.current = yaw.current;
        pitchS.current = pitch.current;
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        baseFov.current = (camera as THREE.PerspectiveCamera).fov;
        camera.position.copy(pos.current);
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(pitch.current, yaw.current, 0);
        houseInput.clearAll();
        keys.current.clear();
        setWalkerPose({ x: saved.x, y: y - EYE_HEIGHT, z: saved.z, yaw: saved.yaw });
        return () => {
            savePlainPose({ x: pos.current.x, z: pos.current.z, yaw: yaw.current, pitch: pitch.current });
        };
    }, [camera]);

    // Recenter: back to the gate
    const lastRecenter = useRef(recenterToken);
    useEffect(() => {
        if (recenterToken === lastRecenter.current) return;
        lastRecenter.current = recenterToken;
        pos.current.set(PLAIN_SPAWN.x, groundAt(PLAIN_SPAWN.x, PLAIN_SPAWN.z) + EYE_HEIGHT, PLAIN_SPAWN.z);
        yaw.current = PLAIN_SPAWN.yaw;
        pitch.current = 0;
        yawS.current = PLAIN_SPAWN.yaw;
        pitchS.current = 0;
        vel.current = { x: 0, z: 0 };
        vy.current = 0;
        grounded.current = true;
        camera.position.copy(pos.current);
        camera.rotation.set(0, PLAIN_SPAWN.yaw, 0);
        savePlainPose({ ...PLAIN_SPAWN });
    }, [recenterToken, camera]);

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
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
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
            if (document.pointerLockElement === el) {
                const dx = e.movementX || 0;
                const dy = e.movementY || 0;
                if (dx === 0 && dy === 0) return;
                yaw.current -= dx * sens;
                pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens * sign, -PITCH_MAX, PITCH_MAX);
                emit('look');
                return;
            }
            if (!dragging) return;
            const dx = e.clientX - lx;
            const dy = e.clientY - ly;
            lx = e.clientX;
            ly = e.clientY;
            yaw.current -= dx * sens;
            pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sens * sign, -PITCH_MAX, PITCH_MAX);
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

    function placeCamera(eyeX: number, eyeY: number, eyeZ: number, d: number) {
        const third = useHouseUi.getState().view === 'third';
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
        const dir = tmpDir.current.set(-Math.sin(yawS.current) * Math.cos(pitchS.current), Math.sin(pitchS.current), -Math.cos(yawS.current) * Math.cos(pitchS.current));
        const right = tmpRight.current.set(Math.cos(yawS.current), 0, -Math.sin(yawS.current));
        const tx = eyeX + right.x * BOOM_SIDE;
        const ty = eyeY + 0.2;
        const tz = eyeZ + right.z * BOOM_SIDE;
        // shorten the boom until the lens is clear of trees, rocks and the hill
        let len = BOOM_LEN;
        while (len > BOOM_MIN) {
            const cx = tx - dir.x * len;
            const cz = tz - dir.z * len;
            const cy = ty - dir.y * len;
            if (walkableAt(cx, cz, 0.25) && cy > groundAt(cx, cz) + 0.45) break;
            len -= 0.2;
        }
        boom.current = len < boom.current ? len : damp(boom.current, len, 5, d);
        const cx = tx - dir.x * boom.current;
        const cz = tz - dir.z * boom.current;
        const floor = groundAt(cx, cz) + 0.35;
        camera.position.set(cx, Math.max(floor, ty - dir.y * boom.current), cz);
    }

    useFrame((_, dtRaw) => {
        const d = Math.min(Math.max(dtRaw, 0), 0.05) || 0.016;
        const lockedNow = lockedRef.current;
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';
        const lookSens = (mobile ? LOOK_SENS_MOBILE : LOOK_SENS_DESKTOP) * lookSensRef.current;
        const lookSign = lookInvertRef.current ? -1 : 1;
        const k = keys.current;
        if (k.size > 0 && performance.now() - lastKeyAt.current > 3000) k.clear();
        if (!houseInput.movingTouch && (Math.abs(houseInput.axisX) > 0.01 || Math.abs(houseInput.axisFwd) > 0.01) && performance.now() - houseInput.lastInputAt > 400) {
            houseInput.clearMove();
        }
        if (!lockedNow) {
            const pix = houseInput.consumeLookPixels();
            if (pix.dx || pix.dy) {
                yaw.current -= pix.dx * lookSens;
                pitch.current = THREE.MathUtils.clamp(pitch.current - pix.dy * lookSens * lookSign, -PITCH_MAX, PITCH_MAX);
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
        camera.rotation.set(pitchS.current, yawS.current, 0);

        let sprinting = false;
        let hasInput = false;
        let bob = 0;
        const groundHere = groundAt(pos.current.x, pos.current.z);
        const wading = groundHere < WATER_Y - 0.25;

        if (!lockedNow) {
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
                wishX += fx * jf + rx * jx * STRAFE_MULT;
                wishZ += fz * jf + rz * jx * STRAFE_MULT;
                hasInput = true;
            }
            // the fight decides how much the legs may do
            const act = player.action;
            if (player.dead) hasInput = false;
            // moving breaks a prayer
            if (act === 'pray' && hasInput) setAction(null);
            if (!hasInput) {
                wishX = 0;
                wishZ = 0;
            }
            // remember where you were heading — a roll goes that way (or back, standing still)
            if (act !== 'roll') {
                const l = Math.hypot(wishX, wishZ);
                player.rollX = l > 1e-4 ? wishX / l : -fx;
                player.rollZ = l > 1e-4 ? wishZ / l : -fz;
            }
            let speed = PLAIN_SPEED * (player.stats?.speedMul ?? 1);
            sprinting = hasInput && !act && player.stamina > 4 && (k.has('ShiftLeft') || k.has('ShiftRight') || houseInput.sprint);
            if (sprinting) speed *= SPRINT_MULT;
            if (wading) speed *= 0.55;
            if (act) speed *= ACTIONS[act].move;
            const wLen = Math.hypot(wishX, wishZ);
            let tx = 0;
            let tz = 0;
            if (wLen > 1e-4) {
                const inv = 1 / wLen;
                const stickMag = Math.min(1, Math.hypot(jx, jf) || 1);
                const keyMove = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((c) => k.has(c));
                const m = keyMove ? 1 : stickMag;
                tx = wishX * inv * speed * m;
                tz = wishZ * inv * speed * m;
                emit('move');
            }
            let rolling = false;
            if (act === 'roll' && actionAge() < 0.5) {
                rolling = true;
                tx = player.rollX * 8.6;
                tz = player.rollZ * 8.6;
            }
            const lambda = rolling ? 40 : wLen > 1e-4 ? MOVE_ACCEL : MOVE_FRICTION;
            vel.current.x = damp(vel.current.x, tx, lambda, d);
            vel.current.z = damp(vel.current.z, tz, lambda, d);
            if (!hasInput && !rolling && Math.hypot(vel.current.x, vel.current.z) < 0.08) {
                vel.current.x = 0;
                vel.current.z = 0;
            }
            if (vel.current.x !== 0 || vel.current.z !== 0) {
                const next = moveOnPlain(pos.current.x, pos.current.z, pos.current.x + vel.current.x * d, pos.current.z + vel.current.z * d);
                if (Math.abs(next.x - pos.current.x) < 1e-5) vel.current.x *= 0.1;
                if (Math.abs(next.z - pos.current.z) < 1e-5) vel.current.z *= 0.1;
                pos.current.x = next.x;
                pos.current.z = next.z;
            }
            if (houseInput.consumeJump() && grounded.current && !wading && !act) {
                vy.current = JUMP_V;
                grounded.current = false;
                emit('jump');
            }
            const eyeFloor = groundAt(pos.current.x, pos.current.z) + EYE_HEIGHT;
            vy.current -= GRAVITY * d;
            pos.current.y += vy.current * d;
            if (!grounded.current) airT.current += d;
            if (pos.current.y <= eyeFloor) {
                // walking uphill: the ground rises under you without a "landing"
                if (!grounded.current) {
                    landDip.current = Math.min(0.16, Math.max(0, -vy.current) * 0.014 + airT.current * 0.04);
                    if (airT.current > 0.5) hubAudio.jumpLand();
                }
                pos.current.y = eyeFloor;
                vy.current = 0;
                grounded.current = true;
                airT.current = 0;
            } else if (grounded.current && pos.current.y - eyeFloor > 0.6) {
                // walked off an edge
                grounded.current = false;
            } else if (grounded.current) {
                pos.current.y = eyeFloor;
                vy.current = 0;
            }
            const spd = Math.hypot(vel.current.x, vel.current.z);
            const stepping = hasInput && grounded.current && spd > 0.55;
            if (stepping) {
                bobT.current += d * BOB_FREQ * Math.min(1.35, spd / WALK_SPEED);
                const s = Math.sin(bobT.current);
                const prev = lastBobSin.current;
                if ((prev <= 0 && s > 0) || (prev >= 0 && s < 0)) hubAudio.footPlant(true);
                lastBobSin.current = s;
            } else {
                bobT.current *= 1 - Math.min(1, d * 10);
                lastBobSin.current = 0;
                if (!hasInput && lastKind.current === 'move') emit('idle');
            }
            bob = Math.sin(bobT.current) * BOB_AMP * (stepping ? Math.min(1, spd / WALK_SPEED) : 0);
        } else {
            houseInput.consumeJump();
            vel.current = { x: 0, z: 0 };
            lastBobSin.current = 0;
            pos.current.y = groundAt(pos.current.x, pos.current.z) + EYE_HEIGHT;
        }

        landDip.current *= Math.exp(-9 * d);
        fovKick.current = damp(fovKick.current, sprinting ? SPRINT_FOV_KICK : 0, 6, d);
        placeCamera(pos.current.x, pos.current.y + bob - landDip.current, pos.current.z, d);

        // Hotspots a few times a second — it is a scan of every soul and gate
        hotspotT.current += d;
        if (hotspotT.current > 0.12) {
            hotspotT.current = 0;
            const hs = findRef.current(pos.current.x, pos.current.z);
            const id = hs?.id ?? null;
            if (id !== lastHotspotId.current) {
                lastHotspotId.current = id;
                onHotspot(hs);
            }
        }
        if (!lockedNow && houseInput.consumeInteract()) {
            if (onInteractRequest && !interactLatch.current) {
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
        const groundY = groundAt(pos.current.x, pos.current.z);
        const bodyY = Math.max(groundY, pos.current.y - EYE_HEIGHT);
        const speedNow = Math.hypot(vel.current.x, vel.current.z);
        setWalkerPose({ x: pos.current.x, y: bodyY, z: pos.current.z, yaw: yawS.current });
        setWalkerState({ speed: speedNow, grounded: grounded.current, sprinting, seated: false });
        tickRef.current?.(pos.current.x, pos.current.z, speedNow, d);

        poseT.current += d;
        if (poseT.current > 0.12) {
            poseT.current = 0;
            onPose({ x: pos.current.x, y: bodyY, z: pos.current.z, yaw: yawS.current });
        }
        saveClock.current += d;
        if (saveClock.current > 2) {
            saveClock.current = 0;
            savePlainPose({ x: pos.current.x, z: pos.current.z, yaw: yaw.current, pitch: pitch.current });
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
