'use client';

/**
 * Only real souls:
 *  LIVE  — currently heartbeating peers (solid)
 *  GHOST — remembered footprints of past visitors (translucent echo)
 * Never invents NPCs.
 */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SKIN_TONES } from '@/lib/game/avatar';
import type { HousePeer } from '@/lib/truthos/housePresence';

function PeerMesh({
    peer,
    showLabel,
    low,
}: {
    peer: HousePeer;
    showLabel: boolean;
    low: boolean;
}) {
    const isGhost = peer.kind === 'ghost';
    const skin = SKIN_TONES[peer.skin] ?? SKIN_TONES[6];
    const aura = isGhost ? '#94a3b8' : peer.aura || '#a78bfa';
    const w = peer.build === 'fem' ? 0.3 : 0.36;
    const opacity = isGhost ? 0.28 : 1;

    return (
        <group position={[peer.x, 0, peer.z]} rotation={[0, peer.yaw, 0]}>
            <mesh position={[0, 0.95, 0]}>
                <capsuleGeometry args={[w * 0.45, 0.7, 4, low ? 6 : 8]} />
                <meshStandardMaterial
                    color={isGhost ? '#64748b' : skin}
                    roughness={0.75}
                    transparent={isGhost}
                    opacity={opacity}
                    depthWrite={!isGhost}
                />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
                <sphereGeometry args={[0.15, low ? 8 : 10, low ? 8 : 10]} />
                <meshStandardMaterial
                    color={isGhost ? '#64748b' : skin}
                    roughness={0.7}
                    transparent={isGhost}
                    opacity={opacity}
                    depthWrite={!isGhost}
                />
            </mesh>
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.26, 0.36, low ? 12 : 16]} />
                <meshStandardMaterial
                    color={aura}
                    emissive={aura}
                    emissiveIntensity={isGhost ? 0.15 : 0.5}
                    transparent
                    opacity={isGhost ? 0.35 : 0.7}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            {showLabel && (
                <Html position={[0, 1.92, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div
                        className={[
                            'px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap font-medium border',
                            isGhost
                                ? 'bg-slate-900/50 border-slate-500/30 text-slate-300/70'
                                : 'bg-black/75 border-emerald-400/40 text-white/95',
                        ].join(' ')}
                    >
                        {isGhost ? (
                            <span>
                                <span className="text-slate-400">echo · </span>
                                {peer.name}
                            </span>
                        ) : (
                            <span>
                                <span className="text-emerald-400">LIVE · </span>
                                {peer.name}
                            </span>
                        )}
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
    const list = useMemo(() => {
        const now = Date.now();
        // Live: must be fresh. Ghost: already filtered by TTL in presence layer.
        return peers.filter((p) => {
            if (p.kind === 'live') return p.at && now - p.at < 10000;
            return p.kind === 'ghost';
        });
    }, [peers]);

    if (list.length === 0) return null;

    // Cap ghost count on mobile for GPU
    const shown = mobile
        ? [
              ...list.filter((p) => p.kind === 'live'),
              ...list.filter((p) => p.kind === 'ghost').slice(0, 4),
          ]
        : list;

    return (
        <group>
            {shown.map((p) => (
                <PeerMesh
                    key={`${p.kind}-${p.id}`}
                    peer={p}
                    showLabel={!mobile || p.kind === 'live'}
                    low={mobile}
                />
            ))}
        </group>
    );
}
