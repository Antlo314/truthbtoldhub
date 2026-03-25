import { create } from 'zustand';

// Types
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
}

export interface ArchiveMessage {
    id: string;
    channel_id: string;
    author_id: string;
    content: string;
    is_edited: boolean;
    reply_to_id?: string;
    created_at: string;
    author?: {
        display_name: string;
        avatar_url?: string;
    };
}

export interface ArchiveMember {
    user_id: string;
    workspace_id: string;
    role: 'Admin' | 'Moderator' | 'Member';
    profile?: {
        display_name: string;
        avatar_url?: string;
        soul_power?: number;
    };
    isOnline?: boolean;
}

interface ArchiveState {
    // Current Selections
    activeWorkspaceId: string | null;
    activeChannelId: string | null;
    
    // Data Caches
    workspaces: ArchiveWorkspace[];
    channels: Record<string, ArchiveChannel[]>; // workspace_id -> channels
    messages: Record<string, ArchiveMessage[]>; // channel_id -> messages
    members: Record<string, ArchiveMember[]>; // workspace_id -> members
    
    // Presence
    onlineUsers: Set<string>; // Set of user_ids that are currently online
    
    // Actions
    setActiveWorkspaceId: (id: string | null) => void;
    setActiveChannelId: (id: string | null) => void;
    setWorkspaces: (workspaces: ArchiveWorkspace[]) => void;
    setChannels: (workspaceId: string, channels: ArchiveChannel[]) => void;
    setMessages: (channelId: string, messages: ArchiveMessage[]) => void;
    setMembers: (workspaceId: string, members: ArchiveMember[]) => void;
    
    // Real-time Updates
    addMessage: (message: ArchiveMessage) => void;
    updateMessage: (id: string, updates: Partial<ArchiveMessage>) => void;
    deleteMessage: (id: string) => void;
    setOnlineStatus: (userId: string, isOnline: boolean) => void;
}

export const useArchiveStore = create<ArchiveState>((set) => ({
    activeWorkspaceId: null,
    activeChannelId: null,
    
    workspaces: [],
    channels: {},
    messages: {},
    members: {},
    onlineUsers: new Set(),
    
    setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    setActiveChannelId: (id) => set({ activeChannelId: id }),
    
    setWorkspaces: (workspaces) => set({ workspaces }),
    setChannels: (workspaceId, channels) => set((state) => ({ 
        channels: { ...state.channels, [workspaceId]: channels } 
    })),
    setMessages: (channelId, messages) => set((state) => ({ 
        messages: { ...state.messages, [channelId]: messages } 
    })),
    setMembers: (workspaceId, members) => set((state) => ({ 
        members: { ...state.members, [workspaceId]: members } 
    })),
    
    addMessage: (message) => set((state) => {
        const channelMessages = state.messages[message.channel_id] || [];
        // Prevent duplicates
        if (channelMessages.some(m => m.id === message.id)) return state;
        return {
            messages: {
                ...state.messages,
                [message.channel_id]: [...channelMessages, message]
            }
        };
    }),
    
    updateMessage: (id, updates) => set((state) => {
        const newMessages = { ...state.messages };
        for (const channelId in newMessages) {
            newMessages[channelId] = newMessages[channelId].map(msg => 
                msg.id === id ? { ...msg, ...updates } : msg
            );
        }
        return { messages: newMessages };
    }),
    
    deleteMessage: (id) => set((state) => {
        const newMessages = { ...state.messages };
        for (const channelId in newMessages) {
            newMessages[channelId] = newMessages[channelId].filter(msg => msg.id !== id);
        }
        return { messages: newMessages };
    }),
    
    setOnlineStatus: (userId, isOnline) => set((state) => {
        const newOnline = new Set(state.onlineUsers);
        if (isOnline) newOnline.add(userId);
        else newOnline.delete(userId);
        return { onlineUsers: newOnline };
    })
}));
