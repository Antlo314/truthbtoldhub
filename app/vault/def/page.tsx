'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Zap, Terminal, ArrowLeft } from 'lucide-react';
import gsap from 'gsap';
import { Cinzel, Inter, Fira_Code } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

export default function DEFSovereignEngine() {
    const [logIndex, setLogIndex] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const terminalRef = useRef<HTMLDivElement>(null);

    const logMessages = [
        "[OVR] Initializing DEF Sovereign Engine...",
        "[SEC] Encrypted Data Stream Established: 128-bit AES",
        "[DB] Querying Repository: GEORGIA_WC_2026_Q1",
        "[AUD] Julie Y. John Authorized Access. Scanning High-Volume Lit...",
        "[AUD] Analyzing Provider: ATL_ORTHO_GROUP - Discrepancy Found",
        "[SEC] Joseph C. Chancey notified of system baseline optimization.",
        "[SYS] Sentinel HUD synchronizing with DEF Central...",
        "[HLT] Claim #9921-X: Automatic adjustment applied to medical expense.",
        "[OVR] Sovereign Protocol active. Efficiency overhead mitigated by 14%.",
        "[AUD] Analyzing Case Load: Intercepting Associate Attorney workflow...",
        "[INFO] Audit Velocity sustained at 99.1%. No packet loss.",
        "[SEC] Packet Header Verification: EXTREMELY_SAFE"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setLogs(prev => {
                const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${logMessages[logIndex % logMessages.length]}`];
                return newLogs.slice(-50);
            });
            setLogIndex(prev => prev + 1);
        }, Math.random() * 2000 + 1000);

        return () => clearInterval(interval);
    }, [logIndex]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        // Heavy Mechanical Animation for Litigations
        gsap.fromTo("#lit-count",
            { textContent: 0 },
            {
                textContent: 422,
                duration: 4,
                ease: "steps(60)", // Mechanical steps feel
                snap: { textContent: 1 },
                onUpdate: function () {
                    const el = document.getElementById('lit-count');
                    if (el) el.style.opacity = (Math.random() * 0.3 + 0.7).toString(); // Slight flicker
                },
                onComplete: function () {
                    const el = document.getElementById('lit-count');
                    if (el) el.style.opacity = "1";
                }
            }
        );

        gsap.from("#audit-rate", {
            textContent: 0,
            duration: 3,
            ease: "circ.out",
            snap: { textContent: 0.1 }
        });
    }, []);

    return (
        <div className={`${inter.variable} ${cinzel.variable} ${firaCode.variable} font-sans min-h-screen bg-[#002349] text-white overflow-hidden relative flex items-center justify-center p-8`}>
            {/* Supabase Cinema BG @ 10% */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center"
                style={{ backgroundImage: "url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/cinema_bg.png')" }}
            ></div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_51%)] bg-[length:100%_4px]"></div>

            {/* Back Button */}
            <a href="https://truthbtoldhub.com" className="fixed top-8 left-8 z-[100] bg-amber-500/10 border border-amber-500/20 rounded-full w-10 h-10 flex items-center justify-center text-amber-500 hover:bg-amber-500/30 hover:scale-110 transition-all">
                <ArrowLeft className="w-5 h-5" />
            </a>

            {/* OMEGA GLASS CONTAINER */}
            <div className="relative w-full max-w-6xl aspect-[16/9] glass-container backdrop-blur-2xl bg-white/[0.02] border border-white/10 rounded-3xl p-8 flex flex-col gap-8 z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                {/* Header */}
                <header className="flex justify-between items-center border-b border-amber-500/20 pb-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 border-2 border-amber-500 flex items-center justify-center bg-amber-500/5 rotate-45 group hover:rotate-0 transition-transform duration-700">
                            <span className="font-serif text-3xl text-amber-500 -rotate-45 group-hover:rotate-0 transition-transform duration-700">DEF</span>
                        </div>
                        <div>
                            <h1 className="font-serif text-3xl tracking-[0.4em] text-white uppercase amber-glow">DEF SOVEREIGN ENGINE</h1>
                            <p className="text-[11px] text-amber-500/60 font-mono tracking-[0.3em] uppercase">Proprietary workers' comp audit protocol // Architect-Grade</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-widest">Access Protocol: OMEGA</span>
                        <span className="text-[12px] text-amber-500 font-bold font-mono uppercase tracking-widest flex items-center gap-2 justify-end">
                            LINK ESTABLISHED <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(255,191,0,0.8)]"></span>
                        </span>
                        <span className="text-[10px] text-white/40 font-mono block uppercase">JULIE Y. JOHN / JOSEPH C. CHANCEY</span>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
                    {/* Left Panel: Metrics */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col justify-between h-44 hover:border-amber-500/30 transition-all duration-500">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] text-amber-500 font-bold uppercase tracking-widest">Active Litigations</span>
                                <ShieldAlert className="w-5 h-5 text-amber-500/30" />
                            </div>
                            <div className="flex items-baseline gap-3">
                                <span id="lit-count" className="text-6xl font-serif text-white amber-glow leading-none">422</span>
                                <span className="text-[10px] text-green-400 font-mono border border-green-400/20 px-2 py-0.5 rounded uppercase">-4% VELOCITY</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-4">
                                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 w-[65%] shadow-[0_0_15px_rgba(255,191,0,0.6)]"></div>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col justify-between h-44 hover:border-amber-500/30 transition-all duration-500">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] text-amber-500 font-bold uppercase tracking-widest">Audit Efficiency</span>
                                <Zap className="w-5 h-5 text-amber-500/30" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span id="audit-rate" className="text-6xl font-serif text-white amber-glow leading-none">99.1</span>
                                <span className="text-sm text-amber-500 font-mono">%</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className={`h-6 w-1 rounded-sm ${i < 11 ? 'bg-amber-500/40' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(255,191,0,0.8)]'}`}></div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-2xl flex-1 flex flex-col group hover:border-amber-500/50 transition-all duration-700">
                            <span className="text-[11px] text-gray-500 font-mono uppercase tracking-[0.2em] mb-4">Sentinel Overwatch</span>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="relative">
                                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping absolute inset-0 opacity-50"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500 relative"></div>
                                </div>
                                <span className="text-[12px] font-bold text-white uppercase tracking-widest">Passive Mode // Locked</span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-mono italic">"Algorithmically intercepting high-volume medical audit discrepancies. Link to Georgia Workers' Compensation Board confirmed."</p>
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <button className="w-full py-3 bg-amber-600/5 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all duration-500">Initialize Lockdown</button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Terminal */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col">
                        <div className="bg-black/40 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden flex flex-col h-full shadow-[inset_0_0_30px_rgba(255,191,0,0.1)]">
                            {/* Glowing Amber Pulse on Border */}
                            <div className="absolute inset-0 border-2 border-amber-500/10 pointer-events-none animate-pulse"></div>

                            <div className="flex items-center justify-between mb-6 border-b border-amber-500/20 pb-4">
                                <div className="flex items-center gap-3">
                                    <Terminal className="w-5 h-5 text-amber-500 animate-pulse" />
                                    <span className="text-[12px] text-amber-500 font-bold uppercase tracking-[0.3em] font-mono">Forensic Medical Audit Feed // Agent_Loki</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500/30"></div>
                                    <div className="w-2 h-2 rounded-full bg-amber-500/30"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/30"></div>
                                </div>
                            </div>

                            <div ref={terminalRef} className="flex-1 font-mono text-[11px] text-white/90 space-y-2 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                                {logs.map((log, i) => {
                                    const timestamp = log.split(']')[0].replace('[', '');
                                    const content = log.split(']')[1];
                                    return (
                                        <div key={i} className="animate-in fade-in slide-in-from-left-4 duration-700 flex gap-3 group">
                                            <span className="text-amber-500/60 shrink-0">[{timestamp}]</span>
                                            <span className={`${content.includes('Authorized') || content.includes('active') ? 'text-amber-400 font-bold' : ''}`}>
                                                {content}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-6 border-t border-amber-500/20 flex items-center gap-4">
                                <span className="text-amber-500 text-sm font-bold animate-pulse">&gt;_</span>
                                <div className="w-[100px] h-0.5 bg-amber-500/20 relative overflow-hidden">
                                    <div className="absolute inset-y-0 w-1/2 bg-amber-500 animate-[loading_1.5s_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-[0.4em] font-mono mt-2 opacity-50">
                    <span>© 2026 Drew Eckl & Farnham // Sovereign Protocol</span>
                    <span>System Authored by Truth B Told Hub</span>
                </footer>
            </div>
        </div>
    );
}
