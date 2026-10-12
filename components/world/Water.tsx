'use client';

/**
 * The Still Water — one disc of water over the lake basin. Procedural
 * ripples, a fresnel that goes from the lake bed's green to the sky, and
 * a glint on the sun's vector. Nothing is sampled from the scene, so it
 * costs one draw.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAKE, WATER_Y } from '@/lib/world/terrain';
import { getSky } from '@/components/truthos/house/DayNightCycle';

const VERT = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSky;
uniform vec3 uDeep;
uniform float uDay;
varying vec3 vWorld;
#include <fog_pars_fragment>

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float ripple(vec2 p) {
  return noise(p * 0.9 + vec2(uTime * 0.05, uTime * 0.03)) * 0.6
       + noise(p * 2.3 - vec2(uTime * 0.07, uTime * 0.045)) * 0.3
       + noise(p * 6.0 + vec2(uTime * 0.12, -uTime * 0.09)) * 0.1;
}

void main() {
  vec2 p = vWorld.xz;
  float e = 0.35;
  float h = ripple(p);
  float hx = ripple(p + vec2(e, 0.0));
  float hz = ripple(p + vec2(0.0, e));
  vec3 n = normalize(vec3((h - hx) * 0.9, 1.0, (h - hz) * 0.9));
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = mix(uDeep, uSky, 0.35 + fres * 0.6);
  vec3 hv = normalize(normalize(uSunDir) + v);
  float spec = pow(max(dot(n, hv), 0.0), 180.0) * uDay;
  col += uSunColor * spec * 1.6;
  col += uSunColor * pow(max(dot(n, hv), 0.0), 18.0) * 0.08 * uDay;
  float alpha = 0.78 + fres * 0.18;
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}
`;

export default function Water() {
    const mat = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: VERT,
                fragmentShader: FRAG,
                uniforms: THREE.UniformsUtils.merge([
                    THREE.UniformsLib.fog,
                    {
                        uTime: { value: 0 },
                        uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
                        uSunColor: { value: new THREE.Color('#ffe2bf') },
                        uSky: { value: new THREE.Color('#9db9ff') },
                        uDeep: { value: new THREE.Color('#163b3a') },
                        uDay: { value: 1 },
                    },
                ]),
                transparent: true,
                depthWrite: false,
                fog: true,
            }),
        [],
    );
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        const sky = getSky();
        mat.uniforms.uTime.value = state.clock.elapsedTime;
        (mat.uniforms.uSunDir.value as THREE.Vector3).set(sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]);
        (mat.uniforms.uSunColor.value as THREE.Color).setRGB(sky.sunColor[0] / 255, sky.sunColor[1] / 255, sky.sunColor[2] / 255);
        (mat.uniforms.uSky.value as THREE.Color).setRGB(sky.hemiSky[0] / 255, sky.hemiSky[1] / 255, sky.hemiSky[2] / 255);
        mat.uniforms.uDay.value = sky.daylight;
    });
    return (
        <mesh ref={ref} material={mat} position={[LAKE.x, WATER_Y, LAKE.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <circleGeometry args={[LAKE.r + 18, 64]} />
        </mesh>
    );
}
