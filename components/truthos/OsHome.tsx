'use client';

/**
 * Truth.OS home — a room, not a directory.
 *
 * Programs live in Start (Launchpad folders). The idle desktop greets you,
 * shows two live numbers, and offers at most three doors. That is the
 * breathing room: wallpaper, hour, and a way in — not twenty-one rows.
 */
import type { OsAppId } from './truthOsStore';
import { OsIconTile, getAppIconMeta } from './OsIcon';
import { useOsSystem } from './osSystemStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useLiveSouls } from '@/lib/truthos/liveSouls';
import { WALL_YEAR } from '@/lib/truthos/wallYear';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function greeting(h: number): string {
    if (h < 5) return 'Still awake';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

const RECENT: { app: OsAppId; hint: string }[] = [
    { app: 'archive', hint: 'gather' },
    { app: 'chamber', hint: 'the house' },
    { app: 'wall', hint: 'one mark a year' },
];

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
    const now = new Date();
    const souls = useLiveSouls();
    const [wallLine, setWallLine] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        const year = WALL_YEAR();
        (async () => {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) {
                if (alive) setWallLine('The wall has a space.');
                return;
            }
            try {
                const res = await fetch('/api/wall/me', { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (!alive) return;
                setWallLine(json.marked ? 'Your mark still stands.' : `The wall has a space for ${year}.`);
            } catch {
                if (alive) setWallLine(null);
            }
        })();
        return () => {
            alive = false;
        };
    }, [email]);

    const name = character?.name?.trim() || profile?.display_name || null;
    const soul = snapshot.soulPower;

    return (
        <div className={`flex flex-col gap-8 ${phone ? 'pt-2 pb-8' : 'pt-6 pb-10 max-w-md'}`}>
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

            <div className="flex items-baseline gap-6 text-white/45">
                {souls !== null && (
                    <p className="text-[12px]">
                        <span className="text-white/80 font-medium tabular-nums">{souls}</span>
                        <span className="ml-1.5">{souls === 1 ? 'soul here' : 'souls here'}</span>
                    </p>
                )}
                {email && (
                    <p className="text-[12px]">
                        <span className="text-white/80 font-medium tabular-nums">{soul}</span>
                        <span className="ml-1.5">soul power</span>
                    </p>
                )}
            </div>

            <ul className={phone ? 'grid grid-cols-1 gap-1' : 'flex flex-col gap-0.5 w-[248px]'}>
                {RECENT.map(({ app, hint }) => {
                    const meta = getAppIconMeta(app);
                    return (
                        <li key={app}>
                            <button
                                type="button"
                                onClick={() => onLaunch(app)}
                                className="group w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 border border-transparent hover:border-white/12 transition-colors touch-manipulation min-h-[44px]"
                            >
                                <OsIconTile app={app} size="md" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] text-white/90 group-hover:text-white leading-tight truncate">
                                        {meta.label}
                                    </span>
                                    <span className="block text-[10px] text-white/40 leading-tight truncate">
                                        {hint}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {wallLine && (
                <p className="text-[12px] text-amber-200/70">{wallLine}</p>
            )}

            <p className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-mono">
                {phone ? 'Dock · Launchpad for the rest' : 'Start holds the rest · six folders'}
            </p>
        </div>
    );
}
