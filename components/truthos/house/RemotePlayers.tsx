'use client';

/**
 * Only OTHER live players currently heartbeating in the house.
 * Never show self · no ghosts · no bots.
 *
 * Each peer wears the rigged vessel in the wardrobe their presence
 * carries. Speed is derived from how far the synced pose moved, so the
 * walk, jog and sprint cycles come free; emotes and sitting ride the
 * same packet. Words outrank nameplates.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Humanoid from './Humanoid';
import Vessel, { type VesselMotion } from './Vessel';
import { wearFromWire } from './vesselLook';
import { groundAt } from './homeMap';
import type { HousePeer } from '@/lib/truthos/housePresence';

function PeerMesh({
    peer,
    showLabel,
    low,
    rigged,
    said,
    ground = groundAt,
}: {
    peer: HousePeer;
    showLabel: boolean;
    low: boolean;
    rigged: boolean;
    /** The last thing this soul said, while it is still fresh */
    said?: string | null;
    /** Floor height here — the house's floor plan, or the plain's terrain */
    ground?: (x: number, z: number) => number;
}) {
    const wear = useMemo(
        () => wearFromWire(peer, peer.aura || '#a78bfa'),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [peer.build, peer.skin, peer.hair, peer.top, peer.bottom, peer.boots, peer.hs, peer.of, peer.hd, peer.bd, peer.aura],
    );
    const group = useRef<THREE.Group>(null);
    const peerRef = useRef(peer);
    peerRef.current = peer;
    const saidRef = useRef(!!said);
    saidRef.current = !!said;
    const speed = useRef(0);
    const last = useRef<{ x: number; z: number } | null>(null);

    const motion = useCallback((): VesselMotion => {
        const p = peerRef.current;
        // Emote time is wall-clock on the wire; the body wants this tab's clock
        const emoteAt = p.emoteAt ? performance.now() - (Date.now() - p.emoteAt) : 0;
        return {
            speed: speed.current,
            // y is world height; the dais is floor too
            grounded: (p.y || 0) - ground(p.x, p.z) < 0.08,
            seated: p.sit === 1,
            emote: p.emote ?? null,
            emoteAt,
            talking: saidRef.current,
        };
    }, []);

    // Glide between pose packets (~0.12 s apart) instead of snapping.
    // Height comes from the pose too, so a jumping peer leaves the floor.
    useFrame((_, dtRaw) => {
        const g = group.current;
        if (!g) return;
        const dt = Math.min(dtRaw, 0.05);
        const k = Math.min(1, dt * 10);
        const dx = peer.x - g.position.x;
        const dy = (peer.y || 0) - g.position.y;
        const dz = peer.z - g.position.z;
        const facing = peer.yaw + Math.PI;
        // A stale or teleporting peer jumps rather than sliding across rooms
        if (dx * dx + dz * dz > 36) {
            g.position.set(peer.x, peer.y || 0, peer.z);
            g.rotation.y = facing;
            last.current = { x: peer.x, z: peer.z };
            speed.current = 0;
            return;
        }
        g.position.x += dx * k;
        g.position.y += dy * k;
        g.position.z += dz * k;
        let dyaw = facing - g.rotation.y;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        g.rotation.y += dyaw * k;

        // Speed from how far the body actually travelled, eased so a
        // dropped packet does not stutter the gait
        const p = last.current;
        const v = p ? Math.hypot(g.position.x - p.x, g.position.z - p.z) / Math.max(dt, 1e-4) : 0;
        last.current = { x: g.position.x, z: g.position.z };
        speed.current += (Math.min(v, 9) - speed.current) * Math.min(1, dt * 8);
    });

    return (
        <group ref={group} position={[peer.x, peer.y || 0, peer.z]} rotation={[0, peer.yaw + Math.PI, 0]}>
            <Vessel
                wear={wear}
                motion={motion}
                shadows={!low}
                rigged={rigged}
                fallback={
                    <Humanoid
                        look={{ skin: peer.skin, hair: peer.hair, cloth: peer.top, aura: peer.aura || '#a78bfa', build: peer.build }}
                        low={low}
                        getSpeed={() => speed.current}
                    />
                }
            />
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
                <Html position={[0, 1.98, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                    <div className="px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap font-medium border bg-black/75 border-emerald-400/40 text-white/95">
                        <span className="text-emerald-400">LIVE · </span>
                        {peer.name}
                        {peer.lv && peer.lv > 1 ? <span className="ml-1 rounded-full bg-amber-400/20 px-1.5 text-amber-200">Lv {peer.lv}</span> : null}
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
    rigged = true,
    saidBy,
    ground,
}: {
    peers: HousePeer[];
    /** Local presence key — exclude from world (only other live viewers) */
    selfId?: string;
    mobile?: boolean;
    /** Rigged GLB bodies (else the procedural figure) */
    rigged?: boolean;
    /** peer id -> the words they just said, cleared by the caller on expiry */
    saidBy?: Record<string, string>;
    ground?: (x: number, z: number) => number;
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
                    rigged={rigged}
                    said={saidBy?.[p.id] ?? null}
                    ground={ground}
                />
            ))}
        </group>
    );
}
