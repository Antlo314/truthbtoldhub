'use client';

/**
 * The plain's smaller sheets: Lydia's stall, the alms you give to the
 * poor, the prayer you kneel in, and the moment you fall.
 */
import { useEffect, useState } from 'react';
import { Coins, Eye, EyeOff, HandHeart, X } from 'lucide-react';
import ItemIcon from './ItemIcon';
import { ITEMS, SHOP_STOCK, item } from '@/lib/world/items';
import { FALL_VERSE, LORDS_PRAYER } from '@/lib/world/disciplines';
import { prayerProgress } from './PlainCombat';

/* ── Lydia ─────────────────────────────────────────────────────── */

export function ShopPanel({
    open,
    onClose,
    coins,
    bag,
    worn,
    discount,
    onBuy,
    onSell,
}: {
    open: boolean;
    onClose: () => void;
    coins: number;
    bag: Record<string, number>;
    worn: Set<string>;
    discount: number;
    onBuy: (id: string, price: number) => void;
    onSell: (id: string) => void;
}) {
    const [tab, setTab] = useState<'buy' | 'sell'>('buy');
    if (!open) return null;
    const sellable = Object.keys(bag).filter((id) => (bag[id] ?? 0) > 0 && (ITEMS[id]?.sell ?? 0) > 0 && !worn.has(id));
    return (
        <Sheet onClose={onClose} title="Lydia · Seller of purple" subtitle="“Whose heart the Lord opened.” — Acts 16:14">
            <div className="mb-3 flex items-center gap-2">
                {(['buy', 'sell'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-[36px] rounded-xl px-4 text-[13px] ${tab === t ? 'bg-violet-400/20 text-violet-50' : 'text-white/55 hover:text-white'}`}>
                        {t === 'buy' ? 'Buy' : 'Sell'}
                    </button>
                ))}
                <span className="ml-auto flex items-center gap-1.5 text-[14px] font-semibold tabular-nums text-amber-200">
                    <Coins className="h-4 w-4" /> {coins}
                </span>
            </div>
            <div className="space-y-1.5">
                {tab === 'buy' &&
                    SHOP_STOCK.map((id) => {
                        const d = ITEMS[id];
                        const price = Math.max(1, Math.round(d.price * (1 - discount)));
                        const owned = d.slot ? (bag[id] ?? 0) > 0 : false;
                        return (
                            <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-2.5">
                                <ItemIcon id={id} size={42} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-medium text-white">{d.name}</p>
                                    <p className="truncate text-[12px] text-white/50">{d.blurb}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={coins < price || owned}
                                    onClick={() => onBuy(id, price)}
                                    className="flex min-h-[38px] min-w-[84px] items-center justify-center gap-1 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 text-[13px] font-semibold tabular-nums text-amber-100 disabled:opacity-35"
                                >
                                    {owned ? 'Owned' : (
                                        <>
                                            <Coins className="h-3.5 w-3.5" /> {price}
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                {tab === 'sell' &&
                    (sellable.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-white/45">Nothing she would buy. Pelts, gel and essence fetch a price.</p>
                    ) : (
                        sellable.map((id) => (
                            <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-2.5">
                                <ItemIcon id={id} size={42} count={bag[id]} />
                                <p className="min-w-0 flex-1 text-[14px] font-medium text-white">{ITEMS[id].name}</p>
                                <button type="button" onClick={() => onSell(id)} className="flex min-h-[38px] min-w-[84px] items-center justify-center gap-1 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-3 text-[13px] font-semibold tabular-nums text-emerald-100">
                                    +<Coins className="h-3.5 w-3.5" /> {ITEMS[id].sell}
                                </button>
                            </div>
                        ))
                    ))}
            </div>
        </Sheet>
    );
}

/* ── alms ──────────────────────────────────────────────────────── */

const GIFT_FOOD = ['bread', 'fish', 'figs', 'honey', 'water'];

export function GivePanel({
    to,
    onClose,
    coins,
    bag,
    secret,
    onGive,
}: {
    to: { name: string; title: string; line: string } | null;
    onClose: () => void;
    coins: number;
    bag: Record<string, number>;
    /** no other soul is near — the gift is in secret */
    secret: boolean;
    onGive: (gift: { coins?: number; item?: string }) => void;
}) {
    if (!to) return null;
    const food = GIFT_FOOD.filter((id) => (bag[id] ?? 0) > 0);
    return (
        <Sheet onClose={onClose} title={to.name} subtitle={to.title}>
            <p className="mb-3 text-[14px] italic text-white/75">“{to.line}”</p>
            <p className={`mb-3 flex items-center gap-1.5 text-[12px] ${secret ? 'text-emerald-200' : 'text-amber-200/80'}`}>
                {secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {secret ? 'No one is watching — this gift is in secret.' : 'Others can see you here. Let not thy left hand know what thy right hand doeth.'}
            </p>
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-white/45">Coin · you carry {coins}</p>
            <div className="mb-4 flex flex-wrap gap-2">
                {[1, 5, 10, 25].map((n) => (
                    <button key={n} type="button" disabled={coins < n} onClick={() => onGive({ coins: n })} className="flex min-h-[40px] items-center gap-1 rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 text-[13px] font-semibold text-amber-100 disabled:opacity-30">
                        <Coins className="h-3.5 w-3.5" /> {n}
                    </button>
                ))}
            </div>
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-white/45">Food</p>
            {food.length === 0 ? (
                <p className="text-[13px] text-white/45">No food to share. Lydia sells bread at the Crossroads.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {food.map((id) => (
                        <button key={id} type="button" onClick={() => onGive({ item: id })} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white hover:border-white/30">
                            <ItemIcon id={id} size={32} count={bag[id]} /> Give {item(id)?.name.toLowerCase()}
                        </button>
                    ))}
                </div>
            )}
        </Sheet>
    );
}

/* ── shared sheet ──────────────────────────────────────────────── */

function Sheet({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[73] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#0d0b12]/95 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 border-b border-white/10 px-5 py-3.5">
                    <div className="min-w-0">
                        <p className="text-[17px] font-semibold text-white">{title}</p>
                        {subtitle && <p className="text-[12px] text-white/50">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── kneeling ──────────────────────────────────────────────────── */

export function PrayerOverlay({ praying, secret }: { praying: boolean; secret: boolean }) {
    const [, tick] = useState(0);
    useEffect(() => {
        if (!praying) return;
        const t = setInterval(() => tick((n) => n + 1), 120);
        return () => clearInterval(t);
    }, [praying]);
    if (!praying) return null;
    const k = prayerProgress();
    const line = LORDS_PRAYER[Math.min(LORDS_PRAYER.length - 1, Math.floor(k * LORDS_PRAYER.length))];
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-[22%] z-[55] flex justify-center px-4">
            <div className="flex max-w-md flex-col items-center gap-2 rounded-3xl border border-sky-200/25 bg-black/60 px-6 py-4 text-center shadow-[0_0_40px_rgba(125,211,252,0.18)] backdrop-blur-md">
                <HandHeart className="h-6 w-6 text-sky-200" />
                <p key={line} className="text-[16px] italic leading-snug text-sky-50" style={{ animation: 'tbth-fade-in 0.6s ease-out' }}>
                    {line}
                </p>
                <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sky-300" style={{ width: `${k * 100}%` }} />
                </div>
                <p className={`text-[11px] ${secret ? 'text-emerald-200/80' : 'text-amber-200/70'}`}>{secret ? 'In secret' : 'Others can see you — it counts, but less'} · move to stop</p>
            </div>
        </div>
    );
}

/* ── the fall ──────────────────────────────────────────────────── */

export function DeathScreen({ fallen, coinsLost, onRise }: { fallen: boolean; coinsLost: number; onRise: () => void }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (!fallen) {
            setReady(false);
            return;
        }
        const t = setTimeout(() => setReady(true), 1800);
        return () => clearTimeout(t);
    }, [fallen]);
    if (!fallen) return null;
    return (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(60,0,0,0.55), rgba(0,0,0,0.92))', animation: 'tbth-fade-in 1.2s ease-out' }}>
            <p className="text-[12px] uppercase tracking-[0.5em] text-red-300/80">You fell</p>
            <p className="max-w-lg text-[17px] italic leading-relaxed text-white/85">{FALL_VERSE}</p>
            {coinsLost > 0 ? <p className="text-[13px] text-amber-200/80">{coinsLost} denarii were lost where you fell. What you gave away is still yours.</p> : <p className="text-[13px] text-emerald-200/80">Nothing was lost. Your treasure is where moth and rust cannot reach.</p>}
            <button type="button" disabled={!ready} onClick={onRise} className="mt-2 min-h-[46px] rounded-2xl border border-amber-300/50 bg-amber-400/15 px-6 text-[14px] font-semibold text-amber-50 transition-opacity disabled:opacity-0">
                Rise at the Lair gate
            </button>
        </div>
    );
}
