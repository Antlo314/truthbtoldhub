'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SacredButton from '@/components/sanctum/SacredButton';
import { DURATION, EASE } from '@/lib/design/motion';

const KEY = 'tbth-journey-brief-v1';

const STEPS = [
    { title: 'Walk the aisle', body: 'Truth waits at the north end of the chamber. Approach and press E to speak.' },
    { title: 'Touch the stations', body: 'Gold rings mark living stations — Ledger, Archive, Forge, Offering, Arcade, Wayfinder, and more.' },
    { title: 'Cross the Hub', body: 'The Sanctum door and Wayfinder open the Hall, Library, Cinema, and Offering on the wider Hub.' },
    { title: 'Return often', body: 'Your soul, iron, and trust with Truth persist. The hut is home — the roads beyond are still being laid.' },
];

/**
 * One-time briefing when a soul first enters /world after the veil lifts.
 * Completes the "what do I do here?" gap in the 3D experience.
 */
export default function JourneyBrief({ ready }: { ready: boolean }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!ready) return;
        try {
            if (localStorage.getItem(KEY)) return;
        } catch { /* */ }
        const t = setTimeout(() => setOpen(true), 1100);
        return () => clearTimeout(t);
    }, [ready]);

    const finish = () => {
        try { localStorage.setItem(KEY, '1'); } catch { /* */ }
        setOpen(false);
    };

    const next = () => {
        if (step >= STEPS.length - 1) finish();
        else setStep((s) => s + 1);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.settle }}
                    className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-8 pointer-events-auto"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 100%)' }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: DURATION.settle, ease: EASE.breath }}
                        className="w-full max-w-md rounded-3xl border border-aether-gold/25 bg-black/85 backdrop-blur-xl p-6 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
                    >
                        <p className="text-[9px] uppercase tracking-[0.45em] text-aether-gold/70 mb-2">
                            First steps · {step + 1} / {STEPS.length}
                        </p>
                        <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-aether-gold-deep to-aether-gold transition-all duration-300"
                                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                        <h2 className="font-ritual text-2xl text-white mb-2">{STEPS[step].title}</h2>
                        <p className="text-sm text-white/55 leading-relaxed mb-6">{STEPS[step].body}</p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={finish}
                                className="text-[10px] uppercase tracking-[0.25em] text-white/35 hover:text-white/60"
                            >
                                Skip
                            </button>
                            <div className="flex-1" />
                            <SacredButton size="md" pulse onClick={next}>
                                {step >= STEPS.length - 1 ? 'Enter the hut' : 'Continue'}
                            </SacredButton>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
