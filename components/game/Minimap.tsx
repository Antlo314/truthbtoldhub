'use client';

import { useMemo } from 'react';
import { buildOverworld, MAP_W, MAP_H } from '@/lib/game/overworld';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { QuestWaypoint } from '@/lib/game/questWaypoint';
import { isDestinationPOI, isDestinationUnlocked } from '@/lib/game/progression';

interface Props {
    playerX: number;
    playerY: number;
    character: GameCharacter;
    questWaypoint?: QuestWaypoint | null;
    hutAlert?: boolean;
    size?: number;
}

export default function Minimap({ playerX, playerY, character, questWaypoint, hutAlert, size = 88 }: Props) {
    const ow = useMemo(() => buildOverworld(), []);
    const scale = size / MAP_W;

    const px = (playerX / 16) * scale;
    const py = (playerY / 16) * scale;

    const pois = ow.pois.filter((p) => {
        if (p.type === 'hut') return true;
        if (p.type === 'portal' || p.type === 'cave') return true;
        if (p.type === 'npc' && character.questsClaimed.length > 0) return true;
        return character.cleared.length > 0 || character.discovered.length > 0;
    });

    return (
        <div
            className="pointer-events-none rounded-xl border border-white/15 bg-black/55 backdrop-blur-sm overflow-hidden"
            style={{ width: size, height: size }}
            aria-label="World minimap"
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <rect width={size} height={size} fill="#0a1410" />
                {/* hut center */}
                <circle cx={ow.pois.find((p) => p.type === 'hut')!.x * scale} cy={ow.pois.find((p) => p.type === 'hut')!.y * scale} r={3} fill="#fbbf24" opacity={0.5} />
                {pois.map((p) => {
                    const cx = p.x * scale;
                    const cy = p.y * scale;
                    const color = p.type === 'hut' ? '#fbbf24' : p.type === 'portal' ? '#a855f7' : p.type === 'cave' ? '#22d3ee' : '#94a3b8';
                    const locked = isDestinationPOI(p.id) && !isDestinationUnlocked(p.id, character);
                    const discovered = !locked && (character.discovered.includes(p.id) || character.cleared.some((d) => d === p.id) || p.type === 'hut');
                    return (
                        <circle key={p.id} cx={cx} cy={cy} r={p.type === 'hut' ? 2.5 : 1.8} fill={locked ? '#52525b' : color} opacity={locked ? 0.25 : discovered ? 0.9 : 0.35} />
                    );
                })}
                {questWaypoint && (
                    <circle
                        cx={(questWaypoint.worldX / 16) * scale}
                        cy={(questWaypoint.worldY / 16) * scale}
                        r={3}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.8}
                    />
                )}
                <circle cx={px} cy={py} r={2.2} fill="#fff" />
                {hutAlert && (
                    <circle cx={ow.pois.find((p) => p.type === 'hut')!.x * scale} cy={(ow.pois.find((p) => p.type === 'hut')!.y - 2) * scale} r={2} fill="#ef4444" className="animate-pulse" />
                )}
            </svg>
        </div>
    );
}