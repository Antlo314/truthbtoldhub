'use client';

import { useEffect } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { supabase } from '@/lib/supabase';
import { Hash, Volume2, ChevronDown, Plus } from 'lucide-react';

export default function ChannelsSidebar() {
    const { activeWorkspaceId, workspaces, channels, setChannels, activeChannelId, setActiveChannelId } = useArchiveStore();
    
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];

    useEffect(() => {
        if (!activeWorkspaceId) return;

        // Fetch channels for this workspace
        const fetchChannels = async () => {
            const { data } = await supabase
                .from('archive_channels')
                .select('*')
                .eq('workspace_id', activeWorkspaceId)
                .order('created_at', { ascending: true });
            
            if (data) {
                setChannels(activeWorkspaceId, data);
                // Auto-select first channel if none selected
                if (!activeChannelId && data.length > 0) {
                    setActiveChannelId(data[0].id);
                }
            } else {
                // Mock data if table empty/not existing yet to allow UI dev
                const mockChannels = [
                    { id: '1', workspace_id: activeWorkspaceId, name: 'general', type: 'text' as const },
                    { id: '2', workspace_id: activeWorkspaceId, name: 'protocols', type: 'text' as const },
                    { id: '3', workspace_id: activeWorkspaceId, name: 'voice-comm', type: 'voice' as const }
                ];
                setChannels(activeWorkspaceId, mockChannels);
                setActiveChannelId('1');
            }
        };

        fetchChannels();

        // Subscribe to real-time channel inserts for this workspace
        const channelSub = supabase.channel(`workspace_${activeWorkspaceId}_channels`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_channels', filter: `workspace_id=eq.${activeWorkspaceId}` }, (payload) => {
                fetchChannels(); // Simple refetch on change
            }).subscribe();

        return () => {
            supabase.removeChannel(channelSub);
        };
    }, [activeWorkspaceId]);

    if (!activeWorkspaceId) {
        return (
            <div className="w-[240px] min-w-[240px] h-full bg-[#2b2d31] flex flex-col shrink-0 rounded-tl-xl border-t border-l border-white/5">
                <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center px-4">
                    <h2 className="font-bold text-white text-[15px]">Direct Messages</h2>
                </div>
                {/* DM List would go here */}
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                    <p className="text-sm text-[#949ba4]">DMs are isolated from global channels.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[240px] min-w-[240px] h-full bg-[#2b2d31] flex flex-col shrink-0 rounded-tl-xl border-t border-l border-white/5">
            {/* Header */}
            <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 hover:bg-[#35373c] cursor-pointer transition-colors group">
                <h2 className="font-bold text-white text-[15px] truncate">{activeWorkspace?.name || 'Workspace'}</h2>
                <ChevronDown className="w-4 h-4 text-[#dbdee1] opacity-80 group-hover:opacity-100" />
            </div>

            {/* Channel List */}
            <div className="flex-1 overflow-y-auto pt-4 px-2 custom-scrollbar">
                
                <div className="flex items-center justify-between text-[#949ba4] hover:text-[#dbdee1] group px-1 mb-[2px] cursor-pointer">
                    <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                        <ChevronDown className="w-3 h-3" />
                        Text Channels
                    </div>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>

                {workspaceChannels.filter(c => c.type === 'text').map(channel => (
                    <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`w-full flex items-center px-2 py-1.5 rounded mb-[2px] transition-colors group
                            ${activeChannelId === channel.id ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}
                        `}
                    >
                        <Hash className="w-5 h-5 opacity-70 mr-1.5 shrink-0" />
                        <span className="font-medium text-[15px] truncate">{channel.name}</span>
                    </button>
                ))}

                <div className="flex items-center justify-between text-[#949ba4] hover:text-[#dbdee1] group px-1 mt-4 mb-[2px] cursor-pointer">
                    <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                        <ChevronDown className="w-3 h-3" />
                        Voice Channels
                    </div>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>

                {workspaceChannels.filter(c => c.type === 'voice').map(channel => (
                    <button
                        key={channel.id}
                        className="w-full flex items-center px-2 py-1.5 rounded mb-[2px] transition-colors text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] group"
                    >
                        <Volume2 className="w-5 h-5 opacity-70 mr-1.5 shrink-0" />
                        <span className="font-medium text-[15px] truncate">{channel.name}</span>
                    </button>
                ))}

            </div>

            {/* Current User Area Bottom */}
            <div className="h-[52px] bg-[#232428] flex items-center px-2 border-t border-white/5 mt-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden shrink-0">
                    <img src="https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png" className="w-full h-full object-cover" />
                </div>
                <div className="ml-2 flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-white truncate">You</span>
                    <span className="text-[11px] text-[#949ba4] truncate">Online</span>
                </div>
            </div>
        </div>
    );
}
