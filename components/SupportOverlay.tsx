'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ShieldCheck,
    ArrowRight,
    Eye,
    Music,
    ScrollText,
    Star,
    Sparkles,
    Cpu,
    User,
    Server,
    Gpu,
    Volume2,
    Zap,
} from 'lucide-react';

const CASH_APP_URL = 'https://cash.app/$truufbtold';
const STRIPE_URL = 'https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01';

const SERIES_TIERS = [
    { tier: '$5', title: 'Echo Ticket', icon: Eye },
    { tier: '$10', title: 'Frequency Bundle', icon: Music, best: true },
    { tier: '$25', title: 'Chronicle Pass', icon: ScrollText },
    { tier: '$50', title: 'Oracle Status', icon: Star },
    { tier: '$100', title: 'Founding Architect', icon: ShieldCheck },
    { tier: '$400', title: 'Prophetic Ancestor', icon: Sparkles },
];

const HARDWARE_ITEMS = [
    { icon: User, title: 'Production & Labor', val: '$4,500' },
    { icon: Server, title: 'AI Workstation', val: '$3,200' },
    { icon: Gpu, title: 'RTX 4090 Core', val: '$1,800' },
    { icon: Volume2, title: 'Studio Audio', val: '$500' },
];

interface SupportOverlayProps {
    isOpen: boolean;
    mode: 'series' | 'hardware';
    onClose: () => void;
    onModeChange: (mode: 'series' | 'hardware') => void;
    playSfx?: (key: string) => void;
}

export default function SupportOverlay({ isOpen, mode, onClose, onModeChange, playSfx }: SupportOverlayProps) {
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
                                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                                        {SERIES_TIERS.map((t) => {
                                            const Icon = t.icon;
                                            return (
                                                <div
                                                    key={t.tier}
                                                    className={`relative flex flex-col items-center justify-center rounded-2xl border p-2.5 md:p-3 ${t.best ? 'border-aether-gold/40 bg-aether-gold/5' : 'border-white/10 bg-white/[0.03]'}`}
                                                >
                                                    {t.best && (
                                                        <span className="absolute -top-1.5 rounded-full bg-aether-gold px-2 py-0.5 text-[5px] font-black uppercase text-black">Best</span>
                                                    )}
                                                    <Icon className={`mb-1 h-3.5 w-3.5 ${t.best ? 'text-aether-gold' : 'text-white/40'}`} />
                                                    <span className="font-ritual text-sm font-black text-white md:text-base">{t.tier}</span>
                                                    <span className="mt-0.5 text-[6px] font-black uppercase leading-tight tracking-wider text-white/50 md:text-[7px]">{t.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                                        {HARDWARE_ITEMS.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                                        <Icon className="h-4 w-4 text-white/60" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block truncate text-[7px] font-black uppercase tracking-wider text-white">{item.title}</span>
                                                        <span className="block text-[9px] font-ritual font-black text-aether-gold">{item.val}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-white/40">
                                        <span>Infrastructure Goal</span>
                                        <span className="text-white">$4,821 / $10,000</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full w-[48.2%] bg-aether-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]" />
                                    </div>
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
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}