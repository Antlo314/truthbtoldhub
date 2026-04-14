'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Send, Globe, ChevronRight, X, Download, Flame } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function ThanksPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Refs for GSAP animations
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLHeadingElement>(null);
    const subRef = useRef<HTMLParagraphElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const perkRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const bgGlowRef = useRef<HTMLDivElement>(null);
    const humRef = useRef<any>(null);

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(headerRef.current, 
            { y: 30, opacity: 0, filter: 'blur(10px)' }, 
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, delay: 0.5 }
        )
        .fromTo(subRef.current, 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 0.8, duration: 1 }, 
            '-=0.8'
        )
        .fromTo(bodyRef.current, 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 1, stagger: 0.2 }, 
            '-=0.8'
        )
        .fromTo(perkRef.current, 
            { scale: 0.95, opacity: 0, filter: 'blur(5px)' }, 
            { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1 }, 
            '-=0.6'
        )
        .fromTo(formRef.current, 
            { y: 30, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 1 }, 
            '-=0.6'
        )
        .fromTo(footerRef.current, 
            { opacity: 0 }, 
            { opacity: 0.5, duration: 1.5 }, 
            '-=0.5'
        );

        // BG Flickering Glow
        gsap.to(bgGlowRef.current, {
            opacity: 0.2,
            duration: 0.2,
            repeat: -1,
            yoyo: true,
            ease: "rough({ template: none, strength: 1, points: 20, taper: 'none', randomize: true, clamp: false })"
        });
    }, { scope: containerRef });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        setTimeout(() => {
            setIsSubmitting(false);
            setIsRegistered(true);
            setIsModalOpen(true);
            // Play "faint electrical hum"
            if (typeof Audio !== 'undefined') {
                humRef.current = new Audio('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3');
                humRef.current.volume = 0.1;
                humRef.current.loop = true;
                humRef.current.play().catch(() => {});
            }
        }, 1500);
    };

    const downloadPerk = () => {
        const link = document.createElement('a');
        link.href = '/images/destroyer-globe.png'; // High-res master file link
        link.download = 'TruthBTold-8K-Calibration-Still.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center py-20 px-6 overflow-x-hidden selection:bg-orange-500/30">
            
            {/* BACKGROUND VISUALS - Obsidian Void */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(234,88,12,0.05)_0%,transparent_70%)] opacity-60"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div ref={bgGlowRef} className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,88,12,0.1)_0%,transparent_100%)] pointer-events-none opacity-0"></div>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center space-y-12">
                
                {/* HEADER */}
                <div className="space-y-6">
                    <div className="flex items-center justify-center space-x-3 text-orange-500/60">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-orange-500"></div>
                        <ShieldCheck className="w-6 h-6 animate-pulse" />
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-orange-500"></div>
                    </div>
                    
                    <div className="space-y-4">
                        <h1 
                            ref={headerRef}
                            className="font-ritual text-4xl md:text-7xl font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                        >
                            MISSION <span className="text-orange-600">CONFIRMED</span>
                        </h1>
                        <p ref={subRef} className="text-orange-400 font-mono text-xs md:text-sm tracking-[0.3em] uppercase font-bold opacity-0">
                            Calibration successful. Your contribution has been logged in the internal registry.
                        </p>
                    </div>
                </div>

                {/* BODY TEXT */}
                <div ref={bodyRef} className="max-w-xl bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md shadow-2xl">
                    <p className="text-gray-400 leading-relaxed text-sm md:text-base tracking-wide font-medium">
                        We are currently applying all funds to the <span className="text-white font-bold">8K Rendering Infrastructure</span> and <span className="text-white font-bold">AI Synthesis Suite</span>. 
                        You are now a <span className="text-orange-500 font-bold italic">Founding Supporter</span> of the TruthBTold Hub.
                    </p>
                </div>

                {/* THE DIGITAL PERK CARD */}
                <div 
                    ref={perkRef}
                    className="w-full max-w-2xl group relative"
                >
                    <div className="absolute -inset-1 bg-orange-600/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <div className="relative glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-orange-500/50 transition-colors">
                        <div className="relative aspect-[16/9] overflow-hidden">
                            <img 
                                src="/images/destroyer-globe.png" 
                                alt="The Destroyer 8K Render"
                                className="w-full h-full object-cover transition-transform duration-[30s] ease-linear group-hover:scale-110"
                            />
                            {/* Overlay Vignette */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                            
                            {/* Identifier */}
                            <div className="absolute top-6 left-6 flex items-center gap-2">
                                <div className="px-3 py-1 bg-black/60 border border-orange-500/30 rounded-md backdrop-blur-md">
                                    <span className="text-[10px] font-mono text-orange-500 font-black tracking-widest">$TRUUFBOLD</span>
                                </div>
                            </div>

                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <h3 className="font-ritual text-xl md:text-2xl text-white font-black tracking-[0.4em] uppercase drop-shadow-2xl opacity-60 group-hover:opacity-100 transition-opacity">
                                    Founding Member Perk
                                </h3>
                            </div>
                        </div>

                        {/* Perk Action Area */}
                        <div className="p-6 md:p-8 bg-zinc-950/80 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5">
                            <div className="text-left space-y-1">
                                <p className="text-[9px] font-mono text-orange-500/60 uppercase tracking-[0.2em] font-black">Calibration Asset 01</p>
                                <p className="text-white font-bold text-sm tracking-widest uppercase">The Destroyer (8K Master)</p>
                            </div>
                            <button 
                                onClick={downloadPerk}
                                className="w-full md:w-auto px-8 py-4 bg-orange-600 hover:bg-white text-white hover:text-orange-600 rounded-xl transition-all duration-300 font-ritual tracking-widest uppercase text-xs font-black shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center justify-center gap-3"
                            >
                                <Download className="w-4 h-4" /> DOWNLOAD 8K CALIBRATION STILL
                            </button>
                        </div>
                    </div>
                </div>

                {/* REGISTRATION FORM */}
                <div 
                    ref={formRef}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="space-y-2">
                        <h3 className="font-ritual text-lg tracking-widest uppercase font-bold text-white/80">Internal Registry</h3>
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Secure your place in the early access protocol.</p>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-black ml-1">Operative Name</label>
                            <input 
                                required
                                type="text" 
                                placeholder="NAME"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-sm font-mono placeholder:text-gray-800 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-black ml-1">Digital Coordinates</label>
                            <input 
                                required
                                type="email" 
                                placeholder="EMAIL@SECTOR.COM"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-sm font-mono placeholder:text-gray-800 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-black ml-1">Referral / Support Code</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="SYNC KEY"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-sm font-mono placeholder:text-gray-800 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-white"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <span className="text-[8px] font-mono text-orange-500/40 uppercase tracking-widest group-hover:text-orange-500/80 transition-colors italic">Enter "truufbtold"</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting || isRegistered}
                            className="w-full h-16 bg-zinc-900 border border-white/5 hover:border-orange-500/50 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-all duration-300 group/btn relative overflow-hidden disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-orange-600/10 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500"></div>
                            <span className="relative z-10 font-ritual tracking-[0.3em] font-black text-sm flex items-center gap-3">
                                {isSubmitting ? 'UPLINKING...' : isRegistered ? 'REGISTRY SECURED' : 'INITIATE FINAL AWAKENING'}
                                {!isSubmitting && !isRegistered && <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                            </span>
                        </button>
                    </form>
                </div>

                {/* FOOTER */}
                <div ref={footerRef} className="pt-20 space-y-4">
                    <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-gray-400 font-black">
                        The Hub is in fulfillment. <span className="text-orange-500 animate-pulse">Stay calibrated.</span>
                    </p>
                    <div className="flex items-center justify-center gap-6 opacity-20">
                        <div className="h-px w-8 bg-white/30"></div>
                        <span className="text-[8px] font-mono tracking-widest font-black">PROTOCOL V25.2.0 | $TRUUFBOLD</span>
                        <div className="h-px w-8 bg-white/30"></div>
                    </div>
                </div>
            </div>

            {/* SUCCESS MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in">
                    <div className="relative glass-panel bg-zinc-950/80 border-2 border-orange-500/50 rounded-[2.5rem] p-10 max-w-lg text-center shadow-[0_0_100px_rgba(234,88,12,0.2)]">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div className="space-y-8">
                            <div className="w-20 h-20 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto border border-orange-500/50 shadow-[0_0_30px_rgba(234,88,12,0.3)]">
                                <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="font-ritual text-3xl font-black text-white tracking-widest uppercase shadow-sm">Identity Secured</h2>
                                <p className="text-gray-400 font-mono text-xs leading-relaxed uppercase tracking-widest">
                                    You have been added to the internal registry. Prepare for the next frequency shift.
                                </p>
                            </div>
                            <button 
                                onClick={() => router.push('/sanctum')}
                                className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-ritual tracking-[0.2em] font-black rounded-xl shadow-lg transition-all uppercase text-sm"
                            >
                                Enter The Sanctum
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
