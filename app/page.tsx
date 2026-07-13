'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { countFounders, FOUNDER_CAP } from '@/lib/game/founders';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import SacredButton from '@/components/sanctum/SacredButton';
import { BRAND } from '@/lib/brand/assets';
import { visionStats } from '@/lib/brand/visionProgress';
import { DURATION, EASE } from '@/lib/design/motion';

function TitleInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [pendingHref, setPendingHref] = useState('/awakening');
    const [founders, setFounders] = useState<number | null>(null);
    const [continueHref, setContinueHref] = useState<string | null>(null);
    const [soulName, setSoulName] = useState<string | null>(null);
    const [roadNote, setRoadNote] = useState<string | null>(null);

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
            setContinueHref('/world');
            const n = st?.character?.name?.trim();
            if (n) setSoulName(n);
        } catch { /* */ }
        try {
            const s = visionStats();
            if (s.complete) setRoadNote('Every vision open — the Source remembers.');
            else if (s.seen > 0) setRoadNote(`${s.seen}/${s.total} portals · ${s.relics} relics`);
        } catch { /* */ }
    }, []);

    const remaining = founders !== null ? Math.max(0, FOUNDER_CAP - founders) : null;

    const enter = async (href: string) => {
        const { data } = await supabase.auth.getSession();
        const hasGate =
            typeof document !== 'undefined' && /(?:^|;\s*)sb-access-token=[^;]+/.test(document.cookie);
        if (data.session || hasGate) {
            router.push(href);
            return;
        }
        setPendingHref(href);
        setAuthOpen(true);
    };

    return (
        <main className="relative min-h-[100dvh] bg-[#03040a] text-white overflow-hidden">
            {/* Atmosphere */}
            <div className="pointer-events-none absolute inset-0">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage: `url(${BRAND.keyart})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'saturate(0.85) brightness(0.55)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#03040a]/55 to-[#03040a]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(251,191,36,0.12),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(99,102,241,0.1),transparent_50%)]" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 sm:px-8 py-8 sm:py-10">
                {/* Nav */}
                <header className="flex items-center justify-between gap-4">
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-aether-gold/80 font-semibold">
                        Truth B Told Hub
                    </p>
                    <nav className="flex items-center gap-1 sm:gap-3 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-white/45">
                        <Link href="/vision" className="px-2 py-1 hover:text-aether-gold transition-colors">Visions</Link>
                        <Link href="/archive" className="px-2 py-1 hover:text-aether-gold transition-colors hidden sm:inline">Hall</Link>
                        <Link href="/support" className="px-2 py-1 hover:text-aether-gold transition-colors">Offering</Link>
                    </nav>
                </header>

                {/* Hero */}
                <div className="flex-1 flex flex-col justify-center py-12 sm:py-16 max-w-2xl">
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.settle, ease: EASE.breath }}
                        className="text-[11px] uppercase tracking-[0.4em] text-aether-gold/70 mb-4"
                    >
                        An aetheric RPG sanctuary
                    </motion.p>
                    <motion.h1
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.threshold, ease: EASE.breath, delay: 0.05 }}
                        className="font-ritual text-4xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight"
                    >
                        Walk with Truth.
                        <span className="block text-aether-gold mt-2">Return to the Source.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.settle, ease: EASE.breath, delay: 0.12 }}
                        className="mt-6 text-base sm:text-lg text-white/60 max-w-lg leading-relaxed"
                    >
                        Awaken. Shape your vessel. Enter Truth&apos;s Hut — a living chamber where questions open,
                        and the first road waits.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.settle, ease: EASE.breath, delay: 0.18 }}
                        className="mt-9 flex flex-col sm:flex-row flex-wrap gap-3"
                    >
                        {continueHref ? (
                            <>
                                <SacredButton size="lg" pulse onClick={() => enter(continueHref)}>
                                    Continue{soulName ? ` · ${soulName}` : ''}
                                </SacredButton>
                                <SacredButton size="lg" variant="ghost" onClick={() => enter('/awakening')}>
                                    Begin anew
                                </SacredButton>
                            </>
                        ) : (
                            <SacredButton size="lg" pulse onClick={() => enter('/awakening')}>
                                Awaken
                            </SacredButton>
                        )}
                        <SacredButton size="lg" variant="ghost" onClick={() => enter('/world')}>
                            Enter the Hut
                        </SacredButton>
                    </motion.div>

                    {roadNote && (
                        <p className="mt-5 text-sm text-white/40">{roadNote}</p>
                    )}
                </div>

                {/* Bottom strip */}
                <footer className="grid gap-4 sm:grid-cols-3 border-t border-white/10 pt-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">The chamber</p>
                        <p className="text-sm text-white/70">Truth&apos;s Hut · ask · forge your form</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">Founding seals</p>
                        <p className="text-sm text-white/70">
                            {remaining !== null
                                ? `${remaining} of ${FOUNDER_CAP} remaining`
                                : 'Counting the sealed…'}
                        </p>
                    </div>
                    <div className="flex sm:justify-end items-end gap-3">
                        <RestartJourneyButton />
                        <span className="text-[11px] text-white/25">© {new Date().getFullYear()}</span>
                    </div>
                </footer>
            </div>

            <AuthModal
                isOpen={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={() => {
                    setAuthOpen(false);
                    router.push(pendingHref);
                }}
            />
        </main>
    );
}

export default function HomePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[100dvh] bg-[#03040a] flex items-center justify-center text-aether-gold/50 text-xs tracking-[0.3em] uppercase">
                    Loading…
                </div>
            }
        >
            <TitleInner />
        </Suspense>
    );
}
