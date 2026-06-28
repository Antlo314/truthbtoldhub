'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useArchiveStore, DMConversation } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import WorkspacesSidebar from './WorkspacesSidebar';
import ChannelsSidebar from './ChannelsSidebar';
import ChatArea from './ChatArea';
import DMThread from './DMThread';
import MemberListSidebar from './MemberListSidebar';
import { VoiceProvider } from './VoiceProvider';
import SanctumWelcome from './SanctumWelcome';
import { Hexagon } from 'lucide-react';

const SANCTUM_WS = '00000000-0000-0000-0000-000000000000';

export default function ArchiveClient() {
    const { fetchIdentity, user } = useSoulStore();
    const {
        activeWorkspaceId, setWorkspaces, setActiveWorkspaceId, isMobileMenuOpen, setIsMobileMenuOpen,
        setPresenceState, setBannedUsers, setUserBanned, addReaction, removeReaction,
        setDmConversations, bumpDmConversation, incrementDmUnread,
    } = useArchiveStore();

    const [isLoading, setIsLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const initializedRef = useRef(false);
    const activeStateRef = useRef({ activeWorkspaceId, activeDmId: null as string | null });
    const presenceRef = useRef<any>(null);
    const presenceReadyRef = useRef(false);

    // Keep a ref of the current view so realtime handlers can read it without re-subscribing.
    useEffect(() => {
        const unsub = useArchiveStore.subscribe((s) => {
            activeStateRef.current = { activeWorkspaceId: s.activeWorkspaceId, activeDmId: s.activeDmId };
        });
        return unsub;
    }, []);

    useEffect(() => { fetchIdentity(); }, [fetchIdentity]);

    useEffect(() => {
        const myId = user?.id;
        if (!myId) {
            // Give identity a beat to resolve; if still nothing, send home.
            const t = setTimeout(async () => {
                const { data } = await supabase.auth.getSession();
                if (!data.session) window.location.href = '/';
            }, 1500);
            return () => clearTimeout(t);
        }
        if (initializedRef.current) return;
        initializedRef.current = true;

        const channels: any[] = [];
        let lastSeenTimer: any = null;

        const loadDms = async () => {
          try {
            const { data: convs } = await supabase
                .from('dm_conversations')
                .select('*')
                .or(`user_lo.eq.${myId},user_hi.eq.${myId}`)
                .order('last_message_at', { ascending: false })
                .limit(100);
            if (!convs) return;
            const otherIds = convs.map((c: any) => (c.user_lo === myId ? c.user_hi : c.user_lo));
            const profMap: Record<string, any> = {};
            if (otherIds.length) {
                const { data: profs } = await supabase
                    .from('profiles').select('id, display_name, avatar_url, tier, status, last_seen_at').in('id', otherIds);
                (profs || []).forEach((p: any) => { profMap[p.id] = p; });
            }
            const convIds = convs.map((c: any) => c.id);
            const unreadByConv: Record<string, number> = {};
            if (convIds.length) {
                const { data: unreadRows } = await supabase
                    .from('dm_messages').select('conversation_id').in('conversation_id', convIds)
                    .neq('sender_id', myId).is('read_at', null);
                (unreadRows || []).forEach((r: any) => { unreadByConv[r.conversation_id] = (unreadByConv[r.conversation_id] || 0) + 1; });
            }
            const mapped: DMConversation[] = convs.map((c: any) => {
                const otherId = c.user_lo === myId ? c.user_hi : c.user_lo;
                return { ...c, other: profMap[otherId] || { id: otherId, display_name: 'Soul' }, unread: unreadByConv[c.id] || 0 };
            });
            setDmConversations(mapped);
          } catch (e) { console.error('loadDms failed', e); }
        };

        const bootstrap = async () => {
            // 1. Join the Sanctum (stamps Architect role for admin emails)
            try { await supabase.rpc('join_sanctum', { _workspace: SANCTUM_WS }); } catch (e) { /* non-fatal */ }

            // 2. Workspaces
            const { data: workspaces } = await supabase.from('archive_workspaces').select('*').order('created_at', { ascending: true });
            if (workspaces && workspaces.length > 0) {
                setWorkspaces(workspaces);
                // Land in the Sanctum halls by default — unless the soul arrived
                // with a pending Whisper (a DM deep-link sets activeDmId first).
                const view = activeStateRef.current;
                if (view.activeWorkspaceId === null && view.activeDmId === null) {
                    const sanctum = workspaces.find((w: any) => w.id === SANCTUM_WS) || workspaces[0];
                    setActiveWorkspaceId(sanctum.id);
                }
            }

            // 3. Presence — global online + the Hall each soul is currently in.
            // `sync` carries the authoritative full state (fires on join/leave/track),
            // so we rebuild from it rather than tracking joins/leaves piecemeal.
            const presence = supabase.channel('archive_global_presence', { config: { presence: { key: myId } } });
            presence.on('presence', { event: 'sync' }, () => {
                setPresenceState(presence.presenceState() as any);
            });
            presence.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    presenceReadyRef.current = true;
                    await presence.track({
                        workspace_id: activeStateRef.current.activeWorkspaceId,
                        online_at: new Date().toISOString(),
                    });
                }
            });
            presenceRef.current = presence;
            channels.push(presence);

            // 4. Persisted "last seen" for profile pages
            const touchLastSeen = () => supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', myId);
            touchLastSeen();
            lastSeenTimer = setInterval(touchLastSeen, 60000);

            // 5. Chat bans (mutes/bans from chat)
            const { data: bans } = await supabase.from('archive_chat_bans').select('user_id, until');
            const now = Date.now();
            setBannedUsers((bans || []).filter((b: any) => !b.until || new Date(b.until).getTime() > now).map((b: any) => b.user_id));
            const banSub = supabase.channel('archive_chat_bans_live')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_chat_bans' }, (p) => setUserBanned(p.new.user_id, true))
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'archive_chat_bans' }, (p) => setUserBanned(p.old.user_id, false))
                .subscribe();
            channels.push(banSub);

            // 6. Reactions (global — RLS keeps this to halls the soul may view)
            const rxSub = supabase.channel('archive_reactions_live')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_reactions' }, (p) =>
                    addReaction({ message_id: p.new.message_id, user_id: p.new.user_id, emoji: p.new.emoji }))
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'archive_reactions' }, (p) =>
                    removeReaction({ message_id: p.old.message_id, user_id: p.old.user_id, emoji: p.old.emoji }))
                .subscribe();
            channels.push(rxSub);

            // 7. Direct messages — inbox (RLS keeps this to my conversations)
            await loadDms();
            const dmSub = supabase.channel('dm_inbox')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (p) => {
                    const m = p.new as any;
                    const state = useArchiveStore.getState();
                    const conv = state.dmConversations.find((c) => c.id === m.conversation_id);
                    if (!conv) { loadDms(); return; } // a brand-new thread aimed at me
                    bumpDmConversation(m.conversation_id, m.created_at, m.content.slice(0, 80));
                    const view = activeStateRef.current;
                    const isOpen = view.activeWorkspaceId === null && view.activeDmId === m.conversation_id;
                    if (m.sender_id !== myId && !isOpen) incrementDmUnread(m.conversation_id);
                })
                .subscribe();
            channels.push(dmSub);

            setIsLoading(false);
            // First-visit welcome + house rules.
            try { if (!localStorage.getItem('tbth-sanctum-welcomed')) setShowWelcome(true); } catch { /* */ }
        };

        bootstrap();

        return () => {
            channels.forEach((ch) => supabase.removeChannel(ch));
            if (lastSeenTimer) clearInterval(lastSeenTimer);
            presenceRef.current = null;
            presenceReadyRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Re-broadcast presence whenever the soul moves between Halls so the member
    // list can show who's actually *here* vs. elsewhere in the Sanctum.
    useEffect(() => {
        if (!presenceReadyRef.current || !presenceRef.current) return;
        presenceRef.current.track({
            workspace_id: activeWorkspaceId,
            online_at: new Date().toISOString(),
        });
    }, [activeWorkspaceId]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-void">
                <div className="flex flex-col items-center">
                    <Hexagon className="w-12 h-12 text-aether-gold animate-spin-slow mb-6" />
                    <p className="text-zinc-500 font-mono text-[10px] tracking-[0.3em] uppercase">Synchronizing with The Sanctum…</p>
                </div>
            </div>
        );
    }

    const inDirectMessages = activeWorkspaceId === null;

    return (
        <VoiceProvider>
            <div className="flex h-full w-full overflow-hidden bg-void relative">
                {showWelcome && (
                    <SanctumWelcome onClose={() => { try { localStorage.setItem('tbth-sanctum-welcomed', '1'); } catch { /* */ } setShowWelcome(false); }} />
                )}
                {/* Mobile overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                )}

                {/* Left rails */}
                <div className={`fixed md:static inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <WorkspacesSidebar />
                    <ChannelsSidebar />
                </div>

                {/* Center */}
                {inDirectMessages ? <DMThread /> : <ChatArea />}

                {/* Right rail (halls only) */}
                {!inDirectMessages && <MemberListSidebar />}
            </div>
        </VoiceProvider>
    );
}
