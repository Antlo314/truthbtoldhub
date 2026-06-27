'use client';

import { useEffect, useState, useRef } from 'react';
import { useArchiveStore, DMMessage } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import ProfilePopout from './ProfilePopout';
import { DEFAULT_AVATAR, relativeTime, presenceLabel } from '@/lib/archive/access';
import { Send, Menu, MessageSquare, ArrowLeft } from 'lucide-react';

export default function DMThread() {
    const {
        activeDmId, setActiveDmId, dmConversations, dmMessages, setDmMessages, addDmMessage,
        upsertDmConversation, setDmUnread, bumpDmConversation, onlineUsers, setIsMobileMenuOpen,
    } = useArchiveStore();
    const { profile: myProfile, user: myAuth } = useSoulStore();

    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const myId = myAuth?.id;

    const conv = dmConversations.find((c) => c.id === activeDmId);
    const other = conv?.other;
    const thread = activeDmId ? (dmMessages[activeDmId] || []) : [];
    const online = other?.id ? onlineUsers.has(other.id) : false;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread.length]);

    useEffect(() => {
        if (!activeDmId || !myId) return;
        let cancelled = false;

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
            const { data } = await supabase
                .from('dm_messages').select('*').eq('conversation_id', activeDmId)
                .order('created_at', { ascending: true }).limit(100);
            if (data && !cancelled) setDmMessages(activeDmId, data as DMMessage[]);
            markRead();
        };
        load();

        const sub = supabase.channel(`dm_${activeDmId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${activeDmId}` }, (payload) => {
                const m = payload.new as DMMessage;
                addDmMessage(m);
                bumpDmConversation(activeDmId, m.created_at, m.content.slice(0, 80));
                if (m.sender_id !== myId) markRead();
            })
            .subscribe();

        return () => { cancelled = true; supabase.removeChannel(sub); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDmId, myId]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
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
                // reconcile optimistic -> real
                const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
                setDmMessages(activeDmId, list.map((m) => m.id === tempId ? { ...m, id: data.id, created_at: data.created_at, optimistic: false } : m));
            }
        } catch (err) {
            console.error('dm send failed', err);
            const list = useArchiveStore.getState().dmMessages[activeDmId] || [];
            setDmMessages(activeDmId, list.filter((m) => m.id !== tempId));
            setText(content);
        } finally {
            setSending(false);
        }
    };

    if (!activeDmId || !conv) {
        return (
            <div className="flex-1 bg-void flex flex-col min-w-0 relative">
                <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 z-10 md:hidden bg-black/40 backdrop-blur-xl">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mr-3 text-zinc-500 hover:text-white"><Menu className="w-6 h-6" /></button>
                    <span className="font-ritual text-white text-[13px] tracking-widest uppercase">Whispers</span>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <div className="w-20 h-20 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-aether-gold/40" />
                    </div>
                    <h3 className="font-ritual text-2xl tracking-[0.3em] text-white/40 mb-4 uppercase">Your Whispers</h3>
                    <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Choose a soul on the left, or begin a new whisper.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-void flex flex-col min-w-0">
            {/* Header */}
            <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 z-10 bg-black/40 backdrop-blur-md">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-2 text-zinc-500 hover:text-white"><Menu className="w-5 h-5" /></button>
                <button onClick={() => setActiveDmId(null)} className="lg:hidden mr-2 text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                        <img src={other?.avatar_url || DEFAULT_AVATAR} alt="" className="w-8 h-8 rounded-full object-cover border border-white/5" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-void ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    </div>
                    <div className="text-left min-w-0">
                        <div className="font-ritual text-white text-[14px] tracking-widest uppercase truncate">{other?.display_name || 'Soul'}</div>
                        <div className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">{presenceLabel(online, other?.last_seen_at)}</div>
                    </div>
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:px-8 relative">
                <div className="flex flex-col justify-end min-h-full">
                    {/* Intro */}
                    <div className="text-center py-8">
                        <img src={other?.avatar_url || DEFAULT_AVATAR} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-aether-gold/30 mx-auto mb-3" />
                        <h2 className="font-ritual text-xl text-white uppercase tracking-widest">{other?.display_name}</h2>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mt-1">The beginning of your whispers</p>
                    </div>

                    {thread.map((m, idx) => {
                        const mine = m.sender_id === myId;
                        const prev = thread[idx - 1];
                        const grouped = !!prev && prev.sender_id === m.sender_id &&
                            (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000);
                        return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                                <div className={`max-w-[78%] md:max-w-[60%] px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed break-words whitespace-pre-wrap ${
                                    mine ? 'bg-aether-gold/15 border border-aether-gold/25 text-zinc-100 rounded-br-sm'
                                         : 'bg-aether-surface border border-white/5 text-zinc-200 rounded-bl-sm'} ${m.optimistic ? 'opacity-60' : ''}`}>
                                    {m.content}
                                    <span className="block text-[8px] font-mono text-zinc-600 mt-1 text-right">{relativeTime(m.created_at)}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={endRef} />
                </div>
            </div>

            {/* Composer */}
            <div className="px-4 pb-6 pt-1 shrink-0">
                <form onSubmit={send} className="bg-aether-surface border border-white/5 rounded-xl flex items-center px-4 py-2.5 focus-within:border-aether-gold/40 transition-all">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`Whisper to ${other?.display_name || 'this soul'}…`}
                        maxLength={2000}
                        className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-700 font-mono focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className={`p-2 ml-2 rounded-lg transition-all ${text.trim() ? 'bg-aether-gold text-black hover:bg-aether-gold-soft px-4' : 'text-zinc-700'}`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {profileOpen && other?.id && <ProfilePopout userId={other.id} onClose={() => setProfileOpen(false)} />}
        </div>
    );
}
