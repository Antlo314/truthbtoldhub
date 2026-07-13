'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SKIN_TONES } from '@/lib/game/avatar';
import type { HousePeer } from '@/lib/truthos/housePresence';

function PeerMesh({ peer, showLabel }: { peer: HousePeer; showLabel: boolean }) {
    const skin = SKIN_TONES[peer.skin] ?? SKIN_TONES[6];
    const aura = peer.aura || '#a78bfa';
    const w = peer.build === 'fem' ? 0.32 : 0.38;

    return (
        <group position={[peer.x, 0, peer.z]} rotation={[0, peer.yaw, 0]}>
            <mesh position={[0, 0.95, 0]}>
                <capsuleGeometry args={[w * 0.45, 0.7, 4, 8]} />
                <meshStandardMaterial color={skin} roughness={0.75} />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
                <sphereGeometry args={[0.16, 10, 10]} />
                <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.28, 0.38, 16]} />
                <meshStandardMaterial
                    color={aura}
                    emissive={aura}
                    emissiveIntensity={0.45}
                    transparent
                    opacity={0.65}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {showLabel && (
                <Html position={[0, 1.95, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div className="px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[10px] text-white/90 whitespace-nowrap font-medium">
                        {peer.name}
                    </div>
                </Html>
            )}
        </group>
    );
}

export default function RemotePlayers({
    peers,
    mobile = false,
}: {
    peers: HousePeer[];
    mobile?: boolean;
}) {
    // Extra client-side stale guard (ms) — belt & suspenders with presence layer
    const list = useMemo(() => {
        const now = Date.now();
        return peers.filter((p) => p.at && now - p.at < 10000);
    }, [peers]);

    if (list.length === 0) return null;

    return (
        <group>
            {list.map((p) => (
                <PeerMesh key={p.id} peer={p} showLabel={!mobile} />
            ))}
        </group>
    );
}
