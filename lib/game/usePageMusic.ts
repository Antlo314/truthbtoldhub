'use client';

import { useEffect } from 'react';
import { gameMusic, type BgmId } from '@/lib/game/music';

/** Play a looping BGM on mount; fade out on unmount. */
export function usePageMusic(track: BgmId | null, enabled = true) {
    useEffect(() => {
        if (!enabled || !track) return;
        gameMusic.playBgm(track, { variant: gameMusic.pickVariant(track) });
        return () => gameMusic.stopBgm();
    }, [track, enabled]);
}