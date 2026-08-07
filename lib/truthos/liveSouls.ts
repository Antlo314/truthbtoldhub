'use client';

/**
 * Live soul count — one real number, shared by every surface that claims
 * to show one.
 *
 * "Souls Live" on the Codex was `useState(5)`: a literal that no code
 * path ever updated, so the page reported five souls to an empty room
 * forever. This joins a Supabase presence channel and counts the keys
 * actually tracked on it.
 *
 * Returns `null` until the first sync, so callers can render a dash
 * instead of inventing a number while the channel is still connecting —
 * an honest "—" beats a confident wrong count.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const CHANNEL = 'sanctum-live-v1';

/** Stable per-tab identity, so a reload does not double-count a soul. */
function tabKey(): string {
    const KEY = 'tbth-live-key';
    try {
        const found = sessionStorage.getItem(KEY);
        if (found) return found;
        const made = `soul_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(KEY, made);
        return made;
    } catch {
        return `soul_${Math.random().toString(36).slice(2, 10)}`;
    }
}

export function useLiveSouls(): number | null {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        let alive = true;
        const channel = supabase.channel(CHANNEL, {
            config: { presence: { key: tabKey() } },
        });

        const sync = () => {
            if (!alive) return;
            setCount(Object.keys(channel.presenceState()).length);
        };

        channel
            .on('presence', { event: 'sync' }, sync)
            .on('presence', { event: 'join' }, sync)
            .on('presence', { event: 'leave' }, sync)
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() });
            });

        return () => {
            alive = false;
            void supabase.removeChannel(channel);
        };
    }, []);

    return count;
}
