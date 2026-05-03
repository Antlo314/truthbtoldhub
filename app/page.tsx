'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
    Play, 
    Pause,
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
    Gpu,
    Music,
    Waves,
    Mic2,
    Volume2,
    Info,
    ScrollText,
    SkipForward,
    VolumeX,
    SkipBack,
    Signal,
    User,
    Wallet,
    LogOut,
    Key
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
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    
    // Audio State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const tracks = [
        { title: '400 Years Prophesy', genre: 'Cinematic Theme', file: '/audio/400 Years Prophesy.mp3' },
        { title: '400-Year Crown', genre: 'Royal Prophecy', file: '/audio/400-Year Crown.mp3' },
        { title: 'Ascension at Dusk', genre: 'Ethereal Ambient', file: '/audio/Ascension at Dusk.mp3' },
        { title: 'Ashen Covenant', genre: 'Dark Soundscape', file: '/audio/Ashen Covenant.mp3' },
        { title: 'Ur Chaldees', genre: 'Ancient Middle-Eastern', file: '/audio/Ur Chaldees.mp3' },
        { title: 'Wilderness Whispers', genre: 'Spiritual Nature', file: '/audio/Wilderness Whispers.mp3' }
    ];

    // Global Pulse State
    const [pulseLog, setPulseLog] = useState<string[]>([]);
    const signals = [
        "SIGNAL DETECTED: LAGOS, NIGERIA",
        "PROPHETIC ALIGNMENT: 98.4%",
        "SIGNAL DETECTED: ATLANTA, GA",
        "HISTORICAL SYNC: 1619 PROTOCOL ACTIVE",
        "DECRYPTION COMPLETE: GENESIS 15:13",
        "AETHERIC FREQUENCY: 432HZ STABLE",
        "SIGNAL DETECTED: LONDON, UK",
        "RESTORED ARCHIVE ACCESS: PHASE 01"
    ];

    // Prophetic Alignment State
    const [alignment, setAlignment] = useState(98.4);

    // Scripture Decryptor State
    const [decryptedText, setDecryptedText] = useState("GENESIS 15:13");
    const verses = [
        "GENESIS 15:13",
        "KNOW FOR CERTAIN",
        "400 YEARS",
        "STRANGERS IN A COUNTRY",
        "THE ECHO REMAINS"
    ];

    // AI Chat Integration
    const { messages, sendMessage, status } = useChat();
    const [input, setInput] = useState('');
    const isLoading = status !== 'ready';
    
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        // Auth Check
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) fetchProfile(user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
        });

        // Scripture Decryptor Loop
        const interval = setInterval(() => {
            setDecryptedText(verses[Math.floor(Math.random() * verses.length)]);
        }, 3000);

        // Global Pulse Loop
        const pulseInterval = setInterval(() => {
            setPulseLog(prev => [signals[Math.floor(Math.random() * signals.length)], ...prev].slice(0, 10));
            setAlignment(prev => +(prev + (Math.random() * 0.2 - 0.1)).toFixed(1));
        }, 4000);

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
            clearInterval(pulseInterval);
        };
    }, []);

    async function fetchProfile(uid: string) {
        const { data } = await supabase.from('soul_profiles').select('*').eq('id', uid).single();
        if (data) setProfile(data);
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Audio Sync Effect
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(() => setIsPlaying(false));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentTrack]);

    const toggleAudio = () => {
        setIsPlaying(!isPlaying);
    };

    const nextTrack = () => {
        setCurrentTrack((prev) => (prev + 1) % tracks.length);
        setIsPlaying(true);
    };

    const prevTrack = () => {
        setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
        setIsPlaying(true);
    };

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

    const LockedOverlay = ({ title }: { title: string }) => (
        <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl z-[40] flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/20">
                <Lock className="w-6 h-6 text-white/40" />
            </div>
            <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">PROTOCOL BREACH</h4>
                <p className="text-[8px] text-white/40 uppercase tracking-[0.2em] max-w-[200px]">Authentication required to decrypt {title}.</p>
            </div>
            <button 
                onClick={() => router.push('/trial')}
                className="px-6 py-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-transform"
            >
                Initialize Profile
            </button>
        </div>
    );

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050505] text-white font-sans selection:bg-aether-gold/30 overflow-x-hidden">
            <audio ref={audioRef} key={currentTrack} src={tracks[currentTrack].file} onEnded={nextTrack} />
            
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
                    border-color: rgba(255, 255, 255, 0.3);
                    background: rgba(255, 255, 255, 0.03);
                }
                .gold-shimmer {
                    background: linear-gradient(
                        to right,
                        #d4af37 0%,
                        #fff8e1 25%,
                        #fff8e1 75%,
                        #d4af37 100%
                    );
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shine 4s linear infinite;
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

                .audio-visualizer-bar {
                    background: white;
                    width: 2px;
                    border-radius: 1px;
                    animation: audioPulse 1.5s ease-in-out infinite alternate;
                }
                @keyframes audioPulse {
                    from { height: 10%; opacity: 0.2; }
                    to { height: 100%; opacity: 1; }
                }

                .honor-ticker {
                    animation: tickerScroll 40s linear infinite;
                }
                @keyframes tickerScroll {
                    from { transform: translateX(100%); }
                    to { transform: translateX(-100%); }
                }

                .decrypting-text::before {
                    content: '010101';
                    position: absolute;
                    inset: 0;
                    color: rgba(255,255,255,0.1);
                    z-index: -1;
                    filter: blur(1px);
                    animation: decryptShuffle 0.5s infinite;
                }
                @keyframes decryptShuffle {
                    0% { transform: translate(2px, 0); }
                    50% { transform: translate(-2px, 1px); }
                    100% { transform: translate(0, -1px); }
                }

                .artifact-glitch {
                    animation: artGlitch 0.2s infinite;
                }
                @keyframes artGlitch {
                    0% { opacity: 0.8; transform: skewX(1deg); }
                    50% { opacity: 0.2; transform: skewX(-2deg); }
                    100% { opacity: 0.8; transform: skewX(0); }
                }
            `}</style>

            <div className="film-grain" />
            
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
                            <div className="flex items-center gap-2">
                                <span className="text-[7px] font-mono text-white uppercase tracking-widest mt-0.5">Prophetic OS v1.0</span>
                                <div className="h-[1px] w-4 bg-white/20"></div>
                                <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest mt-0.5 animate-pulse">Alignment: {alignment}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-8 pointer-events-auto">
                    {user ? (
                        <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                    <User className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">{profile?.username || 'Prophet'}</span>
                            </div>
                            <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => router.push('/trial')}
                            className="px-6 md:px-8 py-2.5 bg-white/5 border border-white/20 text-white rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all"
                        >
                            Initialize
                        </button>
                    )}

                    <button 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        onClick={() => setShowSupportOverlay(true)}
                        className="px-6 md:px-10 py-3 bg-white text-black rounded-full text-[10px] font-black tracking-[0.3em] uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-white/20"
                    >
                        Support 400 Series
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative h-[80dvh] flex flex-col items-center justify-center p-6 mt-12 md:mt-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.03)_0%,transparent_60%)]"></div>
                <div className="hero-content relative z-10 text-center space-y-8 md:space-y-12 w-full max-w-[100vw]">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase">Restoration Protocol Initialized</span>
                    </div>
                    <div className="w-full overflow-hidden flex justify-center">
                        <h1 ref={titleRef} className="kinetic-title font-ritual text-4xl sm:text-6xl md:text-[10rem] font-black leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4 select-none">
                            TRUTH B TOLD HUB
                        </h1>
                    </div>
                    <p className="text-[10px] md:text-xl font-light text-white max-w-4xl mx-auto tracking-[0.2em] leading-relaxed uppercase px-6">
                        The Master Bento Ecosystem. Exploring <span className="text-white font-black">Genesis 15:13</span> and the <span className="text-aether-gold font-black">400 Year Echo</span>.
                    </p>
                </div>
            </section>

            {/* MASTER BENTO GRID */}
            <section id="master-bento" className="relative pb-48 px-4 md:px-12 max-w-[100rem] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-12 auto-rows-[minmax(200px,_auto)] gap-4 md:gap-8">
                    
                    {/* Main Cinematic Feature (ALWAYS UNLOCKED) */}
                    <div className="bento-card col-span-2 md:col-span-8 md:row-span-2 liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group p-1 md:p-2 min-h-[400px] relative">
                        <div className="h-full relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <iframe 
                                className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000 scale-[1.01]"
                                src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0" 
                                title="400 - Genesis 15"
                                allowFullScreen
                            ></iframe>
                            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm z-10" />
                                <div className="artifact-glitch relative z-20 text-[10rem] font-ritual text-white/10 mix-blend-overlay">GENESIS</div>
                            </div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:left-12 flex justify-between items-end pointer-events-none z-30">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl">
                                        <Play className="w-3 h-3 text-white" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Featured Revelation</span>
                                    </div>
                                    <h2 className="font-ritual text-3xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prophetic AI Oracle (GATED) */}
                    <div className="bento-card col-span-2 md:col-span-4 md:row-span-2 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[500px] relative overflow-hidden">
                        {!user && <LockedOverlay title="The Oracle" />}
                        <div className="data-glitch" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <Terminal className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Prophetic Oracle</span>
                                    <span className="text-[7px] font-mono text-white uppercase tracking-widest">AI Decryption Engine</span>
                                </div>
                            </div>
                            {isLoading && <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>}
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-8 pr-2 min-h-[300px]">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <Sparkles className="w-8 h-8 text-white mb-2" />
                                    <p className="text-[9px] uppercase tracking-[0.3em] leading-relaxed max-w-[200px] text-white font-black">
                                        Input a verse or historical era to begin the decryption protocol.
                                    </p>
                                </div>
                            ) : (
                                messages.map((m, i) => (
                                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] px-6 py-4 rounded-3xl text-[11px] leading-relaxed tracking-wide ${
                                            m.role === 'user' 
                                            ? 'bg-white/10 border border-white/20 text-white' 
                                            : 'bg-aether-gold/10 border border-aether-gold/20 text-aether-gold font-black'
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
                                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-white transition-all placeholder:text-zinc-300 tracking-widest uppercase text-white font-black"
                            />
                            <button 
                                type="submit"
                                disabled={isLoading || !input}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                <Send className="w-4 h-4 text-black" />
                            </button>
                        </form>
                    </div>

                    {/* SELF / PROFILE CARD (GATED) */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[350px] relative overflow-hidden bg-gradient-to-br from-white/10 to-transparent">
                        {!user && <LockedOverlay title="Profile Access" />}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-8 h-8 text-white/20" />
                                    )}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${profile?.aura_color ? `border-${profile.aura_color}/30 text-${profile.aura_color}` : 'border-white/20 text-white/40'}`}>
                                    {profile?.aura_color || 'Neutral'} Aura
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-ritual text-2xl font-black uppercase tracking-[0.1em] text-white">{profile?.username || 'The Prophet'}</h3>
                                <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-black leading-relaxed">
                                    {profile?.bio || 'Initializing neural-link with the 400 Series archives...'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Protocol ID</span>
                                <span className="text-[9px] font-mono text-white/60">TBT-{user?.id?.slice(0, 8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* THE POOL / TREASURY (GATED) */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[350px] relative overflow-hidden bg-gradient-to-t from-aether-gold/5 to-transparent">
                        {!user && <LockedOverlay title="The Pool" />}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                    <Wallet className="w-6 h-6 text-aether-gold" />
                                </div>
                                <Activity className="w-5 h-5 text-aether-gold animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-ritual text-xl font-black uppercase tracking-[0.1em] text-white">The Pool</h3>
                                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest">Prophetic Mutual Aid Reserve</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Active Balance</span>
                                    <span className="text-3xl font-ritual font-black text-white">$4,821.00</span>
                                </div>
                                <button onClick={() => router.push('/treasury')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-aether-gold/40"></div>
                            </div>
                        </div>
                    </div>

                    {/* Aether Player (ALWAYS UNLOCKED) */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[350px] bg-gradient-to-br from-white/5 to-transparent">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-10 md:w-14 h-10 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <Music className="w-5 md:w-7 h-5 md:h-7 text-white" />
                                </div>
                                <div className="flex gap-1 items-end h-6">
                                    {[0.4, 0.7, 0.5, 0.9, 0.6, 0.4, 0.8].map((h, i) => (
                                        <div key={i} className="w-1.5 bg-white/20 rounded-full overflow-hidden" style={{ height: `${h * 100}%` }}>
                                            <div className={`w-full bg-white transition-all duration-300 ${isPlaying ? 'animate-audioPulse' : 'h-[10%]'}`} style={{ animationDelay: `${i * 0.1}s` }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-ritual text-lg md:text-2xl font-black uppercase tracking-[0.1em] text-white">Aether Player</h3>
                                <div className="flex flex-col">
                                    <p className="text-white text-[10px] uppercase tracking-[0.1em] font-black">{tracks[currentTrack].title}</p>
                                    <p className="text-aether-gold text-[7px] uppercase tracking-[0.2em] font-black opacity-60">{tracks[currentTrack].genre}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={prevTrack} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                                <SkipBack className="w-4 h-4" />
                            </button>
                            <button onClick={toggleAudio} className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                            </button>
                            <button onClick={nextTrack} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                                <SkipForward className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Global Pulse Terminal (GATED) */}
                    <div className="bento-card col-span-1 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-black/60 min-h-[350px] overflow-hidden relative">
                        {!user && <LockedOverlay title="The Global Pulse" />}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Signal className="w-5 h-5 text-white animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Global Pulse</span>
                                <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Verification Feed</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 font-mono text-[8px] overflow-hidden">
                            {pulseLog.map((log, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-3 text-white/40 hover:text-white transition-colors cursor-default"
                                >
                                    <span className="text-aether-gold">{'>'}</span>
                                    <span className="uppercase tracking-widest">{log}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Hardware Milestone (ALWAYS UNLOCKED) */}
                    <div className="bento-card col-span-2 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card bg-gradient-to-t from-white/5 to-transparent min-h-[350px]">
                        <div className="space-y-6">
                            <div className="w-10 md:w-14 h-10 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                <Cpu className="w-5 md:w-7 h-5 md:h-7 text-white" />
                            </div>
                            <h3 className="font-ritual text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white">Hardware</h3>
                            <p className="text-white text-[8px] md:text-[10px] leading-relaxed uppercase tracking-[0.1em] font-black">
                                Milestone 01: Render Node Active. Processing 8K Masterpieces.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowSupportOverlay(true)}
                            className="w-full bg-white text-black py-4 md:py-5 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            Boost Phase
                        </button>
                    </div>

                    {/* The Prelude (ALWAYS UNLOCKED) */}
                    <div className="bento-card col-span-2 md:col-span-4 liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group border-white/10 p-1 md:p-2">
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
                            <p className="text-white text-[9px] uppercase tracking-[0.1em] font-black">Archive View: 400 Year Diaspora</p>
                         </div>
                    </div>

                    {/* Historical Timeline (GATED) */}
                    <div className="bento-card col-span-2 md:col-span-12 liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between border-white/10 group gap-12 relative overflow-hidden">
                        {!user && <LockedOverlay title="The Timeline" />}
                        <div className="flex flex-col gap-6 max-w-xl text-center md:text-left relative z-10">
                            <div className="flex items-center justify-center md:justify-start gap-4 text-white">
                                <History className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Historical Cycle</span>
                            </div>
                            <h3 className="font-ritual text-3xl md:text-5xl font-black uppercase tracking-[0.1em] text-white gold-shimmer">ABRAHAM TO 2019</h3>
                            <p className="text-white text-xs md:text-sm leading-relaxed uppercase tracking-[0.1em] font-black">
                                A panoramic investigation into the diaspora of the Hebrew people.
                            </p>
                        </div>
                        <div className="flex items-center gap-6 md:gap-12 relative z-10">
                            {[
                                { year: 2019, hint: 'End of 400 Year Prophecy' },
                                { year: 1619, hint: 'Arrival in Virginia' },
                                { year: 'Gen', hint: 'Abram receiving the Promise' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-4 text-center group/item cursor-help">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white group-hover/item:bg-aether-gold group-hover/item:scale-150 transition-all"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-ritual text-xl md:text-2xl font-black text-white group-hover/item:text-aether-gold transition-colors">{item.year}</span>
                                        <span className="text-[6px] opacity-0 group-hover/item:opacity-100 transition-opacity text-white uppercase tracking-widest mt-1 font-black">{item.hint}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* WALL OF HONOR TICKER */}
                <div className="mt-12 w-full overflow-hidden border-y border-white/5 py-4 whitespace-nowrap group">
                    <div className="inline-block honor-ticker">
                        {[
                            'TRUUTHBTOLD NODE', 'PROPHETIC CORE ACTIVE', 'DIASPORA ARCHIVE UNLOCKED', 
                            'GENESIS 15:13 VERIFIED', 'AETHER AUDIO SYNCED', 'MASTER BENTO DEPLOYED'
                        ].map((text, i) => (
                            <span key={i} className="mx-12 text-[9px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors cursor-default">
                                {text}
                            </span>
                        ))}
                    </div>
                    <div className="inline-block honor-ticker">
                        {[
                            'TRUUTHBTOLD NODE', 'PROPHETIC CORE ACTIVE', 'DIASPORA ARCHIVE UNLOCKED', 
                            'GENESIS 15:13 VERIFIED', 'AETHER AUDIO SYNCED', 'MASTER BENTO DEPLOYED'
                        ].map((text, i) => (
                            <span key={i} className="mx-12 text-[9px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors cursor-default">
                                {text}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-24 md:py-32 border-t border-white/10 text-center space-y-12 bg-void">
                <div className="flex items-center justify-center gap-8 opacity-40">
                    <ShieldCheck className="w-10 h-10 text-white" />
                    <Sparkles className="w-10 h-10 text-white" />
                    <Video className="w-10 h-10 text-white" />
                </div>
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-8 mb-4">
                        <a href="https://youtube.com/@truufbtold" target="_blank" className="text-white hover:text-aether-gold transition-colors">
                            <YoutubeIcon className="w-6 h-6" />
                        </a>
                        <a href="https://tiktok.com/@truufbtold" target="_blank" className="text-white hover:text-aether-gold transition-colors">
                            <TikTokIcon className="w-6 h-6" />
                        </a>
                    </div>
                    <p className="text-[10px] font-black tracking-[0.8em] text-white uppercase">Protocol A-25 • Truth B Told Hub • 2026 Edition</p>
                </div>
            </footer>

            {/* Support Overlay */}
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
                            className="liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 max-w-4xl w-full relative space-y-12 border-white/20 shadow-[0_0_150px_rgba(255,255,255,0.1)] my-8"
                        >
                            <button 
                                onClick={() => setShowSupportOverlay(false)}
                                className="absolute top-6 md:top-10 right-6 md:right-10 text-white hover:text-aether-gold transition-colors p-3 bg-white/5 rounded-full border border-white/20"
                            >
                                <Lock className="w-6 h-6" />
                            </button>
                            
                            <div className="text-center space-y-12">
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl">
                                        <Sparkles className="w-4 h-4 text-aether-gold animate-pulse" />
                                        <span className="text-[9px] font-black tracking-[0.5em] text-white uppercase">The Masterpiece Roadmap</span>
                                    </div>
                                    <h2 className="font-ritual text-4xl md:text-6xl font-black uppercase tracking-[0.2em] text-white gold-shimmer drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">The 400 Series Journey</h2>
                                </div>

                                {/* ROADMAP GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {[
                                        { phase: '01', icon: <Cpu />, title: 'The Engine', desc: 'Secure the 8K AI Render Node. 400 Series foundation.', goal: '$2,500', active: true },
                                        { phase: '02', icon: <Music />, title: 'Symphony', desc: 'AI-Generated Prophetic Scores & Soundscapes.', goal: '$1,500+', active: false },
                                        { phase: '03', icon: <Waves />, title: 'The Codex', desc: 'Interactive visualizers & Voice-over narration.', goal: '$5,000', active: false },
                                        { phase: '04', icon: <Globe />, title: 'Revelation', desc: 'Full-length AI feature film release globally.', goal: '$10,000', active: false }
                                    ].map((step, i) => (
                                        <div key={i} className={`p-8 rounded-[2.5rem] border ${step.active ? 'bg-white/10 border-white/30' : 'bg-white/[0.03] border-white/10'} text-left space-y-6 relative group overflow-hidden`}>
                                            {step.active && <div className="absolute top-0 right-0 p-4"><div className="w-2 h-2 rounded-full bg-white animate-ping" /></div>}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono font-black text-white/50">{step.phase}</span>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.active ? 'bg-white text-black' : 'bg-white/5 text-white/30'}`}>
                                                    {step.icon}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-white">{step.title}</h4>
                                                <p className="text-[9px] text-white/60 uppercase leading-relaxed font-black">{step.desc}</p>
                                            </div>
                                            <div className={`text-[10px] font-mono ${step.active ? 'text-white' : 'text-white/20'}`}>{step.goal}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 space-y-8">
                                    <div className="p-8 rounded-[3rem] bg-gradient-to-r from-white/5 to-transparent border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-black uppercase text-white tracking-widest">Active Contribution</h5>
                                            <p className="text-xs text-white opacity-60 font-black">Join the production legacy. Every contribution pushes the roadmap.</p>
                                        </div>
                                        <a 
                                            href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-12 py-6 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105 transition-all whitespace-nowrap"
                                        >
                                            Fuel Phase 01
                                        </a>
                                    </div>
                                    <button 
                                        onClick={() => setShowSupportOverlay(false)}
                                        className="text-[10px] font-black tracking-[0.5em] uppercase text-white/40 hover:text-white transition-colors"
                                    >
                                        Return to Sanctum
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
