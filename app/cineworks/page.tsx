'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clapperboard, ChevronRight } from 'lucide-react';

export default function Cineworks() {
    const router = useRouter();

    const films = [
        { id: 1, title: 'AWAKENING', duration: '03:14', format: '1080p', isNew: true },
        { id: 2, title: 'THE OFFERING', duration: '05:22', format: '4K', isNew: false },
        { id: 3, title: 'ECHOES OF ZION', duration: '12:05', format: '4K', isNew: false },
    ];

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans flex flex-col">
            {/* Cinematic Background */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,#1a0b2e_0%,#000_100%)]"></div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass bg-primary-950/20 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-purple-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-purple-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none">
                        CINEWORKS
                    </span>
                    <span className="text-[9px] text-purple-500/80 font-mono uppercase tracking-[0.2em]">
                        Visual Vault OPS
                    </span>
                </div>
                <div className="w-6 hidden"></div>
            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32">
                <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">

                    {/* Featured Premiere */}
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass border-purple-500/30 group cursor-pointer shadow-[0_0_50px_rgba(168,85,247,0.15)] filter saturate-50 hover:saturate-100 transition-all duration-700">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
                        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png">
                            <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.mp4" type="video/mp4" />
                        </video>

                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-20 h-20 rounded-full glass bg-white/5 border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600/20 group-hover:border-purple-500/50 transition-all duration-300">
                                <Play className="w-8 h-8 text-white ml-2 drop-shadow-lg" />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-8 z-20">
                            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20 mb-3 inline-block">
                                World Premiere
                            </span>
                            <h2 className="font-ritual text-4xl md:text-6xl text-white font-bold tracking-widest leading-none drop-shadow-lg">
                                ARCHITECTS OF EXODUS
                            </h2>
                            <p className="text-xs text-gray-300 font-mono tracking-widest uppercase mt-4 opacity-80">
                                Directed by The Void • Runtime 42:00
                            </p>
                        </div>
                    </div>

                    {/* The Archive Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                            <h3 className="font-ritual text-xl text-white font-bold tracking-widest uppercase shadow-sm">
                                Chronicles
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {films.map((film) => (
                                <div key={film.id} className="glass-panel p-4 rounded-2xl group cursor-pointer relative overflow-hidden border-purple-500/10 hover:border-purple-500/40">
                                    <div className="aspect-video bg-zinc-900 rounded-xl mb-4 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 blur-[1px]"></div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm z-10">
                                            <Play className="w-10 h-10 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            {film.isNew && (
                                                <span className="text-[8px] text-purple-400 font-bold uppercase tracking-wider mb-1 block">New Arrival</span>
                                            )}
                                            <h4 className="font-ritual text-lg text-white tracking-widest">{film.title}</h4>
                                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{film.duration}</p>
                                        </div>
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 uppercase tracking-widest">
                                            {film.format}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
