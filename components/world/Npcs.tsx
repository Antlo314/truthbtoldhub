'use client';

/**
 * The souls who live on the plain. They wear the same rigged vessel every
 * player wears, so a guide and a guest are cut from one cloth. Posted souls
 * stand and turn to face you; walkers roam a loop near home. The marker
 * over a head says whether they have something for you.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import Vessel, { type VesselMotion } from '@/components/truthos/house/Vessel';
import Humanoid from '@/components/truthos/house/Humanoid';
import { wearFromWire } from '@/components/truthos/house/vesselLook';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { heightAt, isWater } from '@/lib/world/terrain';
import { moveOnPlain, NPCS, rng, walkableAt, type Npc, type NpcId } from '@/lib/world/plain';

export type NpcMarker = 'offer' | 'turnin' | null;

/** Live NPC positions, readable by the hotspot finder without React */
const npcPos = new Map<NpcId, { x: number; z: number }>();
export function npcPosition(id: NpcId): { x: number; z: number } {
    return npcPos.get(id) ?? { x: NPCS.find((n) => n.id === id)!.x, z: NPCS.find((n) => n.id === id)!.z };
}

const SLEEP_R = 140;

function Soul({ npc, marker, rigged, shadows, low }: { npc: Npc; marker: NpcMarker; rigged: boolean; shadows: boolean; low: boolean }) {
    const group = useRef<THREE.Group>(null);
    const wear = useMemo(() => wearFromWire(npc.wear, npc.aura), [npc]);
    const pos = useRef({ x: npc.x, z: npc.z });
    const yaw = useRef(npc.yaw);
    const speed = useRef(0);
    const r = useMemo(() => rng(npc.id.length * 7919 + npc.x * 31 + npc.z), [npc]);
    const mind = useRef<{ mode: 'idle' | 'walk'; t: number; tx: number; tz: number }>({ mode: 'idle', t: 2 + r() * 4, tx: npc.x, tz: npc.z });
    const talkT = useRef(0);
    const label = useRef<HTMLDivElement>(null);

    const motion = useCallback(
        (): VesselMotion => ({ speed: speed.current, grounded: true, seated: false, emote: null, emoteAt: 0, talking: talkT.current > 0 }),
        [],
    );

    useFrame((_, dtRaw) => {
        const g = group.current;
        if (!g) return;
        const dt = Math.min(dtRaw, 0.05);
        const p = getWalkerPose();
        const dxp = p.x - pos.current.x;
        const dzp = p.z - pos.current.z;
        const dist = Math.hypot(dxp, dzp);
        if (label.current) {
            const show = dist < 48;
            if ((label.current.style.display !== 'none') !== show) label.current.style.display = show ? '' : 'none';
        }
        if (dist > SLEEP_R) {
            g.visible = false;
            return;
        }
        g.visible = true;
        talkT.current = Math.max(0, talkT.current - dt);
        const m = mind.current;
        let want = 0;
        let targetYaw = yaw.current;
        if (dist < 5.5) {
            // turn to the walker; stop walking
            targetYaw = Math.atan2(dxp, dzp);
            m.mode = 'idle';
            m.t = 1.5;
        } else if (npc.roam > 0) {
            m.t -= dt;
            if (m.mode === 'idle' && m.t <= 0) {
                const a = r() * Math.PI * 2;
                const d = 6 + r() * npc.roam;
                const tx = npc.x + Math.cos(a) * d;
                const tz = npc.z + Math.sin(a) * d;
                if (walkableAt(tx, tz, 0.34) && !isWater(tx, tz, -0.3)) {
                    m.mode = 'walk';
                    m.tx = tx;
                    m.tz = tz;
                    m.t = 40;
                } else m.t = 0.4;
            }
            if (m.mode === 'walk') {
                const dx = m.tx - pos.current.x;
                const dz = m.tz - pos.current.z;
                const l = Math.hypot(dx, dz);
                if (l < 0.5 || m.t <= 0) {
                    m.mode = 'idle';
                    m.t = 3 + r() * 7;
                } else {
                    want = 1.35;
                    targetYaw = Math.atan2(dx, dz);
                    const nx = pos.current.x + (dx / l) * want * dt;
                    const nz = pos.current.z + (dz / l) * want * dt;
                    const next = moveOnPlain(pos.current.x, pos.current.z, nx, nz, 0.34);
                    if (Math.abs(next.x - pos.current.x) < 1e-4 && Math.abs(next.z - pos.current.z) < 1e-4) {
                        m.mode = 'idle';
                        m.t = 1;
                        want = 0;
                    }
                    pos.current = next;
                }
            }
        } else if (dist > 7) {
            targetYaw = npc.yaw;
        }
        speed.current += (want - speed.current) * Math.min(1, dt * 6);
        let dy = targetYaw - yaw.current;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        yaw.current += dy * Math.min(1, dt * 5);
        npcPos.set(npc.id, pos.current);
        g.position.set(pos.current.x, heightAt(pos.current.x, pos.current.z), pos.current.z);
        // the vessel faces its own +z; atan2(dx,dz) is that heading
        g.rotation.y = yaw.current;
    });

    return (
        <group ref={group} position={[npc.x, heightAt(npc.x, npc.z), npc.z]} rotation={[0, npc.yaw, 0]}>
            <Vessel
                wear={wear}
                motion={motion}
                shadows={shadows}
                rigged={rigged}
                fallback={
                    <Humanoid
                        look={{ skin: npc.wear.skin, hair: npc.wear.hair, cloth: npc.wear.top, aura: npc.aura, build: npc.wear.build }}
                        low={low}
                        getSpeed={() => speed.current}
                    />
                }
            />
            <Html position={[0, 2.08, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
                <div ref={label} className="flex flex-col items-center gap-0.5" style={{ display: 'none' }}>
                    {marker && (
                        <span
                            className={`text-[18px] font-black leading-none drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] ${marker === 'offer' ? 'text-amber-300' : 'text-emerald-300'}`}
                            style={{ animation: 'tbth-bob 1.6s ease-in-out infinite' }}
                        >
                            {marker === 'offer' ? '!' : '?'}
                        </span>
                    )}
                    <div className="px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap font-medium border bg-black/70 border-white/20 text-white/95">
                        {npc.name}
                        <span className="text-white/45"> · {npc.title}</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

export default function Npcs({ markers, rigged = true, shadows = true, low = false }: { markers: Partial<Record<NpcId, NpcMarker>>; rigged?: boolean; shadows?: boolean; low?: boolean }) {
    return (
        <group>
            {NPCS.map((n) => (
                <Soul key={n.id} npc={n} marker={markers[n.id] ?? null} rigged={rigged} shadows={shadows} low={low} />
            ))}
        </group>
    );
}
