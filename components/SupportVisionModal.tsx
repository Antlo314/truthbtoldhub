'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';

const CASH_APP_URL = 'https://cash.app/$truufbtold';

const YoutubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" />
    </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2.12h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
    </svg>
);

interface SupportVisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSupport: () => void;
    playSfx?: (key: string) => void;
}

export default function SupportVisionModal({ isOpen, onClose, onSupport, playSfx }: SupportVisionModalProps) {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;

        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overscrollBehavior = 'none';

        return () => {
            html.style.overflow = '';
            body.style.overflow = '';
            body.style.position = '';
            body.style.top = '';
            body.style.left = '';
            body.style.right = '';
            body.style.width = '';
            body.style.overscrollBehavior = '';
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);

    const handleClose = () => {
        playSfx?.('click');
        onClose();
    };

    const handleSupport = () => {
        playSfx?.('click');
        onSupport();
        onClose();
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black/95 p-4 backdrop-blur-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="support-vision-title"
                >
                    <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_0_120px_rgba(212,175,55,0.2)] md:max-w-lg md:rounded-[2.5rem]"
                    >
                        <div className="absolute inset-0">
                            <img
                                src="/images/cineworks/poster1.png"
                                alt=""
                                className="h-full w-full object-cover opacity-25"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-[#050505]/80" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15)_0%,transparent_60%)]" />
                        </div>

                        <button
                            onClick={handleClose}
                            className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-white/5 p-2.5 text-white/50 transition-all hover:border-white/30 hover:text-white active:scale-90"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center justify-center overflow-y-auto p-6 text-center md:p-8">
                            <div className="mb-5 h-16 w-16 overflow-hidden rounded-2xl border border-aether-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.2)] md:h-20 md:w-20 md:rounded-3xl">
                                <img src="/viralcartel/400_manga_logo.jpg" alt="Truth B Told" className="h-full w-full object-cover" />
                            </div>

                            <div className="mb-6 space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-aether-gold/30 bg-aether-gold/5 px-4 py-1.5">
                                    <Heart className="h-3 w-3 text-aether-gold" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Vision Transmission</span>
                                </div>
                                <h2 id="support-vision-title" className="font-ritual text-xl font-black uppercase leading-tight text-white md:text-3xl">
                                    Support the Truth B Told Vision
                                </h2>
                                <p className="text-sm font-medium tracking-wide text-white/70 md:text-base">
                                    <a
                                        href={CASH_APP_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => playSfx?.('click')}
                                        className="font-black text-[#00D632] underline-offset-4 transition-colors hover:underline"
                                    >
                                        @truufbtold
                                    </a>
                                    <span className="mx-2 text-white/40">·</span>
                                    <span className="italic text-white">&apos;Ant Cee&apos;</span>
                                </p>
                                <p className="mx-auto max-w-sm text-[10px] uppercase leading-relaxed tracking-[0.2em] text-white/40 md:text-xs">
                                    The 400 Series is on pause until we are fiscally solid. Fuel the mission now to restore production.
                                </p>
                            </div>

                            <div className="flex w-full max-w-xs flex-col gap-3">
                                <a
                                    href={CASH_APP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => playSfx?.('click')}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D632] px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-black shadow-[0_0_40px_rgba(0,214,50,0.35)] transition-transform hover:scale-[1.02] active:scale-95"
                                >
                                    Cash App · @truufbtold
                                </a>
                                <button
                                    onClick={handleSupport}
                                    className="w-full rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-transform hover:scale-[1.02] active:scale-95"
                                >
                                    Support via Stripe
                                </button>
                            </div>

                            <div className="mt-5 flex items-center justify-center gap-6">
                                <a href="https://youtube.com/@truufbtold" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-aether-gold">
                                    <YoutubeIcon className="h-5 w-5" />
                                </a>
                                <a href="https://tiktok.com/@truufbtold" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-aether-gold">
                                    <TikTokIcon className="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}