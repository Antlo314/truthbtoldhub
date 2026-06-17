import { supabase } from '@/lib/supabase';
import { PATH_BY_ID } from '@/lib/game/paths';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { worldEventDayKey } from '@/lib/game/worldEvents';

// ============================================================
//  CO-OP PRESENCE — souls who walked the cavern today (UTC).
//  Position pings live in character.lastWalk (game_state JSON).
// ============================================================

export interface WorldWalkPing {
    day: string;
    x: number;
    y: number;
    at: string;
}

export interface FellowSoul {
    /** Opaque short id for React keys — not the full user id. */
    id: string;
    name: string;
    aura: string;
    pathColor: string | null;
    bodyCol: number;
    bodyRow: number;
    x: number;
    y: number;
}

export interface WorldPresence {
    walkedToday: number;
    fellows: FellowSoul[];
}

export function worldPresenceDayKey(date = new Date()): string {
    return worldEventDayKey(date);
}

export function parseWalkPing(character: Partial<GameCharacter> | null | undefined): WorldWalkPing | null {
    const ping = character?.lastWalk;
    if (!ping || typeof ping.x !== 'number' || typeof ping.y !== 'number') return null;
    if (typeof ping.day !== 'string' || typeof ping.at !== 'string') return null;
    return ping;
}

export function isWalkToday(ping: WorldWalkPing | null, day = worldPresenceDayKey()): boolean {
    return !!ping && ping.day === day;
}

export function buildWalkPing(x: number, y: number, day = worldPresenceDayKey()): WorldWalkPing {
    return {
        day,
        x: Math.round(x),
        y: Math.round(y),
        at: new Date().toISOString(),
    };
}

export async function fetchWorldPresence(excludeUserId?: string | null): Promise<WorldPresence> {
    try {
        const qs = excludeUserId ? `?exclude=${encodeURIComponent(excludeUserId)}` : '';
        const res = await fetch(`/api/community/presence${qs}`, { cache: 'no-store' });
        if (!res.ok) return { walkedToday: 0, fellows: [] };
        return (await res.json()) as WorldPresence;
    } catch {
        return { walkedToday: 0, fellows: [] };
    }
}

export async function pingWorldWalk(x: number, y: number): Promise<boolean> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return false;

        const res = await fetch('/api/community/presence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ x: Math.round(x), y: Math.round(y) }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/** Map a raw game_state row into a fellow soul for the overworld. */
export function fellowFromGameRow(
    userId: string,
    character: Partial<GameCharacter>,
    profileName?: string | null,
): FellowSoul | null {
    const ping = parseWalkPing(character);
    if (!isWalkToday(ping) || !ping) return null;

    const path = character.path ? PATH_BY_ID[character.path] : null;
    const tile = character.appearance?.bodyTile;

    return {
        id: userId.slice(0, 8),
        name: character.name?.trim() || profileName?.trim() || 'Soul',
        aura: character.appearance?.aura || '#a78bfa',
        pathColor: path?.color ?? null,
        bodyCol: tile?.col ?? 1,
        bodyRow: tile?.row ?? 6,
        x: ping.x,
        y: ping.y,
    };
}