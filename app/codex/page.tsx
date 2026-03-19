'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sparkles, Send, Eye, Shield, Lock, Hexagon, Zap, LogOut, MessageSquare, X, Trash2, Flame } from 'lucide-react';
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
    replies?: Reply[];
}

interface Reply {
    id: string;
    whisper_id: string;
    author: string;
    author_id: string;
    avatar_url?: string;
    content: string;
    timestamp: string;
}

interface ProfileOverview {
    id: string;
    display_name: string;
    soul_power: number;
    tier: string;
    created_at: string;
    avatar_url?: string;
    bio?: string;
    custom_title?: string;
    theme_color?: string;
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

export default function Archive() {
    const router = useRouter();

    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<number>(1);
    const [isLocked, setIsLocked] = useState(true); // Default locked until profile loads

    const [whispers, setWhispers] = useState<Whisper[]>(MOCK_WHISPERS);
    const [newWhisper, setNewWhisper] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reply State
    const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    // Profile Modal State
    const [selectedProfile, setSelectedProfile] = useState<ProfileOverview | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const isAdmin = profile?.tier === 'Architect';

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
                if (data) {
                    setProfile(data);
                    // Core Gating Logic
                    if (data.tier === 'Architect' || data.tier === 'Sentinel') {
                        setIsLocked(false);
                    }
                }
            } else {
                router.push('/');
            }
        }
        checkAuth();

        // 1. Fetch initial live whispers & replies (assuming we have a 'codex_whispers' table, fallback to mock if none)
        const fetchWhispers = async () => {
            const { data, error } = await supabase.from('codex_whispers').select('*, author:profiles(display_name, avatar_url), codex_replies(*, author:profiles(display_name, avatar_url))').order('created_at', { ascending: false }).limit(50);
            if (data && data.length > 0 && !error) {
                const formatted = data.map(w => ({
                    id: w.id,
                    content: w.content,
                    author: w.author?.display_name || 'Anonymous',
                    author_id: w.author_id,
                    avatar_url: w.author?.avatar_url,
                    alignment: w.alignment || 0,
                    timestamp: new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isEncrypted: w.is_encrypted || false,
                    replies: (w.codex_replies || []).map((r: any) => ({
                        id: r.id,
                        whisper_id: r.whisper_id,
                        author: r.author?.display_name || 'Anonymous',
                        author_id: r.author_id,
                        avatar_url: r.author?.avatar_url,
                        content: r.content,
                        timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                }));
                setWhispers(formatted);
            }
        };
        fetchWhispers();

        // 2. Subscribe to Realtime Inserts and Updates
        const channel = supabase.channel('codex_sync');
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'codex_whispers' }, async (payload) => {
            if (payload.eventType === 'INSERT') {
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
                    isNew: true,
                    replies: []
                };

                setWhispers(prev => {
                    if (prev.find(w => w.id === newW.id)) return prev;
                    return [newW, ...prev.map(w => ({ ...w, isNew: false }))];
                });
            } else if (payload.eventType === 'UPDATE') {
                setWhispers(prev => prev.map(w => {
                    if (w.id === payload.new.id) {
                        return { ...w, alignment: payload.new.alignment };
                    }
                    return w;
                }));
            } else if (payload.eventType === 'DELETE') {
                setWhispers(prev => prev.filter(w => w.id !== payload.old.id));
            }
        });

        // Listen for new and deleted Replies
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'codex_replies' }, async (payload) => {
            if (payload.eventType === 'INSERT') {
                const { data: profData } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', payload.new.author_id).single();

                const newR: Reply = {
                    id: payload.new.id,
                    whisper_id: payload.new.whisper_id,
                    author: profData?.display_name || 'Anonymous',
                    author_id: payload.new.author_id,
                    avatar_url: profData?.avatar_url,
                    content: payload.new.content,
                    timestamp: "JUST NOW"
                };

                setWhispers(prev => prev.map(w => {
                    if (w.id === newR.whisper_id) {
                        // Prevent duplicate if we just created it locally
                        if (w.replies?.find(r => r.id === newR.id)) return w;
                        return { ...w, replies: [...(w.replies || []), newR] };
                    }
                    return w;
                }));
            } else if (payload.eventType === 'DELETE') {
                setWhispers(prev => prev.map(w => ({
                    ...w,
                    replies: w.replies?.filter(r => r.id !== payload.old.id)
                })));
            }
        });

        setTimeout(() => channel.subscribe(), 500);

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
    const coreLimit = 1;
    const coreWhispers = [...whispers].sort((a, b) => b.alignment - a.alignment).slice(0, coreLimit);
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

    const handleUnlockWithSP = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 5, userId: session.user.id }) // $5 for 500 SP Unlock
            });
            if (!res.ok) throw new Error("Stripe checkout failed");
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (err: any) {
            console.error(err);
            alert("Error initializing sequence: " + err.message);
        }
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
            isNew: true,
            replies: []
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

    const handleAlignWhisper = async (id: string, isEncrypted: boolean) => {
        if (!userAuth) {
            alert("You must be authenticated to align whispers.");
            return;
        }

        if (isEncrypted) {
            playEncrypt();
            setDecryptingId(id);
            return;
        }

        playHover();

        // Optimistically update the UI
        let newAlignmentTarget = 1;
        setWhispers(prev => {
            const whisperIndex = prev.findIndex(w => w.id === id);
            if (whisperIndex === -1) return prev;

            const whisper = prev[whisperIndex];
            newAlignmentTarget = whisper.alignment + 1;

            // Check if this was a Fringe whisper that just crossed the Core threshold
            const isCurrentlyFringe = fringeWhispers.some(fw => fw.id === id);
            // Core limit is 1 now based on user request
            const lowestCoreAlignment = coreWhispers.length >= 1 ? coreWhispers[coreWhispers.length - 1].alignment : 0;

            if (isCurrentlyFringe && newAlignmentTarget > lowestCoreAlignment) {
                playAscend();
                prev[whisperIndex] = { ...whisper, alignment: newAlignmentTarget, isNew: true };
            } else {
                prev[whisperIndex] = { ...whisper, alignment: newAlignmentTarget };
            }

            return [...prev];
        });

        // Persist to Database if it is a real DB item (not local mock)
        if (!id.startsWith('w_')) {
            try {
                const { error } = await supabase.from('codex_whispers')
                    .update({ alignment: newAlignmentTarget })
                    .eq('id', id);

                if (error) {
                    console.error("Failed to align whisper in DB:", error);
                }
            } catch (err) {
                console.error("Alignment persistence error:", err);
            }
        }
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

    const handleDeleteWhisper = async (id: string, authorId?: string) => {
        if (!userAuth) return;
        if (userAuth.id !== authorId && !isAdmin) return;

        if (!confirm("Erase this whisper from the Archive?")) return;

        setWhispers(prev => prev.filter(w => w.id !== id));
        if (!id.startsWith('w_')) {
            await supabase.from('codex_whispers').delete().eq('id', id);
        }
        playHover();
    };

    const handleDeleteReply = async (replyId: string, whisperId: string, authorId: string) => {
        if (!userAuth) return;
        if (userAuth.id !== authorId && !isAdmin) return;

        if (!confirm("Erase this reply?")) return;

        setWhispers(prev => prev.map(w => {
            if (w.id === whisperId) {
                return { ...w, replies: w.replies?.filter(r => r.id !== replyId) };
            }
            return w;
        }));

        if (!replyId.startsWith('r_')) {
            await supabase.from('codex_replies').delete().eq('id', replyId);
        }
        playHover();
    };

    const handleLodgeReply = async (e: React.FormEvent, whisperId: string) => {
        e.preventDefault();
        if (!replyContent.trim() || !userAuth) return;

        setIsSubmittingReply(true);

        const newlyLodged: Reply = {
            id: `r_${Date.now()}`,
            whisper_id: whisperId,
            author: profile?.display_name || 'Anonymous',
            author_id: userAuth.id,
            avatar_url: profile?.avatar_url,
            content: replyContent,
            timestamp: "JUST NOW",
        };

        // Try to insert into DB
        const { error } = await supabase.from('codex_replies').insert([{
            author_id: userAuth.id,
            whisper_id: whisperId,
            content: replyContent,
        }]);

        if (error) {
            console.warn("Could not insert reply to DB. Falling back to local state.", error);
            setWhispers(prev => prev.map(w => {
                if (w.id === whisperId) {
                    return { ...w, replies: [...(w.replies || []), newlyLodged] };
                }
                return w;
            }));
        }

        playSubmit();
        setReplyContent('');
        setActiveReplyBox(null);
        setIsSubmittingReply(false);
    };

    const handleProfileClick = async (authorId?: string) => {
        if (!authorId) return;
        playHover();

        // Fetch full profile data
        const { data, error } = await supabase.from('profiles').select('*').eq('id', authorId).single();
        if (data && !error) {
            setSelectedProfile({
                id: data.id,
                display_name: data.display_name || data.username || 'Anonymous',
                soul_power: data.soul_power || 0,
                tier: data.tier || 'Initiate',
                created_at: data.created_at,
                avatar_url: data.avatar_url,
                bio: data.bio,
                custom_title: data.custom_title,
                theme_color: data.theme_color || 'sky'
            });
            setIsProfileModalOpen(true);
        }
    };

    const getThemeColorClass = (color?: string) => {
        switch (color) {
            case 'orange': return 'text-orange-500 border-orange-500/30 shadow-[0_0_15px_rgba(234,88,12,0.3)] bg-orange-950/20';
            case 'purple': return 'text-purple-500 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-950/20';
            case 'green': return 'text-green-500 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-green-950/20';
            case 'red': return 'text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-950/20';
            default: return 'text-sky-500 border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)] bg-sky-950/20';
        }
    };

    const getThemeBgGlow = (color?: string) => {
        switch (color) {
            case 'orange': return 'bg-orange-500/10';
            case 'purple': return 'bg-purple-500/10';
            case 'green': return 'bg-green-500/10';
            case 'red': return 'bg-red-500/10';
            default: return 'bg-sky-500/10';
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-sky-500/30 font-sans flex flex-col items-center overflow-x-hidden">
            {/* Background - Archive Theme with Parallax */}
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
                        THE ARCHIVE
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

            <main className={`flex-1 w-full max-w-2xl relative z-10 p-4 md:p-6 pb-32 ${isLocked ? 'flex flex-col items-center justify-center min-h-[80vh]' : 'space-y-8 min-h-screen'}`}>

                {isLocked ? (
                    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-sky-500/20 shadow-[0_0_50px_rgba(14,165,233,0.1)] text-center relative overflow-hidden w-full max-w-lg mx-auto">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.1)_0%,transparent_60%)]"></div>
                        <Lock className="w-16 h-16 text-sky-500/80 mx-auto mb-6" />
                        <h2 className="font-ritual text-3xl text-white tracking-widest uppercase shadow-sm mb-4">Archive Encrypted</h2>
                        <p className="text-sm font-mono text-gray-400 leading-relaxed mb-8 border-l-2 border-sky-500/30 pl-4 text-left">
                            The Codex contains unfiltered prophetic breakdowns and classified transmissions. Your current clearance tier <span className="text-white font-bold">(Initiate)</span> is insufficient to access these records.
                        </p>
                        
                        <div className="space-y-4 relative z-10">
                            <button onClick={() => alert("Subscription portal activating...")} className="w-full flex justify-between items-center px-6 py-4 bg-sky-900/10 hover:bg-sky-900/40 border border-sky-500/30 rounded-xl transition-all group/btn">
                                <span className="font-bold tracking-widest text-sky-400 text-xs uppercase group-hover/btn:translate-x-1 transition-transform">Ascend to Sentinel</span>
                                <span className="font-mono text-xs text-sky-200/50">$14 / Month</span>
                            </button>
                            <button onClick={handleUnlockWithSP} className="w-full flex justify-between items-center px-6 py-4 bg-orange-950/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-xl transition-all group/btn shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                                <span className="font-bold tracking-widest text-orange-400 text-xs uppercase flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform"><Flame className="w-4 h-4 text-orange-500" /> One-Time Decrypt</span>
                                <span className="font-mono text-xs text-orange-200/50">500 SP</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
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
                                The Archive immutable ledger records the anonymous dispatches and decrees of the Sanctum. Lodge a whisper to guide the collective consciousness.
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
                            {coreWhispers.length === 0 ? (
                                <div className="col-span-1 md:col-span-3 glass bg-black/40 border border-white/5 rounded-3xl p-12 text-center relative overflow-hidden group min-h-[300px] flex flex-col items-center justify-center">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                    <Sparkles className="w-12 h-12 text-sky-500/30 mb-6 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                                    <h3 className="font-ritual text-2xl md:text-3xl tracking-[0.3em] text-white/40 mb-4 uppercase">The Core is Silent</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-mono tracking-widest uppercase max-w-sm mx-auto leading-relaxed">
                                        No whispers have been inscribed into the eternal ledger. Lodge the first transmission to align the collective.
                                    </p>
                                </div>
                            ) : (
                                coreWhispers.map((whisper, index) => (
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
                                        <div className="flex justify-between items-start mb-3 relative z-10 w-full group/header cursor-default">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => handleProfileClick(whisper.author_id)} className="hover:scale-105 transition-transform">
                                                    {whisper.avatar_url ? (
                                                        <img src={whisper.avatar_url} alt={whisper.author} className="w-6 h-6 rounded-full border border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                                                    ) : (
                                                        <GenerativeIdenticon idString={whisper.author_id || whisper.author} size={24} className="border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.5)] rounded-full" />
                                                    )}
                                                </button>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${whisper.isEncrypted ? 'bg-red-500' : 'bg-green-400 shadow-[0_0_5px_#4ade80]'}`}></div>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-sky-200">{whisper.author}</span>
                                                    </div>
                                                    <span className="text-[8px] font-mono text-sky-500/60 uppercase">{whisper.timestamp}</span>
                                                </div>
                                            </div>

                                            {(userAuth?.id === whisper.author_id || isAdmin) && (
                                                <button
                                                    onClick={() => handleDeleteWhisper(whisper.id, whisper.author_id)}
                                                    className="text-sky-500/40 hover:text-red-500 transition-colors shrink-0 p-1 opacity-0 group-hover/header:opacity-100"
                                                    title="Erase Whisper"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
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
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-mono text-sky-500/60 uppercase">{whisper.timestamp}</span>

                                            {!whisper.isEncrypted && (
                                                <button
                                                    onClick={() => setActiveReplyBox(activeReplyBox === whisper.id ? null : whisper.id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/40 text-[9px] font-mono text-sky-300 hover:text-white hover:bg-sky-600/40 transition-all border border-sky-500/30 hover:border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.1)]"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span className="uppercase tracking-widest font-bold">{whisper.replies?.length ? `${whisper.replies.length} REPLIES` : 'REPLY'}</span>
                                                </button>
                                            )}
                                        </div>

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

                                    {/* Core Replies Section */}
                                    {activeReplyBox === whisper.id && (
                                        <div className="mt-4 pt-4 border-t border-sky-500/20 relative z-10">

                                            {/* Existing Replies List */}
                                            {whisper.replies && whisper.replies.length > 0 && (
                                                <div className="space-y-2 mb-4 mx-2 pl-4 border-l-2 border-sky-500/20 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar relative">
                                                    {whisper.replies.map(reply => (
                                                        <div key={reply.id} className="flex flex-col gap-1 relative group/reply hover:bg-white/[0.03] p-2 rounded-lg -ml-2 transition-colors">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => handleProfileClick(reply.author_id)} className="hover:scale-105 transition-transform">
                                                                        {reply.avatar_url ? (
                                                                            <img src={reply.avatar_url} alt={reply.author} className="w-4 h-4 rounded-full border border-sky-500/50" />
                                                                        ) : (
                                                                            <GenerativeIdenticon idString={reply.author_id || reply.author} size={16} className="border-sky-500/50 rounded-full" />
                                                                        )}
                                                                    </button>
                                                                    <span className="text-[9px] font-bold text-sky-200/80 uppercase tracking-widest">{reply.author}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[8px] font-mono text-sky-500/60">{reply.timestamp}</span>

                                                                    {(userAuth?.id === reply.author_id || isAdmin) && (
                                                                        <button
                                                                            onClick={() => handleDeleteReply(reply.id, whisper.id, reply.author_id)}
                                                                            className="text-sky-500/30 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                                                            title="Erase Reply"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] font-mono text-sky-100/70 w-full pl-6">
                                                                {reply.content}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Input Area */}
                                            <form onSubmit={(e) => handleLodgeReply(e, whisper.id)} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    placeholder="Lodge a reply..."
                                                    maxLength={100}
                                                    className="flex-1 bg-sky-950/20 border border-sky-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-sky-500/40 focus:outline-none focus:border-sky-400"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingReply || !replyContent.trim()}
                                                    className="bg-sky-500/20 text-sky-400 hover:text-black hover:bg-sky-500 border border-sky-500/50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                                >
                                                    <Send className="w-3 h-3" />
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )))}
                        </div>
                    </div>

                    {/* The Fringe */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <Eye className="w-4 h-4 text-zinc-500" />
                            <h3 className="font-ritual text-lg text-zinc-500 tracking-widest">THE FRINGE</h3>
                        </div>
                        <div className="space-y-3">
                            {fringeWhispers.length === 0 ? (
                                <div className="glass bg-black/40 border border-white/5 rounded-xl p-8 text-center relative overflow-hidden group">
                                    <Eye className="w-8 h-8 text-zinc-600/50 mb-4 mx-auto" />
                                    <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                                        The Fringe is empty. No public whispers orbit the Core.
                                    </p>
                                </div>
                            ) : (
                                fringeWhispers.map((whisper, index) => (
                                <div
                                    key={whisper.id}
                                    ref={el => { fringeRefs.current[index] = el; }}
                                    className={`glass bg-black/40 border ${whisper.isNew ? 'border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : whisper.isEncrypted ? 'border-zinc-900' : 'border-white/5'} rounded-xl p-4 relative overflow-hidden group hover:bg-white/5 transition-colors`}
                                >
                                    <div className="flex justify-between items-start mb-3 relative z-10 w-full group/header">
                                        <div className="flex items-center gap-3 w-full pr-6">
                                            <button onClick={() => handleProfileClick(whisper.author_id)} className="hover:scale-105 transition-transform shrink-0">
                                                {whisper.avatar_url ? (
                                                    <img src={whisper.avatar_url} alt={whisper.author} className="w-5 h-5 rounded-full border border-zinc-700 shadow-[0_0_5px_rgba(255,255,255,0.1)]" />
                                                ) : (
                                                    <GenerativeIdenticon idString={whisper.author_id || whisper.author} size={20} className="border-zinc-700 shadow-[0_0_5px_rgba(255,255,255,0.1)] rounded-full" />
                                                )}
                                            </button>
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

                                        {(userAuth?.id === whisper.author_id || isAdmin) && (
                                            <button
                                                onClick={() => handleDeleteWhisper(whisper.id, whisper.author_id)}
                                                className="absolute top-0 right-0 text-zinc-600 hover:text-red-500 transition-colors shrink-0 p-1 opacity-0 group-hover/header:opacity-100 bg-black/40 rounded-bl-lg"
                                                title="Erase Whisper"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
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
                                        <div className="flex flex-wrap items-center gap-4">
                                            <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                                                {whisper.isEncrypted ? <Lock className="w-3 h-3 text-red-900" /> : <Eye className="w-3 h-3 text-zinc-600" />}
                                                {whisper.isEncrypted ? 'ENCRYPTED' : 'PUBLIC'}
                                            </span>

                                            {!whisper.isEncrypted && (
                                                <button
                                                    onClick={() => setActiveReplyBox(activeReplyBox === whisper.id ? null : whisper.id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/60 text-[9px] font-mono text-zinc-400 hover:text-sky-400 hover:bg-sky-950/50 transition-all border border-zinc-800 hover:border-sky-500/30"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span className="uppercase tracking-widest font-bold">{whisper.replies?.length ? `${whisper.replies.length} REPLIES` : 'REPLY'}</span>
                                                </button>
                                            )}
                                        </div>

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

                                    {/* Fringe Replies Section */}
                                    {activeReplyBox === whisper.id && (
                                        <div className="mt-4 pt-4 border-t border-white/5 relative z-10">

                                            {/* Existing Replies List */}
                                            {whisper.replies && whisper.replies.length > 0 && (
                                                <div className="space-y-2 mb-4 mx-2 pl-4 border-l-2 border-zinc-700 relative">
                                                    {whisper.replies.map(reply => (
                                                        <div key={reply.id} className="flex flex-col gap-1 relative group/reply hover:bg-white/[0.03] p-2 rounded-lg -ml-2 transition-colors">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => handleProfileClick(reply.author_id)} className="hover:scale-105 transition-transform">
                                                                        {reply.avatar_url ? (
                                                                            <img src={reply.avatar_url} alt={reply.author} className="w-4 h-4 rounded-full border border-sky-500/20" />
                                                                        ) : (
                                                                            <GenerativeIdenticon idString={reply.author_id || reply.author} size={16} className="border-sky-500/20 rounded-full" />
                                                                        )}
                                                                    </button>
                                                                    <span className="text-[9px] font-bold text-sky-200/80 uppercase tracking-widest">{reply.author}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[8px] font-mono text-zinc-600">{reply.timestamp}</span>

                                                                    {(userAuth?.id === reply.author_id || isAdmin) && (
                                                                        <button
                                                                            onClick={() => handleDeleteReply(reply.id, whisper.id, reply.author_id)}
                                                                            className="text-zinc-600 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                                                            title="Erase Reply"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] font-mono text-zinc-400 w-full pl-6">
                                                                {reply.content}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Input Area */}
                                            <form onSubmit={(e) => handleLodgeReply(e, whisper.id)} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    placeholder="Lodge a reply..."
                                                    maxLength={100}
                                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingReply || !replyContent.trim()}
                                                    className="bg-zinc-900/40 text-zinc-400 hover:text-white hover:bg-sky-500/40 border border-white/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                                >
                                                    <Send className="w-3 h-3" />
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )))}
                        </div>
                    </div>

                </div>
                </>
                )}
            </main>

            {/* Profile Overview Modal */}
            {isProfileModalOpen && selectedProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}></div>
                    <div className="relative glass-panel bg-zinc-950/90 border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-sm animate-fade-in shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl mix-blend-screen pointer-events-none opacity-50 ${getThemeBgGlow(selectedProfile.theme_color)}`}></div>

                        <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 relative group">
                                {selectedProfile.avatar_url ? (
                                    <img src={selectedProfile.avatar_url} alt={selectedProfile.display_name} className={`w-20 h-20 rounded-2xl object-cover ${getThemeColorClass(selectedProfile.theme_color)}`} />
                                ) : (
                                    <GenerativeIdenticon idString={selectedProfile.id || selectedProfile.display_name} size={80} className={`rounded-2xl ${getThemeColorClass(selectedProfile.theme_color)}`} />
                                )}
                            </div>

                            <h2 className="font-ritual text-2xl font-bold tracking-widest text-white">{selectedProfile.display_name}</h2>

                            {selectedProfile.custom_title && (
                                <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${getThemeColorClass(selectedProfile.theme_color).split(' ')[0]}`}>
                                    {selectedProfile.custom_title}
                                </span>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[9px] px-2 py-0.5 rounded border border-white/10 uppercase tracking-[0.2em] font-bold text-zinc-400">
                                    {selectedProfile.tier}
                                </span>
                                <span className="text-[9px] px-2 py-0.5 rounded border border-sky-500/30 uppercase tracking-[0.2em] font-bold bg-sky-950/30 text-sky-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> {selectedProfile.soul_power} SP
                                </span>
                            </div>

                            {selectedProfile.bio && (
                                <p className="mt-4 text-xs font-mono text-zinc-400 leading-relaxed max-w-[250px] mx-auto border-t border-white/5 pt-4">
                                    "{selectedProfile.bio}"
                                </p>
                            )}

                            <div className="mt-6 w-full text-center">
                                <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest block">
                                    Initiated on {new Date(selectedProfile.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
