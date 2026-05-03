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

    const handleInitiate = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            router.push('/sanctum');
        } else {
            document.getElementById('portal-section')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-indigo-500/30">
            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-[100] px-6 py-8 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-sanctum text-xl tracking-[0.2em] font-bold uppercase hidden md:block">Sacred Sanctum</span>
                </div>
                
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button 
                        onClick={() => document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-4 py-2 text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors"
                    >
                        Radar
                    </button>
                    <button 
                        onClick={() => setShowSupportOverlay(true)}
                        className="px-6 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-white/10 transition-all"
                    >
                        Support
                    </button>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative min-h-[100dvh] flex flex-col items-center justify-center p-6 overflow-hidden">
                {/* Celestial Background */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/images/aether_bg.png" 
                        alt="Aetheric Background" 
                        className="absolute w-full h-full object-cover opacity-40 scale-105 animate-celestial" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1)_0%,transparent_70%)]"></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="relative z-10 text-center space-y-10 max-w-5xl mx-auto"
                >
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl shadow-inner">
                        <Star className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-200 uppercase">Celestial Transmission Active</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="font-sanctum text-6xl md:text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-indigo-500/30">
                            SACRED <br /> SANCTUM
                        </h1>
                        <p className="text-xl md:text-3xl font-light text-slate-400 max-w-3xl mx-auto tracking-wide leading-relaxed">
                            Ascend beyond the veil. A repository of <span className="text-white font-medium">Celestial Prophecy</span> and <span className="text-indigo-400 font-medium">Global Truth</span>.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                        <button 
                            onClick={handleInitiate}
                            className="btn-gold px-12 py-5 rounded-2xl flex items-center gap-3 group"
                        >
                            <span className="text-sm">Initiate Ascension</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a 
                            href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline-gold px-12 py-5 rounded-2xl text-sm"
                        >
                            Support Infrastructure
                        </a>
                    </div>
                </motion.div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 animate-bounce cursor-pointer" onClick={() => document.getElementById('bento-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Discover</span>
                    <ChevronDown className="w-6 h-6 text-indigo-400" />
                </div>
            </section>

            {/* BENTO GRID CONTENT */}
            <section id="bento-section" className="relative py-32 px-6 max-w-7xl mx-auto space-y-24">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Geopolitical Radar (Large Card) */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="md:col-span-8 glass-sanctuary rounded-[2.5rem] p-10 relative overflow-hidden group min-h-[500px]"
                    >
                        <div className="absolute top-0 right-0 p-8">
                            <div className="w-16 h-16 rounded-full border border-indigo-500/20 flex items-center justify-center animate-rotate-slow">
                                <Compass className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                        
                        <div className="relative z-10 h-full flex flex-col justify-between max-w-xl">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                    <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Live Geopolitical Radar</span>
                                </div>
                                <h2 className="font-sanctum text-4xl md:text-5xl font-bold leading-tight">
                                    WATCH THE <span className="gold-text-shimmer">NATIONS</span> ALIGN
                                </h2>
                                <p className="text-slate-400 leading-relaxed text-lg">
                                    Our proprietary mapping engine synchronizes ancient biblical scrolls with real-time global events. Decipher the unseen movements of the world before they manifest.
                                </p>
                            </div>
                            
                            <div className="pt-10 flex gap-4">
                                <div className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold tracking-widest uppercase">Medes Awakening: Active</div>
                                <div className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold tracking-widest uppercase">Babylon Decay: 84%</div>
                            </div>
                        </div>

                        {/* Visual Radar Mock */}
                        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] opacity-20 pointer-events-none">
                            <div className="w-full h-full rounded-full border border-indigo-500/50 flex items-center justify-center">
                                <div className="w-3/4 h-3/4 rounded-full border border-indigo-500/30 flex items-center justify-center">
                                    <div className="w-1/2 h-1/2 rounded-full border border-indigo-500/20"></div>
                                </div>
                                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-rotate-slow"></div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Infrastructure Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-4 glass-sanctuary rounded-[2.5rem] p-10 bg-gradient-to-br from-indigo-900/20 to-transparent flex flex-col justify-between"
                    >
                        <div className="space-y-6">
                            <ShieldCheck className="w-10 h-10 text-indigo-400" />
                            <h3 className="font-sanctum text-3xl font-bold uppercase tracking-wider">8K Infrastructure</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                We are scaling the frequency. Support the hardware transition to 8K rendering and AI-synthesized prophetic analysis.
                            </p>
                        </div>
                        
                        <div className="pt-10">
                            <a 
                                href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full btn-gold py-4 rounded-xl flex items-center justify-center gap-2 group"
                            >
                                <span className="text-xs">Secure the Build</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </motion.div>

                    {/* Video Card 1 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-6 glass-card rounded-[2.5rem] overflow-hidden group cursor-pointer"
                        onClick={() => document.getElementById('portal-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <div className="aspect-video relative overflow-hidden">
                            <img 
                                src="https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg" 
                                alt="14" 
                                className="absolute w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-sanctum text-2xl font-bold uppercase tracking-widest text-indigo-100">14 (ODE' TO IRAN)</h4>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase">Transmission v14</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                A powerful prophetic breakdown regarding the 14th Amendment and the awakening of the Medes. Explore the spiritual foundations of modern geopolitical shifts.
                            </p>
                        </div>
                    </motion.div>

                    {/* Video Card 2 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-6 glass-card rounded-[2.5rem] overflow-hidden group cursor-pointer"
                        onClick={() => document.getElementById('portal-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <div className="aspect-video relative overflow-hidden">
                            <img 
                                src="https://img.youtube.com/vi/fVqAox73uCE/maxresdefault.jpg" 
                                alt="Codex" 
                                className="absolute w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-sanctum text-2xl font-bold uppercase tracking-widest text-indigo-100">PRELUDE TO THE DESTROYER</h4>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase">Codex X-1</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Exploring the ancient warnings of the Kolbrin Bible and the signs of collapse. A deep dive into the stone we built upon and its fragility.
                            </p>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* AUTH PORTAL SECTION */}
            <section id="portal-section" className="relative py-32 px-6 bg-gradient-to-b from-[#020617] to-black">
                <div className="max-w-md mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                            <Lock className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h2 className="font-sanctum text-4xl font-bold uppercase tracking-widest">Portal to Sector</h2>
                        <p className="text-slate-500 text-xs tracking-[0.3em] font-bold uppercase">Identification Required</p>
                    </div>

                    <div className="perspective-1000">
                        <div className={`auth-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                            
                            {/* Sign In Face */}
                            <div className="auth-face glass-sanctuary rounded-[2.5rem] p-10 flex flex-col justify-between">
                                <form onSubmit={authMode === 'signin' ? handleSignIn : handleResetPassword} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                                                placeholder="Identity Soul (Email)"
                                            />
                                        </div>
                                        {authMode === 'signin' && (
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
                                                <input
                                                    type="password"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                                                    placeholder="Cipher (Password)"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {errorMsg && !isFlipped && <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase text-center">{errorMsg}</p>}
                                    {successMsg && !isFlipped && <p className="text-[10px] text-green-400 font-bold tracking-widest uppercase text-center">{successMsg}</p>}

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full btn-gold py-5 rounded-2xl text-xs flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Transmitting...' : authMode === 'signin' ? 'Enter Sanctuary' : 'Send Recovery'}
                                    </button>

                                    <div className="flex justify-between items-center px-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsFlipped(true)}
                                            className="text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-white transition-colors"
                                        >
                                            Initiate
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setAuthMode(authMode === 'signin' ? 'reset' : 'signin')}
                                            className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            {authMode === 'signin' ? 'Lost Cipher?' : 'Back to Gate'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Sign Up Face */}
                            <div className="auth-face auth-face-back glass-sanctuary rounded-[2.5rem] p-10 flex flex-col justify-between border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-[#020617]">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <h3 className="text-center font-sanctum text-2xl font-bold uppercase tracking-widest mb-4">New Soul Initiation</h3>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                                        placeholder="Email Address"
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                                        placeholder="Define Cipher"
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/20"
                                        placeholder="Confirm Cipher"
                                    />

                                    {errorMsg && isFlipped && <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase text-center">{errorMsg}</p>}
                                    {successMsg && isFlipped && <p className="text-[10px] text-green-400 font-bold tracking-widest uppercase text-center">{successMsg}</p>}

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full btn-gold py-5 rounded-2xl text-xs mt-4"
                                    >
                                        {loading ? 'Awakening...' : 'Awaken Soul'}
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => setIsFlipped(false)}
                                        className="w-full text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-white transition-colors pt-4"
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
            <footer className="py-20 border-t border-white/5 text-center space-y-6">
                <div className="flex justify-center gap-6 text-slate-600">
                    <Compass className="w-5 h-5" />
                    <Sparkles className="w-5 h-5" />
                    <Star className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-[0.5em] text-slate-500 uppercase">
                        Protocol A-25 • Sacred Sanctum Sanctuary
                    </p>
                    <p className="text-[8px] font-bold tracking-[0.4em] text-slate-700 uppercase">
                        Developed by Lumen Labs • <span className="text-indigo-500/50">8K Rendered Truth</span>
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
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-2xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-sanctuary rounded-[3rem] p-12 max-w-xl w-full relative space-y-8"
                        >
                            <button 
                                onClick={() => setShowSupportOverlay(false)}
                                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                            >
                                <Lock className="w-6 h-6" />
                            </button>
                            
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
                                    <LayoutGrid className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h2 className="font-sanctum text-4xl font-bold uppercase tracking-widest">Fuel the Infrastructure</h2>
                                <p className="text-slate-400 leading-relaxed">
                                    Our mission requires high-fidelity hardware and AI-synthesis capabilities. Support the build to ensure the truth is rendered with absolute clarity.
                                </p>
                                
                                <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem]">
                                    <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-200">
                                        Use Code <span className="text-white bg-indigo-500/20 px-3 py-1 rounded border border-indigo-500/30">truufbtold</span> during checkout
                                    </p>
                                </div>

                                <a 
                                    href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full btn-gold py-6 rounded-2xl text-sm"
                                >
                                    Invest in the Sanctuary
                                </a>
                                
                                <button 
                                    onClick={() => setShowSupportOverlay(false)}
                                    className="text-[10px] font-bold tracking-widest uppercase text-slate-600 hover:text-slate-400 transition-colors"
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
