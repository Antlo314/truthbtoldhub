'use client';

/**
 * Four quick slots along the bottom — keys 1 to 4, or a tap. Whatever is
 * set there from the bag (bread, water, oil…) is one press from your mouth,
 * with the count left. Above it, a thin line of experience to the next
 * level.
 */
import ItemIcon from './ItemIcon';
import { item } from '@/lib/world/items';
import { levelProgress } from '@/lib/world/quests';

export default function QuickBelt({
    belt,
    bag,
    xp,
    onUse,
    compact,
}: {
    belt: (string | null)[];
    bag: Record<string, number>;
    xp: number;
    onUse: (slot: number) => void;
    compact: boolean;
}) {
    const lp = levelProgress(xp);
    const size = compact ? 40 : 46;
    return (
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <div className={`relative h-1.5 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/10 ${compact ? 'w-[200px]' : 'w-[240px]'}`} title={`${lp.into} / ${lp.need} xp to level ${lp.level + 1}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-300 transition-[width] duration-500" style={{ width: `${Math.min(100, (lp.into / Math.max(1, lp.need)) * 100)}%` }} />
            </div>
            <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-black/45 p-1.5 backdrop-blur-md">
                {[0, 1, 2, 3].map((i) => {
                    const id = belt[i] ?? null;
                    const n = id ? bag[id] ?? 0 : 0;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onUse(i)}
                            disabled={!id || n <= 0}
                            className="relative flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-transform active:scale-95 disabled:cursor-default"
                            style={{ width: size + 6, height: size + 6 }}
                            title={id ? `${item(id)?.name ?? id} (${i + 1})` : `Empty — set from the bag (${i + 1})`}
                        >
                            {id ? <ItemIcon id={id} size={size} count={n} dim={n <= 0} /> : <span className="text-[11px] text-white/20">—</span>}
                            {!compact && <span className="absolute left-1 top-0.5 text-[9px] font-bold text-white/45">{i + 1}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
