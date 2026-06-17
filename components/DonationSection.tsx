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
            <p className={`text-white/60 leading-relaxed ${hut ? 'text-[11px] mb-4' : 'text-sm mb-6 max-w-lg'}`}>
                Fuel the 400 Series and the Sacred Sanctum. Give any amount — Stripe or Cash App — and DM{' '}
                <span className="text-aether-gold font-bold">@truufbtold</span> with your hub name so we can match your gift.
            </p>

            {showFundingBar && (
                <div className={`rounded-2xl border border-white/10 bg-white/[0.03] ${hut ? 'mb-4 p-3' : 'mb-6 p-5'}`}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Infrastructure fund</p>
                        <p className="font-mono text-xs font-black text-aether-gold">{fundingProgressLabel()}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(100, progress)}%`,
                                background: 'linear-gradient(90deg,#fcd34d,#b45309)',
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02] active:scale-95"
                >
                    Give via Stripe
                    <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                    href={CASH_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-[#00D632] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02] active:scale-95"
                >
                    <span>Send via Cash App</span>
                    <span className="text-[11px] tracking-normal font-black">{CASH_TAG}</span>
                </a>
            </div>

            <p className="mt-4 text-center text-[9px] text-white/40 leading-relaxed">
                On Stripe, type support code <span className="font-black text-white">&quot;{STRIPE_SUPPORT_CODE}&quot;</span> if prompted.
                Tiered in-game rewards are coming — for now every gift helps keep the lights on.
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