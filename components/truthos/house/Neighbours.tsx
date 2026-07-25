'use client';

/**
 * Neighbours walking the street.
 *
 * Each one follows a closed pavement route from townMap and plays the `walk`
 * clip baked into the Kenney character GLB. They pause at waypoints
 * occasionally and switch to `idle`, so the street doesn't read as a conveyor
 * belt of people moving at constant speed.
 *
 * Positions are written straight onto the object3D each frame — a React state
 * update per walker per frame would dominate the frame budget.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { NEIGHBOURS, ROUTES, routeLength, samplePath } from './townMap';

/** Kenney blocky characters stand 9 units tall; a person is about 1.75 m */
const PERSON_HEIGHT = 1.75;

function Walker({
    person,
    route,
    speed,
    offset,
    shadows,
}: {
    person: string;
    route: number;
    speed: number;
    offset: number;
    shadows: boolean;
}) {
    const url = `/models/people/character-${person}.glb`;
    const { scene, animations } = useGLTF(url);
    const group = useRef<THREE.Group>(null);

    // Clone per instance so several neighbours can share one loaded file
    const model = useMemo(() => {
        const c = scene.clone(true);
        const box = new THREE.Box3().setFromObject(c);
        const size = box.getSize(new THREE.Vector3());
        const k = size.y > 1e-4 ? PERSON_HEIGHT / size.y : 1;
        c.scale.setScalar(k);
        // Drop feet to the ground regardless of where the author put the origin
        c.position.y = -box.min.y * k;
        c.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = shadows;
                mesh.receiveShadow = false;
            }
        });
        return c;
    }, [scene, shadows]);

    const { actions } = useAnimations(animations, group);

    const path = ROUTES[route] ?? ROUTES[0];
    const length = useMemo(() => routeLength(path), [path]);
    const dist = useRef(offset * length);
    const pauseFor = useRef(0);
    const nextPauseAt = useRef(6 + offset * 11);
    const walking = useRef(true);

    // Start walking; the clip names come from the pack (idle / walk / sprint)
    useEffect(() => {
        const walk = actions['walk'] ?? actions['Walk'];
        const idle = actions['idle'] ?? actions['Idle'];
        walk?.reset().play();
        if (idle) idle.enabled = false;
        return () => {
            walk?.stop();
            idle?.stop();
        };
    }, [actions]);

    useFrame((state, dt) => {
        const g = group.current;
        if (!g) return;
        const step = Math.min(dt, 0.1);
        const t = state.clock.elapsedTime;

        // Occasional pause at a kerb, then move off again
        if (pauseFor.current > 0) {
            pauseFor.current -= step;
            if (pauseFor.current <= 0) {
                walking.current = true;
                nextPauseAt.current = t + 9 + Math.abs(Math.sin(offset * 31)) * 14;
                const walk = actions['walk'] ?? actions['Walk'];
                const idle = actions['idle'] ?? actions['Idle'];
                idle?.fadeOut(0.25);
                walk?.reset().fadeIn(0.25).play();
            }
        } else if (t > nextPauseAt.current) {
            walking.current = false;
            pauseFor.current = 2.5 + Math.abs(Math.cos(offset * 17)) * 3.5;
            const walk = actions['walk'] ?? actions['Walk'];
            const idle = actions['idle'] ?? actions['Idle'];
            walk?.fadeOut(0.25);
            if (idle) {
                idle.enabled = true;
                idle.reset().fadeIn(0.25).play();
            }
        }

        if (walking.current) dist.current += step * speed;

        const p = samplePath(path, dist.current);
        g.position.set(p.x, 0, p.z);
        // Smooth the turn so corners aren't instant snaps
        const target = p.yaw;
        const cur = g.rotation.y;
        let delta = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (delta < -Math.PI) delta += Math.PI * 2;
        g.rotation.y = cur + delta * Math.min(1, step * 6);
    });

    return (
        <group ref={group}>
            <primitive object={model} />
        </group>
    );
}

export default function Neighbours({ low = false }: { low?: boolean }) {
    // Half the crowd on mobile — each walker is a skinned clone plus a mixer
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
                    shadows={!low}
                />
            ))}
        </group>
    );
}
