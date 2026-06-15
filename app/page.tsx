'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';

// ============================================================
//  TITLE CARD — the front door of Truth B Told Hub.
//  The game is now the site: this is the title screen that opens
//  the initiation. Sign-in (real Supabase auth) and the ?cipher=
//  referral capture are preserved from the old landing.
//  The previous marketing landing remains in git history.
// ============================================================

function TitleCardInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [authOpen, setAuthOpen] = useState(false);
    const [hasSession, setHasSession] = useState(false);

    // preserve referral capture
    useEffect(() => {
        const cipher = searchParams.get('cipher');
        if (cipher) localStorage.setItem('cipher_referral', cipher);
    }, [searchParams]);

    // returning souls get "continue" instead of "begin"
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    }, []);

    return (
        <main className="relative min-h-screen bg-void text-white overflow-hidden flex flex-col items-center justify-center px-6 text-center select-none">
            {/* aether glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(circle at 50% 38%, rgba(251,191,36,0.12), transparent 55%)',
                }}
            />
            {/* breathing ember */}
            <div
                className="absolute top-[22%] w-2 h-2 rounded-full bg-aether-gold"
                style={{ boxShadow: '0 0 30px 8px rgba(251,191,36,0.45)', animation: 'awakenBreathe 4s ease-in-out infinite' }}
            />
            {/* two faint, watching eyes */}
            <div className="absolute top-[20%] flex gap-10 opacity-[0.07] pointer-events-none">
                <div className="w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle,#fff,transparent 60%)' }} />
                <div className="w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle,#fff,transparent 60%)' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center max-w-2xl"
            >
                <img
                    src="/brand/logo-gold.png"
                    alt=""
                    className="w-16 h-16 mb-6 opacity-80"
                    onError={(e) => ((e.currentTarget.style.display = 'none'))}
                />

                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-aether-gold/70 mb-6">
                    Truth B Told Hub · An Initiation
                </p>

                <h1 className="font-ritual text-5xl md:text-7xl font-black uppercase tracking-tight gold-shimmer leading-[0.95] mb-7">
                    Return to<br />the Source
                </h1>

                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl mb-12 font-ritual italic">
                    They built a dream and called it the world. Truth is waiting in the dark —
                    open your eyes, and walk back to the beginning.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={() => (hasSession ? router.push('/awakening') : setAuthOpen(true))}
                        className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03] active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                    >
                        {hasSession ? 'Continue the Journey →' : 'Begin the Awakening →'}
                    </button>

                    {!hasSession && (
                        <button
                            onClick={() => setAuthOpen(true)}
                            className="text-[11px] uppercase tracking-[0.3em] text-white/40 hover:text-aether-gold transition-colors"
                        >
                            Already awake? Sign in
                        </button>
                    )}
                </div>
            </motion.div>

            <p className="absolute bottom-6 text-[8px] uppercase tracking-[0.4em] text-white/20">
                Truth B Told Hub © {new Date().getFullYear()}
            </p>

            <AuthModal
                isOpen={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={() => router.push('/awakening')}
            />
        </main>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-void" />}>
            <TitleCardInner />
        </Suspense>
    );
}
