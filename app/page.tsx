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
    Activity,
    Server,
    Database,
    Gpu
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';

// Custom Social Icons
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2.12h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
    </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" />
    </svg>
);

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
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const cursorFollowerRef = useRef<HTMLDivElement>(null);
    
    // AI Chat Integration
    const { messages, sendMessage, status } = useChat();
    const [input, setInput] = useState('');
    const isLoading = status !== 'ready';
    
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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
        if (!isMounted) return;

        // Custom Sentinel Cursor Logic
        const moveCursor = (e: MouseEvent) => {
            gsap.to(cursorRef.current, {
                x: e.clientX,
                y: e.clientY,
                duration: 0,
            });
            gsap.to(cursorFollowerRef.current, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.6,
                ease: "power2.out"
            });
        };

        window.addEventListener('mousemove', moveCursor);

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
            title.innerHTML = text.split('').map(char => `<span class="char inline-block select-none">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
            
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
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mousemove', moveCursor);
            };
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
    }, { scope: containerRef, dependencies: [isMounted] });

    if (!isMounted) return <div className="min-h-screen bg-[#050505]" />;

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050505] text-white font-sans selection:bg-aether-gold/30 overflow-x-hidden cursor-none">
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
                
                .kinetic-title {
                    white-space: nowrap;
                    display: inline-block;
                    width: 100%;
                    text-align: center;
                }

                /* Atmospheric Layers */
                .film-grain {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 999;
                    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
                    opacity: 0.04;
                    mix-blend-mode: overlay;
                    animation: grain 8s steps(10) infinite;
                }
                @keyframes grain {
                    0%, 100% { transform: translate(0, 0) }
                    10% { transform: translate(-5%, -5%) }
                    20% { transform: translate(-10%, 5%) }
                    30% { transform: translate(5%, -10%) }
                    40% { transform: translate(-5%, 15%) }
                    50% { transform: translate(-10%, -5%) }
                    60% { transform: translate(15%, 0) }
                    70% { transform: translate(0, 10%) }
                    80% { transform: translate(-15%, 0) }
                    90% { transform: translate(10%, 5%) }
                }

                .data-glitch {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                    z-index: 10;
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                    opacity: 0.1;
                }
            `}</style>

            <div className="film-grain" />
            
            {/* Custom Sentinel Cursor */}
            <div ref={cursorRef} className="fixed top-0 left-0 w-2 h-2 bg-aether-gold rounded-full pointer-events-none z-[1000] -translate-x-1/2 -translate-y-1/2" />
            <div ref={cursorFollowerRef} className="fixed top-0 left-0 w-8 h-8 border border-aether-gold/30 rounded-full pointer-events-none z-[1000] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="w-1 h-1 bg-aether-gold/50 rounded-full animate-ping" />
            </div>

            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* Global Nav */}
            <nav className="fixed top-0 w-full z-[100] px-4 md:px-12 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="TBT" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="font-ritual text-lg md:text-xl tracking-[0.2em] font-black uppercase gold-shimmer">Truth B Told Hub</span>
                            <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Prophetic OS v1.0</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-8 pointer-events-auto">
                    <div className="hidden md:flex items-center gap-6">
                        <a href="https://youtube.com/@truufbtold" target="_blank" className="text-zinc-500 hover:text-white transition-colors">
                            <YoutubeIcon className="w-5 h-5" />
                        </a>
                        <a href="https://tiktok.com/@truufbtold" target="_blank" className="text-zinc-500 hover:text-white transition-colors">
                            <TikTokIcon className="w-5 h-5" />
                        </a>
                    </div>

                    <button 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        onClick={() => setShowSupportOverlay(true)}
                        className="px-6 md:px-10 py-3 bg-aether-gold text-black rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] border border-black/10"
                    >
                        Support 400 Series
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative h-[80dvh] flex flex-col items-center justify-center p-6 mt-12 md:mt-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.03)_0%,transparent_60%)]"></div>
                <div className="hero-content relative z-10 text-center space-y-8 md:space-y-12 w-full max-w-[100vw]">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[8px] font-black tracking-[0.5em] text-zinc-400 uppercase">Restoration Protocol Initialized</span>
                    </div>
                    <div className="w-full overflow-hidden flex justify-center">
                        <h1 ref={titleRef} className="kinetic-title font-ritual text-4xl sm:text-6xl md:text-[10rem] font-black leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4 select-none">
                            TRUTH B TOLD HUB
                        </h1>
                    </div>
                    <p className="text-[10px] md:text-xl font-light text-zinc-400 max-w-4xl mx-auto tracking-[0.2em] leading-relaxed uppercase px-6">
                        The Master Bento Ecosystem. Exploring <span className="text-white font-black">Genesis 15:13</span> and the <span className="text-aether-gold font-black">400 Year Echo</span>.
                    </p>
                </div>
            </section>

            {/* MASTER BENTO GRID */}
            <section id="master-bento" className="relative pb-48 px-4 md:px-12 max-w-[100rem] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-12 auto-rows-[minmax(200px,_auto)] gap-4 md:gap-8">
                    
                    {/* Main Cinematic Feature */}
                    <div className="bento-card col-span-2 md:col-span-8 md:row-span-2 liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group p-1 md:p-2 min-h-[400px]">
                        <div className="h-full relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000 scale-[1.01]"
                                src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0" 
                                title="400 - Genesis 15"
                                allowFullScreen
                            ></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:left-12 flex justify-between items-end pointer-events-none">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-aether-gold/10 border border-aether-gold/20 backdrop-blur-xl">
                                        <Play className="w-3 h-3 text-aether-gold" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Featured Revelation</span>
                                    </div>
                                    <h2 className="font-ritual text-3xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prophetic AI Oracle */}
                    <div className="bento-card col-span-2 md:col-span-4 md:row-span-2 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[500px]">
                        <div className="data-glitch" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                    <Terminal className="w-5 h-5 md:w-6 md:h-6 text-aether-gold" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Prophetic Oracle</span>
                                    <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest">AI Decryption Engine</span>
                                </div>
                            </div>
                            {isLoading && <div className="w-2 h-2 rounded-full bg-aether-gold animate-ping"></div>}
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-8 pr-2 min-h-[300px]">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <Sparkles className="w-8 h-8 text-aether-gold mb-2" />
                                    <p className="text-[9px] uppercase tracking-[0.3em] leading-relaxed max-w-[200px] text-zinc-300">
                                        Input a verse or historical era to begin the decryption protocol.
                                    </p>
                                </div>
                            ) : (
                                messages.map((m, i) => (
                                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] px-6 py-4 rounded-3xl text-[11px] leading-relaxed tracking-wide ${
                                            m.role === 'user' 
                                            ? 'bg-white/5 border border-white/10 text-zinc-300' 
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-aether-gold/50 transition-all placeholder:text-zinc-500 tracking-widest uppercase text-white"
                            />
                            <button 
                                type="submit"
                                disabled={isLoading || !input}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-aether-gold flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                            >
                                <Send className="w-4 h-4 text-black" />
                            </button>
                        </form>
                    </div>

                    {/* Geopolitical Radar */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/5 perspective-card min-h-[300px]">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-10 md:w-14 h-10 md:h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <Compass className="w-5 md:w-7 h-5 md:h-7 text-white/50" />
                                </div>
                                <Activity className="w-5 h-5 text-zinc-600 animate-pulse" />
                            </div>
                            <h3 className="font-ritual text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white">Radar</h3>
                            <p className="text-zinc-400 text-[8px] md:text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                Tracking alignment of nations with biblical prophecy.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 pt-4 md:pt-8">
                            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-aether-gold/50 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* AI Film Prod Status */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/5 perspective-card bg-gradient-to-t from-aether-gold/5 to-transparent min-h-[300px]">
                        <div className="space-y-6">
                            <div className="w-10 md:w-14 h-10 md:h-14 rounded-2xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                <Cpu className="w-5 md:w-7 h-5 md:h-7 text-aether-gold" />
                            </div>
                            <h3 className="font-ritual text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white">Hardware</h3>
                            <p className="text-zinc-400 text-[8px] md:text-[10px] leading-relaxed uppercase tracking-[0.1em] font-light">
                                Securing the 8K cinematic render nodes.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowSupportOverlay(true)}
                            className="w-full bg-aether-gold text-black py-4 md:py-5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                        >
                            Boost Node
                        </button>
                    </div>

                    {/* The Prelude */}
                    <div className="bento-card col-span-2 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group border-white/5 p-1 md:p-2">
                         <div className="aspect-video relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                                src="https://www.youtube.com/embed/XnWdy_B7PgA?autoplay=0&controls=0&rel=0" 
                                title="The Prelude"
                            ></iframe>
                            <div className="absolute inset-0 bg-black/60 opacity-20 group-hover:opacity-0 transition-opacity pointer-events-none"></div>
                         </div>
                         <div className="p-6 md:p-8 space-y-2">
                            <h4 className="font-ritual text-xl font-black uppercase tracking-[0.1em] text-white group-hover:text-aether-gold transition-colors">THE PRELUDE</h4>
                            <p className="text-zinc-400 text-[9px] uppercase tracking-[0.1em] font-light">Archive View: 400 Year Diaspora</p>
                         </div>
                    </div>

                    {/* Historical Timeline */}
                    <div className="bento-card col-span-2 md:col-span-12 liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between border-white/5 group gap-12">
                        <div className="flex flex-col gap-6 max-w-xl text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-4 text-zinc-500">
                                <History className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Historical Cycle</span>
                            </div>
                            <h3 className="font-ritual text-3xl md:text-5xl font-black uppercase tracking-[0.1em] text-white gold-shimmer">ABRAHAM TO 2019</h3>
                            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                A panoramic investigation into the diaspora of the Hebrew people.
                            </p>
                        </div>
                        <div className="flex items-center gap-6 md:gap-12">
                            {[2019, 1619, 'Genesis'].map((year, i) => (
                                <div key={i} className="flex flex-col items-center gap-4 text-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-aether-gold/30 group-hover:bg-aether-gold transition-colors"></div>
                                    <span className="font-ritual text-xl md:text-2xl font-black text-white/40 group-hover:text-white transition-colors">{year}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-24 md:py-32 border-t border-white/5 text-center space-y-12 bg-void">
                <div className="flex items-center justify-center gap-8 opacity-20">
                    <ShieldCheck className="w-10 h-10" />
                    <Sparkles className="w-10 h-10" />
                    <Video className="w-10 h-10" />
                </div>
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-8 mb-4">
                        <a href="https://youtube.com/@truufbtold" target="_blank" className="text-zinc-500 hover:text-aether-gold transition-colors">
                            <YoutubeIcon className="w-6 h-6" />
                        </a>
                        <a href="https://tiktok.com/@truufbtold" target="_blank" className="text-zinc-500 hover:text-aether-gold transition-colors">
                            <TikTokIcon className="w-6 h-6" />
                        </a>
                    </div>
                    <p className="text-[10px] font-black tracking-[0.8em] text-zinc-500 uppercase">Protocol A-25 • Truth B Told Hub • 2026 Edition</p>
                </div>
            </footer>

            {/* Support Overlay (REFACTORED FOR $2500 GOAL & ALLOCATION BREAKDOWN) */}
            <AnimatePresence>
                {showSupportOverlay && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-[#050505]/98 backdrop-blur-3xl overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-16 max-w-3xl w-full relative space-y-12 border-white/10 shadow-[0_0_150px_rgba(212,175,55,0.15)] my-8"
                        >
                            <button 
                                onClick={() => setShowSupportOverlay(false)}
                                className="absolute top-6 md:top-10 right-6 md:right-10 text-zinc-400 hover:text-white transition-colors p-3 bg-white/5 rounded-full border border-white/10"
                            >
                                <Lock className="w-6 h-6" />
                            </button>
                            
                            <div className="text-center space-y-8">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center overflow-hidden">
                                        <img src="/logo.png" alt="TBT" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="px-4 py-1.5 rounded-full bg-aether-gold/10 border border-aether-gold/20">
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Industrial Upgrade Phase</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h2 className="font-ritual text-4xl md:text-6xl font-black uppercase tracking-[0.2em] text-white gold-shimmer leading-tight">Build the Revelation</h2>
                                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed uppercase tracking-[0.1em] font-light max-w-xl mx-auto">
                                        We are raising <span className="text-white font-black">$2,500</span> to secure a <span className="text-aether-gold font-black">High-End Cinematic Workstation</span> for the 400 Series. This hardware will allow us to render 8K AI-enhanced masterpieces with absolute prophetic clarity.
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-4 max-w-md mx-auto">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Hardware Goal</span>
                                        <span className="text-[10px] font-mono text-aether-gold">$2,500</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '15%' }} // Placeholder progress
                                            className="h-full bg-aether-gold shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                                        />
                                    </div>
                                </div>

                                {/* Allocation Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                                    {[
                                        { icon: <Gpu className="w-5 h-5" />, title: 'GPU Core', desc: 'NVIDIA RTX Workstation for 8K AI Rendering.', price: '$1,500' },
                                        { icon: <Server className="w-5 h-5" />, title: 'Processor', desc: 'High-concurrency logic for Prophetic AI.', price: '$500' },
                                        { icon: <Database className="w-5 h-5" />, title: 'Archive', desc: 'Cold storage for high-fidelity 400 Series assets.', price: '$500' }
                                    ].map((item, i) => (
                                        <div key={i} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 text-left space-y-4 hover:bg-white/[0.04] transition-all group">
                                            <div className="w-10 h-10 rounded-xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20 text-aether-gold group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black uppercase text-white tracking-widest">{item.title}</h4>
                                                <p className="text-[8px] text-zinc-500 uppercase leading-relaxed">{item.desc}</p>
                                            </div>
                                            <div className="text-[10px] font-mono text-aether-gold/50">{item.price}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 space-y-8">
                                    <a 
                                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full bg-aether-gold text-black py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:scale-105 transition-all border border-black/10"
                                    >
                                        Initiate Contribution
                                    </a>
                                    <button 
                                        onClick={() => setShowSupportOverlay(false)}
                                        className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-600 hover:text-white transition-colors"
                                    >
                                        Continue Research
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
