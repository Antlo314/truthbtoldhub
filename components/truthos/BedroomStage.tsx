'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import { useTruthOs, detectDevice } from './truthOsStore';
import TruthOSShell from './TruthOSShell';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';

/**
 * Modern bedroom staging — Matrix first-contact energy.
 * Desktop: desk PC → login → Truth.OS
 * Phone: device on bed → login → Truth.OS mobile
 * 3D Chamber remains at /world (Chamber.exe)
 */
export default function BedroomStage() {
    const { phase, openDevice, closeToRoom, enterOs } = useTruthOs();
    const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
    const [authed, setAuthed] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [rabbit, setRabbit] = useState(true);

    usePageMusic('title_landing');

    useEffect(() => {
        applyMusicSetting(loadSettings().music);
        setDevice(detectDevice());
        const onR = () => setDevice(detectDevice());
        window.addEventListener('resize', onR);

        supabase.auth.getSession().then(({ data }) => {
            setAuthed(!!data.session);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setAuthed(!!session);
        });

        const t = setTimeout(() => setRabbit(false), 5000);
        return () => {
            window.removeEventListener('resize', onR);
            sub.subscription.unsubscribe();
            clearTimeout(t);
        };
    }, []);

    // If already authed and they open device, go straight to OS
    const onDeviceActivate = () => {
        sacredUi.click();
        openDevice();
        if (authed) {
            enterOs();
        } else {
            setAuthOpen(true);
        }
    };

    const onAuthSuccess = () => {
        setAuthed(true);
        setAuthOpen(false);
        enterOs();
        sacredUi.access();
    };

    const onLogout = async () => {
        await supabase.auth.signOut();
        setAuthed(false);
        closeToRoom();
    };

    const inOs = phase === 'os';
    const showLock = phase === 'device-lock' && !authed;

    return (
        <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0a0a0c] select-none">
            {/* ROOM — 3rd person staging */}
            <div
                className={`absolute inset-0 transition-all duration-700 ${
                    inOs ? 'scale-110 opacity-30 blur-sm pointer-events-none' : 'opacity-100'
                }`}
            >
                {device === 'phone' ? (
                    <MobileBedroom onPhone={onDeviceActivate} rabbit={rabbit} />
                ) : (
                    <DesktopBedroom onComputer={onDeviceActivate} rabbit={rabbit} />
                )}
            </div>

            {/* Hint */}
            {!inOs && phase === 'room' && (
                <div className="absolute bottom-8 inset-x-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-400/70 font-mono">
                        follow the white rabbit
                    </p>
                    <p className="text-xs text-white/40">
                        {device === 'phone' ? 'Tap the phone on the bed' : 'Click the computer on the desk'}
                    </p>
                </div>
            )}

            {/* Auth on device glass */}
            <AnimatePresence>
                {showLock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    >
                        <div
                            className={`w-full ${
                                device === 'phone' ? 'max-w-[340px]' : 'max-w-md'
                            } rounded-2xl border border-emerald-500/20 bg-black/90 overflow-hidden shadow-[0_0_60px_rgba(34,197,94,0.12)]`}
                        >
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <span className="font-mono text-[11px] text-emerald-400/80 tracking-widest">
                                    DEVICE LOCK
                                </span>
                                <button
                                    type="button"
                                    className="text-xs text-white/40 hover:text-white"
                                    onClick={() => closeToRoom()}
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="p-2">
                                <AuthModal
                                    isOpen
                                    isGated
                                    onClose={() => {
                                        setAuthOpen(false);
                                        closeToRoom();
                                    }}
                                    onSuccess={onAuthSuccess}
                                />
                            </div>
                            <p className="px-6 pb-4 text-[11px] text-center text-zinc-600 font-mono">
                                authenticate to boot Truth.OS
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Truth.OS fullscreen on device */}
            <AnimatePresence>
                {inOs && (
                    <motion.div
                        initial={{ opacity: 0, scale: device === 'phone' ? 0.92 : 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={
                            device === 'phone'
                                ? 'absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-16px,390px)] h-[min(100dvh-24px,780px)] rounded-[2rem] overflow-hidden border-4 border-zinc-800 shadow-2xl'
                                : 'absolute z-50 inset-[3%] md:inset-[4%] rounded-xl overflow-hidden border border-zinc-700/80 shadow-[0_0_80px_rgba(0,0,0,0.8)]'
                        }
                    >
                        <TruthOSShell mode={device} onLogout={onLogout} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Non-gated auth fallback (if authOpen without lock UI) */}
            {authOpen && !showLock && (
                <AuthModal
                    isOpen={authOpen}
                    onClose={() => setAuthOpen(false)}
                    onSuccess={onAuthSuccess}
                />
            )}
        </div>
    );
}

function DesktopBedroom({
    onComputer,
    rabbit,
}: {
    onComputer: () => void;
    rabbit: boolean;
}) {
    return (
        <div className="absolute inset-0 bg-[#121018]">
            {/* walls */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1525] via-[#14101c] to-[#0c0a12]" />
            {/* window night city glow */}
            <div className="absolute top-[8%] right-[12%] w-[28%] h-[32%] rounded-sm bg-gradient-to-br from-indigo-900/40 via-violet-950/30 to-cyan-900/20 border border-white/5 shadow-[inset_0_0_40px_rgba(99,102,241,0.15)]">
                <div className="absolute inset-2 opacity-40">
                    <div className="absolute bottom-0 left-[10%] w-[12%] h-[40%] bg-white/10" />
                    <div className="absolute bottom-0 left-[30%] w-[8%] h-[55%] bg-white/15" />
                    <div className="absolute bottom-0 left-[50%] w-[15%] h-[35%] bg-cyan-400/10" />
                    <div className="absolute bottom-0 left-[75%] w-[10%] h-[48%] bg-white/10" />
                </div>
            </div>
            {/* floor */}
            <div className="absolute bottom-0 inset-x-0 h-[38%] bg-gradient-to-t from-[#0a080c] to-[#16121c]" />
            {/* bed */}
            <div className="absolute bottom-[18%] left-[8%] w-[36%] h-[22%] rounded-lg bg-[#1e1830] border border-white/5 shadow-xl">
                <div className="absolute top-2 left-3 right-3 h-[40%] rounded bg-[#2a2240]/60" />
                <div className="absolute bottom-3 left-4 w-16 h-10 rounded bg-[#252038]" />
            </div>
            {/* desk */}
            <div className="absolute bottom-[14%] right-[10%] w-[42%] h-[12%] rounded-sm bg-[#2a2218] border border-amber-900/20 shadow-2xl" />
            {/* monitor — clickable */}
            <button
                type="button"
                onClick={onComputer}
                className="absolute bottom-[26%] right-[16%] w-[28%] aspect-[16/11] group cursor-pointer"
                aria-label="Turn on computer"
            >
                <div className="absolute inset-0 rounded-md bg-[#1a1a1e] border border-zinc-600 shadow-2xl group-hover:border-emerald-500/50 transition-colors">
                    <div className="absolute inset-[6%] rounded-sm bg-black overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-mono text-[clamp(10px,1.2vw,14px)] text-emerald-400/80 tracking-[0.2em] group-hover:text-emerald-300 animate-pulse">
                                wake
                            </span>
                        </div>
                        {/* scanlines */}
                        <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                backgroundImage:
                                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                            }}
                        />
                    </div>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[20%] h-3 bg-zinc-700 rounded-b" />
            </button>
            {/* keyboard */}
            <div className="absolute bottom-[16%] right-[20%] w-[18%] h-[3%] rounded-sm bg-zinc-800/90 border border-zinc-700" />
            {/* white rabbit flash */}
            <AnimatePresence>
                {rabbit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 4, times: [0, 0.1, 0.7, 1] }}
                        className="absolute top-[42%] left-[22%] text-white/90 font-mono text-xs tracking-widest"
                    >
                        🐇
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute top-6 left-6 font-mono text-[10px] text-white/20 tracking-[0.3em]">
                SOMEWHERE · NOW
            </div>
        </div>
    );
}

