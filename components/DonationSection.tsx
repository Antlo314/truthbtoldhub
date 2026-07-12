'use client';

import { ArrowRight } from 'lucide-react';
import {
    STRIPE_SUPPORT_CODE,
    RECURRING_TIERS,
    ONE_TIME_TIERS,
} from '@/lib/donationTiers';
import {
    CASH_APP_URL,
    CASH_TAG,
    STRIPE_URL,
    fundingProgressPercent,
    fundingProgressLabel,
    INFRASTRUCTURE_MILESTONES,
} from '@/lib/supportFunding';

interface Props {
    className?: string;
    showFundingBar?: boolean;
    variant?: 'page' | 'hut';
}

export default function DonationSection({
    className = '',
    showFundingBar = true,
    variant = 'hut',
}: Props) {
    const hut = variant === 'hut';
    const progress = fundingProgressPercent();

    return (
        <section className={className}>
            <p className={`font-ritual text-white leading-tight ${hut ? 'text-base mb-1.5' : 'text-xl mb-2'}`}>
                It&apos;s bigger than the 400 Series.
            </p>
            <p className={`text-white/60 leading-relaxed ${hut ? 'text-[11px] mb-3' : 'text-sm mb-4 max-w-lg'}`}>
                Your offering doesn&apos;t just fund a film — it builds the infrastructure of an awakening. The
                400 Series is the spark; the Sanctum itself is being reborn as a living{' '}
                <span className="text-aether-gold font-semibold">3D world</span>, layered with sacred assets,
                trials, and tools forged for real spiritual growth. Every gift lays another stone.
            </p>

            <ul className={hut ? 'mb-4 space-y-1.5' : 'mb-6 max-w-lg space-y-2'}>
                {[
                    ['The 400 Series', 'Cinematic Israelite history & recovered scroll-wisdom'],
                    ['A world reborn in 3D', 'The Sanctum rebuilt as a living, walkable realm'],
                    ['Assets for awakening', 'Scriptures, relics, guides & trials built for real growth'],
                    ['The engine behind it', 'Render pipeline, studio & hosting that keep it alive'],
                ].map(([title, desc]) => (
                    <li key={title} className="flex gap-2">
                        <span className="text-aether-gold leading-none mt-0.5">✦</span>
                        <span className={`${hut ? 'text-[10px]' : 'text-[13px]'} text-white/55 leading-snug`}>
                            <span className="font-bold text-white/85">{title}</span> — {desc}
                        </span>
                    </li>
                ))}
            </ul>

            <p className={`text-white/55 leading-relaxed ${hut ? 'text-[11px] mb-4' : 'text-sm mb-6 max-w-lg'}`}>
                Give any amount — Stripe or Cash App — then whisper{' '}
                <span className="text-aether-gold font-bold">@truufbtold</span> with your hub name so we can
                match your gift to your soul.
            </p>

            {showFundingBar && (
                <div className={`rounded-2xl border border-aether-gold/15 bg-aether-gold/[0.04] ${hut ? 'mb-4 p-3' : 'mb-6 p-5'}`}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">The forge fund</p>
                        <p className="font-mono text-xs font-black text-aether-gold">{fundingProgressLabel()}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(100, progress)}%`,
                                background: 'linear-gradient(90deg,#fcd34d,#b45309)',
                                boxShadow: '0 0 12px rgba(251,191,36,0.35)',
                            }}
                        />
                    </div>
                    <p className="mt-2 text-[8px] text-white/40 leading-snug">
                        {INFRASTRUCTURE_MILESTONES.find((m) => m.status === 'next')?.description}
                    </p>
                </div>
            )}

            <div className="space-y-3">
                <a
                    href={STRIPE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-[10px] font-black uppercase tracking-[0.22em] text-black transition-transform hover:scale-[1.02] active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)',
                        boxShadow: '0 0 28px rgba(251,191,36,0.22)',
                    }}
                >
                    Lay a stone · Stripe
                    <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                    href={CASH_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full flex-col items-center justify-center gap-0.5 rounded-full border border-white/15 bg-white/[0.06] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10 hover:border-white/25 active:scale-95"
                >
                    <span>Send via Cash App</span>
                    <span className="text-[11px] tracking-normal font-black text-[#00D632]">{CASH_TAG}</span>
                </a>
            </div>

            <p className="mt-4 text-center text-[9px] text-white/40 leading-relaxed">
                On Stripe, type support code <span className="font-black text-white">&quot;{STRIPE_SUPPORT_CODE}&quot;</span> if prompted.
                Tiered in-game rewards are coming — for now every gift keeps the lights on.
            </p>

            <details className="mt-5 group">
                <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-aether-gold list-none">
                    ▸ Planned patron tiers (coming soon)
                </summary>
                <div className="mt-3 space-y-3">
                    <p className="text-[8px] uppercase tracking-widest text-white/35">Monthly</p>
                    {RECURRING_TIERS.map((t) => (
                        <div key={t.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                            <p className="text-[10px] font-black text-white">
                                {t.priceLabel} · <span className="text-aether-gold/90">{t.title}</span>
                            </p>
                            <p className="text-[9px] text-white/45 mt-0.5">{t.tagline}</p>
                        </div>
                    ))}
                    <p className="text-[8px] uppercase tracking-widest text-white/35 pt-1">One-time</p>
                    {ONE_TIME_TIERS.map((t) => (
                        <div key={t.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                            <p className="text-[10px] font-black text-white">
                                {t.priceLabel} · <span className="text-aether-gold/90">{t.title}</span>
                            </p>
                            <p className="text-[9px] text-white/45 mt-0.5">{t.tagline}</p>
                        </div>
                    ))}
                </div>
            </details>
        </section>
    );
}