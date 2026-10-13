'use client';

/**
 * The journal — everything about the soul on the plain, in four tabs.
 *   Soul    who you are becoming: stats, treasure in heaven, and the three
 *           disciplines of Matthew 6 with their verses (begin a fast here)
 *   Bag     the armour of God slots, what you carry, use / equip / belt
 *   Skills  the tree: three branches, one per discipline
 *   Quests  what you are doing and what is done
 * Tab or J opens it; I, K go straight to the bag and the skills.
 */
import { useMemo, useState } from 'react';
import { Backpack, BookOpen, Check, Coins, Crown, Flame, HandHeart, Heart, Lock, ScrollText, Sparkles, Sun, X, Wind, Swords, Shield, Target, Footprints, Gem, Feather, Hammer, Mountain, Hand, Wheat, FlaskConical } from 'lucide-react';
import ItemIcon from './ItemIcon';
import { EQUIP_SLOTS, ITEMS, isConsumable, isEquipment, item, type EquipSlot } from '@/lib/world/items';
import { BRANCHES, SKILLS, skill, type SkillNode } from '@/lib/world/skills';
import { DISCIPLINES, discProgress, FAST_SECONDS, KINGDOM_VERSE, type Discipline } from '@/lib/world/disciplines';
import { QUESTS, currentStep, levelProgress, questAvailable, titleFor, type WorldProgress } from '@/lib/world/quests';
import { npc } from '@/lib/world/plain';
import type { Stats } from '@/lib/world/stats';

export type JournalTab = 'soul' | 'bag' | 'skills' | 'quests';

const TABS: { id: JournalTab; label: string; icon: React.ReactNode; key: string }[] = [
    { id: 'soul', label: 'Soul', icon: <Sparkles className="h-4 w-4" />, key: 'Tab' },
    { id: 'bag', label: 'Bag', icon: <Backpack className="h-4 w-4" />, key: 'I' },
    { id: 'skills', label: 'Skills', icon: <Sun className="h-4 w-4" />, key: 'K' },
    { id: 'quests', label: 'Quests', icon: <ScrollText className="h-4 w-4" />, key: 'J' },
];

const DISC_ICON: Record<Discipline, React.ReactNode> = {
    prayer: <HandHeart className="h-5 w-5" />,
    fasting: <Flame className="h-5 w-5" />,
    giving: <Heart className="h-5 w-5" />,
};
const DISC_TINT: Record<Discipline, string> = { prayer: '#7dd3fc', fasting: '#fdba74', giving: '#fda4af' };

export type JournalActions = {
    onUse: (id: string) => void;
    onEquip: (id: string) => void;
    onUnequip: (slot: EquipSlot) => void;
    onBelt: (slot: number, id: string | null) => void;
    onLearn: (id: string) => void;
    onBeginFast: () => void;
    onBreakFast: () => void;
};

export default function Journal({
    open,
    tab,
    setTab,
    onClose,
    world,
    stats,
    fastLeft,
    kingdom,
    actions,
    compact,
}: {
    open: boolean;
    tab: JournalTab;
    setTab: (t: JournalTab) => void;
    onClose: () => void;
    world: WorldProgress;
    stats: Stats;
    fastLeft: number | null;
    kingdom: boolean;
    actions: JournalActions;
    compact: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[73] flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="relative flex h-full w-full flex-col overflow-hidden border-white/12 bg-[#0d0b12]/95 shadow-2xl sm:h-[min(86vh,680px)] sm:max-w-4xl sm:rounded-3xl sm:border"
                onClick={(e) => e.stopPropagation()}
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-amber-400/15 text-amber-100' : 'text-white/55 hover:text-white'}`}
                        >
                            {t.icon}
                            {t.label}
                            {!compact && <span className="ml-1 rounded border border-white/15 px-1 font-mono text-[9px] text-white/35">{t.key}</span>}
                        </button>
                    ))}
                    <button type="button" onClick={onClose} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    {tab === 'soul' && <SoulTab world={world} stats={stats} fastLeft={fastLeft} kingdom={kingdom} actions={actions} />}
                    {tab === 'bag' && <BagTab world={world} stats={stats} actions={actions} />}
                    {tab === 'skills' && <SkillsTab world={world} stats={stats} actions={actions} />}
                    {tab === 'quests' && <QuestsTab world={world} />}
                </div>
            </div>
        </div>
    );
}

