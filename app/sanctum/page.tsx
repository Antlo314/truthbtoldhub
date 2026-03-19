'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, ChevronRight, LogOut, Clapperboard, Flame, Cpu, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [broadcastMsg, setBroadcastMsg] = useState('The initial architecture is stabilizing...');
    const [tourStep, setTourStep] = useState(0);
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

    // Ambient Drone
    useEffect(() => {
        if (typeof window !== 'undefined') {
            ambientDrone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0.1,
            });
            ambientDrone.play();

            // Auto-trigger tour if first time
            if (!localStorage.getItem('sanctum_tour_complete')) {
                setTimeout(() => setTourStep(1), 1500);
            }
        }
        return () => {
            if (ambientDrone) ambientDrone.stop();
        };
    }, []);

    const nextTourStep = () => {
        playClick();
        if (tourStep === 4) {
            setTourStep(0);
            localStorage.setItem('sanctum_tour_complete', 'true');
        } else {
            setTourStep(s => s + 1);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const checkUser = async (session: any) => {
            if (!session) {
                if (isMounted) router.push('/');
                return;
            }

            if (isMounted) setUserAuth(session.user);

            try {
                // Fetch User Profile
                const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                if (error && error.code !== 'PGRST116') {
                    console.error("Profile fetch error:", error);
                } else if (data && isMounted) {
                    setProfile({ ...data });

                    // Check for pending Cipher Referral
                    const cipherReferral = localStorage.getItem('cipher_referral');
                    if (cipherReferral) {
                        fetch('/api/affiliation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cipher: cipherReferral, newUserId: session.user.id })
                        })
                        .then(r => r.json())
                        .then(res => {
                            console.log('Affiliation response:', res);
                            localStorage.removeItem('cipher_referral');
                        })
                        .catch(err => console.error('Affiliation error:', err));
                    }
                }

                // Fetch Global System Broadcast
                const { data: sysData, error: sysErr } = await supabase.from('system_settings').select('broadcast_message').eq('id', 1).maybeSingle();
                if (!sysErr && sysData && sysData.broadcast_message && isMounted) {
                    setBroadcastMsg(sysData.broadcast_message);
                }
            } catch (err) {
                console.error("Unexpected error in checkUser:", err);
            }
        };

        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUser(session);
        });

        // Listen for auth changes, but DO NOT infinitely call checkUser if session is stable
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                if (isMounted) router.push('/');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                checkUser(session);
            }
        });

        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col overflow-x-hidden">
            {/* Dynamic Parallax Background Map */}
            <div ref={bgRef} className="fixed inset-0 z-0 scale-110 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0a0a0a_0%,#000_100%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(234,88,12,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(234,88,12,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(234,88,12,0.05)_0%,transparent_70%)] opacity-40 pulse-aura"></div>
            </div>

            {/* Global Navigation Header - Sanctum */}
            <header className="sticky top-0 z-50 glass bg-black/50 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 flame-glow"></div>
                    <div className="flex flex-col">
                        <span className="font-ritual text-xl font-bold tracking-widest leading-none drop-shadow-[0_0_10px_rgba(255,107,53,0.5)]">
                            SACRED SANCTUM
                        </span>
                        <span className="text-[9px] text-orange-500/80 font-mono tracking-widest uppercase">
                            The Obsidian Void
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        id="tour-profile-btn"
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); router.push('/self'); }}
                        className="flex items-center gap-3 group relative perspective-1000 outline-none"
                    >
                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-white group-hover:text-orange-500 transition-colors uppercase tracking-widest">
                                {displayName}
                            </span>
                            <span className="block text-[9px] text-gray-500 font-mono">
                                SP: {currentPower}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/30 flex items-center justify-center overflow-hidden group-hover:border-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.2)]">
                            {/* Fallback avatar generator */}
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </button>
                    <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group p-2 rounded-full hover:bg-white/5" title="Sign Out">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Marquee Broadcast */}
            <div className="bg-gradient-to-r from-orange-950/40 via-orange-600/20 to-orange-950/40 border-y border-orange-500/20 py-2 overflow-hidden sticky top-[73px] z-40 backdrop-blur-sm">
                <div className="whitespace-nowrap flex gap-8 items-center text-[10px] font-mono tracking-widest text-orange-400">
                    <span className="flex-none font-bold text-white px-4 border-r border-orange-500/30">SYSTEM BROADCAST</span>
                    <span className="animate-marquee font-bold">
                        ◈ {broadcastMsg} ◈
                    </span>
                </div>
            </div>

            {/* Main Content Areas */}
            <main className="flex-1 relative z-10 p-4 md:p-8 overflow-y-auto pb-32">
                <div className="max-w-6xl mx-auto space-y-8">

                    <div className="flex flex-col gap-1 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div>
                                <h2 className="font-ritual text-lg text-white font-bold tracking-widest uppercase shadow-sm">
                                    The Great Grid
                                </h2>
                            </div>
                            <button
                                onClick={() => router.push('/hierarchy')}
                                className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-orange-400 hover:text-white bg-orange-950/30 hover:bg-orange-500/50 border border-orange-500/30 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(234,88,12,0.2)]"
                            >
                                <Trophy className="w-3 h-3" /> View Global Hierarchy
                            </button>
                        </div>
                        <div className="flex items-center gap-4 pl-4 mt-2">
                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">
                                [SYS_HINT: Establish your domain. Choose your sector.]
                            </p>
                            <button onClick={() => { playClick(); setTourStep(1); }} className="text-[9px] text-orange-500 hover:text-orange-400 font-bold uppercase tracking-widest border border-orange-500/30 px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Re-initiate Tour
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

                        {/* The Pool (Treasury) */}
                        <div
                            onMouseEnter={(e) => {
                                playHover();
                                gsap.to(e.currentTarget, { scale: 1.02, rotationY: 2, rotationX: 2, duration: 0.4, ease: "power2.out", filter: 'brightness(1.1)' });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.4, ease: "power2.out", filter: 'brightness(1)' });
                            }}
                            onClick={() => { playClick(); router.push('/treasury'); }}
                            className={`group glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer sanctuary-card transition-all ${tourStep === 1 ? 'z-50 shadow-[0_0_50px_rgba(234,88,12,0.6)] scale-[1.02] border-orange-500 pointer-events-none' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-700 mix-blend-screen pointer-events-none z-0" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_pool.png">
                                <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_pool.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-0"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-colors pointer-events-none z-0"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-center justify-center mb-4 text-orange-500 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                        <Flame className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-ritual text-xl text-white tracking-widest mb-2">THE POOL</h3>
                                    <p className="text-xs text-gray-400 font-mono tracking-wider">Treasury & Mutual Aid</p>
                                </div>
                                <div className="flex items-center justify-between text-orange-500">
                                    <span className="text-[10px] font-bold uppercase tracking-widest border border-orange-500/30 px-3 py-1 rounded-full">Access Sector</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* The Stage */}
                        <div
                            onMouseEnter={(e) => {
                                playHover();
                                gsap.to(e.currentTarget, { scale: 1.02, rotationY: -2, rotationX: 2, duration: 0.4, ease: "power2.out", filter: 'brightness(1.1)' });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.4, ease: "power2.out", filter: 'brightness(1)' });
                            }}
                            onClick={() => { playClick(); router.push('/codex'); }}
                            className={`group glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer sanctuary-card transition-all ${tourStep === 2 ? 'z-50 shadow-[0_0_50px_rgba(14,165,233,0.6)] scale-[1.02] border-sky-500 pointer-events-none' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-700 mix-blend-screen pointer-events-none z-0" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png">
                                <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-0"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-colors pointer-events-none z-0"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-center justify-center mb-4 text-sky-400 group-hover:scale-110 transition-transform">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-ritual text-xl text-white tracking-widest mb-2">THE ARCHIVE</h3>
                                    <p className="text-xs text-gray-400 font-mono tracking-wider">Obsidian Whispers</p>
                                </div>
                                <div className="flex items-center justify-between text-sky-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest border border-sky-500/30 px-3 py-1 rounded-full text-sky-500">Access Sector</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* The Gallery / Cineworks */}
                        <div
                            onMouseEnter={(e) => {
                                playHover();
                                gsap.to(e.currentTarget, { scale: 1.02, rotationY: 2, rotationX: -2, duration: 0.4, ease: "power2.out", filter: 'brightness(1.1)' });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.4, ease: "power2.out", filter: 'brightness(1)' });
                            }}
                            onClick={() => { playClick(); router.push('/cineworks'); }}
                            className={`group glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer sanctuary-card transition-all ${tourStep === 3 ? 'z-50 shadow-[0_0_50px_rgba(168,85,247,0.6)] scale-[1.02] border-purple-500 pointer-events-none' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-700 mix-blend-screen pointer-events-none z-0" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png">
                                <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-0"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors pointer-events-none z-0"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                                        <Clapperboard className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-ritual text-xl text-white tracking-widest mb-2">THE GALLERY</h3>
                                    <p className="text-xs text-gray-400 font-mono tracking-wider">Cinematic Archives</p>
                                </div>
                                <div className="flex items-center justify-between text-purple-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest border border-purple-500/30 px-3 py-1 rounded-full text-purple-500">Archive Open</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* The Trial (Unlocked - Sandbox) */}
                        <div
                            onMouseEnter={(e) => {
                                playHover();
                                gsap.to(e.currentTarget, { scale: 1.02, rotationY: -2, rotationX: -2, duration: 0.4, ease: "power2.out", filter: 'brightness(1.1)' });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.4, ease: "power2.out", filter: 'brightness(1)' });
                            }}
                            onClick={() => { playClick(); router.push('/trial'); }}
                            className={`group glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer sanctuary-card transition-all ${tourStep === 4 ? 'z-50 shadow-[0_0_50px_rgba(34,197,94,0.6)] scale-[1.02] border-green-500 pointer-events-none' : ''}`}
                            style={{ perspective: '1000px' }}
                        >
                            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-700 mix-blend-screen pointer-events-none z-0" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/encrypted_sector.png">
                                <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/encrypted_sector.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-0"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors pointer-events-none z-0"></div>
                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-green-950/30 border border-green-500/30 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                        <Cpu className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-ritual text-xl text-white tracking-widest mb-2 shadow-black drop-shadow-lg">THE TRIAL</h3>
                                    <p className="text-[10px] text-green-400 font-mono tracking-widest uppercase font-bold">Encrypted Sandbox</p>
                                </div>
                                <div className="flex items-center justify-between text-green-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest border border-green-500/30 px-3 py-1 rounded-full text-green-500">Decrypt Signal</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>

            {/* Tour Overlay Modal */}
            {tourStep > 0 && (
                <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end justify-center pb-32 md:pb-12 pointer-events-auto">
                    <div className="bg-zinc-950 border border-orange-500/50 p-6 rounded-2xl max-w-md w-full mx-4 shadow-[0_0_30px_rgba(234,88,12,0.3)] animate-fade-in relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0"></div>
                        <h3 className="font-ritual text-xl tracking-widest mb-2 uppercase" style={{ color: tourStep === 1 ? '#ea580c' : tourStep === 2 ? '#38bdf8' : tourStep === 3 ? '#a855f7' : '#22c55e' }}>
                            {tourStep === 1 && "Sector 1: The Pool"}
                            {tourStep === 2 && "Sector 2: The Archive"}
                            {tourStep === 3 && "Sector 3: The Gallery"}
                            {tourStep === 4 && "Sector 4: The Trial"}
                        </h3>
                        <p className="text-xs text-orange-200/70 font-mono tracking-widest leading-relaxed mb-6 h-12">
                            {tourStep === 1 && "The central treasury. Pledge your SP to fund mutual aid petitions or lodge your own requests to the global collective."}
                            {tourStep === 2 && "The permanent ledger. Burn SP to decrypt the encrypted whispers of the void left by other Initiates."}
                            {tourStep === 3 && "The cinematic sanctuary. View prophetic architectural broadcasts. Boost transmissions globally."}
                            {tourStep === 4 && "The proving grounds. A secure sandbox for untested code, cryptic mechanics, and encrypted simulations."}
                        </p>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map(s => (
                                    <div key={s} className={`w-8 h-1 rounded-full transition-colors ${s === tourStep ? (s===1?'bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]' : s===2?'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]' : s===3?'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]') : 'bg-zinc-800'}`}></div>
                                ))}
                            </div>
                            <button onClick={nextTourStep} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors">
                                {tourStep === 4 ? "Acknowledge" : "Continue"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Nav elements (Mobile Bottom Bar representation) */}
            <div className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-zinc-950/90 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center p-4">
                    <button onClick={() => router.push('/sanctum')} className="text-orange-500 flex flex-col items-center gap-1"><Flame className="w-5 h-5" /> <span className="hidden md:block text-[8px] font-mono tracking-wider uppercase">Sanctum</span></button>
                    <button onClick={() => router.push('/treasury')} className="text-gray-500 hover:text-white flex flex-col items-center gap-1 transition-colors"><Shield className="w-5 h-5" /> <span className="hidden md:block text-[8px] font-mono tracking-wider uppercase">Treasury</span></button>
                    <button onClick={() => router.push('/self')} className="text-gray-500 hover:text-white flex flex-col items-center gap-1 transition-colors">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-500">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <span className="hidden md:block text-[8px] font-mono tracking-wider uppercase">Self</span>
                    </button>
                    <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 flex flex-col items-center gap-1 transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="hidden md:block text-[8px] font-mono tracking-wider uppercase">Exit</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
