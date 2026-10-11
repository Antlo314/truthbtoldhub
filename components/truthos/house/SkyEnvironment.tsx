'use client';

/**
 * Image-based lighting captured from the Aether sky itself.
 *
 * Every PBR material in the house declares an envMapIntensity, and until
 * now there was no environment to intensify: metals were flat, the gold
 * rails had nothing to reflect, glass had no sheen. A static HDRI would
 * fix that for exactly one time of day. This renders the live sky shader
 * into a small cube every couple of seconds, prefilters it (PMREM) and
 * hands it to the scene as `environment`, so dawn warms the brass and
 * midnight cools it without anyone keying a second light rig.
 *
 * Cost: a 64px cube render + PMREM every `every` seconds — a fraction of
 * one frame, amortised over a hundred.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { makeSkyMaterial } from './aetherSkyShader';

export default function SkyEnvironment({
    resolution = 64,
    every = 2,
    intensity = 0.6,
}: {
    resolution?: number;
    every?: number;
    intensity?: number;
}) {
    const { gl, scene } = useThree();

    // A private scene with just the sky and a dark floor under it, so the
    // lower hemisphere reads as ground bounce rather than more sky.
    const envScene = useMemo(() => {
        const s = new THREE.Scene();
        const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), makeSkyMaterial());
        dome.frustumCulled = false;
        s.add(dome);
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(80, 24),
            new THREE.MeshBasicMaterial({ color: '#17121f', side: THREE.DoubleSide }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.5;
        s.add(floor);
        return s;
    }, []);

    const target = useMemo(
        () =>
            new THREE.WebGLCubeRenderTarget(resolution, {
                type: THREE.HalfFloatType,
                generateMipmaps: false,
            }),
        [resolution],
    );
    const cube = useMemo(() => new THREE.CubeCamera(0.1, 200, target), [target]);
    const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
    const current = useRef<THREE.WebGLRenderTarget | null>(null);
    const lastAt = useRef(-Infinity);

    useEffect(() => {
        scene.environmentIntensity = intensity;
        return () => {
            if (scene.environment === current.current?.texture) scene.environment = null;
            current.current?.dispose();
            current.current = null;
            target.dispose();
            pmrem.dispose();
        };
    }, [scene, intensity, target, pmrem]);

    useFrame(({ clock }) => {
        if (clock.elapsedTime - lastAt.current < every) return;
        lastAt.current = clock.elapsedTime;
        const prevTarget = gl.getRenderTarget();
        cube.update(gl, envScene);
        gl.setRenderTarget(prevTarget);
        const next = pmrem.fromCubemap(target.texture);
        const old = current.current;
        scene.environment = next.texture;
        current.current = next;
        old?.dispose();
    });

    return null;
}
