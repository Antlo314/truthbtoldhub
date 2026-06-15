'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { MessageSquare, Send, X, Flame, ShieldAlert, Sparkles, User, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

// --- SFX ---
let bubbleHoverSfx: any = null;
let bubbleClickSfx: any = null;

export default function FloatingOracle() {
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatButtonRef = useRef<HTMLButtonElement>(null);
    const pathname = usePathname();

    const { messages, input, handleInputChange, handleSubmit, isLoading } = (useChat as any)({
        api: '/api/nehemiah',
        initialMessages: [
            { 
                id: 'init', 
                role: 'assistant', 
                content: "Sibling. I am Nehemiah. We ain't here for lip service—we here to rebuild the walls. What you bringing to the table? Resources? Funding? Leadership? Or you just observing the void?" 
            }
        ]
    });

    useEffect(() => {
        setMounted(true);

        // Fetch current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        const initHowler = async () => {
            try {
                const { Howl } = await import('howler');
                if (!bubbleHoverSfx) {
                    bubbleHoverSfx = new Howl({ 
                        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], 
                        volume: 0.05 
                    });
                }
                if (!bubbleClickSfx) {
                    bubbleClickSfx = new Howl({ 
                        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], 
                        volume: 0.15 
                    });
                }
            } catch (err) {
                console.error("Failed to load Howler client SFX:", err);
            }
        };
        initHowler();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const playHover = () => {
        try {
            bubbleHoverSfx?.play();
        } catch (e) {
            console.warn("Failed to play hover SFX:", e);
        }
    };
    const playClick = () => {
        try {
            bubbleClickSfx?.play();
        } catch (e) {
            console.warn("Failed to play click SFX:", e);
        }
    };

    // Auto scroll to bottom
    useEffect(() => {
        if (isOpen && chatEndRef.current) {
            try {
                chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
            } catch (e) {
                console.warn("scrollIntoView failed:", e);
            }
        }
    }, [messages, isOpen]);

    // Notify user of new messages if widget is closed
    useEffect(() => {
        if (messages && messages.length > 1 && !isOpen) {
            setHasNewMessage(true);
        }
    }, [messages, isOpen]);

    const handleToggle = () => {
        playClick();
        setIsOpen(!isOpen);
        if (!isOpen) {
            setHasNewMessage(false);
        }
    };

    // Hide the oracle inside the game so it never blocks the controls / breaks immersion.
    const onGameRoute = pathname?.startsWith('/world') || pathname?.startsWith('/awakening');
    if (!mounted || !user || onGameRoute) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-end">
            
            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-[calc(100vw-2rem)] sm:w-96 h-[480px] bg-black/95 border border-orange-500/30 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col mb-4 relative z-10 glass-panel"
                    >
                        {/* High-tech scanline visual accent */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(234,88,12,0.2)_50%,transparent_100%)] bg-[length:100%_4px] animate-scanline"></div>
                        </div>

                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/70 to-transparent"></div>

                        {/* Panel Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/40 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-600/10 border border-orange-500/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(234,88,12,0.2)]">
                                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-ritual text-xs text-white tracking-[0.2em] font-black uppercase">NEHEMIAH</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></div>
                                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Sovereign Sentinel</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleToggle}
                                className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Message Feed */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10">
                            {(messages || []).map((m: any) => {
                                const isAI = m.role === 'assistant';
                                return (
                                    <div key={m.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                                        <div className={`flex gap-3 max-w-[85%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
                                            {/* Avatar node */}
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 text-[10px] font-bold ${
                                                isAI ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-white/5 border-white/10 text-white'
                                            }`}>
                                                {isAI ? <Flame className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                            </div>
                                            
                                            {/* Bubble */}
                                            <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed uppercase tracking-wider font-mono ${
                                                isAI 
                                                    ? 'bg-zinc-900/40 text-orange-200 border border-orange-500/10' 
                                                    : 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.2)]'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-black/40 relative z-10 flex gap-2">
                            <input
                                value={input || ''}
                                onChange={handleInputChange}
                                placeholder="State your work or query..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/30 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input || !input.trim() || isLoading}
                                className="w-10 h-10 bg-orange-600 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-40 disabled:hover:bg-orange-600 shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Bubble */}
            <motion.button
                ref={chatButtonRef}
                onClick={handleToggle}
                onMouseEnter={playHover}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all cursor-pointer relative shadow-2xl ${
                    isOpen 
                        ? 'bg-zinc-950 border-orange-500/50 text-orange-500' 
                        : 'bg-orange-600 border-orange-500/55 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] hover:bg-orange-500'
                }`}
            >
                {isOpen ? (
                    <ChevronDown className="w-6 h-6 animate-bounce" />
                ) : (
                    <>
                        <MessageSquare className="w-6 h-6" />
                        {hasNewMessage && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">!</span>
                        )}
                        {/* Pulsing ring */}
                        {!isOpen && (
                            <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-20 pointer-events-none"></div>
                        )}
                    </>
                )}
            </motion.button>

        </div>
    );
}
