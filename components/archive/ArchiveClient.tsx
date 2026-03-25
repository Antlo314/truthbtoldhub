'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import WorkspacesSidebar from './WorkspacesSidebar';
import ChannelsSidebar from './ChannelsSidebar';
import ChatArea from './ChatArea';
import MemberListSidebar from './MemberListSidebar';

export default function ArchiveClient() {
    const [isLoading, setIsLoading] = useState(true);
    const { 
        setWorkspaces, 
        setActiveWorkspaceId, 
        activeWorkspaceId,
        setMembers,
        setOnlineStatus
    } = useArchiveStore();

    useEffect(() => {
        let presenceChannel: any = null;

        const initArchive = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Not authenticated
                window.location.href = '/vault/def';
                return;
            }

            // 1. Fetch Workspaces (For now, just get all visible workspaces)
            const { data: workspaces } = await supabase.from('archive_workspaces').select('*').order('created_at', { ascending: true });
            if (workspaces && workspaces.length > 0) {
                setWorkspaces(workspaces);
                if (!activeWorkspaceId) {
                    setActiveWorkspaceId(workspaces[0].id);
                }
            }

            // 2. Setup Global Presence
            presenceChannel = supabase.channel('archive_global_presence', {
                config: {
                    presence: { key: user.id }
                }
            });

            presenceChannel.on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                // Map over all connected users and update onlineStatus in Zustand
                const onlineIds = Object.keys(state);
                onlineIds.forEach(id => {
                    setOnlineStatus(id, true);
                });
            });

            presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
                setOnlineStatus(key, true);
            });

            presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
                setOnlineStatus(key, false);
            });

            presenceChannel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

            setIsLoading(false);
        };

        initArchive();

        return () => {
            if (presenceChannel) supabase.removeChannel(presenceChannel);
        };
    }, []); // Run once on mount

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#1e1f22]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[#a3a6aa] font-medium tracking-wide">CONNECTING TO THE ARCHIVE...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden bg-[#1e1f22]">
            {/* 1. Far Left Sidebar: Workspaces */}
            <WorkspacesSidebar />

            {/* 2. Inner Left Sidebar: Channels */}
            <ChannelsSidebar />

            {/* 3. Center: Chat Area */}
            <ChatArea />

            {/* 4. Far Right Sidebar: Member List */}
            <MemberListSidebar />
        </div>
    );
}
