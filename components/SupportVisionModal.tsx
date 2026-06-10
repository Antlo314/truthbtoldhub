'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ExternalLink } from 'lucide-react';

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
    const handleClose = () => {
        playSfx?.('click');
        onClose();
    };

    const handleSupport = () => {
        playSfx?.('click');
        onSupport();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-2xl"
                >
                    <motion.div
                        initial={{ scale: 0.92, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.92, y: 30, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] border border-white/15 shadow-[0_0_120px_rgba(212,175,55,0.15)]"
                    >
                        <div className="absolute inset-0">
                            <img
                                src="/cineworks/poster1.png"
                                alt=""
                                className="w-full h-full object-cover opacity-30"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-[#050505]/70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12)_0%,transparent_60%)]" />
                        </div>

                        <button
                            onClick={handleClose}
                            className="absolute top-5 right-5 z-20 p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all active:scale-90"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center space-y-8">
                            <div className="w-20 h-20 rounded-3xl overflow-hidden border border-aether-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.2)]">
                                <img src="/viralcartel/400_manga_logo.jpg" alt="Truth B Told" className="w-full h-full object-cover" />
                            </div>

                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-aether-gold/30 bg-aether-gold/5">
                                    <Heart className="w-3 h-3 text-aether-gold" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-aether-gold">Vision Transmission</span>
                                </div>
                                <h2 className="font-ritual text-2xl md:text-4xl font-black uppercase text-white gold-shimmer leading-tight">
                                    Support the Truth B Told Vision
                                </h2>
                                <p className="text-sm md:text-base text-white/70 font-medium tracking-wide">
                                    <span className="text-aether-gold font-black">@truufbtold</span>
                                    <span className="text-white/40 mx-2">·</span>
                                    <span className="text-white italic">&apos;Ant Cee&apos;</span>
                                </p>
                                <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-[0.25em] leading-relaxed max-w-md mx-auto">
                                    The 400 Series is on pause until we are fiscally solid. Fuel the mission now to restore production.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                <button
                                    onClick={handleSupport}
                                    className="flex-1 py-4 px-6 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                                >
                                    Support the Vision
                                </button>
                                <a
                                    href="https://youtube.com/@truufbtold"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => playSfx?.('click')}
                                    className="flex-1 py-4 px-6 bg-white/5 border border-white/15 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <YoutubeIcon className="w-4 h-4" />
                                    Follow
                                </a>
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <a href="https://youtube.com/@truufbtold" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-aether-gold transition-colors">
                                    <YoutubeIcon className="w-5 h-5" />
                                </a>
                                <a href="https://tiktok.com/@truufbtold" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-aether-gold transition-colors">
                                    <TikTokIcon className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://donate.stripe.com/3cIdRabXw4MW8kzf7v8EM01"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => playSfx?.('click')}
                                    className="text-white/40 hover:text-aether-gold transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}