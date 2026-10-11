'use client';

/**
 * Aether shards — the collectible that gives the shelf a reason to be
 * walked. Twenty-four pieces of the Source, seeded in fixed places so
 * two souls can compare notes. Collection is remembered per browser;
 * nothing here touches the account (that would need the service-role
 * endpoints that own soul_power).
 */
import { create } from 'zustand';

const KEY = 'tbth-aether-shards-v1';

export type Shard = {
    id: string;
    x: number;
    z: number;
    /** metres above the ground the shard hovers */
    y: number;
    /** where it is, for the HUD line on pickup */
    place: string;
};

type ShardState = {
    collected: Record<string, number>;
    hydrated: boolean;
    /** last pickup — for the toast */
    last: { id: string; place: string; at: number } | null;
    hydrate: () => void;
    collect: (s: Shard) => boolean;
    count: () => number;
};

export const useShards = create<ShardState>((set, get) => ({
    collected: {},
    hydrated: false,
    last: null,
    hydrate: () => {
        if (get().hydrated || typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(KEY);
            set({ collected: raw ? (JSON.parse(raw) as Record<string, number>) : {}, hydrated: true });
        } catch {
            set({ hydrated: true });
        }
    },
    collect: (s) => {
        const { collected } = get();
        if (collected[s.id]) return false;
        const next = { ...collected, [s.id]: Date.now() };
        set({ collected: next, last: { id: s.id, place: s.place, at: Date.now() } });
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* */
        }
        return true;
    },
    count: () => Object.keys(get().collected).length,
}));
