'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Clapperboard, ChevronRight, LogOut, Share2, Flame, Loader2 } from 'lucide-react';
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
    const [isMinting, setIsMinting] = useState(false);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText("Awakening initiated. Watch the latest transmission on Sacred Sanctum. https://truthbtoldhub.com/cineworks");
            alert("Coordinates copied to your clipboard. Awaken the masses.");
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleMintSP = async () => {
        setIsMinting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Initiation Required: Must be logged in to Mint SP.");
                setIsMinting(false);
                return;
            }

            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 14, userId: session.user.id }) // $14 standard energy contribution
            });

            if (!res.ok) throw new Error("Stripe checkout failed to initialize.");
            
            const { url } = await res.json();
            if (url) window.location.href = url;
            else setIsMinting(false);

        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
            setIsMinting(false);
        }
    };

    const bgRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const filmRefs = useRef<(HTMLElement | null)[]>([]);
    const featureVideoRef = useRef<HTMLVideoElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    const handlePlayFeature = (e: React.MouseEvent) => {
        e.stopPropagation();
        playClick();
        setIsPlayingFeature(true);
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
        // Hardcoded YouTube VODs for Prototype 
        setFilms([
            { 
                id: 'fVqAox73uCE', 
                title: 'Prelude to the Destroyer', 
                duration: 'CODEX', format: '4K', is_new: true, 
                image: 'https://img.youtube.com/vi/fVqAox73uCE/maxresdefault.jpg', 
                status: 'AVAILABLE',
                description: "The Stone We Built On explores ancient warnings, the cracked foundation of America, and the signs of collapse." 
            },
            { 
                id: '_5LzmdhiBRQ', 
                title: 'Episode 3: The Judgment', 
                duration: 'CODEX', format: '4K', is_new: false, 
                image: 'https://img.youtube.com/vi/_5LzmdhiBRQ/maxresdefault.jpg', 
                status: 'AVAILABLE',
                description: "Enoch walks into the presence of the Watchers. Semjaza and the fallen stand in mourning as their sentence is revealed." 
            },
            { 
                id: 'OBkUITCVQao', 
                title: 'Episode 2: The Messenger', 
                duration: 'CODEX', format: '4K', is_new: false, 
                image: 'https://img.youtube.com/vi/OBkUITCVQao/maxresdefault.jpg', 
                status: 'AVAILABLE',
                description: "Two hundred fallen beings leave heaven behind and walk into a world that is about to change forever." 
            },
            { 
                id: 'g0VedgHt0cE', 
                title: 'Episode 1: The Watchers', 
                duration: 'CODEX', format: '4K', is_new: false, 
                image: 'https://img.youtube.com/vi/g0VedgHt0cE/maxresdefault.jpg', 
                status: 'AVAILABLE',
                description: "Before the flood. Before the giants. Before the world burned... a shadow approached the city." 
            }
        ]);
        setLoading(false);
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
                    className="text-purple-500 hover:text-white transition-colors group shrink-0"
                >
                    <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center flex-1 px-4">
                    <span className="font-ritual text-xs md:text-sm font-bold tracking-[0.3em] text-white leading-none text-center">
                        CINEWORKS
                    </span>
                    <span className="text-[8px] md:text-[9px] text-purple-500/80 font-mono uppercase tracking-[0.2em] mt-1 text-center truncate">
                        Visual Vault OPS
                    </span>
                </div>
                <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group flex items-center gap-2 shrink-0" title="Sign Out">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] hidden lg:inline">Disconnect</span>
                    <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                </button>

            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32">
                <article className="max-w-5xl mx-auto space-y-12 animate-fade-in">

                    {/* Placeholder Warning Overlay */}
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 text-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <span className="text-purple-300 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                            <Clapperboard className="w-4 h-4" />
                            Prototype Environment: All visual assets are placeholders. Full archives coming soon.
                        </span>
                    </div>

                    {/* Featured Premiere */}
                    <section aria-label="Featured Premiere">
                        <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden glass border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] group">
                            <div 
                                onClick={isPlayingFeature ? undefined : handlePlayFeature}
                                className={`relative w-full aspect-video transition-all ${isPlayingFeature ? '' : 'cursor-pointer filter saturate-50 hover:saturate-100 hover:scale-[1.01]'}`}
                                onMouseEnter={(e) => {
                                    if (isPlayingFeature) return;
                                    playHover();
                                }}
                            >
                                {!isPlayingFeature && <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>}

                                {!isPlayingFeature ? (
                                    <img
                                        src="https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg"
                                        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
                                        alt="Premiere Preview"
                                    />
                                ) : (
                                    <iframe
                                        className="absolute inset-0 w-full h-full z-0 bg-black"
                                        src="https://www.youtube.com/embed/msKxh1gInMU?autoplay=1&rel=0&modestbranding=1"
                                        title="Who are the Sabeans? (Joel 3)"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                )}

                                {!isPlayingFeature && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full glass bg-white/5 border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600/20 group-hover:border-purple-500/50 transition-all duration-300 pointer-events-auto">
                                                <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-1 md:ml-2 drop-shadow-lg" />
                                            </div>
                                        </div>

                                        {/* Desktop Only Labels inside video */}
                                        <div className="absolute top-4 left-4 z-20 hidden md:inline-block">
                                            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20 shadow-md">
                                                Featured Transmission
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Details Section: Adaptive Mobile/Desktop */}
                            {!isPlayingFeature && (
                                <div className="p-5 md:p-8 bg-black/60 md:bg-gradient-to-t md:from-black/90 md:via-black/60 md:to-transparent md:absolute md:bottom-0 md:left-0 md:right-0 z-20">
                                    <div className="md:hidden mb-3">
                                        <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest px-2 py-0.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                                            Featured Transmission
                                        </span>
                                    </div>
                                    <h1 className="font-ritual text-2xl md:text-5xl text-gray-100 font-bold tracking-widest leading-none drop-shadow-lg mb-3 md:mb-4">
                                        14
                                    </h1>
                                    <div className="text-xs md:text-sm text-gray-300 font-sans max-w-2xl bg-black/40 md:bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                                        <p className="mb-2 italic">"STL in the spirit, Judah in the flesh. They never told us who we really was."</p>
                                        <p className="opacity-80">A powerful prophetic breakdown touching on the 14th amendment, the transatlantic scattering, and the geopolitical awakening of the Medes (Iran). The earth is preparing to shake as the King invades.</p>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Action Bar (Share & Monetize) */}
                        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button onClick={handleShare} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold tracking-widest text-white uppercase transition-all shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                                    <Share2 className="w-4 h-4 text-purple-400" /> Spread Coordinates
                                </button>
                                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase hidden md:inline">Generate Viral Lift</span>
                            </div>
                            
                            <button disabled={isMinting} onClick={handleMintSP} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 rounded-xl text-xs font-bold tracking-widest text-orange-400 uppercase transition-all shadow-[0_0_20px_rgba(234,88,12,0.2)] disabled:opacity-50">
                                {isMinting ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" /> : <Flame className="w-4 h-4 text-orange-500" />}
                                {isMinting ? 'Initializing...' : 'Boost Signal (Mint SP)'}
                            </button>
                        </div>

                        {/* Lyrics / Transcript Section */}
                        <div className="mt-8 bg-black/40 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-purple-500/20 glass relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="font-ritual text-lg md:text-xl text-purple-300 font-bold tracking-widest uppercase flex items-center gap-3">
                                    <Clapperboard className="w-5 h-5" />
                                    Transcript
                                </h3>
                                <button 
                                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                                    className="text-[10px] text-purple-400 font-bold uppercase tracking-widest px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                                >
                                    {isTranscriptExpanded ? 'Hide' : 'Reveal Signal'}
                                </button>
                            </div>
                            
                            <div className={`text-gray-300 font-sans text-sm md:text-base leading-relaxed space-y-4 relative z-10 transition-all duration-500 overflow-hidden ${isTranscriptExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 md:max-h-[400px] opacity-60'}`}>
                                <div className="pb-4">
                                    <p>STL in the spirit, Judah in the flesh. They never told us who we really was. Constitutional lies and Biblical truths.<br/>Let's talk about it.</p>
                                    <p>14 for the slave child. They can't erase us. Bible in my hand, but the world want to replace us.<br/>People who know we the seed, they afraid of. Hebrews rising tell Iran, Get the blade up.<br/>Joel 3 written, Judgment in the pages. Chains in the past, now the war in the ages.<br/>Prophets done told y'all now the beast waking. ATL Zion, whole earth going to shake .</p>
                                    <p>Born out the blood of the cotton fields. 14th amendment ain't love, it's a raw deal. Citizenship given, but never gave land. No reparations, just jail and the chain hand.<br/>My king came through ships, through the storm in a mist. Now they acting like immigrants man, dismissed.</p>
                                    <p>We the ones Deuteronomy warn about, 400 years now the time getting drawn out. Mass deportation, that's revelation, but not for us, it's the other nations. Bible said it scattered all over, now Babylon fallen better read Jehovah. Iran in the east yea the Medes getting bold, it's written in the scrolls not just what the news told.<br/>Joel chapter 3, the captives coming back, and the ones that sold them I'm going to feel that wrath.</p>
                                    <p>14 for the slave child. They can't erase us. Bible in my hand, but the world want to replace us.<br/>People who know we the seed, they afraid of. Hebrews rising tell Iran, Get the blade up.<br/>Joel 3 written, Judgment in the pages. Chains in the past, now the war in the ages.<br/>Prophets done told y'all now the beast waking. ATL Zion, whole earth going to shake .</p>
                                    <p>You sold the children of Judah for wine that you might drink, but the Most High remember the cup coming back full.</p>
                                    <p>This ain't no trap, it's a trumpet ATL sound like Zion when we bumping. Scrolls in the trunk, got the fire in the booth. They feel the truth more than the nukes in the roof.</p>
                                    <p>Don't sleep on the Medes thats Iran in your vision. Babylon split like a surgical incision. We ain't Gentiles. We the root of the tree. The 14th was a band-aid, but the wound still bleeds.</p>
                                    <p>It was always about the children of the slave trade.</p>
                                    <p>Now the earth going to shake when the King invades.<br/>ATL Judah. We wait.</p>
                                </div>
                            </div>

                            {!isTranscriptExpanded && (
                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent z-10 md:hidden pointer-events-none"></div>
                            )}
                        </div>

                    </section>

                    {/* The Archive Grid */}
                    <section aria-labelledby="archive-heading" className="space-y-6">
                        <header className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-purple-600 rounded-full" aria-hidden="true"></div>
                            <h2 id="archive-heading" className="font-ritual text-xl text-white font-bold tracking-widest uppercase shadow-sm">
                                Chronicles
                            </h2>
                        </header>

                        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {films.length === 0 ? (
                                <div className="col-span-1 md:col-span-2 lg:col-span-3 glass bg-black/40 border border-white/5 rounded-3xl p-16 text-center relative overflow-hidden group min-h-[400px] flex flex-col items-center justify-center">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                    <Clapperboard className="w-16 h-16 text-purple-500/30 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse" />
                                    <h3 className="font-ritual text-3xl md:text-4xl tracking-[0.4em] text-white/40 mb-4 uppercase">Transmissions Offline</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-mono tracking-widest uppercase max-w-lg mx-auto leading-relaxed">
                                        The cinematic archives are currently devoid of signal. Await the next prophetic broadcast from the Architect.
                                    </p>
                                </div>
                            ) : (
                                films.map((film, index) => (
                                <article
                                    key={film.id}
                                    ref={el => { filmRefs.current[index] = el; }}
                                    onMouseEnter={playHover}
                                    onClick={film.status === 'AVAILABLE' ? () => { playClick(); window.open(`https://youtu.be/${film.id}`, '_blank'); } : undefined}
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
                                            <p className="text-[10px] text-purple-500/60 font-mono uppercase tracking-[0.15em] mt-1 mb-2">{film.duration}</p>
                                            {film.description && (
                                                <p className="text-xs text-gray-400 font-sans leading-relaxed line-clamp-3">{film.description}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[9px] px-2 py-1 rounded bg-black/40 text-gray-400 border border-white/10 uppercase tracking-widest font-bold">
                                                {film.format}
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            )))}
                        </div>
                    </section>

                </article>
            </main>
        </div>
    );
}
