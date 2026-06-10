'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, ArrowLeft, Trophy, Crown, Medal, Hexagon, Zap, ShieldAlert, Cpu, Flame } from 'lucide-react';
import GenerativeIdenticon from '@/components/GenerativeIdenticon';
import gsap from 'gsap';

export default function HierarchyPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userAuth, setUserAuth] = useState<any>(null);

    const podiumRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/');
                return;
            }
            setUserAuth(session.user);

            // Fetch Top 100 Profiles ranked by Soul Power
            const { data } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, theme_color, custom_title, tier, soul_power')
                .gt('soul_power', 0)
                .order('soul_power', { ascending: false })
                .limit(100);

            if (data) {
                setProfiles(data);
            }
            setLoading(false);
        };
        checkAuthAndFetch();
    }, [router]);

    // Animations
    useEffect(() => {
        if (!loading && podiumRef.current) {
            gsap.fromTo(
                podiumRef.current.children,
                { y: 50, opacity: 0, scale: 0.9 },
                { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.2, ease: "back.out(1.5)" }
            );
        }
        if (!loading && listRef.current) {
            gsap.fromTo(
                listRef.current.children,
                { x: -20, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out", delay: 0.5 }
            );
        }
    }, [loading]);

    const getThemeColorClass = (theme: string) => {
        switch (theme) {
            case 'orange': return 'text-orange-500 border-orange-500/50 shadow-[0_0_15px_rgba(234,88,12,0.3)]';
            case 'purple': return 'text-purple-500 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
            case 'green': return 'text-green-500 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
            case 'red': return 'text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
            case 'sky':
            default: return 'text-sky-500 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)]';
        }
    };

    // GSAP Magnetic Button Effect
    const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
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

    if (loading) {
        return (
            <div className="min-h-screen bg-void flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05)_0%,transparent_60%)]"></div>
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-2 border-aether-gold/20 rounded-full animate-ping" />
                    <Hexagon className="w-16 h-16 text-aether-gold animate-spin-slow drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
                </div>
                <h2 className="mt-12 font-ritual text-xl text-white tracking-[0.4em] animate-pulse gold-shimmer uppercase">Synchronizing Sovereign Ledger...</h2>
            </div>
        );
    }

    const topThree = profiles.slice(0, 3);
    const theRest = profiles.slice(3);

    return (
        <div className="min-h-screen bg-void text-white flex flex-col items-center relative overflow-hidden selection:bg-aether-gold/30">
            {/* Background Texture & Overlays */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.03)_0%,transparent_50%)]" />
            </div>

            {/* Global Navigation Header - Aetheric */}
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center w-full">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/')} 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="p-3 bg-white/5 rounded-full border border-white/5 text-zinc-500 hover:text-white transition-colors"
                        title="Back to Sanctuary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-ritual text-xl font-bold tracking-[0.2em] leading-none text-white gold-shimmer">
                            SOVEREIGN LEDGER
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center h-2 gap-[1px]">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s`, width: '1.5px' }} />
                                ))}
                            </div>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Global Ranking: Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocol Active</span>
                        <span className="text-[10px] font-mono text-aether-gold uppercase tracking-widest">v2.5.4 Deployment</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl relative z-10 p-4 md:p-8 overflow-y-auto pb-32 flex flex-col items-center">
                
                {profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-32 glass bg-white/5 p-12 rounded-3xl border border-white/10 text-center">
                        <ShieldAlert className="w-16 h-16 text-zinc-600 mb-6" />
                        <h2 className="font-ritual text-3xl tracking-widest text-zinc-500">THE LEDGER IS EMPTY</h2>
                        <p className="font-mono text-xs uppercase tracking-widest text-zinc-600 mt-4 max-w-sm">No initiates have accumulated Soul Power. The Hierarchy awaits its prime architects.</p>
                    </div>
                ) : (
                    <>
                        {/* The Podium / Top 3 */}
                        {topThree.length > 0 && (
                            <div className="w-full mb-16 relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent blur-3xl rounded-full"></div>
                                <div ref={podiumRef} className="flex flex-col md:flex-row justify-center items-center md:items-end gap-8 md:gap-12 relative z-10 mx-auto max-w-5xl min-h-[450px] px-4">
                                    
                                    {/* Rank 2 (Silver) */}
                                    {topThree[1] && (
                                        <div className="order-2 md:order-1 flex flex-col items-center transform md:translate-y-12 w-full md:w-80">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-1 bg-zinc-400/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                <div onClick={() => router.push('/profiles/' + topThree[1].id)} className="glass-panel rounded-[3rem] p-10 relative flex flex-col items-center text-center border-zinc-400/20 cursor-pointer hover:border-zinc-400/50 hover:bg-white/[0.01] transition-all">
                                                    <div className="w-10 h-10 bg-zinc-400/20 text-zinc-300 rounded-full flex items-center justify-center border border-zinc-400/30 absolute -top-5 font-black text-xs">2</div>
                                                    <div className="relative mb-8">
                                                        <div className="w-24 h-24 rounded-full border-2 border-zinc-400/30 p-1 group-hover:border-zinc-400 transition-colors duration-500">
                                                            {topThree[1].avatar_url ? (
                                                                <img src={topThree[1].avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar"/>
                                                            ) : (
                                                                <GenerativeIdenticon idString={topThree[1].id} size={88} className="rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-ritual text-xl text-white tracking-[0.2em] truncate w-full uppercase">{topThree[1].display_name || topThree[1].username}</h3>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6 mt-2">{topThree[1].custom_title || 'Initiate'}</p>
                                                    <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                                                        <Zap className="w-3.5 h-3.5 text-zinc-400" />
                                                        <span className="font-mono text-sm font-black text-white">{topThree[1].soul_power} SP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 1 (Gold) */}
                                    {topThree[0] && (
                                        <div className="order-1 md:order-2 flex flex-col items-center z-20 w-full md:w-96">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-2 bg-aether-gold/10 rounded-[4rem] blur-[50px] opacity-100 animate-pulse-slow"></div>
                                                <div onClick={() => router.push('/profiles/' + topThree[0].id)} className="glass-panel rounded-[4rem] p-12 relative flex flex-col items-center text-center border-aether-gold/30 shadow-[0_0_100px_rgba(212,175,55,0.1)] cursor-pointer hover:border-aether-gold/50 hover:bg-white/[0.01] transition-all">
                                                    <div className="w-14 h-14 bg-aether-gold text-black rounded-full flex items-center justify-center border-4 border-black absolute -top-7 shadow-2xl">
                                                        <Crown className="w-7 h-7" />
                                                    </div>
                                                    <div className="relative mb-8 mt-4">
                                                        <div className="w-32 h-32 rounded-full border-4 border-aether-gold p-1 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                                                            {topThree[0].avatar_url ? (
                                                                <img src={topThree[0].avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar"/>
                                                            ) : (
                                                                <GenerativeIdenticon idString={topThree[0].id} size={120} className="rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-ritual text-3xl text-white tracking-[0.2em] truncate w-full uppercase gold-shimmer">{topThree[0].display_name || topThree[0].username}</h3>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-aether-gold/80 mb-8 mt-2">{topThree[0].custom_title || 'Apex Architect'}</p>
                                                    <div className="px-10 py-4 bg-white text-black rounded-2xl flex items-center gap-4 shadow-2xl">
                                                        <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                                                        <span className="font-mono text-2xl font-black tracking-widest">{topThree[0].soul_power} SP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 3 (Bronze) */}
                                    {topThree[2] && (
                                        <div className="order-3 flex flex-col items-center transform md:translate-y-16 w-full md:w-80">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-1 bg-amber-700/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                <div onClick={() => router.push('/profiles/' + topThree[2].id)} className="glass-panel rounded-[3rem] p-10 relative flex flex-col items-center text-center border-amber-700/20 cursor-pointer hover:border-amber-700/50 hover:bg-white/[0.01] transition-all">
                                                    <div className="w-10 h-10 bg-amber-700/20 text-amber-500 rounded-full flex items-center justify-center border border-amber-700/30 absolute -top-5 font-black text-xs">3</div>
                                                    <div className="relative mb-8">
                                                        <div className="w-20 h-20 rounded-full border-2 border-amber-700/30 p-1 group-hover:border-amber-700 transition-colors duration-500">
                                                            {topThree[2].avatar_url ? (
                                                                <img src={topThree[2].avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar"/>
                                                            ) : (
                                                                <GenerativeIdenticon idString={topThree[2].id} size={72} className="rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-ritual text-xl text-white tracking-[0.2em] truncate w-full uppercase">{topThree[2].display_name || topThree[2].username}</h3>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600/60 mb-6 mt-2">{topThree[2].custom_title || 'Initiate'}</p>
                                                    <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                                                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                                                        <span className="font-mono text-sm font-black text-white">{topThree[2].soul_power} SP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {/* The Rest (4 - 100) */}
                        {theRest.length > 0 && (
                            <div className="w-full max-w-4xl mt-24">
                                <div className="flex items-center gap-6 mb-12 px-6">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                    <h3 className="font-ritual text-[10px] text-zinc-500 tracking-[0.5em] uppercase">The Collective Ledger</h3>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                </div>
                                <div ref={listRef} className="space-y-4 px-4">
                                    {theRest.map((profile, idx) => {
                                        const globalRank = idx + 4;
                                        const isCurrentUser = userAuth?.id === profile.id;

                                        return (
                                            <div 
                                                key={profile.id}
                                                onClick={() => router.push('/profiles/' + profile.id)}
                                                className={`flex items-center justify-between p-4 md:p-6 rounded-3xl transition-all glass-panel border-white/5 cursor-pointer ${isCurrentUser ? 'border-aether-gold/40 bg-aether-gold/5 shadow-[0_0_30px_rgba(212,175,55,0.05)]' : 'hover:bg-white/5 hover:border-white/10 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3 md:gap-8 min-w-0">
                                                    <div className={`w-6 md:w-12 font-mono text-xs font-black text-center ${isCurrentUser ? 'text-aether-gold' : 'text-zinc-600'} shrink-0`}>
                                                        #{globalRank}
                                                    </div>
                                                    <div className="relative">
                                                        <div className={`w-12 h-12 rounded-full p-0.5 border ${isCurrentUser ? 'border-aether-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-white/10'}`}>
                                                            {profile.avatar_url ? (
                                                                <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar"/>
                                                            ) : (
                                                                <GenerativeIdenticon idString={profile.id} size={44} className="rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-ritual text-sm tracking-[0.2em] uppercase ${isCurrentUser ? 'text-aether-gold' : 'text-zinc-200'}`}>
                                                            {profile.display_name || profile.username || 'Anonymous'}
                                                        </span>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-1">
                                                            {profile.custom_title || 'Initiate'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 px-6 py-2 bg-black/40 rounded-2xl border border-white/5">
                                                    <span className={`font-mono text-sm font-black ${isCurrentUser ? 'text-aether-gold' : 'text-white'}`}>
                                                        {profile.soul_power}
                                                    </span>
                                                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">SP</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
