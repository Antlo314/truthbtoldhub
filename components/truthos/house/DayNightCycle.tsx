'use client';

/**
 * Drives the scene from the world clock: advances time, moves the sun, and
 * repaints the global lighting, fog and background every frame.
 *
 * This component OWNS the sun, ambient and hemisphere lights so there is a
 * single place the time of day is expressed. Room practicals (the coloured
 * point lights inside the house) stay where they are and are dimmed by
 * daylight through `lampLevel`, which is why lamps read as "on" at night and
 * fade out by mid-morning rather than glowing through noon.
 *
 * The sun's shadow frustum follows the walker. A fixed ±34 m box around the
 * origin covered the house and nothing else; now shadows are crisp wherever
 * you stand, on the isles included, for the same texel budget.
 *
 * Colours are mutated in place on existing objects rather than pushed through
 * React state — at 60fps a setState per frame would re-render the whole tree.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveSky, useWorldTime, type SkyState } from './worldTime';
import { getWalkerPose } from './walkerPose';

/** Cheap shared accessor so other scene code can read the current sky */
let currentSky: SkyState = resolveSky(9.5, 'clear');
export function getSky(): SkyState {
    return currentSky;
}

const SUN_DIST = 60;
const SHADOW_HALF = 26;
/**
 * The sky keyframes were tuned for an open clearing. The lair is one
 * interior ninety metres end to end; at the old distances the far end of
 * the Processional sat in haze and every room read smaller than it is.
 */
const FOG_NEAR_SCALE = 2.4;
const FOG_FAR_SCALE = 2.0;

export default function DayNightCycle({
    mobile = false,
    shadows = true,
    shadowMap = 2048,
}: {
    mobile?: boolean;
    shadows?: boolean;
    shadowMap?: number;
}) {
    const sun = useRef<THREE.DirectionalLight>(null);
    const ambient = useRef<THREE.AmbientLight>(null);
    const hemi = useRef<THREE.HemisphereLight>(null);
    const { scene } = useThree();
    const target = useMemo(() => new THREE.Object3D(), []);

    const advance = useWorldTime((s) => s.advance);
    const rollWeather = useWorldTime((s) => s.rollWeather);

    // Reusable colour objects — allocating per frame would thrash the GC
    const tmp = useMemo(
        () => ({
            sun: new THREE.Color(),
            amb: new THREE.Color(),
            hemiSky: new THREE.Color(),
            hemiGround: new THREE.Color(),
            fog: new THREE.Color(),
            dir: new THREE.Vector3(),
        }),
        [],
    );

    // Weather drifts on its own schedule, independent of frame rate
    useEffect(() => {
        const id = setInterval(() => rollWeather(), 90_000);
        return () => clearInterval(id);
    }, [rollWeather]);

    useFrame((_, dt) => {
        // Guard against tab-restore producing a huge delta and skipping a day
        advance(Math.min(dt, 0.25));

        const { hour, weather } = useWorldTime.getState();
        const sky = resolveSky(hour, weather);
        currentSky = sky;

        if (sun.current) {
            // Frustum rides with the walker; the light keeps its sky vector
            const p = getWalkerPose();
            target.position.set(p.x, 0, p.z);
            target.updateMatrixWorld();
            tmp.dir.set(sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]).normalize().multiplyScalar(SUN_DIST);
            sun.current.position.set(p.x + tmp.dir.x, Math.max(2, tmp.dir.y), p.z + tmp.dir.z);
            sun.current.intensity = sky.sunIntensity;
            sun.current.color.copy(tmp.sun.setRGB(...rgb01(sky.sunColor)));
        }
        if (ambient.current) {
            ambient.current.intensity = sky.ambientIntensity * (mobile ? 1.5 : 1);
            ambient.current.color.copy(tmp.amb.setRGB(...rgb01(sky.ambientColor)));
        }
        if (hemi.current) {
            hemi.current.intensity = sky.hemiIntensity * (mobile ? 1.4 : 1);
            hemi.current.color.copy(tmp.hemiSky.setRGB(...rgb01(sky.hemiSky)));
            hemi.current.groundColor.copy(tmp.hemiGround.setRGB(...rgb01(sky.hemiGround)));
        }

        tmp.fog.setRGB(...rgb01(sky.fogColor));
        const fog = scene.fog as THREE.Fog | null;
        if (fog) {
            fog.color.copy(tmp.fog);
            fog.near = sky.fogNear * FOG_NEAR_SCALE;
            fog.far = sky.fogFar * FOG_FAR_SCALE;
        }
        if (scene.background instanceof THREE.Color) scene.background.copy(tmp.fog);
    });

    return (
        <>
            <directionalLight
                ref={sun}
                target={target}
                castShadow={shadows}
                shadow-mapSize={[shadowMap, shadowMap]}
                shadow-camera-left={-SHADOW_HALF}
                shadow-camera-right={SHADOW_HALF}
                shadow-camera-top={SHADOW_HALF}
                shadow-camera-bottom={-SHADOW_HALF}
                shadow-camera-near={1}
                shadow-camera-far={SUN_DIST * 2 + 20}
                shadow-bias={-0.0004}
                shadow-normalBias={0.025}
            />
            <primitive object={target} />
            <ambientLight ref={ambient} />
            <hemisphereLight ref={hemi} />
        </>
    );
}

/** 0–255 → 0–1 for THREE.Color.setRGB */
function rgb01(c: [number, number, number]): [number, number, number] {
    return [c[0] / 255, c[1] / 255, c[2] / 255];
}
