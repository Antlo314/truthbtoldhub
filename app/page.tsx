'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import CinematicVideo from '@/components/game/CinematicVideo';
import { countFounders, FOUNDER_CAP } from '@/lib/game/founders';
import { CINEMA } from '@/lib/game/cutscenes';

function TitleCardInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [authOpen, setAuthOpen] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [founders, setFounders] = useState<number | null>(null);

    useEffect(() => {
        const cipher = searchParams.get('cipher');
        if (cipher) localStorage.setItem('cipher_referral', cipher);
    }, [searchParams]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
        countFounders().then(setFounders);
    }, []);

    return (
        <main className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center px-6 text-center select-none">
            <CinematicVideo src={CINEMA.landing} overlay="medium" showMuteControl />

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
                    <button
                        onClick={() => router.push('/awakening')}
                        className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                    >
                        Begin the Awakening →
                    </button>
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