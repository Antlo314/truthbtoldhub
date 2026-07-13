/**
 * Live multiplayer + past echoes for Truth.OS House.
 * LIVE  = currently heartbeating peers
 * GHOST = last known footprints of souls who left (local memory, not invented NPCs)
 */
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type HousePeer = {
    id: string;
    name: string;
    aura: string;
    skin: number;
    build: 'masc' | 'fem';
    x: number;
    y: number;
    z: number;
    yaw: number;
    at: number;
    /** live = online now · ghost = remembered footprint */
    kind: 'live' | 'ghost';
};

export type HousePresenceApi = {
    channel: RealtimeChannel;
    track: (pose: Omit<HousePeer, 'id' | 'at' | 'kind'>) => void;
    leave: () => Promise<void>;
};

const CHANNEL = 'truthos-house-v4';
const STALE_MS = 8000;
const HEARTBEAT_MS = 2200;
const ECHO_KEY = 'tbth-house-echoes-v1';
const ECHO_MAX = 14;
const ECHO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type EchoRecord = Omit<HousePeer, 'kind'>;

function loadEchoes(): EchoRecord[] {
    try {
        const raw = localStorage.getItem(ECHO_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw) as EchoRecord[];
        const now = Date.now();
        return list.filter((e) => e.at && now - e.at < ECHO_TTL_MS).slice(0, ECHO_MAX);
    } catch {
        return [];
    }
}

function saveEchoes(list: EchoRecord[]) {
    try {
        localStorage.setItem(ECHO_KEY, JSON.stringify(list.slice(0, ECHO_MAX)));
    } catch {
        /* */
    }
}

/** Upsert a departed soul as a ghost footprint */
export function rememberEcho(peer: Omit<HousePeer, 'kind'>) {
    const list = loadEchoes().filter((e) => e.id !== peer.id);
    list.unshift({ ...peer, at: peer.at || Date.now() });
    saveEchoes(list);
}

export function getGhostEchoes(excludeIds: Set<string>): HousePeer[] {
    return loadEchoes()
        .filter((e) => !excludeIds.has(e.id))
        .map((e) => ({ ...e, kind: 'ghost' as const }));
}

export async function joinHousePresence(
    selfId: string,
    initial: Omit<HousePeer, 'id' | 'at' | 'kind'>,
    onSync: (peers: HousePeer[]) => void,
): Promise<HousePresenceApi | null> {
    try {
        const channel = supabase.channel(CHANNEL, {
            config: { presence: { key: selfId } },
        });

        const publish = () => {
            const now = Date.now();
            const state = channel.presenceState<
                Omit<HousePeer, 'id' | 'kind'> & { at?: number }
            >();
            const live: HousePeer[] = [];
            const liveIds = new Set<string>();

            for (const [key, metas] of Object.entries(state)) {
                if (key === selfId) continue;
                let best: (Omit<HousePeer, 'id' | 'kind'> & { at?: number }) | null = null;
                for (const m of metas) {
                    if (!best || (m.at ?? 0) > (best.at ?? 0)) best = m;
                }
                if (!best) continue;
                const at = typeof best.at === 'number' ? best.at : 0;
                if (!at || now - at > STALE_MS) continue;

                liveIds.add(key);
                live.push({
                    id: key,
                    name: best.name || 'Soul',
                    aura: best.aura || '#a78bfa',
                    skin: typeof best.skin === 'number' ? best.skin : 6,
                    build: best.build === 'fem' ? 'fem' : 'masc',
                    x: best.x ?? 0,
                    y: best.y ?? 0,
                    z: best.z ?? 0,
                    yaw: best.yaw ?? 0,
                    at,
                    kind: 'live',
                });
            }

            // Remember live poses so they become ghosts when they leave
            for (const p of live) {
                rememberEcho({
                    id: p.id,
                    name: p.name,
                    aura: p.aura,
                    skin: p.skin,
                    build: p.build,
                    x: p.x,
                    y: p.y,
                    z: p.z,
                    yaw: p.yaw,
                    at: p.at,
                });
            }

            // Only LIVE peers in the world — no ghost NPCs, no echoes as bodies
            onSync(live);
        };

        channel
            .on('presence', { event: 'sync' }, publish)
            .on('presence', { event: 'join' }, publish)
            .on('presence', { event: 'leave' }, publish);

        let lastPose: Omit<HousePeer, 'id' | 'at' | 'kind'> = { ...initial };
        let alive = true;

        await new Promise<void>((resolve) => {
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ ...lastPose, at: Date.now() });
                    // Show ghosts immediately even if no one else is live
                    publish();
                    resolve();
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    onSync([]);
                    resolve();
                }
            });
        });

        const beat = window.setInterval(() => {
            if (!alive) return;
            void channel.track({ ...lastPose, at: Date.now() });
            publish();
        }, HEARTBEAT_MS);

        return {
            channel,
            track: (pose) => {
                lastPose = { ...pose };
                void channel.track({ ...pose, at: Date.now() });
            },
            leave: async () => {
                alive = false;
                window.clearInterval(beat);
                try {
                    await channel.untrack();
                } catch {
                    /* */
                }
                try {
                    await supabase.removeChannel(channel);
                } catch {
                    /* */
                }
                onSync([]);
            },
        };
    } catch (e) {
        console.warn('[housePresence] join failed', e);
        onSync([]);
        return null;
    }
}
