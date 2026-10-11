'use client';

/**
 * Painted sky + sun + moon for the Aether Shelf.
 * A gradient volume that follows the clock: indigo zenith, a warm horizon
 * band, a halo and disc on the same vector as the directional light, a
 * veil of high cloud. Fog does not eat it. The shader and its uniforms are
 * shared with SkyEnvironment, which captures the same sky for lighting.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSky } from './DayNightCycle';
import { SKY_FRAG, SKY_VERT, skyUniforms } from './aetherSkyShader';

export default function AetherSky({ low = false }: { low?: boolean }) {
    const sun = useRef<THREE.Mesh>(null);
    const moon = useRef<THREE.Mesh>(null);
    const scratch = useMemo(
        () => ({
            zen: new THREE.Color(),
            hor: new THREE.Color(),
            glow: new THREE.Color(),
            dir: new THREE.Vector3(),
        }),
        [],
    );

    useFrame(() => {
        const sky = getSky();
        scratch.zen.setRGB(sky.skyTint[0] / 255, sky.skyTint[1] / 255, sky.skyTint[2] / 255).multiplyScalar(0.55);
        scratch.hor
            .setRGB(sky.fogColor[0] / 255, sky.fogColor[1] / 255, sky.fogColor[2] / 255)
            .lerp(scratch.glow.setRGB(sky.hemiSky[0] / 255, sky.hemiSky[1] / 255, sky.hemiSky[2] / 255), 0.45);
        scratch.glow.setRGB(sky.sunColor[0] / 255, sky.sunColor[1] / 255, sky.sunColor[2] / 255);
        skyUniforms.uZenith.value.copy(scratch.zen);
        skyUniforms.uHorizon.value.copy(scratch.hor);
        skyUniforms.uGlow.value.copy(scratch.glow);
        skyUniforms.uDay.value = sky.daylight;
        skyUniforms.uSunDir.value.set(sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]).normalize();

        scratch.dir.set(sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]).normalize().multiplyScalar(78);
        if (sun.current) {
            sun.current.position.copy(scratch.dir);
            sun.current.lookAt(0, 1.4, 0);
            const s = sun.current.material as THREE.MeshBasicMaterial;
            s.opacity = Math.max(0, Math.min(1, sky.daylight * 1.15));
            sun.current.visible = s.opacity > 0.04;
        }
        if (moon.current) {
            moon.current.position.set(-36, 48, -40);
            moon.current.lookAt(0, 1.6, 0);
            const s = moon.current.material as THREE.MeshBasicMaterial;
            s.opacity = sky.moonOpacity;
            moon.current.visible = sky.moonOpacity > 0.03;
        }
    });

    return (
        <group>
            <mesh frustumCulled={false} scale={[-1, 1, 1]}>
                <sphereGeometry args={[low ? 96 : 155, 36, 22]} />
                <shaderMaterial
                    vertexShader={SKY_VERT}
                    fragmentShader={SKY_FRAG}
                    uniforms={skyUniforms}
                    side={THREE.BackSide}
                    depthWrite={false}
                    fog={false}
                    toneMapped
                />
            </mesh>
            <mesh ref={sun} frustumCulled={false}>
                <circleGeometry args={[low ? 2.4 : 3.4, 20]} />
                <meshBasicMaterial
                    color="#ffe6b0"
                    transparent
                    opacity={0}
                    depthWrite={false}
                    fog={false}
                    toneMapped={false}
                />
            </mesh>
            <mesh ref={moon} frustumCulled={false}>
                <circleGeometry args={[low ? 2.6 : 3.6, 20]} />
                <meshBasicMaterial
                    color="#e8dff6"
                    transparent
                    opacity={0}
                    depthWrite={false}
                    fog={false}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
}
