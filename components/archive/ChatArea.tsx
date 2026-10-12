'use client';

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useArchiveStore, ArchiveMessage } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import MessageBubble from './MessageBubble';
import ProfilePopout from './ProfilePopout';
import { isArchitect, canPostChannel, DEFAULT_AVATAR } from '@/lib/archive/access';
import { Hash, Lock, Menu, Pin, X, CornerDownRight, ShieldAlert, Users, ChevronDown, Loader2 } from 'lucide-react';
import ChatComposer, { type MentionCandidate } from './ChatComposer';
import { DayDivider, NewDivider, dayKey, mentionsMe, myHandles } from '@/lib/archive/chatFormat';

const PAGE = 60;

/** One row of archive_messages (+ joined author) into the store's shape */
function mapRow(m: any): ArchiveMessage {
    return {
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
        deleted_at: m.deleted_at ?? null,
        deleted_by: m.deleted_by ?? null,
        deletion_reason: m.deletion_reason ?? null,
        author: m.author || { display_name: 'Anonymous' },
    };
}

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
    const scrollerRef = useRef<HTMLDivElement>(null);
    /** within reach of the newest message — only then does a new one pull the view down */
    const atBottom = useRef(true);
    const [newBelow, setNewBelow] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    /** scrollHeight before a page of history was prepended, to hold the reader's place */
    const prependFrom = useRef<number | null>(null);
    /** your last_read_at when you walked in — where the "New" line goes */
    const [readMarker, setReadMarker] = useState<string | null>(null);
    const lastSeenId = useRef<string | null>(null);
    const firstPaint = useRef(true);
    const [editRequest, setEditRequest] = useState<{ id: string; n: number } | null>(null);
    const typingChannelRef = useRef<any>(null);
    const lastTypingSent = useRef(0);
    const lastSentAt = useRef(0);

    const architect = isArchitect(myAuth?.email);
    const myId = myAuth?.id;

    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];
    const activeChannel = workspaceChannels.find((c) => c.id === activeChannelId);
    const channelMessages = activeChannelId ? (messages[activeChannelId] || []) : [];

    const activeMembers = activeWorkspaceId ? (members[activeWorkspaceId] || []) : [];
    const myRole = myId ? activeMembers.find((m) => m.user_id === myId)?.role : null;
    const isAdmin = architect || myRole === 'Admin';                 // can post in locked halls
    const canModerate = isAdmin || myRole === 'Moderator';           // pin (not delete)
    /** Only Architects soft-delete / restore Hall messages */
    const canDelete = architect;

    // Non-admins only see live messages; Architects also see soft-deleted (restore UI)
    const visibleMessages = useMemo(
        () => (canDelete ? channelMessages : channelMessages.filter((m) => !m.deleted_at)),
        [channelMessages, canDelete],
    );
    const pinnedMessages = useMemo(
        () => visibleMessages.filter((m) => m.pinned && !m.deleted_at),
        [visibleMessages],
    );
    const deletedCount = useMemo(
        () => channelMessages.filter((m) => m.deleted_at).length,
        [channelMessages],
    );

    const iAmBanned = myId ? bannedUserIds.has(myId) : false;
    // Treat a stamped workspace Admin as an Architect for posting gates, so the
    // composer opens in locked halls even if the email match is unavailable.
    const gateCtx = { isArchitect: isAdmin, isSupporter: !!myProfile?.is_supporter, isChatBanned: iAmBanned };
    const canPost = activeChannel ? canPostChannel(activeChannel, gateCtx) : false;

    // Follow the conversation only when you are at its end. Reading back
    // through history used to be yanked to the bottom by every new word.
    const lastMsg = visibleMessages[visibleMessages.length - 1];
    useLayoutEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        if (prependFrom.current !== null) {
            // a page of history went in above: keep the same words under the eye
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
        if (atBottom.current || lastMsg.author_id === myId) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            setNewBelow(0);
        } else {
            setNewBelow((n) => n + 1);
        }
    }, [lastMsg, myId]);

    const loadOlder = useCallback(async () => {
        if (!activeChannelId || loadingOlder || !hasMore) return;
        const list = useArchiveStore.getState().messages[activeChannelId] || [];
        const oldest = list.find((m) => !m.optimistic);
        if (!oldest) return;
        setLoadingOlder(true);
        const { data } = await supabase
            .from('archive_messages')
            .select('*, author:profiles(id, display_name, avatar_url, tier)')
            .eq('channel_id', activeChannelId)
            .lt('created_at', oldest.created_at)
            .order('created_at', { ascending: false })
            .limit(PAGE);
        setLoadingOlder(false);
        if (!data) return;
        setHasMore(data.length === PAGE);
        if (data.length === 0) return;
        const older = data.map(mapRow).reverse();
        const current = useArchiveStore.getState().messages[activeChannelId] || [];
        const all = [...older, ...current.filter((m) => !older.some((o) => o.id === m.id))];
        for (const m of older) {
            const src = m.reply_to_id ? all.find((x) => x.id === m.reply_to_id) : null;
            m.reply_to = m.reply_to_id ? (src ? { id: src.id, content: src.content.slice(0, 120), author_name: src.author?.display_name } : { id: m.reply_to_id, content: 'earlier message', author_name: 'soul' }) : null;
        }
        prependFrom.current = scrollerRef.current?.scrollHeight ?? null;
        setMessages(activeChannelId, all);
        const ids = older.map((m) => m.id);
        const { data: rx } = await supabase.from('archive_reactions').select('*').in('message_id', ids);
        if (rx) setReactionsForMessages(rx);
    }, [activeChannelId, hasMore, loadingOlder, setMessages, setReactionsForMessages]);

    const onScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        atBottom.current = near;
        if (near && newBelow) setNewBelow(0);
        if (el.scrollTop < 120) void loadOlder();
    };

    const handles = useMemo(() => myHandles(myProfile?.display_name, myProfile?.username), [myProfile?.display_name, myProfile?.username]);
    const mentionCandidates = useMemo<MentionCandidate[]>(
        () =>
            activeMembers
                .filter((m) => m.user_id !== myId && m.profile?.display_name)
                .map((m) => ({ id: m.user_id, name: m.profile!.display_name, avatar: m.profile?.avatar_url })),
        [activeMembers, myId],
    );
    /** first message from someone else after your last visit */
    const firstNewId = useMemo(() => {
        if (!readMarker) return null;
        const t = new Date(readMarker).getTime();
        return visibleMessages.find((m) => m.author_id !== myId && !m.optimistic && new Date(m.created_at).getTime() > t)?.id ?? null;
    }, [readMarker, visibleMessages, myId]);

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
            // the NEWEST page, then reversed — asking for the oldest 80 showed
            // a busy hall's first day forever and never today
            const { data } = await supabase
                .from('archive_messages')
                .select('*, author:profiles(id, display_name, avatar_url, tier)')
                .eq('channel_id', activeChannelId)
                .order('created_at', { ascending: false })
                .limit(PAGE);
            if (!data || cancelled) return;

            const mapped: ArchiveMessage[] = data.map(mapRow).reverse();
            // resolve reply previews from the loaded set
            for (const m of mapped) m.reply_to = buildReplyPreview(mapped, m.reply_to_id);
            setHasMore(data.length === PAGE);
            firstPaint.current = true;
            setMessages(activeChannelId, mapped);

            // load reactions for these messages
            const ids = mapped.map((m) => m.id);
            if (ids.length) {
                const { data: rx } = await supabase.from('archive_reactions').select('*').in('message_id', ids);
                if (rx && !cancelled) setReactionsForMessages(rx);
            }
        };

        setReadMarker(null);
        setNewBelow(0);
        atBottom.current = true;
        lastSeenId.current = null;
        const enter = async () => {
            // where you left off, read before it is moved to now
            if (myId) {
                const { data: rd } = await supabase
                    .from('archive_reads')
                    .select('last_read_at')
                    .eq('user_id', myId)
                    .eq('channel_id', activeChannelId)
                    .maybeSingle();
                if (!cancelled) setReadMarker(rd?.last_read_at ?? null);
            }
            await fetchMessages();
            // mark read
            clearChannelUnread(activeChannelId);
            void supabase.rpc('mark_channel_read', { _channel: activeChannelId });
        };
        void enter();

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
                    pinned_by: payload.new.pinned_by,
                    pinned_at: payload.new.pinned_at,
                    deleted_at: payload.new.deleted_at ?? null,
                    deleted_by: payload.new.deleted_by ?? null,
                    deletion_reason: payload.new.deletion_reason ?? null,
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
                    deleted_at: payload.new.deleted_at ?? null,
                    deleted_by: payload.new.deleted_by ?? null,
                    deletion_reason: payload.new.deletion_reason ?? null,
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

    const handleSend = async () => {
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
            if (data) {
                updateMessage(tempId, { id: data.id, created_at: data.created_at, optimistic: false });
                // Gemini Hall Sentinel — soft-delete if inappropriate
                void runModeration(data.id, content);
            }
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

    const runModeration = async (messageId: string, content: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const res = await fetch('/api/hall/moderate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ messageId, content }),
            });
            const json = await res.json().catch(() => ({}));
            if (json?.action === 'remove') {
                updateMessage(messageId, {
                    deleted_at: new Date().toISOString(),
                    deletion_reason: json.reason ? `gemini:${json.reason}` : 'gemini:policy',
                });
            }
        } catch {
            /* moderation is best-effort */
        }
    };

    const handleDelete = async (id: string) => {
        if (!canDelete) return;
        if (id.startsWith('temp-')) {
            deleteMessage(id);
            return;
        }
        // Soft-delete only — Architect RPC keeps the row for restore
        updateMessage(id, {
            deleted_at: new Date().toISOString(),
            deleted_by: myId || null,
            deletion_reason: 'admin',
        });
        const { error } = await supabase.rpc('soft_delete_hall_message', {
            _message_id: id,
            _reason: 'admin',
        });
        if (error) {
            // fallback if RPC not migrated yet
            const { error: e2 } = await supabase
                .from('archive_messages')
                .update({
                    deleted_at: new Date().toISOString(),
                    deleted_by: myId,
                    deletion_reason: 'admin',
                })
                .eq('id', id);
            if (e2) {
                updateMessage(id, { deleted_at: null, deleted_by: null, deletion_reason: null });
                setSendError('Could not remove message — only Architects may purge the Hall.');
                setTimeout(() => setSendError(null), 4000);
            }
        }
    };

    const handleRestore = async (id: string) => {
        if (!canDelete) return;
        updateMessage(id, { deleted_at: null, deleted_by: null, deletion_reason: null });
        const { error } = await supabase.rpc('restore_hall_message', { _message_id: id });
        if (error) {
            const { error: e2 } = await supabase
                .from('archive_messages')
                .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
                .eq('id', id);
            if (e2) {
                setSendError('Could not restore message.');
                setTimeout(() => setSendError(null), 4000);
            }
        }
    };

    const handleRestoreAll = async () => {
        if (!canDelete || !activeChannelId) return;
        const { data, error } = await supabase.rpc('restore_all_hall_messages', {
            _channel_id: activeChannelId,
        });
        if (error) {
            setSendError('Restore-all failed — run hall_soft_delete_moderation.sql in Supabase.');
            setTimeout(() => setSendError(null), 5000);
            return;
        }
        const list = useArchiveStore.getState().messages[activeChannelId] || [];
        for (const m of list) {
            if (m.deleted_at) updateMessage(m.id, { deleted_at: null, deleted_by: null, deletion_reason: null });
        }
        setSendError(`Restored ${data ?? 0} message(s) in this chamber.`);
        setTimeout(() => setSendError(null), 4000);
    };

    const handleEdit = async (id: string, content: string) => {
        updateMessage(id, { content, is_edited: true });
        await supabase.from('archive_messages').update({ content }).eq('id', id);
        // re-moderate edits
        void runModeration(id, content);
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
                    <span className="font-ritual text-white text-[13px] tracking-widest uppercase">The Hall</span>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <div className="w-20 h-20 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-6 relative">
                        <Hash className="w-10 h-10 text-aether-gold/40 relative z-10" />
                    </div>
                    <h3 className="font-ritual text-2xl tracking-[0.3em] text-white/40 mb-4 uppercase">Choose a Chamber</h3>
                    <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase">Select a chamber from the left to join the conversation.</p>
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
                    {canDelete && deletedCount > 0 && (
                        <button
                            type="button"
                            onClick={handleRestoreAll}
                            title="Restore all soft-deleted in this chamber"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider"
                        >
                            Restore {deletedCount}
                        </button>
                    )}
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
            <div ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto custom-scrollbar p-4 xl:px-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.03)_0%,transparent_80%)] pointer-events-none" />
                <div className="flex flex-col justify-end min-h-full relative z-10">
                    {hasMore && (
                        <div className="flex justify-center py-3">
                            <button type="button" onClick={() => void loadOlder()} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-zinc-400 hover:text-white">
                                {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                {loadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}
                            </button>
                        </div>
                    )}
                    {/* Hall intro — only at the true beginning */}
                    {!hasMore && <div className="mt-8 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center mb-4 text-aether-gold">
                            <Hash className="w-8 h-8" />
                        </div>
                        <h1 className="font-ritual text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-widest">#{activeChannel?.name}</h1>
                        <p className="text-[11px] text-zinc-500 tracking-widest">{activeChannel?.topic || 'The beginning of this chamber.'}</p>
                    </div>}
                    {!hasMore && <div className="w-full h-px bg-white/5 my-6" />}

                    {visibleMessages.length === 0 && (
                        <p className="text-[12px] text-zinc-500 mb-6">
                            No one has spoken yet. Enter says the first word.
                        </p>
                    )}

                    {visibleMessages.map((msg, idx) => {
                        const prev = visibleMessages[idx - 1];
                        const newDay = !prev || dayKey(prev.created_at) !== dayKey(msg.created_at);
                        const isNew = msg.id === firstNewId;
                        const isGrouped = !newDay && !isNew && !!prev && !msg.deleted_at && !prev.deleted_at
                            && prev.author_id === msg.author_id && !msg.reply_to_id &&
                            (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000);
                        return (
                            <div key={msg.id}>
                            {newDay && <DayDivider iso={msg.created_at} />}
                            {isNew && <NewDivider />}
                            <MessageBubble
                                mentioned={msg.author_id !== myId && mentionsMe(msg.content, handles)}
                                handles={handles}
                                editRequest={editRequest?.id === msg.id ? editRequest.n : 0}
                                message={msg}
                                isGrouped={isGrouped}
                                reactions={reactions[msg.id]}
                                myId={myId}
                                canModerate={canDelete}
                                canPin={canModerate}
                                onDelete={canDelete && !msg.deleted_at ? () => handleDelete(msg.id) : undefined}
                                onRestore={canDelete && msg.deleted_at ? () => handleRestore(msg.id) : undefined}
                                onSaveEdit={(content) => handleEdit(msg.id, content)}
                                onReact={(emoji) => handleReact(msg.id, emoji)}
                                onUnreact={(emoji) => handleUnreact(msg.id, emoji)}
                                onReply={msg.deleted_at ? undefined : () => setReplyingTo(msg)}
                                onPinToggle={msg.deleted_at ? undefined : () => handlePinToggle(msg)}
                                onOpenProfile={(uid) => setProfileId(uid)}
                            />
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* new words below while you read back */}
            {newBelow > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            setNewBelow(0);
                        }}
                        className="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-aether-gold px-3.5 py-1.5 text-[12px] font-semibold text-black shadow-xl"
                    >
                        {newBelow} new message{newBelow === 1 ? '' : 's'} <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

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
                {!myAuth?.id ? (
                    /* A guest reads the room but cannot speak into it. Without
                       this they would meet a live composer that silently fails
                       on send — worse than an honest closed door. */
                    <a
                        href="/"
                        className="flex items-center justify-center gap-2 rounded-xl border border-aether-gold/30 bg-aether-gold/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-aether-gold hover:bg-aether-gold/15 transition-colors min-h-[48px]"
                    >
                        Sign in to speak in the Hall
                    </a>
                ) : canPost ? (
                    <ChatComposer
                        value={newMessage}
                        onChange={setNewMessage}
                        onSubmit={() => void handleSend()}
                        onTyping={broadcastTyping}
                        onEscape={() => setReplyingTo(null)}
                        onArrowUpEmpty={() => {
                            const mine = [...visibleMessages].reverse().find((m) => m.author_id === myId && !m.deleted_at && !m.optimistic);
                            if (mine) setEditRequest((r) => ({ id: mine.id, n: (r?.n ?? 0) + 1 }));
                        }}
                        placeholder={cooldown > 0 ? `Slowmode — wait ${cooldown}s…` : `Message #${activeChannel?.name || 'the hall'}`}
                        disabled={cooldown > 0}
                        sending={isSending}
                        candidates={mentionCandidates}
                        attached={!!replyingTo}
                        autoFocusKey={activeChannelId}
                    />
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
