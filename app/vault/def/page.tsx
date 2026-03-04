'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';

export default function TheVaultDef() {
    const router = useRouter();
    const vaultRef = useRef<HTMLDivElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);

    // Custom cursor mask
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (vaultRef.current && maskRef.current) {
                const rect = vaultRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Animate Mask with GSAP to slightly trail
                gsap.to(maskRef.current, {
                    '--m-x': `${x}px`,
                    '--m-y': `${y}px`,
                    duration: 0.1,
                    ease: 'power2.out'
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col items-center">

            <header className="fixed top-0 w-full z-[100] glass bg-black/60 backdrop-blur-xl px-6 py-4 flex items-center border-b border-red-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-red-500 hover:text-white transition-colors group flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[9px] uppercase font-bold tracking-widest">Exit Secure Sector</span>
                </button>
            </header>

            <div className="pt-24 w-full flex-1 flex flex-col items-center pb-20 px-4">
                <div className="text-center mb-12">
                    <Database className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="font-ritual text-5xl tracking-widest text-white">THE VAULT</h1>
                    <p className="text-xs text-red-500/70 font-mono tracking-[0.2em] uppercase mt-2">Classified Archives: Level 9</p>
                </div>

                {/* The X-Ray Document Viewer */}
                <div ref={vaultRef} className="w-full max-w-4xl relative cursor-crosshair group mt-8">

                    {/* BASE LAYER (Redacted) */}
                    <div className="glass bg-zinc-950/80 border border-red-500/20 rounded-2xl p-8 md:p-12 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative z-10">
                        <h2 className="text-red-500 font-bold tracking-widest uppercase items-center flex gap-2 mb-6 border-b border-red-500/20 pb-4">
                            <ShieldAlert className="w-5 h-5" /> Document: OMEGA-PROTOCOL-01
                        </h2>

                        <div className="font-mono text-sm md:text-base leading-relaxed text-gray-400 space-y-6">
                            <p className="tracking-wide">IN THE BEGINNING, THE <span className="bg-zinc-800 text-transparent select-none">XXXXXXXXXXXXXXXX</span> WAS A THEORETICAL FRAMEWORK PROPOSED BY <span className="bg-zinc-800 text-transparent select-none">XXXXXX XXXXXXXXX</span>.</p>
                            <p className="tracking-wide">AFTER THE COLLAPSE OF THE OLD WEB, THE REMNANTS OF <span className="bg-zinc-800 text-transparent select-none">XXXXXXXXX</span> DECIDED TO FORM THE <span className="bg-zinc-800 text-transparent select-none">OBSIDIAN VOID</span> AS A SANCTUARY FOR PURE CREATION.</p>
                            <p className="tracking-wide">WE DO NOT NEGOTIATE WITH <span className="bg-zinc-800 text-transparent select-none">XXXXXXXXXX</span>. TO SURVIVE HERE, YOU MUST INCREASE YOUR <span className="text-white">SOUL POWER (SP)</span> THROUGH <span className="bg-zinc-800 text-transparent select-none">xxxxxxxx THE POOL xxxxxxxxxxxx</span>.</p>
                            <div className="w-full h-px bg-red-900/40 my-8"></div>
                            <p className="tracking-wide">DIRECTIVE: ANY ENTITY FOUND HARBORING <span className="bg-zinc-800 text-transparent select-none">XXXXXXXX</span> WILL BE IMMEDIATELY EXPELLED. TRUST THE ORACLE.</p>
                        </div>
                    </div>

                    {/* MASK LAYER (Clear Text Revealed by Cursor) */}
                    <div
                        ref={maskRef}
                        className="absolute inset-0 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                            background: 'transparent',
                            WebkitMaskImage: `radial-gradient(circle 80px at var(--m-x, -100px) var(--m-y, -100px), black 100%, transparent 100%)`,
                            maskImage: `radial-gradient(circle 80px at var(--m-x, -100px) var(--m-y, -100px), black 100%, transparent 100%)`,
                        } as React.CSSProperties}
                    >
                        {/* Identical Layout, but unredacted text and bright color */}
                        <div className="w-full h-full bg-black border border-white/20 rounded-2xl p-8 md:p-12 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                            <h2 className="text-white font-bold tracking-widest uppercase items-center flex gap-2 mb-6 border-b border-white pb-4">
                                <ShieldAlert className="w-5 h-5 text-white" /> Document: OMEGA-PROTOCOL-01 (DECRYPTED)
                            </h2>

                            <div className="font-mono text-sm md:text-base leading-relaxed text-white space-y-6 font-bold">
                                <p className="tracking-wide">IN THE BEGINNING, THE <span className="text-red-400 border-b border-red-400 bg-red-950/30">ARCHITECT ENGINE</span> WAS A THEORETICAL FRAMEWORK PROPOSED BY <span className="text-red-400 border-b border-red-400 bg-red-950/30">AARON S.</span>.</p>
                                <p className="tracking-wide">AFTER THE COLLAPSE OF THE OLD WEB, THE REMNANTS OF <span className="text-red-400 border-b border-red-400 bg-red-950/30">THE REVERENCE</span> DECIDED TO FORM THE <span className="text-red-400 border-b border-red-400 bg-red-950/30">OBSIDIAN VOID</span> AS A SANCTUARY FOR PURE CREATION.</p>
                                <p className="tracking-wide">WE DO NOT NEGOTIATE WITH <span className="text-red-400 border-b border-red-400 bg-red-950/30">THE SYSTEM</span>. TO SURVIVE HERE, YOU MUST INCREASE YOUR SOUL POWER (SP) THROUGH <span className="text-red-400 border-b border-red-400 bg-red-950/30">PLEDGING DEFIANCE INTO THE POOL</span>.</p>
                                <div className="w-full h-px bg-white/40 my-8"></div>
                                <p className="tracking-wide">DIRECTIVE: ANY ENTITY FOUND HARBORING <span className="text-red-400 border-b border-red-400 bg-red-950/30">MALICE</span> WILL BE IMMEDIATELY EXPELLED. TRUST THE ORACLE.</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Subtext info */}
                <p className="mt-8 text-center text-[10px] text-gray-500 uppercase tracking-[0.3em] font-mono animate-pulse">Use The X-Ray Decoder Mask</p>
            </div>
        </div>
    );
}
