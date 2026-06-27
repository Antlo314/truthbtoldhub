'use client';

import { useState, useRef, useEffect } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATAR, relativeTime } from '@/lib/archive/access';
import UserFooter from './UserFooter';
import VoicePanel from './VoicePanel';
import { PenSquare, Search, X, Loader2 } from 'lucide-react';

// The DM rail: a list of whisper threads + a soul search to begin a new one.
export default function DMSidebar() {
    const { dmConversations, activeDmId, setActiveDmId, onlineUsers, upsertDmConversation } = useArchiveStore();
    const { user } = useSoulStore();

    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const debounce = useRef<any>(null);

    useEffect(() => {
        if (!searching) return;
        if (debounce.current) clearTimeout(debounce.current);
        if (!query.trim()) { setResults([]); return; }
        setLoading(true);
        debounce.current = setTimeout(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, display_name, username, avatar_url, tier')
                .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
                .neq('id', user?.id || '')
                .limit(8);
            setResults(data || []);
            setLoading(false);
        }, 250);
        return () => debounce.current && clearTimeout(debounce.current);
    }, [query, searching, user?.id]);

    const openWhisper = async (target: any) => {
        try {
            const { data: convId, error } = await supabase.rpc('start_dm', { _other: target.id });
            if (error) throw error;
            upsertDmConversation({
                id: convId,
                user_lo: '', user_hi: '',
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
                other: { id: target.id, display_name: target.display_name || target.username || 'Soul', avatar_url: target.avatar_url, tier: target.tier },
                unread: 0,
            });
            setActiveDmId(convId);
            setSearching(false);
            setQuery('');
            setResults([]);
        } catch (e) {
            console.error('open whisper failed', e);
        }
    };

    return (
        <div className="w-[240px] min-w-[240px] h-full bg-aether-surface/40 backdrop-blur-xl flex flex-col shrink-0 border-r border-white/5">
            {/* Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4">
                <h2 className="font-ritual text-white text-[13px] tracking-widest uppercase">Whispers</h2>
                <button
                    onClick={() => setSearching((v) => !v)}
                    title="New whisper"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-aether-gold hover:bg-white/5 transition-colors"
                >
                    {searching ? <X className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
                </button>
            </div>

            {/* Soul search */}
            {searching && (
                <div className="p-3 border-b border-white/5">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus-within:border-aether-gold/40 transition-colors">
                        <Search className="w-3.5 h-3.5 text-zinc-500" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Find a soul…"
                            className="flex-1 bg-transparent text-[12px] text-white focus:outline-none placeholder:text-zinc-600 font-mono"
                        />
                        {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
                    </div>
                    <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {results.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => openWhisper(r)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                            >
                                <img src={r.avatar_url || DEFAULT_AVATAR} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/5" />
                                <span className="text-[12px] text-zinc-200 truncate">{r.display_name || r.username}</span>
                            </button>
                        ))}
                        {!loading && query.trim() && results.length === 0 && (
                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center py-3">No souls found</p>
                        )}
                    </div>
                </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                {dmConversations.length === 0 && !searching && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <PenSquare className="w-7 h-7 text-zinc-700 mb-3" />
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">No whispers yet.<br />Reach out to a soul.</p>
                    </div>
                )}
                {dmConversations.map((conv) => {
                    const other = conv.other;
                    const online = other?.id ? onlineUsers.has(other.id) : false;
                    const active = activeDmId === conv.id;
                    return (
                        <button
                            key={conv.id}
                            onClick={() => setActiveDmId(conv.id)}
                            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors group relative
                                ${active ? 'bg-aether-gold/10 border border-aether-gold/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative shrink-0">
                                <img src={other?.avatar_url || DEFAULT_AVATAR} alt="" className="w-9 h-9 rounded-full object-cover border border-white/5" />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-aether-surface ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[12px] truncate ${active ? 'text-aether-gold font-bold' : 'text-zinc-200'}`}>
                                        {other?.display_name || 'Soul'}
                                    </span>
                                    {conv.last_message_at && (
                                        <span className="text-[8px] font-mono text-zinc-600 shrink-0">{relativeTime(conv.last_message_at)}</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-zinc-500 truncate">{conv.lastMessagePreview || 'Begin the whisper…'}</p>
                            </div>
                            {(conv.unread || 0) > 0 && (
                                <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {conv.unread! > 99 ? '99+' : conv.unread}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <VoicePanel />
            <UserFooter />
        </div>
    );
}
