'use client';

/**
 * Numbers that rise off a blow — white for a strike, gold for one that
 * landed true, green for healing. Few at a time and short-lived, so each
 * is a plain drei <Html> with a CSS rise-and-fade.
 */
import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { onCombat } from '@/lib/world/combat';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';

type Floater = { id: number; x: number; y: number; z: number; text: string; kind: 'hit' | 'crit' | 'heal' | 'hurt' };

let nextId = 1;

export default function Floaters() {
    const [list, setList] = useState<Floater[]>([]);
    useEffect(() => {
        const add = (f: Omit<Floater, 'id'>) => {
            const id = nextId++;
            setList((l) => [...l.slice(-14), { ...f, id }]);
            window.setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 950);
        };
        return onCombat((e) => {
            if (e.type === 'hit') add({ x: e.x + (Math.random() - 0.5) * 0.4, y: e.y, z: e.z, text: String(e.amount), kind: e.crit ? 'crit' : 'hit' });
            else if (e.type === 'hurt' || e.type === 'heal') {
                const p = getWalkerPose();
                add({ x: p.x, y: p.y + 2.0, z: p.z, text: (e.type === 'heal' ? '+' : '−') + e.amount, kind: e.type });
            }
        });
    }, []);
    return (
        <>
            {list.map((f) => (
                <Html key={f.id} position={[f.x, f.y, f.z]} center style={{ pointerEvents: 'none' }} zIndexRange={[40, 0]}>
                    <span
                        className={`block select-none whitespace-nowrap font-black tabular-nums drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] ${
                            f.kind === 'crit' ? 'text-[22px] text-amber-300' : f.kind === 'heal' ? 'text-[15px] text-emerald-300' : f.kind === 'hurt' ? 'text-[16px] text-red-400' : 'text-[17px] text-white'
                        }`}
                        style={{ animation: 'tbth-float 0.95s ease-out forwards' }}
                    >
                        {f.kind === 'crit' ? `${f.text}!` : f.text}
                    </span>
                </Html>
            ))}
        </>
    );
}
