'use client';

/**
 * What you see while you walk the plain: where you are, which way the
 * work lies, who you are becoming. Place name and compass at the top;
 * level, title and the bar to the next at the top right with the live
 * count and the clock; the quest tracker down the left; toasts in the
 * middle. Reads the walker pose on a timer — nothing here re-renders at
 * frame rate.
 */
import { useEffect, useState } from 'react';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { formatClock, useWorldTime } from '@/components/truthos/house/worldTime';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { landmark, placeAt, type PlaceId } from '@/lib/world/terrain';
import { CAIRNS, npc, pickups } from '@/lib/world/plain';
import { activeQuests, currentStep, levelProgress, titleFor, type WorldProgress } from '@/lib/world/quests';
import { questTargets } from '@/lib/world/questLogic';
import { npcPosition } from './Npcs';

const COMPASS_FOV = 1.2;

export type HudToast = { id: number; text: string; tone: 'quest' | 'xp' | 'level' | 'find' | 'info' };

function targetPoint(t: ReturnType<typeof questTargets>[number], px: number, pz: number): { x: number; z: number } | null {
    if (t.npc) return npcPosition(t.npc);
    if (t.place) {
        const c = CAIRNS.find((c) => c.id === t.place);
        if (c) return c;
        try {
            const l = landmark(t.place as PlaceId);
            return l ? { x: l.x, z: l.z } : null;
        } catch {
            return null;
        }
    }
    if (t.item) {
        // nearest of that kind still lying out there
        let best: { x: number; z: number } | null = null;
        let bd = Infinity;
        for (const p of pickups()) {
            if (p.kind !== t.item) continue;
            const d = Math.hypot(p.x - px, p.z - pz);
            if (d < bd) {
                bd = d;
                best = p;
            }
        }
        return best;
    }
    return null;
}

