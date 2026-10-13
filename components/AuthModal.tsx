'use client';

/**
 * Sign in / create account — one modal for the whole hub.
 *
 * Always a true overlay, portalled to <body>. It used to have an inline
 * "gated" mode that Truth.OS used: inside the OS shell (whose layers are all
 * absolutely positioned) that inline block painted UNDER the wallpaper, with
 * no close button, so Sign in looked like it flickered and did nothing.
 * Portalling also escapes any transformed or contained ancestor (a window,
 * the house's panels), so the modal is always on top and always centred.
 *
 * The old "Walk in Demo Mode" button is gone: it faked a signed-in session
 * with no account behind it, so the OS showed you as signed in while every
 * save and profile call failed.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const GoogleIcon = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

type Mode = 'login' | 'register' | 'reset';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    /** A quiet text button under the card, e.g. "Keep playing as guest" */
    dismissLabel?: string;
    /** @deprecated ignored — the modal is always an overlay now */
    isGated?: boolean;
}

/** Supabase's messages, said the way a person would */
function friendly(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('invalid login')) return 'That email and password don’t match. Try again, or reset your password.';
    if (m.includes('email not confirmed')) return 'Confirm your email first — the link is in your inbox.';
    if (m.includes('already registered') || m.includes('already been registered')) return 'That email already has an account. Sign in instead.';
    if (m.includes('password should be')) return 'Use a password of at least 6 characters.';
    if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed') || m.includes('fetch')) {
        // a phone that is offline knows it; otherwise the fault is ours
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'You’re offline. Check your connection and try again.';
        return 'The sign-in service isn’t answering right now. That’s on our side, not yours — please try again a little later.';
    }
    return message;
}

