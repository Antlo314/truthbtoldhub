'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { presenceLabel } from '@/lib/archive/access';
import { ArrowLeft, User, Zap, Trophy, History, ArrowUpRight, ArrowDownLeft, Sparkles, Hexagon, ShieldCheck, Mail, Calendar, MessageSquare, Link as LinkIcon, MapPin, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Howl } from 'howler';

let uiHoverSfx: any = null;
let uiClickSfx: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function ProfileDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [globalRank, setGlobalRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [meId, setMeId] = useState<string | null>(null);
    const [whispering, setWhispering] = useState(false);

    const { setActiveWorkspaceId, setActiveDmId, upsertDmConversation } = useArchiveStore();

    const bgRef = useRef<HTMLDivElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    // GSAP Parallax Background
    useGSAP(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            gsap.to(bgRef.current, { x, y, duration: 1.5, ease: "power2.out" });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (!id) return;

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // Check if user is logged in first
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/');
                    return;
                }
                setMeId(session.user.id);

                // Fetch profile
                const { data: profData, error: profErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (profErr || !profData) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                setProfile(profData);

                // Fetch global rank
                if (profData.soul_power > 0) {
                    const { count } = await supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .gt('soul_power', profData.soul_power);
                    setGlobalRank((count || 0) + 1);
                } else {
                    setGlobalRank(null);
                }

                // Fetch transactions
                const { data: txs, error: txsErr } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('profile_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!txsErr && txs) {
                    setTransactions(txs);
                }

            } catch (err) {
                console.error("Error fetching public profile details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [id, router]);

    // Dynamic theming config based on profile's theme_color / aura_color
    const getThemeConfig = (theme: string) => {
        const t = theme?.toLowerCase();
        switch (t) {
            case 'orange':
            case 'ember':
                return {
                    text: 'text-orange-400',
                    border: 'border-orange-500/20 hover:border-orange-500/40',
                    glow: 'shadow-[0_0_50px_rgba(234,88,12,0.15)]',
                    glowText: 'shadow-orange-500/30',
                    bgGlow: 'bg-orange-500/5',
                    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    accentColor: '#ea580c',
                    radialGlow: 'from-orange-500/5'
                };
            case 'purple':
            case 'void':
                return {
                    text: 'text-purple-400',
                    border: 'border-purple-500/20 hover:border-purple-500/40',
                    glow: 'shadow-[0_0_50px_rgba(168,85,247,0.15)]',
                    glowText: 'shadow-purple-500/30',
                    bgGlow: 'bg-purple-500/5',
                    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    accentColor: '#a855f7',
                    radialGlow: 'from-purple-500/5'
                };
            case 'green':
            case 'matrix':
                return {
                    text: 'text-green-400',
                    border: 'border-green-500/20 hover:border-green-500/40',
                    glow: 'shadow-[0_0_50px_rgba(34,197,94,0.15)]',
                    glowText: 'shadow-green-500/30',
                    bgGlow: 'bg-green-500/5',
                    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
                    accentColor: '#22c55e',
                    radialGlow: 'from-green-500/5'
                };
            case 'red':
            case 'blood':
                return {
                    text: 'text-red-400',
                    border: 'border-red-500/20 hover:border-red-500/40',
                    glow: 'shadow-[0_0_50px_rgba(239,68,68,0.15)]',
                    glowText: 'shadow-red-500/30',
                    bgGlow: 'bg-red-500/5',
                    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
                    accentColor: '#ef4444',
                    radialGlow: 'from-red-500/5'
                };
            case 'sky':
            default:
                return {
                    text: 'text-sky-400',
                    border: 'border-sky-500/20 hover:border-sky-500/40',
                    glow: 'shadow-[0_0_50px_rgba(14,165,233,0.15)]',
                    glowText: 'shadow-sky-500/30',
                    bgGlow: 'bg-sky-500/5',
                    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                    accentColor: '#0ea5e9',
                    radialGlow: 'from-sky-500/5'
                };
        }
    };

    const startWhisper = async () => {
        if (!profile || meId === id) return;
        setWhispering(true);
        try {
            const { data: convId, error } = await supabase.rpc('start_dm', { _other: id });
            if (error) throw error;
            upsertDmConversation({
                id: convId, user_lo: '', user_hi: '',
                created_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
                other: {
                    id,
                    display_name: profile.display_name || profile.username || 'Soul',
                    avatar_url: profile.avatar_url,
                    tier: profile.tier,
                    status: profile.status,
                    last_seen_at: profile.last_seen_at,
                },
                unread: 0,
            });
            setActiveWorkspaceId(null);
            setActiveDmId(convId);
            router.push('/archive');
        } catch (e) {
            console.error('whisper failed', e);
            setWhispering(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-void flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05)_0%,transparent_60%)]"></div>
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-2 border-aether-gold/20 rounded-full animate-ping" />
                    <Hexagon className="w-16 h-16 text-aether-gold animate-spin-slow drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
                </div>
                <h2 className="mt-12 font-mono text-[9px] text-zinc-500 tracking-[0.4em] animate-pulse uppercase">Dematerializing Soul Coordinates...</h2>
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.05)_0%,transparent_60%)]" />
                <div className="w-16 h-16 rounded-full border border-red-500/20 flex items-center justify-center text-red-500 mb-6 animate-pulse">
                    <Hexagon className="w-8 h-8" />
                </div>
                <h2 className="font-ritual text-2xl text-white tracking-widest uppercase">Coordinates Lost</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mt-4 max-w-sm">This soul identifier does not correspond to any registered ledger entry within the Sanctum.</p>
                <button 
                    onClick={() => { playClick(); router.push('/hierarchy'); }}
                    className="mt-8 px-8 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                    Return to Hierarchy
                </button>
            </div>
        );
    }

    const theme = getThemeConfig(profile.theme_color || 'sky');
    const avatarUrl = profile.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + profile.id;
    const isArchitect = profile.tier === 'Architect';
    const lastSeen = profile.last_seen_at as string | undefined;
    const isOnline = !!lastSeen && (Date.now() - new Date(lastSeen).getTime() < 2 * 60000);
    const profileLinks: { label: string; url: string }[] = Array.isArray(profile.links) ? profile.links : [];
    const canWhisper = !!meId && meId !== id;

    return (
        <div className="relative min-h-screen bg-void text-white selection:bg-aether-gold/30 font-sans flex flex-col overflow-x-hidden">
            {/* Film Grain */}
            <div className="film-grain" />

            {/* Parallax Background Glow */}
            <div ref={bgRef} className="fixed inset-0 z-0 scale-110 pointer-events-none opacity-50">
                <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,${theme.accentColor}10_0%,transparent_50%)]`} />
            </div>

            {/* Navigation Header */}
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 md:px-6 py-4 flex justify-between items-center w-full">
                <div className="flex items-center gap-4 md:gap-6">
                    <button 
                        onClick={() => { playClick(); router.push('/hierarchy'); }} 
                        onMouseEnter={playHover}
                        className="p-2.5 bg-white/5 rounded-full border border-white/5 text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-ritual text-lg md:text-xl font-bold tracking-[0.2em] leading-none text-white gold-shimmer uppercase">
                            Soul Profile
                        </span>
                        <span className="text-[6px] md:text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Aetheric Coordinates: Synchronized</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    <div className={`px-3 md:px-4 py-1.5 bg-black/40 border ${profile.tier === 'Architect' ? 'border-red-500/30' : 'border-aether-gold/20'} rounded-full flex items-center gap-2`}>
                        <Zap className={`w-3 h-3 ${profile.tier === 'Architect' ? 'text-red-500' : 'text-aether-gold'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${profile.tier === 'Architect' ? 'text-red-400' : 'text-aether-gold'}`}>
                            {profile.soul_power} SP
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto w-full animate-fade-in space-y-8">

                {/* Profile Banner */}
                {profile.banner_url && (
                    <div className="relative h-40 md:h-56 rounded-[2rem] overflow-hidden border border-white/5">
                        <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
                    </div>
                )}

                {/* Main Profile Identity Card */}
                <div className={`glass-panel rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden border-white/5 transition-all ${theme.glow}`}>
                    <div className={`absolute top-0 right-0 w-64 md:w-80 h-64 md:h-80 bg-[radial-gradient(circle_at_center,${theme.accentColor}08_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none`}></div>
                    
                    <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12 relative z-10">
                        {/* Avatar display with glowing theme boundary */}
                        <div 
                            className="w-28 h-28 md:w-36 md:h-36 rounded-[1.8rem] md:rounded-[2.5rem] bg-zinc-900 border flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden group transition-colors"
                            style={{ borderColor: `${theme.accentColor}4d` }} // 30% opacity
                        >
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[1.5rem] md:rounded-[2.2rem]" />
                            <div 
                                className="absolute -inset-0.5 rounded-[1.8rem] md:rounded-[2.5rem] opacity-30 group-hover:scale-105 transition-transform" 
                                style={{ backgroundImage: `linear-gradient(to top right, ${theme.accentColor}1a, transparent)` }}
                            />
                        </div>

                        <div className="flex-1 text-center lg:text-left space-y-4">
                            <div className="flex flex-col lg:flex-row items-center gap-3 md:gap-4 justify-center lg:justify-start">
                                <h1 className="font-ritual text-3xl md:text-4xl font-black tracking-widest text-white uppercase gold-shimmer">{profile.display_name || profile.username}</h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border ${isArchitect ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-aether-gold/10 text-aether-gold border-aether-gold/20'}`}>
                                        {profile.tier || 'Initiate'}
                                    </span>
                                    {profile.is_supporter && (
                                        <span title="Supporter" className="text-aether-gold"><Crown className="w-4 h-4" /></span>
                                    )}
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-zinc-600'}`} />
                                        <span className="text-[7px] md:text-[8px] font-mono uppercase tracking-widest text-zinc-400">{presenceLabel(isOnline, lastSeen)}</span>
                                    </span>
                                </div>
                            </div>

                            {profile.status && (
                                <p className="text-sm text-zinc-300 italic max-w-lg">“{profile.status}”</p>
                            )}

                            <p className="text-[10px] md:text-xs text-zinc-400 font-mono tracking-[0.2em] leading-relaxed uppercase opacity-90 max-w-lg">
                                {profile.custom_title && <span className="block text-aether-gold font-black mb-1.5">{profile.custom_title}</span>}
                                <span className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-zinc-500 mt-1">
                                    {profile.pronouns && <span className="normal-case tracking-normal">{profile.pronouns}</span>}
                                    {profile.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {profile.location}</span>}
                                    {profile.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {profile.email}</span>}
                                </span>
                            </p>

                            {profileLinks.length > 0 && (
                                <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                                    {profileLinks.slice(0, 6).map((l, i) => (
                                        <a
                                            key={i}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono uppercase tracking-widest text-zinc-300 hover:border-aether-gold/40 hover:text-aether-gold transition-colors"
                                        >
                                            <LinkIcon className="w-3 h-3" /> {l.label || 'link'}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {canWhisper && (
                                <button
                                    onClick={() => { playClick(); startWhisper(); }}
                                    onMouseEnter={playHover}
                                    disabled={whispering}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-aether-gold text-black font-black text-[10px] uppercase tracking-widest hover:bg-aether-gold-soft transition-colors disabled:opacity-50"
                                >
                                    <MessageSquare className="w-4 h-4" /> {whispering ? 'Opening…' : 'Send a Whisper'}
                                </button>
                            )}

                            <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-6 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center border"
                                        style={{ 
                                            backgroundColor: `${theme.accentColor}1a`, // 10% opacity in hex
                                            borderColor: `${theme.accentColor}33`     // 20% opacity in hex
                                        }}
                                    >
                                        <Zap className={`w-4 h-4 ${theme.text}`} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[6px] md:text-[7px] font-black text-zinc-500 uppercase tracking-widest">Soul Power</span>
                                        <span className="text-xs md:text-sm font-black text-white tracking-widest uppercase">{profile.soul_power || 0} SP</span>
                                    </div>
                                </div>
                                
                                {globalRank !== null && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                            <Trophy className="w-4 h-4 text-aether-gold" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[6px] md:text-[7px] font-black text-zinc-500 uppercase tracking-widest">Global Rank</span>
                                            <span className="text-xs md:text-sm font-black text-aether-gold tracking-widest uppercase">#{globalRank}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <Calendar className="w-4 h-4 text-zinc-400" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[6px] md:text-[7px] font-black text-zinc-500 uppercase tracking-widest">Created At</span>
                                        <span className="text-xs md:text-sm font-black text-zinc-400 tracking-widest uppercase">
                                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'UNKNOWN'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extensive Bio & Transaction history sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Biography scroll container */}
                    <div className={`glass bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6 flex flex-col justify-between ${theme.glow}`}>
                        <div className="space-y-4">
                            <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-black flex items-center gap-2 border-b border-white/5 pb-4">
                                <User className={`w-4 h-4 ${theme.text}`} /> Soul Chronicle (Bio)
                            </h3>
                            <div className="relative py-2 pl-4 border-l border-zinc-800">
                                <p className="text-[11px] md:text-xs text-zinc-300 font-mono tracking-widest leading-relaxed uppercase whitespace-pre-wrap">
                                    {profile.bio || "This Initiate has not yet recorded their chronicle in the ledger records of the Sanctum. Their purpose remains hidden in the void."}
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-zinc-500 text-[8px] font-mono uppercase tracking-widest">
                            <span>Signature node: aligned</span>
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Secure ledger entry</span>
                        </div>
                    </div>

                    {/* Transaction logs */}
                    <div className="glass bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-black flex items-center gap-2">
                                <History className={`w-4 h-4 ${theme.text}`} /> Transaction Ledger
                            </h3>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Archival Sync</span>
                        </div>

                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                            {transactions.length === 0 ? (
                                <div className="text-center py-12 text-[9px] uppercase font-mono tracking-widest text-zinc-600">
                                    No transaction logs detected for this signature.
                                </div>
                            ) : (
                                transactions.map((tx) => {
                                    const isPositive = tx.amount > 0;
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} border border-current opacity-60`}>
                                                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-white uppercase tracking-wider">{tx.transaction_type}</h4>
                                                    <p className="text-[8px] text-zinc-500 font-mono tracking-tighter truncate max-w-[150px]">{tx.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-xs font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                    {isPositive ? '+' : ''}{tx.amount} SP
                                                </span>
                                                <span className="block text-[6px] text-zinc-600 font-mono mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
