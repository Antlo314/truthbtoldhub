'use client';

import { founderTierFor, type FounderTier } from '@/lib/game/founders';

// Small circular seal showing the founder number, coloured by tier.
export function FounderBadge({ founderNumber, size = 26 }: { founderNumber: number | null; size?: number }) {
    const tier = founderTierFor(founderNumber);
    if (!tier || !founderNumber) return null;
    return (
        <div
            title={`${tier.name} · Founder #${founderNumber}`}
            className="rounded-full flex items-center justify-center font-black shrink-0"
            style={{
                width: size,
                height: size,
                background: tier.ring,
                color: '#1a1206',
                fontSize: Math.round(size * 0.42),
                border: `1px solid ${tier.color}`,
                boxShadow: `0 0 12px ${tier.color}66`,
            }}
        >
            {founderNumber}
        </div>
    );
}

// Full reward card (used on the grant toast / a rewards screen).
export function FounderSeal({ tier, founderNumber }: { tier: FounderTier; founderNumber: number | null }) {
    return (
        <div
            className="rounded-2xl p-5 border text-center relative overflow-hidden"
            style={{ borderColor: tier.color + '55', background: tier.color + '0f' }}
        >
            <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center font-black text-xl mb-3"
                style={{ background: tier.ring, color: '#1a1206', boxShadow: `0 0 22px ${tier.color}66`, border: `1px solid ${tier.color}` }}
            >
                {founderNumber ?? '✦'}
            </div>
            <p className="text-[9px] uppercase tracking-[0.4em] mb-1" style={{ color: tier.color }}>{tier.subtitle}</p>
            <h3 className="font-ritual text-2xl text-white mb-2">{tier.name}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">{tier.blurb}</p>
            <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest">
                <span style={{ color: tier.color }}>+{tier.bonusSkillPoints} skill {tier.bonusSkillPoints === 1 ? 'point' : 'points'}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest mt-2" style={{ color: tier.color }}>⚔ {tier.combat.label}</p>
            <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">{tier.perk}</p>
        </div>
    );
}
