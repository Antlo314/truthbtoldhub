'use client';

/**
 * What you see while you walk the plain. Top left, the soul: level, name,
 * vitality, breath and spirit, and the quests under way beneath it. Top
 * centre, where you are and which way the work lies. Top right, the hour
 * and the sky, who else is here, and the doors: journal, bag, skills, map,
 * menu, Truth.OS. Bottom, the quick belt and the line to the next level.
 * Reads the walker pose on a timer — nothing here re-renders at frame rate.
 */
import { useEffect, useState } from 'react';
import { Backpack, BookOpen, Cloud, CloudFog, CloudRain, CloudSun, Map as MapIcon, Menu, Monitor, Moon, Sun, Users } from 'lucide-react';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { formatClock, useWorldTime, type Weather } from '@/components/truthos/house/worldTime';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { landmark, placeAt, type PlaceId } from '@/lib/world/terrain';
import { CAIRNS, npc, pickups } from '@/lib/world/plain';
import { activeQuests, currentStep, type WorldProgress } from '@/lib/world/quests';
import { questTargets, type QuestTarget } from '@/lib/world/questLogic';
import { enemySpawns } from '@/lib/world/enemies';
import type { Stats } from '@/lib/world/stats';
import { npcPosition } from './Npcs';
import PlayerFrame from './PlayerFrame';
import QuickBelt from './QuickBelt';
import type { JournalTab } from './Journal';

const COMPASS_FOV = 1.2;

export type HudToast = { id: number; text: string; tone: 'quest' | 'xp' | 'level' | 'find' | 'info' | 'warn' };

function nearestOf<T extends { x: number; z: number }>(list: T[], px: number, pz: number): T | null {
    let best: T | null = null;
    let bd = Infinity;
    for (const p of list) {
        const d = Math.hypot(p.x - px, p.z - pz);
        if (d < bd) {
            bd = d;
            best = p;
        }
    }
    return best;
}

function targetPoint(t: QuestTarget, px: number, pz: number): { x: number; z: number } | null {
    if (t.npc) return npcPosition(t.npc);
    if (t.place) {
        const c = CAIRNS.find((c) => c.id === t.place);
        if (c) return c;
        const l = landmark(t.place as PlaceId);
        return l ? { x: l.x, z: l.z } : null;
    }
    if (t.item) return nearestOf(pickups().filter((p) => p.kind === t.item), px, pz);
    if (t.enemy) return nearestOf(enemySpawns().filter((e) => e.kind === t.enemy), px, pz);
    return null;
}

const WEATHER_LABEL: Record<Weather, string> = { clear: 'Clear', cloudy: 'Cloudy', overcast: 'Overcast', rain: 'Rain', fog: 'Fog' };

function SkyIcon({ weather }: { weather: Weather }) {
    const night = getSky().daylight < 0.25;
    const cls = 'h-3.5 w-3.5';
    if (weather === 'rain') return <CloudRain className={`${cls} text-sky-300`} />;
    if (weather === 'fog') return <CloudFog className={`${cls} text-slate-300`} />;
    if (weather === 'overcast') return <Cloud className={`${cls} text-slate-300`} />;
    if (weather === 'cloudy') return <CloudSun className={`${cls} text-amber-200`} />;
    return night ? <Moon className={`${cls} text-indigo-200`} /> : <Sun className={`${cls} text-amber-300`} />;
}

function IconBtn({ label, onClick, children, hint }: { label: string; onClick: () => void; children: React.ReactNode; hint?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={hint ? `${label} (${hint})` : label}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-black/55 text-white/80 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
        >
            {children}
        </button>
    );
}

