'use client';

import { useEffect } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { supabase } from '@/lib/supabase';

// Mock roles currently until proper DB data
const MOCK_ROLES = [
    { title: 'ARCHITECT', color: '#f97316' }, // Orange-500
    { title: 'SENTINEL', color: '#f59e0b' },  // Amber-500
    { title: 'INITIATE', color: '#71717a' }   // Zinc-400
];

export default function MemberListSidebar() {
    const { activeWorkspaceId, members, setMembers, onlineUsers } = useArchiveStore();

    useEffect(() => {
        if (!activeWorkspaceId) return;

        // Fetch workspace members from DB
        const fetchMembers = async () => {
            const { data } = await supabase
                .from('archive_workspace_members')
                .select('*, profile:profiles(display_name, avatar_url)')
                .eq('workspace_id', activeWorkspaceId);

            if (data && data.length > 0) {
                setMembers(activeWorkspaceId, data.map(m => ({
                    user_id: m.user_id,
                    workspace_id: m.workspace_id,
                    role: m.role,
                    profile: m.profile
                })));
            } else {
                // Mock data
                setMembers(activeWorkspaceId, [
                    { user_id: '1', workspace_id: activeWorkspaceId, role: 'Admin', profile: { display_name: 'TheVoid', avatar_url: '' } },
                    { user_id: '2', workspace_id: activeWorkspaceId, role: 'Moderator', profile: { display_name: 'Initiate_99', avatar_url: '' } },
                    { user_id: '3', workspace_id: activeWorkspaceId, role: 'Member', profile: { display_name: 'CipherText', avatar_url: '' } }
                ]);
            }
        };

        fetchMembers();
    }, [activeWorkspaceId]);

    const activeMembers = activeWorkspaceId ? (members[activeWorkspaceId] || []) : [];

    // Group members by role
    const grouped = {
        'ARCHITECT': activeMembers.filter(m => m.role === 'Admin'),
        'SENTINEL': activeMembers.filter(m => m.role === 'Moderator'),
        'ONLINE': activeMembers.filter(m => m.role === 'Member' && onlineUsers.has(m.user_id)),
        'OFFLINE': activeMembers.filter(m => m.role === 'Member' && !onlineUsers.has(m.user_id))
    };

    if (!activeWorkspaceId) {
        return <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-zinc-950 shrink-0 border-l border-white/5" />;
    }

    return (
        <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-zinc-950 flex-col shrink-0 border-l border-white/5" id="archive-members-sidebar">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-6">
                
                {['ARCHITECT', 'SENTINEL', 'ONLINE', 'OFFLINE'].map((roleKey) => {
                    const roleMembers = grouped[roleKey as keyof typeof grouped] || [];
                    if (roleMembers.length === 0) return null;

                    const titleColor = roleKey === 'ARCHITECT' ? 'text-orange-500' : 
                                     roleKey === 'SENTINEL' ? 'text-amber-500' : 'text-zinc-500';
                    
                    const isOfflineGroup = roleKey === 'OFFLINE';

                    return (
                        <div key={roleKey} className="mb-6">
                            <h3 className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 mb-2 font-mono ${isOfflineGroup ? 'text-zinc-700' : titleColor}`}>
                                {roleKey} — {roleMembers.length}
                            </h3>
                            
                            <div className="space-y-0.5">
                                {roleMembers.map((member) => {
                                    const isOnline = onlineUsers.has(member.user_id) || !isOfflineGroup;
                                    
                                    return (
                                        <button 
                                            key={member.user_id} 
                                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all group
                                                ${isOfflineGroup ? 'opacity-40 hover:opacity-100 text-zinc-600' : 'text-zinc-400'}
                                            `}
                                        >
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shadow-inner">
                                                    <img 
                                                        src={member.profile?.avatar_url || "https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png"} 
                                                        alt="Avatar" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                </div>
                                                {/* Status Indicator */}
                                                <div className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] rounded-full bg-zinc-950 flex items-center justify-center">
                                                    <div className={`w-[8px] h-[8px] rounded-full ${isOnline ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.6)]' : 'bg-zinc-800'}`} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <span className={`text-[13px] font-mono tracking-wide truncate block leading-5 
                                                    ${roleKey === 'ARCHITECT' ? 'text-orange-500 font-bold' : roleKey === 'SENTINEL' ? 'text-amber-500' : 'text-zinc-300'}
                                                `}>
                                                    {member.profile?.display_name || 'Initiate'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
