'use client';

import { useMemo } from 'react';
import {
    MAP_REVEAL_CHUNK,
    isTileExplored,
    type DestinationMapGate,
    type DestinationMapPoi,
    type DestinationPoiKind,
} from '@/lib/game/mapReveal';

export type { DestinationMapGate, DestinationMapPoi, DestinationPoiKind };

interface Props {
    label?: string;
    mapW: number;
    mapH: number;
    /** Terrain grid — each cell maps to a color via terrainColors */
    terrain: number[][];
    terrainColors: Record<number, string>;
    unexploredColor?: string;
    explored: Set<string>;
    /** Bump when explored set mutates (refs do not trigger re-renders). */
    exploredVersion?: number;
    playerX: number;
    playerY: number;
    tileSize?: number;
    pois?: DestinationMapPoi[];
    gates?: DestinationMapGate[];
    questWaypoint?: { gx: number; gy: number } | null;
    size?: number;
}

const POI_COLORS: Record<DestinationPoiKind, string> = {
    lore: '#fbbf24',
    chest: '#fcd34d',
    health: '#f87171',
    fight: '#fb923c',
    boss: '#ef4444',
    river: '#22d3ee',
    tree: '#34d399',
    npc: '#6ee7b7',
    spawn: '#a7f3d0',
    temptation: '#dc2626',
    crystal: '#22d3ee',
    relic: '#fbbf24',
    trap: '#f97316',
    iron: '#94a3b8',
};

function poiRadius(kind: DestinationPoiKind): number {
    if (kind === 'boss' || kind === 'tree' || kind === 'relic') return 2.2;
    if (kind === 'fight' || kind === 'crystal') return 1.8;
    return 1.4;
}

export default function DestinationMinimap({
    label,
    mapW,
    mapH,
    terrain,
    terrainColors,
    unexploredColor = '#050a08',
    explored,
    exploredVersion = 0,
    playerX,
    playerY,
    tileSize = 16,
    pois = [],
    gates = [],
    questWaypoint,
    size = 88,
}: Props) {
    const scale = size / mapW;

    const px = (playerX / tileSize) * scale;
    const py = (playerY / tileSize) * scale;

    const cells = useMemo(() => {
        const out: { x: number; y: number; fill: string }[] = [];
        for (let gy = 0; gy < mapH; gy++) {
            for (let gx = 0; gx < mapW; gx++) {
                const revealed = isTileExplored(explored, gx, gy, MAP_REVEAL_CHUNK);
                const tid = terrain[gy]?.[gx] ?? 0;
                out.push({
                    x: gx * scale,
                    y: gy * scale,
                    fill: revealed ? (terrainColors[tid] ?? '#1a2e1a') : unexploredColor,
                });
            }
        }
        return out;
    }, [mapW, mapH, terrain, terrainColors, explored, exploredVersion, scale, unexploredColor]);

    const visiblePois = pois.filter((p) => {
        if (p.secret && !isTileExplored(explored, p.gx, p.gy, MAP_REVEAL_CHUNK)) return false;
        return isTileExplored(explored, p.gx, p.gy, MAP_REVEAL_CHUNK);
    });

    return (
        <div
            className="relative pointer-events-none rounded-xl border border-white/15 bg-black/55 backdrop-blur-sm overflow-hidden"
            style={{ width: size, height: size }}
            aria-label={label ? `${label} minimap` : 'Area minimap'}
        >
            {label && (
                <p
                    className="absolute z-10 left-1.5 top-1 text-[6px] font-black uppercase tracking-[0.18em] text-white/45 pointer-events-none"
                    style={{ maxWidth: size - 8 }}
                >
                    {label}
                </p>
            )}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
                {cells.map((c, i) => (
                    <rect key={i} x={c.x} y={c.y} width={scale + 0.05} height={scale + 0.05} fill={c.fill} />
                ))}

                {gates.map((gate) => {
                    const gateExplored = gate.tiles.some(([gx, gy]) => isTileExplored(explored, gx, gy, MAP_REVEAL_CHUNK));
                    if (!gateExplored) return null;
                    return gate.tiles.map(([gx, gy], i) => (
                        <rect
                            key={`${gate.id}-${i}`}
                            x={gx * scale}
                            y={gy * scale}
                            width={scale + 0.05}
                            height={scale + 0.05}
                            fill={gate.open ? 'rgba(52,211,153,0.35)' : 'rgba(239,68,68,0.55)'}
                        />
                    ));
                })}

                {visiblePois.map((p) => {
                    const cx = (p.gx + 0.5) * scale;
                    const cy = (p.gy + 0.5) * scale;
                    const col = p.color ?? POI_COLORS[p.kind];
                    const r = poiRadius(p.kind);
                    const opacity = p.muted ? 0.35 : 0.92;
                    if (p.kind === 'lore') {
                        return (
                            <rect
                                key={p.id}
                                x={cx - r * 0.7}
                                y={cy - r * 0.7}
                                width={r * 1.4}
                                height={r * 1.4}
                                fill={col}
                                opacity={opacity}
                                transform={`rotate(45 ${cx} ${cy})`}
                            />
                        );
                    }
                    return (
                        <circle key={p.id} cx={cx} cy={cy} r={r} fill={col} opacity={opacity} />
                    );
                })}

                {questWaypoint && isTileExplored(explored, questWaypoint.gx, questWaypoint.gy, MAP_REVEAL_CHUNK) && (
                    <circle
                        cx={(questWaypoint.gx + 0.5) * scale}
                        cy={(questWaypoint.gy + 0.5) * scale}
                        r={2.8}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={0.9}
                        strokeDasharray="2 2"
                        opacity={0.85}
                    />
                )}

                <circle cx={px} cy={py} r={2.2} fill="#fff" stroke="#0a1410" strokeWidth={0.6} />
            </svg>
        </div>
    );
}