'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clapperboard, ChevronRight, LogOut } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let uiClickSfx: any = null;
let ambientDrone: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function Cineworks() {
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const [films, setFilms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPlayingFeature, setIsPlayingFeature] = useState(false);

    const bgRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const filmRefs = useRef<(HTMLDivElement | null)[]>([]);
    const featureVideoRef = useRef<HTMLVideoElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    const handlePlayFeature = (e: React.MouseEvent) => {
        e.stopPropagation();
        playClick();
        setIsPlayingFeature(true);
        if (featureVideoRef.current) {
            featureVideoRef.current.play();
        }
    };

    // GSAP Parallax Background
    useGSAP(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 30; // max 30px move
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            gsap.to(bgRef.current, { x, y, duration: 1.5, ease: "power2.out" });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Staggered Entrance Animation for Grid
    useGSAP(() => {
        if (films.length > 0 && filmRefs.current.length > 0) {
            gsap.fromTo(filmRefs.current,
                { opacity: 0, scale: 0.9, y: 30 },
                { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.2)' }
            );
        }
    }, { dependencies: [films.length], scope: gridRef });

    // Ambient Drone
    useEffect(() => {
        if (typeof window !== 'undefined') {
            ambientDrone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0.15,
            });
            ambientDrone.play();
        }
        return () => {
            if (ambientDrone) ambientDrone.stop();
        };
    }, []);

    useEffect(() => {
        async function fetchFilms() {
            try {
                const { data, error } = await supabase.from('films').select('*').order('created_at', { ascending: false });

                if (data && data.length > 0) {
                    const placeholderData = data.map((f: any) => ({ ...f, status: 'COMING SOON' }));
                    setFilms(placeholderData);
                } else {
                    // Fallback to placeholder data if database is empty after reset
                    setFilms([
                        { id: '1', title: 'AWAKENING', duration: '03:14', format: '1080p', is_new: false, image: null, status: 'COMING SOON' },
                        { id: '2', title: 'THE OFFERING', duration: '05:22', format: '4K', is_new: false, image: null, status: 'COMING SOON' },
                        { id: '3', title: 'ECHOES OF ZION', duration: '12:05', format: '4K', is_new: false, image: null, status: 'COMING SOON' },
                    ]);
                }
            } catch (err) {
                console.error("Error fetching films:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchFilms();
    }, []);

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans flex flex-col overflow-x-hidden">
            {/* Cinematic Background Parallax */}
            <div ref={bgRef} className="fixed inset-0 z-0 scale-110 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a0b2e_0%,#000_100%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass bg-primary-950/20 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-purple-500/10">
                <button
                    onMouseEnter={playHover}
                    onClick={() => { playClick(); router.push('/sanctum'); }}
                    className="text-purple-500 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center pl-8">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none">
                        CINEWORKS
                    </span>
                    <span className="text-[9px] text-purple-500/80 font-mono uppercase tracking-[0.2em]">
                        Visual Vault OPS
                    </span>
                </div>
                <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group flex items-center gap-2" title="Sign Out">
                    <span className="text-[9px] uppercase font-bold tracking-widest hidden md:inline">Disconnect</span>
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32">
                <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">

                    {/* Placeholder Warning Overlay */}
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 text-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <span className="text-purple-300 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                            <Clapperboard className="w-4 h-4" />
                            Prototype Environment: All visual assets are placeholders. Full archives coming soon.
                        </span>
                    </div>

                    {/* Featured Premiere */}
                    <div
                        onMouseEnter={(e) => {
                            if (isPlayingFeature) return;
                            playHover();
                            gsap.to(e.currentTarget, { scale: 1.01, rotationY: -1, rotationX: 1, duration: 0.5, ease: "power2.out", filter: 'saturate(1.2) brightness(1.1)' });
                        }}
                        onMouseLeave={(e) => {
                            if (isPlayingFeature) return;
                            gsap.to(e.currentTarget, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.5, ease: "power2.out", filter: 'saturate(0.5) brightness(1)' });
                        }}
                        onClick={isPlayingFeature ? undefined : handlePlayFeature}
                        className={`relative w-full aspect-video rounded-3xl overflow-hidden glass border-purple-500/30 transition-all shadow-[0_0_50px_rgba(168,85,247,0.15)] ${isPlayingFeature ? '' : 'group cursor-pointer filter saturate-50'}`}
                        style={{ perspective: '1000px' }}
                    >
                        {!isPlayingFeature && <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>}
                        <video
                            ref={featureVideoRef}
                            playsInline
                            controls={isPlayingFeature}
                            className="absolute inset-0 w-full h-full object-cover z-0"
                            poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png"
                        >
                            <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/joel_3.mp4" type="video/mp4" />
                        </video>

                        {!isPlayingFeature && (
                            <>
                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <div className="w-20 h-20 rounded-full glass bg-white/5 border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600/20 group-hover:border-purple-500/50 transition-all duration-300 pointer-events-auto">
                                        <Play className="w-8 h-8 text-white ml-2 drop-shadow-lg" />
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20 mb-3 inline-block shadow-md">
                                        Featured Premiere
                                    </span>
                                    <h2 className="font-ritual text-3xl md:text-5xl text-gray-100 font-bold tracking-widest leading-none drop-shadow-lg mb-4">
                                        JOEL 3: THE SABEANS
                                    </h2>
                                    <div className="text-sm text-gray-300 font-sans max-w-2xl bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-sm pointer-events-auto mb-2">
                                        <p className="mb-2">Who are the Sabeans mentioned in Joel 3:8, and why does it matter today?</p>
                                        <p>As we dive into Joel Chapter 3, verses 1–13, the "Valley of Jehoshaphat" becomes the stage for a divine reckoning. While history points to the Sabeans as a distant trading nation, modern insight and geopolitical shifts point directly toward the region of modern-day Iran.</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* The Archive Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                            <h3 className="font-ritual text-xl text-white font-bold tracking-widest uppercase shadow-sm">
                                Chronicles
                            </h3>
                        </div>

                        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {films.map((film, index) => (
                                <div
                                    key={film.id}
                                    ref={el => { filmRefs.current[index] = el; }}
                                    onMouseEnter={playHover}
                                    onClick={film.status === 'AVAILABLE' ? playClick : undefined}
                                    className={`glass-panel p-4 rounded-3xl group relative overflow-hidden transition-all duration-500 flex flex-col h-full ${film.status === 'AVAILABLE'
                                        ? 'cursor-pointer border-purple-500/20 hover:border-purple-500/60 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)]'
                                        : 'cursor-not-allowed opacity-80 border-white/5 grayscale-[0.5] hover:grayscale-0'
                                        }`}
                                >
                                    <div className="aspect-video bg-zinc-950 rounded-2xl mb-4 relative overflow-hidden shadow-inner group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-shadow">
                                        {film.thumbnail_url || film.image ? (
                                            <img src={film.thumbnail_url || film.image} alt={film.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                                        ) : (
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 blur-[1px]"></div>
                                        )}

                                        {/* Status Overlay */}
                                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-10"></div>
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent z-10"></div>

                                        {film.status === 'AVAILABLE' ? (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm z-20">
                                                <div className="w-16 h-16 rounded-full bg-purple-600/30 border border-purple-400/50 flex items-center justify-center backdrop-blur-md animate-pulse">
                                                    <Play className="w-6 h-6 text-white ml-1" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                                <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                                                    <Clapperboard className="w-4 h-4 text-purple-400" />
                                                    <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase">{film.status || 'COMING SOON'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {film.is_new && film.status === 'AVAILABLE' && (
                                            <div className="absolute top-3 left-3 z-30">
                                                <span className="text-[9px] text-white font-bold uppercase tracking-widest px-2 py-1 bg-purple-600/80 rounded backdrop-blur-md border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.8)]">New Arrival</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto flex justify-between items-start px-1 relative z-20 pt-4">
                                        <div>
                                            <h4 className={`font-ritual text-xl tracking-widest ${film.status === 'AVAILABLE' ? 'text-white' : 'text-gray-400'}`}>{film.title}</h4>
                                            <p className="text-[10px] text-purple-500/60 font-mono uppercase tracking-[0.15em] mt-1">{film.duration}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[9px] px-2 py-1 rounded bg-black/40 text-gray-400 border border-white/10 uppercase tracking-widest font-bold">
                                                {film.format}
                                            </span>
                                        </div>
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
