'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Gateway() {
    const router = useRouter();
    const [isFlipped, setIsFlipped] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

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
            setErrorMsg(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

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

            // Auto-login or wait for confirmation depending on Supabase settings.
            if (data?.session) {
                router.push('/sanctum');
            } else {
                setErrorMsg('Initiation successful. Check email or re-enter the Gate.');
            }
        } catch (err: any) {
            console.error(err.message);
            setErrorMsg(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-orange-500/30">
            <div id="stars-container" className="fixed inset-0 z-0 bg-[url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_void.png')] bg-cover bg-center opacity-80 mix-blend-screen"></div>

            <main className="relative z-10 w-full max-w-sm px-4 md:px-0" id="auth-container-wrapper">
                <div id="auth-container" className={`auth-card-inner ${isFlipped ? 'is-flipped' : ''}`}>

                    {/* THE GATE (Sign In) */}
                    <div id="card-front" className="auth-face auth-face-front rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between shadow-[0_0_50px_rgba(255,107,53,0.15)] bg-black/80 backdrop-blur-2xl border border-white/5">
                        <div className="text-center space-y-2 mt-4 animate-fade-in relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-600/20 blur-[50px] rounded-full"></div>
                            <h1 className="font-ritual text-4xl font-bold tracking-[0.2em] relative z-10">
                                <span className="text-white drop-shadow-lg">SACRED</span>
                                <span className="block text-orange-500 mt-2 text-2xl amber-glow drop-shadow-[0_0_15px_rgba(255,107,53,0.6)]">SANCTUM</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-mono tracking-[0.3em] uppercase mt-4">The Obsidian Void</p>
                        </div>

                        <form onSubmit={handleSignIn} className="w-full space-y-6 mt-8 relative z-10 animate-fade-in">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="relative w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                                        placeholder="Identify Soul (Email)"
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-amber-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="relative w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors font-mono tracking-widest"
                                        placeholder="Cipher (Password)"
                                    />
                                </div>
                            </div>

                            {errorMsg && !isFlipped && (
                                <p className="text-[10px] text-red-500 font-mono text-center tracking-widest uppercase animate-fade-in">{errorMsg}</p>
                            )}

                            <div className="space-y-3 pt-2">
                                <button type="submit" disabled={loading} className="w-full btn-ember py-4 rounded-xl text-xs shadow-lg shadow-orange-900/50 disabled:opacity-50">
                                    {loading ? 'AUTHENTICATING...' : 'ENTER THE VOID'}
                                </button>
                                <div className="flex justify-between items-center text-[10px] font-mono px-2">
                                    <button type="button" onClick={() => { setIsFlipped(true); setErrorMsg(''); setEmail(''); setPassword(''); }} className="text-gray-500 hover:text-white transition-colors uppercase tracking-widest outline-none">
                                        SEEK INITIATION
                                    </button>
                                    <button type="button" className="text-gray-600 hover:text-orange-500 transition-colors uppercase tracking-widest outline-none">
                                        LOST CIPHER?
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* THE SEED (Sign Up) */}
                    <div id="card-back" className="auth-face auth-face-back rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between shadow-[0_0_50px_rgba(255,255,255,0.05)] bg-black/80 backdrop-blur-2xl border border-white/5">
                        <div className="text-center space-y-2 mt-4 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/10 blur-[50px] rounded-full"></div>
                            <h2 className="font-ritual text-3xl font-bold tracking-[0.2em] relative z-10 text-white drop-shadow-md">
                                PLANT THE SEED
                            </h2>
                            <p className="text-[9px] text-gray-500 font-mono tracking-[0.3em] uppercase mt-2">New Soul Registration</p>
                        </div>

                        <form onSubmit={handleSignUp} className="w-full space-y-5 mt-6 relative z-10">
                            <div className="space-y-3">
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="relative w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors font-mono"
                                        placeholder="Email Signature"
                                    />
                                </div>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="relative w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors font-mono tracking-widest"
                                        placeholder="Define Cipher (Password)"
                                    />
                                </div>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="relative w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors font-mono tracking-widest"
                                        placeholder="Confirm Cipher"
                                    />
                                </div>
                            </div>

                            {errorMsg && isFlipped && (
                                <p className="text-[10px] text-red-500 font-mono text-center tracking-widest uppercase animate-fade-in">{errorMsg}</p>
                            )}

                            <div className="space-y-3 pt-2">
                                <button type="submit" disabled={loading} className="w-full bg-white text-black font-ritual font-bold py-4 rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50">
                                    {loading ? 'AWAKENING...' : 'AWAKEN'}
                                </button>
                                <button type="button" onClick={() => { setIsFlipped(false); setErrorMsg(''); setEmail(''); setPassword(''); setConfirmPassword(''); }} className="w-full text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-mono outline-none pt-2">
                                    RETURN TO GATE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* Footer Details */}
            <footer className="fixed bottom-6 w-full text-center z-10 pointer-events-none">
                <p className="text-[8px] font-mono text-gray-700 tracking-[0.3em] uppercase">
                    PROTOCOL V25.2.0 • NEXT.JS ROUTER INITIALIZED
                </p>
            </footer>
        </div>
    );
}
