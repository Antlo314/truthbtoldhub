/**
 * Live multiplayer for the Truth.OS house.
 * Supabase Realtime Presence with hard stale filtering (no ghost souls).
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
};

export type HousePresenceApi = {
    channel: RealtimeChannel;
    track: (pose: Omit<HousePeer, 'id' | 'at'>) => void;
    leave: () => Promise<void>;
};

/** Bump channel to drop any legacy ghost keys from older builds */
const CHANNEL = 'truthos-house-v3';
/** Peers without a fresh heartbeat vanish (ms) */
const STALE_MS = 9000;
const HEARTBEAT_MS = 2500;

export async function joinHousePresence(
    selfId: string,
    initial: Omit<HousePeer, 'id' | 'at'>,
    onSync: (peers: HousePeer[]) => void,
): Promise<HousePresenceApi | null> {
    try {
        const channel = supabase.channel(CHANNEL, {
            config: { presence: { key: selfId } },
        });

        const publish = () => {
            const now = Date.now();
            const state = channel.presenceState<Omit<HousePeer, 'id'> & { at?: number }>();
            const peers: HousePeer[] = [];
            for (const [key, metas] of Object.entries(state)) {
                if (key === selfId) continue;
                // Prefer freshest meta if multiple
                let best: (Omit<HousePeer, 'id'> & { at?: number }) | null = null;
                for (const m of metas) {
                    if (!best || (m.at ?? 0) > (best.at ?? 0)) best = m;
                }
                if (!best) continue;
                const at = typeof best.at === 'number' ? best.at : 0;
                // Hard drop stale / never-timestamped ghosts
                if (!at || now - at > STALE_MS) continue;
                peers.push({
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
                });
            }
            onSync(peers);
        };

        channel
            .on('presence', { event: 'sync' }, publish)
            .on('presence', { event: 'join' }, publish)
            .on('presence', { event: 'leave' }, publish);

        let lastPose: Omit<HousePeer, 'id' | 'at'> = { ...initial };
        let alive = true;

        await new Promise<void>((resolve) => {
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ ...lastPose, at: Date.now() });
                    resolve();
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    resolve();
                }
            });
        });

        // Heartbeat keeps self fresh; re-filters others so ghosts expire
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
