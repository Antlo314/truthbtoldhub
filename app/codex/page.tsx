"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    ArrowLeft, 
    Send, 
    Shield, 
    Sparkles, 
    Lock, 
    MessageSquare, 
    X, 
    Hexagon,
    Database,
    Zap,
    LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import gsap from 'gsap';
import SentinelGuide from '@/components/guide/SentinelGuide';

// --- Types ---
type Reply = {
    id: string;
    whisper_id: string;
    author: string;
    author_id: string;
    avatar_url?: string;
    content: string;
    timestamp: string;
};

type Whisper = {
    id: string;
    content: string;
    author: string;
    author_id: string;
    avatar_url?: string;
    alignment: number;
    timestamp: string;
    isEncrypted?: boolean;
    isNew?: boolean;
    replies?: Reply[];
};

type ProfileOverview = {
    id: string;
    display_name: string;
    avatar_url?: string;
    tier: string;
    soul_power: number;
    bio?: string;
    custom_title?: string;
};

// --- Protocol Steps ---
const CODEX_PROTOCOL_STEPS = [
    { title: "ACCESS GRANTED", description: "You have breached the Sovereign Ledger. All data is encrypted with AES-256." },
    { title: "ALIGNED WHISPERS", description: "Core whispers represent the collective consciousness. Fringe signals are unverified." },
    { title: "LODGING RECORDS", description: "Every record you lodge is etched permanently into the sequence." },
    { title: "DECRYPTION", description: "Some records require soul-power alignment to decrypt. Use caution." }
];

// --- Sub-Components ---
const GenerativeIdenticon = ({ idString, size = 40 }: { idString: string, size?: number }) => {
    const hash = useMemo(() => {
        let h = 0;
        for (let i = 0; i < idString.length; i++) {
            h = idString.charCodeAt(i) + ((h << 5) - h);
        }
        return h;
    }, [idString]);

    const color = `hsl(${hash % 360}, 70%, 60%)`;
    const shape = hash % 3 === 0 ? 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' : 
                  hash % 3 === 1 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'circle(50% at 50% 50%)';

    return (
        <div 
            style={{ 
                width: size, 
                height: size, 
                backgroundColor: color, 
                clipPath: shape,
                opacity: 0.8,
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
            }} 
        />
    );
};

