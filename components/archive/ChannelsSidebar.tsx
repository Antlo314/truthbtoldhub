'use client';

import { useEffect, useState } from 'react';
import { useArchiveStore, ArchiveChannel } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import { isArchitect, accessBadge, groupChannelsByCategory } from '@/lib/archive/access';
import UserFooter from './UserFooter';
import DMSidebar from './DMSidebar';
import ChannelAdminModal from './ChannelAdminModal';
import VoicePanel from './VoicePanel';
import { useVoice } from './VoiceProvider';
import { DEFAULT_AVATAR } from '@/lib/archive/access';
import { Hash, Volume2, ChevronDown, Plus, Lock, Settings2, ShieldAlert, MicOff, Loader2 } from 'lucide-react';

export default function ChannelsSidebar() {
    const {
        activeWorkspaceId, workspaces, channels, setChannels,
        activeChannelId, setActiveChannelId, setActiveDmId,
        unreadChannelIds, setIsMobileMenuOpen, members,
    } = useArchiveStore();
    const { user } = useSoulStore();

    const { join: joinVoice, activeVoiceId, participantsByChannel: voiceParticipants, connecting: voiceConnecting } = useVoice();

    const architect = isArchitect(user?.email);
    // Who may change the STRUCTURE (forge/edit/delete Halls): Architects + the
    // workspace's Moderators (Sentinels). Mirrors the can_manage_sanctum RLS.
    const myRole = activeWorkspaceId && user ? (members[activeWorkspaceId] || []).find((m) => m.user_id === user.id)?.role : null;
    const canManage = architect || myRole === 'Admin' || myRole === 'Moderator';
    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];

    const [modalOpen, setModalOpen] = useState(false);
    const [editChannel, setEditChannel] = useState<ArchiveChannel | null>(null);
    const [modalCategory, setModalCategory] = useState<string | undefined>(undefined);

    const fetchChannels = async () => {
        if (!activeWorkspaceId) return;
        const { data } = await supabase
            .from('archive_channels')
            .select('*')
            .eq('workspace_id', activeWorkspaceId)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true });
        if (data) {
            setChannels(activeWorkspaceId, data as ArchiveChannel[]);
            // Only auto-select a hall if THIS workspace is still the active one
            // (guards against a late fetch resolving after a rapid switch) and
            // nothing is selected yet. Read live store state, not a stale closure.
            const st = useArchiveStore.getState();
            if (st.activeWorkspaceId === activeWorkspaceId && !st.activeChannelId) {
                const firstText = data.find((c: any) => c.type === 'text');
                if (firstText) setActiveChannelId(firstText.id);
            }
        }
    };

    useEffect(() => {
        if (!activeWorkspaceId) return;
        fetchChannels();
        const channelSub = supabase.channel(`workspace_${activeWorkspaceId}_channels`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_channels', filter: `workspace_id=eq.${activeWorkspaceId}` }, () => {
                fetchChannels();
            }).subscribe();
        return () => { supabase.removeChannel(channelSub); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWorkspaceId]);

    // No workspace selected => the Whispers (DM) rail.
    if (!activeWorkspaceId) {
        return <DMSidebar />;
    }

    const grouped = groupChannelsByCategory(workspaceChannels);

    const openCreate = (category?: string) => { setEditChannel(null); setModalCategory(category); setModalOpen(true); };
    const openEdit = (c: ArchiveChannel) => { setEditChannel(c); setModalCategory(c.category); setModalOpen(true); };

    const selectChannel = (id: string) => {
        setActiveDmId(null);
        setActiveChannelId(id);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="w-[240px] min-w-[240px] h-full bg-aether-surface/40 backdrop-blur-xl flex flex-col shrink-0 border-r border-white/5" id="archive-channels-sidebar">
            {/* Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 group">
                <h2 className="font-ritual text-white text-[13px] tracking-widest uppercase truncate">{activeWorkspace?.name || 'Sanctum'}</h2>
                {canManage && (
                    <button onClick={() => openCreate()} title="Forge a hall" className="p-1 text-zinc-500 hover:text-aether-gold transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Hall list */}
            <div className="flex-1 overflow-y-auto pt-4 px-2 custom-scrollbar space-y-5" id="archive-channels-list">
                {grouped.map(({ category, channels: catChannels }) => (
                    <div key={category}>
                        <div className="flex items-center justify-between text-zinc-500 group/cat px-1 mb-1">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em]">
                                <ChevronDown className="w-3 h-3" />
                                {category}
                            </div>
                            {canManage && (
                                <button onClick={() => openCreate(category)} className="opacity-0 group-hover/cat:opacity-100 transition-opacity text-zinc-500 hover:text-aether-gold">
                                    <Plus className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-[2px]">
                            {catChannels.map((channel) => {
                                const isVoice = channel.type === 'voice';
                                const isVoiceActive = isVoice && activeVoiceId === channel.id;
                                const isActive = isVoice ? isVoiceActive : activeChannelId === channel.id;
                                const unread = !isVoice && unreadChannelIds.has(channel.id) && activeChannelId !== channel.id;
                                const badge = accessBadge(channel);
                                const Icon = isVoice ? Volume2 : Hash;
                                const vParts = isVoice ? (voiceParticipants[channel.id] || []) : [];
                                return (
                                    <div key={channel.id} className="relative group/hall">
                                        <button
                                            onClick={() => isVoice ? joinVoice(channel.id) : selectChannel(channel.id)}
                                            className={`w-full flex items-center px-2 py-1.5 rounded-lg transition-all relative overflow-hidden
                                                ${isActive
                                                    ? 'bg-aether-gold/10 text-aether-gold border border-aether-gold/20'
                                                    : `border border-transparent ${unread ? 'text-white' : 'text-zinc-500'} hover:bg-white/5 hover:text-zinc-200`}`}
                                        >
                                            <Icon className={`w-4 h-4 mr-1.5 shrink-0 ${isActive ? 'text-aether-gold' : 'opacity-50'}`} />
                                            <span className={`font-mono text-[13px] tracking-wide truncate ${isActive || unread ? 'font-bold' : ''}`}>{channel.name}</span>
                                            {channel.locked && <Lock className="w-3 h-3 ml-1.5 opacity-50 shrink-0" />}
                                            {channel.access === 'supporters' && <ShieldAlert className="w-3 h-3 ml-1 text-aether-gold/60 shrink-0" />}
                                            {channel.access === 'architects' && <ShieldAlert className="w-3 h-3 ml-1 text-red-400/70 shrink-0" />}
                                            {isVoice && voiceConnecting && activeVoiceId === channel.id && <Loader2 className="w-3 h-3 ml-auto animate-spin text-aether-gold shrink-0" />}
                                            {isVoice && vParts.length > 0 && !(voiceConnecting && activeVoiceId === channel.id) && (
                                                <span className="ml-auto text-[9px] font-mono text-emerald-400 shrink-0">{vParts.length}</span>
                                            )}
                                            {unread && <span className="ml-auto w-2 h-2 rounded-full bg-aether-gold shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />}
                                            {isActive && <div className="absolute right-0 top-0 w-1 h-full bg-aether-gold" />}
                                        </button>
                                        {canManage && (
                                            <button
                                                onClick={() => openEdit(channel)}
                                                title="Edit hall"
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/hall:opacity-100 transition-opacity p-1 rounded text-zinc-500 hover:text-aether-gold bg-aether-surface/80"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {badge && !isActive && !(isVoice && vParts.length > 0) && (
                                            <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 group-hover/hall:opacity-0 transition-opacity px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        )}

                                        {/* Connected souls under a voice Hall */}
                                        {isVoice && vParts.length > 0 && (
                                            <div className="pl-7 pr-2 py-1 space-y-1">
                                                {vParts.map((p) => (
                                                    <div key={p.id} className="flex items-center gap-2 text-zinc-400">
                                                        <img src={p.avatar || DEFAULT_AVATAR} alt="" className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" />
                                                        <span className="text-[11px] font-mono truncate flex-1">{p.name}</span>
                                                        {p.muted && <MicOff className="w-3 h-3 text-red-400/70 shrink-0" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {grouped.length === 0 && (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center py-8 px-3">
                        No halls here yet.{canManage ? ' Forge the first one.' : ''}
                    </p>
                )}
            </div>

            <VoicePanel />
            <UserFooter />

            {modalOpen && activeWorkspaceId && (
                <ChannelAdminModal
                    workspaceId={activeWorkspaceId}
                    channel={editChannel}
                    defaultCategory={modalCategory}
                    onClose={() => setModalOpen(false)}
                    onSaved={fetchChannels}
                />
            )}
        </div>
    );
}
