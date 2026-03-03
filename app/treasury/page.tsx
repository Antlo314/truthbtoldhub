'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flame, DollarSign, Send, Zap, ChevronRight, Lock } from 'lucide-react';

export default function Treasury() {
    const router = useRouter();
    const [isConfidential, setIsConfidential] = useState(false);

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col items-center">
            {/* Background - The Treasury uses the custom pool void asset */}
            <div className="fixed inset-0 z-0 bg-[url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_pool.png')] bg-cover bg-center brightness-50 contrast-125"></div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-lg z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-orange-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none drop-shadow-md">
                        THE POOL
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.2em]">
                        Mutual Aid Treasury
                    </span>
                </div>
                <div className="opacity-0 w-6"></div> {/* Balance spacer */}
            </header>

            <main className="flex-1 w-full max-w-lg relative z-10 p-4 md:p-6 pb-32 space-y-8 animate-fade-in">

                {/* Treasury Escrow Status block */}
                <div className="glass-panel p-6 rounded-3xl border-orange-500/20 shadow-[0_0_40px_rgba(234,88,12,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-950/50 border border-orange-500/30 flex items-center justify-center text-orange-500">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Global Escrow</h2>
                                <h3 className="font-ritual text-2xl text-white tracking-widest leading-none mt-1">$4,000</h3>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[8px] text-green-500/80 font-mono uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                                SECURE
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 font-mono leading-relaxed mt-4">
                        The Pool sustains the Obsidian Void. Funds are held in escrow and distributed via sovereign consensus.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <button className="flex-1 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-900/40 hover:scale-[1.02] transition-transform">
                            Make Offering
                        </button>
                        <button className="flex-1 glass bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors">
                            Request Aid
                        </button>
                    </div>
                </div>

                {/* Global Consensus - Petitions */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-5 bg-orange-500"></div>
                        <h3 className="font-ritual text-white text-base tracking-widest uppercase">Active Petitions</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Hardcoded request from monolithic code */}
                        <div className="glass bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-orange-500/60 font-mono">REQ_ID: 0x1a8b2</span>
                                    <h4 className="text-sm font-bold text-white mt-1">Equipment Grant: Studio Upgrade</h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-white font-mono">$850.00</span>
                                    <span className="text-[8px] text-gray-500 block uppercase font-mono tracking-widest mt-1">Requested</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold tracking-tighter">
                                    Consensus Building
                                </span>
                                <div className="flex -space-x-2">
                                    <div className="w-5 h-5 rounded-full bg-zinc-800 border border-white/10"></div>
                                    <div className="w-5 h-5 rounded-full bg-zinc-700 border border-white/10"></div>
                                    <div className="w-5 h-5 rounded-full bg-orange-600 border border-orange-500/30 flex items-center justify-center text-[8px] font-bold text-white">
                                        +8
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-mono">
                                    <span className="text-gray-500 uppercase">Consensus</span>
                                    <span className="text-orange-500 font-bold">18%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 w-[18%]"></div>
                                </div>
                                <button className="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-orange-500/20 hover:border-orange-500 transition-all mt-3 text-orange-500 group-hover:text-white">
                                    Vote to Align
                                </button>
                            </div>
                        </div>

                        {/* Paid out request */}
                        <div className="glass bg-white/5 border border-white/5 rounded-2xl p-5 opacity-70">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500 font-mono">REQ_ID: 0x0f3c1</span>
                                    <h4 className="text-sm font-bold text-gray-300 mt-1 line-through decoration-gray-600">Emergency Medical Fund</h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-gray-400 font-mono">$1,200.00</span>
                                    <span className="text-[8px] text-gray-500 block uppercase font-mono tracking-widest mt-1">Disbursed</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 uppercase font-bold tracking-tighter">
                                    Consensus Reached
                                </span>
                                <span className="text-[10px] text-green-500 font-mono font-bold">100%</span>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
