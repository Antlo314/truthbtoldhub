'use client';

/**
 * The wire between the game and the OS.
 *
 * Truth.OS is diegetic — it runs on a machine inside the world, so it should
 * know what the player knows. This hook mirrors real character/profile state
 * into the system store (gating wallpapers, feeding the tray and widgets) and
 * raises notifications when that state actually changes.
 *
 * It only ever READS game stores. Nothing here mutates progress, and no value
 * is invented: every field is read straight off the existing stores.
 */
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useOsSystem } from './osSystemStore';
import { OS_WALLPAPERS, isUnlocked, type GameSnapshot } from './osWallpapers';

function countOf(v: unknown): number {
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === 'object') return Object.keys(v as Record<string, unknown>).length;
    return 0;
}

export function useOsGameBridge(enabled: boolean) {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const setSnapshot = useOsSystem((s) => s.setSnapshot);
    const notify = useOsSystem((s) => s.notify);

    // Previous values, so we only announce genuine transitions
    const prev = useRef<GameSnapshot | null>(null);
    const announced = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!enabled) return;

        const snap: GameSnapshot = {
            soulPower: Number(profile?.soul_power ?? 0),
            tier: profile?.tier ?? null,
            isSupporter: !!profile?.is_supporter,
            sourceReturned: !!character?.sourceReturned,
            founderClaimed: !!character?.founderClaimed,
            discovered: countOf(character?.discovered),
        };

        setSnapshot(snap);

        const before = prev.current;
        prev.current = snap;
        // First pass just seeds the baseline — don't announce history on boot
        if (!before) return;

        if (snap.tier && snap.tier !== before.tier) {
            notify({
                title: `Tier — ${snap.tier}`,
                body: 'Your standing in the sanctum has changed.',
                accent: 'gold',
            });
        }

        if (snap.discovered > before.discovered) {
            const gained = snap.discovered - before.discovered;
            notify({
                title: gained === 1 ? 'New discovery recorded' : `${gained} discoveries recorded`,
                body: `${snap.discovered} in the ledger.`,
                accent: 'cyan',
            });
        }

        if (snap.sourceReturned && !before.sourceReturned) {
            notify({
                title: 'Return to the Source',
                body: 'A new wallpaper has been unlocked in Settings.',
                accent: 'gold',
            });
        }

        // Any wallpaper that just became available is worth surfacing once
        for (const w of OS_WALLPAPERS) {
            if (!w.unlock || announced.current.has(w.id)) continue;
            if (isUnlocked(w, snap) && !isUnlocked(w, before)) {
                announced.current.add(w.id);
                notify({
                    title: `Wallpaper unlocked — ${w.name}`,
                    body: w.unlock.label,
                    accent: w.accent,
                });
            }
        }
    }, [enabled, character, profile, setSnapshot, notify]);
}