export default function PlainHud({
    visible,
    compact,
    world,
    stats,
    name,
    liveCount,
    toasts,
    meditate,
    fasting,
    kingdom,
    onOpenOs,
    onMap,
    onJournal,
    onUseBelt,
}: {
    visible: boolean;
    compact: boolean;
    world: WorldProgress;
    stats: Stats;
    name: string;
    liveCount: number;
    toasts: HudToast[];
    /** 0..1 while standing still in a meditation spot */
    meditate: number | null;
    fasting: { left: number; secret: boolean } | null;
    kingdom: boolean;
    onOpenOs: () => void;
    onMap: () => void;
    onJournal: (tab: JournalTab) => void;
    onUseBelt: (slot: number) => void;
}) {
    const hour = useWorldTime((s) => s.hour);
    const weather = useWorldTime((s) => s.weather);
    const setPaused = useHouseUi((s) => s.setPaused);
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 250);
        return () => clearInterval(t);
    }, []);
    if (!visible) return null;

    const pose = getWalkerPose();
    const place = placeAt(pose.x, pose.z);
    const quests = activeQuests(world);
    const targets = questTargets(world);
    const facing = Math.atan2(-Math.sin(pose.yaw), -Math.cos(pose.yaw));
    const top = 'calc(0.55rem + env(safe-area-inset-top, 0px))';

    return (
        <div className="pointer-events-none absolute inset-0 z-[45] select-none">
            {/* the soul */}
            <div className="absolute left-3" style={{ top }}>
                <PlayerFrame name={name} stats={stats} coins={world.coins ?? 0} fasting={fasting} kingdom={kingdom} compact={compact} />
                {quests.length > 0 && (
                    <div className={`mt-2 space-y-1.5 ${compact ? 'w-[200px]' : 'w-[260px]'}`}>
                        {quests.slice(0, compact ? 1 : 3).map((q) => {
                            const s = currentStep(q, world);
                            const p = world.quests[q.id];
                            let count = '';
                            if (s?.kind === 'gather') count = ` ${p?.n?.[s.item] ?? 0}/${s.n}`;
                            if (s?.kind === 'kill') count = ` ${p?.n?.[s.enemy] ?? 0}/${s.n}`;
                            if (s?.kind === 'visitAll') count = ` ${s.places.filter((pl) => p?.n?.[pl]).length}/${s.places.length}`;
                            return (
                                <div key={q.id} className="rounded-xl border border-amber-300/20 bg-black/50 px-3 py-2 backdrop-blur-md">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">{q.name}</p>
                                    <p className="mt-0.5 text-[12px] leading-snug text-white/85">
                                        {s?.text}
                                        <span className="tabular-nums text-amber-200">{count}</span>
                                    </p>
                                    {s && (s.kind === 'talk' || s.kind === 'deliver') && <p className="mt-0.5 text-[10px] text-white/40">{npc(s.npc).title}</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* where, and which way */}
            <div className="absolute inset-x-0 top-0 flex justify-center px-3" style={{ paddingTop: compact ? 'calc(7.6rem + env(safe-area-inset-top, 0px))' : top }}>
                <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-full border border-white/12 bg-black/50 px-3 py-1.5 shadow-xl backdrop-blur-md">
                        <p className="max-w-[240px] truncate text-center text-[12px] font-medium tracking-wide text-white/90">{place.name}</p>
                    </div>
                    <div className="relative h-5 w-[200px] overflow-hidden rounded-full border border-white/12 bg-black/45 backdrop-blur-md">
                        {(['N', 'E', 'S', 'W'] as const).map((c, i) => {
                            const ang = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][i];
                            let rel = facing - ang;
                            while (rel > Math.PI) rel -= Math.PI * 2;
                            while (rel < -Math.PI) rel += Math.PI * 2;
                            if (Math.abs(rel) > COMPASS_FOV) return null;
                            return (
                                <span key={c} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-white/55" style={{ left: `${50 + (rel / COMPASS_FOV) * 46}%` }}>
                                    {c}
                                </span>
                            );
                        })}
                        <span className="absolute bottom-0 left-1/2 h-1 w-px -translate-x-1/2 bg-white/60" />
                        {targets.map((t, i) => {
                            const p = targetPoint(t, pose.x, pose.z);
                            if (!p) return null;
                            let rel = facing - Math.atan2(p.x - pose.x, p.z - pose.z);
                            while (rel > Math.PI) rel -= Math.PI * 2;
                            while (rel < -Math.PI) rel += Math.PI * 2;
                            const behind = Math.abs(rel) > COMPASS_FOV;
                            const x = behind ? Math.sign(rel) * 0.96 : (rel / COMPASS_FOV) * 0.92;
                            return (
                                <span
                                    key={`${t.questId}-${i}`}
                                    className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ${t.enemy ? (behind ? 'bg-red-400/40' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]') : behind ? 'bg-amber-300/40' : 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]'}`}
                                    style={{ left: `${50 + x * 50}%` }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* the hour, the sky, the doors */}
            <div className="pointer-events-auto absolute right-3 flex flex-col items-end gap-1.5" style={{ top }}>
                <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full border border-emerald-400/35 bg-black/55 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-200 backdrop-blur-md" title="Souls on the plain">
                        <Users className="h-3.5 w-3.5" />
                        {liveCount + 1}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white/80 backdrop-blur-md" title={WEATHER_LABEL[weather]}>
                        <SkyIcon weather={weather} />
                        {formatClock(hour)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {!compact && (
                        <IconBtn label="Journal" hint="Tab" onClick={() => onJournal('soul')}>
                            <BookOpen className="h-4 w-4" />
                        </IconBtn>
                    )}
                    <IconBtn label="Bag" hint="I" onClick={() => onJournal('bag')}>
                        <Backpack className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Skills" hint="K" onClick={() => onJournal('skills')}>
                        <Sun className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Map" hint="M" onClick={onMap}>
                        <MapIcon className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Menu" hint="Esc" onClick={() => setPaused(true)}>
                        <Menu className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn label="Open Truth.OS" onClick={onOpenOs}>
                        <Monitor className="h-4 w-4 text-amber-200" />
                    </IconBtn>
                </div>
            </div>

            {/* stillness */}
            {meditate !== null && (
                <div className="absolute inset-x-0 bottom-[28%] flex justify-center">
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-cyan-300/30 bg-black/55 px-5 py-3 backdrop-blur-md">
                        <p className="text-[12px] text-cyan-100">Be still…</p>
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-200" style={{ width: `${meditate * 100}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* toasts */}
            <div className="absolute inset-x-0 flex flex-col items-center gap-1.5 px-4" style={{ top: `calc(${compact ? '11.8rem' : '6.2rem'} + env(safe-area-inset-top, 0px))` }}>
                {toasts.slice(-3).map((t) => (
                    <p
                        key={t.id}
                        className={`max-w-sm rounded-2xl border px-4 py-1.5 text-center text-[12px] shadow-xl backdrop-blur-md ${
                            t.tone === 'level'
                                ? 'border-amber-300/60 bg-amber-500/20 text-[14px] font-semibold text-amber-50'
                                : t.tone === 'xp'
                                  ? 'border-emerald-300/40 bg-black/65 text-emerald-100'
                                  : t.tone === 'find'
                                    ? 'border-violet-300/40 bg-black/65 text-violet-100'
                                    : t.tone === 'quest'
                                      ? 'border-amber-300/35 bg-black/65 text-amber-50'
                                      : t.tone === 'warn'
                                        ? 'border-red-300/40 bg-black/70 text-red-100'
                                        : 'border-white/15 bg-black/65 text-white/85'
                        }`}
                        style={{ animation: 'tbth-fade-in 0.25s ease-out' }}
                    >
                        {t.text}
                    </p>
                ))}
            </div>

            {/* the belt */}
            <div
                className={compact ? 'absolute left-3' : 'absolute inset-x-0 flex justify-center'}
                style={{ bottom: compact ? 'calc(12.5rem + env(safe-area-inset-bottom, 0px))' : 'calc(0.9rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <QuickBelt belt={world.belt ?? [null, null, null, null]} bag={world.bag ?? {}} xp={world.xp} onUse={onUseBelt} compact={compact} />
            </div>
        </div>
    );
}
