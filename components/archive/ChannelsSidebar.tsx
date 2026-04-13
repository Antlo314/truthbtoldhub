'use client';

import { useEffect } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import { Hash, Volume2, ChevronDown, Plus, Settings, Shield } from 'lucide-react';

export default function ChannelsSidebar() {
    const { activeWorkspaceId, workspaces, channels, setChannels, activeChannelId, setActiveChannelId } = useArchiveStore();
    const { profile } = useSoulStore();
    
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
            <div className="w-[240px] min-w-[240px] h-full bg-zinc-900 flex flex-col shrink-0 rounded-tl-2xl border-t border-l border-white/5 shadow-inner">
                <div className="h-12 border-b border-white/5 shadow-sm flex items-center px-4">
                    <h2 className="font-ritual text-white text-[13px] tracking-widest uppercase">Direct Whispers</h2>
                </div>
                {/* DM List would go here */}
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Whispers are localized.</p>
                </div>
                {/* User Footer Shared Below */}
            </div>
        );
    }

    return (
        <div className="w-[240px] min-w-[240px] h-full bg-zinc-900 flex flex-col shrink-0 rounded-tl-2xl border-t border-l border-white/5 shadow-inner" id="archive-channels-sidebar">
            {/* Header */}
            <div className="h-12 border-b border-white/5 shadow-sm flex items-center justify-between px-4 hover:bg-white/5 cursor-pointer transition-colors group">
                <h2 className="font-ritual text-white text-[13px] tracking-widest uppercase truncate">{activeWorkspace?.name || 'Workspace'}</h2>
                <ChevronDown className="w-4 h-4 text-zinc-500 opacity-80 group-hover:opacity-100" />
            </div>

            {/* Channel List */}
            <div className="flex-1 overflow-y-auto pt-4 px-2 custom-scrollbar space-y-4" id="archive-channels-list">
                
                <div>
                    <div className="flex items-center justify-between text-zinc-500 hover:text-white group px-1 mb-1 cursor-pointer">
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em]">
                            <ChevronDown className="w-3 h-3" />
                            Text Protocols
                        </div>
                        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="space-y-[2px]">
                        {workspaceChannels.filter(c => c.type === 'text').map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannelId(channel.id)}
                                className={`w-full flex items-center px-2 py-1.5 rounded-lg transition-all group relative overflow-hidden
                                    ${activeChannelId === channel.id 
                                        ? 'bg-orange-600/10 text-orange-400 border border-orange-500/20 shadow-[0_0_10px_rgba(234,88,12,0.1)]' 
                                        : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'}
                                `}
                            >
                                <Hash className={`w-5 h-5 mr-1.5 shrink-0 transition-colors ${activeChannelId === channel.id ? 'text-orange-500' : 'opacity-40'}`} />
                                <span className={`font-mono text-[13px] tracking-wide truncate ${activeChannelId === channel.id ? 'font-bold' : ''}`}>{channel.name}</span>
                                {activeChannelId === channel.id && <div className="absolute right-0 top-0 w-1 h-full bg-orange-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between text-zinc-500 hover:text-white group px-1 mb-1 cursor-pointer">
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em]">
                            <ChevronDown className="w-3 h-3" />
                            Voice Nodes
                        </div>
                        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="space-y-[2px]">
                        {workspaceChannels.filter(c => c.type === 'voice').map(channel => (
                            <button
                                key={channel.id}
                                className="w-full flex items-center px-2 py-1.5 rounded-lg transition-all text-zinc-500 hover:bg-white/5 hover:text-zinc-200 group"
                            >
                                <Volume2 className="w-5 h-5 opacity-40 mr-1.5 shrink-0" />
                                <span className="font-mono text-[13px] tracking-wide truncate">{channel.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Current User Area Bottom */}
            <div className="h-[52px] bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-3 border-t border-white/5 mt-auto relative z-30" id="archive-user-footer">
                <div className="flex items-center min-w-0">
                    <div className="w-8 h-8 rounded-full border border-orange-500/30 overflow-hidden shrink-0 shadow-[0_0_10px_rgba(234,88,12,0.2)]">
                        <img src={profile?.avatar_url || "https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png"} className="w-full h-full object-cover" />
                    </div>
                    <div className="ml-2 flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-white truncate max-w-[80px]">
                            {profile?.display_name || profile?.username || 'Initiate'}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                            <div className="w-1 h-1 rounded-full bg-green-500"></div>
                            <span className="truncate uppercase tracking-tighter">{profile?.tier || 'Soul'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-all">
                        <Shield className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-all">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
