'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clapperboard, Lock, ShieldCheck, Eye, Music, ChevronRight, Zap, X, Pause, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import { fundingProgressLabel, fundingProgressPercent, PRODUCTION_RESUME_AT, formatFunding, STRIPE_URL } from '@/lib/supportFunding';

let uiHoverSfx: Howl | null = null;
let uiClickSfx: Howl | null = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function CinemaClient() {
    const router = useRouter();
    const { profile, fetchIdentity } = useSoulStore();
    const [showPausedModal, setShowPausedModal] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    useEffect(() => {
        setIsMounted(true);
        fetchIdentity();
    }, [fetchIdentity]);

    if (!isMounted) return <div className="min-h-screen bg-black" />;

    return (
        <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-aether-gold/30">
            <div className="fixed inset-0 z-0">
                <img src="/page-images/image-(8).png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1105_0%,#000_100%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>

            <header className="sticky top-0 z-[100] border-b border-white/5 px-6 py-4 flex justify-between items-center bg-black/70 backdrop-blur-xl">
                <button 
                    onClick={() => { playClick(); router.push('/'); }} 
                    onMouseEnter={playHover}
                    className="p-3 bg-white/5 rounded-full border border-white/10 hover:text-aether-gold hover:border-aether-gold/30 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] uppercase tracking-[0.4em] text-aether-gold/60 mb-1">Memory</span>
                    <span className="font-ritual text-xl font-bold tracking-[0.4em] text-white gold-shimmer uppercase leading-none">The Cinema</span>
                    <span className="text-[7px] text-orange-400/90 uppercase tracking-[0.3em] mt-1">Series On Pause</span>
                </div>
                <div className="flex items-center gap-4 min-w-[48px] justify-end">
                    {profile?.is_supporter && (
                        <div className="px-4 py-1.5 rounded-full border border-aether-gold/30 bg-aether-gold/5 flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-aether-gold" />
                            <span className="text-[8px] font-black text-aether-gold uppercase tracking-widest">Legacy</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="relative z-10 p-4 md:p-12 pb-32 max-w-7xl mx-auto space-y-16">
                <section className="relative aspect-video rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-orange-500/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] group">
                    <img 
                        src="/viralcartel/400_manga_logo.jpg" 
                        className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
                        alt="400 Series"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 backdrop-blur-md">
                                <Pause className="w-3 h-3 text-orange-400" />
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-orange-400">Production Paused</span>
                            </div>
                            <h2 className="font-ritual text-5xl md:text-8xl font-black text-white gold-shimmer uppercase leading-none">THE 400 SERIES</h2>
                            <p className="text-[10px] md:text-xs text-white/50 uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed">
                                The 400 Series is on pause until we are fiscally solid. Support the Truth B Told vision — <span className="text-aether-gold">@truufbtold</span> &apos;Ant Cee&apos;.
                            </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4 max-w-sm w-full">
                            <div className="w-full space-y-2">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/40">
                                    <span>Infrastructure Goal</span>
                                    <span className="text-white">{fundingProgressLabel()}</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]" style={{ width: `${fundingProgressPercent()}%` }} />
                                </div>
                                <p className="text-[7px] font-mono text-orange-400/70 uppercase tracking-widest text-center">
                                    ${formatFunding(PRODUCTION_RESUME_AT)} — production resume + massive rollout
                                </p>
                            </div>
                            <button
                                onClick={() => { playClick(); window.open(STRIPE_URL, '_blank'); }}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform"
                            >
                                <Zap className="w-8 h-8 fill-current" />
                            </button>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">Fuel the Mission</span>
                        </div>
                    </div>
                </section>

                <section className="space-y-8 px-2 md:px-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Clapperboard className="w-6 h-6 text-aether-gold" />
                            <h3 className="font-ritual text-2xl md:text-3xl font-black uppercase tracking-widest text-white">Preview Transmissions</h3>
                        </div>
                        <span className="text-[8px] font-mono text-orange-400 uppercase tracking-widest pl-10 md:pl-0">Full Series On Pause</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "The Prelude", id: "XnWdy_B7PgA", desc: "Before the fire. The foundation of the prophecy.", poster: '/images/cineworks/poster2.png' },
                            { title: "Genesis 15:13", id: "jXezgcPBqGE", desc: "The root of the 400-year cycle protocol.", poster: '/images/cineworks/poster1.png' },
                            { title: "Prophetic Frequency", id: "msKxh1gInMU", desc: "Audio synthesis of the coming invasion.", poster: '/images/cineworks/poster3.png' }
                        ].map((v, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -8 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="rounded-[2rem] p-6 border border-white/10 bg-white/[0.03] backdrop-blur-md group cursor-pointer hover:border-aether-gold/25 hover:bg-white/[0.05] transition-colors"
                                onClick={() => { playClick(); window.open(`https://youtu.be/${v.id}`, '_blank'); }}
                            >
                                <div className="aspect-video rounded-2xl overflow-hidden mb-6 relative">
                                    <img src={v.poster} alt={v.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 relative z-10" alt="" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <Play className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-[6px] font-black uppercase tracking-widest text-orange-400">Preview</div>
                                </div>
                                <h4 className="font-ritual text-lg font-black text-white group-hover:text-aether-gold transition-colors">{v.title}</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2">{v.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {showPausedModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-3xl overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 40 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 40 }}
                            className="liquid-glass rounded-[3rem] md:rounded-[5rem] p-8 md:p-16 max-w-3xl w-full relative border-orange-500/20 shadow-[0_0_100px_rgba(251,146,60,0.1)] my-auto"
                        >
                            <button 
                                onClick={() => { playClick(); setShowPausedModal(false); }} 
                                className="absolute top-8 right-8 md:top-12 md:right-12 text-white/40 hover:text-white p-4 bg-white/5 rounded-full border border-white/10 transition-all active:scale-90 group z-50"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex flex-col items-center text-center space-y-8">
                                <div className="w-24 h-24 rounded-3xl overflow-hidden border border-orange-500/30">
                                    <img src="/viralcartel/400_manga_logo.jpg" alt="400 Series" className="w-full h-full object-cover" />
                                </div>

                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10">
                                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-orange-400">Series On Pause</span>
                                    </div>
                                    <h2 className="font-ritual text-4xl md:text-6xl font-black uppercase text-white leading-none">Support the Truth B Told Vision</h2>
                                    <p className="text-sm text-white/60">
                                        <span className="text-aether-gold font-black">@truufbtold</span>
                                        <span className="text-white/30 mx-2">·</span>
                                        <span className="text-white italic">&apos;Ant Cee&apos;</span>
                                    </p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.25em] leading-relaxed max-w-md mx-auto">
                                        The 400 Series premiere is paused until we reach fiscal stability. Your support fuels the hardware and production needed to resume.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                    <Link
                                        href="/support"
                                        onClick={() => playClick()}
                                        className="flex-1 flex items-center justify-center gap-3 py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-transform active:scale-95"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Fuel the Mission
                                    </Link>
                                    <button
                                        onClick={() => { playClick(); router.push('/'); }}
                                        className="flex-1 py-5 bg-white/5 border border-white/15 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all"
                                    >
                                        Return to Hub
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 w-full max-w-md text-left">
                                    {[
                                        { tier: "$5", title: "The Echo Ticket", desc: "Reserved for when production resumes.", icon: <Eye className="w-4 h-4" /> },
                                        { tier: "$10", title: "The Frequency Bundle", desc: "Full '400' Digital Album + Chapter 01 access.", icon: <Music className="w-4 h-4" />, best: true },
                                        { tier: "$50", title: "Legacy Access", desc: "Lifetime Archive + Oracle Status + Credits.", icon: <ShieldCheck className="w-4 h-4" /> }
                                    ].map((t, i) => (
                                        <div key={i} className={`flex gap-4 items-start p-4 rounded-2xl bg-white/5 border ${t.best ? 'border-aether-gold/30' : 'border-white/5'} opacity-60`}>
                                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 ${t.best ? 'text-aether-gold' : 'text-white/40'}`}>{t.icon}</div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-ritual font-black text-white">{t.tier}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">{t.title}</span>
                                                    <Lock className="w-3 h-3 text-orange-400 ml-auto" />
                                                </div>
                                                <span className="block text-[7px] text-white/40 uppercase tracking-widest">{t.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}