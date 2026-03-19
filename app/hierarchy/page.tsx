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

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.1)_0%,transparent_60%)]"></div>
                <Hexagon className="w-16 h-16 text-orange-500/50 animate-spin-slow drop-shadow-[0_0_20px_rgba(234,88,12,0.5)]" />
                <h2 className="mt-8 font-ritual text-xl text-white tracking-[0.2em] animate-pulse">Synchronizing Ledger...</h2>
            </div>
        );
    }

    const topThree = profiles.slice(0, 3);
    const theRest = profiles.slice(3);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center relative overflow-hidden selection:bg-orange-500/30">
            {/* Parallax Background logic similar to Sanctum */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-600/10 rounded-full blur-[150px] mix-blend-screen opacity-30 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-mamba.png')] opacity-20 filter invert opacity-5"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-4xl z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-orange-500/20">
                <button onClick={() => router.push('/sanctum')} title="Back to Sanctum" aria-label="Back to Sanctum" className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-xl font-bold tracking-widest text-white leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                        THE HIERARCHY
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.3em] font-bold mt-1">
                        Global Ranking Ledger
                    </span>
                </div>
                <div className="w-6 h-6"></div> {/* Spacer for perfect centering */}
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
                                <div ref={podiumRef} className="flex flex-col md:flex-row justify-center items-end gap-6 md:gap-12 relative z-10 mx-auto max-w-4xl min-h-[350px]">
                                    
                                    {/* Rank 2 (Silver) */}
                                    {topThree[1] && (
                                        <div className="order-2 md:order-1 flex flex-col items-center transform md:translate-y-8 w-full md:w-64">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-1 bg-zinc-400/20 rounded-3xl blur opacity-70 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="glass bg-black/60 border border-zinc-400/30 p-6 rounded-3xl relative flex flex-col items-center text-center shadow-[0_0_30px_rgba(161,161,170,0.1)]">
                                                    <Medal className="w-8 h-8 text-zinc-300 absolute -top-4 bg-zinc-900 rounded-full p-1 border border-zinc-400/30" />
                                                    <div className="relative mb-4 mt-2">
                                                        {topThree[1].avatar_url ? (
                                                            <img src={topThree[1].avatar_url} className="w-20 h-20 rounded-full border-2 border-zinc-400 object-cover" alt="avatar"/>
                                                        ) : (
                                                            <GenerativeIdenticon idString={topThree[1].id} size={80} className="rounded-full border-2 border-zinc-400" />
                                                        )}
                                                    </div>
                                                    <h3 className="font-ritual text-xl text-white tracking-widest truncate w-full">{topThree[1].display_name || topThree[1].username}</h3>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-4">{topThree[1].custom_title || 'Initiate'}</p>
                                                    <div className="bg-zinc-800/50 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                                        <Zap className="w-4 h-4 text-orange-400" />
                                                        <span className="font-mono text-sm font-bold text-white">{topThree[1].soul_power} SP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 1 (Gold) */}
                                    {topThree[0] && (
                                        <div className="order-1 md:order-2 flex flex-col items-center z-20 w-full md:w-72 md:-translate-y-4">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-1 bg-yellow-500/30 rounded-3xl blur opacity-100 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                                                <div className="glass bg-black/80 border border-yellow-500/50 p-8 rounded-3xl relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] transform group-hover:-translate-y-2 transition-transform duration-500">
                                                    <Crown className="w-12 h-12 text-yellow-400 absolute -top-6 bg-yellow-950/80 rounded-full p-2 border border-yellow-500 drop-shadow-[0_0_10px_#facc15]" />
                                                    <div className="relative mb-4 mt-4">
                                                        {topThree[0].avatar_url ? (
                                                            <img src={topThree[0].avatar_url} className="w-28 h-28 rounded-full border-4 border-yellow-500 object-cover shadow-[0_0_20px_rgba(234,179,8,0.5)]" alt="avatar"/>
                                                        ) : (
                                                            <GenerativeIdenticon idString={topThree[0].id} size={112} className="rounded-full border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                                                        )}
                                                        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-bold text-xs uppercase tracking-widest px-2 py-1 rounded-md">#1</div>
                                                    </div>
                                                    <h3 className="font-ritual text-3xl text-yellow-400 tracking-widest truncate w-full drop-shadow-md">{topThree[0].display_name || topThree[0].username}</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/60 mb-6">{topThree[0].custom_title || 'Apex Architect'}</p>
                                                    <div className="bg-yellow-950/40 px-6 py-3 rounded-2xl flex items-center gap-3 border border-yellow-500/30 shadow-inner">
                                                        <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                                                        <span className="font-mono text-xl font-bold text-white tracking-widest">{topThree[0].soul_power} SP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 3 (Bronze) */}
                                    {topThree[2] && (
                                        <div className="order-3 flex flex-col items-center transform md:translate-y-12 w-full md:w-64">
                                            <div className="relative group w-full">
                                                <div className="absolute -inset-1 bg-amber-700/20 rounded-3xl blur opacity-70 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="glass bg-black/60 border border-amber-700/30 p-6 rounded-3xl relative flex flex-col items-center text-center shadow-[0_0_30px_rgba(180,83,9,0.1)]">
                                                    <Trophy className="w-8 h-8 text-amber-600 absolute -top-4 bg-amber-950 rounded-full p-1 border border-amber-700/30" />
                                                    <div className="relative mb-4 mt-2">
                                                        {topThree[2].avatar_url ? (
                                                            <img src={topThree[2].avatar_url} className="w-16 h-16 rounded-full border-2 border-amber-700 object-cover" alt="avatar"/>
                                                        ) : (
                                                            <GenerativeIdenticon idString={topThree[2].id} size={64} className="rounded-full border-2 border-amber-700" />
                                                        )}
                                                    </div>
                                                    <h3 className="font-ritual text-xl text-white tracking-widest truncate w-full">{topThree[2].display_name || topThree[2].username}</h3>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700/60 mb-4">{topThree[2].custom_title || 'Initiate'}</p>
                                                    <div className="bg-amber-950/20 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                                        <Zap className="w-4 h-4 text-orange-400" />
                                                        <span className="font-mono text-sm font-bold text-white">{topThree[2].soul_power} SP</span>
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
                            <div className="w-full max-w-3xl glass bg-black/40 border border-white/10 rounded-3xl p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4 px-2">
                                    <Cpu className="w-5 h-5 text-gray-500" />
                                    <h3 className="font-ritual text-lg text-gray-400 tracking-widest uppercase">The Collective</h3>
                                </div>
                                <div ref={listRef} className="space-y-3">
                                    {theRest.map((profile, idx) => {
                                        const globalRank = idx + 4;
                                        const isCurrentUser = userAuth?.id === profile.id;

                                        return (
                                            <div 
                                                key={profile.id}
                                                className={`flex items-center justify-between p-3 md:p-4 rounded-xl transition-all ${isCurrentUser ? 'bg-orange-950/20 border border-orange-500/30 shadow-[0_0_15px_rgba(234,88,12,0.1)]' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 font-mono text-xs font-bold text-center ${isCurrentUser ? 'text-orange-500' : 'text-gray-500'}`}>
                                                        #{globalRank}
                                                    </div>
                                                    <div className="relative">
                                                        {profile.avatar_url ? (
                                                            <img src={profile.avatar_url} className={`w-10 h-10 rounded-full object-cover border border-white/10 ${isCurrentUser ? 'border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.3)]' : ''}`} alt="avatar"/>
                                                        ) : (
                                                            <GenerativeIdenticon idString={profile.id} size={40} className={`rounded-full border border-white/10 ${isCurrentUser ? 'border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.3)]' : ''}`} />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold font-mono text-sm tracking-wider ${isCurrentUser ? 'text-orange-100' : 'text-zinc-200'}`}>
                                                            {profile.display_name || profile.username || 'Anonymous'}
                                                        </span>
                                                        <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                                                            {profile.custom_title || 'Initiate'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                    <span className={`font-mono text-xs md:text-sm font-bold ${isCurrentUser ? 'text-orange-400' : 'text-white'}`}>
                                                        {profile.soul_power}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 tracking-widest font-bold">SP</span>
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
