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
    Star,
    Send,
    Terminal,
    History,
    Activity
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';

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
    
    // AI Chat Integration (v6 Manual Implementation)
    const { messages, sendMessage, status } = useChat();
    const [input, setInput] = useState('');
    const isLoading = status !== 'ready';
    
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage({ 
            role: 'user', 
            parts: [{ type: 'text', text: input }] 
        });
        setInput('');
    };

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

    useGSAP(() => {
        // Hero Reveal
        gsap.from('.hero-content > *', {
            y: 30,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power4.out"
        });

        // Title Mouse Interaction
        const title = titleRef.current;
        if (title) {
            const text = "TRUTH B TOLD HUB";
            title.innerHTML = text.split('').map(char => `<span class="char inline-block">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
            
            const handleMouseMove = (e: MouseEvent) => {
                const { clientX, clientY } = e;
                gsap.to('.char', {
                    x: (i) => {
                        const charEl = title.querySelectorAll('.char')[i] as HTMLElement;
                        const rect = charEl.getBoundingClientRect();
                        const dx = clientX - (rect.left + rect.width / 2);
                        return gsap.utils.clamp(-20, 20, dx * 0.08);
                    },
                    y: (i) => {
                        const charEl = title.querySelectorAll('.char')[i] as HTMLElement;
                        const rect = charEl.getBoundingClientRect();
                        const dy = clientY - (rect.top + rect.height / 2);
                        return gsap.utils.clamp(-15, 15, dy * 0.08);
                    },
                    duration: 0.8,
                    ease: "power2.out"
                });
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }

        // Bento Cards staggered entry
        gsap.from('.bento-card', {
            scrollTrigger: {
                trigger: '#master-bento',
                start: "top 80%",
            },
            scale: 0.95,
            opacity: 0,
            y: 40,
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
                    transition: border-color 0.5s ease, background 0.5s ease;
                }
                .liquid-glass:hover {
                    border-color: rgba(212, 175, 55, 0.2);
                    background: rgba(255, 255, 255, 0.03);
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
                    transform: rotateX(2deg) rotateY(1deg) translateZ(10px);
                }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* Global Nav */}
            <nav className="fixed top-0 w-full z-[100] px-8 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="TBT" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-ritual text-xl tracking-[0.2em] font-black uppercase gold-shimmer">Truth B Told Hub</span>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Prophetic OS v1.0</span>
                        </div>
                    </div>
                    <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-aether-gold/10 border border-aether-gold/20 rounded-full backdrop-blur-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-pulse"></div>
                        <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest">Master Bento Protocol: Active</span>
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
            <section className="relative h-[80dvh] flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.03)_0%,transparent_60%)]"></div>
                <div className="hero-content relative z-10 text-center space-y-12">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[8px] font-black tracking-[0.5em] text-zinc-500 uppercase">Restoration Protocol Initialized</span>
                    </div>
                    <h1 ref={titleRef} className="font-ritual text-6xl sm:text-8xl md:text-[10rem] font-black leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4 select-none">
                        TRUTH B TOLD HUB
                    </h1>
                    <p className="text-sm md:text-xl font-light text-zinc-500 max-w-4xl mx-auto tracking-[0.2em] leading-relaxed uppercase px-6">
                        The Master Bento Ecosystem. Exploring <span className="text-white font-black">Genesis 15:13</span> and the <span className="text-aether-gold font-black">400 Year Echo</span>.
                    </p>
                </div>
            </section>

            {/* MASTER BENTO GRID */}
            <section id="master-bento" className="relative pb-48 px-6 max-w-[100rem] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(300px,_auto)] gap-8">
                    
                    {/* Main Cinematic Feature (8 cols, 2 rows) */}
                    <div className="bento-card md:col-span-8 md:row-span-2 liquid-glass rounded-[4rem] overflow-hidden group p-2">
                        <div className="h-full relative rounded-[3.5rem] overflow-hidden">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                                src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0" 
                                title="400 - Genesis 15"
                                allowFullScreen
                            ></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end pointer-events-none">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-aether-gold/10 border border-aether-gold/20 backdrop-blur-xl">
                                        <Play className="w-3 h-3 text-aether-gold" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Featured Revelation</span>
                                    </div>
                                    <h2 className="font-ritual text-4xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                                    <p className="text-zinc-400 text-sm max-w-xl font-light uppercase tracking-widest leading-relaxed">
                                        Abraham receives the vision. The beginning of the 400-year cycle of the biblical Israelites.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prophetic AI Oracle (4 cols, 2 rows) */}
                    <div className="bento-card md:col-span-4 md:row-span-2 liquid-glass rounded-[4rem] p-10 flex flex-col border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                    <Terminal className="w-6 h-6 text-aether-gold" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Prophetic Oracle</span>
                                    <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">AI Decryption Engine</span>
                                </div>
                            </div>
                            {isLoading && <div className="w-2 h-2 rounded-full bg-aether-gold animate-ping"></div>}
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-8 pr-2">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <Sparkles className="w-8 h-8 text-aether-gold mb-2" />
                                    <p className="text-[9px] uppercase tracking-[0.3em] leading-relaxed max-w-[200px]">
                                        Input a verse or historical era to begin the decryption protocol.
                                    </p>
                                </div>
                            ) : (
                                messages.map((m, i) => (
                                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] px-6 py-4 rounded-3xl text-[11px] leading-relaxed tracking-wide ${
                                            m.role === 'user' 
                                            ? 'bg-white/5 border border-white/10 text-zinc-400' 
                                            : 'bg-aether-gold/5 border border-aether-gold/20 text-aether-gold font-medium'
                                        }`}>
                                            {m.parts.map((part, j) => (
                                                part.type === 'text' ? <span key={j}>{part.text}</span> : null
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="relative">
                            <input 
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Query the Oracle..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-aether-gold/50 transition-all placeholder:text-zinc-700 tracking-widest uppercase"
                            />
                            <button 
                                type="submit"
                                disabled={isLoading || !input}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-aether-gold flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20"
                            >
                                <Send className="w-4 h-4 text-black" />
                            </button>
                        </form>
                    </div>

                    {/* Geopolitical Radar (4 cols) */}
                    <div className="bento-card md:col-span-4 liquid-glass rounded-[4rem] p-10 flex flex-col justify-between border-white/5 perspective-card">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <Compass className="w-7 h-7 text-white/50" />
                                </div>
                                <Activity className="w-5 h-5 text-zinc-800" />
                            </div>
                            <h3 className="font-ritual text-2xl font-black uppercase tracking-[0.2em] text-white">Geopolitical Radar</h3>
                            <p className="text-zinc-600 text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                Tracking the alignment of nations with biblical prophecy in real-time. Global frequency shifts detected.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 pt-8">
                            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-aether-gold/50 animate-pulse"></div>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest">Level 04</span>
                        </div>
                    </div>

                    {/* The Prelude (4 cols) */}
                    <div className="bento-card md:col-span-4 liquid-glass rounded-[4rem] overflow-hidden group border-white/5 p-2">
                         <div className="aspect-video relative rounded-[3.5rem] overflow-hidden">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                                src="https://www.youtube.com/embed/XnWdy_B7PgA?autoplay=0&controls=0&rel=0" 
                                title="The Prelude"
                            ></iframe>
                            <div className="absolute inset-0 bg-black/60 opacity-20 group-hover:opacity-0 transition-opacity pointer-events-none"></div>
                         </div>
                         <div className="p-8 space-y-2">
                            <h4 className="font-ritual text-xl font-black uppercase tracking-[0.1em] text-white group-hover:text-aether-gold transition-colors">THE PRELUDE</h4>
                            <p className="text-zinc-500 text-[9px] uppercase tracking-[0.1em] font-light">Archive View: 400 Year Diaspora</p>
                         </div>
                    </div>

                    {/* AI Film Prod Status (4 cols) */}
                    <div className="bento-card md:col-span-4 liquid-glass rounded-[4rem] p-10 flex flex-col justify-between border-white/5 perspective-card bg-gradient-to-t from-aether-gold/5 to-transparent">
                        <div className="space-y-6">
                            <div className="w-14 h-14 rounded-2xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                <Cpu className="w-7 h-7 text-aether-gold" />
                            </div>
                            <h3 className="font-ritual text-2xl font-black uppercase tracking-[0.2em] text-white">AI Prod Hardware</h3>
                            <p className="text-zinc-500 text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                Industrial GPU nodes securing the 8K cinematic render of the 400 Series. Support the build to accelerate generation.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowSupportOverlay(true)}
                            className="w-full bg-aether-gold text-black py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_40px_rgba(212,175,55,0.2)]"
                        >
                            Accelerate Node
                        </button>
                    </div>

                    {/* Historical Timeline (12 cols) */}
                    <div className="bento-card md:col-span-12 liquid-glass rounded-[4rem] p-12 flex items-center justify-between border-white/5 group">
                        <div className="flex flex-col gap-6 max-w-xl">
                            <div className="flex items-center gap-4 text-zinc-500">
                                <History className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Historical Cycle</span>
                            </div>
                            <h3 className="font-ritual text-4xl md:text-5xl font-black uppercase tracking-[0.1em] text-white gold-shimmer">ABRAHAM TO 2019</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                A panoramic investigation into the diaspora of the Hebrew people and the conclusion of the 400-year cycle. Every frame rendered with absolute prophetic clarity.
                            </p>
                        </div>
                        <div className="hidden lg:flex items-center gap-12">
                            {[2019, 1619, 'Genesis'].map((year, i) => (
                                <div key={i} className="flex flex-col items-center gap-4 text-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-aether-gold/30 group-hover:bg-aether-gold transition-colors"></div>
                                    <span className="font-ritual text-2xl font-black text-white/20 group-hover:text-white transition-colors">{year}</span>
                                </div>
                            ))}
                        </div>
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
                <p className="text-[10px] font-black tracking-[0.8em] text-zinc-600 uppercase">Protocol A-25 • Truth B Told Hub • 2026 Edition</p>
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
                                    Your support fuels <span className="text-white">high-fidelity AI generations</span> and <span className="text-aether-gold">industrial equipment</span> for full-length feature film production.
                                </p>
                                <a 
                                    href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                    target="_blank"
                                    rel="noopener noreferrer"
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
