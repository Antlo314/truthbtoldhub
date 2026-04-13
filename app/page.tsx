'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Play, ShieldAlert, ChevronDown, Eye, Globe2, Clapperboard, Flame } from 'lucide-react';

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

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                router.push('/sanctum');
            }
        });

        // Listen for auth changes (e.g., successful login)
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data?.session) {
                router.push('/sanctum');
            }
        } catch (err: any) {
            console.error(err.message);
            const msg = err.message || 'Authentication failed.';
            setErrorMsg(msg);
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
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            if (data?.session) {
                router.push('/sanctum');
            } else {
                setSuccessMsg('Initiation successful. Check email or re-enter the Gate.');
            }
        } catch (err: any) {
            console.error(err.message);
            const msg = err.message || 'Registration failed.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (authMode !== 'reset') {
            setAuthMode('reset');
            setErrorMsg('');
            setSuccessMsg('');
            return;
        }

        if (!email) {
            setErrorMsg('Enter your Soul ID (Email) to recover cipher.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/self#recovery=true`,
            });

            if (error) throw error;
            setSuccessMsg('Recovery pathway sent. Check your email frequency.');
            setTimeout(() => setAuthMode('signin'), 5000); // Auto revert after 5s
        } catch (err: any) {
            console.error(err.message);
            setErrorMsg(err.message || 'Recovery failed.');
        } finally {
            setLoading(false);
        }
    };

    const scrollToGate = () => {
        document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500/30">
            <Suspense fallback={null}>
                <CipherTracker />
            </Suspense>
            
            {/* HEROS SECTION */}
            <section className="relative min-h-[100dvh] flex flex-col items-center justify-center p-4">
                {/* Background Video/Image */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_void.png" alt="The Obsidian Void" className="absolute w-full h-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/10 via-black to-black/80"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.1)_0%,transparent_60%)]"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                </div>

                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center space-y-8 pt-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-950/40 backdrop-blur-sm shadow-[0_0_15px_rgba(234,88,12,0.2)] animate-fade-in">
                        <ShieldAlert className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-mono tracking-[0.2em] text-orange-200 uppercase">System Active • Broadcasting Truth</span>
                    </div>

                    <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <h1 className="font-ritual text-5xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-orange-100 to-gray-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            SACRED <br className="md:hidden" /> SANCTUM
                        </h1>
                        <p className="text-xl md:text-3xl font-sans font-light text-gray-300 max-w-3xl mx-auto tracking-wide">
                            Unlearn Everything. The <span className="text-orange-400 font-bold">Truth</span> Shall Make You Free.
                        </p>
                    </div>

                    <p className="max-w-xl text-sm md:text-base text-gray-400 font-sans leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
                        Venture into the Obsidian Void. An exclusive repository of uncut prophetic breakdowns, geo-political radar updates, and the biblical truth they try to hide. 
                    </p>

                    <div className="flex flex-col items-center gap-4 pt-8 animate-fade-in px-4 w-full" style={{ animationDelay: '0.6s' }}>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button onClick={scrollToGate} className="group relative px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all font-ritual tracking-[0.2em] uppercase text-sm md:text-base flex items-center justify-center gap-3 overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <span className="relative z-10 font-bold">Initiate Awakening</span>
                                <ChevronDown className="w-5 h-5 relative z-10 group-hover:translate-y-1 transition-transform" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col items-center mt-4 w-full max-w-sm sm:max-w-md relative">
                            <a 
                                href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group relative w-full px-6 py-4 bg-black/60 border-2 border-[#FF4500] text-white hover:bg-[#FF4500]/10 rounded-xl shadow-[0_0_20px_rgba(255,69,0,0.4)] hover:shadow-[0_0_30px_rgba(255,69,0,0.8)] transition-all font-mono font-bold text-sm md:text-base uppercase tracking-widest text-center flex items-center justify-center backdrop-blur-sm"
                            >
                                <span className="relative z-10 group-hover:animate-glitch">FUEL THE 8K INFRASTRUCTURE</span>
                                <span className="absolute bottom-1 right-2 text-[8px] opacity-40 text-[#FF4500] font-mono pointer-events-none group-hover:opacity-100 transition-opacity">$truufbold</span>
                            </a>
                            <p className="mt-3 text-[10px] md:text-xs text-gray-400 font-mono tracking-widest text-center uppercase">
                                Directly funds the 8K rendering PC & AI synthesis suite.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50 cursor-pointer" onClick={() => document.getElementById('teasers')?.scrollIntoView({ behavior: 'smooth' })}>
                    <ChevronDown className="w-8 h-8 text-orange-500" />
                </div>
            </section>

            {/* TEASER SECTION (SEO & TRAFFIC) */}
            <section id="teasers" className="relative py-24 bg-black border-y border-white/5 z-20">
                <div className="max-w-6xl mx-auto px-6 space-y-20">
                    
                    {/* Public Radar Peek */}
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/2 space-y-6">
                            <div className="flex items-center gap-3 text-orange-500 mb-2">
                                <Globe2 className="w-6 h-6" />
                                <span className="font-mono tracking-[0.2em] text-xs font-bold uppercase">The Geopolitical Radar</span>
                            </div>
                            <h2 className="font-ritual text-4xl md:text-5xl font-bold tracking-widest text-white leading-tight">
                                WATCH THE NATIONS <span className="text-orange-500">ALIGN</span>
                            </h2>
                            <p className="text-gray-400 font-sans leading-relaxed border-l-2 border-orange-500/30 pl-4">
                                Our live tracker continuously sweeps global events and explicitly maps them to ancient biblical prophecy. While they tell you it's politics, we show you the scrolls. 
                            </p>
                            <ul className="space-y-4 pt-4">
                                <li className="flex items-center gap-3 text-sm font-mono text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span>MEDES AWAKENING (IRAN) DETECTED</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-mono text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    <span>BABYLON CRUMBLING PROTOCOL</span>
                                </li>
                            </ul>
                        </div>
                        <div className="md:w-1/2 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 blur-3xl opacity-50 rounded-full"></div>
                            <div className="glass-panel border-white/10 rounded-3xl p-6 relative z-10 backdrop-blur-xl shadow-2xl">
                                <div className="aspect-video bg-black rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                                    <img src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Radar Screen" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
                                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]"></div>
                                    <button onClick={scrollToGate} className="relative z-10 px-6 py-3 bg-black/60 border border-orange-500/50 text-orange-400 backdrop-blur-md font-ritual tracking-widest uppercase rounded-lg hover:bg-orange-500/20 transition-colors">
                                        Unlock Live Feed
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VOD Previews (Cineworks) */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <Clapperboard className="w-8 h-8 text-orange-500 mx-auto" />
                            <h2 className="font-ritual text-4xl font-bold tracking-widest text-white uppercase shadow-sm">
                                LATEST TRANSMISSIONS
                            </h2>
                            <p className="text-gray-400 font-mono tracking-widest text-[10px] uppercase">Inside the Cineworks Vault</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                            {/* Card 1 */}
                            <div className="glass-panel p-4 rounded-3xl group relative overflow-hidden">
                                <div className="aspect-video rounded-2xl relative overflow-hidden cursor-pointer" onClick={scrollToGate}>
                                    <img src="https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="14" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-16 h-16 rounded-full bg-orange-600/60 flex items-center justify-center backdrop-blur-sm border border-orange-400/50">
                                            <Play className="w-6 h-6 ml-1 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 px-2">
                                    <h3 className="font-ritual text-xl tracking-widest text-white">14 (ODE' TO IRAN)</h3>
                                    <p className="text-sm text-gray-400 font-sans mt-2 line-clamp-2">"STL in the spirit, Judah in the flesh." A powerful prophetic breakdown regarding the 14th Amendment and the awakening of the Medes (Iran).</p>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="glass-panel p-4 rounded-3xl group relative overflow-hidden hidden md:block">
                                <div className="aspect-video rounded-2xl relative overflow-hidden cursor-pointer" onClick={scrollToGate}>
                                    <img src="https://img.youtube.com/vi/fVqAox73uCE/maxresdefault.jpg" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="Watcher" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-16 h-16 rounded-full bg-orange-600/60 flex items-center justify-center backdrop-blur-sm border border-orange-400/50">
                                            <Play className="w-6 h-6 ml-1 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 px-2">
                                    <h3 className="font-ritual text-xl tracking-widest text-white">CODEX: PRELUDE TO THE DESTROYER</h3>
                                    <p className="text-sm text-gray-400 font-sans mt-2 line-clamp-2">The Stone We Built On explores the ancient warnings of the Kolbrin Bible, the cracked foundation of America, and signs of collapse.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SUPPORT THE INFRASTRUCTURE SECTION */}
            <section id="infrastructure" className="relative py-24 brushed-metal overflow-hidden z-20">
                {/* Corona Glow Frame */}
                <div className="absolute inset-4 corona-frame rounded-[2rem] pointer-events-none"></div>
                
                {/* Technical Blueprint Elements */}
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px] pointer-events-none opacity-50"></div>
                <div className="absolute top-10 left-10 font-mono text-[8px] tracking-[0.4em] text-orange-500/20 uppercase select-none pointer-events-none">$truufbold</div>
                <div className="absolute top-10 right-10 font-mono text-[8px] tracking-[0.4em] text-orange-500/20 uppercase select-none pointer-events-none">COORD: 33.7490° N, 84.3880° W</div>
                <div className="absolute bottom-10 left-10 font-mono text-[8px] tracking-[0.4em] text-orange-500/20 uppercase select-none pointer-events-none">truthbtoldhub.com</div>
                <div className="absolute bottom-10 right-10 font-mono text-[8px] tracking-[0.4em] text-orange-500/20 uppercase select-none pointer-events-none uppercase text-right">Sector: ATL-ZION</div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-10">
                    <div className="space-y-4">
                        <h2 className="font-ritual text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_0_15px_rgba(255,107,53,0.3)]">
                            Fuel the Vision: <span className="text-orange-500">8K Infrastructure</span> Upgrade
                        </h2>
                        <div className="h-px w-32 bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto opacity-50"></div>
                    </div>

                    <div className="space-y-6 max-w-2xl mx-auto">
                        <p className="text-gray-300 font-sans text-lg md:text-xl leading-relaxed tracking-wide font-light">
                            We are scaling the frequency. To deliver the full <span className="text-white font-bold underline decoration-orange-500/30 underline-offset-8">8K cinematic weight</span> of the TruthBTold mission—from high-fidelity music to deep-dive prophetic teachings—we are upgrading our hardware and AI synthesis tools.
                        </p>
                        <p className="text-orange-500/80 font-ritual text-sm md:text-base tracking-[0.3em] uppercase font-bold italic">
                            This is the new empire's warning, rendered without compromise.
                        </p>
                    </div>

                    <p className="text-gray-500 text-[10px] md:text-xs font-mono tracking-[0.3em] uppercase">
                        Support the build and secure your place as a <span className="text-white">Founding Member</span> of the Hub.
                    </p>

                    <div className="pt-8 flex flex-col items-center space-y-8">
                        <a 
                            href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group relative px-12 py-6 bg-orange-600 hover:bg-white text-white hover:text-orange-600 rounded-2xl shadow-[0_0_50px_rgba(234,88,12,0.4)] transition-all duration-300 font-ritual tracking-[0.4em] uppercase text-xl md:text-2xl font-black block w-full max-w-lg border-2 border-orange-500 animate-glitch overflow-hidden"
                        >
                            <span className="relative z-10 transition-colors duration-300 group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">Invest in the Truth</span>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </a>
                        
                        <div className="flex flex-col items-center space-y-3">
                           <div className="px-6 py-4 bg-white/5 border border-white/10 hover:border-[#FF4500]/50 transition-colors rounded-lg backdrop-blur-md max-w-xl text-center">
                                <p className="text-[10px] md:text-[11px] font-mono text-white/80 tracking-widest uppercase leading-relaxed">
                                    <span className="text-[#FF4500] font-bold block mb-2 md:inline md:mb-0">CRUCIAL:</span> 
                                    Input code <span className="text-white font-bold bg-[#FF4500]/20 px-2 py-1 mx-1 rounded border border-[#FF4500]/40 select-all tracking-[0.2em] shadow-[0_0_10px_rgba(255,69,0,0.2)]">truufbtold</span> during checkout to be logged in the internal Founding Supporter registry.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* AUTHENTICATION GATE */}
            <section id="auth-section" className="relative min-h-[90dvh] flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/black-mamba.png')] z-30">
                <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black to-transparent pointer-events-none"></div>
                
                <main className="relative z-10 w-full max-w-sm px-4 md:px-0" id="auth-container-wrapper">
                    <div className="text-center mb-8 space-y-2">
                        <Flame className="w-8 h-8 text-orange-500 mx-auto animate-pulse" />
                        <h2 className="font-ritual text-3xl text-white tracking-widest uppercase shadow-black drop-shadow-xl">Proceed to Sector</h2>
                        <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">Secure Identification Required</p>
                    </div>

                    <div id="auth-container" className={`auth-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                        {/* THE GATE (Sign In) */}
                        <div id="card-front" className="auth-face auth-face-front rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between shadow-[0_0_50px_rgba(255,107,53,0.15)] bg-black/80 backdrop-blur-2xl border border-white/5">
                            
                            <form onSubmit={authMode === 'signin' ? handleSignIn : handleResetPassword} className="w-full space-y-6 relative z-10">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="relative w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all font-mono"
                                            placeholder="Identify Soul (Email)"
                                        />
                                    </div>
                                    {authMode === 'signin' && (
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="relative w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/50 transition-all font-mono tracking-widest"
                                                placeholder="Cipher (Password)"
                                            />
                                        </div>
                                    )}
                                </div>

                                {errorMsg && !isFlipped && (
                                    <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3">
                                        <p className="text-[10px] text-red-400 font-mono text-center tracking-widest uppercase">{errorMsg}</p>
                                    </div>
                                )}
                                {successMsg && !isFlipped && (
                                    <div className="bg-green-950/40 border border-green-500/50 rounded-lg p-3">
                                        <p className="text-[10px] text-green-400 font-mono text-center tracking-widest uppercase">{successMsg}</p>
                                    </div>
                                )}

                                <div className="space-y-3 pt-2">
                                    <button type="submit" disabled={loading} className="w-full btn-ember py-4 rounded-xl text-xs font-bold tracking-[0.2em] shadow-lg shadow-orange-900/50 disabled:opacity-50 transition-all">
                                        {loading ? 'TRANSMITTING...' : authMode === 'signin' ? 'ENTER THE VOID' : 'SEND RECOVERY LINK'}
                                    </button>
                                    <div className="flex justify-between items-center text-[10px] font-mono px-2">
                                        {authMode === 'signin' ? (
                                            <>
                                                <button type="button" onClick={() => { setIsFlipped(true); setErrorMsg(''); setSuccessMsg(''); setEmail(''); setPassword(''); }} className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest outline-none">
                                                    SEEK INITIATION
                                                </button>
                                                <button type="button" onClick={() => { setAuthMode('reset'); setErrorMsg(''); setSuccessMsg(''); }} className="text-gray-600 hover:text-orange-500 transition-colors uppercase tracking-widest outline-none">
                                                    LOST CIPHER?
                                                </button>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }} className="w-full text-center text-gray-500 hover:text-white transition-colors uppercase tracking-widest outline-none">
                                                Return to Login
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* THE SEED (Sign Up) */}
                        <div id="card-back" className="auth-face auth-face-back rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between shadow-[0_0_50px_rgba(255,255,255,0.05)] bg-black/80 backdrop-blur-2xl border border-white/5">
                            
                            <form onSubmit={handleSignUp} className="w-full space-y-5 relative z-10">
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="relative w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-mono"
                                            placeholder="Email Signature"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="relative w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-mono tracking-widest"
                                            placeholder="Define Cipher (Password)"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="relative w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-mono tracking-widest"
                                            placeholder="Confirm Cipher"
                                        />
                                    </div>
                                </div>

                                {errorMsg && isFlipped && (
                                    <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3">
                                        <p className="text-[10px] text-red-400 font-mono text-center tracking-widest uppercase">{errorMsg}</p>
                                    </div>
                                )}
                                {successMsg && isFlipped && (
                                    <div className="bg-green-950/40 border border-green-500/50 rounded-lg p-3">
                                        <p className="text-[10px] text-green-400 font-mono text-center tracking-widest uppercase">{successMsg}</p>
                                    </div>
                                )}

                                <div className="space-y-3 pt-2">
                                    <button type="submit" disabled={loading} className="w-full bg-white text-black font-ritual font-bold py-4 rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50">
                                        {loading ? 'AWAKENING...' : 'AWAKEN'}
                                    </button>
                                    <button type="button" onClick={() => { setIsFlipped(false); setErrorMsg(''); setSuccessMsg(''); setEmail(''); setPassword(''); setConfirmPassword(''); }} className="w-full text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-mono outline-none pt-2">
                                        RETURN TO GATE
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </section>

            {/* Footer Details */}
            <footer className="bg-black py-8 border-t border-white/5 text-center relative z-40">
                <p className="text-[10px] font-mono text-gray-700 tracking-[0.3em] uppercase">
                    PROTOCOL V25.2.0 • COPYRIGHT TRUTHBTOLD HUB
                </p>
                <p className="text-[8px] font-mono text-gray-800 tracking-[0.3em] uppercase mt-2">
                    INITIATED BY LUMEN LABS
                </p>
            </footer>
        </div>
    );
}
