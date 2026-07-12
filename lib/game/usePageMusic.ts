'use client';

import { useEffect } from 'react';
import { gameMusic, type BgmId } from '@/lib/game/music';

/**
 * Play a looping BGM on mount.
 * Intentionally does NOT hard-stop on unmount — the next route's playBgm
 * crossfades, so the awakening arc feels continuous instead of cut.
 */
export function usePageMusic(track: BgmId | null, enabled = true) {
    useEffect(() => {
        if (!enabled || !track) return;
        gameMusic.playBgm(track, { variant: gameMusic.pickVariant(track) });
    }, [track, enabled]);
}
