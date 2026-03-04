'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sparkles, Send, Eye, Shield, Lock, Hexagon, Zap, LogOut } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let submitSfx: any = null;
let encryptSfx: any = null;

if (typeof window !== 'undefined') {
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
}

// Mock Data structure for Whispers if no table exists
interface Whisper {
    id: string;
    content: string;
    author: string;
    alignment: number;
    timestamp: string;
    isEncrypted: boolean;
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

    const [whispers, setWhispers] = useState<Whisper[]>(MOCK_WHISPERS);
    const [newWhisper, setNewWhisper] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // GSAP Refs
    const listRef = useRef<HTMLDivElement>(null);
    const whispersRef = useRef<(HTMLDivElement | null)[]>([]);

    const playHover = () => uiHoverSfx?.play();
    const playSubmit = () => submitSfx?.play();
    const playEncrypt = () => encryptSfx?.play();

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
    }, [router]);

    // GSAP Stagger Animation for Whispers
    useGSAP(() => {
        if (whispers.length > 0 && whispersRef.current.length > 0) {
            gsap.fromTo(whispersRef.current,
                { opacity: 0, x: -30, filter: 'blur(10px)' },
                { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.15, ease: "power3.out" }
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
            alignment: 1,
            timestamp: "JUST NOW",
            isEncrypted: false
        };

        playSubmit();
        setWhispers([newlyLodged, ...whispers]);
        setNewWhisper('');
        setIsSubmitting(false);

        // Slightly re-trigger GSAP for the new item
        if (whispersRef.current[0]) {
            gsap.fromTo(whispersRef.current[0],
                { scale: 1.05, backgroundColor: 'rgba(56, 189, 248, 0.2)' },
                { scale: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', duration: 1 }
            );
        }
    };

    const handleAlignWhisper = (id: string, isEncrypted: boolean) => {
        if (isEncrypted) {
            playEncrypt();
            // Could trigger a toast here saying "Requires Level 3 Decryption"
            return;
        }

        playHover();
        setWhispers(prev => prev.map(w =>
            w.id === id ? { ...w, alignment: w.alignment + 1 } : w
        ));
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-sky-500/30 font-sans flex flex-col items-center">
            {/* Background - Codex Theme */}
            <div className="fixed inset-0 z-0 bg-black">
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png">
                    <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.1)_0%,transparent_60%)] pointer-events-none"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-2xl z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-sky-500/20">
                <button onClick={() => router.push('/sanctum')} className="text-sky-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center pl-8">
                    <span className="font-ritual text-sm font-bold tracking-widest text-sky-100 leading-none drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
                        THE CODEX
                    </span>
                    <span className="text-[9px] text-sky-500/80 font-mono uppercase tracking-[0.2em]">
                        Obsidian Whispers
                    </span>
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
                    <div className="relative glass bg-black/60 border border-white/10 rounded-2xl p-2 flex gap-2">
                        <input
                            type="text"
                            value={newWhisper}
                            onChange={(e) => setNewWhisper(e.target.value)}
                            maxLength={140}
                            placeholder="Lodge an obsidian whisper... (140 max)"
                            className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-zinc-600 px-4 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting || !newWhisper.trim()}
                            onMouseEnter={playHover}
                            className="bg-sky-900/40 text-sky-400 hover:bg-sky-500 hover:text-black hover:shadow-[0_0_15px_rgba(14,165,233,0.6)] border border-sky-500/30 p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : 'group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform'}`} />
                        </button>
                    </div>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 py-2 opacity-50">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-sky-500/50"></div>
                    <Hexagon className="w-4 h-4 text-sky-500" />
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-sky-500/50"></div>
                </div>

                {/* Feed */}
                <div className="space-y-4" ref={listRef}>
                    {whispers.map((whisper, index) => (
                        <div
                            key={whisper.id}
                            ref={el => { whispersRef.current[index] = el }}
                            className={`glass bg-white/5 border ${whisper.isEncrypted ? 'border-zinc-800' : 'border-white/10'} rounded-2xl p-5 relative overflow-hidden group hover:border-sky-500/30 transition-colors`}
                        >
                            {/* Decorative scanline overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>

                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${whisper.isEncrypted ? 'bg-red-500' : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]'}`}></div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">{whisper.author}</span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-600">
                                    {whisper.timestamp}
                                </span>
                            </div>

                            <div className="relative z-10 pl-4 border-l border-white/10">
                                {whisper.isEncrypted ? (
                                    <p className="text-sm font-mono text-zinc-500 select-none blur-[2px] transition-all group-hover:blur-[1px]">
                                        {whisper.content}
                                    </p>
                                ) : (
                                    <p className="text-sm font-mono text-white leading-relaxed">
                                        "{whisper.content}"
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                                    {whisper.isEncrypted ? <Lock className="w-3 h-3 text-red-500/50" /> : <Eye className="w-3 h-3 text-sky-500/50" />}
                                    {whisper.isEncrypted ? 'ENCRYPTED' : 'PUBLIC'}
                                </span>

                                <button
                                    onClick={() => handleAlignWhisper(whisper.id, whisper.isEncrypted)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all ${whisper.isEncrypted
                                        ? 'border-red-500/20 text-red-500/50 cursor-not-allowed bg-red-950/20'
                                        : 'border-sky-500/30 text-sky-400 hover:bg-sky-500 hover:text-black hover:shadow-[0_0_10px_rgba(14,165,233,0.5)]'
                                        }`}
                                >
                                    <Zap className="w-3 h-3" />
                                    <span>Align ({whisper.alignment})</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
