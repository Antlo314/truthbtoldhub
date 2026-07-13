'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import CinematicVideo from '@/components/game/CinematicVideo';
import TruthSprite from '@/components/game/TruthSprite';
import { countFounders, FOUNDER_CAP } from '@/lib/game/founders';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { useCountUp } from '@/lib/game/useCountUp';
import { useTiltParallax } from '@/lib/game/useTiltParallax';
import SacredButton from '@/components/sanctum/SacredButton';
import { DURATION, EASE } from '@/lib/design/motion';
import { BRAND } from '@/lib/brand/assets';
import { visionStats } from '@/lib/brand/visionProgress';
import NextRoadCard from '@/components/sanctum/NextRoadCard';

function TitleCardInner() {
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
        } catch { /* ignore */ }
        try {
            const s = visionStats();
            if (s.complete) setRoadNote('Every vision open — the Source remembers.');
            else if (s.seen > 0) setRoadNote(`${s.seen}/${s.total} portals · ${s.relics} relics carried`);
        } catch { /* ignore */ }
    }, []);

    const remaining = founders !== null ? Math.max(0, FOUNDER_CAP - founders) : null;
    const [countShown, countRef] = useCountUp<HTMLDivElement>(remaining ?? 0, 1500);

    const auraLayer = useTiltParallax(8);
    const titleLayer = useTiltParallax(16);
    const truthLayer = useTiltParallax(12);

    const [truthScale, setTruthScale] = useState(5);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const apply = () => setTruthScale(mq.matches ? 7 : 5);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);

    const enter = async (href: string) => {
        const { data } = await supabase.auth.getSession();
        const hasGate = typeof document !== 'undefined' && /(?:^|;\s*)sb-access-token=[^;]+/.test(document.cookie);
        if (data.session || hasGate) {
            router.push(href);
            return;
        }
        setPendingHref(href);
        setAuthOpen(true);
    };

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-hidden flex flex-col items-center justify-center px-6 text-center select-none">
            <CinematicVideo src={CINEMA.landing} overlay="heavy" showMuteControl />
            {/* Dual presence: key art + portal loop under cinema */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none opacity-30"
                style={{
                    backgroundImage: `url(${BRAND.keyart})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    mixBlendMode: 'screen',
                }}
            />
            <video
                autoPlay muted loop playsInline
                poster={BRAND.portal}
                className="absolute inset-0 z-[1] w-full h-full object-cover pointer-events-none opacity-20 mix-blend-screen"
            >
                <source src={BRAND.video.portal} type="video/mp4" />
            </video>

            <div className="absolute inset-0 z-[2] pointer-events-none title-vignette" />
            <div
                className="absolute inset-0 z-[2] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 62% 56% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, transparent 78%)' }}
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: DURATION.threshold, ease: EASE.breath }}
                className="relative z-10 flex flex-col items-center max-w-2xl pointer-events-none"
            >
                <div className="relative mb-6">
                    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div {...auraLayer.bind()}>
                            <div
                                className="title-breath"
                                style={{
                                    width: 360,
                                    height: 180,
                                    background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.28), rgba(180,83,9,0.10) 45%, transparent 70%)',
                                    filter: 'blur(8px)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.ritual, delay: 0.2, ease: EASE.breath }}
                    className="mb-7 flex flex-col items-center gap-3"
                >
                    <span className="text-[10px] uppercase tracking-[0.55em] text-amber-200/70">
                        Awaken · Choose · Enter the Hut
                    </span>
                    <div
                        className="h-px w-28 rule-draw"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)' }}
                    />
                </motion.div>

                <div {...titleLayer.bind()} style={{ filter: 'drop-shadow(0 2px 18px rgba(0,0,0,0.55))' }}>
                    <motion.h1
                        initial={{ opacity: 0, y: 20, letterSpacing: '0.05em' }}
                        animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em' }}
                        transition={{ duration: DURATION.long, delay: 0.12, ease: EASE.breath }}
                        className="font-ritual text-5xl md:text-7xl font-black uppercase tracking-tight gold-shimmer leading-[0.95] mb-4"
                    >
                        Return to<br />the Source
                    </motion.h1>
                </div>

                {continueHref && soulName && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55, duration: DURATION.settle }}
                        className="mb-5 text-[11px] text-white/45 font-ritual tracking-wide"
                    >
                        {soulName} — the veil thins again.
                    </motion.p>
                )}

                <div {...truthLayer.bind()} className="relative mb-8 flex flex-col items-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.45, ease: EASE.breath }}
                        className="relative flex flex-col items-center"
                    >
                        <div
                            aria-hidden
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                                width: 260,
                                height: 260,
                                background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(180,83,9,0.08) 45%, transparent 70%)',
                                filter: 'blur(6px)',
                            }}
                        />
                        <div className="relative">
                            <TruthSprite
                                scale={truthScale}
                                className="truth-float"
                                style={{ filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.55))' }}
                            />
                            <div
                                aria-hidden
                                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                                style={{
                                    bottom: -4,
                                    width: 130,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.42) 0%, transparent 72%)',
                                }}
                            />
                        </div>
                    </motion.div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.8 }}
                    className="mb-6 text-[11px] sm:text-xs text-white/40 max-w-sm leading-relaxed text-balance pointer-events-none"
                >
                    An aetheric RPG sanctuary. Awaken with Truth, choose your path, and walk the living hut.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.settle, delay: 0.65, ease: EASE.breath }}
                    className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto"
                >
                    {continueHref ? (
                        <SacredButton size="lg" pulse onClick={() => enter(continueHref)}>
                            Continue the Journey →
                        </SacredButton>
                    ) : (
                        <SacredButton size="lg" pulse onClick={() => enter('/awakening')}>
                            Begin the Awakening →
                        </SacredButton>
                    )}
                    {continueHref && (
                        <RestartJourneyButton
                            label="New Soul"
                            variant="button"
                            className="rounded-full px-6 py-3"
                        />
                    )}
                </motion.div>

                {roadNote && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        className="mt-5 text-[10px] uppercase tracking-[0.28em] text-aether-gold/50 pointer-events-none"
                    >
                        {roadNote}
                    </motion.p>
                )}

                {roadNote && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.5 }}
                        className="mt-4 w-full max-w-sm pointer-events-auto text-left"
                    >
                        <NextRoadCard compact />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1, duration: 0.8 }}
                    className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pointer-events-auto text-[9px] uppercase tracking-[0.28em] text-white/30"
                >
                    <button type="button" onClick={() => enter('/awakening')} className="hover:text-aether-gold/80 transition-colors">Awaken</button>
                    <span className="text-white/15">·</span>
                    <button type="button" onClick={() => enter('/world')} className="hover:text-aether-gold/80 transition-colors">Hut</button>
                    <span className="text-white/15">·</span>
                    <button type="button" onClick={() => router.push('/vision')} className="hover:text-aether-gold/80 transition-colors">Visions</button>
                    <span className="text-white/15">·</span>
                    <button type="button" onClick={() => enter('/archive')} className="hover:text-aether-gold/80 transition-colors">Hall</button>
                    <span className="text-white/15">·</span>
                    <button type="button" onClick={() => router.push('/cinema')} className="hover:text-aether-gold/80 transition-colors">Cinema</button>
                </motion.div>

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
                            <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-white/30">
                                All 144 founding seals claimed
                            </p>
                        )}
                    </div>
                )}
            </motion.div>

            <p
                className="absolute bottom-6 z-10 text-[8px] uppercase tracking-[0.4em] text-white/20 pointer-events-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
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

function writeGate(token: string) {
    if (typeof document === 'undefined') return;
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `sb-access-token=${token}; path=/; SameSite=Lax${secure}`;
}

async function resolveDestination(userId: string | undefined, isDemo: boolean): Promise<string> {
    if (isDemo || !userId) {
        try {
            const raw = localStorage.getItem('tbth-journey');
            if (raw) {
                const st = JSON.parse(raw)?.state;
                if (st?.initiated && st?.character?.path) return '/world';
                if (st?.initiated || st?.character?.name?.trim()) return '/awakening/path';
            }
        } catch { /* ignore */ }
        return '/awakening';
    }
    try {
        const { data } = await supabase.from('game_state').select('character, initiated').eq('user_id', userId).maybeSingle();
        const ch = data?.character as any;
        if (data?.initiated && ch?.path) return '/world';
        if (data?.initiated || (ch && ch.name)) return '/awakening/path';
    } catch { /* ignore */ }
    return '/awakening';
}

function LandingGate() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [phase, setPhase] = useState<'checking' | 'title'>('checking');

    useEffect(() => {
        const cipher = searchParams.get('cipher');
        if (cipher) {
            try {
                localStorage.setItem('cipher_referral', cipher);
            } catch { /* */ }
        }

        if (searchParams.get('stay')) {
            setPhase('title');
            return;
        }

        const isDemo = typeof window !== 'undefined' && localStorage.getItem('tbth-demo') === 'true';
        let done = false;
        const go = async (session: any) => {
            if (done) return;
            done = true;
            const token = session?.access_token || (isDemo ? 'demo-token' : null);
            if (token) writeGate(token);
            router.replace(await resolveDestination(session?.user?.id, isDemo));
        };

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) go(session);
        });

        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                go(data.session);
                return;
            }
            if (isDemo) {
                go(null);
                return;
            }
            const oauth = typeof window !== 'undefined' && /[#&?](access_token|code)=/.test(window.location.href);
            if (!oauth) {
                if (!done) setPhase('title');
            } else {
                setTimeout(() => {
                    if (!done) setPhase('title');
                }, 5000);
            }
        });

        return () => {
            sub.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (phase === 'checking') {
        return (
            <main className="relative min-h-[100dvh] bg-black flex flex-col items-center justify-center gap-6">
                <Hexagon className="w-12 h-12 text-aether-gold animate-spin-slow drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                <p className="text-[9px] text-zinc-500 tracking-[0.4em] uppercase animate-pulse">
                    The veil parts…
                </p>
            </main>
        );
    }
    return <TitleCardInner />;
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] bg-black" />}>
            <LandingGate />
        </Suspense>
    );
}
