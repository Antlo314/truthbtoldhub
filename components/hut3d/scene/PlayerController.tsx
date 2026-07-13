'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarHandle } from '../AvatarMesh';
import { VesselModel } from '../VesselModel';
import { useHutUi } from '../hutUiStore';
import type { AvatarConfig } from '@/lib/game/avatar';

const SPEED = 4.0;
const JUMP_V = 6.2;
const GRAVITY = -22;
const BOUNDS = { minX: -8.2, maxX: 8.2, minZ: -6.6, maxZ: 6.4 };

const CAM_DIST = 5.6;
const CAM_HEIGHT = 1.55;
const LOOK_SENS = 0.0032;
const PITCH_MIN = -0.35;
const PITCH_MAX = 0.95;

const keys = new Set<string>();
let jumpQueued = false;

export function queueHutJump() {
    jumpQueued = true;
}

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

/**
 * Third-person free-look orbit cam + walk/jump.
 * Look: hold right mouse / middle mouse, or drag on the right half of the screen.
 * Move is camera-relative (WASD).
 */
export default function PlayerController({
    avatar,
    onPosition,
}: {
    avatar: AvatarConfig;
    onPosition?: (p: THREE.Vector3) => void;
}) {
    const group = useRef<THREE.Group>(null);
    const avatarRef = useRef<AvatarHandle>(null);
    const vel = useRef(new THREE.Vector3());
    const vy = useRef(0);
    const grounded = useRef(true);
    const facing = useRef(0);
    const jumpHeld = useRef(false);
    /** Orbit yaw (around Y), pitch (tilt) */
    const yaw = useRef(0); // 0 = camera south of player looking north
    const pitch = useRef(0.32);
    const { camera, gl } = useThree();
    const inputLocked = useHutUi((s) => s.inputLocked);

    useEffect(() => bindKeys(), []);

    // Free-look pointer binding
    useEffect(() => {
        const el = gl.domElement;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        let touchId: number | null = null;

        const canLook = () => !useHutUi.getState().inputLocked;

        const onPointerDown = (e: PointerEvent) => {
            if (!canLook()) return;
            // Right button, middle button, or left drag on right half of canvas
            const rect = el.getBoundingClientRect();
            const onRight = e.clientX > rect.left + rect.width * 0.45;
            if (e.button === 2 || e.button === 1 || (e.button === 0 && onRight)) {
                dragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                el.setPointerCapture(e.pointerId);
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging || !canLook()) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            yaw.current -= dx * LOOK_SENS;
            pitch.current = THREE.MathUtils.clamp(
                pitch.current + dy * LOOK_SENS,
                PITCH_MIN,
                PITCH_MAX,
            );
        };
        const onPointerUp = (e: PointerEvent) => {
            dragging = false;
            try { el.releasePointerCapture(e.pointerId); } catch { /* */ }
        };
        const onContext = (e: Event) => e.preventDefault();

        // Touch: finger on right half = look
        const onTouchStart = (e: TouchEvent) => {
            if (!canLook() || e.touches.length === 0) return;
            const t = e.touches[0];
            const rect = el.getBoundingClientRect();
            if (t.clientX > rect.left + rect.width * 0.45) {
                touchId = t.identifier;
                lastX = t.clientX;
                lastY = t.clientY;
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (touchId == null || !canLook()) return;
            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                if (t.identifier !== touchId) continue;
                const dx = t.clientX - lastX;
                const dy = t.clientY - lastY;
                lastX = t.clientX;
                lastY = t.clientY;
                yaw.current -= dx * LOOK_SENS * 1.15;
                pitch.current = THREE.MathUtils.clamp(
                    pitch.current + dy * LOOK_SENS * 1.15,
                    PITCH_MIN,
                    PITCH_MAX,
                );
                e.preventDefault();
                break;
            }
        };
        const onTouchEnd = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) touchId = null;
            }
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('contextmenu', onContext);
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('contextmenu', onContext);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [gl]);

    useFrame((_, dt) => {
        const g = group.current;
        if (!g) return;
        const clampedDt = Math.min(dt, 0.05);

        // Camera planar forward from orbit yaw (yaw=0 → look +Z / toward Truth)
        const camFwd = new THREE.Vector3(-Math.sin(yaw.current), 0, Math.cos(yaw.current));
        const camRight = new THREE.Vector3(Math.cos(yaw.current), 0, Math.sin(yaw.current));

        let fwd = 0;
        let strafe = 0;
        if (!inputLocked) {
            if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
            if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
            if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
            if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
        }

        // Optional keyboard look (Q/E yaw, R/F pitch)
        if (!inputLocked) {
            if (keys.has('KeyQ')) yaw.current += 1.6 * clampedDt;
            if (keys.has('KeyE')) yaw.current -= 1.6 * clampedDt;
            if (keys.has('KeyR')) pitch.current = Math.min(PITCH_MAX, pitch.current + 1.2 * clampedDt);
            if (keys.has('KeyF')) pitch.current = Math.max(PITCH_MIN, pitch.current - 1.2 * clampedDt);
        }

        const wish = new THREE.Vector3()
            .addScaledVector(camFwd, fwd)
            .addScaledVector(camRight, strafe);

        if (wish.lengthSq() > 1e-6) {
            wish.normalize();
            const targetVel = wish.multiplyScalar(SPEED);
            const accel = grounded.current ? 14 : 6;
            vel.current.lerp(targetVel, 1 - Math.exp(-accel * clampedDt));

            // Face travel direction; model face is +Z (eyes)
            const targetFace = Math.atan2(vel.current.x, vel.current.z);
            let delta = targetFace - facing.current;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            facing.current += delta * (1 - Math.exp(-14 * clampedDt));
            g.rotation.y = facing.current;
        } else {
            const damp = grounded.current ? 16 : 4;
            vel.current.lerp(new THREE.Vector3(), 1 - Math.exp(-damp * clampedDt));
        }

        const wantJump = !inputLocked && (jumpQueued || keys.has('Space'));
        if (wantJump && grounded.current && !jumpHeld.current) {
            vy.current = JUMP_V;
            grounded.current = false;
            jumpHeld.current = true;
            jumpQueued = false;
        }
        if (!keys.has('Space') && !jumpQueued) jumpHeld.current = false;

        vy.current += GRAVITY * clampedDt;
        g.position.y += vy.current * clampedDt;
        if (g.position.y <= 0) {
            g.position.y = 0;
            vy.current = 0;
            grounded.current = true;
        }

        g.position.x = THREE.MathUtils.clamp(g.position.x + vel.current.x * clampedDt, BOUNDS.minX, BOUNDS.maxX);
        g.position.z = THREE.MathUtils.clamp(g.position.z + vel.current.z * clampedDt, BOUNDS.minZ, BOUNDS.maxZ);

        const planar = Math.hypot(vel.current.x, vel.current.z);
        const gait = grounded.current ? THREE.MathUtils.clamp(planar / SPEED, 0, 1) : 0;
        let jumpAmt = 0;
        if (!grounded.current) {
            const upness = THREE.MathUtils.clamp(vy.current / JUMP_V, -1, 1);
            jumpAmt = THREE.MathUtils.clamp(0.55 + upness * 0.45, 0.35, 1);
        }
        avatarRef.current?.setGait(gait);
        avatarRef.current?.setJump(jumpAmt);

        // —— Free orbit camera (spring arm) ——
        const pivot = new THREE.Vector3(
            g.position.x,
            g.position.y + CAM_HEIGHT,
            g.position.z,
        );
        const cp = Math.cos(pitch.current);
        const sp = Math.sin(pitch.current);
        const cy = Math.cos(yaw.current);
        const sy = Math.sin(yaw.current);
        // Behind player: yaw=0 places cam on −Z (south), looking north
        const offset = new THREE.Vector3(
            sy * cp * CAM_DIST,
            sp * CAM_DIST * 0.85 + 0.35,
            -cy * cp * CAM_DIST,
        );
        const ideal = pivot.clone().add(offset);
        camera.position.lerp(ideal, 1 - Math.exp(-8 * clampedDt));
        camera.lookAt(pivot.x, pivot.y + 0.15, pivot.z);

        onPosition?.(g.position.clone());
    });

    return (
        <group ref={group} position={[0, 0, -2.5]}>
            {/* Blender vessel blockouts — see public/models/vessels/ */}
            <VesselModel ref={avatarRef} avatar={avatar} />
        </group>
    );
}
