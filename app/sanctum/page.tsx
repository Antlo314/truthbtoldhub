'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, ChevronRight, LogOut, Clapperboard, Compass, Cpu, Trophy, Star, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import SentinelGuide, { GuideStep } from '@/components/guide/SentinelGuide';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let uiClickSfx: any = null;
let ambientDrone: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function SanctumHub() {
    const router = useRouter();
    const { user, profile, fetchIdentity, signOut: storeSignOut } = useSoulStore();

    const [broadcastMsg, setBroadcastMsg] = useState('The aetheric architecture is stabilizing...');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const bgRef = useRef<HTMLDivElement>(null);

    const SANCTUM_PROTOCOL_STEPS: GuideStep[] = [
        {
            title: "Sector 1: The Pool",
            description: "The collective treasury. Here, Initiates lodge petitions for mutual aid or pledge Soul Power to fund celestial upgrades.",
            selector: "#sanctum-pool"
        },
        {
            title: "Sector 2: The Archive",
            description: "The permanent encrypted ledger. Burn SP to decrypt prophetic whispers left by those who walked the sanctuary before you.",
            selector: "#sanctum-archive"
        },
        {
            title: "Sector 3: The Gallery",
            description: "Cinematic architecture rendered in 8K. Monitor transmissions from the Aether and boost signals to the collective.",
            selector: "#sanctum-gallery"
        },
        {
            title: "Sector 4: The Trial",
            description: "The proving grounds. A secure sandbox for testing encrypted sequences and proving your alignment with the sanctuary.",
            selector: "#sanctum-trial"
        },
        {
            title: "The Soul Matrix",
            description: "Your digital fingerprint. Monitor your SP reserves, Identity Tier, and Global Rank from the Identity Core.",
            selector: "#tour-profile-btn"
        }
    ];

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    // GSAP Parallax Background
    useGSAP(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = (e.clientY / window.innerHeight - 0.5) * 40;
            gsap.to(bgRef.current, { x, y, duration: 2, ease: "power2.out" });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Ambient Drone
    useEffect(() => {
        if (typeof window !== 'undefined') {
            ambientDrone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0.1,
            });
            ambientDrone.play();

            if (!localStorage.getItem('sanctum_guide_complete')) {
                setTimeout(() => setIsGuideOpen(true), 2000);
            }
        }
        return () => {
            if (ambientDrone) ambientDrone.stop();
        };
    }, []);

    const handleGuideComplete = () => {
        localStorage.setItem('sanctum_guide_complete', 'true');
        setIsGuideOpen(false);
    };

    useEffect(() => {
        let isMounted = true;
        const initSanctum = async () => {
            await fetchIdentity();
            const currentSession = await supabase.auth.getSession();
            if (!currentSession.data.session) {
                if (isMounted) router.push('/');
                return;
            }
            try {
                const { data: sysData, error: sysErr } = await supabase.from('system_settings').select('broadcast_message').eq('id', 1).maybeSingle();
                if (!sysErr && sysData && sysData.broadcast_message && isMounted) {
                    setBroadcastMsg(sysData.broadcast_message);
                }
            } catch (err) {
                console.error("Unexpected error in initSanctum:", err);
            }
        };
        initSanctum();
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                if (isMounted) router.push('/');
            }
        });
        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
    }, [router, fetchIdentity]);

    const handleSignOut = async () => {
        await storeSignOut();
        router.push('/');
    };

    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    return (
        <div className="relative min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 font-sans flex flex-col overflow-x-hidden">
            {/* Celestial Parallax Background */}
            <div ref={bgRef} className="fixed inset-0 z-0 scale-110 pointer-events-none opacity-40">
                <img src="/images/aether_bg.png" alt="Aetheric Background" className="absolute w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,6,23,0.2)_0%,#020617_100%)]"></div>
            </div>

            {/* Global Navigation Header - Aetheric */}
            <header className="sticky top-0 z-50 glass-sanctuary px-6 py-4 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-sanctum text-xl font-bold tracking-widest leading-none text-white">
                            SACRED SANCTUM
                        </span>
                        <span className="text-[9px] text-indigo-400 font-bold tracking-widest uppercase">
                            The Aetheric Sanctuary
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <a 
                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center gap-2 px-6 py-2 btn-gold rounded-full text-[10px] font-bold uppercase tracking-widest group"
                    >
                        <Compass className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                        Fuel The Mission
                    </a>
                    <button
                        id="tour-profile-btn"
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); router.push('/self'); }}
                        className="flex items-center gap-3 group relative perspective-1000 outline-none"
                    >
                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
                                {displayName}
                            </span>
                            <span className="block text-[9px] text-slate-500 font-bold">
                                SOUL POWER: {currentPower}
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-indigo-400 transition-colors shadow-lg">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </button>
                    <button onClick={handleSignOut} className="text-slate-500 hover:text-indigo-400 transition-colors group p-2 rounded-xl hover:bg-white/5" title="Sign Out">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Marquee Broadcast */}
            <div className="bg-indigo-950/20 border-y border-white/5 py-2 overflow-hidden sticky top-[77px] z-40 backdrop-blur-md">
                <div className="flex items-center text-[10px] font-bold tracking-widest text-indigo-300">
                    <span className="flex-none font-bold text-white px-6 border-r border-white/10 z-10 bg-indigo-900/40">SYSTEM BROADCAST</span>
                    <div className="flex-1 overflow-hidden whitespace-nowrap">
                        <span className="animate-marquee block">
                            ✧ {broadcastMsg} ✧
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Areas */}
            <main className="flex-1 relative z-10 p-4 md:p-10 overflow-y-auto pb-32">
                <div className="max-w-7xl mx-auto space-y-12">

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Star className="w-5 h-5 text-indigo-400 animate-pulse" />
                                <h2 className="font-sanctum text-3xl text-white font-bold tracking-widest uppercase">
                                    THE CELESTIAL GRID
                                </h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] pl-8">
                                Protocol Active: Navigate the Aetheric Sectors
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/hierarchy')}
                            className="btn-outline-gold px-8 py-3 rounded-2xl text-[10px] font-bold uppercase flex items-center gap-2 group"
                        >
                            <Trophy className="w-4 h-4" /> View Celestial Hierarchy
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* Sector 1: The Pool */}
                        <div
                            id="sanctum-pool"
                            className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px] opacity-40 grayscale cursor-not-allowed border-white/5"
                        >
                            <div className="space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
                                    <Sparkles className="w-7 h-7" />
                                </div>
                                <h3 className="font-sanctum text-2xl text-slate-500 tracking-widest uppercase">THE POOL</h3>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium uppercase tracking-wider">Collective Treasury</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full w-fit text-slate-600 border border-white/5">Sector Offline</span>
                        </div>

                        {/* Sector 2: The Archive */}
                        <div
                            onClick={() => { playClick(); router.push('/codex'); }}
                            onMouseEnter={playHover}
                            id="sanctum-archive"
                            className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px] cursor-pointer group hover:bg-indigo-500/5"
                        >
                            <div className="space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Compass className="w-7 h-7" />
                                </div>
                                <h3 className="font-sanctum text-2xl text-white tracking-widest uppercase">THE ARCHIVE</h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium uppercase tracking-wider">Aetheric Whispers</p>
                            </div>
                            <div className="flex items-center justify-between text-indigo-400">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Enter Sector</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        {/* Sector 3: The Gallery */}
                        <div
                            onClick={() => { playClick(); router.push('/cineworks'); }}
                            onMouseEnter={playHover}
                            id="sanctum-gallery"
                            className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px] cursor-pointer group hover:bg-violet-500/5"
                        >
                            <div className="space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                                    <Clapperboard className="w-7 h-7" />
                                </div>
                                <h3 className="font-sanctum text-2xl text-white tracking-widest uppercase">THE GALLERY</h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium uppercase tracking-wider">Cinematic Fragments</p>
                            </div>
                            <div className="flex items-center justify-between text-violet-400">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Open Archive</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        {/* Sector 4: The Trial */}
                        <div
                            onClick={() => { playClick(); router.push('/trial'); }}
                            onMouseEnter={playHover}
                            id="sanctum-trial"
                            className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px] cursor-pointer group hover:bg-emerald-500/5"
                        >
                            <div className="space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Cpu className="w-7 h-7" />
                                </div>
                                <h3 className="font-sanctum text-2xl text-white tracking-widest uppercase">THE TRIAL</h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium uppercase tracking-wider">Encrypted Synthesis</p>
                            </div>
                            <div className="flex items-center justify-between text-emerald-400">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Decrypt Signal</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        {/* 8K Infrastructure Upgrade Banner */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-4 glass-sanctuary rounded-[3rem] p-10 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-20">
                                <LayoutGrid className="w-32 h-32 text-indigo-500 animate-rotate-slow" />
                            </div>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                                <div className="flex-1 space-y-6 text-center lg:text-left">
                                    <div className="flex items-center gap-4 justify-center lg:justify-start">
                                        <span className="px-4 py-1 bg-indigo-500/20 rounded-full text-indigo-400 font-bold text-[10px] uppercase tracking-widest border border-indigo-500/30">Infrastructure Update</span>
                                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Status: <span className="text-indigo-300">Scaling Frequency</span></span>
                                    </div>
                                    <h2 className="font-sanctum text-3xl md:text-4xl text-white tracking-widest uppercase leading-tight font-black">
                                        Support the <span className="gold-text-shimmer">Aetheric rendering</span> suite
                                    </h2>
                                    <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                                        Every contribution fuels the hardware transition to 8K prophetic visualization and advanced AI analysis. Help us secure the future of the sanctuary.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <a 
                                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={playClick}
                                        className="btn-gold px-12 py-5 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-2xl flex items-center gap-3 group"
                                    >
                                        Invest in the Truth
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                    <div className="flex flex-col items-center gap-1 opacity-60">
                                        <p className="text-[10px] font-bold text-white tracking-widest uppercase">
                                            Code: <span className="text-indigo-400">truufbtold</span>
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Protocol v2.5 Deployment</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <SentinelGuide 
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                onComplete={handleGuideComplete}
                steps={SANCTUM_PROTOCOL_STEPS}
                protocolName="SANCTUM PROTOCOL"
            />

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-0 left-0 w-full z-50 md:hidden glass-sanctuary border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center p-5">
                    <button onClick={() => router.push('/sanctum')} className="text-indigo-400">
                        <Compass className="w-6 h-6" /> 
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <button onClick={() => router.push('/self')} className="w-8 h-8 rounded-xl overflow-hidden border border-white/10">
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Keeping LayoutGrid import for the background icon
const LayoutGrid = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
);
