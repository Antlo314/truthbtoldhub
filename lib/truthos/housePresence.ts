/**
 * Live multiplayer for the Truth.OS house.
 * Supabase Realtime Presence — souls see each other while walking.
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
};

export type HousePresenceApi = {
    channel: RealtimeChannel;
    /** Push local pose (throttled by caller) */
    track: (pose: Omit<HousePeer, 'id'>) => void;
    /** Leave cleanly */
    leave: () => Promise<void>;
};

const CHANNEL = 'truthos-house-v1';

export async function joinHousePresence(
    selfId: string,
    initial: Omit<HousePeer, 'id'>,
    onSync: (peers: HousePeer[]) => void,
): Promise<HousePresenceApi | null> {
    try {
        const channel = supabase.channel(CHANNEL, {
            config: { presence: { key: selfId } },
        });

        const publish = () => {
            const state = channel.presenceState<Omit<HousePeer, 'id'>>();
            const peers: HousePeer[] = [];
            for (const [key, metas] of Object.entries(state)) {
                if (key === selfId) continue;
                const m = metas[0];
                if (!m) continue;
                peers.push({
                    id: key,
                    name: m.name || 'Soul',
                    aura: m.aura || '#a78bfa',
                    skin: typeof m.skin === 'number' ? m.skin : 6,
                    build: m.build === 'fem' ? 'fem' : 'masc',
                    x: m.x ?? 0,
                    y: m.y ?? 0,
                    z: m.z ?? 0,
                    yaw: m.yaw ?? 0,
                });
            }
            onSync(peers);
        };

        channel
            .on('presence', { event: 'sync' }, publish)
            .on('presence', { event: 'join' }, publish)
            .on('presence', { event: 'leave' }, publish);

        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ ...initial, at: Date.now() });
            }
        });

        return {
            channel,
            track: (pose) => {
                void channel.track({ ...pose, at: Date.now() });
            },
            leave: async () => {
                await channel.untrack();
                await supabase.removeChannel(channel);
            },
        };
    } catch (e) {
        console.warn('[housePresence] join failed', e);
        return null;
    }
}
