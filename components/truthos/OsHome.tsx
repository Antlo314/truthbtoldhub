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
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { OsAppId } from './truthOsStore';
import { ACCENT_STYLES, OsIconTile, getAppAccent } from './OsIcon';
import { useOsSystem } from './osSystemStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';
import { HOUSE_FILMS } from '@/lib/truthos/houseCinemaFilms';
import { hutCompletion, HOUSE_CORE } from './house/stationProgress';

function greeting(h: number): string {
    if (h < 5) return 'Still awake';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

/** Ring gauge — used for soul power and progress */
function Ring({
    value,
    max,
    size = 62,
    stroke = 5,
    color = '#34d399',
    label,
}: {
    value: number;
    max: number;
    size?: number;
    stroke?: number;
    color?: string;
    label?: string;
}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
                />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[13px] font-semibold text-white tabular-nums">{value}</span>
                {label && (
                    <span className="text-[7px] uppercase tracking-[0.18em] text-white/45 mt-0.5">
                        {label}
                    </span>
                )}
            </span>
        </div>
    );
}

type TileProps = {
    app: OsAppId;
    title: string;
    /** Live value — the reason to look at the tile */
    value?: string | null;
    sub?: string | null;
    span?: string;
    tall?: boolean;
    onClick: () => void;
    children?: React.ReactNode;
};

function Tile({ app, title, value, sub, span, tall, onClick, children }: TileProps) {
    const a = ACCENT_STYLES[getAppAccent(app)];
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className={`group relative text-left rounded-2xl overflow-hidden border border-white/10 bg-white/[0.055] backdrop-blur-xl p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.42)] touch-manipulation w-full ${
                tall ? 'min-h-[168px]' : 'min-h-[112px]'
            } ${span || ''}`}
        >
            {/* Accent wash, strongest at the corner the icon sits in */}
            <span
                className={`pointer-events-none absolute inset-0 opacity-45 group-hover:opacity-70 transition-opacity bg-gradient-to-br ${a.tile}`}
                style={{ maskImage: 'radial-gradient(120% 100% at 0% 0%, black, transparent 70%)' }}
            />
            {/* Top hairline — the lit edge that makes it read as a raised pane */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

            <span className="relative flex items-start gap-2.5">
                <OsIconTile app={app} size={tall ? 'lg' : 'md'} />
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-white leading-tight truncate">
                        {title}
                    </span>
                    {sub && (
                        <span className="block text-[10.5px] text-white/55 leading-snug mt-0.5 line-clamp-2">
                            {sub}
                        </span>
                    )}
                </span>
                <ArrowUpRight
                    size={14}
                    className="shrink-0 text-white/25 group-hover:text-white/70 transition-colors"
                />
            </span>

            {value && (
                <span className="relative block mt-2.5 text-2xl font-semibold text-white tabular-nums tracking-tight">
                    {value}
                </span>
            )}
            {children && <span className="relative block mt-2.5">{children}</span>}
        </motion.button>
    );
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
        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-10">
            {/* ── Hero ── */}
            <div className="relative rounded-3xl overflow-hidden border border-white/12 bg-white/[0.05] backdrop-blur-2xl px-4 py-4 sm:px-6 sm:py-5 shadow-[0_14px_44px_rgba(0,0,0,0.45)]">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <span className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full bg-emerald-400/15 blur-3xl" />

                <div className="relative flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.34em] text-emerald-300/90 font-mono font-semibold">
                            {greeting(now.getHours())}
                            {name ? `, ${name}` : ''}
                        </p>
                        <h1 className="text-2xl sm:text-4xl font-semibold text-white mt-1 tracking-tight leading-none">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-white/35 text-base sm:text-xl font-normal ml-2.5">
                                {now.toLocaleDateString([], {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                        </h1>
                        {!email && (
                            <button
                                type="button"
                                onClick={onSignIn}
                                className="mt-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-[12px] font-bold min-h-[40px] shadow-[0_0_24px_rgba(52,211,153,0.35)] touch-manipulation"
                            >
                                Sign in to carry your soul across
                            </button>
                        )}
                        {email && profile?.tier && (
                            <p className="text-[11px] text-white/50 mt-1.5">
                                {profile.tier}
                                {isAdmin && (
                                    <span className="ml-2 text-rose-300 uppercase tracking-widest text-[9px]">
                                        Admin
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {email && (
                        <div className="flex items-center gap-4 shrink-0">
                            <Ring value={soul} max={soulTarget} label="soul" color="#fbbf24" />
                            <Ring
                                value={house.seen}
                                max={house.total}
                                label="house"
                                color="#22d3ee"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Live tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <Tile
                    app="truth"
                    title="Truth Guide"
                    sub="Ask. Or remain silent. Both are data."
                    span="col-span-2 sm:row-span-2"
                    tall
                    onClick={() => onLaunch('truth')}
                >
                    <span className="block text-[11px] text-white/60 leading-relaxed">
                        The hooded brother keeps his own counsel. He answers what you actually
                        ask.
                    </span>
                </Tile>

                <Tile
                    app="ledger"
                    title="Ledger"
                    value={email ? String(soul) : null}
                    sub={email ? 'soul power' : 'Daily Word · sign in'}
                    onClick={() => onLaunch('ledger')}
                />
                <Tile
                    app="chamber"
                    title="The House"
                    value={`${house.seen}/${house.total}`}
                    sub="stations found"
                    onClick={() => onLaunch('chamber')}
                />

                <Tile
                    app="updates"
                    title="Updates"
                    sub={bulletin?.title || 'No dispatches yet'}
                    span="col-span-2"
                    onClick={() => onLaunch('updates')}
                />

                <Tile
                    app="media"
                    title="Media"
                    value={String(HOUSE_FILMS.length)}
                    sub="reels in the cinema"
                    onClick={() => onLaunch('media')}
                />
                <Tile app="arcade" title="Arcade" sub="Three cabinets" onClick={() => onLaunch('arcade')} />
                <Tile app="archive" title="The Hall" sub="Community" onClick={() => onLaunch('archive')} />
                <Tile app="browser" title="Codex" sub="Study · records" onClick={() => onLaunch('browser')} />
                <Tile app="library" title="Library" sub="Scrolls · study" onClick={() => onLaunch('library')} />
                <Tile app="soul" title="Soul" sub="Vessel · identity" onClick={() => onLaunch('soul')} />
            </div>

            {/* ── Programs rail ── */}
            <div>
                <p className="text-[9px] uppercase tracking-[0.32em] text-white/45 font-mono mb-2 px-0.5 font-semibold">
                    Programs
                </p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {(
                        [
                            'browser',
                            'music',
                            'photos',
                            'terminal',
                            'files',
                            'tasks',
                            'clock',
                            'calculator',
                            'paint',
                            'notepad',
                            'taskmgr',
                            'settings',
                            'chamber',
                        ] as OsAppId[]
                    ).map((app) => (
                        <button
                            key={app}
                            type="button"
                            onClick={() => onLaunch(app)}
                            className="group shrink-0 w-[68px] flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/20 px-2 py-2.5 transition-colors touch-manipulation"
                        >
                            <OsIconTile app={app} size={phone ? 'md' : 'md'} />
                            <span className="text-[9.5px] text-white/70 group-hover:text-white capitalize truncate w-full text-center">
                                {app === 'taskmgr' ? 'Tasks' : app === 'chamber' ? 'Leave' : app}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
