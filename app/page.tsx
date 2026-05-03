'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
    Play, 
    ShieldCheck, 
    ChevronDown, 
    Sparkles, 
    ArrowRight,
    Lock,
    Eye,
    Globe,
    Zap,
    Cpu,
    Video,
    Compass,
    Star
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

function CipherTracker() {
    const searchParams = useSearchParams();
    useEffect(() => {
        const cipher = searchParams.get('cipher');
        if (cipher) localStorage.setItem('cipher_referral', cipher);
    }, [searchParams]);
    return null;
}

export default function Gateway() {
    const router = useRouter();
    const [showSupportOverlay, setShowSupportOverlay] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);

    const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(e.currentTarget, {
            x: x * 0.2,
            y: y * 0.2,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const handleMagneticLeave = (e: React.MouseEvent<HTMLElement>) => {
        gsap.to(e.currentTarget, {
            x: 0,
            y: 0,
            duration: 1,
            ease: "elastic.out(1, 0.3)"
        });
    };

    // Kinetic Typography & Liquid Background
    useGSAP(() => {
        // Title Mouse Interaction
        const title = titleRef.current;
        if (title) {
            const chars = title.innerText.split('');
            title.innerHTML = chars.map(char => `<span class="char inline-block">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
            
            const handleMouseMove = (e: MouseEvent) => {
                const { clientX, clientY } = e;
                gsap.to('.char', {
                    x: (i) => {
                        const charEl = title.querySelectorAll('.char')[i] as HTMLElement;
                        const rect = charEl.getBoundingClientRect();
                        const dx = clientX - (rect.left + rect.width / 2);
                        return gsap.utils.clamp(-15, 15, dx * 0.05);
                    },
                    y: (i) => {
                        const charEl = title.querySelectorAll('.char')[i] as HTMLElement;
                        const rect = charEl.getBoundingClientRect();
                        const dy = clientY - (rect.top + rect.height / 2);
                        return gsap.utils.clamp(-10, 10, dy * 0.05);
                    },
                    rotation: (i) => {
                        const charEl = title.querySelectorAll('.char')[i] as HTMLElement;
                        const rect = charEl.getBoundingClientRect();
                        const dx = clientX - (rect.left + rect.width / 2);
                        return gsap.utils.clamp(-10, 10, dx * 0.1);
                    },
                    duration: 0.8,
                    ease: "power2.out",
                    stagger: 0.01
                });
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }

        // Bento Cards Entry
        gsap.from('.bento-card', {
            scrollTrigger: {
                trigger: '#bento-section',
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.1,
            ease: "expo.out"
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050505] text-white font-sans selection:bg-aether-gold/30 overflow-x-hidden">
            <style jsx global>{`
                .liquid-glass {
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(40px) saturate(180%);
                    -webkit-backdrop-filter: blur(40px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.01);
                }
                .gold-shimmer {
                    background: linear-gradient(
                        to right,
                        #d4af37 20%,
                        #fff8e1 40%,
                        #fff8e1 60%,
                        #d4af37 80%
                    );
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shine 6s linear infinite;
                }
                @keyframes shine {
                    to { background-position: 200% center; }
                }
                .perspective-card {
                    transform-style: preserve-3d;
                    transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
                }
                .perspective-card:hover {
                    transform: rotateX(2deg) rotateY(2deg) translateZ(10px);
                }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            `}</style>

            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* Nav Header */}
            <nav className="fixed top-0 w-full z-[100] px-8 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="TBT" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-ritual text-xl tracking-[0.2em] font-black uppercase gold-shimmer">Truth B Told Hub</span>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Sovereign Architecture</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-aether-gold/10 border border-aether-gold/20 rounded-full backdrop-blur-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-pulse shadow-[0_0_8px_#d4af37]"></div>
                        <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest">Prophetic Production: 400 Series</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6 pointer-events-auto">
                    <button 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        onClick={() => setShowSupportOverlay(true)}
                        className="px-8 py-3 bg-aether-gold text-black rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                    >
                        Support 400 Series
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative min-h-[100dvh] flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.03)_0%,transparent_60%)]"></div>
                
                <div className="relative z-10 text-center space-y-16 max-w-7xl mx-auto">
                    <div className="space-y-6">
                        <h1 ref={titleRef} className="font-ritual text-6xl sm:text-8xl md:text-[12rem] font-black leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4 select-none">
                            TRUTH B TOLD HUB
                        </h1>
                        <p className="text-sm md:text-xl font-light text-zinc-500 max-w-4xl mx-auto tracking-[0.2em] leading-relaxed uppercase px-6">
                            The 400-Year Prophecy is complete. A cinematic investigation into <span className="text-white font-black">Genesis 15:13</span>.
                        </p>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={() => document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="group flex flex-col items-center gap-4 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <span className="text-[9px] font-black uppercase tracking-[0.6em] text-zinc-500 group-hover:text-aether-gold transition-colors">Begin Investigation</span>
                            <ChevronDown className="w-6 h-6 text-aether-gold animate-bounce" />
                        </button>
                    </div>
                </div>
            </section>

            {/* BENTO GRID */}
            <section id="bento-section" className="relative py-32 px-6 max-w-[100rem] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Main Cinematic Feature (L) - Opening Scene */}
                    <div className="bento-card md:col-span-8 liquid-glass rounded-[4rem] overflow-hidden group border-white/5 p-2">
                        <div className="aspect-[16/9] md:aspect-auto md:h-[600px] relative rounded-[3.5rem] overflow-hidden">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                                src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0&modestbranding=1" 
                                title="400 - Genesis 15 | Opening Scene Preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none opacity-60 group-hover:opacity-20 transition-opacity"></div>
                            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-aether-gold/10 border border-aether-gold/20 backdrop-blur-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-pulse"></div>
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Opening Scene Preview</span>
                                    </div>
                                    <h2 className="font-ritual text-4xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                                    <p className="text-zinc-400 text-sm md:text-lg max-w-2xl font-light uppercase tracking-widest leading-relaxed">
                                        Abraham receives the vision. The beginning of the 400-year cycle of the biblical Israelites.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mission Objective (R) */}
                    <div className="bento-card md:col-span-4 liquid-glass rounded-[4rem] p-12 flex flex-col justify-between border-white/5 perspective-card">
                        <div className="space-y-8">
                            <div className="w-16 h-16 rounded-3xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                <Eye className="w-8 h-8 text-aether-gold" />
                            </div>
                            <h3 className="font-ritual text-3xl font-black uppercase tracking-[0.2em] text-white">The Revelation</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                We are decrypting the physical markers of the biblical Hebrew curses. A cinematic series where the Israelites are revealed in their true historical context.
                            </p>
                        </div>
                        <button onClick={() => setShowSupportOverlay(true)} className="w-full bg-white/5 border border-white/10 text-white py-6 rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                            Support the 400 Series <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* The Prelude Video (M) */}
                    <div className="bento-card md:col-span-5 liquid-glass rounded-[4rem] overflow-hidden group border-white/5 p-2">
                         <div className="aspect-video relative rounded-[3.5rem] overflow-hidden">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                                src="https://www.youtube.com/embed/XnWdy_B7PgA?autoplay=0&controls=1&rel=0" 
                                title="400 Years Series: The Prelude"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                            <div className="absolute inset-0 bg-black/60 opacity-20 group-hover:opacity-0 transition-opacity duration-500 pointer-events-none"></div>
                         </div>
                         <div className="p-10 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-ritual text-2xl font-black uppercase tracking-[0.1em] text-white group-hover:text-aether-gold transition-colors">THE PRELUDE</h4>
                                <span className="text-[8px] font-black tracking-[0.3em] text-zinc-600 uppercase">Archive View</span>
                            </div>
                            <p className="text-zinc-500 text-xs leading-relaxed uppercase tracking-[0.1em] font-light">
                                A panoramic view of the Hebrew diaspora. From Abrahamic roots to the specific dismantling of a people in 2019.
                            </p>
                         </div>
                    </div>

                    {/* Infrastructure Capacity (S) */}
                    <div className="bento-card md:col-span-3 liquid-glass rounded-[4rem] p-10 flex flex-col justify-between border-white/5 perspective-card">
                        <div className="space-y-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Cpu className="w-7 h-7 text-white/50" />
                            </div>
                            <h3 className="font-ritual text-2xl font-black uppercase tracking-[0.2em] text-white">AI Prod Hardware</h3>
                            <p className="text-zinc-600 text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                High-fidelity feature production requires industrial GPU capacity and AI synthesis nodes.
                            </p>
                        </div>
                        <div className="space-y-2">
                             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-aether-gold animate-pulse"></div>
                             </div>
                             <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-zinc-700">
                                <span>Securing Node</span>
                                <span>34% Secured</span>
                             </div>
                        </div>
                    </div>

                    {/* Global Impact (S) */}
                    <div className="bento-card md:col-span-4 liquid-glass rounded-[4rem] p-10 space-y-8 border-white/5 flex flex-col justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-aether-gold/5 border border-aether-gold/10 flex items-center justify-center mx-auto">
                            <Globe className="w-8 h-8 text-aether-gold animate-spin-slow" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-ritual text-3xl font-black uppercase tracking-[0.2em] text-white gold-shimmer">Genesis Prophecy</h3>
                            <p className="text-zinc-500 text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                This is the restoration of the biblical heritage through cinematic decryption. Join the mission to secure the vision.
                            </p>
                        </div>
                        <button onClick={() => setShowSupportOverlay(true)} className="px-12 py-5 bg-aether-gold text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all">
                            Fund the 400 Series
                        </button>
                    </div>

                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-32 border-t border-white/5 text-center space-y-12">
                <div className="flex items-center justify-center gap-8 opacity-20">
                    <ShieldCheck className="w-10 h-10" />
                    <Sparkles className="w-10 h-10" />
                    <Video className="w-10 h-10" />
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] font-black tracking-[0.8em] text-zinc-600 uppercase">Protocol A-25 • Truth B Told Hub</p>
                    <p className="text-[9px] font-black tracking-[0.5em] text-zinc-800 uppercase">Designed for Sovereignty • <span className="text-aether-gold/30">8K Rendered Truth</span></p>
                </div>
            </footer>

            {/* Support Overlay */}
            <AnimatePresence>
                {showSupportOverlay && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-void/95 backdrop-blur-2xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="liquid-glass rounded-[4rem] p-16 max-w-2xl w-full relative space-y-10 border-white/5 shadow-[0_0_100px_rgba(212,175,55,0.1)]"
                        >
                            <button 
                                onClick={() => setShowSupportOverlay(false)}
                                className="absolute top-10 right-10 text-zinc-500 hover:text-white transition-colors p-3 bg-white/5 rounded-full"
                            >
                                <Lock className="w-6 h-6" />
                            </button>
                            
                            <div className="text-center space-y-8">
                                <div className="w-24 h-24 flex items-center justify-center mx-auto overflow-hidden">
                                    <img src="/logo.png" alt="TBT" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="font-ritual text-5xl font-black uppercase tracking-[0.2em] text-white gold-shimmer">Support the 400 Series</h2>
                                <p className="text-zinc-400 text-xs leading-relaxed uppercase tracking-[0.1em] font-mono italic">
                                    "Know for certain that for four hundred years your descendants will be strangers in a country not their own..." — Genesis 15:13
                                </p>
                                <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                    We are producing a cinematic AI-driven series revealing the 400-year cycle of the biblical Israelites. Your support fuels <span className="text-white">high-fidelity AI generations</span> and <span className="text-aether-gold">industrial equipment</span> for full-length feature film production.
                                </p>
                                
                                <div className="p-8 bg-aether-gold/5 border border-aether-gold/10 rounded-[2.5rem]">
                                    <p className="text-[11px] font-black tracking-[0.4em] uppercase text-aether-gold">
                                        Use Code <span className="text-white bg-aether-gold/20 px-4 py-1.5 rounded-lg border border-aether-gold/30">truufbtold</span> during checkout
                                    </p>
                                </div>

                                <a 
                                    href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseMove={handleMagneticMove}
                                    onMouseLeave={handleMagneticLeave}
                                    className="block w-full bg-aether-gold text-black py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:scale-105 transition-all"
                                >
                                    Fund the Revelation
                                </a>
                                
                                <button 
                                    onClick={() => setShowSupportOverlay(false)}
                                    className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-700 hover:text-zinc-500 transition-colors"
                                >
                                    Return to Archive
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
