'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
    Play, 
    Pause,
    ShieldCheck,
    ShieldAlert,
    ChevronDown,
    Sparkles, 
    ArrowRight,
    Lock,
    Eye,
    Globe, 
    Zap,
    Cpu,
    Clapperboard,
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
    Hash,
    ShoppingBag,
    ExternalLink,
    Loader2
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { Howl } from 'howler';
import AuthModal from '../components/AuthModal';
import SupportVisionModal from '../components/SupportVisionModal';

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
    const [showVisionModal, setShowVisionModal] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [supportMode, setSupportMode] = useState<'series' | 'hardware'>('series');
    const overlayScrollRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (showSupportOverlay && overlayScrollRef.current) {
            overlayScrollRef.current.scrollTo(0, 0);
        }
    }, [showSupportOverlay]);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isAscended, setIsAscended] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
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
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [archiveMode, setArchiveMode] = useState<'chat' | 'vault'>('chat');

    // SFX
    const sfxRef = useRef<{ [key: string]: Howl }>({});

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
    const { messages: aiMessages, input: aiInput, handleInputChange: handleAiInputChange, handleSubmit, isLoading: isLoadingAi, append, setInput: setAiInput } = useChat() as any;
    const [oracleError, setOracleError] = useState<string | null>(null);
    
    const handleAiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('AI Oracle Submit Triggered:', aiInput);
        if (!aiInput?.trim() || isLoadingAi) return;
        
        setOracleError(null);
        try {
            const result = await append({
                role: 'user',
                content: aiInput
            });
            
            if (!result) {
                throw new Error("Neural link unstable. Retry connection.");
            }
            
            setAiInput(''); // Manual clear
        } catch (err: any) {
            console.error('AI Oracle Submit Error:', err);
            setOracleError(err.message || "Failed to reach the Oracle.");
            playSfx('error');
            setTimeout(() => setOracleError(null), 5000);
        }
    };
    // Community Chat State
    const [communityMessages, setCommunityMessages] = useState<any[]>([]);
    const [communityInput, setCommunityInput] = useState('');
    const communityChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        setShowVisionModal(true);
        
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

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

        // Initialize SFX
        if (typeof window !== 'undefined') {
            const sounds = {
                hover: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3',
                click: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3',
                error: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3',
                glitch: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/glitch_static.mp3'
            };

            Object.entries(sounds).forEach(([key, src]) => {
                sfxRef.current[key] = new Howl({ 
                    src: [src], 
                    volume: 0.2,
                    onloaderror: () => console.warn(`SFX ${key} failed to load. Silencing.`),
                });
            });
        }

        // Fetch Community Messages
        fetchCommunityMessages();
        
        // Real-time Chat Subscription
        const channel = supabase.channel('global_chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_messages' }, async (payload) => {
                const { data: profileData } = await supabase.from('profiles').select('username, avatar_url, aura_color').eq('id', payload.new.author_id).single();
                setCommunityMessages(prev => {
                    const exists = prev.find(m => m.id === payload.new.id);
                    if (exists) return prev;
                    return [...prev, { ...payload.new, author: profileData }].slice(-30);
                });
                
                // Auto-scroll logic if at bottom
                if (communityChatRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = communityChatRef.current;
                    if (scrollHeight - scrollTop - clientHeight < 100) {
                        communityChatRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
                    }
                }
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
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Audio Engine Bridge
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(console.error);
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const onEnd = () => nextTrack();

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnd);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnd);
        };
    }, [currentTrack]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const playSfx = (key: string) => {
        if (sfxRef.current[key] && sfxRef.current[key].state() === 'loaded') {
            sfxRef.current[key].play();
        }
    };

    async function fetchProfile(uid: string) {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (data) setProfile(data);
    }

    async function fetchCommunityMessages() {
        const { data } = await supabase
            .from('archive_messages')
            .select('*, author:profiles(username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(20);
        if (data) setCommunityMessages(data.reverse());
    }

    const handleLogout = async () => {
        playSfx('click');
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.refresh();
    };

    const navigateToTrial = () => {
        playSfx('click');
        router.push('/trial');
    };

    const openSupport = (mode: 'series' | 'hardware' = 'series') => {
        playSfx('click');
        setSupportMode(mode);
        setShowSupportOverlay(true);
    };

    const toggleExpand = (cardId: string) => {
        if (!isMobile) return;
        playSfx('hover');
        setExpandedCard(expandedCard === cardId ? null : cardId);
    };

    const handleCommunitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityInput?.trim() || !user) {
            if (!user) playSfx('error');
            return;
        }
        
        playSfx('click');
        const content = communityInput;
        setCommunityInput('');

        const { error } = await supabase.from('archive_messages').insert({
            content,
            author_id: user.id,
            channel_id: 'global-general'
        });

        if (error) {
            console.error(error);
            playSfx('error');
        }
    };

    const toggleAudio = () => {
        playSfx('click');
        setIsPlaying(!isPlaying);
    };

    const nextTrack = () => {
        playSfx('hover');
        const next = (currentTrack + 1) % tracks.length;
        setCurrentTrack(next);
        setIsPlaying(true);
    };

    const prevTrack = () => {
        playSfx('hover');
        const prev = (currentTrack - 1 + tracks.length) % tracks.length;
        setCurrentTrack(prev);
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

        gsap.from('.hero-content > *', {
            y: 30,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power4.out"
        });

        const title = titleRef.current;
        if (title) {
            const text = "TRUTH B TOLD HUB";
            title.innerHTML = text.split('').map(char => `<span class="char inline-block select-none relative" data-text="${char === ' ' ? '&nbsp;' : char}">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
            
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

    const isUnlocked = user || isAscended;

    const LockedOverlay = ({ title }: { title: string }) => (
        <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl z-[40] flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/20 relative group">
                <div className="absolute inset-0 bg-white/5 rounded-full animate-ping opacity-20"></div>
                <Lock className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white glitch-text" data-text="PROTOCOL BREACH">PROTOCOL BREACH</h4>
                <p className="text-[8px] text-white/40 uppercase tracking-[0.2em] max-w-[200px]">Authentication required to decrypt {title}.</p>
            </div>
            <button 
                onClick={() => { playSfx('click'); setIsAuthModalOpen(true); }}
                onMouseEnter={() => playSfx('hover')}
                className="px-6 py-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-transform active:scale-95"
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
                    transition: border-color 0.5s ease, background 0.5s ease, transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
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
                .perspective-card { transform-style: preserve-3d; }
                .perspective-card:hover { transform: rotateX(1deg) rotateY(1deg) translateZ(5px); }
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

                .honor-ticker { animation: tickerScroll 40s linear infinite; }
                @keyframes tickerScroll {
                    from { transform: translateX(100%); }
                    to { transform: translateX(-100%); }
                }

                @keyframes glitch {
                    0% { transform: translate(0); }
                    20% { transform: translate(-2px, 2px); }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                    100% { transform: translate(0); }
                }

                .char:hover {
                    color: var(--aether-gold);
                    text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
                    transition: all 0.3s ease;
                }

                .screen-glitch {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 255, 255, 0.05);
                    z-index: 1000;
                    pointer-events: none;
                    animation: flash 0.1s steps(2) infinite;
                }
                @keyframes flash {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `}</style>
            
            <AnimatePresence>
                {isLoadingAi && <div className="screen-glitch opacity-20" />}
            </AnimatePresence>

            <div className="film-grain" />
            
            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* Global Nav */}
            <nav className="fixed top-0 w-full z-[100] px-4 md:px-12 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { playSfx('click'); router.push('/'); }}>
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="TBT" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out" />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="font-ritual text-lg md:text-xl tracking-[0.2em] font-black uppercase gold-shimmer group-hover:glitch-text" data-text="Truth B Told Hub">Truth B Told Hub</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[7px] font-mono text-white uppercase tracking-widest mt-0.5">Prophetic OS v1.1</span>
                                <div className="h-[1px] w-4 bg-white/20"></div>
                                <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest mt-0.5 animate-pulse">Alignment: {alignment}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-8 pointer-events-auto">
                    {user ? (
                        <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-xl hover:border-white/20 transition-all cursor-pointer" onClick={() => router.push('/self')}>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">{profile?.username || 'Prophet'}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-white/40 hover:text-white transition-colors"><LogOut className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => { playSfx('click'); setIsAuthModalOpen(true); }} onMouseEnter={() => playSfx('hover')} className="px-6 md:px-8 py-2.5 bg-white/5 border border-white/20 text-white rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all active:scale-95 shadow-xl">Initialize Protocol</button>
                    )}

                    <button onClick={() => openSupport('series')} onMouseEnter={() => playSfx('hover')} className="px-6 md:px-10 py-3 bg-white text-black rounded-full text-[10px] font-black tracking-[0.3em] uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-white/20 active:scale-95">Support the Vision</button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative h-[60dvh] flex flex-col items-center justify-center p-6 mt-12 md:mt-0 overflow-hidden">
                <div className="absolute inset-0">
                    <img src="/page-images/image-(8).png" alt="" className="w-full h-full object-cover opacity-25 grayscale" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.06)_0%,transparent_60%)]" />
                </div>
                <div className="hero-content relative z-10 text-center space-y-8 md:space-y-12 w-full max-w-[100vw]">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase">Restoration Protocol Initialized</span>
                    </div>
                    <div className="w-full overflow-hidden flex justify-center cursor-none px-4">
                        <h1 ref={titleRef} className="kinetic-title font-ritual text-[2.5rem] sm:text-6xl md:text-[10rem] font-black leading-[0.9] tracking-tighter text-white gold-shimmer uppercase select-none text-center break-words">TRUTH B TOLD HUB</h1>
                    </div>
                </div>
            </section>

            {/* MASTER BENTO GRID */}
            <LayoutGroup>
            <section id="master-bento" className="relative pb-48 px-4 md:px-12 max-w-[100rem] mx-auto">
                <motion.div layout={isMobile} className="grid grid-cols-2 md:grid-cols-12 auto-rows-[minmax(180px,_auto)] gap-6 md:gap-8">
                    
                    {/* Main Cinematic Feature */}
                    <motion.div 
                        layout={isMobile}
                        onClick={() => toggleExpand('main')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'main' ? 'row-span-3' : (isMobile ? 'col-span-2 row-span-1' : 'md:col-span-8 md:row-span-2')} liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group p-1 md:p-2 min-h-[350px] relative cursor-pointer`}
                    >
                        <div className="h-full relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <iframe className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000 scale-[1.01]" src="https://www.youtube.com/embed/jXezgcPBqGE?autoplay=0&controls=1&rel=0" allowFullScreen></iframe>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 flex justify-between items-end pointer-events-none z-30">
                                <h2 className="font-ritual text-2xl md:text-6xl font-black uppercase tracking-[0.1em] text-white">GENESIS 15:13</h2>
                                {isMobile && (expandedCard === 'main' ? <Minimize2 className="w-6 h-6 text-white/40" /> : <Maximize2 className="w-6 h-6 text-white/40" />)}
                            </div>
                        </div>
                    </motion.div>

                    {/* Global Archive (COMMUNITY CHAT) */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'chat' ? 'fixed inset-0 z-[150] rounded-none p-4 pb-24' : (isMobile ? 'col-span-1 row-span-2' : 'md:col-span-4 md:row-span-2')} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[450px] relative overflow-hidden group transition-all duration-500`}
                    >
                        {!isUnlocked && <LockedOverlay title="The Archive" />}
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all relative">
                                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-aether-gold rounded-full border-2 border-black animate-pulse"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Transmission Archive</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-aether-gold animate-ping"></span>
                                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Vault Online</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); playSfx('click'); setArchiveMode('chat'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${archiveMode === 'chat' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Frequency
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); playSfx('click'); setArchiveMode('vault'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${archiveMode === 'vault' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Vault
                                    </button>
                                </div>
                                {isMobile && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); playSfx('click'); toggleExpand('chat'); }}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-white"
                                    >
                                        {expandedCard === 'chat' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div 
                            ref={communityChatRef}
                            className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-6 pr-2 relative z-10"
                        >
                            {archiveMode === 'chat' ? (
                                communityMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                                        <Waves className="w-12 h-12 text-white animate-pulse" />
                                        <span className="text-[8px] font-mono uppercase tracking-[0.3em]">Awaiting Transmissions...</span>
                                    </div>
                                ) : communityMessages.map((msg, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={msg.id || i} 
                                        className="flex gap-4 group/msg"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover/msg:border-white/30 transition-all">
                                            {msg.author?.avatar_url ? <img src={msg.author.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white/20" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${msg.author?.aura_color === 'Architect' ? 'text-aether-gold' : 'text-white'}`}>
                                                    {msg.author?.username || 'Prophet'}
                                                </span>
                                                <span className="text-[6px] font-mono text-zinc-600 uppercase tracking-tighter">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="relative group/bubble max-w-[95%]">
                                                <p className="text-[11px] text-white/80 font-mono tracking-wide leading-relaxed bg-white/[0.03] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none group-hover/bubble:border-white/20 transition-all shadow-sm">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                                    {[
                                        { title: "The 400 Prelude", type: "Transmission", dur: "12:45", id: "XnWdy_B7PgA" },
                                        { title: "Genesis Decryption", type: "Historical", dur: "08:12", id: "jXezgcPBqGE" },
                                        { title: "The Sabean War", type: "Prophetic", dur: "15:30", id: "msKxh1gInMU" }
                                    ].map((v, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => window.open(`https://youtu.be/${v.id}`, '_blank')}
                                            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer group/video flex items-center gap-4"
                                        >
                                            <div className="w-20 aspect-video rounded-lg overflow-hidden relative">
                                                <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-full h-full object-cover grayscale group-hover/video:grayscale-0 transition-all" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Play className="w-4 h-4 text-white opacity-0 group-hover/video:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[10px] font-black uppercase text-white group-hover/video:text-aether-gold transition-colors">{v.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[7px] font-mono text-white/40 uppercase">{v.type}</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                    <span className="text-[7px] font-mono text-white/40 uppercase">{v.dur}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-white/10 group-hover/video:text-white transition-all group-hover/video:translate-x-1" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form 
                            onSubmit={handleCommunitySubmit} 
                            className={`relative z-20 ${isMobile && expandedCard === 'chat' ? 'fixed bottom-4 left-4 right-4' : ''}`} 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative group">
                                <input 
                                    value={communityInput} 
                                    onChange={(e) => setCommunityInput(e.target.value)} 
                                    disabled={!user} 
                                    placeholder={user ? "Transmit Echo..." : "Initialize Profile to Transmit"} 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl px-6 py-5 md:py-6 text-[12px] focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:text-zinc-600 tracking-widest uppercase text-white font-black disabled:opacity-30 shadow-2xl" 
                                />
                                <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-aether-gold/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"></div>
                                <button 
                                    type="submit" 
                                    disabled={!user || !communityInput?.trim()} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20 active:scale-95 shadow-xl"
                                >
                                    <Send className="w-4 h-4 md:w-5 md:h-5 text-black" />
                                </button>
                            </div>
                        </form>
                        
                        {/* Mobile Background Elements */}
                        {isMobile && expandedCard === 'chat' && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                                <div className="absolute top-[20%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-aether-gold/50 to-transparent rotate-12"></div>
                                <div className="absolute top-[40%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-6"></div>
                            </div>
                        )}
                    </motion.div>

                    {/* Prophetic AI Oracle (AI CHAT) */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'oracle' ? 'row-span-3' : (isMobile ? 'col-span-1 row-span-2' : 'md:col-span-4 md:row-span-2')} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent min-h-[450px] relative overflow-hidden group`}
                    >
                        {!isUnlocked && <LockedOverlay title="The Oracle" />}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all"><Terminal className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
                                <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">AI Oracle</span><span className="text-[7px] font-mono text-white uppercase tracking-widest">Decryptor</span></div>
                            </div>
                            {isMobile && (
                                <button 
                                    onClick={() => { playSfx('click'); toggleExpand('oracle'); }}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white"
                                >
                                    {expandedCard === 'oracle' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 hide-scrollbar mb-8 pr-2">
                            {aiMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <Terminal className="w-12 h-12 text-zinc-800 animate-pulse" />
                                    <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Awaiting query...</div>
                                </div>
                            ) : aiMessages.map((m: any, i: number) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                                    <div className={`max-w-[90%] px-6 py-4 rounded-3xl text-[11px] leading-relaxed tracking-wide ${m.role === 'user' ? 'bg-white/10 border border-white/20 text-white' : 'bg-aether-gold/10 border border-aether-gold/20 text-aether-gold font-black shadow-[0_0_20px_rgba(212,175,55,0.05)]'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {oracleError && (
                                <div className="absolute -top-12 left-0 right-0 p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-[8px] font-mono text-red-500 uppercase tracking-widest text-center animate-fade-in flex items-center justify-center gap-2">
                                    <ShieldAlert className="w-3 h-3" />
                                    {oracleError}
                                </div>
                            )}
                            <input 
                                value={aiInput} 
                                onChange={handleAiInputChange} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAiSubmit(e as any);
                                    }
                                }}
                                placeholder={isUnlocked ? "Query the Oracle..." : "Access Denied"}
                                disabled={!isUnlocked}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-[11px] focus:outline-none focus:border-white transition-all placeholder:text-zinc-500 tracking-widest uppercase text-white font-black disabled:opacity-20" 
                            />
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAiSubmit(e as any);
                                }}
                                disabled={isLoadingAi || !aiInput?.trim() || !isUnlocked} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-20 active:scale-95 z-10 shadow-lg"
                            >
                                {isLoadingAi ? <Loader2 className="w-4 h-4 text-black animate-spin" /> : <Send className="w-4 h-4 text-black" />}
                            </button>
                        </div>
                    </motion.div>

                    {/* SELF / PROFILE CARD */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => { playSfx('click'); router.push('/self'); }}
                        className={`bento-card col-span-1 ${isMobile && expandedCard === 'self' ? 'col-span-2 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[300px] relative overflow-hidden bg-gradient-to-br from-white/10 to-transparent cursor-pointer group`}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden group-hover:scale-110 transition-transform duration-500 relative">
                                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 md:w-8 md:h-8 text-white/20" />}
                                    {profile?.is_supporter && (
                                        <div className="absolute inset-0 border-2 border-aether-gold animate-pulse rounded-2xl pointer-events-none"></div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${profile?.aura_color === 'Architect' ? 'border-aether-gold/30 text-aether-gold' : 'border-white/20 text-white/40'}`}>
                                        {profile?.aura_color || 'Neutral'}
                                    </div>
                                    {profile?.is_supporter && (
                                        <span className="text-[7px] font-black text-aether-gold uppercase tracking-[0.2em] flex items-center gap-1">
                                            <ShieldCheck className="w-2 h-2" />
                                            Legacy Supporter
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-ritual text-xl md:text-2xl font-black uppercase text-white group-hover:gold-shimmer transition-all">{profile?.username || (user ? 'Authenticated Prophet' : 'Unknown Entity')}</h3>
                                    <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-black leading-relaxed">
                                        {profile?.bio || 'Initialize your soul profile to record your prophetic footprint.'}
                                    </p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-zinc-500">
                                            <span>Prophetic Alignment</span>
                                            <span className="text-white">{alignment}%</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${alignment}%` }} className="h-full bg-aether-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-zinc-500">
                                            <span>Soul Power</span>
                                            <span className="text-white">{profile?.is_supporter ? '400' : '0'} SP</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: profile?.is_supporter ? '100%' : '5%' }} className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-500">
                            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-aether-gold">{user ? 'Refine Identity' : 'Initialize Profile'}</span>
                            <ArrowRight className="w-3 h-3 text-aether-gold" />
                        </div>
                    </motion.div>

                    {/* THE POOL / TREASURY */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-1 ${isMobile && expandedCard === 'pool' ? 'col-span-2 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col justify-between border-white/10 perspective-card min-h-[300px] relative overflow-hidden bg-gradient-to-t from-white/5 to-transparent cursor-not-allowed group grayscale opacity-60`}
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-4">
                                <Lock className="w-5 h-5 text-white/40" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">The Pool</span>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">Protocol Offline</span>
                        </div>
                        <div className="space-y-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"><Wallet className="w-5 h-5 md:w-6 md:h-6 text-white/20" /></div>
                            <h3 className="font-ritual text-lg md:text-xl font-black uppercase text-white/40">The Pool</h3>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Mutual Aid Balance</span>
                                <span className="text-2xl font-ritual font-black text-white/20">$4,821</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20"><ArrowRight className="w-4 h-4" /></div>
                        </div>
                    </motion.div>

                    {/* Aether Player (HIGH GRADE) */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'player' ? 'row-span-3' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 flex flex-col justify-between border-white/10 perspective-card min-h-[400px] bg-gradient-to-br from-white/5 to-transparent relative group overflow-hidden`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <Waves className="w-64 h-64 text-white animate-pulse" />
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform"><Music className="w-6 h-6 text-white" /></div>
                                <div className="flex gap-1">
                                    {[...Array(8)].map((_, i) => (
                                        <motion.div 
                                            key={i}
                                            animate={{ height: isPlaying ? [10, 20, 10] : 10 }}
                                            transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, ease: "easeInOut" }}
                                            className="w-1 bg-aether-gold/40 rounded-full"
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <span className="text-[7px] font-mono text-aether-gold uppercase tracking-[0.4em] animate-pulse">Now Transmitting</span>
                                <h3 className="font-ritual text-2xl md:text-3xl font-black uppercase text-white leading-tight">{tracks[currentTrack].title}</h3>
                                <p className="text-white/40 text-[9px] uppercase font-mono tracking-widest">{tracks[currentTrack].genre}</p>
                            </div>
                        </div>

                        <div className="space-y-8 relative z-10">
                            {/* Seek Bar */}
                            <div className="space-y-3">
                                <div className="relative group/seek" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="range"
                                        min={0}
                                        max={duration || 0}
                                        value={currentTime}
                                        onChange={handleSeek}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-aether-gold transition-all relative z-30"
                                    />
                                    <div 
                                        className="absolute top-0 left-0 h-1 bg-white rounded-full pointer-events-none" 
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-widest">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={prevTrack} className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"><SkipBack className="w-5 h-5" /></button>
                                    <button onClick={toggleAudio} className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-transform">{isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}</button>
                                    <button onClick={nextTrack} className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"><SkipForward className="w-5 h-5" /></button>
                                </div>

                                <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl group/volume" onClick={(e) => e.stopPropagation()}>
                                    <Volume2 className="w-4 h-4 text-white/40" />
                                    <input 
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Global Pulse Terminal */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => toggleExpand('pulse')}
                        className={`bento-card col-span-1 ${isMobile && expandedCard === 'pulse' ? 'col-span-2 row-span-2' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 bg-black/60 min-h-[300px] overflow-hidden relative cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="Global Pulse" />}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"><Signal className="w-5 h-5 text-white animate-pulse" /></div>
                            <span className="text-[10px] font-black uppercase text-white">Pulse</span>
                        </div>
                        <div className="flex-1 space-y-3 font-mono text-[7px] overflow-hidden">
                            {pulseLog.slice(0, 8).map((log, i) => (
                                <div key={i} className="flex items-center gap-2 text-white/40 animate-fade-in"><span className="text-aether-gold">{'>'}</span><span className="uppercase truncate">{log}</span></div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Hardware Milestone */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => toggleExpand('hardware')}
                        className={`bento-card col-span-1 ${isMobile && expandedCard === 'hardware' ? 'col-span-2 row-span-3' : 'md:col-span-4'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 perspective-card bg-gradient-to-t from-white/5 to-transparent min-h-[350px] cursor-pointer group relative overflow-hidden`}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Cpu className="w-32 h-32 text-white" />
                        </div>
                        
                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform"><Cpu className="w-6 h-6 text-white" /></div>
                                <div className="flex flex-col">
                                    <h3 className="font-ritual text-lg md:text-xl font-black uppercase text-white leading-tight">Infrastructure Fueling</h3>
                                    <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest animate-pulse">Goal: $10,000</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                        <span className="text-white/40">Total Fueling Progress</span>
                                        <span className="text-white">$4,821 / $10,000</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            whileInView={{ width: '48.2%' }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="h-full bg-aether-gold shadow-[0_0_15px_#d4af37]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">Required Hardware & Labor</h4>
                                    {[
                                        { label: 'Producer & Production Costs', val: '$4,500' },
                                        { label: 'High-End AI Workstation', val: '$3,200' },
                                        { label: 'RTX 4090 Render Core', val: '$1,800' },
                                        { label: 'Studio Audio Monitoring', val: '$500' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                            <span className="text-[7px] font-mono text-white/60 uppercase">{item.label}</span>
                                            <span className="text-[9px] font-black text-white">{item.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openSupport('hardware'); }} 
                                className="w-full bg-white text-black py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Zap className="w-3 h-3 fill-current" />
                                Initiate Funding
                            </button>
                        </div>
                    </motion.div>

                    {/* The 400 Series (FEATURE CARD — ON PAUSE) */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => { playSfx('click'); openSupport('hardware'); }}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'series' ? 'col-span-2 row-span-3' : (isMobile ? 'col-span-2' : 'md:col-span-8 md:row-span-2')} liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 flex flex-col justify-between border-orange-500/20 group cursor-pointer relative overflow-hidden bg-gradient-to-br from-orange-500/5 to-transparent min-h-[350px]`}
                    >
                        <div className="absolute top-0 right-0 w-1/2 h-full opacity-15 group-hover:opacity-35 transition-all duration-1000 scale-110 group-hover:scale-100 pointer-events-none">
                            <img src="/viralcartel/400_manga_logo.jpg" alt="" className="w-full h-full object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-1000" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent pointer-events-none" />
                        
                        <div className="space-y-8 relative z-10">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 backdrop-blur-md">
                                <Pause className="w-3 h-3 text-orange-400" />
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-orange-400">Series On Pause</span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-ritual text-4xl md:text-7xl font-black uppercase text-white gold-shimmer group-hover:glitch-text" data-text="THE 400 SERIES">THE 400 SERIES</h3>
                                <p className="text-white/40 text-[9px] md:text-xs uppercase tracking-[0.2em] font-black max-w-md leading-relaxed">
                                    Production is <span className="text-orange-400">on pause</span> until we are fiscally solid. Support <span className="text-white">@truufbtold</span> &apos;Ant Cee&apos; to fuel infrastructure and resume the vision.
                                </p>
                            </div>
                            
                            <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                                <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">Preview Transmissions (YouTube)</h4>
                                <div className="space-y-3">
                                    {[
                                        { title: "400 - Genesis 15 | Opening Scene Preview", url: "https://www.youtube.com/watch?v=jXezgcPBqGE", thumb: "jXezgcPBqGE" },
                                        { title: "400 Years Series: The Prelude", url: "https://www.youtube.com/watch?v=XnWdy_B7PgA", thumb: "XnWdy_B7PgA" }
                                    ].map((vid, i) => (
                                        <a key={i} href={vid.url} target="_blank" onClick={(e) => e.stopPropagation()} className="flex items-center gap-4 group/vid p-3 rounded-xl hover:bg-white/10 transition-colors">
                                            <div className="w-16 aspect-video rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                                                <img src={`https://img.youtube.com/vi/${vid.thumb}/mqdefault.jpg`} alt="" className="w-full h-full object-cover grayscale group-hover/vid:grayscale-0 transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[10px] font-black text-white group-hover/vid:text-aether-gold transition-colors">{vid.title}</span>
                                                <span className="text-[7px] font-mono text-orange-400/60 uppercase">Preview Only</span>
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-white/20 group-hover/vid:translate-x-1 group-hover/vid:text-white transition-all" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
                            <div className="flex flex-col flex-1 max-w-xs">
                                <span className="text-[7px] font-mono text-orange-400 uppercase tracking-widest mb-2">Fiscal Foundation Required</span>
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-2">
                                    <span>Infrastructure Goal</span>
                                    <span className="text-white">$4,821 / $10,000</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400 w-[48.2%] shadow-[0_0_15px_rgba(251,146,60,0.5)]" />
                                </div>
                                <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-2">Resume production when goal is met</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); openSupport('hardware'); }}
                                className="px-8 py-4 bg-white text-black rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <Zap className="w-3 h-3 fill-current" />
                                Fuel the Mission
                            </button>
                        </div>
                    </motion.div>

                    {/* Cinematic Visual Archive */}
                    <motion.div
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile ? 'col-span-2' : 'md:col-span-12'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 border-white/10 relative overflow-hidden`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <Clapperboard className="w-5 h-5 text-aether-gold" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Cinematic Archive</span>
                            </div>
                            <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest">@truufbtold</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { src: '/cineworks/poster1.png', label: 'The Vision', sub: 'Prophetic Core' },
                                { src: '/cineworks/poster2.png', label: 'Sacred Ruins', sub: 'Ancient Protocol' },
                                { src: '/cineworks/poster3.png', label: 'Neural Synthesis', sub: 'Cineworks' },
                                { src: '/page-images/image-(6).png', label: 'Frequency Break', sub: 'Audio Vision' },
                            ].map((asset, i) => (
                                <div key={i} className="group/asset relative aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 hover:border-aether-gold/30 transition-all">
                                    <img src={asset.src} alt={asset.label} className="w-full h-full object-cover grayscale group-hover/asset:grayscale-0 group-hover/asset:scale-105 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <span className="block text-[8px] font-black uppercase text-white tracking-widest">{asset.label}</span>
                                        <span className="block text-[6px] font-mono text-aether-gold/70 uppercase tracking-widest">{asset.sub}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* The Prelude */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => toggleExpand('prelude')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'prelude' ? 'row-span-2' : (isMobile ? 'col-span-2' : 'md:col-span-4')} liquid-glass rounded-[2rem] md:rounded-[4rem] overflow-hidden group border-white/10 p-1 md:p-2 cursor-pointer relative`}
                    >
                         <div className="aspect-video relative rounded-[1.8rem] md:rounded-[3.5rem] overflow-hidden bg-black">
                            <img src="https://img.youtube.com/vi/XnWdy_B7PgA/maxresdefault.jpg" alt="The Prelude" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                            <iframe className="absolute inset-0 w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000" src="https://www.youtube.com/embed/XnWdy_B7PgA?autoplay=0&controls=0&rel=0" title="The Prelude"></iframe>
                            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-[7px] font-black uppercase tracking-widest text-orange-400 pointer-events-none">Preview</div>
                         </div>
                         <div className="p-6 md:p-8 flex items-center justify-between">
                            <h4 className="font-ritual text-xl font-black text-white group-hover:gold-shimmer transition-all">THE PRELUDE</h4>
                            <Video className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                         </div>
                    </motion.div>

                    {/* Vision Roadmap */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile ? 'col-span-2' : 'md:col-span-12'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 border-white/10 group relative overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(212,175,55,0.05)_0%,transparent_50%)]"></div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                            <div className="space-y-4 text-center md:text-left">
                                <h3 className="font-ritual text-2xl md:text-4xl font-black uppercase text-white gold-shimmer">Vision Roadmap</h3>
                                <p className="text-[9px] text-white/40 uppercase tracking-[0.4em] font-black">Phase 01: The Restoration</p>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                {[
                                    { step: '01', title: 'Fueling', status: 'In Progress', desc: 'Hardware & Production Funding' },
                                    { step: '02', title: 'Synthesis', status: 'On Pause', desc: 'Episode 01 Rendering & SFX' },
                                    { step: '03', title: 'Early Access', status: 'On Pause', desc: 'Beta Screening for Donors' },
                                    { step: '04', title: 'Premiere', status: 'On Pause', desc: 'Resumes when fiscally solid' }
                                ].map((milestone, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/20 transition-all group/step">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-ritual font-black text-aether-gold">{milestone.step}</span>
                                            <span className={`text-[6px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${milestone.status === 'In Progress' ? 'bg-aether-gold text-black' : milestone.status === 'On Pause' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/10 text-white/40'}`}>
                                                {milestone.status}
                                            </span>
                                        </div>
                                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-2">{milestone.title}</h4>
                                        <p className="text-[8px] text-white/40 uppercase leading-relaxed tracking-wide">{milestone.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Viral Cartel Artifact Collection */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        className={`bento-card col-span-2 ${isMobile ? 'col-span-2' : 'md:col-span-4 md:row-span-2'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 flex flex-col border-white/10 relative overflow-hidden group`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Viral Cartel</span>
                                    <span className="text-[7px] font-mono text-aether-gold uppercase tracking-widest">Sovereign Supply</span>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-[6px] font-black uppercase tracking-widest text-orange-500 animate-pulse">
                                Phase 01 Asset
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="aspect-square rounded-3xl overflow-hidden border border-white/10 relative group-hover:border-white/30 transition-all shadow-2xl bg-white/5">
                                    <img 
                                        src="/viralcartel/400_manga_logo.jpg" 
                                        alt="400 Ancestral Odyssey" 
                                        className="w-full h-full object-contain scale-110 group-hover:scale-100 transition-transform duration-1000 p-3" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="absolute bottom-3 left-3">
                                        <span className="block text-[7px] font-black uppercase text-white tracking-widest">400 Odyssey</span>
                                    </div>
                                </div>
                                <div className="aspect-square rounded-3xl overflow-hidden border border-white/10 relative group-hover:border-white/30 transition-all shadow-2xl bg-white/5">
                                    <img 
                                        src="/viralcartel/crown_of_sorrows.png" 
                                        alt="Crown of Sorrows" 
                                        className="w-full h-full object-contain scale-110 group-hover:scale-100 transition-transform duration-1000 p-3" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="absolute bottom-3 left-3">
                                        <span className="block text-[7px] font-black uppercase text-white tracking-widest">Cotton Crown</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <span className="block text-[10px] font-black uppercase text-white">400 Series Archival Supply</span>
                                        <span className="block text-[7px] font-mono text-white/40 uppercase tracking-tighter">Sovereign Artifacts</span>
                                    </div>
                                    <span className="text-xl font-ritual font-black text-white">$45</span>
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/40">
                                    <span>Protocol Status</span>
                                    <span className="text-aether-gold">Active Supply</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-aether-gold w-[85%] shadow-[0_0_10px_#d4af37]"></div>
                                </div>
                                <p className="text-[8px] text-white/40 uppercase leading-relaxed tracking-wide">
                                    Proceeds fuel Phase 01 Infrastructure, 4K Neural Rendering, and the permanent historical preservation of the 400 Series.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 relative z-50">
                            <a 
                                href="https://viralcartel.net" 
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { e.stopPropagation(); playSfx('click'); }}
                                className="w-full py-4 rounded-2xl bg-white text-black flex items-center justify-center gap-3 group/btn hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Acquire Artifact</span>
                                <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                            </a>
                        </div>
                    </motion.div>

                    {/* Historical Timeline */}
                    <motion.div 
                        layout={isMobile}
                        onMouseEnter={() => playSfx('hover')}
                        onClick={() => toggleExpand('timeline')}
                        className={`bento-card col-span-2 ${isMobile && expandedCard === 'timeline' ? 'row-span-2' : 'md:col-span-12'} liquid-glass rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between border-white/10 group gap-8 relative overflow-hidden cursor-pointer`}
                    >
                        {!isUnlocked && <LockedOverlay title="Timeline" />}
                        <div className="flex flex-col gap-4 text-center md:text-left relative z-10">
                            <div className="flex items-center justify-center md:justify-start gap-4 text-white"><History className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-[0.5em]">Cycle Protocol</span></div>
                            <h3 className="font-ritual text-2xl md:text-5xl font-black text-white gold-shimmer group-hover:glitch-text" data-text="ABRAHAM TO 2019">ABRAHAM TO 2019</h3>
                        </div>
                        <div className="flex items-center gap-6 md:gap-12 relative z-10">
                            {[2019, 1619, 'Gen'].map((year, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 group/year">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white group-hover/year:scale-150 transition-transform"></div>
                                    <span className="font-ritual text-lg md:text-2xl font-black text-white group-hover/year:text-aether-gold transition-colors">{year}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </motion.div>
                
                <div className="mt-12 w-full overflow-hidden border-y border-white/5 py-4 whitespace-nowrap group">
                    <div className="inline-block honor-ticker">
                        {['TRUUTHBTOLD NODE', 'PROPHETIC CORE ACTIVE', 'DIASPORA ARCHIVE UNLOCKED', 'GENESIS 15:13 VERIFIED', 'AETHER AUDIO SYNCED', 'MASTER BENTO DEPLOYED'].map((text, i) => (
                            <span key={i} className="mx-12 text-[9px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors cursor-default">{text}</span>
                        ))}
                    </div>
                </div>
            </section>
            </LayoutGroup>

            <footer className="py-24 border-t border-white/10 text-center space-y-12 bg-void relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.03)_0%,transparent_50%)] pointer-events-none"></div>
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="flex items-center gap-8 mb-4">
                        <a href="https://youtube.com/@truufbtold" target="_blank" className="text-white hover:text-aether-gold transition-all hover:scale-110 active:scale-95"><YoutubeIcon className="w-6 h-6" /></a>
                        <a href="https://tiktok.com/@truufbtold" target="_blank" className="text-white hover:text-aether-gold transition-all hover:scale-110 active:scale-95"><TikTokIcon className="w-6 h-6" /></a>
                    </div>
                    <p className="text-[10px] font-black tracking-[0.8em] text-white uppercase opacity-40 hover:opacity-100 transition-opacity cursor-default">Protocol A-25 • Truth B TOLD HUB • 2026 Edition</p>
                </div>
            </footer>

            {/* Support Overlay */}
            <AnimatePresence>
                {showSupportOverlay && (
                    <motion.div 
                        ref={overlayScrollRef}
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-[200] flex items-start justify-center p-4 md:p-12 bg-[#050505]/98 backdrop-blur-3xl overflow-y-auto scroll-smooth"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 40 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.9, y: 40 }} 
                            className="liquid-glass rounded-[3rem] md:rounded-[5rem] p-8 md:p-20 max-w-6xl w-full relative border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] my-auto"
                        >
                            <button 
                                onClick={() => { playSfx('click'); setShowSupportOverlay(false); }} 
                                className="absolute top-8 right-8 md:top-12 md:right-12 text-white/40 hover:text-white p-4 bg-white/5 rounded-full border border-white/10 transition-all active:scale-90 group z-50"
                            >
                                <Lock className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            </button>

                            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
                                {supportMode === 'series' ? (
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Tier Selection</h4>
                                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[40vh] md:max-h-none pr-2 hide-scrollbar">
                                            {[
                                                { tier: "$5", title: "The Echo Ticket", desc: "Single Premiere Access to Chapter 01 + Global Archive Access.", icon: <Eye className="w-4 h-4" /> },
                                                { tier: "$10", title: "The Frequency Bundle", desc: "Full '400' Digital Album + Permanent Chapter 01 Access.", icon: <Music className="w-4 h-4" />, best: true },
                                                { tier: "$25", title: "The Chronicle Pass", desc: "Digital Artifacts (Storyboards/Stills) + 72-Hour Early Access.", icon: <ScrollText className="w-4 h-4" /> },
                                                { tier: "$50", title: "The Oracle Status", desc: "Name in Credits + Oracle Chat Aura + Behind the Scenes Vault.", icon: <Star className="w-4 h-4" /> },
                                                { tier: "$100", title: "Founding Architect", desc: "Immortalization on Founding Wall + 20% Viral Cartel Discount.", icon: <ShieldCheck className="w-4 h-4" /> },
                                                { tier: "$400", title: "Prophetic Ancestor", desc: "Executive Producer Credit + Custom Cinematic Avatar Synthesis.", icon: <Sparkles className="w-4 h-4" /> }
                                            ].map((benefit, i) => (
                                                <div key={i} className={`flex gap-5 items-start p-5 rounded-3xl bg-white/5 border ${benefit.best ? 'border-aether-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-white/5'} hover:border-white/20 transition-all group/tier relative`}>
                                                    {benefit.best && <span className="absolute -top-2 -right-2 px-3 py-1 bg-aether-gold text-black text-[6px] font-black uppercase rounded-full">Best Value</span>}
                                                    <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 ${benefit.best ? 'text-aether-gold' : 'text-white/40'} group-hover/tier:scale-110 transition-transform`}>{benefit.icon}</div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-ritual font-black text-white">{benefit.tier}</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">{benefit.title}</span>
                                                        </div>
                                                        <span className="block text-[8px] text-white/40 uppercase tracking-widest leading-relaxed">{benefit.desc}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                                                <Cpu className="w-3 h-3 text-white" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white">Hardware Requirements</span>
                                            </div>
                                            <h2 className="font-ritual text-5xl md:text-8xl font-black uppercase text-white leading-none">INFRA-<br/>STRUCTURE</h2>
                                            <p className="text-white/60 text-xs md:text-sm font-medium leading-relaxed tracking-wide">
                                                To produce the "400 Series" at institutional cinematic quality, we must scale our physical and neural processing nodes.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Cost Justification</h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                {[
                                                    { icon: <User className="w-4 h-4" />, title: "Production & Labor ($4,500)", desc: "Covers historical research, narrative scripting, and high-fidelity voice orchestration." },
                                                    { icon: <Server className="w-4 h-4" />, title: "AI Workstation ($3,200)", desc: "Next-gen processing for real-time generative upscaling and 4K neural rendering." },
                                                    { icon: <Gpu className="w-4 h-4" />, title: "RTX 4090 Core ($1,800)", desc: "The essential hardware engine for parallel cinematic rendering of complex environments." },
                                                    { icon: <Volume2 className="w-4 h-4" />, title: "Studio Audio ($500)", desc: "Precision spatial monitoring for the Prophetic Frequency audio experience." }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex gap-5 items-start p-4 rounded-2xl bg-white/5 border border-white/5">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white">{item.icon}</div>
                                                        <div className="space-y-1">
                                                            <span className="block text-[10px] font-black uppercase tracking-widest text-white">{item.title}</span>
                                                            <span className="block text-[8px] text-white/40 uppercase tracking-widest leading-relaxed">{item.desc}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-10 p-8 md:p-12 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none"></div>
                                    
                                    <div className="text-center space-y-4 relative z-10">
                                        <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-8">
                                            <ShieldCheck className="w-10 h-10 text-black" />
                                        </div>
                                        <h3 className="text-xl font-ritual font-black text-white uppercase tracking-widest">Verify Contribution</h3>
                                        <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] leading-loose">
                                            To be recognized for your contribution and unlock your privileges, please type <span className="text-white font-black text-[12px] bg-white/10 px-2 py-1 rounded">"400"</span> in the <span className="text-white font-black">Referral / Support Code</span> section on Stripe.
                                        </p>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <a 
                                            href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01" 
                                            target="_blank" 
                                            onClick={() => playSfx('click')} 
                                            className="w-full flex items-center justify-center gap-4 py-6 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-transform active:scale-95 group"
                                        >
                                            Initialize Fueling
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                                        </a>
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-[1px] w-4 bg-white/10"></div>
                                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.5em]">Secure Gateway</span>
                                            <div className="h-[1px] w-4 bg-white/10"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Floating Community Chat FAB */}
            <div className="fixed bottom-8 right-8 z-[150] flex flex-col items-end gap-4">
                <AnimatePresence>
                    {isMobile && !expandedCard && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={() => { playSfx('click'); toggleExpand('pulse'); }}
                            className="w-14 h-14 rounded-full bg-aether-gold text-black flex items-center justify-center shadow-[0_0_30px_#d4af37] hover:scale-110 active:scale-95 transition-transform"
                        >
                            <MessageSquare className="w-6 h-6" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            <SupportVisionModal
                isOpen={showVisionModal}
                onClose={() => setShowVisionModal(false)}
                onSupport={() => openSupport('series')}
                playSfx={playSfx}
            />
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onSuccess={() => router.refresh()} 
            />
        </div>
    );
}

