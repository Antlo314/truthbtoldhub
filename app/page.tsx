'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import CinematicVideo from '@/components/game/CinematicVideo';
import AmbientEmbers from '@/components/game/AmbientEmbers';
import TruthSprite from '@/components/game/TruthSprite';
import { countFounders, FOUNDER_CAP } from '@/lib/game/founders';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { useCountUp } from '@/lib/game/useCountUp';
import { useTiltParallax } from '@/lib/game/useTiltParallax';

function TitleCardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [pendingHref, setPendingHref] = useState('/awakening');
    const [founders, setFounders] = useState<number | null>(null);
    const [continueHref, setContinueHref] = useState<string | null>(null);

    useEffect(() => {
        const cipher = searchParams.get('cipher');
        if (cipher) localStorage.setItem('cipher_referral', cipher);
    }, [searchParams]);

    usePageMusic('title_landing');

    useEffect(() => {
        applyMusicSetting(loadSettings().music);
        countFounders().then(setFounders);
        try {
            const raw = localStorage.getItem('tbth-journey');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const st = parsed?.state;
            if (!st?.initiated) return;
            if (st.character?.path) setContinueHref('/world');
            else if (st.character?.name?.trim()) setContinueHref('/awakening/path');
            else setContinueHref('/awakening/create');
        } catch { /* ignore */ }
    }, []);

    // The remaining-seals count, ticking into place once visible.
    const remaining = founders !== null ? Math.max(0, FOUNDER_CAP - founders) : null;
    const [countShown, countRef] = useCountUp<HTMLDivElement>(remaining ?? 0, 1500);

    // Mouse-driven depth — the wordmark, aura and embers all live on different
    // planes so the composition reads as three-dimensional.
    const auraLayer = useTiltParallax(8);
    const titleLayer = useTiltParallax(16);
    const truthLayer = useTiltParallax(12);
    const emberLayer = useTiltParallax(22);

    // Truth stands at a real (layout-affecting) size per breakpoint. A CSS transform
    // scale would only shrink paint, leaving a too-tall box that can clip the CTA on
    // short phones — so we size the canvas itself. 5 ≈ 80×120, 7 ≈ 112×168.
    const [truthScale, setTruthScale] = useState(5);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const apply = () => setTruthScale(mq.matches ? 7 : 5);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);

    // Login is required to play. Check the session at click time; with one we go
    // straight in, without one we open the AuthModal and only proceed to the
    // target route after a session exists (sign-in / sign-up / demo).
    const enter = async (href: string) => {
        const { data } = await supabase.auth.getSession();
        // the gate cookie is what middleware actually checks — covers demo mode
        // (no real session) without bouncing it at /world
        const hasGate = typeof document !== 'undefined' && /(?:^|;\s*)sb-access-token=[^;]+/.test(document.cookie);
        if (data.session || hasGate) { router.push(href); return; }
        setPendingHref(href);
        setAuthOpen(true);
    };

    return (
        <main className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center px-6 text-center select-none">
            <CinematicVideo src={CINEMA.landing} overlay="heavy" showMuteControl />

            {/* Living particle field + focus vignette — the screen never sits still. */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                <div {...emberLayer.bind()} className="h-full w-full">
                    <AmbientEmbers density={48} tint="#fbbf24" />
                </div>
                <div className="absolute inset-0 title-vignette" />
            </div>

            {/* Focal scrim — guarantees the wordmark + Truth read over any bright video frame */}
            <div
                className="absolute inset-0 z-[2] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 62% 56% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 45%, transparent 78%)' }}
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center max-w-2xl pointer-events-none"
            >
                {/* Breathing aura behind the wordmark. Centering, parallax, and the
                    breathing scale each live on their own element so their transforms
                    compose instead of overriding one another. */}
                <div className="relative mb-6">
                    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div {...auraLayer.bind()}>
                            <div
                                className="title-breath"
                                style={{
                                    width: 360, height: 180,
                                    background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.28), rgba(180,83,9,0.10) 45%, transparent 70%)',
                                    filter: 'blur(8px)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Eyebrow + self-drawing rule */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
                    className="mb-7 flex flex-col items-center gap-3"
                >
                    <span className="text-[10px] uppercase tracking-[0.55em] text-amber-200/70">
                        An Aetheric RPG
                    </span>
                    <div className="h-px w-28 rule-draw" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)' }} />
                </motion.div>

                <div {...titleLayer.bind()} style={{ filter: 'drop-shadow(0 2px 18px rgba(0,0,0,0.55))' }}>
                    <motion.h1
                        initial={{ opacity: 0, y: 20, letterSpacing: '0.05em' }}
                        animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em' }}
                        transition={{ duration: 1.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="font-ritual text-5xl md:text-7xl font-black uppercase tracking-tight gold-shimmer leading-[0.95] mb-7"
                    >
                        Return to<br />the Source
                    </motion.h1>
                </div>

                {/* Truth — your guide, waiting in the light to walk you in */}
                <div {...truthLayer.bind()} className="relative mb-8 flex flex-col items-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        className="relative flex flex-col items-center"
                    >
                        <div
                            aria-hidden
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(180,83,9,0.08) 45%, transparent 70%)', filter: 'blur(6px)' }}
                        />
                        <div className="relative">
                            <TruthSprite scale={truthScale} className="truth-float" style={{ filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.55))' }} />
                            <div
                                aria-hidden
                                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                                style={{ bottom: -4, width: 130, height: 18, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.42) 0%, transparent 72%)' }}
                            />
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                    className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto"
                >
                    {continueHref ? (
                        <button
                            onClick={() => enter(continueHref)}
                            className="cta-pulse px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                        >
                            Continue the Journey →
                        </button>
                    ) : (
                        <button
                            onClick={() => enter('/awakening')}
                            className="cta-pulse px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                        >
                            Begin the Awakening →
                        </button>
                    )}
                    {continueHref && (
                        <RestartJourneyButton
                            label="New Soul"
                            variant="button"
                            className="rounded-full px-6 py-3"
                        />
                    )}
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.95, duration: 0.8 }}
                    onClick={() => enter('/archive')}
                    className="mt-5 pointer-events-auto text-[10px] uppercase tracking-[0.3em] text-amber-200/70 hover:text-amber-200 transition-colors"
                >
                    Commune in the Sanctum →
                </motion.button>

                {founders !== null && (
                    <div ref={countRef} className="mt-9 pointer-events-none">
                        {remaining !== null && remaining > 0 ? (
                            <motion.p
                                key={remaining}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.0, duration: 0.6 }}
                                className="text-[9px] uppercase tracking-[0.3em] text-white/40 flex items-baseline justify-center gap-1.5"
                            >
                                <span className="font-ritual text-amber-200/80 text-base tabular-nums leading-none">
                                    {countShown}
                                </span>
                                <span>of {FOUNDER_CAP} founding seals remain</span>
                            </motion.p>
                        ) : (
                            <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-white/30">All 144 founding seals claimed</p>
                        )}
                    </div>
                )}
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 1 }}
                className="absolute bottom-6 z-10 text-[8px] uppercase tracking-[0.4em] text-white/20 pointer-events-none"
            >
                Truth B Told Hub © {new Date().getFullYear()}
            </motion.p>

            <AuthModal
                isOpen={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={() => router.push(pendingHref)}
            />
        </main>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <TitleCardInner />
        </Suspense>
    );
}
