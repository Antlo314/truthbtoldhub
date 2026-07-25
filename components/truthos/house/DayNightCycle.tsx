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
 * Colours are mutated in place on existing objects rather than pushed through
 * React state — at 60fps a setState per frame would re-render the whole tree.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveSky, useWorldTime, type SkyState } from './worldTime';

/** Cheap shared accessor so other scene code can read the current sky */
let currentSky: SkyState = resolveSky(9.5, 'clear');
export function getSky(): SkyState {
    return currentSky;
}

export default function DayNightCycle({
    mobile = false,
    shadows = true,
}: {
    mobile?: boolean;
    shadows?: boolean;
}) {
    const sun = useRef<THREE.DirectionalLight>(null);
    const ambient = useRef<THREE.AmbientLight>(null);
    const hemi = useRef<THREE.HemisphereLight>(null);
    const { scene } = useThree();

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
            sun.current.position.set(sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]);
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
            fog.near = sky.fogNear;
            fog.far = sky.fogFar;
        }
        if (scene.background instanceof THREE.Color) scene.background.copy(tmp.fog);
    });

    return (
        <>
            <directionalLight
                ref={sun}
                castShadow={shadows}
                shadow-mapSize={[mobile ? 1024 : 2048, mobile ? 1024 : 2048]}
                shadow-camera-left={-34}
                shadow-camera-right={34}
                shadow-camera-top={34}
                shadow-camera-bottom={-34}
                shadow-camera-near={0.5}
                shadow-camera-far={90}
                shadow-bias={-0.0006}
            />
            <ambientLight ref={ambient} />
            <hemisphereLight ref={hemi} />
        </>
    );
}

/** 0–255 → 0–1 for THREE.Color.setRGB */
function rgb01(c: [number, number, number]): [number, number, number] {
    return [c[0] / 255, c[1] / 255, c[2] / 255];
}
