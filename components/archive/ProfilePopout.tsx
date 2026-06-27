'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { isArchitect, tierColor, presenceLabel, DEFAULT_AVATAR } from '@/lib/archive/access';
import {
    X, Zap, MessageSquare, ExternalLink, ShieldOff, ShieldCheck,
    Link as LinkIcon, MapPin, Loader2, Crown, ArrowUpRight,
} from 'lucide-react';

interface ProfilePopoutProps {
    userId: string;
    onClose: () => void;
}

const SANCTUM_WS = '00000000-0000-0000-0000-000000000000';

export default function ProfilePopout({ userId, onClose }: ProfilePopoutProps) {
    const router = useRouter();
    const { user: me } = useSoulStore();
    const { onlineUsers, bannedUserIds, setUserBanned, setActiveWorkspaceId, setActiveDmId, upsertDmConversation } = useArchiveStore();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const viewerIsArchitect = isArchitect(me?.email);
    const isSelf = me?.id === userId;
    const isOnline = onlineUsers.has(userId);
    const isBanned = bannedUserIds.has(userId);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (active) { setProfile(data); setLoading(false); }
        })();
        return () => { active = false; };
    }, [userId]);

    const startWhisper = async () => {
        if (isSelf) return;
        setBusy(true);
        try {
            const { data: convId, error } = await supabase.rpc('start_dm', { _other: userId });
            if (error) throw error;
            upsertDmConversation({
                id: convId,
                user_lo: '', user_hi: '',
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
                other: {
                    id: userId,
                    display_name: profile?.display_name || profile?.username || 'Soul',
                    avatar_url: profile?.avatar_url,
                    tier: profile?.tier,
                    status: profile?.status,
                    last_seen_at: profile?.last_seen_at,
                },
                unread: 0,
            });
            setActiveWorkspaceId(null);
            setActiveDmId(convId);
            onClose();
        } catch (e) {
            console.error('start_dm failed', e);
        } finally {
            setBusy(false);
        }
    };

    const toggleChatBan = async () => {
        if (!viewerIsArchitect || isSelf) return;
        setBusy(true);
        try {
            if (isBanned) {
                await supabase.from('archive_chat_bans').delete().eq('user_id', userId);
                setUserBanned(userId, false);
            } else {
                await supabase.from('archive_chat_bans').upsert({
                    user_id: userId,
                    banned_by: me?.id,
                    reason: 'Silenced by an Architect',
                    until: null,
                });
                setUserBanned(userId, true);
            }
        } catch (e) {
            console.error('chat ban toggle failed', e);
        } finally {
            setBusy(false);
        }
    };

    const promoteToSentinel = async () => {
        if (!viewerIsArchitect || isSelf) return;
        setBusy(true);
        try {
            await supabase.rpc('set_member_role', { _uid: userId, _workspace: SANCTUM_WS, _role: 'Moderator' });
        } catch (e) {
            console.error('promote failed', e);
        } finally {
            setBusy(false);
        }
    };

    const displayName = profile?.display_name || profile?.username || 'Soul';
    const avatar = profile?.avatar_url || DEFAULT_AVATAR;
    const links: { label: string; url: string }[] = Array.isArray(profile?.links) ? profile.links : [];

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/40 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-aether-gold animate-spin" />
                    </div>
                ) : !profile ? (
                    <div className="h-64 flex items-center justify-center text-center p-6">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Soul coordinates lost.</p>
                    </div>
                ) : (
                    <>
                        {/* Banner */}
                        <div className="h-24 w-full relative bg-gradient-to-br from-aether-gold-deep/40 to-aether-surface">
                            {profile.banner_url && (
                                <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        </div>

                        {/* Identity */}
                        <div className="px-5 pb-5 -mt-10 relative">
                            <div className="flex items-end justify-between">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-aether-gold/40 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-zinc-600'}`} />
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-400">
                                        {presenceLabel(isOnline, profile.last_seen_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <h3 className="font-ritual text-xl font-bold text-white tracking-wide uppercase">{displayName}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-current/20 ${tierColor(profile.tier)}`}>
                                    {profile.tier || 'Initiate'}
                                </span>
                                {profile.is_supporter && (
                                    <span title="Supporter" className="text-aether-gold"><Crown className="w-3.5 h-3.5" /></span>
                                )}
                                {isBanned && (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-500/30 bg-red-500/10 text-red-400">Silenced</span>
                                )}
                            </div>

                            {profile.custom_title && (
                                <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-aether-gold/80">{profile.custom_title}</p>
                            )}
                            {profile.status && (
                                <p className="mt-2 text-xs text-zinc-300 italic">“{profile.status}”</p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-aether-gold" /> {profile.soul_power ?? 0} SP</span>
                                {profile.pronouns && <span>{profile.pronouns}</span>}
                                {profile.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {profile.location}</span>}
                            </div>

                            {profile.bio && (
                                <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed border-l border-white/10 pl-3 whitespace-pre-wrap line-clamp-4">
                                    {profile.bio}
                                </p>
                            )}

                            {links.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {links.slice(0, 4).map((l, i) => (
                                        <a
                                            key={i}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono uppercase tracking-widest text-zinc-300 hover:border-aether-gold/40 hover:text-aether-gold transition-colors"
                                        >
                                            <LinkIcon className="w-2.5 h-2.5" /> {l.label || 'link'}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-5 space-y-2">
                                {!isSelf && (
                                    <button
                                        onClick={startWhisper}
                                        disabled={busy}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-aether-gold text-black font-black text-[10px] uppercase tracking-widest hover:bg-aether-gold-soft transition-colors disabled:opacity-50"
                                    >
                                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                        Send a Whisper
                                    </button>
                                )}
                                <button
                                    onClick={() => { router.push(`/profiles/${userId}`); onClose(); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-bold text-[10px] uppercase tracking-widest hover:border-white/25 hover:text-white transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" /> View Sanctum Profile
                                </button>

                                {viewerIsArchitect && !isSelf && (
                                    <div className="pt-2 mt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={toggleChatBan}
                                            disabled={busy}
                                            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
                                                isBanned
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                            }`}
                                        >
                                            {isBanned ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                                            {isBanned ? 'Unsilence' : 'Silence'}
                                        </button>
                                        <button
                                            onClick={promoteToSentinel}
                                            disabled={busy}
                                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-aether-cyan/30 bg-aether-cyan/10 text-aether-cyan text-[9px] font-bold uppercase tracking-widest hover:bg-aether-cyan/20 transition-colors disabled:opacity-50"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" /> Make Sentinel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