/* ── Soul ─────────────────────────────────────────────────────── */

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <span className="text-white/70">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
                <p className="text-[15px] font-semibold tabular-nums text-white">{value}</p>
            </div>
        </div>
    );
}

function SoulTab({ world, stats, fastLeft, kingdom, actions }: { world: WorldProgress; stats: Stats; fastLeft: number | null; kingdom: boolean; actions: JournalActions }) {
    const lp = levelProgress(world.xp);
    const today = world.practiced;
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">Level {stats.level}</p>
                    <h2 className="text-2xl font-semibold text-white">{titleFor(stats.level)}</h2>
                </div>
                <div className="ml-auto min-w-[200px] flex-1 sm:max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300" style={{ width: `${(lp.into / Math.max(1, lp.need)) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[11px] tabular-nums text-white/45">
                        {lp.into} / {lp.need} xp
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile icon={<Heart className="h-4 w-4 text-red-400" />} label="Vitality" value={stats.maxHp} />
                <StatTile icon={<Wind className="h-4 w-4 text-amber-300" />} label="Breath" value={stats.maxStamina} />
                <StatTile icon={<Sparkles className="h-4 w-4 text-sky-300" />} label="Spirit" value={stats.maxSpirit} />
                <StatTile icon={<Swords className="h-4 w-4 text-orange-300" />} label="Strike" value={stats.damage} />
                <StatTile icon={<Flame className="h-4 w-4 text-orange-300" />} label="Strength" value={stats.strength} />
                <StatTile icon={<Shield className="h-4 w-4 text-violet-300" />} label="Guard" value={`${Math.round(stats.guard * 100)}%`} />
                <StatTile icon={<Target className="h-4 w-4 text-emerald-300" />} label="True strike" value={`${Math.round(stats.crit * 100)}%`} />
                <StatTile icon={<Footprints className="h-4 w-4 text-white/70" />} label="Pace" value={`${Math.round(stats.speedMul * 100)}%`} />
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4">
                <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-amber-200" />
                    <p className="text-[15px] font-semibold text-amber-50">Treasure in heaven · {world.heaven ?? 0}</p>
                </div>
                <p className="mt-1 text-[12.5px] italic leading-relaxed text-amber-100/70">
                    “Lay up for yourselves treasures in heaven, where neither moth nor rust doth corrupt, and where thieves do not break through nor steal.” — Matthew 6:20
                </p>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/60">The disciplines · Matthew 6</h3>
                    <span className={`flex items-center gap-1 text-[11px] ${kingdom ? 'text-amber-200' : 'text-white/40'}`} title={KINGDOM_VERSE}>
                        <Crown className="h-3.5 w-3.5" />
                        {kingdom ? 'The Kingdom — all three today' : `Today: ${(['prayer', 'fasting', 'giving'] as const).filter((d) => today?.[d]).length} of 3`}
                    </span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    {DISCIPLINES.map((d) => {
                        const p = discProgress(world.disc?.[d.id] ?? 0);
                        const done = today?.[d.id];
                        return (
                            <div key={d.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2" style={{ color: DISC_TINT[d.id] }}>
                                    {DISC_ICON[d.id]}
                                    <p className="text-[15px] font-semibold text-white">{d.name}</p>
                                    <span className="ml-auto rounded-full border border-white/15 px-2 text-[11px] text-white/70">Lv {p.level}</span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full" style={{ width: `${(p.into / Math.max(1, p.need)) * 100}%`, background: DISC_TINT[d.id] }} />
                                </div>
                                <p className="mt-2 text-[12px] text-white/55">{d.grants}</p>
                                <p className="mt-2 flex-1 text-[12px] italic leading-relaxed text-white/60">“{d.verse}” — {d.ref}</p>
                                <p className="mt-2 text-[11.5px] text-emerald-200/80">In secret: {d.secret}</p>
                                {d.id === 'prayer' && <p className="mt-2 text-[12px] text-white/70">Hold <b>P</b> (or tap Pray) and stay still for eight breaths.</p>}
                                {d.id === 'giving' && (
                                    <p className="mt-2 text-[12px] text-white/70">
                                        The poor of the plain: {npc('bartimaeus').name} by the road, {npc('widow').name} by the water, {npc('asa').name} outside the camp.
                                    </p>
                                )}
                                {d.id === 'fasting' &&
                                    (fastLeft !== null ? (
                                        <div className="mt-2 space-y-1.5">
                                            <p className="text-[12px] text-orange-100">
                                                Fasting · {Math.ceil(fastLeft / 60)} min left{world.fast?.secret ? ' · anointed' : ' · not yet anointed'}
                                            </p>
                                            <button type="button" onClick={actions.onBreakFast} className="min-h-[36px] rounded-xl border border-white/15 px-3 text-[12px] text-white/70 hover:text-white">
                                                Break the fast
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={actions.onBeginFast} className="mt-2 min-h-[38px] rounded-xl border border-orange-300/50 bg-orange-400/15 px-3 text-[13px] font-medium text-orange-50 hover:bg-orange-400/25">
                                            Begin a fast · {FAST_SECONDS / 60} min
                                        </button>
                                    ))}
                                {done && (
                                    <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300">
                                        <Check className="h-3.5 w-3.5" /> Practised today
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Bag ──────────────────────────────────────────────────────── */

function BagTab({ world, stats, actions }: { world: WorldProgress; stats: Stats; actions: JournalActions }) {
    const bag = world.bag ?? {};
    const equip = world.equip ?? {};
    const worn = new Set(Object.values(equip));
    const ids = useMemo(
        () =>
            Object.keys(bag)
                .filter((id) => (bag[id] ?? 0) > 0 && ITEMS[id])
                .sort((a, b) => {
                    const order = ['food', 'drink', 'oil', 'weapon', 'armor', 'material'];
                    return order.indexOf(ITEMS[a].kind) - order.indexOf(ITEMS[b].kind) || a.localeCompare(b);
                }),
        [bag],
    );
    const [sel, setSel] = useState<string | null>(ids[0] ?? null);
    const d = sel ? item(sel) : null;
    const belt = world.belt ?? [null, null, null, null];
    return (
        <div className="grid gap-5 md:grid-cols-[230px_1fr]">
            <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/50">The armour of God</h3>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
                    {EQUIP_SLOTS.map(({ slot, label }) => {
                        const id = equip[slot];
                        return (
                            <button
                                key={slot}
                                type="button"
                                onClick={() => id && setSel(id)}
                                className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-center hover:border-white/25"
                            >
                                {id ? <ItemIcon id={id} size={42} /> : <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[28%] border border-dashed border-white/15 text-white/20">·</span>}
                                <span className="text-[10px] uppercase tracking-wider text-white/45">{label}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-amber-200">
                    <Coins className="h-4 w-4" /> {world.coins ?? 0} denarii
                </p>
                <p className="mt-1 text-[11px] text-white/40">Strike {stats.damage} · Guard {Math.round(stats.guard * 100)}%</p>
            </div>
            <div className="min-w-0">
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/50">Carried</h3>
                {ids.length === 0 ? (
                    <p className="text-[13px] text-white/45">Nothing yet. Lydia sells bread at the Crossroads.</p>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                        {ids.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setSel(id)}
                                className={`relative flex items-center justify-center rounded-2xl border p-2 transition-colors ${sel === id ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/8 bg-white/[0.02] hover:border-white/25'}`}
                            >
                                <ItemIcon id={id} size={46} count={bag[id]} />
                                {worn.has(id) && <span className="absolute right-1 top-1 rounded bg-emerald-500/80 px-1 text-[8px] font-bold text-black">WORN</span>}
                            </button>
                        ))}
                    </div>
                )}
                {d && (bag[d.id] ?? 0) > 0 && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start gap-3">
                            <ItemIcon id={d.id} size={52} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[16px] font-semibold text-white">{d.name}</p>
                                <p className="text-[13px] text-white/65">{d.blurb}</p>
                                {d.damage && <p className="mt-1 text-[12px] text-orange-200">Strike {d.damage} · reach {d.reach} m</p>}
                                {d.verse && <p className="mt-2 text-[12px] italic text-white/50">“{d.verse}”</p>}
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {isConsumable(d) && (
                                <button type="button" onClick={() => actions.onUse(d.id)} className="min-h-[38px] rounded-xl border border-emerald-300/50 bg-emerald-400/15 px-4 text-[13px] font-medium text-emerald-50">
                                    Use
                                </button>
                            )}
                            {isEquipment(d) &&
                                (worn.has(d.id) ? (
                                    d.slot !== 'weapon' && (
                                        <button type="button" onClick={() => actions.onUnequip(d.slot!)} className="min-h-[38px] rounded-xl border border-white/15 px-4 text-[13px] text-white/75">
                                            Take off
                                        </button>
                                    )
                                ) : (
                                    <button type="button" onClick={() => actions.onEquip(d.id)} className="min-h-[38px] rounded-xl border border-amber-300/50 bg-amber-400/15 px-4 text-[13px] font-medium text-amber-50">
                                        {d.slot === 'weapon' ? 'Take in hand' : 'Put on'}
                                    </button>
                                ))}
                            {isConsumable(d) &&
                                [0, 1, 2, 3].map((i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => actions.onBelt(i, belt[i] === d.id ? null : d.id)}
                                        className={`min-h-[38px] rounded-xl border px-3 text-[12px] ${belt[i] === d.id ? 'border-amber-300/60 bg-amber-400/15 text-amber-100' : 'border-white/12 text-white/60 hover:text-white'}`}
                                        title={`Quick slot ${i + 1}`}
                                    >
                                        {belt[i] === d.id ? `On ${i + 1}` : `Belt ${i + 1}`}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Skills ───────────────────────────────────────────────────── */

const NODE_ICON: Record<string, React.ReactNode> = {
    Wind: <Wind className="h-5 w-5" />,
    Sparkles: <Sparkles className="h-5 w-5" />,
    Sun: <Sun className="h-5 w-5" />,
    Swords: <Swords className="h-5 w-5" />,
    Heart: <Heart className="h-5 w-5" />,
    Target: <Target className="h-5 w-5" />,
    Coins: <Coins className="h-5 w-5" />,
    Gem: <Gem className="h-5 w-5" />,
    BookOpen: <BookOpen className="h-5 w-5" />,
    Feather: <Feather className="h-5 w-5" />,
    Hammer: <Hammer className="h-5 w-5" />,
    Mountain: <Mountain className="h-5 w-5" />,
    Hand: <Hand className="h-5 w-5" />,
    Wheat: <Wheat className="h-5 w-5" />,
    FlaskConical: <FlaskConical className="h-5 w-5" />,
};

function SkillsTab({ world, stats, actions }: { world: WorldProgress; stats: Stats; actions: JournalActions }) {
    const learned = new Set(world.skills ?? []);
    const [sel, setSel] = useState<SkillNode | null>(null);
    const lvl: Record<Discipline, number> = { prayer: stats.prayer, fasting: stats.fasting, giving: stats.giving };
    const state = (n: SkillNode) => {
        if (learned.has(n.id)) return 'learned';
        if (n.after && !learned.has(n.after)) return 'locked';
        if (lvl[n.branch] < n.needs) return 'locked';
        return stats.graceFree >= n.cost ? 'ready' : 'poor';
    };
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="text-[14px] text-white/80">
                    Grace to spend: <b className="text-amber-200">{stats.graceFree}</b>
                </p>
                <p className="text-[12px] text-white/45">Grace comes with each level and with every two levels of the disciplines.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {BRANCHES.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="mb-3 flex items-center gap-2" style={{ color: DISC_TINT[b.id] }}>
                            {DISC_ICON[b.id]}
                            <div>
                                <p className="text-[14px] font-semibold text-white">{b.name}</p>
                                <p className="text-[11px] italic text-white/45">{b.motto} · {DISCIPLINES.find((d) => d.id === b.id)!.name} Lv {lvl[b.id]}</p>
                            </div>
                        </div>
                        <div className="relative flex flex-col items-stretch gap-2">
                            {SKILLS.filter((s) => s.branch === b.id)
                                .sort((x, y) => x.tier - y.tier)
                                .map((n, i) => {
                                    const st = state(n);
                                    return (
                                        <div key={n.id} className="relative">
                                            {i > 0 && <span className={`absolute -top-2 left-[26px] h-2 w-0.5 ${learned.has(n.after ?? '') ? 'bg-amber-300/70' : 'bg-white/10'}`} />}
                                            <button
                                                type="button"
                                                onClick={() => setSel(n)}
                                                className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                                                    st === 'learned'
                                                        ? 'border-amber-300/60 bg-amber-400/15'
                                                        : st === 'ready'
                                                          ? 'border-emerald-300/50 bg-emerald-400/10 shadow-[0_0_14px_rgba(52,211,153,0.15)]'
                                                          : 'border-white/8 bg-white/[0.02] opacity-70'
                                                } ${sel?.id === n.id ? 'ring-1 ring-white/40' : ''}`}
                                            >
                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st === 'learned' ? 'bg-amber-300 text-black' : 'bg-white/[0.06] text-white/70'}`}>
                                                    {st === 'locked' ? <Lock className="h-4 w-4" /> : NODE_ICON[n.icon] ?? <Sparkles className="h-5 w-5" />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[13px] font-medium text-white">{n.name}</span>
                                                    <span className="block text-[10.5px] text-white/45">
                                                        {st === 'learned' ? 'Learned' : `Needs ${DISCIPLINES.find((d) => d.id === n.branch)!.name} ${n.needs} · ${n.cost} grace`}
                                                    </span>
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
            {sel && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-white">{sel.name}</p>
                        <p className="text-[13px] text-white/65">{sel.effect}</p>
                        {sel.after && !learned.has(sel.after) && <p className="mt-1 text-[12px] text-white/40">First learn {skill(sel.after)?.name}.</p>}
                    </div>
                    {state(sel) === 'ready' && (
                        <button type="button" onClick={() => actions.onLearn(sel.id)} className="min-h-[40px] rounded-xl border border-emerald-300/60 bg-emerald-400/20 px-5 text-[13px] font-semibold text-emerald-50">
                            Learn · {sel.cost} grace
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Quests ───────────────────────────────────────────────────── */

function QuestsTab({ world }: { world: WorldProgress }) {
    const active = QUESTS.filter((q) => world.quests[q.id] && !world.quests[q.id].done);
    const done = QUESTS.filter((q) => world.quests[q.id]?.done);
    const open = QUESTS.filter((q) => questAvailable(q, world));
    return (
        <div className="space-y-5">
            <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/50">Under way</h3>
                {active.length === 0 && <p className="text-[13px] text-white/45">Nothing under way. Look for a gold ! over someone’s head.</p>}
                <div className="space-y-2">
                    {active.map((q) => {
                        const step = currentStep(q, world);
                        const p = world.quests[q.id];
                        return (
                            <div key={q.id} className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-3.5">
                                <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-semibold text-amber-50">{q.name}</p>
                                    <span className="ml-auto text-[11px] text-white/45">from {npc(q.giver).name}</span>
                                </div>
                                <ol className="mt-2 space-y-1">
                                    {q.steps.map((s, i) => (
                                        <li key={i} className={`flex items-start gap-2 text-[12.5px] ${i < p.step ? 'text-white/35 line-through' : i === p.step ? 'text-white' : 'text-white/40'}`}>
                                            <span className="mt-0.5">{i < p.step ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : i === p.step ? '▸' : '·'}</span>
                                            {s.text}
                                            {i === p.step && step?.kind === 'gather' && <span className="text-amber-200"> {p.n?.[step.item] ?? 0}/{step.n}</span>}
                                            {i === p.step && step?.kind === 'kill' && <span className="text-amber-200"> {p.n?.[step.enemy] ?? 0}/{step.n}</span>}
                                        </li>
                                    ))}
                                </ol>
                                <p className="mt-2 text-[11px] text-emerald-200/70">
                                    {q.xp} xp{q.coins ? ` · ${q.coins} denarii` : ''}
                                    {q.items ? ` · ${Object.keys(q.items).map((id) => item(id)?.name).join(', ')}` : ''}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
            {open.length > 0 && (
                <section>
                    <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/50">Waiting to be asked</h3>
                    <div className="flex flex-wrap gap-2">
                        {open.map((q) => (
                            <span key={q.id} className="rounded-full border border-white/12 px-3 py-1 text-[12px] text-white/65">
                                {npc(q.giver).name} has something for you
                            </span>
                        ))}
                    </div>
                </section>
            )}
            {done.length > 0 && (
                <section>
                    <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/50">Done · {done.length} of {QUESTS.length}</h3>
                    <div className="flex flex-wrap gap-2">
                        {done.map((q) => (
                            <span key={q.id} className="flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[12px] text-emerald-100">
                                <Check className="h-3.5 w-3.5" />
                                {q.name}
                            </span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
