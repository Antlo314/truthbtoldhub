'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clapperboard, Share2, Lock, ShieldCheck, Eye, Music, ScrollText, Star, Sparkles, ChevronRight, Zap, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- SFX ---
let uiHoverSfx: any = null;
let uiClickSfx: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function CinemaClient() {
    const router = useRouter();
    const { profile, fetchIdentity } = useSoulStore();
    const [showPurchase, setShowPurchase] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    useEffect(() => {
        setIsMounted(true);
        fetchIdentity();
    }, [fetchIdentity]);

    // Check Gating
    useEffect(() => {
        if (isMounted && profile && !profile.is_supporter) {
            setShowPurchase(true);
        }
    }, [isMounted, profile]);

    const handleShare = () => {
        navigator.clipboard.writeText("Transmission Unlocked. Access the Cinema: https://truthbtoldhub.com/cinema");
        playClick();
        alert("Coordinates Copied.");
    };

    return (
        <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-aether-gold/30">
            {/* Cinematic Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1105_0%,#000_100%)]"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-[100] glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center backdrop-blur-3xl">
                <button 
                    onClick={() => { playClick(); router.push('/'); }} 
                    onMouseEnter={playHover}
                    className="p-3 bg-white/5 rounded-full border border-white/10 hover:text-aether-gold transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-xl font-bold tracking-[0.4em] text-white gold-shimmer uppercase leading-none">THE CINEMA</span>
                    <span className="text-[7px] font-mono text-aether-gold uppercase tracking-[0.3em] mt-1">Sovereign Viewing Protocol</span>
                </div>
                <div className="flex items-center gap-4">
                    {profile?.is_supporter && (
                        <div className="px-4 py-1.5 rounded-full border border-aether-gold/30 bg-aether-gold/5 flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-aether-gold" />
                            <span className="text-[8px] font-black text-aether-gold uppercase tracking-widest">Legacy Access</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="relative z-10 p-4 md:p-12 pb-32 max-w-7xl mx-auto space-y-16">
                
                {/* Main Feature / Teaser */}
                <section className="relative aspect-video rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] group">
                    {!isPlaying ? (
                        <div 
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => {
                                if (profile?.is_supporter) {
                                    playClick();
                                    setIsPlaying(true);
                                } else {
                                    playClick();
                                    setShowPurchase(true);
                                }
                            }}
                        >
                            <img 
                                src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=2000" 
                                className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-60 transition-all duration-1000"
                                alt="Feature Teaser"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-aether-gold/30 bg-aether-gold/5 backdrop-blur-md">
                                        <Sparkles className="w-3 h-3 text-aether-gold" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Now Premiering: Chapter 01</span>
                                    </div>
                                    <h2 className="font-ritual text-5xl md:text-8xl font-black text-white gold-shimmer group-hover:scale-110 transition-transform duration-1000 uppercase leading-none">THE 400 SERIES</h2>
                                    <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed">
                                        The long-awaited sovereign narrative. From the seeds of the prophecy to the global awakening. Watch the Chapter 01 Premiere now.
                                    </p>
                                </div>
                                
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform">
                                    {profile?.is_supporter ? <Play className="w-8 h-8 fill-current ml-1" /> : <Lock className="w-8 h-8" />}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-black">
                             <iframe 
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=1&controls=1&rel=0" 
                                title="400 Series Premiere"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}
                </section>

                {/* Sub-Features / Transmissions */}
                <section className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Clapperboard className="w-6 h-6 text-aether-gold" />
                            <h3 className="font-ritual text-2xl font-black uppercase tracking-widest text-white">Transmission Archive</h3>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Live Syncing Alpha</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "The Prelude", id: "XnWdy_B7PgA", desc: "Before the fire. The foundation of the prophecy." },
                            { title: "Genesis 15:13", id: "jXezgcPBqGE", desc: "The root of the 400-year cycle protocol." },
                            { title: "Prophetic Frequency", id: "msKxh1gInMU", desc: "Audio synthesis of the coming invasion." }
                        ].map((v, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -10 }}
                                className="liquid-glass rounded-[2rem] p-6 border-white/10 group cursor-pointer"
                                onClick={() => { playClick(); window.open(`https://youtu.be/${v.id}`, '_blank'); }}
                            >
                                <div className="aspect-video rounded-2xl overflow-hidden mb-6 relative">
                                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                                <h4 className="font-ritual text-lg font-black text-white group-hover:text-aether-gold transition-colors">{v.title}</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2">{v.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Ticket Purchase UI Overlay */}
            <AnimatePresence>
                {showPurchase && (
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
                            className="liquid-glass rounded-[3rem] md:rounded-[5rem] p-8 md:p-20 max-w-5xl w-full relative border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] my-auto"
                        >
                            <button 
                                onClick={() => { playClick(); setShowPurchase(false); if (!profile?.is_supporter) router.push('/'); }} 
                                className="absolute top-8 right-8 md:top-12 md:right-12 text-white/40 hover:text-white p-4 bg-white/5 rounded-full border border-white/10 transition-all active:scale-90 group z-50"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
                                <div className="space-y-10">
                                    <div className="space-y-4 text-center md:text-left">
                                        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-aether-gold/30 bg-aether-gold/5 backdrop-blur-md">
                                            <Sparkles className="w-3 h-3 text-aether-gold" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Access Protocol Required</span>
                                        </div>
                                        <h2 className="font-ritual text-5xl md:text-7xl font-black uppercase text-white leading-none">THE SOVEREIGN TICKET</h2>
                                        <p className="text-white/60 text-xs md:text-sm font-medium leading-relaxed tracking-wide">
                                            Access to the "400 Series" is gated for those who fuel the mission. Choose your access tier to unlock the Archive and the Chapter 01 Premiere.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 max-h-[40vh] md:max-h-none overflow-y-auto pr-2 hide-scrollbar">
                                        {[
                                            { tier: "$5", title: "Single Entry", desc: "Access to Chapter 01 Premiere + Global Archive.", icon: <Eye className="w-4 h-4" /> },
                                            { tier: "$10", title: "Frequency Pass", desc: "Everything in $5 + Full Digital Album.", icon: <Music className="w-4 h-4" />, best: true },
                                            { tier: "$50", title: "Legacy Access", desc: "Lifetime Archive Access + Oracle Status + Credits.", icon: <ShieldCheck className="w-4 h-4" /> }
                                        ].map((t, i) => (
                                            <div key={i} className={`flex gap-5 items-start p-6 rounded-3xl bg-white/5 border ${t.best ? 'border-aether-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-white/5'} hover:border-white/20 transition-all group/tier relative`}>
                                                {t.best && <span className="absolute -top-2 -right-2 px-3 py-1 bg-aether-gold text-black text-[6px] font-black uppercase rounded-full">Most Selected</span>}
                                                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 ${t.best ? 'text-aether-gold' : 'text-white/40'} group-hover/tier:scale-110 transition-transform`}>{t.icon}</div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl font-ritual font-black text-white">{t.tier}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{t.title}</span>
                                                    </div>
                                                    <span className="block text-[8px] text-white/40 uppercase tracking-widest leading-relaxed">{t.desc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-10 p-8 md:p-12 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 relative overflow-hidden text-center">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none"></div>
                                    <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-8">
                                        <Zap className="w-10 h-10 text-black" />
                                    </div>
                                    <h3 className="text-xl font-ritual font-black text-white uppercase tracking-widest">Initialize Access</h3>
                                    <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] leading-loose">
                                        Click below to initialize your energy contribution via Stripe. To be recognized for your contribution, please type <span className="text-white font-black text-[11px] bg-white/10 px-2 py-1 rounded">"400"</span> in the <span className="text-white font-black">Referral / Support Code</span> section.
                                    </p>
                                    <a 
                                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01" 
                                        target="_blank" 
                                        onClick={() => playClick()}
                                        className="w-full flex items-center justify-center gap-4 py-6 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-transform active:scale-95 group"
                                    >
                                        Initialize Contribution
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                                    </a>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-[1px] w-4 bg-white/10"></div>
                                        <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.5em]">Secure Encryption</span>
                                        <div className="h-[1px] w-4 bg-white/10"></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
