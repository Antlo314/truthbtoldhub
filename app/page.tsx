'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
    Play, 
    ShieldCheck, 
    ChevronDown, 
    Compass, 
    Sparkles, 
    LayoutGrid, 
    Star,
    ArrowRight,
    Lock,
    Mail,
    Key
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

import { motion, AnimatePresence } from 'framer-motion';

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
    const [isFlipped, setIsFlipped] = useState(false);
    const [authMode, setAuthMode] = useState<'signin' | 'reset'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showSupportOverlay, setShowSupportOverlay] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.push('/sanctum');
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.push('/sanctum');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data?.session) router.push('/sanctum');
        } catch (err: any) {
            setErrorMsg(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setErrorMsg('Ciphers do not match.');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            if (data?.session) {
                router.push('/sanctum');
            } else {
                setSuccessMsg('Initiation successful. Check email.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (authMode !== 'reset') {
            setAuthMode('reset');
            return;
        }
        if (!email) {
            setErrorMsg('Enter your email to recover access.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/self#recovery=true`,
            });
            if (error) throw error;
            setSuccessMsg('Recovery pathway sent.');
            setTimeout(() => setAuthMode('signin'), 5000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Recovery failed.');
        } finally {
            setLoading(false);
        }
    };

    // GSAP Parallax & Magnetic
    useGSAP(() => {
        // Hero Parallax
        gsap.to('.hero-content', {
            scrollTrigger: {
                trigger: '.hero-section',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            },
            y: 100,
            opacity: 0
        });

        // Bento Card Reveals
        gsap.from('.bento-card', {
            scrollTrigger: {
                trigger: '#bento-section',
                start: 'top 80%',
            },
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power3.out"
        });
    }, []);

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

    const handleInitiate = async () => {
        // Site is focused on landing page for now
        document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-void text-white font-sans selection:bg-aether-gold/30 overflow-x-hidden">
            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* Global Navigation Header - Aetheric */}
            <nav className="fixed top-0 w-full z-[100] px-8 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4 pointer-events-auto group cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl group-hover:border-aether-gold/50 transition-colors duration-500 overflow-hidden">
                            <img src="/logo.png" alt="TBT" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-ritual text-xl tracking-[0.2em] font-black uppercase gold-shimmer">Truth B Told Hub</span>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Sovereign Architecture</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-black/60 border border-white/5 rounded-full backdrop-blur-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]"></div>
                        <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest">Encrypted Sectors: Offline</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6 pointer-events-auto">
                    <button 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        onClick={() => document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-6 py-2 text-[9px] font-black tracking-[0.3em] uppercase text-zinc-500 hover:text-white transition-colors"
                    >
                        Radar
                    </button>
                    <button 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        onClick={() => setShowSupportOverlay(true)}
                        className="px-8 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-black tracking-[0.3em] uppercase hover:bg-white/10 hover:border-aether-gold/30 transition-all shadow-2xl"
                    >
                        Support
                    </button>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="hero-section relative min-h-[100dvh] flex flex-col items-center justify-center p-6 overflow-hidden">
                {/* Celestial Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.05)_0%,transparent_60%)]"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-mamba.png')] opacity-[0.03]"></div>
                </div>

                <div className="hero-content relative z-10 text-center space-y-12 max-w-6xl mx-auto">
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-aether-gold/20 bg-aether-gold/5 backdrop-blur-xl shadow-2xl">
                        <Star className="w-4 h-4 text-aether-gold animate-pulse" />
                        <span className="text-[9px] font-black tracking-[0.4em] text-aether-gold/80 uppercase">Celestial Protocol Active</span>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <h1 className="font-ritual text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] font-black leading-[0.9] md:leading-[0.8] tracking-tighter text-white gold-shimmer uppercase px-4">
                            TRUTH B <br className="hidden md:block" /> TOLD HUB
                        </h1>
                        <p className="text-sm md:text-2xl font-light text-zinc-500 max-w-4xl mx-auto tracking-[0.1em] leading-relaxed uppercase px-6">
                            Ascend beyond the veil. A sovereign repository of <span className="text-white font-black">Celestial Prophecy</span> and <span className="text-aether-gold font-black">Global Truth</span>.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-8 justify-center pt-12">
                        <button 
                            onClick={handleInitiate}
                            onMouseMove={handleMagneticMove}
                            onMouseLeave={handleMagneticLeave}
                            className="px-16 py-6 bg-white text-black rounded-2xl flex items-center gap-4 group shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-500"
                        >
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Access Archive</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a 
                            href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseMove={handleMagneticMove}
                            onMouseLeave={handleMagneticLeave}
                            className="px-16 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:border-aether-gold/30 transition-all shadow-2xl"
                        >
                            Support Infrastructure
                        </a>
                    </div>
                </div>

                <div 
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-40 animate-bounce cursor-pointer group" 
                    onClick={() => document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    <span className="text-[8px] uppercase tracking-[0.5em] font-black text-zinc-500 group-hover:text-aether-gold transition-colors">Discover</span>
                    <ChevronDown className="w-5 h-5 text-aether-gold" />
                </div>
            </section>

            {/* BENTO GRID CONTENT */}
            <section id="bento-section" className="relative py-24 md:py-48 px-4 md:px-6 max-w-[90rem] mx-auto space-y-16 md:space-y-32">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* Geopolitical Radar (Large Card) */}
                    <div 
                        className="bento-card md:col-span-8 glass-panel rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 relative overflow-hidden group min-h-[500px] md:min-h-[600px] border-white/5"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = (e.clientX - rect.left) / rect.width - 0.5;
                            const y = (e.clientY - rect.top) / rect.height - 0.5;
                            gsap.to(e.currentTarget, {
                                rotationY: x * 2,
                                rotationX: -y * 2,
                                duration: 1,
                                ease: "power2.out"
                            });
                        }}
                        onMouseLeave={(e) => {
                            gsap.to(e.currentTarget, {
                                rotationY: 0,
                                rotationX: 0,
                                duration: 1,
                                ease: "power2.out"
                            });
                        }}
                        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                    >
                        <div className="absolute top-0 right-0 p-12">
                            <div className="w-20 h-20 rounded-full border border-aether-gold/20 flex items-center justify-center animate-spin-slow">
                                <Compass className="w-8 h-8 text-aether-gold" />
                            </div>
                        </div>
                        
                        <div className="relative z-10 h-full flex flex-col justify-between max-w-2xl" style={{ transform: 'translateZ(50px)' }}>
                            <div className="space-y-6 md:space-y-8">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500 animate-ping"></div>
                                    <span className="text-[8px] md:text-[10px] font-black tracking-[0.4em] text-aether-gold uppercase">Sovereign Radar: Active</span>
                                </div>
                                <h2 className="font-ritual text-4xl md:text-7xl font-black leading-[1] md:leading-[0.9] uppercase text-white gold-shimmer">
                                    WATCH THE <br /> NATIONS ALIGN
                                </h2>
                                <p className="text-zinc-500 leading-relaxed text-base md:text-xl uppercase tracking-[0.05em] font-light">
                                    Our proprietary mapping engine synchronizes ancient biblical scrolls with real-time global events. Decipher the unseen movements of the world before they manifest.
                                </p>
                            </div>
                            
                            <div className="pt-12 md:pt-16 flex flex-wrap gap-3 md:gap-4">
                                <div className="px-4 md:px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[7px] md:text-[9px] font-black tracking-[0.3em] uppercase text-zinc-400">Medes Awakening: Active</div>
                                <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[7px] md:text-[9px] font-black tracking-[0.3em] uppercase text-zinc-400">Babylon Decay: 84%</div>
                            </div>
                        </div>

                        {/* Visual Radar Mock */}
                        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] opacity-[0.05] pointer-events-none">
                            <div className="w-full h-full rounded-full border-2 border-aether-gold/30 flex items-center justify-center">
                                <div className="w-3/4 h-3/4 rounded-full border border-aether-gold/20 flex items-center justify-center">
                                    <div className="w-1/2 h-1/2 rounded-full border border-aether-gold/10"></div>
                                </div>
                                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-aether-gold to-transparent animate-spin-slow"></div>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Card */}
                    <div 
                        className="bento-card md:col-span-4 glass-panel rounded-[3rem] p-12 flex flex-col justify-between border-white/5"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = (e.clientX - rect.left) / rect.width - 0.5;
                            const y = (e.clientY - rect.top) / rect.height - 0.5;
                            gsap.to(e.currentTarget, {
                                rotationY: x * 4,
                                rotationX: -y * 4,
                                duration: 1,
                                ease: "power2.out"
                            });
                        }}
                        onMouseLeave={(e) => {
                            gsap.to(e.currentTarget, {
                                rotationY: 0,
                                rotationX: 0,
                                duration: 1,
                                ease: "power2.out"
                            });
                        }}
                        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                    >
                        <div className="space-y-8" style={{ transform: 'translateZ(30px)' }}>
                            <div className="w-14 h-14 rounded-2xl bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                <ShieldCheck className="w-8 h-8 text-aether-gold" />
                            </div>
                            <h3 className="font-ritual text-3xl font-black uppercase tracking-[0.2em] text-white">8K Infra</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                We are scaling the frequency. Support the hardware transition to 8K rendering and AI-synthesized prophetic analysis.
                            </p>
                        </div>
                        
                        <div className="pt-16" style={{ transform: 'translateZ(20px)' }}>
                            <a 
                                href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                target="_blank"
                                rel="noopener noreferrer"
                                onMouseMove={handleMagneticMove}
                                onMouseLeave={handleMagneticLeave}
                                className="w-full bg-white text-black py-5 rounded-2xl flex items-center justify-center gap-3 group shadow-2xl hover:scale-105 transition-all duration-500"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Secure the Build</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>

                    {/* Video Card 1 */}
                    <div 
                        className="bento-card md:col-span-6 glass-panel rounded-[3rem] overflow-hidden group cursor-pointer border-white/5"
                        onClick={() => document.getElementById('portal-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <div className="aspect-video relative overflow-hidden">
                            <img 
                                src="https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg" 
                                alt="14" 
                                className="absolute w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                            />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-sm">
                                <div className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                                    <Play className="w-8 h-8 fill-black ml-1" />
                                </div>
                            </div>
                            <div className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Encrypted Transmission</span>
                            </div>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="font-ritual text-2xl font-black uppercase tracking-[0.2em] text-white group-hover:text-aether-gold transition-colors">14 (ODE' TO IRAN)</h4>
                                <span className="text-[8px] font-black tracking-[0.3em] text-zinc-600 uppercase">v14.5.2</span>
                            </div>
                            <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                A powerful prophetic breakdown regarding the 14th Amendment and the awakening of the Medes. Explore the spiritual foundations of modern geopolitical shifts.
                            </p>
                        </div>
                    </div>

                    {/* Video Card 2 */}
                    <div 
                        className="bento-card md:col-span-6 glass-panel rounded-[3rem] overflow-hidden group cursor-pointer border-white/5"
                        onClick={() => document.getElementById('portal-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <div className="aspect-video relative overflow-hidden">
                            <img 
                                src="https://img.youtube.com/vi/fVqAox73uCE/maxresdefault.jpg" 
                                alt="Codex" 
                                className="absolute w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                            />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-sm">
                                <div className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                                    <Play className="w-8 h-8 fill-black ml-1" />
                                </div>
                            </div>
                            <div className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Vault Stream X-1</span>
                            </div>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="font-ritual text-2xl font-black uppercase tracking-[0.2em] text-white group-hover:text-aether-gold transition-colors">PRELUDE TO DESTROYER</h4>
                                <span className="text-[8px] font-black tracking-[0.3em] text-zinc-600 uppercase">Archive 88</span>
                            </div>
                            <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-[0.1em] font-light">
                                Exploring the ancient warnings of the Kolbrin Bible and the signs of collapse. A deep dive into the stone we built upon and its fragility.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* AUTH PORTAL SECTION */}
            <section id="portal-section" className="relative py-48 px-6">
                <div className="max-w-xl mx-auto space-y-16">
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl group">
                            <Lock className="w-10 h-10 text-aether-gold group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h2 className="font-ritual text-5xl font-black uppercase tracking-[0.2em] text-white gold-shimmer">Portal to Sector</h2>
                        <p className="text-zinc-500 text-[10px] tracking-[0.5em] font-black uppercase">Identification Protocol Required</p>
                    </div>

                    <div className="perspective-2000">
                        <div className={`auth-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                            
                            {/* Sign In Face */}
                            <div className="auth-face glass-panel rounded-[3rem] p-12 flex flex-col justify-between border-white/5">
                                <form onSubmit={authMode === 'signin' ? handleSignIn : handleResetPassword} className="space-y-8">
                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-aether-gold/40 group-focus-within:text-aether-gold transition-colors" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-sm focus:outline-none focus:border-aether-gold transition-all placeholder:text-zinc-700 tracking-[0.1em]"
                                                placeholder="Identity Soul (Email)"
                                            />
                                        </div>
                                        {authMode === 'signin' && (
                                            <div className="relative group">
                                                <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-aether-gold/40 group-focus-within:text-aether-gold transition-colors" />
                                                <input
                                                    type="password"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-sm focus:outline-none focus:border-aether-gold transition-all placeholder:text-zinc-700 tracking-[0.2em]"
                                                    placeholder="Cipher (Password)"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {errorMsg && !isFlipped && <p className="text-[10px] text-red-500 font-black tracking-widest uppercase text-center">{errorMsg}</p>}
                                    {successMsg && !isFlipped && <p className="text-[10px] text-green-500 font-black tracking-widest uppercase text-center">{successMsg}</p>}

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        onMouseMove={handleMagneticMove}
                                        onMouseLeave={handleMagneticLeave}
                                        className="w-full bg-white text-black py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl hover:bg-zinc-200 transition-colors"
                                    >
                                        {loading ? 'Transmitting...' : authMode === 'signin' ? 'Enter Sanctuary' : 'Send Recovery'}
                                    </button>

                                    <div className="flex justify-between items-center px-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsFlipped(true)}
                                            className="text-[9px] font-black tracking-[0.3em] uppercase text-zinc-600 hover:text-white transition-colors"
                                        >
                                            Initiate
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setAuthMode(authMode === 'signin' ? 'reset' : 'signin')}
                                            className="text-[9px] font-black tracking-[0.3em] uppercase text-aether-gold/60 hover:text-aether-gold transition-colors"
                                        >
                                            {authMode === 'signin' ? 'Lost Cipher?' : 'Back to Gate'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Sign Up Face */}
                            <div className="auth-face auth-face-back glass-panel rounded-[3rem] p-12 flex flex-col justify-between border-aether-gold/20 bg-gradient-to-br from-void to-black">
                                <form onSubmit={handleSignUp} className="space-y-6">
                                    <h3 className="text-center font-ritual text-3xl font-black uppercase tracking-[0.2em] mb-6 gold-shimmer">New Soul Initiation</h3>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-aether-gold transition-all placeholder:text-zinc-700 tracking-[0.1em]"
                                        placeholder="Email Address"
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-aether-gold transition-all placeholder:text-zinc-700 tracking-[0.2em]"
                                        placeholder="Define Cipher"
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-aether-gold transition-all placeholder:text-zinc-700 tracking-[0.2em]"
                                        placeholder="Confirm Cipher"
                                    />

                                    {errorMsg && isFlipped && <p className="text-[10px] text-red-500 font-black tracking-widest uppercase text-center">{errorMsg}</p>}
                                    {successMsg && isFlipped && <p className="text-[10px] text-green-500 font-black tracking-widest uppercase text-center">{successMsg}</p>}

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        onMouseMove={handleMagneticMove}
                                        onMouseLeave={handleMagneticLeave}
                                        className="w-full bg-white text-black py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] mt-4"
                                    >
                                        {loading ? 'Awakening...' : 'Awaken Soul'}
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => setIsFlipped(false)}
                                        className="w-full text-[9px] font-black tracking-[0.3em] uppercase text-zinc-600 hover:text-white transition-colors pt-4"
                                    >
                                        Return to Gate
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-32 border-t border-white/5 text-center space-y-10">
                <div className="flex justify-center gap-8 text-zinc-700">
                    <Compass className="w-6 h-6 hover:text-aether-gold transition-colors cursor-pointer" />
                    <Sparkles className="w-6 h-6 hover:text-aether-gold transition-colors cursor-pointer" />
                    <Star className="w-6 h-6 hover:text-aether-gold transition-colors cursor-pointer" />
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] font-black tracking-[0.8em] text-zinc-600 uppercase">
                        Protocol A-25 • Truth B Told Hub
                    </p>
                    <p className="text-[9px] font-black tracking-[0.5em] text-zinc-800 uppercase">
                        Designed for Sovereignty • <span className="text-aether-gold/30">8K Rendered Truth</span>
                    </p>
                </div>
            </footer>

            {/* SUPPORT OVERLAY */}
            <AnimatePresence>
                {showSupportOverlay && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-void/95 backdrop-blur-2xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-panel rounded-[4rem] p-16 max-w-2xl w-full relative space-y-10 border-white/5 shadow-[0_0_100px_rgba(212,175,55,0.1)]"
                        >
                            <button 
                                onClick={() => setShowSupportOverlay(false)}
                                className="absolute top-10 right-10 text-zinc-500 hover:text-white transition-colors p-3 bg-white/5 rounded-full"
                            >
                                <Lock className="w-6 h-6" />
                            </button>
                            
                            <div className="text-center space-y-8">
                                <div className="w-24 h-24 bg-black/60 rounded-[2rem] flex items-center justify-center mx-auto border border-white/10 overflow-hidden shadow-2xl">
                                    <img src="/logo.png" alt="TBT" className="w-14 h-14 object-contain" />
                                </div>
                                <h2 className="font-ritual text-5xl font-black uppercase tracking-[0.2em] text-white gold-shimmer">Fuel the Mission</h2>
                                <p className="text-zinc-500 leading-relaxed uppercase tracking-[0.1em] font-light">
                                    Our mission requires high-fidelity hardware and AI-synthesis capabilities. Support the build to ensure the truth is rendered with absolute clarity.
                                </p>
                                
                                <div className="p-8 bg-aether-gold/5 border border-aether-gold/10 rounded-[2.5rem]">
                                    <p className="text-[11px] font-black tracking-[0.4em] uppercase text-aether-gold">
                                        Use Code <span className="text-white bg-aether-gold/20 px-4 py-1.5 rounded-lg border border-aether-gold/30">truufbtold</span> during checkout
                                    </p>
                                </div>

                                <a 
                                    href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseMove={handleMagneticMove}
                                    onMouseLeave={handleMagneticLeave}
                                    className="block w-full bg-white text-black py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl"
                                >
                                    Invest in the Sanctuary
                                </a>
                                
                                <button 
                                    onClick={() => setShowSupportOverlay(false)}
                                    className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-700 hover:text-zinc-500 transition-colors"
                                >
                                    Return to the Gate
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
