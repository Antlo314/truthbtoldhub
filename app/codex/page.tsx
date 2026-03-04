'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sparkles, Send, Eye, Shield, Lock, Hexagon, Zap, LogOut } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TextPlugin } from 'gsap/TextPlugin';
import GenerativeIdenticon from '@/components/GenerativeIdenticon';

// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let submitSfx: any = null;
let encryptSfx: any = null;
let ascendSfx: any = null;

if (typeof window !== 'undefined') {
    gsap.registerPlugin(TextPlugin);

    uiHoverSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'],
        volume: 0.1,
    });

    submitSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'],
        volume: 0.3,
    });

    encryptSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'],
        volume: 0.1,
    });

    ascendSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/cyber_sweep.mp3'],
        volume: 0.4,
    });
}

// Mock Data structure for Whispers if no table exists
interface Whisper {
    id: string;
    content: string;
    author: string;
    alignment: number;
    timestamp: string;
    isEncrypted: boolean;
    isNew?: boolean;
    author_id?: string;
    avatar_url?: string;
}

const MOCK_WHISPERS: Whisper[] = [
    {
        id: 'w_001',
        content: "The Architect moves in silence. Ensure your SP reserves are fortified before the next solar cycle.",
        author: "Unknown Cipher",
        alignment: 42,
        timestamp: "1 HOUR AGO",
        isEncrypted: false
    },
    {
        id: 'w_002',
        content: "0x89F2A... [DATA CORRUPTED] ...the sequence requires 4 pillars, not 3.",
        author: "Initiate 77",
        alignment: 12,
        timestamp: "1 DAY AGO",
        isEncrypted: true
    },
    {
        id: 'w_003',
        content: "We must push the 'Equipment Grant' petition to consensus today. The collective depends on it.",
        author: "Soul Weaver",
        alignment: 156,
        timestamp: "2 DAYS AGO",
        isEncrypted: false
    }
];

