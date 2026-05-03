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

    const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        gsap.to(card, {
            rotateX,
            rotateY,
            scale: 1.02,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const resetTilt = (e: React.MouseEvent<HTMLDivElement>) => {
        gsap.to(e.currentTarget, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 1,
            ease: "elastic.out(1, 0.3)"
        });
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
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="font-ritual text-xl font-bold tracking-[0.2em] leading-none text-white gold-shimmer">
                            SACRED SANCTUM
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center h-2 gap-[1px]">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s`, width: '1.5px' }} />
                                ))}
                            </div>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Aetheric Uplink: Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <a 
                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="hidden lg:flex items-center gap-3 px-8 py-2.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] group shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-aether-gold transition-all"
                    >
                        <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                        Fuel The Mission
                    </a>
                    
                    <div className="h-10 w-px bg-white/5 mx-2 hidden md:block" />

                    <button
                        id="tour-profile-btn"
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); router.push('/self'); }}
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="flex items-center gap-4 group transition-all"
                    >
                        <div className="text-right hidden sm:block">
                            <span className="block text-[10px] font-black text-white group-hover:text-aether-gold transition-colors uppercase tracking-[0.2em]">
                                {displayName}
                            </span>
                            <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                                Soul Power: {currentPower}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-0.5 group-hover:border-aether-gold transition-colors">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-[10px]" />
                        </div>
                    </button>

                    <button 
                        onClick={handleSignOut} 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="text-zinc-500 hover:text-red-500 transition-colors p-3 bg-white/5 rounded-full border border-white/5"
                    >
                        <LogOut className="w-4 h-4" />
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                        {/* Sector 1: The Pool */}
                        <div
                            id="sanctum-pool"
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                            className="glass-panel rounded-[3rem] p-10 flex flex-col justify-between min-h-[340px] opacity-30 cursor-not-allowed border-white/5 relative group"
                        >
                            <div className="space-y-8">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-ritual text-2xl text-zinc-500 tracking-[0.2em] uppercase">The Pool</h3>
                                    <p className="text-[10px] text-zinc-600 leading-relaxed font-bold uppercase tracking-[0.2em] mt-2">Collective Treasury</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-full w-fit">
                                <Lock className="w-3 h-3 text-zinc-700" />
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">Sector Offline</span>
                            </div>
                        </div>

                        {/* Sector 2: The Archive */}
                        <div
                            onClick={() => { playClick(); router.push('/codex'); }}
                            onMouseEnter={playHover}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                            id="sanctum-archive"
                            className="glass-panel rounded-[3rem] p-10 flex flex-col justify-between min-h-[340px] cursor-pointer group hover:border-aether-gold/30 transition-all shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-aether-indigo/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]" />
                            <div className="space-y-8 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-aether-gold group-hover:bg-aether-gold group-hover:text-black transition-all duration-500">
                                    <Compass className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-ritual text-2xl text-white tracking-[0.2em] uppercase">The Codex</h3>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase tracking-[0.2em] mt-2">Sovereign Ledger</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-aether-gold relative z-10">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Access Uplink</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* Sector 3: The Gallery */}
                        <div
                            onClick={() => { playClick(); router.push('/cineworks'); }}
                            onMouseEnter={playHover}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                            id="sanctum-gallery"
                            className="glass-panel rounded-[3rem] p-10 flex flex-col justify-between min-h-[340px] cursor-pointer group hover:border-aether-violet/30 transition-all shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-aether-violet/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]" />
                            <div className="space-y-8 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-aether-violet group-hover:bg-aether-violet group-hover:text-white transition-all duration-500">
                                    <Clapperboard className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-ritual text-2xl text-white tracking-[0.2em] uppercase">The Gallery</h3>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase tracking-[0.2em] mt-2">Prophetic Vision</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-aether-violet relative z-10">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Open Stream</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* Sector 4: The Trial */}
                        <div
                            onClick={() => { playClick(); router.push('/trial'); }}
                            onMouseEnter={playHover}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                            id="sanctum-trial"
                            className="glass-panel rounded-[3rem] p-10 flex flex-col justify-between min-h-[340px] cursor-pointer group hover:border-emerald-500/30 transition-all shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]" />
                            <div className="space-y-8 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-500">
                                    <Cpu className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-ritual text-2xl text-white tracking-[0.2em] uppercase">The Trial</h3>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase tracking-[0.2em] mt-2">Alignment Test</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-emerald-400 relative z-10">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Begin Protocol</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* 8K Infrastructure Upgrade Banner */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-4 glass-panel rounded-[4rem] p-12 overflow-hidden relative group border-white/5">
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-aether-indigo/20 blur-[120px] rounded-full pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                                <div className="flex-1 space-y-8 text-center lg:text-left">
                                    <div className="flex items-center gap-4 justify-center lg:justify-start">
                                        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 font-bold text-[9px] uppercase tracking-[0.2em]">Infrastructure Phase 2.5</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-pulse" />
                                            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Active Scaling</span>
                                        </div>
                                    </div>
                                    <h2 className="font-ritual text-4xl md:text-5xl text-white tracking-widest uppercase leading-tight font-black">
                                        Fortify the <span className="gold-shimmer">Aetheric rendering</span> suite
                                    </h2>
                                    <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed font-mono uppercase tracking-widest opacity-60">
                                        Fueling the transition to 8K prophetic visualization and advanced geopolitical neural mapping.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-6">
                                    <a 
                                        href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onMouseMove={handleMagneticMove}
                                        onMouseLeave={handleMagneticLeave}
                                        className="px-12 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-aether-gold transition-all flex items-center gap-4"
                                    >
                                        Invest in Truth
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                    <div className="text-center opacity-40">
                                        <p className="text-[8px] font-mono uppercase tracking-[0.5em] text-white">Protocol Deploy v2.5.4</p>
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
