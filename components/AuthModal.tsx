'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, User as UserIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { BRAND } from '@/lib/brand/assets';

// TikTok & Google custom icons for premium visual feel
const GoogleIcon = () => (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    isGated?: boolean;
}

export default function AuthModal({ isOpen, onClose, onSuccess, isGated = false }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setInfoMsg(null);
        setLoading(true);

        try {
            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.session) {
                    setInfoMsg("The veil parts. Your soul is recognized…");
                    sacredUi.access();
                    setTimeout(() => {
                        onClose();
                        if (onSuccess) onSuccess();
                    }, 1500);
                }
            } else {
                if (!username.trim()) {
                    throw new Error("A soul name is required.");
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username.trim(),
                            display_name: username.trim(),
                            aura_color: 'Neutral'
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    // Try to manually create the profiles row to bypass triggers
                    const { error: profileError } = await supabase.from('profiles').insert([
                        {
                            id: data.user.id,
                            email: email,
                            username: username.trim(),
                            display_name: username.trim(),
                            tier: 'Initiate',
                            soul_power: 100
                        }
                    ]);

                    if (profileError) {
                        console.warn("Profile creation warning:", profileError.message);
                    }

                    if (data.session) {
                        setInfoMsg("Soul inscribed. The path opens.");
                        sacredUi.access();
                        setTimeout(() => {
                            onClose();
                            if (onSuccess) onSuccess();
                        }, 1500);
                    } else {
                        setInfoMsg("Initiation payload transmitted. Please check your email for the verification link.");
                    }
                }
            }
        } catch (err: any) {
            console.error('Auth Error:', err);
            setErrorMsg(err.message || "Aether connection failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setErrorMsg(null);
        setInfoMsg(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            setErrorMsg(err.message || "Google OAuth initialization failed.");
            setLoading(false);
        }
    };

    const handleDemoMode = () => {
        localStorage.setItem('tbth-demo', 'true');
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `sb-access-token=demo-token; path=/; SameSite=Lax${secure}`;
        
        const mockSession = {
            access_token: 'demo-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'demo-refresh-token',
            user: {
                id: 'demo-soul-id-12345',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'demo-soul@truthbtoldhub.local',
                app_metadata: { provider: 'email' },
                user_metadata: {
                    username: 'DemoSoul',
                    display_name: 'Demo Soul',
                    aura_color: 'Neutral'
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600
        };

        if ((window as any).__triggerDemoAuth) {
            (window as any).__triggerDemoAuth(mockSession);
        }

        setInfoMsg("Offline signature established. Entering local Demo Mode...");
        setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess();
        }, 1500);
    };

    return (
        <div className={isGated ? "w-full" : "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/88 backdrop-blur-md"}>
            <motion.div 
                initial={isGated ? {} : { opacity: 0, scale: 0.96, y: 16 }}
                animate={isGated ? {} : { opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-black/90 border border-aether-gold/20 rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.12)] ambient-glow"
            >
                <div
                    className="absolute inset-0 opacity-[0.14] pointer-events-none"
                    style={{
                        backgroundImage: `url(${BRAND.portal})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-aether-gold/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/5 rounded-full blur-[60px] pointer-events-none" />

                {!isGated && (
                    <button 
                        type="button"
                        onClick={() => { sacredUi.veilClose(); onClose(); }}
                        className="absolute top-6 right-6 z-20 text-white/40 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className="space-y-6 relative z-10">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-aether-gold/10 border border-aether-gold/25 rounded-2xl mx-auto flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-aether-gold animate-pulse" />
                        </div>
                        <p className="text-[9px] uppercase tracking-[0.45em] text-aether-gold/65">Cross the veil</p>
                        <h2 className="font-ritual text-2xl font-black uppercase text-white tracking-widest gold-shimmer">
                            {mode === 'login' ? 'Return to the Source' : 'Inscribe Your Soul'}
                        </h2>
                        <p className="text-[10px] text-zinc-500 tracking-wide leading-relaxed max-w-xs mx-auto">
                            {mode === 'login'
                                ? 'Sign in to continue your journey into Truth’s Hut.'
                                : 'Create a signature so your path, soul, and trust can travel with you.'}
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-500 text-[10px] uppercase font-mono tracking-widest">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {infoMsg && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-2.5 text-green-400 text-[10px] uppercase font-mono tracking-widest">
                            <Sparkles className="w-4 h-4 shrink-0 text-aether-gold" />
                            <span>{infoMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {mode === 'register' && (
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Soul Identifier (Username)</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input 
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="e.g. truthseeker"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:outline-none focus:border-aether-gold transition-colors font-mono placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={mode === 'login' ? "iamwhoiambook@gmail.com" : "you@example.com"}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:outline-none focus:border-aether-gold transition-colors font-mono placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Aether Cipher (Password)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:outline-none focus:border-aether-gold transition-colors font-mono placeholder:text-zinc-600 tracking-widest"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            onClick={() => sacredUi.click()}
                            className="w-full py-4 rounded-full text-[10px] font-black uppercase tracking-[0.22em] text-black shadow-[0_0_28px_rgba(251,191,36,0.25)] hover:scale-[1.01] transition-transform active:scale-95 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-black animate-spin" />
                            ) : (
                                mode === 'login' ? 'Enter the Sanctum' : 'Begin the Awakening'
                            )}
                        </button>
                    </form>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/5"></div>
                        <span className="flex-shrink mx-4 text-[7px] uppercase tracking-widest text-zinc-600">or</span>
                        <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => { sacredUi.click(); handleGoogleAuth(); }}
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/15 text-white py-3.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:border-aether-gold/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <button 
                        type="button"
                        onClick={() => { sacredUi.threshold(); handleDemoMode(); }}
                        className="w-full bg-aether-gold/10 border border-aether-gold/25 text-aether-gold py-3.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:bg-aether-gold/15 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Sparkles className="w-4 h-4 text-aether-gold" />
                        Walk in Demo Mode
                    </button>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => { sacredUi.whoosh(); setMode(mode === 'login' ? 'register' : 'login'); }}
                            className="text-[9px] uppercase tracking-widest text-zinc-500 hover:text-aether-gold transition-colors"
                        >
                            {mode === 'login' ? 'New soul? Inscribe here' : 'Already walking? Sign in'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
