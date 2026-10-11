'use client';

/**
 * Every prop in the plan that is drawn from a model, drawn the same way:
 * at its world centre, turned by its world yaw, sized by its fit — the
 * exact numbers validate-sanctum measured. Phones (and any model that
 * fails to load) get a block the size of the footprint instead, so the
 * room is furnished either way and the block is never bigger than what
 * the walker collides with.
 *
 * Bespoke pieces (the fire, the pool, the arcade cabinets, things that
 * sit ON a prop) live in SanctumStations and LairWings and use
 * <SolidGroup> to stand in the same frame.
 */
import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import { SOLIDS, solid, solidWorld, solidYaw, type Solid } from './homeMap';

/** A group in the solid's frame: origin at its centre on the floor, local +z its front. */
export function SolidGroup({ s, children, y = 0 }: { s: Solid | string; children: ReactNode; y?: number }) {
    const sol = typeof s === 'string' ? solid(s) : s;
    const w = solidWorld(sol);
    return (
        <group position={[w.x, y, w.z]} rotation={[0, solidYaw(sol), 0]}>
            {children}
        </group>
    );
}

export function matFor(m: HouseMaterials, key?: string): THREE.Material {
    const table = m as unknown as Record<string, THREE.Material | undefined>;
    return (key && table[key]) || m.woodDark;
}

/** The procedural stand-in: a block a little inside the footprint */
export function FootBlock({ s, m, shadow }: { s: Solid; m: HouseMaterials; shadow: boolean }) {
    return (
        <mesh position={[0, s.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
            {s.round ? <cylinderGeometry args={[s.w * 0.46, s.w * 0.46, s.h, 14]} /> : <boxGeometry args={[s.w * 0.92, s.h, s.d * 0.92]} />}
            <primitive object={matFor(m, s.mat)} attach="material" />
        </mesh>
    );
}

export default function LairProps({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const list = useMemo(() => SOLIDS.filter((s) => s.model && !s.custom), []);
    const shadow = !low;
    return (
        <group>
            {list.map((s) => (
                <SolidGroup key={s.name} s={s}>
                    <HouseProp model={s.model!} fit={s.fit} shadows={shadow}>
                        <FootBlock s={s} m={m} shadow={shadow} />
                    </HouseProp>
                </SolidGroup>
            ))}
        </group>
    );
}
