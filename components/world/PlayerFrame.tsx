'use client';

/**
 * The soul's frame, top left: name, level and title, then the three bars —
 * vitality (red), breath (gold) and spirit (blue) — and the marks of what
 * is on you: a fast kept, Deliver Us, the Kingdom. Samples the fight's
 * live numbers ten times a second; the bars ease between samples.
 */
import { useEffect, useState } from 'react';
import { Heart, Wind, Sparkles, Flame, Feather, Crown, Coins } from 'lucide-react';
import { player } from '@/lib/world/combat';
import type { Stats } from '@/lib/world/stats';
import { titleFor } from '@/lib/world/quests';

function Bar({ value, max, color, glow, icon, label, compact }: { value: number; max: number; color: string; glow: string; icon: React.ReactNode; label: string; compact: boolean }) {
    const k = Math.max(0, Math.min(1, value / Math.max(1, max)));
    return (
        <div className="flex items-center gap-1.5" title={label}>
            <span className="flex h-4 w-4 items-center justify-center text-white/80">{icon}</span>
            <div className={`relative overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10 ${compact ? 'h-2 w-28' : 'h-2.5 w-44'}`}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out" style={{ width: `${k * 100}%`, background: color, boxShadow: `0 0 10px ${glow}` }} />
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/15" />
            </div>
            {!compact && <span className="w-14 text-[10px] tabular-nums text-white/60">{Math.ceil(value)}/{Math.round(max)}</span>}
        </div>
    );
}

export default function PlayerFrame({
    name,
    stats,
    coins,
    fasting,
    kingdom,
    compact,
}: {
    name: string;
    stats: Stats;
    coins: number;
    fasting: { left: number; secret: boolean } | null;
    kingdom: boolean;
    compact: boolean;
}) {
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 100);
        return () => clearInterval(t);
    }, []);
    const lowHp = player.hp / stats.maxHp < 0.25;
    const deliver = performance.now() < player.deliverUntil;
    return (
        <div className={`rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${lowHp ? 'shadow-[0_0_24px_rgba(239,68,68,0.45)]' : 'shadow-xl'}`}>
            <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-600 px-1.5 text-[11px] font-black text-black">{stats.level}</span>
                <span className="max-w-[120px] truncate text-[13px] font-semibold text-white">{name}</span>
                {!compact && <span className="truncate text-[11px] text-amber-200/80">{titleFor(stats.level)}</span>}
                <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold tabular-nums text-amber-200" title="Denarii carried">
                    <Coins className="h-3.5 w-3.5" />
                    {coins}
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <Bar value={player.hp} max={stats.maxHp} color="linear-gradient(90deg,#b91c1c,#f87171)" glow="#ef444488" icon={<Heart className="h-3.5 w-3.5 fill-red-500 text-red-400" />} label="Vitality" compact={compact} />
                <Bar value={player.stamina} max={stats.maxStamina} color="linear-gradient(90deg,#b45309,#fcd34d)" glow="#fbbf2466" icon={<Wind className="h-3.5 w-3.5 text-amber-300" />} label="Breath" compact={compact} />
                <Bar value={player.spirit} max={stats.maxSpirit} color="linear-gradient(90deg,#1d4ed8,#7dd3fc)" glow="#38bdf866" icon={<Sparkles className="h-3.5 w-3.5 text-sky-300" />} label="Spirit" compact={compact} />
            </div>
            {(fasting || deliver || kingdom) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {fasting && (
                        <span className="flex items-center gap-1 rounded-full border border-orange-300/30 bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-100" title={fasting.secret ? 'Fasting in secret — anointed' : 'Fasting'}>
                            <Flame className="h-3 w-3" />
                            Fast {Math.ceil(fasting.left / 60)}m{fasting.secret ? ' · anointed' : ''}
                        </span>
                    )}
                    {deliver && (
                        <span className="flex items-center gap-1 rounded-full border border-sky-300/30 bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-100" title="Deliver us from evil">
                            <Feather className="h-3 w-3" /> Delivered
                        </span>
                    )}
                    {kingdom && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100" title="Seek ye first the kingdom">
                            <Crown className="h-3 w-3" /> Kingdom
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
