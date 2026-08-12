'use client';

/**
 * Only OTHER live players currently heartbeating in the house.
 * Never show self · no ghosts · no bots.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Humanoid from './Humanoid';
import type { HousePeer } from '@/lib/truthos/housePresence';

function PeerMesh({
    peer,
    showLabel,
    low,
    said,
}: {
    peer: HousePeer;
    showLabel: boolean;
    low: boolean;
    /** The last thing this soul said, while it is still fresh */
    said?: string | null;
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
    const group = useRef<THREE.Group>(null);

    // Glide between pose packets (~0.12 s apart) instead of snapping.
    // Height comes from the pose too, so upstairs peers stand upstairs.
    useFrame((_, dt) => {
        const g = group.current;
        if (!g) return;
        const k = Math.min(1, dt * 10);
        const dx = peer.x - g.position.x;
        const dy = (peer.y || 0) - g.position.y;
        const dz = peer.z - g.position.z;
        // A stale or teleporting peer jumps rather than sliding across rooms
        if (dx * dx + dz * dz > 36) {
            g.position.set(peer.x, peer.y || 0, peer.z);
            g.rotation.y = peer.yaw;
            return;
        }
        g.position.x += dx * k;
        g.position.y += dy * k;
        g.position.z += dz * k;
        let dyaw = peer.yaw - g.rotation.y;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        g.rotation.y += dyaw * k;
    });

    return (
        <group ref={group} position={[peer.x, peer.y || 0, peer.z]} rotation={[0, peer.yaw, 0]}>
            <Humanoid look={look} low={low} trackPosition={track} />
            {/* A spoken word outranks the nameplate: while someone is
                talking you see what they said, not that they exist. */}
            {said ? (
                <Html position={[0, 2.12, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div className="max-w-[220px] px-2.5 py-1 rounded-2xl text-[10px] leading-snug font-medium border bg-black/85 border-white/25 text-white text-center shadow-lg">
                        <span className="block text-[8px] uppercase tracking-[0.2em] text-emerald-300/80">
                            {peer.name}
                        </span>
                        {said}
                    </div>
                </Html>
            ) : showLabel ? (
                <Html position={[0, 1.95, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div className="px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap font-medium border bg-black/75 border-emerald-400/40 text-white/95">
                        <span className="text-emerald-400">LIVE · </span>
                        {peer.name}
                    </div>
                </Html>
            ) : null}
        </group>
    );
}

export default function RemotePlayers({
    peers,
    selfId,
    mobile = false,
    saidBy,
}: {
    peers: HousePeer[];
    /** Local presence key — exclude from world (only other live viewers) */
    selfId?: string;
    mobile?: boolean;
    /** peer id -> the words they just said, cleared by the caller on expiry */
    saidBy?: Record<string, string>;
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
                    said={saidBy?.[p.id] ?? null}
                />
            ))}
        </group>
    );
}
