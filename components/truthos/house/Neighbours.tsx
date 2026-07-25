'use client';

/**
 * Neighbours walking the street.
 *
 * Each follows a closed pavement route from townMap and plays clips baked into
 * the Kenney character GLBs (27 per file; skinless node animation, so it's
 * cheap). Three things do most of the work in making them read as people
 * rather than props:
 *
 *  · The walk clip is time-scaled to actual ground speed. The clip is authored
 *    for roughly 1.35 m/s; playing it at a fixed rate while walkers move at
 *    different speeds is what produces the foot-sliding that makes crowds look
 *    cheap.
 *  · They stop and do something — look around, nod, wave — rather than only
 *    switching to idle, and each picks its own beat.
 *  · Height and gait vary per neighbour, so a shared model isn't obviously the
 *    same person twice.
 *
 * Transforms are written straight onto the object3D each frame; a React state
 * update per walker per frame would dominate the budget.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { NEIGHBOURS, ROUTES, routeLength, samplePath } from './townMap';

/** Ground speed the walk clip is authored for, at timeScale 1 */
const WALK_CYCLE_SPEED = 1.35;

/** Things a neighbour might do when they stop */
const PAUSE_CLIPS = ['idle', 'emote-yes', 'emote-no', 'interact-right'] as const;

/** Deterministic 0–1 from a seed, so a neighbour behaves the same each visit */
function hash01(n: number): number {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
}

function Walker({
    person,
    route,
    speed,
    offset,
    seed,
    shadows,
}: {
    person: string;
    route: number;
    speed: number;
    offset: number;
    seed: number;
    shadows: boolean;
}) {
    const { scene, animations } = useGLTF(`/models/people/character-${person}.glb`);
    const group = useRef<THREE.Group>(null);

    // Height varies a little per neighbour so a reused model isn't obvious
    const height = 1.62 + hash01(seed) * 0.24;

    const model = useMemo(() => {
        const c = scene.clone(true);
        const box = new THREE.Box3().setFromObject(c);
        const size = box.getSize(new THREE.Vector3());
        const k = size.y > 1e-4 ? height / size.y : 1;
        c.scale.setScalar(k);
        c.position.y = -box.min.y * k;
        c.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = shadows;
                mesh.receiveShadow = false;
            }
        });
        return c;
    }, [scene, shadows, height]);

    const { actions } = useAnimations(animations, group);

    const path = ROUTES[route] ?? ROUTES[0];
    const length = useMemo(() => routeLength(path), [path]);

    const dist = useRef(offset * length);
    const walking = useRef(true);
    const pauseUntil = useRef(0);
    const nextPauseAt = useRef(5 + hash01(seed + 3) * 16);
    const activePause = useRef<string>('idle');

    const pick = (name: string) => actions[name] ?? actions[name[0].toUpperCase() + name.slice(1)];

    useEffect(() => {
        const walk = pick('walk');
        walk?.reset().play();
        return () => {
            Object.values(actions).forEach((a) => a?.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions]);

    useFrame((state, dt) => {
        const g = group.current;
        if (!g) return;
        const step = Math.min(dt, 0.1);
        const now = state.clock.elapsedTime;

        const walk = pick('walk');

        if (walking.current && now > nextPauseAt.current) {
            // Stop and do something
            walking.current = false;
            const choice = PAUSE_CLIPS[Math.floor(hash01(seed + now) * PAUSE_CLIPS.length) % PAUSE_CLIPS.length];
            activePause.current = choice;
            pauseUntil.current = now + 2.2 + hash01(seed + 7) * 4;
            walk?.fadeOut(0.28);
            const p = pick(choice);
            if (p) {
                p.enabled = true;
                p.reset().fadeIn(0.28).play();
            }
        } else if (!walking.current && now > pauseUntil.current) {
            walking.current = true;
            nextPauseAt.current = now + 8 + hash01(seed + now) * 18;
            pick(activePause.current)?.fadeOut(0.28);
            walk?.reset().fadeIn(0.28).play();
        }

        if (walking.current) {
            dist.current += step * speed;
            // Match the cycle to ground speed so the feet don't skate
            if (walk) walk.timeScale = speed / WALK_CYCLE_SPEED;
        }

        const p = samplePath(path, dist.current);
        g.position.set(p.x, 0, p.z);

        // Ease into turns rather than snapping at corners
        const cur = g.rotation.y;
        let delta = ((p.yaw - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (delta < -Math.PI) delta += Math.PI * 2;
        g.rotation.y = cur + delta * Math.min(1, step * 5.5);
    });

    return (
        <group ref={group}>
            <primitive object={model} />
        </group>
    );
}

export default function Neighbours({ low = false }: { low?: boolean }) {
    // Each walker is a cloned scene plus its own mixer, so halve it on mobile
    const roster = low ? NEIGHBOURS.filter((_, i) => i % 2 === 0) : NEIGHBOURS;
    return (
        <group>
            {roster.map((n, i) => (
                <Walker
                    key={`${n.person}-${i}`}
                    person={n.person}
                    route={n.route}
                    speed={n.speed}
                    offset={n.offset}
                    seed={i * 17 + 3}
                    shadows={!low}
                />
            ))}
        </group>
    );
}
