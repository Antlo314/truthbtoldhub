'use client';

/**
 * A whisper between two souls. Newest page first with earlier history on
 * scroll-up, the view follows only when you are at the end, days are
 * marked, links open, you see when they are typing and when they have
 * read what you said.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useArchiveStore, DMMessage } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import ProfilePopout from './ProfilePopout';
import ChatComposer from './ChatComposer';
import { DEFAULT_AVATAR, presenceLabel } from '@/lib/archive/access';
import { DayDivider, RichText, clockTime, dayKey } from '@/lib/archive/chatFormat';
import { Menu, MessageSquare, ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';

const PAGE = 60;

export default function DMThread() {
    const {
        activeDmId, setActiveDmId, dmConversations, dmMessages, setDmMessages, addDmMessage,
        upsertDmConversation, setDmUnread, bumpDmConversation, onlineUsers, setIsMobileMenuOpen,
    } = useArchiveStore();
    const { user: myAuth } = useSoulStore();

    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [theyType, setTheyType] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [newBelow, setNewBelow] = useState(0);
    const endRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const atBottom = useRef(true);
    const firstPaint = useRef(true);
    const lastSeenId = useRef<string | null>(null);
    const prependFrom = useRef<number | null>(null);
    const typingCh = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const lastTypingSent = useRef(0);
    const myId = myAuth?.id;

    const conv = dmConversations.find((c) => c.id === activeDmId);
    const other = conv?.other;
    const thread = useMemo(() => (activeDmId ? dmMessages[activeDmId] || [] : []), [activeDmId, dmMessages]);
    const online = other?.id ? onlineUsers.has(other.id) : false;
    const lastMine = useMemo(() => [...thread].reverse().find((m) => m.sender_id === myId && !m.optimistic), [thread, myId]);

    // typing fades on its own
    useEffect(() => {
        if (!theyType) return;
        const t = setTimeout(() => setTheyType(0), 4000);
        return () => clearTimeout(t);
    }, [theyType]);

    useEffect(() => {
        if (!activeDmId || !myId) return;
        let cancelled = false;
        firstPaint.current = true;
        atBottom.current = true;
        lastSeenId.current = null;
        setNewBelow(0);

        const markRead = async () => {
            setDmUnread(activeDmId, 0);
            await supabase.from('dm_messages').update({ read_at: new Date().toISOString() })
                .eq('conversation_id', activeDmId).neq('sender_id', myId).is('read_at', null);
        };

        const load = async () => {
            // Ensure we know the other participant (deep-link / refresh case)
            if (!other) {
                const { data: c } = await supabase.from('dm_conversations').select('*').eq('id', activeDmId).maybeSingle();
                if (c && !cancelled) {
                    const otherId = c.user_lo === myId ? c.user_hi : c.user_lo;
                    const { data: p } = await supabase.from('profiles').select('id, display_name, avatar_url, tier, status, last_seen_at').eq('id', otherId).maybeSingle();
                    upsertDmConversation({ ...c, other: p || { id: otherId, display_name: 'Soul' }, unread: 0 });
                }
            }
            // newest page first — the oldest 100 hid every recent word in a long whisper
            const { data } = await supabase
                .from('dm_messages').select('*').eq('conversation_id', activeDmId)
                .order('created_at', { ascending: false }).limit(PAGE);
            if (data && !cancelled) {
                setHasMore(data.length === PAGE);
                setDmMessages(activeDmId, (data as DMMessage[]).reverse());
            }
            void markRead();
        };
        void load();

        const sub = supabase.channel(`dm_${activeDmId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${activeDmId}` }, (payload) => {
                const m = payload.new as DMMessage;
                addDmMessage(m);
                bumpDmConversation(activeDmId, m.created_at, m.content.slice(0, 80));
                if (m.sender_id !== myId) {
                    setTheyType(0);
                    void markRead();
                }
            })
            // read receipts: the other soul stamping read_at on your words
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${activeDmId}` }, (payload) => {
                const m = payload.new as DMMessage;
                const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
                if (!list.some((x) => x.id === m.id && x.read_at !== m.read_at)) return;
                setDmMessages(activeDmId, list.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
            })
            .subscribe();

        const tch = supabase.channel(`dm_typing_${activeDmId}`, { config: { broadcast: { self: false } } });
        tch.on('broadcast', { event: 'typing' }, ({ payload }: { payload?: { id?: string } }) => {
            if (payload?.id && payload.id !== myId) setTheyType(Date.now());
        }).subscribe();
        typingCh.current = tch;

        return () => {
            cancelled = true;
            void supabase.removeChannel(sub);
            void supabase.removeChannel(tch);
            typingCh.current = null;
            setTheyType(0);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDmId, myId]);

    // follow only at the end; hold the place when history goes in above
    const lastMsg = thread[thread.length - 1];
    useLayoutEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        if (prependFrom.current !== null) {
            el.scrollTop += el.scrollHeight - prependFrom.current;
            prependFrom.current = null;
            return;
        }
        if (!lastMsg) return;
        if (firstPaint.current) {
            firstPaint.current = false;
            lastSeenId.current = lastMsg.id;
            el.scrollTop = el.scrollHeight;
            return;
        }
        if (lastMsg.id === lastSeenId.current) return;
        lastSeenId.current = lastMsg.id;
        if (atBottom.current || lastMsg.sender_id === myId) {
            endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            setNewBelow(0);
        } else setNewBelow((n) => n + 1);
    }, [lastMsg, myId]);

    const loadOlder = useCallback(async () => {
        if (!activeDmId || loadingOlder || !hasMore) return;
        const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
        const oldest = list.find((m) => !m.optimistic);
        if (!oldest) return;
        setLoadingOlder(true);
        const { data } = await supabase
            .from('dm_messages').select('*').eq('conversation_id', activeDmId)
            .lt('created_at', oldest.created_at)
            .order('created_at', { ascending: false }).limit(PAGE);
        setLoadingOlder(false);
        if (!data) return;
        setHasMore(data.length === PAGE);
        if (!data.length) return;
        const older = (data as DMMessage[]).reverse();
        prependFrom.current = scrollerRef.current?.scrollHeight ?? null;
        const current = useArchiveStore.getState().dmMessages[activeDmId] || [];
        setDmMessages(activeDmId, [...older, ...current.filter((m) => !older.some((o) => o.id === m.id))]);
    }, [activeDmId, hasMore, loadingOlder, setDmMessages]);

    const onScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        atBottom.current = near;
        if (near && newBelow) setNewBelow(0);
        if (el.scrollTop < 120) void loadOlder();
    };

    const broadcastTyping = () => {
        const now = Date.now();
        if (now - lastTypingSent.current < 2000) return;
        lastTypingSent.current = now;
        void typingCh.current?.send({ type: 'broadcast', event: 'typing', payload: { id: myId } });
    };

    const send = async () => {
        if (!text.trim() || !activeDmId || !myId) return;
        setSending(true);
        const content = text.trim();
        const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        addDmMessage({ id: tempId, conversation_id: activeDmId, sender_id: myId, content, created_at: new Date().toISOString(), optimistic: true });
        bumpDmConversation(activeDmId, new Date().toISOString(), content.slice(0, 80));
        setText('');
        try {
            const { data, error } = await supabase.from('dm_messages')
                .insert({ conversation_id: activeDmId, sender_id: myId, content })
                .select('id, created_at').single();
            if (error) throw error;
            if (data) {
                // reconcile optimistic -> real (the realtime echo may already be in)
                const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
                const echoed = list.some((m) => m.id === data.id);
                setDmMessages(
                    activeDmId,
                    echoed ? list.filter((m) => m.id !== tempId) : list.map((m) => (m.id === tempId ? { ...m, id: data.id, created_at: data.created_at, optimistic: false } : m)),
                );
            }
        } catch (err) {
            console.error('dm send failed', err);
            const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
            setDmMessages(activeDmId, list.filter((m) => m.id !== tempId));
            setText(content);
            setSendError('That whisper didn’t send — it’s back in the box. Try again.');
            setTimeout(() => setSendError(null), 4500);
        } finally {
            setSending(false);
        }
    };

    if (!activeDmId || !conv) {
        return (
            <div className="flex-1 bg-void flex flex-col min-w-0 relative">
                <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 z-10 md:hidden bg-black/40 backdrop-blur-xl">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mr-3 text-zinc-500 hover:text-white" aria-label="Open menu"><Menu className="w-6 h-6" /></button>
                    <span className="font-ritual text-white text-[13px] tracking-widest uppercase">Whispers</span>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center relative px-6 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <div className="w-20 h-20 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-aether-gold/40" />
                    </div>
                    <h3 className="text-xl font-semibold text-white/80 mb-2">Your whispers</h3>
                    <p className="text-[14px] text-zinc-500 max-w-xs">Pick a conversation, or start a new one with the pen at the top of the list.</p>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mt-5 rounded-xl border border-white/15 px-4 py-2.5 text-[14px] text-white">
                        Open conversations
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-void flex flex-col min-w-0">
            {/* Header */}
            <header className="h-14 border-b border-white/5 flex items-center px-3 md:px-4 shrink-0 z-10 bg-black/40 backdrop-blur-md">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-1 p-1.5 text-zinc-500 hover:text-white" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
                <button onClick={() => setActiveDmId(null)} className="lg:hidden mr-1 p-1.5 text-zinc-500 hover:text-white" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                        <img src={other?.avatar_url || DEFAULT_AVATAR} alt="" className="w-9 h-9 rounded-full object-cover border border-white/5" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-void ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    </div>
                    <div className="text-left min-w-0">
                        <div className="text-white text-[15px] font-semibold truncate">{other?.display_name || 'Soul'}</div>
                        <div className="text-[11px] text-zinc-500">{theyType ? <span className="text-emerald-300">typing…</span> : presenceLabel(online, other?.last_seen_at)}</div>
                    </div>
                </button>
            </header>

            {/* Messages */}
            <div ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:px-8 relative">
                <div className="flex flex-col justify-end min-h-full">
                    {hasMore ? (
                        <div className="flex justify-center py-3">
                            <button type="button" onClick={() => void loadOlder()} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-zinc-400 hover:text-white">
                                {loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {loadingOlder ? 'Loading earlier…' : 'Load earlier'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <img src={other?.avatar_url || DEFAULT_AVATAR} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-aether-gold/30 mx-auto mb-3" />
                            <h2 className="text-lg font-semibold text-white">{other?.display_name}</h2>
                            <p className="text-[12px] text-zinc-500 mt-1">The beginning of your whispers</p>
                        </div>
                    )}

                    {thread.map((m, idx) => {
                        const mine = m.sender_id === myId;
                        const prev = thread[idx - 1];
                        const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
                        const grouped = !newDay && !!prev && prev.sender_id === m.sender_id &&
                            (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000);
                        const next = thread[idx + 1];
                        const tail = !next || next.sender_id !== m.sender_id || dayKey(next.created_at) !== dayKey(m.created_at);
                        return (
                            <div key={m.id}>
                                {newDay && <DayDivider iso={m.created_at} />}
                                <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                                    <div className={`max-w-[80%] md:max-w-[62%] px-3.5 py-2 rounded-2xl text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                                        mine ? `bg-aether-gold/15 border border-aether-gold/25 text-zinc-100 ${tail ? 'rounded-br-md' : ''}`
                                             : `bg-[#1a1720] border border-white/5 text-zinc-200 ${tail ? 'rounded-bl-md' : ''}`} ${m.optimistic ? 'opacity-60' : ''}`}>
                                        <RichText text={m.content} />
                                        {tail && <span className="block text-[10px] text-zinc-500 mt-1 text-right">{m.optimistic ? 'Sending…' : clockTime(m.created_at)}</span>}
                                    </div>
                                </div>
                                {mine && lastMine?.id === m.id && m.read_at && (
                                    <p className="mt-0.5 text-right text-[10px] text-zinc-500">Seen {clockTime(m.read_at)}</p>
                                )}
                            </div>
                        );
                    })}
                    {theyType > 0 && (
                        <div className="mt-3 flex justify-start">
                            <div className="flex items-center gap-1 rounded-2xl border border-white/5 bg-[#1a1720] px-3.5 py-3">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${i * 120}ms` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>
            </div>

            {newBelow > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            setNewBelow(0);
                        }}
                        className="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-aether-gold px-3.5 py-1.5 text-[12px] font-semibold text-black shadow-xl"
                    >
                        {newBelow} new <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Composer */}
            <div className="px-3 md:px-4 pb-4 md:pb-6 pt-1 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
                {sendError && <p className="mb-1.5 px-1 text-[12px] text-red-400">{sendError}</p>}
                <ChatComposer
                    value={text}
                    onChange={setText}
                    onSubmit={() => void send()}
                    onTyping={broadcastTyping}
                    placeholder={`Message ${other?.display_name || 'this soul'}`}
                    sending={sending}
                    autoFocusKey={activeDmId}
                />
            </div>

            {profileOpen && other?.id && <ProfilePopout userId={other.id} onClose={() => setProfileOpen(false)} />}
        </div>
    );
}
