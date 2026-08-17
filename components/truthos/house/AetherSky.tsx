'use client';

/**
 * Painted sky + moon for the Aether Shelf.
 * A night-photo dome used to sit inside HomeGeometry and fade to a flat
 * fog colour at noon. This is a gradient volume that follows the clock:
 * indigo zenith, a warm horizon band, a sun disc on the same vector as
 * the directional light. Fog does not eat it.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSky } from './DayNightCycle';

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = normalize(world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform float uDay;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y * 0.62 + 0.38, 0.0, 1.0);
  float band = pow(1.0 - abs(vDir.y), 2.8);
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.08, 0.82, h));
  col += uGlow * band * (0.28 + 0.5 * uDay);
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function AetherSky({ low = false }: { low?: boolean }) {
    const mat = useRef<THREE.ShaderMaterial>(null);
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
    const uniforms = useMemo(
        () => ({
            uZenith: { value: new THREE.Color('#14102a') },
            uHorizon: { value: new THREE.Color('#3a2a48') },
            uGlow: { value: new THREE.Color('#e8c478') },
            uDay: { value: 0.3 },
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
        if (mat.current) {
            mat.current.uniforms.uZenith.value.copy(scratch.zen);
            mat.current.uniforms.uHorizon.value.copy(scratch.hor);
            mat.current.uniforms.uGlow.value.copy(scratch.glow);
            mat.current.uniforms.uDay.value = sky.daylight;
        }
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
                <sphereGeometry args={[low ? 96 : 155, 32, 20]} />
                <shaderMaterial
                    ref={mat}
                    vertexShader={VERT}
                    fragmentShader={FRAG}
                    uniforms={uniforms}
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
