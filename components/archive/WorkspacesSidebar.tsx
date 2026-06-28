'use client';

import { useState } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import { isArchitect } from '@/lib/archive/access';
import { MessageSquare, Plus, Hexagon } from 'lucide-react';

export default function WorkspacesSidebar() {
    const { workspaces, activeWorkspaceId, setActiveWorkspaceId, setActiveChannelId, dmConversations, onlineLocations } = useArchiveStore();
    const { user } = useSoulStore();
    const [adding, setAdding] = useState(false);
    const viewerIsArchitect = isArchitect(user?.email);

    const totalDmUnread = dmConversations.reduce((sum, c) => sum + (c.unread || 0), 0);

    // How many *other* souls are currently gathered in each Hall — drawn straight
    // from live presence so you can scan activity without entering.
    const hereByWorkspace: Record<string, number> = {};
    for (const [uid, loc] of Object.entries(onlineLocations)) {
        if (!loc || uid === user?.id) continue;
        hereByWorkspace[loc] = (hereByWorkspace[loc] || 0) + 1;
    }

    const addSanctum = async () => {
        const name = typeof window !== 'undefined' ? window.prompt('Name the new Sanctum') : null;
        if (!name || !name.trim()) return;
        setAdding(true);
        try {
            const { error } = await supabase.from('archive_workspaces').insert({ name: name.trim() });
            if (error) throw error;
        } catch (e) {
            console.error('add workspace failed', e);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="w-[72px] min-w-[72px] h-full bg-black/60 backdrop-blur-xl flex flex-col items-center py-4 gap-2 overflow-y-auto no-scrollbar scrollbar-hide z-20 shrink-0 border-r border-white/5">
            {/* Direct Messages (home) */}
            <button
                id="archive-home-btn"
                onClick={() => { setActiveWorkspaceId(null); setActiveChannelId(null); }}
                title="Whispers (Direct Messages)"
                className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center relative group
                ${activeWorkspaceId === null ? 'bg-aether-gold text-black rounded-[16px] shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-zinc-800 text-zinc-400 hover:bg-aether-gold hover:text-black'}`}
            >
                <MessageSquare className="w-6 h-6" />
                {totalDmUnread > 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-black">
                        {totalDmUnread > 99 ? '99+' : totalDmUnread}
                    </span>
                )}
                {activeWorkspaceId === null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-aether-gold rounded-r-full" />}
                {activeWorkspaceId !== null && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-aether-gold rounded-r-full transition-all duration-200" />}
            </button>

            <div className="w-8 h-[1px] bg-white/10 rounded-full mx-auto my-1" />

            {/* Sanctums (workspaces) */}
            {workspaces.map((workspace) => (
                <button
                    key={workspace.id}
                    onClick={() => { setActiveWorkspaceId(workspace.id); setActiveChannelId(null); }}
                    title={workspace.name}
                    className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center font-bold text-[15px] relative group border border-white/5
                    ${activeWorkspaceId === workspace.id ? 'bg-aether-gold text-black rounded-[16px] shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-zinc-800 text-zinc-400 hover:bg-aether-gold hover:text-black'}`}
                >
                    {workspace.icon_url ? (
                        <div className="w-full h-full rounded-[inherit] overflow-hidden">
                            <img src={workspace.icon_url} alt={workspace.name} className="w-full h-full object-cover" />
                        </div>
                    ) : workspace.name === 'The Sanctum' ? (
                        <Hexagon className="w-6 h-6" />
                    ) : (
                        <span>{workspace.name.substring(0, 2).toUpperCase()}</span>
                    )}
                    {hereByWorkspace[workspace.id] > 0 && (
                        <span
                            title={`${hereByWorkspace[workspace.id]} ${hereByWorkspace[workspace.id] === 1 ? 'soul' : 'souls'} gathered here now`}
                            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        >
                            {hereByWorkspace[workspace.id] > 99 ? '99+' : hereByWorkspace[workspace.id]}
                        </span>
                    )}
                    {activeWorkspaceId === workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-10 bg-aether-gold rounded-r-full" />}
                    {activeWorkspaceId !== workspace.id && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-0 group-hover:h-5 bg-aether-gold rounded-r-full transition-all duration-200" />}
                </button>
            ))}

            {/* Architect: forge a new Sanctum */}
            {viewerIsArchitect && (
                <button
                    onClick={addSanctum}
                    disabled={adding}
                    title="Forge a new Sanctum"
                    className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-zinc-800 text-aether-gold/60 hover:bg-aether-gold hover:text-black transition-all duration-300 flex items-center justify-center mt-1 border border-white/5 disabled:opacity-50"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
