'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import CinematicVideo from '@/components/game/CinematicVideo';
import { countFounders, FOUNDER_CAP } from '@/lib/game/founders';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';

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

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center max-w-2xl pointer-events-none"
            >
                <h1 className="font-ritual text-5xl md:text-7xl font-black uppercase tracking-tight gold-shimmer leading-[0.95] mb-10 pointer-events-none">
                    Return to<br />the Source
                </h1>

                <div className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
                    {continueHref ? (
                        <button
                            onClick={() => enter(continueHref)}
                            className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                        >
                            Continue the Journey →
                        </button>
                    ) : (
                        <button
                            onClick={() => enter('/awakening')}
                            className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
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
                </div>

                {founders !== null && (
                    founders < FOUNDER_CAP ? (
                        <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-white/35 pointer-events-none">
                            {FOUNDER_CAP - founders} of {FOUNDER_CAP} founding seals remain
                        </p>
                    ) : (
                        <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-white/30 pointer-events-none">All 144 founding seals claimed</p>
                    )
                )}
            </motion.div>

            <p className="absolute bottom-6 z-10 text-[8px] uppercase tracking-[0.4em] text-white/20 pointer-events-none">
                Truth B Told Hub © {new Date().getFullYear()}
            </p>

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