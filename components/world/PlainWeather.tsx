'use client';

/**
 * Weather on the plain, made visible. The world clock already rolls the
 * weather and dims the light and closes the fog for it; this adds what
 * you see and hear: rain streaks falling around you, lightning in a
 * storm with its thunder a moment later, and the wind the grass and the
 * ambience read (`plainWind()`, `plainRain()`).
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldTime } from '@/components/truthos/house/worldTime';
import { sfx } from '@/lib/world/sfx';

let wind = 1;
let rain = 0;
/** 0..1 how hard it is raining right now (eased) */
export const plainRain = () => rain;
/** wind multiplier for the grass and the air: 1 calm … ~1.9 storm */
export const plainWind = () => wind;

const VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uCam;
uniform float uSlant;
attribute vec4 aSeed;
attribute float aEnd;
varying float vEnd;
void main() {
  float W = 56.0;
  float H = 24.0;
  float x = (aSeed.x - 0.5) * W;
  float z = (aSeed.y - 0.5) * W;
  float fall = mod(aSeed.z * H - uTime * (15.0 + aSeed.w * 7.0), H);
  vec3 p = uCam + vec3(x, fall - H * 0.4, z);
  p.x += uSlant * (fall / H) * 2.0;
  if (aEnd > 0.5) {
    p.y += 0.62;
    p.x -= uSlant * 0.12;
  }
  vEnd = aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;
const FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying float vEnd;
void main() {
  gl_FragColor = vec4(uColor, uOpacity * (0.35 + vEnd * 0.65));
}
`;

export default function PlainWeather({ low = false }: { low?: boolean }) {
    const { camera } = useThree();
    const flash = useRef<THREE.AmbientLight>(null);
    const nextBolt = useRef(10);
    const boltT = useRef(0);
    const count = low ? 600 : 1800;

    const { geo, mat } = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const seeds = new Float32Array(count * 2 * 4);
        const ends = new Float32Array(count * 2);
        const pos = new Float32Array(count * 2 * 3);
        for (let i = 0; i < count; i++) {
            const s = [Math.random(), Math.random(), Math.random(), Math.random()];
            for (let e = 0; e < 2; e++) {
                seeds.set(s, (i * 2 + e) * 4);
                ends[i * 2 + e] = e;
            }
        }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
        g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
        const m = new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms: {
                uTime: { value: 0 },
                uCam: { value: new THREE.Vector3() },
                uSlant: { value: 0.6 },
                uOpacity: { value: 0 },
                uColor: { value: new THREE.Color('#b9c6dc') },
            },
            transparent: true,
            depthWrite: false,
        });
        return { geo: g, mat: m };
    }, [count]);

    const lines = useRef<THREE.LineSegments>(null);

    useFrame((state, dtRaw) => {
        const dt = Math.min(dtRaw, 0.1);
        const w = useWorldTime.getState().weather;
        const wantRain = w === 'rain' ? 1 : 0;
        rain += (wantRain - rain) * Math.min(1, dt * 0.35);
        const wantWind = w === 'rain' ? 1.8 : w === 'overcast' ? 1.35 : w === 'cloudy' ? 1.15 : w === 'fog' ? 0.6 : 1;
        wind += (wantWind - wind) * Math.min(1, dt * 0.3);

        mat.uniforms.uTime.value = state.clock.elapsedTime;
        (mat.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
        mat.uniforms.uSlant.value = 0.4 + (wind - 1) * 1.2;
        mat.uniforms.uOpacity.value = rain * 0.55;
        if (lines.current) lines.current.visible = rain > 0.02;

        // lightning in a hard rain — the thunder follows by the distance
        if (rain > 0.7) {
            nextBolt.current -= dt;
            if (nextBolt.current <= 0) {
                nextBolt.current = 9 + Math.random() * 18;
                boltT.current = 0.001;
                const far = 0.4 + Math.random() * 2.2;
                window.setTimeout(() => sfx('thunder', { volume: 1.2 - far * 0.3 }), far * 1000);
            }
        }
        if (flash.current) {
            if (boltT.current > 0) {
                boltT.current += dt;
                const t = boltT.current;
                // two quick flickers
                const k = t < 0.08 ? 1 : t < 0.16 ? 0.2 : t < 0.26 ? 0.8 : Math.max(0, 1 - (t - 0.26) * 4);
                flash.current.intensity = k * 2.6;
                if (t > 0.6) boltT.current = 0;
            } else flash.current.intensity = 0;
        }
    });

    return (
        <>
            <lineSegments ref={lines} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
            <ambientLight ref={flash} color="#d8e2ff" intensity={0} />
        </>
    );
}
