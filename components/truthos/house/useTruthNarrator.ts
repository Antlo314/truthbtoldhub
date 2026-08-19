'use client';

/**
 * Truth speaks when you arrive somewhere.
 *
 * Reads the walker's pose on a slow tick, and on a TRANSITION — inside
 * to outside, outside to inside, entering a destination ring — speaks
 * the line for that place. Never on a tick alone: standing still in the
 * Hall Circle for ten minutes earns one greeting, not thirty.
 *
 * Every line is once-per-session (truthVoice remembers), so a player
 * walking Cinema → Hall → Cinema hears the Cinema line once. The house
 * gets quieter as it gets familiar, which is how a guide should behave.
 *
 * Mounted from WorldHud because that component already ticks with the
 * pose and is present exactly when the player is walking.
 */
import { useEffect, useRef } from 'react';
import { getWalkerPose } from './walkerPose';
import { isOutdoors, roomAt } from './homeMap';
import { speak } from '@/lib/truthVoice';

/** destination id → voice line id */
const DEST_LINE: Record<string, string> = {
    cinema: 'dest_cinema',
    hall: 'dest_hall',
    soul_mirror: 'dest_soul_mirror',
    studio: 'dest_studio',
};

export function useTruthNarrator(enabled = true) {
    const last = useRef<{ out: boolean | null; dest: string | null }>({ out: null, dest: null });

    useEffect(() => {
        if (!enabled) return;
        const t = setInterval(() => {
            const p = getWalkerPose();
            const out = isOutdoors(p.x, p.z);
            const place = roomAt(p.x, p.z);
            const dest = place.kind === 'grove' ? place.id : null;
            const prev = last.current;

            // First tick just records where we are — the tour handles the
            // welcome, and a page reload mid-jungle should not re-greet.
            if (prev.out === null) {
                last.current = { out, dest };
                return;
            }

            if (out && !prev.out) void speak('world_leave');
            if (!out && prev.out) void speak('return_home');
            if (dest && dest !== prev.dest && DEST_LINE[dest]) void speak(DEST_LINE[dest]);

            last.current = { out, dest };
        }, 700);
        return () => clearInterval(t);
    }, [enabled]);
}
