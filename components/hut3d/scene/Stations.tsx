'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TruthTotem } from '../TruthTotem';
import { useHutUi, type HutStationId } from '../hutUiStore';

export type StationDef = {
    id: Exclude<HutStationId, null>;
    label: string;
    position: [number, number, number];
    radius: number;
    accent: string;
};

export const STATIONS: StationDef[] = [
    { id: 'truth', label: 'Ask Truth', position: [0, 0, 5.2], radius: 2.4, accent: '#f97316' },
    { id: 'soul', label: 'Soul Mirror', position: [5.8, 0, 1.5], radius: 2.0, accent: '#94a3b8' },
    { id: 'wayfinder', label: 'The Wayfinder', position: [0, 0, -4.2], radius: 2.0, accent: '#22c55e' },
    { id: 'ledger', label: 'The Ledger', position: [-4.2, 0, 4.8], radius: 1.8, accent: '#fbbf24' },
    { id: 'sanctum', label: 'The Sanctum', position: [0, 0, -6.8], radius: 2.0, accent: '#7c5cff' },
];

function StationRing({ accent, active }: { accent: string; active: boolean }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (ref.current) ref.current.rotation.z += dt * (active ? 0.8 : 0.25);
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry args={[0.55, 0.72, 40]} />
            <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={active ? 0.7 : 0.35}
                transparent
                opacity={active ? 0.95 : 0.65}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export function StationMarkers({ playerPos }: { playerPos: THREE.Vector3 | null }) {
    const setPrompt = useHutUi((s) => s.setPrompt);
    const station = useHutUi((s) => s.station);

    useFrame(() => {
        if (!playerPos || station) {
            if (station) setPrompt(null);
            return;
        }
        let best: StationDef | null = null;
        let bestD = Infinity;
        for (const s of STATIONS) {
            const d = playerPos.distanceTo(new THREE.Vector3(...s.position));
            if (d < s.radius && d < bestD) {
                best = s;
                bestD = d;
            }
        }
        setPrompt(best ? best.label : null);
    });

    return (
        <group>
            {/* Totem on the Truth dais — never a person / NPC */}
            <TruthTotem position={[0, 0.28, 5.2]} />
            {STATIONS.map((s) => {
                const near =
                    playerPos != null &&
                    playerPos.distanceTo(new THREE.Vector3(...s.position)) < s.radius;
                return (
                    <group key={s.id} position={s.position}>
                        <StationRing accent={s.accent} active={!!near} />
                    </group>
                );
            })}
        </group>
    );
}
