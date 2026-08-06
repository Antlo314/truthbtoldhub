'use client';

/**
 * Sound, on one button, everywhere.
 *
 * There was no way to silence this thing. The Settings switch only
 * reached `gameMusic` — the hub controller that actually scores the OS,
 * the house and the arcade was never touched by it, so "music off" did
 * not turn the music off. Opening the site was a commitment.
 *
 * This mounts in the shell, so it exists on every route including the
 * 3D world, and it drives BOTH controllers. The choice persists, and it
 * is applied on mount before anything can start — so a muted visitor
 * stays muted through a reload rather than getting one blast of theme
 * before the setting catches up.
 *
 * Deliberately small and low-contrast until hovered: it should be
 * findable in a second and invisible the rest of the time.
 */
import { useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { loadSettings, saveSettings } from '@/lib/game/settings';

/** Silence (or restore) every audio controller in the app. */
async function applyEverywhere(muted: boolean) {
    try {
        const { hubAudio } = await import('@/lib/truthos/hubAudio');
        hubAudio.setMuted(muted);
    } catch {
        /* controller not loaded on this route — nothing to silence */
    }
    try {
        const { gameMusic } = await import('@/lib/game/music');
        gameMusic.setMuted(muted);
    } catch {
        /* same */
    }
}

export default function SoundToggle() {
    const [on, setOn] = useState(true);
    const [ready, setReady] = useState(false);

    // Read the stored preference and enforce it immediately
    useEffect(() => {
        const enabled = loadSettings().music !== false;
        setOn(enabled);
        setReady(true);
        void applyEverywhere(!enabled);
    }, []);

    // Keep enforcing for a few seconds after load: audio controllers are
    // lazily imported by whichever surface needs them, so one call at
    // mount can land before the controller that will start the music
    // even exists.
    useEffect(() => {
        if (!ready || on) return;
        const t = window.setInterval(() => void applyEverywhere(true), 1200);
        const stop = window.setTimeout(() => window.clearInterval(t), 8000);
        return () => {
            window.clearInterval(t);
            window.clearTimeout(stop);
        };
    }, [ready, on]);

    const toggle = useCallback(() => {
        setOn((prev) => {
            const next = !prev;
            saveSettings({ music: next });
            void applyEverywhere(!next);
            return next;
        });
    }, []);

    // M mutes, the way it does in every game
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            const tag = el?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'm' || e.key === 'M') toggle();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle]);

    return (
        <button
            type="button"
            onClick={toggle}
            title={`${on ? 'Mute' : 'Unmute'} all sound  ·  M`}
            aria-label={on ? 'Mute all sound' : 'Unmute all sound'}
            aria-pressed={!on}
            className={`fixed z-[9999] flex items-center justify-center rounded-full border backdrop-blur-md transition-all active:scale-95 ${
                on
                    ? 'border-white/15 bg-black/40 text-white/45 hover:text-white hover:border-white/35 hover:bg-black/70'
                    : 'border-rose-400/50 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
            }`}
            style={{
                top: 'max(0.6rem, env(safe-area-inset-top, 0px))',
                right: 'max(0.6rem, env(safe-area-inset-right, 0px))',
                width: 36,
                height: 36,
            }}
        >
            {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
    );
}
