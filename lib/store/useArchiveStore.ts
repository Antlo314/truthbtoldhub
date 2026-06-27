import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================
export interface ArchiveWorkspace {
    id: string;
    name: string;
    icon_url?: string;
}

export interface ArchiveChannel {
    id: string;
    workspace_id: string;
    name: string;
    type: 'text' | 'voice';
    topic?: string;
    position?: number;
    category?: string;
    locked?: boolean;
    access?: 'everyone' | 'supporters' | 'architects';
    slowmode_seconds?: number;
}

export interface MessageAuthor {
    id?: string;
    display_name: string;
    avatar_url?: string;
    tier?: string;
    theme_color?: string;
}

export interface ReplyPreview {
    id: string;
    content: string;
    author_name?: string;
}

export interface ArchiveMessage {
    id: string;
    channel_id: string;
    author_id: string;
    content: string;
    is_edited: boolean;
    reply_to_id?: string | null;
    created_at: string;
    pinned?: boolean;
    pinned_by?: string | null;
    pinned_at?: string | null;
    author?: MessageAuthor;
    reply_to?: ReplyPreview | null;
    optimistic?: boolean;
}

export interface ArchiveReaction {
    message_id: string;
    user_id: string;
    emoji: string;
}

export interface ArchiveMember {
    user_id: string;
    workspace_id: string;
    role: 'Admin' | 'Moderator' | 'Member';
    profile?: {
        id?: string;
        display_name: string;
        avatar_url?: string;
        soul_power?: number;
        tier?: string;
        custom_title?: string;
        status?: string;
    };
    isOnline?: boolean;
}

// ---- Direct Messages ----
export interface DMParticipant {
    id: string;
    display_name: string;
    avatar_url?: string;
    tier?: string;
    status?: string;
    last_seen_at?: string;
}

export interface DMConversation {
    id: string;
    user_lo: string;
    user_hi: string;
    created_at: string;
    last_message_at: string;
    other?: DMParticipant;
    unread?: number;
    lastMessagePreview?: string;
}

export interface DMMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at?: string | null;
    optimistic?: boolean;
    sender?: { display_name: string; avatar_url?: string };
}

interface ArchiveState {
    // Current Selections
    activeWorkspaceId: string | null;   // null => Direct Messages "home"
    activeChannelId: string | null;
    activeDmId: string | null;

    // Data Caches
    workspaces: ArchiveWorkspace[];
    channels: Record<string, ArchiveChannel[]>;        // workspace_id -> channels
    messages: Record<string, ArchiveMessage[]>;        // channel_id -> messages
    members: Record<string, ArchiveMember[]>;          // workspace_id -> members
    reactions: Record<string, ArchiveReaction[]>;      // message_id -> reactions

    // Direct Messages
    dmConversations: DMConversation[];
    dmMessages: Record<string, DMMessage[]>;           // conversation_id -> messages

    // Presence / moderation
    onlineUsers: Set<string>;
    bannedUserIds: Set<string>;                        // currently banned/muted from chat

    // Unread tracking
    unreadChannelIds: Set<string>;

    // UI State
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;

    // Selection actions
    setActiveWorkspaceId: (id: string | null) => void;
    setActiveChannelId: (id: string | null) => void;
    setActiveDmId: (id: string | null) => void;

    // Cache setters
    setWorkspaces: (workspaces: ArchiveWorkspace[]) => void;
    setChannels: (workspaceId: string, channels: ArchiveChannel[]) => void;
    setMessages: (channelId: string, messages: ArchiveMessage[]) => void;
    setMembers: (workspaceId: string, members: ArchiveMember[]) => void;

    // Messages (realtime + optimistic)
    addMessage: (message: ArchiveMessage) => void;
    updateMessage: (id: string, updates: Partial<ArchiveMessage>) => void;
    deleteMessage: (id: string) => void;

    // Reactions
    setReactionsForMessages: (reactions: ArchiveReaction[]) => void;
    addReaction: (r: ArchiveReaction) => void;
    removeReaction: (r: ArchiveReaction) => void;

    // Presence / bans
    setOnlineStatus: (userId: string, isOnline: boolean) => void;
    setBannedUsers: (ids: string[]) => void;
    setUserBanned: (userId: string, banned: boolean) => void;

    // Unread
    markChannelUnread: (channelId: string) => void;
    clearChannelUnread: (channelId: string) => void;

    // Direct messages
    setDmConversations: (convs: DMConversation[]) => void;
    upsertDmConversation: (conv: DMConversation) => void;
    setDmMessages: (conversationId: string, messages: DMMessage[]) => void;
    addDmMessage: (message: DMMessage) => void;
    setDmUnread: (conversationId: string, unread: number) => void;
    incrementDmUnread: (conversationId: string) => void;
    bumpDmConversation: (conversationId: string, at: string, preview?: string) => void;
}

