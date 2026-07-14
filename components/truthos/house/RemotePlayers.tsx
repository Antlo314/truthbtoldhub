'use client';

/**
 * Only OTHER live players currently heartbeating in the house.
 * Never show self · no ghosts · no bots.
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
    const skin = SKIN_TONES[peer.skin] ?? SKIN_TONES[6];
    const aura = peer.aura || '#a78bfa';
    const w = peer.build === 'fem' ? 0.3 : 0.36;

    return (
        <group position={[peer.x, 0, peer.z]} rotation={[0, peer.yaw, 0]}>
            <mesh position={[0, 0.95, 0]}>
                <capsuleGeometry args={[w * 0.45, 0.7, 4, low ? 6 : 8]} />
                <meshStandardMaterial color={skin} roughness={0.75} />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
                <sphereGeometry args={[0.15, low ? 8 : 10, low ? 8 : 10]} />
                <meshStandardMaterial color={skin} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.26, 0.36, low ? 12 : 16]} />
                <meshStandardMaterial
                    color={aura}
                    emissive={aura}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            {showLabel && (
                <Html position={[0, 1.92, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div className="px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap font-medium border bg-black/75 border-emerald-400/40 text-white/95">
                        <span className="text-emerald-400">LIVE · </span>
                        {peer.name}
                    </div>
                </Html>
            )}
        </group>
    );
}

export default function RemotePlayers({
    peers,
    selfId,
    mobile = false,
}: {
    peers: HousePeer[];
    /** Local presence key — exclude from world (only other live viewers) */
    selfId?: string;
    mobile?: boolean;
}) {
    const list = useMemo(() => {
        const now = Date.now();
        const me = selfId ? String(selfId) : '';
        return peers.filter((p) => {
            if (p.kind !== 'live') return false;
            if (!p.at || now - p.at >= 10000) return false;
            if (me && (p.id === me || String(p.id) === me)) return false;
            return true;
        });
    }, [peers, selfId]);

    if (list.length === 0) return null;

    return (
        <group>
            {list.map((p) => (
                <PeerMesh
                    key={`live-${p.id}`}
                    peer={p}
                    showLabel={!mobile}
                    low={mobile}
                />
            ))}
        </group>
    );
}
