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
    Key,
    AlertTriangle,
    Maximize2,
    Minimize2,
    MessageSquare,
    Hash
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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
    const [isAscended, setIsAscended] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
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

    // AI Chat Integration
    const { messages: aiMessages, sendMessage: sendAiMessage, status } = useChat();
    const [aiInput, setAiInput] = useState('');
    const isLoadingAi = status !== 'ready';
    
    // Community Chat State
    const [communityMessages, setCommunityMessages] = useState<any[]>([]);
    const [communityInput, setCommunityInput] = useState('');
    const communityChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        // Auth Check
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) fetchProfile(user.id);
        });

        // Check for Ascension flag
        const ascended = localStorage.getItem('protocol_ascended') === 'true';
        setIsAscended(ascended);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else setProfile(null);
        });

        // Fetch Community Messages
        fetchCommunityMessages();
        
        const channel = supabase.channel('global_chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_messages' }, async (payload) => {
                const { data: profile } = await supabase.from('soul_profiles').select('username, avatar_url').eq('id', payload.new.author_id).single();
                setCommunityMessages(prev => [...prev, { ...payload.new, author: profile }].slice(-20));
            })
            .subscribe();

        // Global Pulse Loop
        const pulseInterval = setInterval(() => {
            setPulseLog(prev => [signals[Math.floor(Math.random() * signals.length)], ...prev].slice(0, 10));
            setAlignment(prev => +(prev + (Math.random() * 0.2 - 0.1)).toFixed(1));
        }, 4000);

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
            clearInterval(pulseInterval);
        };
    }, []);

    async function fetchProfile(uid: string) {
        const { data } = await supabase.from('soul_profiles').select('*').eq('id', uid).single();
        if (data) setProfile(data);
    }

    async function fetchCommunityMessages() {
        const { data } = await supabase
            .from('archive_messages')
            .select('*, author:soul_profiles(username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(20);
        if (data) setCommunityMessages(data.reverse());
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.refresh();
    };

    const navigateToTrial = () => {
        router.push('/trial');
    };

    const toggleExpand = (cardId: string) => {
        setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    // AI Chat Handler
    const handleAiSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim() || isLoadingAi) return;
        sendAiMessage({ 
            role: 'user', 
            parts: [{ type: 'text', text: aiInput }] 
        });
        setAiInput('');
    };

    // Community Chat Handler
    const handleCommunitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityInput.trim() || !user) return;
        
        const content = communityInput;
        setCommunityInput('');

        const { error } = await supabase.from('archive_messages').insert({
            content,
            author_id: user.id,
            channel_id: 'global-general' // Fallback channel
        });

        if (error) console.error(error);
    };

    // Audio Handlers
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

    // Signal Stability Logic
    const isUnlocked = user || isAscended;

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
                onClick={navigateToTrial}
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
                    transform: rotateX(1deg) rotateY(1deg) translateZ(5px);
                }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .kinetic-title {
                    white-space: nowrap;
                    display: inline-block;
                    width: 100%;
                    text-align: center;
                }

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
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-3 h-3 text-white" />
                                    )}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">{profile?.username || 'Prophet'}</span>
                            </div>
                            <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : isAscended ? (
                        <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 px-6 py-2.5 rounded-full backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Signal Unstable</span>
                            </div>
                            <button onClick={navigateToTrial} className="text-[8px] font-black uppercase tracking-widest text-white hover:text-aether-gold transition-colors">Secure Link</button>
                        </div>
                    ) : (
                        <button onClick={navigateToTrial} className="px-6 md:px-8 py-2.5 bg-white/5 border border-white/20 text-white rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all">Initialize</button>
                    )}
                    <button onClick={() => setShowSupportOverlay(true)} className="px-6 md:px-10 py-3 bg-white text-black rounded-full text-[10px] font-black tracking-[0.3em] uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-white/20">Support 400 Series</button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative h-[60dvh] flex flex-col items-center justify-center p-6 mt-12 md:mt-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.03)_0%,transparent_60%)]"></div>
                <div className="hero-content relative z-10 text-center space-y-8 md:space-y-12 w-full max-w-[100vw]">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase">Restoration Protocol Initialized</span>
                    </div>
                    <div className="w-full overflow-hidden flex justify-center">
                        <h1 ref={titleRef} className="kinetic-title font-ritual text-4xl sm:text-6xl md:text-[10rem] font-black leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4 select-none">TRUTH B TOLD HUB</h1>
                    </div>
                </div>
            </section>

            {/* MASTER BENTO GRID */}
            <LayoutGroup>
            <section id="master-bento" className="relative pb-48 px-4 md:px-12 max-w-[100rem] mx-auto">
                <motion.div layout className="grid grid-cols-2 md:grid-cols-12 auto-rows-[minmax(180px,_auto)] gap-4 md:gap-8">
                    
                    {/* Main Cinematic Feature */}
                    <motion.div 
                        layout
                        onClick={() => toggleExpand('main')}
                        className={`bento-card col-span-2 ${expandedCard === 'main' ? 'md:col-span-12 row-span-3' : 'md:col-span-8 md:row-span-2'} liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group p-1 md:p-2 min-h-[350px] relative cursor-pointer`}
                    >
                        <div className="h-full relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <iframe className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000 scale-[1.01]" src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0" allowFullScreen></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 flex justify-between items-end pointer-events-none z-30">
                                <h2 className="font-ritual text-2xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                            </div>
                        </div>
                    </motion.div>

                    {/* Global Archive (COMMUNITY CHAT) - NEW */}
                    <motion.div 
                        layout
                        onClick={() => toggleExpand('chat')}
                        className={`bento-card col-span-2 ${expandedCard === 'chat' ? 'row-span-3 md:col-span-12' : 'md:col-span-4 md:row-span-2'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[450px] relative overflow-hidden cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="The Archive" />}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Global Archive</span>
                                    <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Community Whispers</span>
                                </div>
                            </div>
                            {expandedCard === 'chat' ? <Minimize2 onClick={(e) => { e.stopPropagation(); toggleExpand('chat'); }} className="w-5 h-5 text-white/40" /> : <Maximize2 className="w-5 h-5 text-white/40" />}
                        </div>

                        <div ref={communityChatRef} className="flex-1 overflow-y-auto space-y-4 hide-scrollbar mb-8 pr-2">
                            {communityMessages.map((msg, i) => (
                                <div key={i} className="flex flex-col space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-aether-gold uppercase tracking-widest">{msg.author?.username || 'Unknown'}</span>
                                        <span className="text-[6px] font-mono text-zinc-600">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-[10px] text-white/70 font-mono tracking-wide leading-relaxed">{msg.content}</p>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleCommunitySubmit} className="relative" onClick={(e) => e.stopPropagation()}>
                            <input 
                                value={communityInput}
                                onChange={(e) => setCommunityInput(e.target.value)}
                                disabled={!user}
                                placeholder={user ? "Inject whisper..." : "Secure link to whisper"}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-white transition-all placeholder:text-zinc-600 tracking-widest uppercase text-white font-black disabled:opacity-30"
                            />
                            <button type="submit" disabled={!user || !communityInput.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20">
                                <Send className="w-4 h-4 text-black" />
                            </button>
                        </form>
                    </motion.div>

                    {/* Prophetic AI Oracle */}
                    <motion.div 
                        layout
                        onClick={() => !expandedCard && toggleExpand('oracle')}
                        className={`bento-card col-span-2 ${expandedCard === 'oracle' ? 'row-span-3 md:col-span-12' : 'md:col-span-4 md:row-span-2'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[450px] relative overflow-hidden cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="The Oracle" />}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Terminal className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">AI Oracle</span>
                                    <span className="text-[7px] font-mono text-white uppercase tracking-widest">Decryption Engine</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-8 pr-2">
                            {aiMessages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] px-6 py-4 rounded-3xl text-[11px] leading-relaxed tracking-wide ${m.role === 'user' ? 'bg-white/10 border border-white/20 text-white' : 'bg-aether-gold/10 border border-aether-gold/20 text-aether-gold font-black'}`}>
                                        {m.parts.map((p, j) => p.type === 'text' ? <span key={j}>{p.text}</span> : null)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAiSubmit} className="relative" onClick={(e) => e.stopPropagation()}>
                            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Query Oracle..." className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-white transition-all placeholder:text-zinc-300 tracking-widest uppercase text-white font-black" />
                            <button type="submit" disabled={isLoadingAi || !aiInput} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20"><Send className="w-4 h-4 text-black" /></button>
                        </form>
                    </motion.div>

                    {/* SELF / PROFILE CARD */}
                    <motion.div 
                        layout
                        onClick={() => toggleExpand('self')}
                        className={`bento-card col-span-1 ${expandedCard === 'self' ? 'col-span-2 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[300px] relative overflow-hidden bg-gradient-to-br from-white/10 to-transparent cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="Profile Access" />}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 md:w-8 md:h-8 text-white/20" />}
                                </div>
                            </div>
                            <h3 className="font-ritual text-xl md:text-2xl font-black uppercase text-white">{profile?.username || (isAscended ? 'Guest Prophet' : 'The Prophet')}</h3>
                        </div>
                    </motion.div>

                    {/* THE POOL / TREASURY */}
                    <motion.div 
                        layout
                        onClick={() => toggleExpand('pool')}
                        className={`bento-card col-span-1 ${expandedCard === 'pool' ? 'col-span-2 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[300px] relative overflow-hidden bg-gradient-to-t from-aether-gold/5 to-transparent cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="The Pool" />}
                        <div className="space-y-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20"><Wallet className="w-5 h-5 md:w-6 md:h-6 text-aether-gold" /></div>
                            <h3 className="font-ritual text-lg md:text-xl font-black uppercase text-white">The Pool</h3>
                        </div>
                        <div className="flex justify-between items-end"><span className="text-2xl font-ritual font-black text-white">$4,821</span></div>
                    </motion.div>

                    {/* Aether Player */}
                    <motion.div 
                        layout
                        onClick={() => toggleExpand('player')}
                        className={`bento-card col-span-2 ${expandedCard === 'player' ? 'md:col-span-6 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[300px] cursor-pointer`}
                    >
                        <div className="space-y-6">
                            <div className="w-10 md:w-14 h-10 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Music className="w-5 md:w-7 h-5 md:h-7 text-white" /></div>
                            <h3 className="font-ritual text-lg md:text-2xl font-black uppercase text-white">Aether Player</h3>
                        </div>
                        <div className="flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
                            <button onClick={toggleAudio} className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}</button>
                        </div>
                    </motion.div>

                </motion.div>
            </section>
            </LayoutGroup>

            <footer className="py-24 border-t border-white/10 text-center space-y-12 bg-void">
                <div className="flex flex-col items-center gap-6">
                    <p className="text-[10px] font-black tracking-[0.8em] text-white uppercase">Protocol A-25 • Truth B Told Hub • 2026 Edition</p>
                </div>
            </footer>

            {/* Support Overlay */}
            <AnimatePresence>
                {showSupportOverlay && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#050505]/98 backdrop-blur-3xl overflow-y-auto">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="liquid-glass rounded-[4rem] p-12 max-w-4xl w-full relative space-y-12 border-white/20">
                            <button onClick={() => setShowSupportOverlay(false)} className="absolute top-10 right-10 text-white hover:text-aether-gold p-3 bg-white/5 rounded-full border border-white/20"><Lock className="w-6 h-6" /></button>
                            <h2 className="font-ritual text-6xl font-black uppercase gold-shimmer">The 400 Series Journey</h2>
                            <a href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01" target="_blank" className="inline-block px-12 py-6 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(255,255,255,0.4)]">Fuel Phase 01</a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
