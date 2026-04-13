'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Send, Globe, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function MissionConfirmed() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);
    
    // Refs for GSAP animations
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLHeadingElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const borderPulseRef = useRef<HTMLDivElement>(null);
    const bgGlowRef = useRef<HTMLDivElement>(null);
    const humRef = useRef<any>(null);

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(headerRef.current, 
            { y: 30, opacity: 0, filter: 'blur(10px)' }, 
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, delay: 0.5 }
        )
        .fromTo(bodyRef.current, 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 1, stagger: 0.2 }, 
            '-=0.8'
        )
        .fromTo(formRef.current, 
            { scale: 0.95, opacity: 0, filter: 'blur(5px)' }, 
            { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1 }, 
            '-=0.6'
        )
        .fromTo(footerRef.current, 
            { opacity: 0 }, 
            { opacity: 0.5, duration: 1.5 }, 
            '-=0.5'
        );
    }, { scope: containerRef });

    // Modal Entrance Glitch & Pulsing Border
    useGSAP(() => {
        if (isModalOpen) {
            // Glitch Intro
            gsap.fromTo(modalRef.current, 
                { scale: 1.1, opacity: 0, filter: 'brightness(2) contrast(1.5)' },
                { scale: 1, opacity: 1, filter: 'brightness(1) contrast(1)', duration: 0.4, ease: "steps(4)" }
            );

            // Pulsing Border
            gsap.to(borderPulseRef.current, {
                opacity: 0.4,
                scale: 1.02,
                duration: 1,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            // BG Flickering Glow
            gsap.to(bgGlowRef.current, {
                opacity: 0.3,
                duration: 0.2,
                repeat: -1,
                yoyo: true,
                ease: "rough({ template: none, strength: 1, points: 20, taper: 'none', randomize: true, clamp: false })"
            });
        }
    }, { dependencies: [isModalOpen], scope: containerRef });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Play click / submission SFX would go here
        
        setTimeout(() => {
            setIsSubmitting(false);
            setIsModalOpen(true);
            setIsGlitching(true);
            // Play "faint electrical hum"
            if (typeof Audio !== 'undefined') {
                humRef.current = new Audio('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3');
                humRef.current.volume = 0.1;
                humRef.current.loop = true;
                humRef.current.play().catch(() => {});
            }
        }, 1200);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsRegistered(true);
        if (humRef.current) {
            humRef.current.pause();
            humRef.current = null;
        }
    };

    const downloadPerk = () => {
        const link = document.createElement('a');
        link.href = '/images/the-cleanser-perk.png';
        link.download = 'TruthBTold-FoundingSupporter-Perk.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div ref={containerRef} className="relative min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6 overflow-hidden">
            
            {/* BACKGROUND VISUALS */}
            <div className="absolute inset-0 z-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                    style={{ backgroundImage: "url('/images/destroyer-globe.png')", filter: 'brightness(0.4) contrast(1.2)' }}
                ></div>
                {/* Overlays for Matrix-meets-Marvel depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,53,0.05)_0%,transparent_100%)]"></div>
            </div>

            {/* FLICKERING GLOW OVERLAY (When Modal is Open) */}
            {isModalOpen && (
                <div 
                    ref={bgGlowRef}
                    className="absolute inset-0 z-25 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,53,0.2)_0%,transparent_70%)] pointer-events-none opacity-0"
                ></div>
            )}

            {/* HIDDEN BRANDING - TOP LEFT */}
            <div className="absolute top-8 left-8 z-10 opacity-10 font-mono text-[10px] tracking-[0.3em] font-bold select-none pointer-events-none uppercase">
                $truufbold
            </div>

            {/* HIDDEN BRANDING - BOTTOM RIGHT */}
            <div className="absolute bottom-12 right-8 z-10 opacity-10 font-mono text-[10px] tracking-[0.3em] font-bold select-none pointer-events-none uppercase">
                truthbtoldhub.com
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="relative z-20 w-full max-w-2xl flex flex-col items-center text-center space-y-12">
                
                {/* HEADER */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-ember opacity-60">
                        <div className="h-px w-8 bg-ember"></div>
                        <ShieldCheck className="w-5 h-5" />
                        <div className="h-px w-8 bg-ember"></div>
                    </div>
                    <h1 
                        ref={headerRef}
                        className="font-ritual text-5xl md:text-7xl font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    >
                        {isRegistered ? 'Access' : 'Mission'} <span className="text-ember block md:inline">{isRegistered ? 'Granted' : 'Confirmed'}</span>
                    </h1>
                </div>

                {/* BODY TEXT */}
                <div ref={bodyRef} className="space-y-6 max-w-lg">
                    {isRegistered ? (
                        <p className="font-ritual text-2xl tracking-[0.4em] text-ember animate-pulse font-bold">
                            CHECK YOUR FREQUENCY
                        </p>
                    ) : (
                        <>
                            <p className="text-gray-300 leading-relaxed text-sm md:text-base tracking-wide font-medium">
                                Your contribution is being immediately applied to our <span className="text-white font-bold border-b border-ember/30">8K rendering infrastructure</span>.
                            </p>
                            <p className="text-gray-300 text-sm md:text-base tracking-wide font-medium">
                                You are now a <span className="text-ember font-bold italic">Founding Supporter</span> of the TruthBTold movement.
                            </p>
                        </>
                    )}
                </div>

                {/* SIGN-UP FORM */}
                {!isRegistered && (
                    <div 
                        ref={formRef}
                        className="w-full max-w-md glass-panel p-8 md:p-10 rounded-2xl shadow-2xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-ember to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        
                        <div className="flex items-center gap-3 mb-8">
                            <Globe className="w-5 h-5 text-ember animate-pulse" />
                            <h3 className="font-ritual text-lg tracking-widest uppercase font-bold text-white">Early Access Registration</h3>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-6 text-left">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Full Name</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="OPERATIVE NAME"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono placeholder:text-gray-700 focus:outline-none focus:border-ember/50 focus:ring-1 focus:ring-ember/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Digital Coordinates</label>
                                <input 
                                    required
                                    type="email" 
                                    placeholder="EMAIL@SECTOR.COM"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono placeholder:text-gray-700 focus:outline-none focus:border-ember/50 focus:ring-1 focus:ring-ember/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Referral Code</label>
                                <input 
                                    type="text" 
                                    placeholder="OPTIONAL ENCRYPTION KEY"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono placeholder:text-gray-700 focus:outline-none focus:border-ember/50 focus:ring-1 focus:ring-ember/20 transition-all"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full btn-ember py-4 rounded-lg flex items-center justify-center group/btn relative overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {isSubmitting ? 'SECURE UPLINK...' : 'INITIATE ACCESS'}
                                    {!isSubmitting && <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                                </span>
                            </button>
                        </form>
                    </div>
                )}

                {/* FOOTER */}
                <div ref={footerRef} className="pt-8">
                    <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-gray-400 font-bold">
                        The Hub is currently in fulfillment. <span className="text-white">Stay calibrated.</span>
                    </p>
                </div>
            </div>

            {/* WELCOME MODAL OVERLAY */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300"
                    onClick={closeModal}
                >
                    <div 
                        ref={modalRef}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-2xl bg-emerald-950/20 rounded-3xl overflow-visible border-2 border-transparent group/modal"
                    >
                        {/* PULSING BORDER */}
                        <div 
                            ref={borderPulseRef}
                            className="absolute -inset-1 rounded-[30px] border border-ember/80 shadow-[0_0_15px_rgba(255,107,53,0.5)] z-0 pointer-events-none"
                        ></div>

                        {/* CONTENT PANEL */}
                        <div className="relative z-10 bg-[#021a0a]/90 backdrop-blur-3xl rounded-[28px] p-6 md:p-10 flex flex-col items-center">
                            
                            {/* CLOSE BUTTON */}
                            <button 
                                onClick={closeModal}
                                className="absolute top-6 right-6 text-gray-500 hover:text-ember transition-colors p-2"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="space-y-8 w-full">
                                {/* MODAL HEADER */}
                                <div className="text-center space-y-2">
                                    <h2 className="font-ritual text-3xl md:text-4xl font-black text-white tracking-[0.3em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                        Calibration <span className="text-ember">Complete</span>
                                    </h2>
                                    <p className="text-emerald-400 font-mono text-[10px] tracking-widest uppercase font-bold opacity-80">
                                        Welcome to the TruthBTold Network. You have secured your place in the internal registry.
                                    </p>
                                </div>

                                {/* PERK IMAGE RENDER */}
                                <div className="relative group/perk overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
                                    <img 
                                        src="/images/the-cleanser-perk.png" 
                                        alt="The Cleanser Perk"
                                        className="w-full aspect-[16/10] object-cover transition-transform duration-[20s] linear animate-slow-zoom"
                                    />
                                    {/* IMAGE OVERLAYS */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                                    <div className="absolute bottom-4 left-6 z-10 opacity-30 font-mono text-[8px] tracking-widest text-white uppercase italic">$truufbold</div>
                                    <div className="absolute bottom-4 right-6 z-10 opacity-30 font-mono text-[8px] tracking-widest text-white uppercase italic">truthbtoldhub.com</div>
                                </div>

                                {/* MODAL FOOTER ACTIONS */}
                                <div className="flex flex-col items-center space-y-4">
                                    <p className="text-gray-500 font-mono text-[9px] tracking-widest uppercase">
                                        Use your Founding Supporter Perk below. <span className="text-emerald-500/60">The frequency is set.</span>
                                    </p>
                                    
                                    <button 
                                        onClick={downloadPerk}
                                        className="w-full btn-ember py-5 rounded-xl shadow-[0_0_30px_rgba(255,107,53,0.3)] hover:shadow-[0_0_50px_rgba(255,107,53,0.5)] transition-all flex items-center justify-center gap-3"
                                    >
                                        <Send className="w-5 h-5 rotate-45" />
                                        <span className="font-black text-xs">DOWNLOAD 8K PERK</span>
                                    </button>

                                    <button 
                                        onClick={closeModal}
                                        className="text-[10px] tracking-[0.4em] text-gray-500 hover:text-white transition-all uppercase font-bold pt-2 font-ritual underline-offset-8 hover:underline"
                                    >
                                        Return to the Hub
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TECHNICAL ACCENTS */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-ember/5 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-ember/5 blur-[120px] pointer-events-none"></div>
        </div>
    );
}
