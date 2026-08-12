'use client';

/**
 * Truth.OS home.
 *
 * The old home was a grid of identical cards carrying a static one-line blurb —
 * every tile the same weight, nothing on it true. This replaces it with a
 * layout that has a hierarchy and shows live state: a hero strip that greets
 * you by the actual hour, and tiles that read real values (soul power, tier,
 * discoveries, the latest dispatch, reel count) so the desktop tells you
 * something instead of describing itself.
 *
 * Tiles vary in size and treatment on purpose — a flat uniform grid is what
 * made it look plain.
 */
import { useEffect, useState } from 'react';
import type { OsAppId } from './truthOsStore';
import OsAppList from './OsAppList';
import { useOsSystem } from './osSystemStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';
import { HOUSE_FILMS } from '@/lib/truthos/houseCinemaFilms';
import { hutCompletion, HOUSE_CORE } from './house/stationProgress';
import { useLiveSouls } from '@/lib/truthos/liveSouls';

function greeting(h: number): string {
    if (h < 5) return 'Still awake';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

export default function OsHome({
    email,
    isAdmin,
    phone,
    onLaunch,
    onSignIn,
}: {
    email: string | null;
    isAdmin: boolean;
    phone: boolean;
    onLaunch: (app: OsAppId) => void;
    onSignIn: () => void;
}) {
    const snapshot = useOsSystem((s) => s.snapshot);
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const [now, setNow] = useState(() => new Date());
    const [bulletin, setBulletin] = useState<Bulletin | null>(null);
    /** Real house progress — stations this soul has actually opened. */
    const [house, setHouse] = useState({ seen: 0, total: HOUSE_CORE.length });
    /** Live souls on the channel — the one number that says 'people are here'. */
    const souls = useLiveSouls();

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 20_000);
        setHouse(hutCompletion());
        fetchBulletins(1)
            .then((b) => setBulletin(b[0] ?? null))
            .catch(() => setBulletin(null));
        return () => clearInterval(t);
    }, []);

    const name = character?.name?.trim() || profile?.display_name || null;
    const soul = snapshot.soulPower;
    // Next round hundred, so the ring always has somewhere to go
    const soulTarget = Math.max(100, Math.ceil((soul + 1) / 100) * 100);

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* One quiet line, not a hero pane: who, when, and the only two
                numbers that are actually live. */}
            <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-[10px] uppercase tracking-[0.34em] text-emerald-300/90 font-mono font-semibold">
                    {greeting(now.getHours())}
                    {name ? `, ${name}` : ''}
                </p>
                <p className="text-[13px] text-white/55 tabular-nums">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-white/30 ml-2">
                        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </p>
                {email && profile?.tier && (
                    <p className="text-[11px] text-white/40">
                        {profile.tier}
                        {isAdmin && (
                            <span className="ml-2 text-rose-300 uppercase tracking-widest text-[9px]">Admin</span>
                        )}
                    </p>
                )}
                {!email && (
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-[11px] font-bold min-h-[36px] touch-manipulation"
                    >
                        Sign in
                    </button>
                )}
            </div>

            {/* The list. Live values ride their own row instead of each one
                claiming a coloured pane of its own. */}
            <OsAppList
                phone={phone}
                email={email}
                onLaunch={onLaunch}
                rows={[
                    {
                        app: 'archive',
                        hint: souls === null ? 'gather with other souls' : souls === 1 ? 'you are the first here' : 'souls in the room',
                        value: souls === null ? null : String(souls),
                    },
                    { app: 'truth', hint: 'guide' },
                    { app: 'chamber', hint: 'the house', value: `${house.seen}/${house.total}` },
                    { app: 'ledger', hint: 'daily word', value: email ? String(soul) : null, gated: true },
                    { app: 'updates', hint: bulletin?.title ? 'new dispatch' : 'dispatches' },
                    { app: 'media', group: 'Rooms', hint: 'cinema', value: String(HOUSE_FILMS.length) },
                    { app: 'arcade', hint: 'three cabinets', gated: true },
                    { app: 'library', hint: 'scrolls' },
                    { app: 'soul', hint: 'vessel', gated: true },
                    { app: 'browser', group: 'Tools', hint: 'codex · web' },
                    { app: 'music', hint: 'sound' },
                    { app: 'photos', hint: 'images' },
                    { app: 'files', hint: 'documents' },
                    { app: 'notepad', hint: 'notes' },
                    { app: 'paint', hint: 'canvas' },
                    { app: 'calculator', hint: 'sums' },
                    { app: 'tasks', hint: 'to-do' },
                    { app: 'clock', hint: 'time' },
                    { app: 'terminal', hint: 'console' },
                    { app: 'taskmgr', hint: 'system' },
                    { app: 'settings', hint: 'preferences' },
                ]}
            />
        </div>
    );
}
