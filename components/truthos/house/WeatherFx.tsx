'use client';

/**
 * Sky effects that follow the world clock and weather — desktop only.
 *
 * NightStars replaces drei's <Stars>, which has no opacity control and so
 * shone at noon. These points read `getSky().starOpacity` every frame and
 * fade with dawn, exactly like the moon and the sky dome now do.
 *
 * Rain gives the `rain` weather state its first visual body: a wrapped
 * field of falling line streaks that follows the camera, skips the house
 * footprint (rain does not fall through the roof), and fades in and out
 * as the weather rolls rather than switching.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BloomEffect } from 'postprocessing';
import { getSky } from './DayNightCycle';
import { useWorldTime } from './worldTime';
import { seededRng } from './houseSkins';
import { SHELL } from './homeMap';

/* ── Stars ──────────────────────────────────────────────── */

const STAR_COUNT = 280;

export function NightStars() {
    const matRef = useRef<THREE.PointsMaterial>(null);
    const geometry = useMemo(() => {
        const rnd = seededRng(424242);
        const pos = new Float32Array(STAR_COUNT * 3);
        for (let i = 0; i < STAR_COUNT; i++) {
            // Upper hemisphere shell, kept above the canopy line
            const r = 48 + rnd() * 28;
            const az = rnd() * Math.PI * 2;
            const el = 0.14 + rnd() * (Math.PI / 2 - 0.14);
            pos[i * 3] = Math.cos(az) * Math.cos(el) * r;
            pos[i * 3 + 1] = Math.sin(el) * r;
            pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return g;
    }, []);

    useFrame(({ clock }) => {
        const mat = matRef.current;
        if (!mat) return;
        const twinkle = 0.88 + Math.sin(clock.elapsedTime * 0.7) * 0.12;
        mat.opacity = getSky().starOpacity * 0.85 * twinkle;
    });

    return (
        <points geometry={geometry} frustumCulled={false}>
            <pointsMaterial
                ref={matRef}
                color="#cdd6ff"
                size={2.2}
                sizeAttenuation={false}
                transparent
                opacity={0}
                depthWrite={false}
                fog={false}
            />
        </points>
    );
}

/* ── Bloom, tied to the clock ───────────────────────────── */

/**
 * Bloom exists for the night: torches, cove strips, the cinema screen. At noon
 * the same glow lands on sunlit white stucco and reads as a blown-out haze, so
 * its strength rides `daylight` down to a third. Mutates the effect in place —
 * a React update per frame would re-create the composer.
 */
export function BloomByDaylight({
    effect,
    night = 0.62,
    day = 0.2,
}: {
    effect: React.RefObject<BloomEffect | null>;
    night?: number;
    day?: number;
}) {
    useFrame(() => {
        const e = effect.current;
        if (!e) return;
        const d = getSky().daylight;
        e.intensity = night + (day - night) * d;
    });
    return null;
}

/* ── Rain ───────────────────────────────────────────────── */

const DROPS = 1200;
const RAIN_R = 30; // horizontal wrap radius around the camera
const RAIN_H = 16;
const DROP_LEN = 0.38;

export function Rain() {
    const lines = useRef<THREE.LineSegments>(null);
    const matRef = useRef<THREE.LineBasicMaterial>(null);
    const opacity = useRef(0);

    const state = useMemo(() => {
        const rnd = seededRng(151515);
        const pos = new Float32Array(DROPS * 3); // logical drop head position
        const speed = new Float32Array(DROPS);
        for (let i = 0; i < DROPS; i++) {
            pos[i * 3] = (rnd() * 2 - 1) * RAIN_R;
            pos[i * 3 + 1] = rnd() * RAIN_H;
            pos[i * 3 + 2] = (rnd() * 2 - 1) * RAIN_R;
            speed[i] = 9 + rnd() * 5;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 6), 3));
        return { pos, speed, geometry };
    }, []);

    useFrame(({ camera }, dt) => {
        const mesh = lines.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;

        const raining = useWorldTime.getState().weather === 'rain';
        const target = raining ? 0.4 : 0;
        opacity.current += (target - opacity.current) * Math.min(1, dt * 0.9);
        mat.opacity = opacity.current;
        mesh.visible = opacity.current > 0.01;
        if (!mesh.visible) return;

        const d = Math.min(dt, 0.1);
        const { pos, speed, geometry } = state;
        const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
        const out = attr.array as Float32Array;
        const cx = camera.position.x;
        const cz = camera.position.z;

        for (let i = 0; i < DROPS; i++) {
            let x = pos[i * 3];
            let y = pos[i * 3 + 1] - speed[i] * d;
            let z = pos[i * 3 + 2];
            if (y < 0) y += RAIN_H;
            // Wrap the field so it always surrounds the walker
            if (x - cx > RAIN_R) x -= RAIN_R * 2;
            else if (x - cx < -RAIN_R) x += RAIN_R * 2;
            if (z - cz > RAIN_R) z -= RAIN_R * 2;
            else if (z - cz < -RAIN_R) z += RAIN_R * 2;
            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            // No rain through the roof — drops over the house render nowhere
            const indoors =
                x > SHELL.minX - 0.5 && x < SHELL.maxX + 0.5 &&
                z > SHELL.minZ - 0.5 && z < SHELL.maxZ + 0.5;
            const dy = indoors ? -100 : y;
            out[i * 6] = x;
            out[i * 6 + 1] = dy + DROP_LEN;
            out[i * 6 + 2] = z;
            out[i * 6 + 3] = x;
            out[i * 6 + 4] = dy;
            out[i * 6 + 5] = z;
        }
        attr.needsUpdate = true;
    });

    return (
        <lineSegments ref={lines} geometry={state.geometry} frustumCulled={false} visible={false}>
            <lineBasicMaterial
                ref={matRef}
                color="#a9c0e8"
                transparent
                opacity={0}
                depthWrite={false}
            />
        </lineSegments>
    );
}
