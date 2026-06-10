'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ArrowRight,
    Zap,
    Check,
    Rocket,
    Target,
    CircleDot,
} from 'lucide-react';
import {
    CASH_APP_URL,
    STRIPE_URL,
    FUNDING_RAISED,
    fundingProgressLabel,
    fundingProgressPercent,
    INFRASTRUCTURE_MILESTONES,
    PRODUCTION_RESUME_AT,
    formatFunding,
} from '../lib/supportFunding';
import { SUPPORT_TIERS, type SupportTier } from '../lib/supportTiers';

interface SupportOverlayProps {
    isOpen: boolean;
    mode: 'series' | 'hardware';
    onClose: () => void;
    onModeChange: (mode: 'series' | 'hardware') => void;
    playSfx?: (key: string) => void;
}

function TierDetailModal({
    tier,
    onClose,
    playSfx,
}: {
    tier: SupportTier;
    onClose: () => void;
    playSfx?: (key: string) => void;
}) {
    const Icon = tier.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => { playSfx?.('click'); onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[min(520px,85dvh)] w-full max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0a0a0a] shadow-[0_0_80px_rgba(212,175,55,0.15)]"
            >
                <div className="relative shrink-0 border-b border-white/10 px-5 py-4 text-center">
                    <button
                        onClick={() => { playSfx?.('click'); onClose(); }}
                        className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-all hover:text-white"
                        aria-label="Close tier details"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-aether-gold/30 bg-aether-gold/10">
                        <Icon className="h-5 w-5 text-aether-gold" />
                    </div>
                    <p className="font-ritual text-2xl font-black text-white">{tier.tier}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-aether-gold">{tier.title}</p>
                    <p className="mt-1 text-[10px] text-white/50">{tier.tagline}</p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <p className="mb-3 text-[7px] font-black uppercase tracking-[0.3em] text-white/35">What you get</p>
                    <ul className="space-y-2.5">
                        {tier.rewards.map((reward) => (
                            <li key={reward} className="flex items-start gap-2.5 text-left">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aether-gold" />
                                <span className="text-[10px] leading-relaxed text-white/75">{reward}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-[9px] leading-relaxed text-white/45">
                        <span className="font-black uppercase tracking-wider text-white/60">How we deliver: </span>
                        {tier.delivery}
                    </p>
                </div>

                <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
                    <a
                        href={CASH_APP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playSfx?.('click')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00D632] py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02] active:scale-95"
                    >
                        Contribute {tier.tier} · Cash App
                    </a>
                    <a
                        href={STRIPE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playSfx?.('click')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02] active:scale-95"
                    >
                        Contribute {tier.tier} · Stripe
                        <ArrowRight className="h-3 w-3" />
                    </a>
                    {tier.amount >= 10 && (
                        <p className="text-center text-[7px] uppercase tracking-[0.15em] text-white/35">
                            Stripe code: <span className="font-black text-white">&quot;400&quot;</span>
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

const milestoneIcon = {
    active: CircleDot,
    next: Rocket,
    goal: Target,
} as const;

export default function SupportOverlay({ isOpen, mode, onClose, onModeChange, playSfx }: SupportOverlayProps) {
    const [selectedTier, setSelectedTier] = useState<SupportTier | null>(null);
    const progress = fundingProgressPercent();

    useEffect(() => {
        if (!isOpen) setSelectedTier(null);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;

        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overscrollBehavior = 'none';

        return () => {
            html.style.overflow = '';
            body.style.overflow = '';
            body.style.position = '';
            body.style.top = '';
            body.style.left = '';
            body.style.right = '';
            body.style.width = '';
            body.style.overscrollBehavior = '';
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10001] grid h-[100dvh] w-full place-items-center overflow-hidden bg-black/95 p-4 backdrop-blur-2xl"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="relative flex h-full max-h-[min(680px,100dvh)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_0_120px_rgba(212,175,55,0.12)] md:max-w-2xl md:rounded-[2.5rem]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-[#050505]/95 to-[#050505]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_55%)]" />

                        <button
                            onClick={() => { playSfx?.('click'); onClose(); }}
                            className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-white/5 p-2.5 text-white/50 transition-all hover:border-white/30 hover:text-white active:scale-90"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative z-10 flex h-full flex-col items-center justify-between px-5 py-6 text-center md:px-8 md:py-8">
                            <div className="w-full space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-aether-gold/30 bg-aether-gold/5 px-4 py-1.5">
                                    <Zap className="h-3 w-3 text-aether-gold" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.35em] text-aether-gold">Fiscal Foundation</span>
                                </div>
                                <h2 className="font-ritual text-xl font-black uppercase leading-tight text-white md:text-3xl">
                                    Support the Vision
                                </h2>
                                <p className="text-xs text-white/60 md:text-sm">
                                    <a href={CASH_APP_URL} target="_blank" rel="noopener noreferrer" className="font-black text-[#00D632] hover:underline">@truufbtold</a>
                                    <span className="mx-2 text-white/30">·</span>
                                    <span className="italic text-white">&apos;Ant Cee&apos;</span>
                                </p>
                            </div>

                            <div className="flex w-full max-w-sm gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                                {(['series', 'hardware'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => { playSfx?.('click'); onModeChange(m); }}
                                        className={`flex-1 rounded-xl py-2 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${mode === m ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {m === 'series' ? 'Vision Tiers' : 'Infrastructure'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex w-full flex-1 flex-col justify-center py-2">
                                {mode === 'series' ? (
                                    <div className="space-y-2">
                                        <p className="text-[7px] font-black uppercase tracking-[0.25em] text-white/35">Tap a tier for real rewards</p>
                                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                                            {SUPPORT_TIERS.map((t) => {
                                                const Icon = t.icon;
                                                return (
                                                    <button
                                                        key={t.tier}
                                                        type="button"
                                                        onClick={() => { playSfx?.('click'); setSelectedTier(t); }}
                                                        className={`relative flex flex-col items-center justify-center rounded-2xl border p-2.5 transition-all md:p-3 ${t.best ? 'border-aether-gold/40 bg-aether-gold/5 hover:border-aether-gold/70 hover:bg-aether-gold/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'} active:scale-95`}
                                                    >
                                                        {t.best && (
                                                            <span className="absolute -top-1.5 rounded-full bg-aether-gold px-2 py-0.5 text-[5px] font-black uppercase text-black">Best</span>
                                                        )}
                                                        <Icon className={`mb-1 h-3.5 w-3.5 ${t.best ? 'text-aether-gold' : 'text-white/40'}`} />
                                                        <span className="font-ritual text-sm font-black text-white md:text-base">{t.tier}</span>
                                                        <span className="mt-0.5 text-[6px] font-black uppercase leading-tight tracking-wider text-white/50 md:text-[7px]">{t.title}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-left">
                                        <p className="text-center text-[7px] font-black uppercase tracking-[0.25em] text-white/35">Honest roadmap — no inflated numbers</p>
                                        <div className="space-y-2">
                                            {INFRASTRUCTURE_MILESTONES.map((milestone) => {
                                                const Icon = milestoneIcon[milestone.status];
                                                const reached = milestone.amount <= FUNDING_RAISED;
                                                return (
                                                    <div
                                                        key={milestone.label}
                                                        className={`flex gap-3 rounded-2xl border p-3 ${milestone.status === 'next' ? 'border-orange-500/30 bg-orange-500/5' : reached ? 'border-aether-gold/25 bg-aether-gold/5' : 'border-white/10 bg-white/[0.03]'}`}
                                                    >
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${milestone.status === 'next' ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/10 bg-white/5'}`}>
                                                            <Icon className={`h-4 w-4 ${milestone.status === 'next' ? 'text-orange-400' : milestone.status === 'active' ? 'text-aether-gold' : 'text-white/50'}`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="text-[7px] font-black uppercase tracking-wider text-white">{milestone.label}</span>
                                                                <span className="shrink-0 text-[9px] font-ritual font-black text-aether-gold">${formatFunding(milestone.amount)}</span>
                                                            </div>
                                                            <p className="mt-1 text-[9px] leading-relaxed text-white/55">{milestone.description}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-white/40">
                                        <span>Infrastructure Goal</span>
                                        <span className="text-white">{fundingProgressLabel()}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full bg-aether-gold shadow-[0_0_12px_rgba(212,175,55,0.4)] transition-all duration-700"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[7px] uppercase tracking-[0.15em] text-orange-400/80">
                                        ${formatFunding(PRODUCTION_RESUME_AT)} unlocks production + massive rollout
                                    </p>
                                </div>

                                <a
                                    href={CASH_APP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => playSfx?.('click')}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D632] py-3.5 text-[9px] font-black uppercase tracking-[0.25em] text-black shadow-[0_0_30px_rgba(0,214,50,0.3)] transition-transform hover:scale-[1.02] active:scale-95"
                                >
                                    Cash App · @truufbtold
                                </a>
                                <a
                                    href={STRIPE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => playSfx?.('click')}
                                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[9px] font-black uppercase tracking-[0.25em] text-black shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-transform hover:scale-[1.02] active:scale-95"
                                >
                                    Initialize via Stripe
                                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                </a>
                                <p className="text-[7px] uppercase leading-relaxed tracking-[0.15em] text-white/35">
                                    Type <span className="rounded bg-white/10 px-1.5 py-0.5 font-black text-white">&quot;400&quot;</span> in the Stripe Referral / Support Code
                                </p>
                            </div>
                        </div>

                        <AnimatePresence>
                            {selectedTier && (
                                <TierDetailModal
                                    tier={selectedTier}
                                    onClose={() => setSelectedTier(null)}
                                    playSfx={playSfx}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}