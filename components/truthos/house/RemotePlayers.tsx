'use client';

/**
 * Only OTHER live players currently heartbeating in the house.
 * Never show self · no ghosts · no bots.
 */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import Humanoid from './Humanoid';
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
    // A peer is a person now, not a capsule. The body derives its own
    // walk speed from how far the synced pose actually moved, so remote
    // players animate correctly without sending a single extra byte.
    const look = useMemo(
        () => ({
            skin: peer.skin,
            aura: peer.aura || '#a78bfa',
            build: peer.build,
        }),
        [peer.skin, peer.aura, peer.build],
    );
    const track = useMemo(() => ({ x: peer.x, z: peer.z }), [peer.x, peer.z]);

    return (
        <group position={[peer.x, 0, peer.z]} rotation={[0, peer.yaw, 0]}>
            <Humanoid look={look} low={low} trackPosition={track} />
            {showLabel && (
                <Html position={[0, 1.95, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
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
