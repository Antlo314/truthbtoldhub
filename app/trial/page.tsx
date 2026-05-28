'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Terminal, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthModal from '../../components/AuthModal';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Howl } from 'howler';

// Sounds
let typeSfx: any = null;
let accessGrantedSfx: any = null;
let accessDeniedSfx: any = null;

if (typeof window !== 'undefined') {
    typeSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    accessGrantedSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.4 });
    accessDeniedSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'], volume: 0.3 });
}

export default function TheTrial() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([
        "OBSIDIAN VOID OS v9.9.0",
        "CONNECTING TO THE SANCTUM MAINFRAME...",
        "CONNECTION ESTABLISHED.",
        "WARNING: UNAUTHORIZED ENTITY DETECTED.",
        "CIPHER REQUIRED.",
        "RIDDLE: 'I am the motion of the awakened. To escape the gravity of the matrix and claim the sky, what must you do?'"
    ]);
    const [isGranted, setIsGranted] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);


    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(containerRef.current, {
            opacity: 0,
            y: 50,
            duration: 1.5,
            ease: "power3.out"
        });
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim().toUpperCase();
        if (!cmd) return;

        typeSfx?.play();
        setHistory(prev => [...prev, `> ${cmd}`]);
        setInput('');

        setTimeout(() => {
            if (cmd === 'ASCEND') {
                accessGrantedSfx?.play();
                setHistory(prev => [...prev, "[ SYSTEM ] CIPHER ACCEPTED. TIER UPGRADE AUTHORIZED.", "[ SYSTEM ] WELCOME TO THE ARCHITECT CHAMBER."]);
                setIsGranted(true);
                
                // Set the unlock flag in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('protocol_ascended', 'true');
                }

                setTimeout(() => {
                    router.push('/'); // Redirect back to the Hub (Home)
                }, 2000);
            } else if (cmd === 'LOGIN' || cmd === 'REGISTER' || cmd === 'AUTH') {
                setHistory(prev => [...prev, "[ SYSTEM ] INITIALIZING NEURAL AUTH OVERLAY..."]);
                setTimeout(() => {
                    setIsAuthModalOpen(true);
                }, 500);
            } else if (cmd === 'GOOGLE') {
                setHistory(prev => [...prev, "[ SYSTEM ] REDIRECTING TO GOOGLE OAUTH SECURITY PORTAL..."]);
                setTimeout(async () => {
                    await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin }
                    });
                }, 1000);
            } else if (cmd === 'HELP') {
                setHistory(prev => [...prev, "Available Commands: HELP, CLEAR, LOGIN, GOOGLE, ASCEND"]);

            } else if (cmd === 'CLEAR') {
                setHistory(["OBSIDIAN VOID OS v9.9.0"]);
            } else {
                accessDeniedSfx?.play();
                setHistory(prev => [...prev, `ERR: Command '${cmd}' not recognized or authorized.`]);
            }
        }, 500);
    };

    // GSAP Magnetic Button Effect
    const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const handleMagneticLeave = (e: React.MouseEvent<HTMLElement>) => {
        gsap.to(e.currentTarget, {
            x: 0,
            y: 0,
            duration: 1,
            ease: "elastic.out(1, 0.3)"
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-aether-gold font-mono p-4 md:p-8 flex flex-col justify-center items-center selection:bg-aether-gold/30 relative overflow-hidden">
            {/* Background Texture & Overlays */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05)_0%,transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/black-mamba.png')" }}></div>
            </div>

            {/* Scanline CRT overlay */}
            <div className="fixed inset-0 pointer-events-none z-40 block opacity-20" style={{ backgroundImage: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))", backgroundSize: "100% 4px, 3px 100%" }}></div>

            <div 
                ref={containerRef} 
                className="w-full max-w-4xl bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-8 flex flex-col h-[75vh] shadow-[0_0_100px_rgba(212,175,55,0.05)] relative overflow-hidden border border-white/5"
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    gsap.to(e.currentTarget, {
                        rotationY: x * 5,
                        rotationX: -y * 5,
                        duration: 1,
                        ease: "power2.out"
                    });
                }}
                onMouseLeave={(e) => {
                    gsap.to(e.currentTarget, {
                        rotationY: 0,
                        rotationX: 0,
                        duration: 1,
                        ease: "power2.out"
                    });
                }}
                style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
                {/* Glowing Top Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-aether-gold/50 to-transparent shadow-[0_0_20px_rgba(212,175,55,0.5)] animate-pulse"></div>

                <div className="flex items-center gap-6 border-b border-white/5 pb-6 mb-6">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <Terminal className="w-5 h-5 text-aether-gold" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm tracking-[0.4em] font-black uppercase text-white">Aetheric Initiation Protocol</h1>
                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Terminal ID: AX-990-VOID | Auth Level: REDACTED</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isGranted ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{isGranted ? 'Unlocked' : 'Locked'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-4 hide-scrollbar">
                    {history.map((line, i) => (
                        <div key={i} className={`text-xs tracking-[0.1em] font-mono leading-relaxed ${
                            line.includes('ERR:') ? 'text-red-500' : 
                            (line.includes('[ SYSTEM ]') || line.includes('WARNING')) ? 'text-aether-gold font-black' : 
                            line.startsWith('>') ? 'text-white' : 'text-zinc-400'
                        }`}>
                            {line}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {!isGranted && (
                    <form onSubmit={handleCommand} className="mt-6 flex items-center gap-4 border-t border-white/5 pt-6 bg-black/20 rounded-b-[2rem]">
                        <ChevronRight className="w-5 h-5 text-aether-gold animate-pulse" />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-white tracking-[0.2em] font-mono text-sm placeholder:text-zinc-700 uppercase"
                            placeholder="Enter Command..."
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Input Active</span>
                            <div className="w-2 h-5 bg-aether-gold/50 animate-pulse"></div>
                        </div>
                    </form>
                )}
            </div>

            <button 
                onClick={() => router.push('/')} 
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
                className="mt-12 text-[10px] text-zinc-500 hover:text-white uppercase tracking-[0.4em] font-black px-10 py-4 bg-white/5 border border-white/5 rounded-full transition-all z-10"
            >
                Abort Protocol
            </button>
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onSuccess={() => router.push('/')} 
            />
        </div>
    );
}

