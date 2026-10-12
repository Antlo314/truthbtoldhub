'use client';

/**
 * Desktop widgets — the one "home" surface.
 *
 * Replaces the old greeting list, the widgets flyout and the desktop icon
 * rail: each widget shows something live and opens the app it belongs to.
 * Desktop: a column on the wallpaper, under the windows. Phone: the top of
 * the home screen, above the app grid.
 */
import { useEffect, useState } from 'react';
import { Flame, Newspaper, Users } from 'lucide-react';
import type { OsAppId, OsAppPayload } from './truthOsStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useLiveSouls } from '@/lib/truthos/liveSouls';
import { WALL_YEAR } from '@/lib/truthos/wallYear';
import { hutCompletion } from '@/components/truthos/house/stationProgress';
import { levelFor, titleFor } from '@/lib/world/quests';
import { fetchBulletins } from '@/lib/game/hut';
import { supabase } from '@/lib/supabase';
import { HouseTile, OsIconTile } from './OsIcon';
import { sacredUi } from '@/lib/game/sacredUiSfx';

function greeting(h: number): string {
    if (h < 5) return 'Still awake';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

function Card({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
    const cls = `block w-full rounded-[20px] border border-white/[0.12] bg-black/30 p-4 text-left shadow-[0_10px_40px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl ${className}`;
    if (!onClick) return <div className={cls}>{children}</div>;
    return (
        <button
            type="button"
            onClick={() => {
                sacredUi.click();
                onClick();
            }}
            className={`${cls} transition-[transform,background-color] hover:bg-black/40 active:scale-[0.985]`}
        >
            {children}
        </button>
    );
}

export default function OsWidgets({
    email,
    phone,
    onLaunch,
    onSignIn,
    onHouse,
}: {
    email: string | null;
    phone: boolean;
    onLaunch: (app: OsAppId, payload?: OsAppPayload) => void;
    onSignIn: () => void;
    onHouse?: () => void;
}) {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const souls = useLiveSouls();
    const [now, setNow] = useState(() => new Date());
    const [word, setWord] = useState<{ title: string; body?: string; section: 'dispatches' | 'word' } | null>(null);
    const [wallLine, setWallLine] = useState<string | null>(null);
    const house = hutCompletion();
    const wxp = character.world?.xp ?? 0;
    const wlv = levelFor(wxp);
    const worldLine = wxp > 0 ? `Level ${wlv} · ${titleFor(wlv)} · ${house.seen} of ${house.total} Lair rooms` : 'The Aether Plain · quests, creatures, live souls';

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let alive = true;
        // The newest dispatch if there is one; otherwise this morning's lead
        fetchBulletins(1)
            .then((rows) => {
                if (!alive) return;
                const b = rows[0];
                if (b) {
                    setWord({ title: b.title || 'Dispatch', body: b.body, section: 'dispatches' });
                    return;
                }
                return fetch('/api/ticker')
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => {
                        const raw = (d?.breaking?.[0] as string | undefined) ?? null;
                        const clean = raw?.replace(/^[^\w"'(]+/, '').replace(/^BREAKING:\s*/i, '').trim();
                        if (alive && clean && !/unavailable|check back/i.test(clean)) {
                            setWord({ title: clean, section: 'word' });
                        }
                    });
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;
        const year = WALL_YEAR();
        (async () => {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) {
                if (alive) setWallLine(`${year} has a space for you`);
                return;
            }
            try {
                const res = await fetch('/api/wall/me', { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (alive) setWallLine(json.marked ? 'Your mark stands' : `${year} has a space for you`);
            } catch {
                if (alive) setWallLine(null);
            }
        })();
        return () => {
            alive = false;
        };
    }, [email]);

    const name = character?.name?.trim() || profile?.display_name || null;
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className={phone ? 'space-y-3' : 'w-[320px] space-y-3'}>
            {/* Time and greeting */}
            <div className={phone ? 'px-1 pb-1 pt-2' : 'px-1 pb-2'}>
                <p className="text-[13px] font-medium text-white/80 drop-shadow">{date}</p>
                <p className={`${phone ? 'text-[64px]' : 'text-[72px]'} font-extralight leading-none tracking-tight text-white tabular-nums drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]`}>
                    {time}
                </p>
                <p className="mt-1.5 text-[15px] text-white/85 drop-shadow">
                    {greeting(now.getHours())}
                    {name ? `, ${name}` : ''}.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Soul */}
                <Card onClick={email ? () => onLaunch('settings', { section: 'account' }) : onSignIn}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-200/90">
                        <Flame size={13} /> Soul power
                    </div>
                    {email ? (
                        <>
                            <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-white tabular-nums">
                                {profile?.soul_power ?? '—'}
                            </p>
                            <p className="mt-1.5 truncate text-[11.5px] text-white/50">{profile?.tier || 'Seeker'}</p>
                        </>
                    ) : (
                        <>
                            <p className="mt-1.5 text-[15px] font-semibold text-white">Sign in</p>
                            <p className="mt-1 text-[11.5px] leading-snug text-white/50">Keep your power, your mark, your scores.</p>
                        </>
                    )}
                </Card>
                {/* Who is here */}
                <Card onClick={() => onLaunch('archive')}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-200/90">
                        <Users size={13} /> The Hall
                    </div>
                    <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-white tabular-nums">
                        {souls ?? '—'}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-white/50">{souls === 1 ? 'soul here — you' : 'souls here now'}</p>
                </Card>
            </div>

            {/* The word */}
            {word && (
                <Card onClick={() => onLaunch('ledger', { section: word.section })}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-200/90">
                        <Newspaper size={13} /> {word.section === 'dispatches' ? 'Latest dispatch' : 'The Daily Word'}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug text-white">{word.title}</p>
                    {word.body && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/55">{word.body}</p>}
                </Card>
            )}

            {/* The house and the wall */}
            <Card>
                <div className="space-y-2.5">
                    {onHouse && (
                        <button
                            type="button"
                            onClick={() => {
                                sacredUi.access();
                                onHouse();
                            }}
                            className="flex w-full items-center gap-3 text-left"
                        >
                            <HouseTile size={36} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] font-medium text-white">Enter the World</span>
                                <span className="block text-[11.5px] text-white/50">
                                    {worldLine}
                                </span>
                            </span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            sacredUi.click();
                            onLaunch('wall');
                        }}
                        className="flex w-full items-center gap-3 text-left"
                    >
                        <OsIconTile app="wall" size={36} />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-white">The Mark</span>
                            <span className="block truncate text-[11.5px] text-white/50">{wallLine ?? 'One mark a year'}</span>
                        </span>
                    </button>
                </div>
            </Card>
        </div>
    );
}
