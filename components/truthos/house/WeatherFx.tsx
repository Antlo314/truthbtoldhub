'use client';

/**
 * Sky effects that follow the world clock — desktop only.
 *
 * NightStars replaces drei's <Stars>, which has no opacity control and so
 * shone at noon. These points read `getSky().starOpacity` every frame and
 * fade with dawn, exactly like the moon and the sky dome do. They are seen
 * through the oculus, the skylights and the Overlook's glass.
 *
 * BloomByDaylight rides the bloom strength down as the sun comes up.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BloomEffect } from 'postprocessing';
import { getSky } from './DayNightCycle';
import { seededRng } from './houseSkins';

/* ── Stars ──────────────────────────────────────────────── */

const STAR_COUNT = 280;

export function NightStars() {
    const matRef = useRef<THREE.PointsMaterial>(null);
    const geometry = useMemo(() => {
        const rnd = seededRng(424242);
        const pos = new Float32Array(STAR_COUNT * 3);
        for (let i = 0; i < STAR_COUNT; i++) {
            // Upper hemisphere shell, kept above the horizon line
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
 * Bloom exists for the night: the Source, the sconces, the cinema screen. At
 * noon the same glow lands on sunlit plaster and reads as a blown-out haze, so
 * its strength rides `daylight` down. Mutates the effect in place — a React
 * update per frame would re-create the composer.
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
