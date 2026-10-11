/**
 * The Aether sky, as a shader — shared between the dome the player sees
 * and the small cube the environment light is captured from, so the
 * reflections in a gold rail are the same sky that is overhead.
 */
import * as THREE from 'three';

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = normalize(world.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSunDir;
uniform float uDay;
varying vec3 vDir;

// cheap hash noise for a faint cloud veil near the horizon
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y * 0.62 + 0.38, 0.0, 1.0);
  float band = pow(1.0 - abs(d.y), 2.8);
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.08, 0.82, h));
  col += uGlow * band * (0.28 + 0.5 * uDay);

  // sun halo on the light's own vector — the disc itself is a sprite
  float s = max(0.0, dot(d, normalize(uSunDir)));
  col += uGlow * (pow(s, 48.0) * 0.55 + pow(s, 6.0) * 0.08) * (0.25 + uDay);

  // a thin veil of high cloud, brighter by day, so the dome is not a gradient poster
  float veil = noise(vec2(atan(d.z, d.x) * 2.2, d.y * 7.0 + 3.0)) * noise(vec2(atan(d.z, d.x) * 5.0 + 9.0, d.y * 15.0));
  veil *= smoothstep(0.02, 0.18, d.y) * (1.0 - smoothstep(0.35, 0.7, d.y));
  col = mix(col, col * 0.86 + uGlow * 0.22 + 0.06, veil * (0.18 + 0.28 * uDay));

  gl_FragColor = vec4(col, 1.0);
}
`;

export type SkyUniforms = {
    uZenith: { value: THREE.Color };
    uHorizon: { value: THREE.Color };
    uGlow: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uDay: { value: number };
};

export function makeSkyUniforms(): SkyUniforms {
    return {
        uZenith: { value: new THREE.Color('#14102a') },
        uHorizon: { value: new THREE.Color('#3a2a48') },
        uGlow: { value: new THREE.Color('#e8c478') },
        uSunDir: { value: new THREE.Vector3(0.3, 0.6, -0.4) },
        uDay: { value: 0.3 },
    };
}

/**
 * One uniform set for the whole app. AetherSky writes it every frame;
 * SkyEnvironment reads it when it recaptures the environment cube.
 */
export const skyUniforms: SkyUniforms = makeSkyUniforms();

export function makeSkyMaterial(uniforms: SkyUniforms = skyUniforms): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
    });
}