export default function Codex() {
    const router = useRouter();

    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<number>(1);

    const [whispers, setWhispers] = useState<Whisper[]>(MOCK_WHISPERS);
    const [newWhisper, setNewWhisper] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Telemetry State
    const [keystrokes, setKeystrokes] = useState<number[]>([]);

    // Decryption Minigame State
    const [decryptingId, setDecryptingId] = useState<string | null>(null);
    const [dialRotation, setDialRotation] = useState(0);
    const reqRef = useRef<number | null>(null);

    // GSAP Refs
    const listRef = useRef<HTMLDivElement>(null);
    const coreRefs = useRef<(HTMLDivElement | null)[]>([]);
    const fringeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const newTextRef = useRef<HTMLParagraphElement>(null);
    const ascendRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLVideoElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playSubmit = () => submitSfx?.play();
    const playEncrypt = () => encryptSfx?.play();
    const playAscend = () => ascendSfx?.play();

    // Ambient Drone (Auto-play safely inside useEffect)
    useEffect(() => {
        let ambientDrone: any = null;
        if (typeof window !== 'undefined') {
            ambientDrone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0.1,
            });
            // Try playing it, but browser policy might block until interaction. 
            // the Howler library handles this gracefully usually.
            ambientDrone.play();
        }
        return () => {
            if (ambientDrone) ambientDrone.stop();
        };
    }, []);

    // Parallax background tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 20; // max 20px move
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            gsap.to(bgRef.current, {
                x,
                y,
                duration: 1,
                ease: "power2.out"
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserAuth(user);
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) setProfile(data);
            } else {
                router.push('/');
            }
        }
        checkAuth();

        // 1. Fetch initial live whispers (assuming we have a 'codex_whispers' table, fallback to mock if none)
        const fetchWhispers = async () => {
            const { data, error } = await supabase.from('codex_whispers').select('*, author:profiles(display_name, avatar_url)').order('created_at', { ascending: false }).limit(50);
            if (data && data.length > 0 && !error) {
                const formatted = data.map(w => ({
                    id: w.id,
                    content: w.content,
                    author: w.author?.display_name || 'Anonymous',
                    author_id: w.author_id,
                    avatar_url: w.author?.avatar_url,
                    alignment: w.alignment || 0,
                    timestamp: new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isEncrypted: w.is_encrypted || false
                }));
                setWhispers(formatted);
            }
        };
        fetchWhispers();

        // 2. Subscribe to Realtime Inserts
        const channel = supabase.channel('codex_sync');
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'codex_whispers' }, async (payload) => {
            // Fetch author details for the new whisper
            const { data: profData } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', payload.new.author_id).single();

            const newW: Whisper = {
                id: payload.new.id,
                content: payload.new.content,
                author: profData?.display_name || 'Anonymous',
                author_id: payload.new.author_id,
                avatar_url: profData?.avatar_url,
                alignment: payload.new.alignment || 0,
                timestamp: "JUST NOW",
                isEncrypted: payload.new.is_encrypted,
                isNew: true
            };

            setWhispers(prev => [newW, ...prev.map(w => ({ ...w, isNew: false }))]);
            // Attempt to play a subtle SFX if the whisper didn't come from us
            // Unfortunately we can't easily check auth.id here without a ref, so we'll just play it gently.
        })
            .subscribe();

        // 3. Presence tracking (Simulated count for now until full presence is implemented)
        const presenceInterval = setInterval(() => {
            setOnlineUsers(Math.floor(Math.random() * 5) + 3); // Fake 3-8 users online
        }, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(presenceInterval);
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [router]);

    // Decryption Animation Loop
    useEffect(() => {
        if (decryptingId) {
            const animateDial = () => {
                setDialRotation(prev => (prev + 5) % 360);
                reqRef.current = requestAnimationFrame(animateDial);
            };
            reqRef.current = requestAnimationFrame(animateDial);
        } else {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        }
        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, [decryptingId]);

    // Derived State
    const coreWhispers = [...whispers].sort((a, b) => b.alignment - a.alignment).slice(0, 3);
    const fringeWhispers = [...whispers].filter(w => !coreWhispers.find(c => c.id === w.id)).sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));

    // GSAP Stagger Animation for Whispers
    useGSAP(() => {
        if (coreWhispers.length > 0 && coreRefs.current.length > 0) {
            gsap.fromTo(coreRefs.current,
                { opacity: 0, y: 20, rotateX: -20, filter: 'blur(10px)', transformPerspective: 1000 },
                { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: 1, stagger: 0.15, ease: "power3.out" }
            );
        }
        if (fringeWhispers.length > 0 && fringeRefs.current.length > 0) {
            gsap.fromTo(fringeRefs.current,
                { opacity: 0, x: -30 },
                { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: "power2.out" }
            );
        }
    }, { dependencies: [], scope: listRef });

    // GSAP Ascension Animation
    useGSAP(() => {
        if (ascendRef.current) {
            gsap.fromTo(ascendRef.current,
                { scale: 0.8, filter: 'brightness(2) blur(10px)', opacity: 0 },
                { scale: 1, filter: 'brightness(1) blur(0px)', opacity: 1, duration: 1.5, ease: "elastic.out(1, 0.3)" }
            );
        }
    }, { dependencies: [coreWhispers[0]?.id], scope: listRef });

    // GSAP TextPlugin Typewriter Effect for New Whispers
    useGSAP(() => {
        if (newTextRef.current) {
            const originalText = newTextRef.current.innerText;
            gsap.fromTo(newTextRef.current,
                { text: "" },
                { text: originalText, duration: 2.5, ease: "none", delay: 0.5 }
            );
        }
    }, { dependencies: [whispers], scope: listRef });

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleLodgeWhisper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWhisper.trim() || !userAuth) return;

        setIsSubmitting(true);

        // Simulate network / DB insert delay
        await new Promise(res => setTimeout(res, 800));

        const newlyLodged: Whisper = {
            id: `w_${Date.now()}`,
            content: newWhisper,
            author: profile?.display_name || 'Anonymous',
            author_id: userAuth.id,
            avatar_url: profile?.avatar_url,
            alignment: 1,
            timestamp: "JUST NOW",
            isEncrypted: false,
            isNew: true
        };

        // Try to insert into DB
        const { error } = await supabase.from('codex_whispers').insert([{
            author_id: userAuth.id,
            content: newWhisper,
            alignment: 1,
            is_encrypted: false
        }]);

        if (error) {
            // If table doesn't exist, just update local state (fallback)
            console.warn("Could not insert whisper to DB. Falling back to local state.", error);
            setWhispers([newlyLodged, ...whispers.map(w => ({ ...w, isNew: false }))]);
        }

        playSubmit();
        setNewWhisper('');
        setKeystrokes([]);
        setIsSubmitting(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWhisper(e.target.value);
        // Add a random height bar to the waveform for every 5 chars typed
        if (e.target.value.length % 5 === 0 && e.target.value.length > 0) {
            setKeystrokes(prev => [...prev.slice(-15), Math.random() * 100]);
        } else if (e.target.value.length === 0) {
            setKeystrokes([]);
        }
    };

    const handleAlignWhisper = (id: string, isEncrypted: boolean) => {
        if (isEncrypted) {
            playEncrypt();
            setDecryptingId(id);
            return;
        }

        playHover();

        setWhispers(prev => {
            const whisperIndex = prev.findIndex(w => w.id === id);
            if (whisperIndex === -1) return prev;

            const whisper = prev[whisperIndex];
            const newAlignment = whisper.alignment + 1;

            // Check if this was a Fringe whisper that just crossed the Core threshold (e.g., 10 alignments, or just beat the lowest core)
            const isCurrentlyFringe = fringeWhispers.some(fw => fw.id === id);
            const lowestCoreAlignment = coreWhispers.length === 3 ? coreWhispers[2].alignment : 0;

            if (isCurrentlyFringe && newAlignment > lowestCoreAlignment) {
                playAscend();
                // We'll mark it as 'justAscended' temporarily so we can attach a ref to it in The Core render loop.
                prev[whisperIndex] = { ...whisper, alignment: newAlignment, isNew: true };
            } else {
                prev[whisperIndex] = { ...whisper, alignment: newAlignment };
            }

            return [...prev];
        });
    };

    const handleAttemptDecrypt = () => {
        // Quick timing minigame logic:
        // Must click when the dial rotation is within a specific "sweet spot"
        // Let's say between 0-30 degrees or 180-210 degrees.
        const inZone = (dialRotation >= 0 && dialRotation <= 30) || (dialRotation >= 180 && dialRotation <= 210);

        if (inZone && decryptingId) {
            playSubmit(); // Success sound
            setWhispers(prev => prev.map(w =>
                w.id === decryptingId ? { ...w, isEncrypted: false } : w
            ));
            setDecryptingId(null);
        } else {
            playEncrypt(); // Fail sound
            // Flash screen red or shake modal
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-sky-500/30 font-sans flex flex-col items-center overflow-x-hidden">
            {/* Background - Codex Theme with Parallax */}
            <div className="fixed inset-0 z-0 bg-black scale-110">
                <video
                    ref={bgRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                    poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png"
                >
                    <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.1)_0%,transparent_60%)] pointer-events-none"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-2xl z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-sky-500/20">
                <button onClick={() => router.push('/sanctum')} className="text-sky-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-sky-100 leading-none drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
                        THE CODEX
                    </span>
                    <div className="flex items-center gap-2 mt-1 px-3 py-0.5 bg-sky-950/30 border border-sky-500/30 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.3)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[0_0_5px_#22d3ee]"></div>
                        <span className="text-[9px] text-cyan-300 font-mono uppercase tracking-widest font-bold">
                            {profile?.soul_power !== undefined ? `${profile.soul_power} SP` : 'UPLINK ESTABLISHING...'}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                        <span className="text-[8px] text-gray-400 font-mono tracking-widest">{onlineUsers} CONNECTED</span>
                    </div>
                </div>
                <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group p-2">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 w-full max-w-2xl relative z-10 p-4 md:p-6 pb-32 space-y-8 min-h-screen">

                {/* Protocol Info Block */}
                <div className="glass-panel p-6 rounded-2xl border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.05)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-50"></div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-950/50 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-ritual text-lg text-white font-bold tracking-widest uppercase shadow-sm">Global Ledger</h2>
                            <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
                                The Codex immutable ledger records the anonymous dispatches and decrees of the Sanctum. Lodge a whisper to guide the collective consciousness.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <form onSubmit={handleLodgeWhisper} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative glass bg-black/60 border border-white/10 rounded-2xl p-2 flex flex-col gap-2 overflow-hidden">

                        {/* Keystroke Telemetry Waveform */}
                        <div className="h-6 w-full flex items-end gap-[2px] px-4 opacity-50">
                            {keystrokes.map((val, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-sky-400 rounded-t-sm transition-all duration-75"
                                    style={{ height: `${Math.max(20, val)}%` }}
                                ></div>
                            ))}
                        </div>

                        <div className="flex gap-2 w-full">
                            <input
                                type="text"
                                value={newWhisper}
                                onChange={handleInput}
                                maxLength={140}
                                placeholder="Lodge an obsidian whisper... (140 max)"
                                className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-zinc-600 px-4 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting || !newWhisper.trim()}
                                onMouseEnter={playHover}
                                className="bg-sky-900/40 text-sky-400 hover:bg-sky-500 hover:text-black hover:shadow-[0_0_15px_rgba(14,165,233,0.6)] border border-sky-500/30 p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn shrink-0"
                            >
                                <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : 'group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform'}`} />
                            </button>
                        </div>
                    </div>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 py-2 opacity-50">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/50"></div>
                    <Hexagon className="w-4 h-4 text-sky-500" />
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/50"></div>
                </div>

                {/* Feed System */}
                <div ref={listRef} className="space-y-12">

                    {/* The Core */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-sky-500/30 pb-3">
                            <Zap className="w-5 h-5 text-sky-400" />
                            <h3 className="font-ritual text-xl text-sky-400 tracking-widest shadow-sky-500/50 drop-shadow-md">THE CORE</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {coreWhispers.map((whisper, index) => (
                                <div
                                    key={whisper.id}
                                    ref={el => {
                                        coreRefs.current[index] = el;
                                        if (whisper.isNew && whisper.alignment > 1) ascendRef.current = el; // Only attach ascend ref if it's truly new TO THE CORE, not just a brand new generic message
                                    }}
                                    className={`glass bg-sky-950/20 border ${whisper.isEncrypted ? 'border-zinc-800' : 'border-sky-500/50'} rounded-2xl p-5 relative overflow-hidden group hover:border-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all flex flex-col justify-between min-h-[160px] ${whisper.isNew && whisper.alignment > 1 ? 'shadow-[0_0_50px_rgba(14,165,233,0.8)] border-sky-300' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>

                                    <div>
                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                {whisper.avatar_url ? (
                                                    <img src={whisper.avatar_url} alt={whisper.author} className="w-6 h-6 rounded-full border border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                                                ) : (
                                                    <GenerativeIdenticon idString={whisper.author_id || whisper.author} size={24} className="border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                                                )}
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${whisper.isEncrypted ? 'bg-red-500' : 'bg-green-400 shadow-[0_0_5px_#4ade80]'}`}></div>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-sky-200">{whisper.author}</span>
                                                    </div>
                                                    <span className="text-[8px] font-mono text-sky-500/60 uppercase">{whisper.timestamp}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10">
                                            {whisper.isEncrypted ? (
                                                <p className="text-sm font-mono text-zinc-500 select-none blur-[2px] transition-all group-hover:blur-[1px]">
                                                    {whisper.content}
                                                </p>
                                            ) : (
                                                <p className="text-base font-bold font-mono text-white leading-relaxed drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                                                    "{whisper.content}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-sky-500/20 flex justify-between items-center relative z-10">
                                        <span className="text-[9px] font-mono text-sky-500/60 uppercase">{whisper.timestamp}</span>
                                        <button
                                            onClick={() => handleAlignWhisper(whisper.id, whisper.isEncrypted)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${whisper.isEncrypted
                                                ? 'border-red-500/20 text-red-500/50 cursor-not-allowed bg-red-950/20'
                                                : 'border-sky-500 text-black bg-sky-500 hover:bg-white hover:border-white shadow-[0_0_10px_rgba(14,165,233,0.8)]'
                                                }`}
                                        >
                                            <Zap className="w-3 h-3" />
                                            <span>Align ({whisper.alignment})</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* The Fringe */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <Eye className="w-4 h-4 text-zinc-500" />
                            <h3 className="font-ritual text-lg text-zinc-500 tracking-widest">THE FRINGE</h3>
                        </div>
                        <div className="space-y-3">
                            {fringeWhispers.map((whisper, index) => (
                                <div
                                    key={whisper.id}
                                    ref={el => { fringeRefs.current[index] = el; }}
                                    className={`glass bg-black/40 border ${whisper.isNew ? 'border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : whisper.isEncrypted ? 'border-zinc-900' : 'border-white/5'} rounded-xl p-4 relative overflow-hidden group hover:bg-white/5 transition-colors`}
                                >
                                    <div className="flex justify-between items-start mb-3 relative z-10 w-full">
                                        <div className="flex items-center gap-3 w-full">
                                            {whisper.avatar_url ? (
                                                <img src={whisper.avatar_url} alt={whisper.author} className="w-5 h-5 rounded-full border border-zinc-700 shadow-[0_0_5px_rgba(255,255,255,0.1)] shrink-0" />
                                            ) : (
                                                <GenerativeIdenticon idString={whisper.author_id || whisper.author} size={20} className="border-zinc-700 shadow-[0_0_5px_rgba(255,255,255,0.1)] shrink-0" />
                                            )}
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${whisper.isEncrypted ? 'bg-red-900' : whisper.isNew ? 'bg-sky-400 animate-pulse shadow-[0_0_5px_#38bdf8]' : 'bg-green-500 shadow-[0_0_5px_#22c55e]'}`}></div>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-300 truncate">{whisper.author}</span>
                                                    {whisper.isNew && <span className="text-[8px] bg-sky-500 text-black px-1.5 py-0.5 rounded font-bold uppercase ml-2 shrink-0">New</span>}
                                                </div>
                                                <span className="text-[8px] font-mono text-zinc-600 block truncate">
                                                    {whisper.timestamp}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 pl-3 border-l border-white/5">
                                        {whisper.isEncrypted ? (
                                            <p className="text-xs font-mono text-zinc-600 select-none blur-[2px]">
                                                {whisper.content}
                                            </p>
                                        ) : (
                                            <p
                                                ref={whisper.isNew ? newTextRef : null}
                                                className={`text-xs font-mono ${whisper.isNew ? 'text-sky-300 font-bold' : 'text-zinc-400'} leading-relaxed`}
                                            >
                                                {whisper.content}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-3 flex justify-between items-center relative z-10 pl-3">
                                        <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                                            {whisper.isEncrypted ? <Lock className="w-3 h-3 text-red-900" /> : <Eye className="w-3 h-3 text-zinc-600" />}
                                            {whisper.isEncrypted ? 'ENCRYPTED' : 'PUBLIC'}
                                        </span>

                                        <button
                                            onClick={() => handleAlignWhisper(whisper.id, whisper.isEncrypted)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono transition-all ${whisper.isEncrypted
                                                ? 'text-zinc-700 cursor-not-allowed hidden'
                                                : 'text-zinc-500 hover:text-sky-400 hover:bg-sky-950/30'
                                                }`}
                                        >
                                            <Zap className="w-3 h-3" />
                                            <span>Align ({whisper.alignment})</span>
                                        </button>
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
