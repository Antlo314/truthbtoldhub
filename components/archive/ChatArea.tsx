'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useArchiveStore, ArchiveMessage } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import MessageBubble from './MessageBubble';
import ProfilePopout from './ProfilePopout';
import { isArchitect, canPostChannel, DEFAULT_AVATAR } from '@/lib/archive/access';
import { Hash, Lock, Send, Menu, Pin, X, CornerDownRight, ShieldAlert, Users } from 'lucide-react';

export default function ChatArea() {
    const {
        activeChannelId, workspaces, activeWorkspaceId, channels, messages, setMessages,
        addMessage, updateMessage, deleteMessage, setIsMobileMenuOpen, members, reactions,
        setReactionsForMessages, addReaction, removeReaction, bannedUserIds, clearChannelUnread,
    } = useArchiveStore();
    const { profile: myProfile, user: myAuth } = useSoulStore();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ArchiveMessage | null>(null);
    const [showPins, setShowPins] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [typers, setTypers] = useState<Record<string, { name: string; at: number }>>({});
    const [cooldown, setCooldown] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingChannelRef = useRef<any>(null);
    const lastTypingSent = useRef(0);
    const lastSentAt = useRef(0);

    const architect = isArchitect(myAuth?.email);
    const myId = myAuth?.id;

    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];
    const activeChannel = workspaceChannels.find((c) => c.id === activeChannelId);
    const channelMessages = activeChannelId ? (messages[activeChannelId] || []) : [];
    const pinnedMessages = useMemo(() => channelMessages.filter((m) => m.pinned), [channelMessages]);

    const activeMembers = activeWorkspaceId ? (members[activeWorkspaceId] || []) : [];
    const myRole = myId ? activeMembers.find((m) => m.user_id === myId)?.role : null;
    const isAdmin = architect || myRole === 'Admin';                 // can post in locked halls
    const canModerate = isAdmin || myRole === 'Moderator';           // delete-any + pin

    const iAmBanned = myId ? bannedUserIds.has(myId) : false;
    // Treat a stamped workspace Admin as an Architect for posting gates, so the
    // composer opens in locked halls even if the email match is unavailable.
    const gateCtx = { isArchitect: isAdmin, isSupporter: !!myProfile?.is_supporter, isChatBanned: iAmBanned };
    const canPost = activeChannel ? canPostChannel(activeChannel, gateCtx) : false;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages.length]);

    // Slowmode countdown ticker
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(t);
    }, [cooldown]);

    // Prune stale typing indicators
    useEffect(() => {
        const t = setInterval(() => {
            setTypers((prev) => {
                const now = Date.now();
                const next: typeof prev = {};
                for (const k in prev) if (now - prev[k].at < 4000) next[k] = prev[k];
                return next;
            });
        }, 1500);
        return () => clearInterval(t);
    }, []);

    // Load history + subscribe (messages + typing) for the active hall
    useEffect(() => {
        if (!activeChannelId) return;
        let cancelled = false;

        const buildReplyPreview = (list: ArchiveMessage[], replyToId?: string | null) => {
            if (!replyToId) return null;
            const src = list.find((m) => m.id === replyToId);
            if (!src) return { id: replyToId, content: 'earlier message', author_name: 'soul' };
            return { id: src.id, content: src.content.slice(0, 120), author_name: src.author?.display_name };
        };

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('archive_messages')
                .select('*, author:profiles(id, display_name, avatar_url, tier)')
                .eq('channel_id', activeChannelId)
                .order('created_at', { ascending: true })
                .limit(80);
            if (!data || cancelled) return;

            const mapped: ArchiveMessage[] = data.map((m: any) => ({
                id: m.id,
                channel_id: m.channel_id,
                author_id: m.author_id,
                content: m.content,
                is_edited: m.is_edited,
                reply_to_id: m.reply_to_id,
                created_at: m.created_at,
                pinned: m.pinned,
                pinned_by: m.pinned_by,
                pinned_at: m.pinned_at,
                author: m.author || { display_name: 'Anonymous' },
            }));
            // resolve reply previews from the loaded set
            for (const m of mapped) m.reply_to = buildReplyPreview(mapped, m.reply_to_id);
            setMessages(activeChannelId, mapped);

            // load reactions for these messages
            const ids = mapped.map((m) => m.id);
            if (ids.length) {
                const { data: rx } = await supabase.from('archive_reactions').select('*').in('message_id', ids);
                if (rx && !cancelled) setReactionsForMessages(rx);
            }
        };

        fetchMessages();
        // mark read
        clearChannelUnread(activeChannelId);
        supabase.rpc('mark_channel_read', { _channel: activeChannelId });

        const sub = supabase.channel(`channel_${activeChannelId}_msgs`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_messages', filter: `channel_id=eq.${activeChannelId}` }, async (payload) => {
                const { data: prof } = await supabase.from('profiles').select('id, display_name, avatar_url, tier').eq('id', payload.new.author_id).single();
                const current = useArchiveStore.getState().messages[activeChannelId] || [];
                addMessage({
                    id: payload.new.id,
                    channel_id: payload.new.channel_id,
                    author_id: payload.new.author_id,
                    content: payload.new.content,
                    is_edited: payload.new.is_edited,
                    reply_to_id: payload.new.reply_to_id,
                    created_at: payload.new.created_at,
                    pinned: payload.new.pinned,
                    author: prof || { display_name: 'Anonymous' },
                    reply_to: buildReplyPreview(current, payload.new.reply_to_id),
                });
                if (payload.new.author_id !== myId) supabase.rpc('mark_channel_read', { _channel: activeChannelId });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'archive_messages', filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
                updateMessage(payload.new.id, {
                    content: payload.new.content,
                    is_edited: payload.new.is_edited,
                    pinned: payload.new.pinned,
                    pinned_by: payload.new.pinned_by,
                    pinned_at: payload.new.pinned_at,
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'archive_messages', filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
                deleteMessage(payload.old.id);
            })
            .subscribe();

        // Typing broadcast channel
        const typingCh = supabase.channel(`typing_${activeChannelId}`, { config: { broadcast: { self: false } } });
        typingCh.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
            if (payload?.id && payload.id !== myId) {
                setTypers((prev) => ({ ...prev, [payload.id]: { name: payload.name || 'A soul', at: Date.now() } }));
            }
        }).subscribe();
        typingChannelRef.current = typingCh;

        return () => {
            cancelled = true;
            supabase.removeChannel(sub);
            supabase.removeChannel(typingCh);
            typingChannelRef.current = null;
            setTypers({});
            setReplyingTo(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChannelId]);

    const broadcastTyping = () => {
        const now = Date.now();
        if (now - lastTypingSent.current < 2000) return;
        lastTypingSent.current = now;
        typingChannelRef.current?.send({
            type: 'broadcast', event: 'typing',
            payload: { id: myId, name: myProfile?.display_name || myProfile?.username || 'A soul' },
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannelId || !myAuth || !canPost) return;

        // slowmode (client-side UX)
        const slow = activeChannel?.slowmode_seconds || 0;
        if (slow > 0 && !architect) {
            const since = (Date.now() - lastSentAt.current) / 1000;
            if (since < slow) { setCooldown(Math.ceil(slow - since)); return; }
        }

        setIsSending(true);
        const content = newMessage.trim();
        const replyId = replyingTo?.id && !replyingTo.optimistic ? replyingTo.id : null;
        const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

        addMessage({
            id: tempId,
            channel_id: activeChannelId,
            author_id: myAuth.id,
            content,
            is_edited: false,
            reply_to_id: replyId,
            created_at: new Date().toISOString(),
            author: myProfile ? { id: myProfile.id, display_name: myProfile.display_name, avatar_url: myProfile.avatar_url, tier: myProfile.tier } : { display_name: 'You' },
            reply_to: replyingTo ? { id: replyingTo.id, content: replyingTo.content.slice(0, 120), author_name: replyingTo.author?.display_name } : null,
            optimistic: true,
        });
        setNewMessage('');
        setReplyingTo(null);

        try {
            const { data, error } = await supabase
                .from('archive_messages')
                .insert({ channel_id: activeChannelId, author_id: myAuth.id, content, reply_to_id: replyId })
                .select('id, created_at')
                .single();
            if (error) throw error;
            if (data) updateMessage(tempId, { id: data.id, created_at: data.created_at, optimistic: false });
            lastSentAt.current = Date.now();
            if (slow > 0 && !architect) setCooldown(slow);
        } catch (err: any) {
            console.error('send failed', err);
            deleteMessage(tempId);
            setNewMessage(content);
            const msg = String(err?.message || '');
            setSendError(
                /row-level|permission|denied|policy|42501/i.test(msg)
                    ? 'You don’t have permission to post in this hall.'
                    : 'Message didn’t send — please try again.'
            );
            setTimeout(() => setSendError(null), 4000);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        deleteMessage(id);
        if (id.startsWith('temp-')) return;
        await supabase.from('archive_messages').delete().eq('id', id);
    };

    const handleEdit = async (id: string, content: string) => {
        updateMessage(id, { content, is_edited: true });
        await supabase.from('archive_messages').update({ content }).eq('id', id);
    };

    const handleReact = async (messageId: string, emoji: string) => {
        if (!myId || iAmBanned) return;
        addReaction({ message_id: messageId, user_id: myId, emoji });
        const { error } = await supabase.from('archive_reactions').insert({ message_id: messageId, user_id: myId, emoji });
        if (error) removeReaction({ message_id: messageId, user_id: myId, emoji });
    };

    const handleUnreact = async (messageId: string, emoji: string) => {
        if (!myId) return;
        removeReaction({ message_id: messageId, user_id: myId, emoji });
        await supabase.from('archive_reactions').delete().eq('message_id', messageId).eq('user_id', myId).eq('emoji', emoji);
    };

    const handlePinToggle = async (m: ArchiveMessage) => {
        if (!canModerate) return;
        const next = !m.pinned;
        updateMessage(m.id, { pinned: next, pinned_by: next ? myId : null, pinned_at: next ? new Date().toISOString() : null });
        // Pin via the staff-gated RPC so Moderators can pin without holding a
        // broad message-edit grant.
        const { error } = await supabase.rpc('set_message_pin', { _message_id: m.id, _pinned: next });
        if (error) updateMessage(m.id, { pinned: m.pinned, pinned_by: m.pinned_by, pinned_at: m.pinned_at }); // revert
    };

    // ---- empty state ----
    if (!activeChannelId) {
        return (
            <div className="flex-1 bg-void flex flex-col min-w-0 relative">
                <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 z-10 md:hidden bg-black/40 backdrop-blur-xl">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mr-3 text-zinc-500 hover:text-white"><Menu className="w-6 h-6" /></button>
                    <span className="font-ritual text-white text-[13px] tracking-widest uppercase">The Sanctum</span>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <div className="w-20 h-20 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-6 relative">
                        <Hash className="w-10 h-10 text-aether-gold/40 relative z-10" />
                    </div>
                    <h3 className="font-ritual text-2xl tracking-[0.3em] text-white/40 mb-4 uppercase">Choose a Hall</h3>
                    <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Select a hall from the left to join the conversation.</p>
                </div>
            </div>
        );
    }

    const Icon = activeChannel?.type === 'voice' ? Lock : Hash;
    const typingNames = Object.values(typers).map((t) => t.name);

    return (
        <div className="flex-1 bg-void flex flex-col min-w-0" id="archive-chat-area">
            {/* Header */}
            <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 z-10 bg-black/40 backdrop-blur-md">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-3 text-zinc-500 hover:text-zinc-200"><Menu className="w-6 h-6" /></button>
                <Hash className="w-5 h-5 text-aether-gold mr-2" />
                <h2 className="font-ritual text-white text-[14px] tracking-widest uppercase">{activeChannel?.name || '…'}</h2>
                {activeChannel?.locked && <Lock className="w-3.5 h-3.5 text-zinc-500 ml-2" />}
                {activeChannel?.topic && (
                    <>
                        <div className="w-px h-6 bg-white/5 mx-4 hidden md:block" />
                        <span className="hidden md:block text-[10px] text-zinc-500 font-mono tracking-widest uppercase truncate">{activeChannel.topic}</span>
                    </>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {pinnedMessages.length > 0 && (
                        <button onClick={() => setShowPins((v) => !v)} title="Pinned" className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${showPins ? 'bg-aether-gold/15 border-aether-gold/30 text-aether-gold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-aether-gold'}`}>
                            <Pin className="w-3 h-3" />
                            <span className="text-[9px] font-mono font-bold">{pinnedMessages.length}</span>
                        </button>
                    )}
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-zinc-500 hover:text-white" title="Souls"><Users className="w-4 h-4" /></button>
                </div>
            </header>

            {/* Pinned panel */}
            {showPins && pinnedMessages.length > 0 && (
                <div className="border-b border-white/5 bg-aether-surface/40 backdrop-blur px-4 py-3 max-h-52 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-aether-gold">Pinned in #{activeChannel?.name}</span>
                        <button onClick={() => setShowPins(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="space-y-2">
                        {pinnedMessages.map((m) => (
                            <div key={m.id} className="flex items-start gap-2 text-[12px]">
                                <img src={m.author?.avatar_url || DEFAULT_AVATAR} alt="" className="w-6 h-6 rounded object-cover border border-white/5 shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-aether-gold/80 font-bold text-[10px] uppercase tracking-wide mr-1">{m.author?.display_name}</span>
                                    <span className="text-zinc-300 break-words">{m.content}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 xl:px-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.03)_0%,transparent_80%)] pointer-events-none" />
                <div className="flex flex-col justify-end min-h-full relative z-10">
                    {/* Hall intro */}
                    <div className="mt-8 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-4 text-aether-gold">
                            <Hash className="w-8 h-8" />
                        </div>
                        <h1 className="font-ritual text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-widest">#{activeChannel?.name}</h1>
                        <p className="text-[11px] text-zinc-500 font-mono tracking-widest">{activeChannel?.topic || 'The beginning of this hall.'}</p>
                    </div>
                    <div className="w-full h-px bg-white/5 my-6" />

                    {channelMessages.map((msg, idx) => {
                        const prev = channelMessages[idx - 1];
                        const isGrouped = !!prev && prev.author_id === msg.author_id && !msg.reply_to_id &&
                            (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000);
                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isGrouped={isGrouped}
                                reactions={reactions[msg.id]}
                                myId={myId}
                                canModerate={canModerate}
                                canPin={canModerate}
                                onDelete={() => handleDelete(msg.id)}
                                onSaveEdit={(content) => handleEdit(msg.id, content)}
                                onReact={(emoji) => handleReact(msg.id, emoji)}
                                onUnreact={(emoji) => handleUnreact(msg.id, emoji)}
                                onReply={() => setReplyingTo(msg)}
                                onPinToggle={() => handlePinToggle(msg)}
                                onOpenProfile={(uid) => setProfileId(uid)}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Typing indicator / send error */}
            <div className="px-6 h-5 shrink-0">
                {sendError ? (
                    <span className="text-[10px] font-mono text-red-400">{sendError}</span>
                ) : typingNames.length > 0 ? (
                    <span className="text-[10px] font-mono text-zinc-500 italic">
                        {typingNames.slice(0, 3).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} transmitting…
                    </span>
                ) : null}
            </div>

            {/* Reply preview */}
            {replyingTo && (
                <div className="mx-4 mb-1 flex items-center justify-between px-3 py-1.5 rounded-t-lg bg-aether-surface/60 border border-white/5 border-b-0">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 truncate">
                        <CornerDownRight className="w-3 h-3 text-aether-gold" />
                        Replying to <span className="text-aether-gold font-bold">{replyingTo.author?.display_name}</span>
                        <span className="opacity-70 truncate max-w-[280px]">{replyingTo.content}</span>
                    </span>
                    <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
            )}

            {/* Composer */}
            <div className="px-4 pb-6 pt-1 shrink-0 relative z-20" id="archive-input-section">
                {canPost ? (
                    <form
                        onSubmit={handleSend}
                        className={`bg-aether-surface border border-white/5 flex items-center px-4 py-2.5 relative group focus-within:border-aether-gold/40 transition-all ${replyingTo ? 'rounded-b-xl rounded-tr-xl' : 'rounded-xl'}`}
                    >
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }}
                            placeholder={cooldown > 0 ? `Slowmode — wait ${cooldown}s…` : `Speak into #${activeChannel?.name || 'the hall'}…`}
                            disabled={cooldown > 0}
                            maxLength={2000}
                            className="flex-1 bg-transparent border-none text-[14px] text-zinc-100 placeholder:text-zinc-700 font-mono tracking-wide focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending || cooldown > 0}
                            className={`p-2 ml-2 rounded-lg transition-all ${newMessage.trim() && cooldown === 0 ? 'bg-aether-gold text-black hover:bg-aether-gold-soft px-4' : 'text-zinc-700'}`}
                        >
                            <span className="md:inline hidden text-[9px] font-black uppercase tracking-widest mr-2">{isSending ? '…' : 'Send'}</span>
                            <Send className="w-4 h-4 inline" />
                        </button>
                    </form>
                ) : (
                    <div className="flex items-center justify-center gap-2 bg-aether-surface/60 border border-white/5 rounded-xl px-4 py-3.5 text-zinc-500">
                        <ShieldAlert className="w-4 h-4 text-zinc-600" />
                        <span className="text-[10px] font-mono uppercase tracking-widest">
                            {iAmBanned ? 'You have been silenced in the Sanctum.'
                                : activeChannel?.access === 'architects' ? 'This hall is for Architects only.'
                                : activeChannel?.access === 'supporters' ? 'This hall is reserved for supporters.'
                                : activeChannel?.locked ? 'This hall is read-only.'
                                : 'You cannot post here.'}
                        </span>
                    </div>
                )}
            </div>

            {profileId && <ProfilePopout userId={profileId} onClose={() => setProfileId(null)} />}
        </div>
    );
}