export const useArchiveStore = create<ArchiveState>((set) => ({
    activeWorkspaceId: null,
    activeChannelId: null,
    activeDmId: null,

    workspaces: [],
    channels: {},
    messages: {},
    members: {},
    reactions: {},

    dmConversations: [],
    dmMessages: {},

    onlineUsers: new Set(),
    bannedUserIds: new Set(),
    unreadChannelIds: new Set(),

    isMobileMenuOpen: false,
    setIsMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),

    setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    setActiveChannelId: (id) => set({ activeChannelId: id }),
    setActiveDmId: (id) => set({ activeDmId: id }),

    setWorkspaces: (workspaces) => set({ workspaces }),
    setChannels: (workspaceId, channels) => set((state) => ({
        channels: { ...state.channels, [workspaceId]: channels },
    })),
    setMessages: (channelId, messages) => set((state) => ({
        messages: { ...state.messages, [channelId]: messages },
    })),
    setMembers: (workspaceId, members) => set((state) => ({
        members: { ...state.members, [workspaceId]: members },
    })),

    addMessage: (message) => set((state) => {
        const list = state.messages[message.channel_id] || [];
        // Exact duplicate (same id already present) — ignore.
        if (list.some((m) => m.id === message.id)) return state;
        // A confirmed (non-optimistic) message supersedes any optimistic
        // placeholder we added locally for the same author+content. This makes
        // the realtime echo idempotent regardless of insert/echo ordering.
        const next = message.optimistic
            ? list
            : list.filter((m) => !(m.optimistic && m.author_id === message.author_id && m.content === message.content));
        return {
            messages: { ...state.messages, [message.channel_id]: [...next, message] },
        };
    }),

    updateMessage: (id, updates) => set((state) => {
        const newMessages = { ...state.messages };
        for (const channelId in newMessages) {
            newMessages[channelId] = newMessages[channelId].map((msg) =>
                msg.id === id ? { ...msg, ...updates } : msg
            );
        }
        return { messages: newMessages };
    }),

    deleteMessage: (id) => set((state) => {
        const newMessages = { ...state.messages };
        for (const channelId in newMessages) {
            newMessages[channelId] = newMessages[channelId].filter((msg) => msg.id !== id);
        }
        return { messages: newMessages };
    }),

    setReactionsForMessages: (reactions) => set((state) => {
        const map: Record<string, ArchiveReaction[]> = { ...state.reactions };
        // Replace the set for every message_id that appears in the payload.
        const touched = new Set(reactions.map((r) => r.message_id));
        touched.forEach((mid) => { map[mid] = []; });
        reactions.forEach((r) => { map[r.message_id] = [...(map[r.message_id] || []), r]; });
        return { reactions: map };
    }),

    addReaction: (r) => set((state) => {
        const list = state.reactions[r.message_id] || [];
        if (list.some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) return state;
        return { reactions: { ...state.reactions, [r.message_id]: [...list, r] } };
    }),

    removeReaction: (r) => set((state) => {
        const list = state.reactions[r.message_id] || [];
        return {
            reactions: {
                ...state.reactions,
                [r.message_id]: list.filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji)),
            },
        };
    }),

    setOnlineStatus: (userId, isOnline) => set((state) => {
        const newOnline = new Set(state.onlineUsers);
        if (isOnline) newOnline.add(userId);
        else newOnline.delete(userId);
        return { onlineUsers: newOnline };
    }),

    setBannedUsers: (ids) => set({ bannedUserIds: new Set(ids) }),
    setUserBanned: (userId, banned) => set((state) => {
        const next = new Set(state.bannedUserIds);
        if (banned) next.add(userId);
        else next.delete(userId);
        return { bannedUserIds: next };
    }),

    markChannelUnread: (channelId) => set((state) => {
        if (state.unreadChannelIds.has(channelId)) return state;
        const next = new Set(state.unreadChannelIds);
        next.add(channelId);
        return { unreadChannelIds: next };
    }),
    clearChannelUnread: (channelId) => set((state) => {
        if (!state.unreadChannelIds.has(channelId)) return state;
        const next = new Set(state.unreadChannelIds);
        next.delete(channelId);
        return { unreadChannelIds: next };
    }),

    setDmConversations: (convs) => set({ dmConversations: convs }),
    upsertDmConversation: (conv) => set((state) => {
        const exists = state.dmConversations.some((c) => c.id === conv.id);
        const list = exists
            ? state.dmConversations.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
            : [conv, ...state.dmConversations];
        list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        return { dmConversations: list };
    }),
    setDmMessages: (conversationId, messages) => set((state) => ({
        dmMessages: { ...state.dmMessages, [conversationId]: messages },
    })),
    addDmMessage: (message) => set((state) => {
        const list = state.dmMessages[message.conversation_id] || [];
        if (list.some((m) => m.id === message.id)) return state;
        const next = message.optimistic
            ? list
            : list.filter((m) => !(m.optimistic && m.sender_id === message.sender_id && m.content === message.content));
        return {
            dmMessages: { ...state.dmMessages, [message.conversation_id]: [...next, message] },
        };
    }),
    setDmUnread: (conversationId, unread) => set((state) => ({
        dmConversations: state.dmConversations.map((c) =>
            c.id === conversationId ? { ...c, unread } : c
        ),
    })),
    // Atomic increment — reads the live count inside the setter so rapid
    // concurrent message events can't lose an increment (no stale snapshot).
    incrementDmUnread: (conversationId) => set((state) => ({
        dmConversations: state.dmConversations.map((c) =>
            c.id === conversationId ? { ...c, unread: (c.unread || 0) + 1 } : c
        ),
    })),
    bumpDmConversation: (conversationId, at, preview) => set((state) => {
        const list = state.dmConversations.map((c) =>
            c.id === conversationId
                ? { ...c, last_message_at: at, lastMessagePreview: preview ?? c.lastMessagePreview }
                : c
        );
        list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        return { dmConversations: list };
    }),
}));