export default function AuthModal({ isOpen, onClose, onSuccess, dismissLabel }: AuthModalProps) {
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [busy, setBusy] = useState<false | 'email' | 'google'>(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    /** the account service did not answer when the box opened */
    const [serviceDown, setServiceDown] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstField = useRef<HTMLInputElement>(null);

    useEffect(() => setMounted(true), []);

    // Fresh state every time it opens; focus the first field
    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setInfo(null);
        setBusy(false);
        const t = setTimeout(() => firstField.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [isOpen]);

    // Ask the account service if it is there, so a dead backend reads as
    // "offline on our side" instead of a button that silently does nothing
    useEffect(() => {
        if (!isOpen) return;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            setServiceDown(true);
            return;
        }
        let dead = false;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 7000);
        fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: ctrl.signal })
            .then((r) => {
                if (!dead) setServiceDown(!r.ok && r.status >= 500);
            })
            .catch(() => {
                if (!dead) setServiceDown(typeof navigator === 'undefined' || navigator.onLine !== false);
            })
            .finally(() => clearTimeout(timer));
        return () => {
            dead = true;
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [isOpen, onClose]);

    useEffect(
        () => () => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
        },
        [],
    );

    const succeed = (message: string) => {
        try {
            localStorage.removeItem('tbth-demo');
        } catch {
            /* private mode */
        }
        setInfo(message);
        sacredUi.access();
        closeTimer.current = setTimeout(() => {
            onClose();
            onSuccess?.();
        }, 700);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError(null);
        setInfo(null);
        setBusy('email');
        try {
            if (mode === 'reset') {
                const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/`,
                });
                if (err) throw err;
                setInfo('If that email has an account, a reset link is on its way.');
                return;
            }
            if (mode === 'login') {
                const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (err) throw err;
                if (data.session) succeed('Welcome back.');
                return;
            }
            const name = username.trim();
            if (!name) throw new Error('Choose a name for your soul.');
            const { data, error: err } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username: name, display_name: name, aura_color: 'Neutral' } },
            });
            if (err) throw err;
            if (data.user) {
                // The profiles trigger normally creates this row. Only the
                // self-owned columns are sent: tier and soul power are
                // server-only and a client insert with them is refused.
                await supabase
                    .from('profiles')
                    .insert([{ id: data.user.id, username: name, display_name: name }])
                    .then(({ error: pe }) => {
                        if (pe && !/duplicate|already exists/i.test(pe.message)) console.warn('profile insert:', pe.message);
                    });
            }
            if (data.session) succeed('Your soul is inscribed. Welcome.');
            else setInfo('Check your email to confirm your account, then sign in.');
        } catch (err) {
            setError(friendly(err instanceof Error ? err.message : 'Something went wrong.'));
        } finally {
            setBusy(false);
        }
    };

    const google = async () => {
        if (busy) return;
        setError(null);
        setInfo(null);
        setBusy('google');
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/` },
            });
            if (err) throw err;
            // The browser is leaving for Google; keep the spinner until it does
        } catch (err) {
            setError(friendly(err instanceof Error ? err.message : 'Google sign-in failed.'));
            setBusy(false);
        }
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        setError(null);
        setInfo(null);
        sacredUi.click();
    };

    if (!mounted) return null;

    const field =
        'h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-amber-300/60 focus:bg-white/[0.08]';

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="auth"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                    data-allow-select
                >
                    <div className="w-full max-w-[380px]">
                        <motion.div
                            initial={{ opacity: 0, y: 14, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            role="dialog"
                            aria-modal="true"
                            aria-label={mode === 'register' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in'}
                            className="relative overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#14161e]/95 p-6 text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] font-sans"
                        >
                            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
                            <button
                                type="button"
                                onClick={() => {
                                    sacredUi.veilClose();
                                    onClose();
                                }}
                                aria-label="Close"
                                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-white/60 transition-colors hover:bg-white/[0.14] hover:text-white"
                            >
                                <X size={15} />
                            </button>

                            <div className="relative mb-5">
                                <span className="bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-[28px] font-black leading-none text-transparent">✦</span>
                                <h2 className="mt-2 text-[22px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                                    {mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in'}
                                </h2>
                                <p className="mt-1 text-[13px] leading-snug text-white/55">
                                    {mode === 'reset'
                                        ? 'We’ll email you a link to set a new one.'
                                        : 'Your soul power, your mark and your scores travel with you.'}
                                </p>
                            </div>

                            {mode !== 'reset' && (
                                <div className="mb-4 grid grid-cols-2 rounded-xl bg-white/[0.06] p-1">
                                    {(['login', 'register'] as const).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => switchMode(m)}
                                            className={`h-8 rounded-lg text-[13px] font-medium transition-colors ${
                                                mode === m ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white/85'
                                            }`}
                                        >
                                            {m === 'login' ? 'Sign in' : 'Create account'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {serviceDown && !error && (
                                <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[12.5px] leading-snug text-amber-100">
                                    <AlertCircle size={15} className="mt-px shrink-0" /> Sign-in is offline right now — the account service isn’t answering. That’s on our side, not yours. You can keep exploring as a guest; your progress on this device is kept.
                                </p>
                            )}
                            {error && (
                                <p className="mb-3 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-[12.5px] leading-snug text-rose-200">
                                    <AlertCircle size={15} className="mt-px shrink-0" /> {error}
                                </p>
                            )}
                            {info && (
                                <p className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-[12.5px] leading-snug text-emerald-200">
                                    <CheckCircle2 size={15} className="mt-px shrink-0" /> {info}
                                </p>
                            )}

                            <form onSubmit={submit} className="space-y-3">
                                {mode === 'register' && (
                                    <label className="relative block">
                                        <span className="sr-only">Name</span>
                                        <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                                        <input
                                            ref={firstField}
                                            type="text"
                                            required
                                            autoComplete="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Your name in the sanctum"
                                            maxLength={32}
                                            className={field}
                                        />
                                    </label>
                                )}
                                <label className="relative block">
                                    <span className="sr-only">Email</span>
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                                    <input
                                        ref={mode === 'register' ? undefined : firstField}
                                        type="email"
                                        required
                                        autoComplete="email"
                                        inputMode="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email"
                                        className={field}
                                    />
                                </label>
                                {mode !== 'reset' && (
                                    <label className="relative block">
                                        <span className="sr-only">Password</span>
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Password"
                                            className={field}
                                        />
                                    </label>
                                )}
                                {mode === 'login' && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => switchMode('reset')}
                                            className="text-[12px] text-white/50 hover:text-amber-200"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={!!busy}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg,#fde68a 0%,#f59e0b 55%,#b45309 100%)' }}
                                >
                                    {busy === 'email' ? (
                                        <Loader2 size={17} className="animate-spin" />
                                    ) : mode === 'register' ? (
                                        'Create account'
                                    ) : mode === 'reset' ? (
                                        'Send reset link'
                                    ) : (
                                        'Sign in'
                                    )}
                                </button>
                            </form>

                            {mode === 'reset' ? (
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="mt-4 w-full text-center text-[13px] text-white/55 hover:text-white"
                                >
                                    Back to sign in
                                </button>
                            ) : (
                                <>
                                    <div className="my-4 flex items-center gap-3 text-[12px] text-white/35">
                                        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            sacredUi.click();
                                            void google();
                                        }}
                                        disabled={!!busy}
                                        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.06] text-[14px] font-medium text-white transition-colors hover:bg-white/[0.1] disabled:opacity-60"
                                    >
                                        {busy === 'google' ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon />}
                                        Continue with Google
                                    </button>
                                </>
                            )}
                        </motion.div>
                        {dismissLabel && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full py-2 text-center text-[13px] text-white/55 hover:text-white"
                            >
                                {dismissLabel}
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
