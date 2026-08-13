'use client';

/**
 * Truth.OS home — greeting + live doors. Programs live in Start.
 */
import type { OsAppId } from './truthOsStore';
import { OsIconTile, getAppIconMeta } from './OsIcon';
import { useOsSystem } from './osSystemStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useLiveSouls } from '@/lib/truthos/liveSouls';
import { WALL_YEAR } from '@/lib/truthos/wallYear';
import { hutCompletion } from '@/components/truthos/house/stationProgress';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    const now = new Date();
    const souls = useLiveSouls();
    const [wallLine, setWallLine] = useState<string | null>(null);
    const [lead, setLead] = useState<string | null>(null);
    const house = hutCompletion();

    useEffect(() => {
        let alive = true;
        const year = WALL_YEAR();
        (async () => {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) {
                if (alive) setWallLine('The wall has a space.');
            } else {
                try {
                    const res = await fetch('/api/wall/me', { headers: { Authorization: `Bearer ${token}` } });
                    const json = await res.json();
                    if (alive) {
                        setWallLine(json.marked ? 'Your mark still stands.' : `The wall has a space for ${year}.`);
                    }
                } catch {
                    if (alive) setWallLine(null);
                }
            }
        })();
        fetch('/api/ticker')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!alive || !d) return;
                const raw = (d.breaking?.[0] as string | undefined) ?? null;
                if (!raw) return;
                const clean = raw.replace(/^[^\w"'(]+/, '').replace(/^BREAKING:\s*/i, '').trim();
                if (clean && !/unavailable|check back/i.test(clean)) setLead(clean);
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [email]);

    const name = character?.name?.trim() || profile?.display_name || null;
    const soul = snapshot.soulPower;

    const doors: { app: OsAppId; hint: string; value?: string | null }[] = [
        {
            app: 'archive',
            hint: souls === 1 ? 'you are the first here' : 'souls in the room',
            value: souls === null ? null : String(souls),
        },
        {
            app: 'chamber',
            hint: 'the house',
            value: `${house.seen}/${house.total}`,
        },
        {
            app: 'wall',
            hint: wallLine ?? 'one mark a year',
        },
    ];
    if (lead) {
        doors.push({ app: 'updates', hint: lead });
    }

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

            {email && (
                <p className="text-[12px] text-white/45">
                    <span className="text-white/80 font-medium tabular-nums">{soul}</span>
                    <span className="ml-1.5">soul power</span>
                </p>
            )}

            <ul className={phone ? 'grid grid-cols-1 gap-1' : 'flex flex-col gap-0.5 w-[280px]'}>
                {doors.map(({ app, hint, value }) => {
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
                                {value && (
                                    <span className="shrink-0 text-[11px] font-mono tabular-nums text-white/55">
                                        {value}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-mono">
                {phone ? 'Dock · Launchpad for the rest' : 'Start holds the rest · six folders'}
            </p>
        </div>
    );
}