const WhisperCard = ({ 
    whisper, 
    isCore = false, 
    onAlign, 
    onDelete,
    onReplyClick
}: { 
    whisper: Whisper, 
    isCore?: boolean, 
    onAlign: () => void, 
    onDelete: () => void,
    onReplyClick: () => void
}) => {
    return (
        <div className={`relative group ${whisper.isNew ? 'animate-pulse-once' : ''}`}>
            {/* Ambient Background Glow */}
            <div className={`absolute -inset-2 bg-gradient-to-br ${isCore ? 'from-aether-gold/10' : 'from-aether-indigo/5'} to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl`} />
            
            <div className={`relative glass-panel p-8 rounded-[2rem] border ${isCore ? 'border-aether-gold/20 shadow-[0_0_40px_rgba(251,191,36,0.05)]' : 'border-white/5'} transition-all duration-500 hover:border-white/20 overflow-hidden`}>
                {/* Decorative Accents */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${isCore ? 'from-aether-gold/5' : 'from-white/5'} to-transparent pointer-events-none`} />
                {isCore && <div className="absolute top-6 right-8"><Sparkles className="w-4 h-4 text-aether-gold/40" /></div>}

                <div className="flex items-start gap-6">
                    {/* Author Identity */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-aether-gold/20 to-aether-indigo/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                            {whisper.avatar_url ? (
                                <img src={whisper.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10 relative z-10" />
                            ) : (
                                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 relative z-10">
                                    <GenerativeIdenticon idString={whisper.id} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{whisper.author}</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{whisper.timestamp}</span>
                            {isCore && <span className="text-[8px] bg-aether-gold/10 text-aether-gold px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-aether-gold/20 ml-2">Core Sequence</span>}
                        </div>

                        <div className="relative">
                            {whisper.isEncrypted ? (
                                <div className="flex flex-col gap-4 py-4">
                                    <div className="space-y-2">
                                        <div className="h-2 w-3/4 bg-white/5 rounded-full animate-pulse" />
                                        <div className="h-2 w-1/2 bg-white/5 rounded-full animate-pulse" />
                                    </div>
                                    <button 
                                        onClick={onAlign}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-aether-gold hover:text-white transition-colors"
                                    >
                                        <Lock className="w-3 h-3" /> Initiate Decryption
                                    </button>
                                </div>
                            ) : (
                                <p className={`text-base md:text-lg font-mono leading-relaxed text-zinc-200 selection:bg-aether-gold selection:text-black`}>
                                    {whisper.content}
                                </p>
                            )}
                        </div>

                        {/* Interaction Bar */}
                        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={onReplyClick}
                                    className="flex items-center gap-2 group/btn"
                                >
                                    <div className="p-2 rounded-lg bg-white/5 group-hover/btn:bg-white/10 transition-colors">
                                        <MessageSquare className="w-4 h-4 text-zinc-500 group-hover/btn:text-white transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-zinc-600 group-hover/btn:text-zinc-300 uppercase tracking-widest">
                                        {whisper.replies?.length || 0} Replies
                                    </span>
                                </button>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                                    <Shield className="w-3 h-3" />
                                    <span>Signal: {whisper.alignment > 0 ? '+' : ''}{whisper.alignment}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <button className="p-2 text-zinc-600 hover:text-aether-gold transition-colors">
                                    <Zap className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={onDelete}
                                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Archive Component ---
export default function Archive() {
    const router = useRouter();
    const { user, profile, fetchIdentity, signOut } = useSoulStore();
    
    // State
    const [whispers, setWhispers] = useState<Whisper[]>([]);
    const [newWhisper, setNewWhisper] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState(5);
    const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [decryptingId, setDecryptingId] = useState<string | null>(null);
    const [dialRotation, setDialRotation] = useState(0);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<ProfileOverview | null>(null);
    const [keystrokes, setKeystrokes] = useState<number[]>([]);

    // Refs
    const bgRef = useRef<HTMLVideoElement>(null);
    const coreRefs = useRef<(HTMLDivElement | null)[]>([]);
    const fringeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const listRef = useRef<HTMLDivElement>(null);
    const reqRef = useRef<number | null>(null);
    const ascendRef = useRef<HTMLDivElement>(null);

    // Audio SFX (Conceptual)
    const playHover = () => {};
    const playSubmit = () => {};
    const playAlign = () => {};

    // Data Categorization
    const coreWhispers = useMemo(() => whispers.filter(w => w.alignment >= 50).sort((a, b) => b.alignment - a.alignment), [whispers]);
    const fringeWhispers = useMemo(() => whispers.filter(w => w.alignment < 50), [whispers]);
    const activeWhisper = useMemo(() => whispers.find(w => w.id === activeReplyBox), [whispers, activeReplyBox]);

    // Initial Load & Realtime
    useEffect(() => {
        // 0. Fetch identity if not already present
        if (!user) fetchIdentity();

        // 1. Fetch initial whispers with replies
        const fetchWhispers = async () => {
            const { data, error } = await supabase
                .from('codex_whispers')
                .select(`
                    *,
                    author:profiles!author_id(display_name, avatar_url),
                    replies:codex_replies(*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching whispers:", error);
            } else if (data) {
                // Manually attach profile info to replies (since Supabase select doesn't do 3-level deep well in one go easily)
                const formatted = data.map((w: any) => ({
                    id: w.id,
                    content: w.content,
                    author: w.author?.display_name || 'Anonymous',
                    author_id: w.author_id,
                    avatar_url: w.author?.avatar_url,
                    alignment: w.alignment || 0,
                    isEncrypted: w.is_encrypted,
                    timestamp: new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    replies: (w.replies || []).map((r: any) => ({
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
                setWhispers(prev => [newW, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setWhispers(prev => prev.map(w => w.id === payload.new.id ? { ...w, alignment: payload.new.alignment } : w));
            } else if (payload.eventType === 'DELETE') {
                setWhispers(prev => prev.filter(w => w.id !== payload.old.id));
            }
        });

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
                setWhispers(prev => prev.map(w => w.id === newR.whisper_id ? { ...w, replies: [...(w.replies || []), newR] } : w));
            }
        });

        channel.subscribe();
        const presenceInterval = setInterval(() => setOnlineUsers(Math.floor(Math.random() * 5) + 3), 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(presenceInterval);
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, []);

    // Handlers
    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleInitiateSequence = () => {
        setIsLocked(false);
        setIsGuideOpen(true);
    };

    const handleGuideComplete = () => {
        setIsGuideOpen(false);
    };

    const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: 'power2.out' });
    };

    const handleMagneticLeave = (e: React.MouseEvent<HTMLElement>) => {
        gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    };

    const handleLodgeWhisper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWhisper.trim() || !user) return;
        setIsSubmitting(true);
        const { error } = await supabase.from('codex_whispers').insert([{
            author_id: user.id,
            content: newWhisper,
            alignment: 1,
            is_encrypted: false
        }]);
        if (error) console.error(error);
        setNewWhisper('');
        setIsSubmitting(false);
    };

    const handleLodgeReply = async (e: React.FormEvent, whisperId: string) => {
        e.preventDefault();
        if (!replyContent.trim() || !user) return;
        setIsSubmittingReply(true);
        const { error } = await supabase.from('codex_replies').insert([{
            author_id: user.id,
            whisper_id: whisperId,
            content: replyContent
        }]);
        if (error) console.error(error);
        setReplyContent('');
        setIsSubmittingReply(false);
    };

    const handleAlignWhisper = async (id: string, isEncrypted?: boolean) => {
        if (isEncrypted) {
            setDecryptingId(id);
            return;
        }
        playAlign();
        await supabase.rpc('align_whisper', { whisper_id: id });
    };

    const handleAttemptDecrypt = async () => {
        if (!decryptingId) return;
        await supabase.rpc('decrypt_whisper', { whisper_id: decryptingId });
        setDecryptingId(null);
    };

    const handleDeleteWhisper = async (id: string, authorId: string) => {
        if (user?.id !== authorId) return;
        await supabase.from('codex_whispers').delete().eq('id', id);
    };

    return (
        <div className="min-h-screen bg-aether-deep text-white font-mono overflow-x-hidden selection:bg-aether-gold selection:text-black">
            {/* Visual Infrastructure */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05)_0%,transparent_100%)] pointer-events-none" />
                <div className="absolute inset-0 bg-black opacity-20 pointer-events-none" />
                <video
                    ref={bgRef}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.08] mix-blend-screen pointer-events-none"
                    poster="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png"
                >
                    <source src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.mp4" type="video/mp4" />
                </video>
            </div>

            {/* Protocol Overlays */}
            <div ref={ascendRef} className="fixed inset-0 bg-aether-gold/10 z-[9999] pointer-events-none opacity-0" />
            <SentinelGuide 
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                onComplete={handleGuideComplete}
                steps={CODEX_PROTOCOL_STEPS}
                protocolName="CODEX PROTOCOL"
            />

            {/* Enterprise Header */}
            <header className="sticky top-0 w-full z-[60] glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/')} 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="text-zinc-500 hover:text-white transition-colors p-2"
                        title="Back to Sanctuary"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="hidden md:flex flex-col">
                        <span className="text-[8px] uppercase tracking-[0.4em] text-aether-gold/60 mb-0.5">Memory</span>
                        <h1 className="font-ritual text-xl tracking-[0.2em] text-white uppercase gold-shimmer">The Codex</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center h-2 gap-[1.5px]">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.08}s`, width: '2px' }} />
                                ))}
                            </div>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Whispers of the aligned · 432Hz</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-5 py-2 bg-black/60 border border-white/10 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                            <div className="w-2 h-2 rounded-full bg-emerald-500 relative shadow-[0_0_10px_#10b981]" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                            <span className="text-emerald-400">{onlineUsers}</span> Souls Live
                        </span>
                    </div>
                    <button 
                        onClick={handleSignOut}
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="p-3 text-zinc-500 hover:text-red-500 transition-colors bg-white/5 rounded-full hover:bg-white/10 border border-white/5"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16">
                {isLocked ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="glass-panel p-12 rounded-[3rem] border-white/5 shadow-2xl relative overflow-hidden max-w-md w-full group">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
                            <div className="relative z-10">
                                <div className="w-20 h-20 mx-auto bg-aether-surface border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform duration-700">
                                    <Lock className="w-8 h-8 text-aether-gold animate-pulse" />
                                </div>
                                <h2 className="font-ritual text-3xl text-white tracking-[0.3em] uppercase mb-4">Ledger Locked</h2>
                                <p className="text-xs font-mono text-zinc-500 leading-relaxed uppercase tracking-widest mb-10">
                                    This archive requires identity verification. Align your soul to establish a secure uplink.
                                </p>
                                <button 
                                    onClick={handleInitiateSequence}
                                    onMouseMove={handleMagneticMove}
                                    onMouseLeave={handleMagneticLeave}
                                    className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-aether-gold transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                >
                                    Initiate Sequence
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* Lodge Record Section */}
                        <section>
                            <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-aether-gold/40 to-transparent" />
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 bg-aether-gold/10 rounded-xl flex items-center justify-center border border-aether-gold/20">
                                        <Sparkles className="w-5 h-5 text-aether-gold" />
                                    </div>
                                    <h2 className="font-ritual text-xl tracking-[0.2em] uppercase text-white/90">Lodge New Record</h2>
                                </div>

                                <form onSubmit={handleLodgeWhisper} className="relative">
                                    <textarea 
                                        value={newWhisper}
                                        onChange={(e) => setNewWhisper(e.target.value)}
                                        placeholder="Type into the void... it will be etched into the sequence."
                                        className="w-full min-h-[160px] bg-black/30 border border-white/5 rounded-3xl p-8 text-zinc-200 font-mono text-base placeholder:text-zinc-700 focus:outline-none focus:border-aether-gold/30 transition-all resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                                    />
                                    <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-6">
                                        <div className="flex items-center gap-6 text-[9px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${newWhisper.length > 0 ? 'bg-aether-gold animate-pulse shadow-[0_0_8px_#fbbf24]' : 'bg-zinc-800'}`} />
                                                <span>AES-256 Active</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Database className="w-3 h-3" />
                                                <span>Payload: {newWhisper.length} Bytes</span>
                                            </div>
                                        </div>
                                        <button 
                                            type="submit"
                                            disabled={!newWhisper.trim() || isSubmitting}
                                            onMouseMove={handleMagneticMove}
                                            onMouseLeave={handleMagneticLeave}
                                            className="w-full md:w-auto px-10 py-4 bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-full hover:bg-aether-gold transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                                        >
                                            {isSubmitting ? 'ETCHING SEQUENCE...' : 'Lodge Record'}
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>

                        <div className="space-y-32" ref={listRef}>
                            {/* Core Alignment */}
                            <section>
                                <div className="flex items-center gap-6 mb-12 opacity-30">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20" />
                                    <div className="flex items-center gap-3 px-6 py-2 border border-white/10 rounded-full">
                                        <Shield className="w-4 h-4 text-aether-gold" />
                                        <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] font-bold">The Core Sequence</h3>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20" />
                                </div>
                                <div className="space-y-10">
                                    {coreWhispers.map((whisper) => (
                                        <div key={whisper.id} className="relative">
                                            <WhisperCard 
                                                whisper={whisper} 
                                                isCore 
                                                onAlign={() => handleAlignWhisper(whisper.id, whisper.isEncrypted)}
                                                onDelete={() => handleDeleteWhisper(whisper.id, whisper.author_id)}
                                                onReplyClick={() => setActiveReplyBox(activeReplyBox === whisper.id ? null : whisper.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Fringe Whispers */}
                            <section>
                                <div className="flex items-center gap-6 mb-12 opacity-30">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                    <div className="flex items-center gap-3 px-6 py-2 border border-white/10 rounded-full">
                                        <Hexagon className="w-4 h-4 text-zinc-500" />
                                        <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] font-bold">Fringe Signals</h3>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                </div>
                                <div className="grid grid-cols-1 gap-8">
                                    {fringeWhispers.map((whisper) => (
                                        <div key={whisper.id}>
                                            <WhisperCard 
                                                whisper={whisper} 
                                                onAlign={() => handleAlignWhisper(whisper.id, whisper.isEncrypted)}
                                                onDelete={() => handleDeleteWhisper(whisper.id, whisper.author_id)}
                                                onReplyClick={() => setActiveReplyBox(activeReplyBox === whisper.id ? null : whisper.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </main>

            {/* Thread Navigation Overlay (Modal) */}
            {activeReplyBox && activeWhisper && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end md:p-6">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveReplyBox(null)} />
                    <div className="relative w-full max-w-2xl h-full bg-aether-surface border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col animate-slide-in">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-4">
                                <MessageSquare className="w-5 h-5 text-aether-gold" />
                                <h3 className="font-ritual text-lg tracking-widest uppercase text-white">The Thread</h3>
                            </div>
                            <button onClick={() => setActiveReplyBox(null)} className="p-3 text-zinc-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                            <div className="glass-panel p-8 rounded-3xl border-white/10 relative overflow-hidden">
                                <p className="text-xl md:text-2xl font-mono leading-relaxed text-white">{activeWhisper.content}</p>
                            </div>
                            <div className="space-y-6">
                                {activeWhisper.replies?.map((reply) => (
                                    <div key={reply.id} className="glass-panel p-6 rounded-2xl border-white/5">
                                        <p className="text-sm font-mono text-zinc-300 leading-relaxed mb-6">{reply.content}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-mono font-bold text-aether-gold uppercase tracking-widest">{reply.author}</span>
                                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{reply.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/5 bg-black/40">
                            <form onSubmit={(e) => handleLodgeReply(e, activeWhisper.id)} className="flex gap-4">
                                <textarea 
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Add to the sequence..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono text-zinc-300 focus:outline-none resize-none h-14"
                                />
                                <button type="submit" className="px-6 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:bg-aether-gold transition-colors">Lodge</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Decryption Protocol Overlay */}
            {decryptingId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
                    <div className="w-full max-w-sm text-center">
                        <Lock className="w-16 h-16 text-aether-gold mx-auto mb-12 animate-pulse" />
                        <h2 className="font-ritual text-3xl text-white tracking-[0.3em] uppercase mb-4">Decryption Signal</h2>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em] mb-12">Synchronizing Aetheric Waveform...</p>
                        <div className="flex gap-4">
                            <button onClick={() => setDecryptingId(null)} className="flex-1 py-4 border border-white/10 rounded-2xl text-[10px] uppercase text-zinc-500 hover:text-white transition-colors">Abort</button>
                            <button onClick={handleAttemptDecrypt} className="flex-1 py-4 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:bg-aether-gold transition-all">Confirm Bypass</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {isProfileModalOpen && selectedProfile && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
                    <div className="relative glass-panel bg-aether-surface border border-white/10 p-10 rounded-[3rem] w-full max-w-sm text-center">
                        <h2 className="font-ritual text-3xl text-white tracking-widest mb-2 uppercase">{selectedProfile.display_name}</h2>
                        <button onClick={() => setIsProfileModalOpen(false)} className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Close Sequence</button>
                    </div>
                </div>
            )}
        </div>
    );
}
