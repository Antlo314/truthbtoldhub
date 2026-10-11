'use client';

/**
 * Truth speaks when you arrive somewhere.
 *
 * Reads the walker's pose on a slow tick, and on a TRANSITION — through
 * the arch into the Processional, back into the Sanctum, into a chamber,
 * out to the Overlook — speaks the line for that place. Never on a tick
 * alone: standing in the Hall Circle for ten minutes earns one greeting,
 * not thirty.
 *
 * Every line is once-per-session (truthVoice remembers), so a player
 * walking Cinema → Hall → Cinema hears the Cinema line once. The lair
 * gets quieter as it gets familiar, which is how a guide should behave.
 *
 * Mounted from WorldHud because that component already ticks with the
 * pose and is present exactly when the player is walking.
 */
import { useEffect, useRef } from 'react';
import { getWalkerPose } from './walkerPose';
import { isOutdoors, PLACE_LINE, roomAt } from './homeMap';
import { speak } from '@/lib/truthVoice';

export function useTruthNarrator(enabled = true) {
    const last = useRef<{ out: boolean | null; place: string | null }>({ out: null, place: null });

    useEffect(() => {
        if (!enabled) return;
        const t = setInterval(() => {
            const p = getWalkerPose();
            const out = isOutdoors(p.x, p.z);
            const where = roomAt(p.x, p.z);
            const place = where.kind === 'room' || where.kind === 'grove' ? where.id : null;
            const prev = last.current;

            // First tick just records where we are — the tour handles the
            // welcome, and a page reload mid-lair should not re-greet.
            if (prev.out === null) {
                last.current = { out, place };
                return;
            }

            // Leaving the Sanctum for the first time, and coming home after
            if (out && !prev.out && PLACE_LINE.processional) void speak(PLACE_LINE.processional);
            if (!out && prev.out) void speak('return_home');
            // Arriving somewhere with a line of its own (a chamber, the Overlook)
            if (place && place !== prev.place && place !== 'processional' && PLACE_LINE[place]) void speak(PLACE_LINE[place]);

            last.current = { out, place };
        }, 700);
        return () => clearInterval(t);
    }, [enabled]);
}
