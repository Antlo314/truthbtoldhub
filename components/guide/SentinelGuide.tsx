'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronRight, X, Play } from 'lucide-react';
import gsap from 'gsap';
import { Howl } from 'howler';

// --- SFX ---
let uiHoverSfx: any = null;
let uiClickSfx: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export interface GuideStep {
    title: string;
    description: string;
    selector?: string; // CSS selector to highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface SentinelGuideProps {
    steps: GuideStep[];
    protocolName: string;
    onComplete?: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function SentinelGuide({ steps, protocolName, onComplete, isOpen, onClose }: SentinelGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLParagraphElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    useEffect(() => {
        if (!isOpen) return;

        const updateHighlight = () => {
            const step = steps[currentStep];
            if (step?.selector) {
                const el = document.querySelector(step.selector);
                if (el) {
                    setHighlightRect(el.getBoundingClientRect());
                    // Scroll into view if needed
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    setHighlightRect(null);
                }
            } else {
                setHighlightRect(null);
            }
        };

        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        window.addEventListener('scroll', updateHighlight);

        // Text animation for description
        if (textRef.current) {
            gsap.fromTo(textRef.current, 
                { opacity: 0, y: 5 }, 
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
        }

        return () => {
            window.removeEventListener('resize', updateHighlight);
            window.removeEventListener('scroll', updateHighlight);
        };
    }, [currentStep, isOpen, steps]);

    const handleNext = () => {
        playClick();
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        onClose();
        if (onComplete) onComplete();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dark Overlay with Hole */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-500 pointer-events-auto"
                style={{
                    clipPath: highlightRect ? `polygon(
                        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                        ${highlightRect.left}px ${highlightRect.top}px, 
                        ${highlightRect.right}px ${highlightRect.top}px, 
                        ${highlightRect.right}px ${highlightRect.bottom}px, 
                        ${highlightRect.left}px ${highlightRect.bottom}px, 
                        ${highlightRect.left}px ${highlightRect.top}px
                    )` : 'none'
                }}
            />

            {/* Pulsing Border for Highlight */}
            {highlightRect && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute border-2 border-orange-500 rounded-lg shadow-[0_0_20px_rgba(234,88,12,0.5)] pointer-events-none"
                    style={{
                        top: highlightRect.top - 4,
                        left: highlightRect.left - 4,
                        width: highlightRect.width + 8,
                        height: highlightRect.height + 8,
                    }}
                >
                    <div className="absolute inset-0 border border-orange-500 animate-ping opacity-20"></div>
                </motion.div>
            )}

            {/* Guide Modal */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md mx-4 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                    <div className="glass-panel bg-black/90 border border-orange-500/50 p-6 rounded-2xl relative overflow-hidden">
                        {/* Matrix Background Effect */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,197,94,0.1)_50%,transparent_100%)] bg-[length:100%_4px] animate-scanline"></div>
                        </div>

                        {/* Top Accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="font-ritual text-orange-500 text-sm tracking-[0.3em] font-bold uppercase mb-1">
                                    {protocolName}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-orange-500/70" />
                                    <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                                        Step {currentStep + 1} of {steps.length}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mb-6 relative z-10">
                            <h4 className="font-ritual text-white text-lg tracking-widest mb-3 uppercase">
                                {steps[currentStep].title}
                            </h4>
                            <p 
                                ref={textRef}
                                className="text-xs text-orange-200/90 font-mono tracking-widest leading-relaxed min-h-[3rem]"
                            >
                                {steps[currentStep].description}
                            </p>
                        </div>

                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex gap-1.5">
                                {steps.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            i === currentStep ? 'w-8 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]' : 'w-1.5 bg-zinc-800'
                                        }`} 
                                    />
                                ))}
                            </div>
                            <button
                                onMouseEnter={playHover}
                                onClick={handleNext}
                                className="group bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest px-8 py-3 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                            >
                                {currentStep === steps.length - 1 ? 'Acknowledge' : 'Proceed'}
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Decoration */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

