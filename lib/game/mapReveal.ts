// ============================================================
//  MAP REVEAL — chunk-based fog-of-war for destination maps.
//  Persisted via character.discovered as `{mapId}_reveal_{cx}_{cy}`.
// ============================================================

export type DestinationPoiKind =
    | 'lore' | 'chest' | 'health' | 'fight' | 'boss' | 'river' | 'tree'
    | 'npc' | 'spawn' | 'temptation' | 'crystal' | 'relic' | 'trap' | 'iron';

export interface DestinationMapPoi {
    id: string;
    gx: number;
    gy: number;
    kind: DestinationPoiKind;
    muted?: boolean;
    secret?: boolean;
    color?: string;
}

export interface DestinationMapGate {
    id: string;
    tiles: [number, number][];
    open: boolean;
}

export const MAP_REVEAL_CHUNK = 4;
export const MAP_REVEAL_RADIUS = 2;

export function mapRevealKey(mapId: string, cx: number, cy: number): string {
    return `${mapId}_reveal_${cx}_${cy}`;
}

export function parseMapRevealChunk(discoveredId: string, mapId: string): string | null {
    const prefix = `${mapId}_reveal_`;
    if (!discoveredId.startsWith(prefix)) return null;
    return discoveredId.slice(prefix.length);
}

export function exploredChunksFromDiscovered(discovered: string[], mapId: string): Set<string> {
    const out = new Set<string>();
    for (const d of discovered) {
        const ch = parseMapRevealChunk(d, mapId);
        if (ch) out.add(ch);
    }
    return out;
}

export function chunkCoords(gx: number, gy: number, chunkSize = MAP_REVEAL_CHUNK): { cx: number; cy: number } {
    return { cx: Math.floor(gx / chunkSize), cy: Math.floor(gy / chunkSize) };
}

export function chunksAroundTile(
    gx: number,
    gy: number,
    mapW: number,
    mapH: number,
    radius = MAP_REVEAL_RADIUS,
    chunkSize = MAP_REVEAL_CHUNK,
): string[] {
    const { cx: pcx, cy: pcy } = chunkCoords(gx, gy, chunkSize);
    const maxCx = Math.ceil(mapW / chunkSize) - 1;
    const maxCy = Math.ceil(mapH / chunkSize) - 1;
    const out: string[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const cx = pcx + dx;
            const cy = pcy + dy;
            if (cx < 0 || cy < 0 || cx > maxCx || cy > maxCy) continue;
            out.push(`${cx}_${cy}`);
        }
    }
    return out;
}

export function isTileExplored(explored: Set<string>, gx: number, gy: number, chunkSize = MAP_REVEAL_CHUNK): boolean {
    const { cx, cy } = chunkCoords(gx, gy, chunkSize);
    return explored.has(`${cx}_${cy}`);
}

export function initialRevealChunks(
    spawnGx: number,
    spawnGy: number,
    mapW: number,
    mapH: number,
    radius = 3,
): string[] {
    return chunksAroundTile(spawnGx, spawnGy, mapW, mapH, radius);
}

export function newRevealDiscoveries(
    mapId: string,
    gx: number,
    gy: number,
    explored: Set<string>,
    mapW: number,
    mapH: number,
): string[] {
    const added: string[] = [];
    for (const ch of chunksAroundTile(gx, gy, mapW, mapH)) {
        if (explored.has(ch)) continue;
        explored.add(ch);
        const [cx, cy] = ch.split('_').map(Number);
        added.push(mapRevealKey(mapId, cx, cy));
    }
    return added;
}