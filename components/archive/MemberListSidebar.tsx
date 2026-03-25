'use client';

import { useEffect } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { supabase } from '@/lib/supabase';

// Mock members currently until proper DB data
const MOCK_ROLES = [
    { title: 'ADMINISTRATOR', color: '#ff5252' },
    { title: 'MODERATOR', color: '#ffb74d' },
    { title: 'ONLINE', color: '#949ba4' }
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
        'ADMINISTRATOR': activeMembers.filter(m => m.role === 'Admin'),
        'MODERATOR': activeMembers.filter(m => m.role === 'Moderator'),
        'ONLINE': activeMembers.filter(m => m.role === 'Member' && onlineUsers.has(m.user_id)),
        'OFFLINE': activeMembers.filter(m => m.role === 'Member' && !onlineUsers.has(m.user_id))
    };

    if (!activeWorkspaceId) {
        return <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-[#2b2d31] shrink-0" />;
    }

    return (
        <div className="hidden lg:flex w-[240px] min-w-[240px] h-full bg-[#2b2d31] flex-col shrink-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-6">
                
                {['ADMINISTRATOR', 'MODERATOR', 'ONLINE', 'OFFLINE'].map((roleKey) => {
                    const roleMembers = grouped[roleKey as keyof typeof grouped] || [];
                    if (roleMembers.length === 0) return null;

                    const titleColor = roleKey === 'ADMINISTRATOR' ? 'text-[#ff5252]' : 
                                     roleKey === 'MODERATOR' ? 'text-[#ffb74d]' : 'text-[#949ba4]';
                    
                    const isOfflineGroup = roleKey === 'OFFLINE';

                    return (
                        <div key={roleKey} className="mb-6">
                            <h3 className={`text-[11px] font-bold uppercase tracking-wider px-2 mb-1 ${isOfflineGroup ? 'text-[#949ba4]' : titleColor}`}>
                                {roleKey} — {roleMembers.length}
                            </h3>
                            
                            <div className="space-y-0.5">
                                {roleMembers.map((member) => {
                                    const isOnline = onlineUsers.has(member.user_id) || !isOfflineGroup;
                                    
                                    return (
                                        <button 
                                            key={member.user_id} 
                                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors group
                                                ${isOfflineGroup ? 'opacity-50 hover:opacity-100 text-[#949ba4]' : 'text-[#80848e]'}
                                            `}
                                        >
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#313338]">
                                                    <img 
                                                        src={member.profile?.avatar_url || "https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png"} 
                                                        alt="Avatar" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                {/* Status Indicator */}
                                                <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-[#2b2d31] flex items-center justify-center">
                                                    <div className={`w-[10px] h-[10px] rounded-full ${isOnline ? 'bg-[#23a559]' : 'bg-[#80848e] border-2 border-[#2b2d31] bg-transparent'}`} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <span className={`text-[15px] font-medium truncate block leading-5 
                                                    ${roleKey === 'ADMINISTRATOR' ? 'text-[#ff5252]' : roleKey === 'MODERATOR' ? 'text-[#ffb74d]' : 'text-[#dbdee1]'}
                                                `}>
                                                    {member.profile?.display_name || 'Anonymous User'}
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