function MobileBedroom({
    onPhone,
    rabbit,
}: {
    onPhone: () => void;
    rabbit: boolean;
}) {
    return (
        <div className="absolute inset-0 bg-[#100e16]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1528] to-[#0a0810]" />
            {/* bed */}
            <div className="absolute bottom-[8%] left-[4%] right-[4%] h-[55%] rounded-t-3xl bg-[#1c1830] border border-white/5">
                <div className="absolute top-6 left-6 right-6 h-[30%] rounded-2xl bg-[#2a2440]/50" />
                {/* phone on bed */}
                <button
                    type="button"
                    onClick={onPhone}
                    className="absolute top-[38%] left-1/2 -translate-x-1/2 w-[42%] max-w-[180px] aspect-[9/19] group"
                    aria-label="Unlock phone"
                >
                    <div className="absolute inset-0 rounded-[1.5rem] bg-zinc-900 border-2 border-zinc-700 shadow-2xl group-hover:border-emerald-500/50 transition-colors p-1.5">
                        <div className="w-full h-full rounded-[1.1rem] bg-black overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/15 to-transparent" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <span className="font-mono text-[10px] text-emerald-400/90 tracking-[0.25em] animate-pulse">
                                    truth
                                </span>
                                <span className="text-[9px] text-white/30">tap to unlock</span>
                            </div>
                        </div>
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-zinc-800" />
                    </div>
                </button>
            </div>
            <AnimatePresence>
                {rabbit && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 3.5 }}
                        className="absolute top-[18%] inset-x-0 text-center font-mono text-[11px] text-emerald-400/50 tracking-[0.35em]"
                    >
                        follow the white rabbit
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