export default function PlainHud({
    visible,
    compact,
    world,
    liveCount,
    toasts,
    meditate,
    onOpenOs,
    onMap,
    guest,
    onSignIn,
}: {
    visible: boolean;
    compact: boolean;
    world: WorldProgress;
    liveCount: number;
    toasts: HudToast[];
    /** 0..1 while standing still in a meditation spot */
    meditate: number | null;
    onOpenOs: () => void;
    onMap: () => void;
    guest: boolean;
    onSignIn: () => void;
}) {
    const hour = useWorldTime((s) => s.hour);
    const setPaused = useHouseUi((s) => s.setPaused);
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 250);
        return () => clearInterval(t);
    }, []);
    if (!visible) return null;

    const pose = getWalkerPose();
    const place = placeAt(pose.x, pose.z);
    const lp = levelProgress(world.xp);
    const quests = activeQuests(world);
    const targets = questTargets(world);
    const facing = Math.atan2(-Math.sin(pose.yaw), -Math.cos(pose.yaw));
    const top = compact ? '3.4rem' : '3.6rem';

    return (
        <div className="pointer-events-none absolute inset-0 z-[45] select-none">
            <button
                type="button"
                onClick={onOpenOs}
                className="pointer-events-auto absolute left-3 z-[46] rounded-xl border border-amber-300/40 bg-black/65 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-amber-100 backdrop-blur-md min-h-[40px]"
                style={{ top: `calc(0.55rem + env(safe-area-inset-top, 0px))` }}
            >
                Open Truth.OS
            </button>
            {guest && !compact && (
                <button
                    type="button"
                    onClick={onSignIn}
                    className="pointer-events-auto absolute left-3 z-[46] rounded-xl border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-md"
                    style={{ top: `calc(3.4rem + env(safe-area-inset-top, 0px))` }}
                >
                    Sign in to keep progress
                </button>
            )}

            {/* place + compass */}
            <div className="absolute inset-x-0 top-0 flex justify-center px-3" style={{ paddingTop: `calc(${top} + env(safe-area-inset-top, 0px))` }}>
                <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-full border border-white/12 bg-black/50 px-3 py-1.5 backdrop-blur-md shadow-xl">
                        <p className="max-w-[240px] truncate text-center text-[12px] font-medium tracking-wide text-white/90">{place.name}</p>
                    </div>
                    <div className="relative h-5 w-[200px] overflow-hidden rounded-full border border-white/12 bg-black/45 backdrop-blur-md">
                        {(['N', 'E', 'S', 'W'] as const).map((c, i) => {
                            // world: N = −z, E = +x, S = +z, W = −x
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
                            const dx = p.x - pose.x;
                            const dz = p.z - pose.z;
                            let rel = facing - Math.atan2(dx, dz);
                            while (rel > Math.PI) rel -= Math.PI * 2;
                            while (rel < -Math.PI) rel += Math.PI * 2;
                            const a = Math.abs(rel);
                            const behind = a > COMPASS_FOV;
                            const x = behind ? Math.sign(rel) * 0.96 : (rel / COMPASS_FOV) * 0.92;
                            return (
                                <span
                                    key={`${t.questId}-${i}`}
                                    className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ${behind ? 'bg-amber-300/40' : 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]'}`}
                                    style={{ left: `${50 + x * 50}%` }}
                                />
                            );
                        })}
                    </div>
                    {compact && (
                        <div className="flex items-center gap-2 rounded-full border border-white/12 bg-black/50 px-2.5 py-1 backdrop-blur-md">
                            <span className="text-[11px] font-semibold text-white">Lv {lp.level}</span>
                            <span className="text-[10px] text-amber-200/85">{titleFor(lp.level)}</span>
                            <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                                <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300" style={{ width: `${Math.min(100, (lp.into / Math.max(1, lp.need)) * 100)}%` }} />
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* the soul: level, title, bar */}
            <div className="pointer-events-auto absolute right-3 flex flex-col items-end gap-1.5" style={{ top: `calc(0.55rem + env(safe-area-inset-top, 0px))` }}>
                <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-emerald-400/35 bg-black/55 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-200 backdrop-blur-md" title="Live souls on the plain">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
                        {liveCount + 1}
                    </span>
                    <span className="rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white/80 backdrop-blur-md">{formatClock(hour)}</span>
                    <button type="button" onClick={onMap} className="min-h-[32px] rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-md hover:text-white" aria-label="Map">
                        Map
                    </button>
                    <button type="button" onClick={() => setPaused(true)} className="min-h-[32px] rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-md hover:text-white" aria-label="Pause">
                        ☰
                    </button>
                </div>
                <div className={`w-[190px] rounded-2xl border border-white/12 bg-black/55 px-3 py-2 backdrop-blur-md ${compact ? 'hidden' : ''}`}>
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold text-white">Level {lp.level}</span>
                        <span className="truncate text-[11px] text-amber-200/85">{titleFor(lp.level)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-[width] duration-500" style={{ width: `${Math.min(100, (lp.into / Math.max(1, lp.need)) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] tabular-nums text-white/45">
                        {lp.into} / {lp.need} xp
                    </p>
                </div>
            </div>

            {/* quest tracker */}
            {quests.length > 0 && (
                <div className="absolute left-3 w-[min(250px,60vw)] space-y-1.5" style={{ top: `calc(${compact ? '8.6rem' : '6.4rem'} + env(safe-area-inset-top, 0px))` }}>
                    {quests.slice(0, compact ? 2 : 4).map((q) => {
                        const s = currentStep(q, world);
                        const p = world.quests[q.id];
                        let count = '';
                        if (s?.kind === 'gather') count = ` ${p?.n?.[s.item] ?? 0}/${s.n}`;
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

            {/* meditation */}
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
            <div className="absolute inset-x-0 flex flex-col items-center gap-1.5 px-4" style={{ top: `calc(${compact ? '13.6rem' : '8.8rem'} + env(safe-area-inset-top, 0px))` }}>
                {toasts.slice(-3).map((t) => (
                    <p
                        key={t.id}
                        className={`max-w-sm rounded-2xl border px-4 py-1.5 text-center text-[12px] shadow-xl backdrop-blur-md ${
                            t.tone === 'level'
                                ? 'border-amber-300/60 bg-amber-500/20 text-amber-50 text-[14px] font-semibold'
                                : t.tone === 'xp'
                                  ? 'border-emerald-300/40 bg-black/65 text-emerald-100'
                                  : t.tone === 'find'
                                    ? 'border-violet-300/40 bg-black/65 text-violet-100'
                                    : t.tone === 'quest'
                                      ? 'border-amber-300/35 bg-black/65 text-amber-50'
                                      : 'border-white/15 bg-black/65 text-white/85'
                        }`}
                    >
                        {t.text}
                    </p>
                ))}
            </div>
        </div>
    );
}
