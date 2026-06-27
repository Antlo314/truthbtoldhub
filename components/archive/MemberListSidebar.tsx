'use client';

import { useEffect, useState } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { supabase } from '@/lib/supabase';
import ProfilePopout from './ProfilePopout';
import { roleLabel, roleColor, DEFAULT_AVATAR } from '@/lib/archive/access';
import { Crown } from 'lucide-react';

export default function MemberListSidebar() {
    const { activeWorkspaceId, members, setMembers, onlineUsers } = useArchiveStore();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (!activeWorkspaceId) return;
        let cancelled = false;
        const fetchMembers = async () => {
            const { data } = await supabase
                .from('archive_workspace_members')
                .select('user_id, workspace_id, role, profile:profiles(id, display_name, avatar_url, soul_power, tier, custom_title, status)')
                .eq('workspace_id', activeWorkspaceId);
            if (data && !cancelled) {
                setMembers(activeWorkspaceId, data.map((m: any) => ({
                    user_id: m.user_id,
                    workspace_id: m.workspace_id,
                    role: m.role,
                    profile: m.profile,
                })));
            }
        };
        fetchMembers();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWorkspaceId]);

    const activeMembers = activeWorkspaceId ? (members[activeWorkspaceId] || []) : [];

    const groups: { key: string; label: string; members: typeof activeMembers; dim?: boolean }[] = [
        { key: 'Admin', label: roleLabel('Admin'), members: activeMembers.filter((m) => m.role === 'Admin') },
        { key: 'Moderator', label: roleLabel('Moderator'), members: activeMembers.filter((m) => m.role === 'Moderator') },
        { key: 'Online', label: 'Souls — Online', members: activeMembers.filter((m) => m.role === 'Member' && onlineUsers.has(m.user_id)) },
        { key: 'Offline', label: 'Souls — Offline', members: activeMembers.filter((m) => m.role === 'Member' && !onlineUsers.has(m.user_id)), dim: true },
    ];

    if (!activeWorkspaceId) {
        return <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-void shrink-0 border-l border-white/5" />;
    }

    return (
        <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-void flex-col shrink-0 border-l border-white/5" id="archive-members-sidebar">
            <div className="h-12 border-b border-white/5 flex items-center px-4 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Gathered Souls — {activeMembers.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-4">
                {groups.map((g) => {
                    if (g.members.length === 0) return null;
                    return (
                        <div key={g.key} className="mb-6">
                            <h3 className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 mb-2 font-mono ${g.dim ? 'text-zinc-700' : roleColor(g.key)}`}>
                                {g.label} — {g.members.length}
                            </h3>
                            <div className="space-y-0.5">
                                {g.members.map((member) => {
                                    const online = onlineUsers.has(member.user_id);
                                    return (
                                        <button
                                            key={member.user_id}
                                            onClick={() => setProfileId(member.user_id)}
                                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all group text-left ${g.dim ? 'opacity-50 hover:opacity-100' : ''}`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-white/5">
                                                    <img src={member.profile?.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-void flex items-center justify-center">
                                                    <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-zinc-700'}`} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-[13px] font-mono tracking-wide truncate flex items-center gap-1 ${g.key === 'Admin' ? 'text-aether-gold font-bold' : g.key === 'Moderator' ? 'text-aether-cyan' : 'text-zinc-300'}`}>
                                                    {member.profile?.display_name || 'Initiate'}
                                                    {g.key === 'Admin' && <Crown className="w-3 h-3 shrink-0" />}
                                                </span>
                                                {member.profile?.status && (
                                                    <span className="block text-[9px] text-zinc-600 font-mono truncate">{member.profile.status}</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {activeMembers.length === 0 && (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center py-8">Souls gather as they arrive…</p>
                )}
            </div>

            {profileId && <ProfilePopout userId={profileId} onClose={() => setProfileId(null)} />}
        </div>
    );
}
