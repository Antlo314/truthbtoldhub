'use client';

/**
 * The house's light plan.
 *
 * Before this there were four point lights for nineteen rooms, all the
 * same colour, all pushed up near the slab — which is why the interior
 * read flat: a room either sat inside one of the four pools or it was
 * lit by nothing but ambient.
 *
 * Two systems, deliberately separated:
 *
 *   · RoomPracticals — one fixture per room, positioned from the ROOMS
 *     table (so it can never drift from the plan), with a colour
 *     temperature that matches what the room is FOR: tungsten warmth
 *     where you rest, cooler light where you work or wash. These belong
 *     INSIDE LampGroup, which dims them as the sun rises.
 *
 *   · DaylightFill — the opposite curve. Windows do not stop existing at
 *     noon, and a house lit only by dimming lamps goes grey at midday.
 *     These sit OUTSIDE LampGroup and scale with `daylight`, standing in
 *     for the bounce off the floor by the glazing.
 *
 * Cost: practicals are shadowless (the sun owns shadows) and every one
 * has a tight `distance`, so nothing spills through a wall it should not
 * reach. `low` cuts the plan to the rooms a phone will actually stand in.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOMS, STOREY, UPPER_Y, MAIN_Y } from './homeMap';
import { getSky } from './DayNightCycle';

/** Tungsten → daylight, by what happens in the room. */
const WARM = '#ffd2a1';
const LAMP = '#ffe0b8';
const NEUTRAL = '#fff0dd';
const TASK = '#fdf6ec';
const PORCH = '#ffc98f';

type Fixture = {
    room: string;
    color: string;
    /** candela at the fixture */
    intensity: number;
    /** metres — where this fixture's pool ends */
    distance: number;
    /** metres below the ceiling */
    drop?: number;
    /** kept on phones */
    core?: boolean;
};

const FIXTURES: Fixture[] = [
    /* ── main floor ─────────────────────────────────────── */
    { room: 'rec', color: LAMP, intensity: 7.5, distance: 13, core: true },
    { room: 'foyer', color: WARM, intensity: 6.0, distance: 11, core: true },
    { room: 'hall_m', color: WARM, intensity: 3.6, distance: 8 },
    { room: 'bed_w', color: LAMP, intensity: 4.6, distance: 9 },
    { room: 'bed_n', color: LAMP, intensity: 4.6, distance: 9 },
    { room: 'bath', color: TASK, intensity: 3.4, distance: 6.5 },
    { room: 'living', color: LAMP, intensity: 8.2, distance: 14, core: true },
    { room: 'kitchen', color: TASK, intensity: 6.6, distance: 12, core: true },
    { room: 'dining', color: WARM, intensity: 6.0, distance: 11, core: true },
];

function centre(id: string) {
    const r = ROOMS.find((room) => room.id === id);
    if (!r) return null;
    return {
        x: (r.minX + r.maxX) / 2,
        z: (r.minZ + r.maxZ) / 2,
        base: r.level === 'upper' ? UPPER_Y : MAIN_Y,
    };
}

/** Room fixtures — mount INSIDE LampGroup so daylight dims them. */
export function RoomPracticals({ low = false }: { low?: boolean }) {
    const lights = useMemo(
        () =>
            FIXTURES.filter((f) => !low || f.core)
                .map((f) => {
                    const c = centre(f.room);
                    if (!c) return null;
                    return { ...f, x: c.x, z: c.z, y: c.base + STOREY - (f.drop ?? 0.62) };
                })
                .filter(Boolean) as (Fixture & { x: number; z: number; y: number })[],
        [low],
    );

    return (
        <group>
            {lights.map((l) => (
                <pointLight
                    key={l.room}
                    position={[l.x, l.y, l.z]}
                    intensity={l.intensity}
                    color={l.color}
                    distance={l.distance}
                    decay={2}
                />
            ))}
        </group>
    );
}

/**
 * Window bounce. Rises with the sun instead of falling with it, so the
 * interior at noon is lit by the outside rather than by lamps that are
 * being dimmed at exactly the same moment.
 *
 * Mount OUTSIDE LampGroup — inside it, LampGroup's per-frame write would
 * overwrite these intensities with the lamp curve and cancel the effect.
 */
export function DaylightFill({ low = false }: { low?: boolean }) {
    const group = useRef<THREE.Group>(null);
    const base = useRef<Map<THREE.Light, number>>(new Map());

    useFrame(() => {
        const g = group.current;
        if (!g) return;
        const day = getSky().daylight;
        g.traverse((o) => {
            const l = o as THREE.Light;
            if (!l.isLight) return;
            let b = base.current.get(l);
            if (b === undefined) {
                b = l.intensity;
                base.current.set(l, b);
            }
            // Ease in: dawn should lift the room before the sun is high
            l.intensity = b * Math.pow(day, 0.75);
        });
    });

    // Placed at the glazing, aimed into the plan — the east wall of the
    // living room, the south glass of the rec room, the kitchen's north
    // band, and one on the main floor so downstairs is not left dark.
    return (
        <group ref={group}>
            <pointLight position={[10.5, MAIN_Y + 2.1, 3.0]} intensity={9} color="#dceaff" distance={18} decay={2} />
            <pointLight position={[-8.0, MAIN_Y + 2.1, 12.0]} intensity={8} color="#e2eeff" distance={16} decay={2} />
            {!low && (
                <pointLight position={[7.0, MAIN_Y + 2.1, -12.0]} intensity={6.5} color="#e6f0ff" distance={14} decay={2} />
            )}
        </group>
    );
}
