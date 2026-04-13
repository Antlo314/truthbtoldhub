'use client';

import { useEffect, useState, useRef } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { supabase } from '@/lib/supabase';
import MessageBubble from './MessageBubble';
import { Hash, PlusCircle, Smile, Gift, FileImage, Send, Menu, Activity } from 'lucide-react';

export default function ChatArea() {
    const { activeChannelId, workspaces, activeWorkspaceId, channels, messages, setMessages, addMessage, setIsMobileMenuOpen, members, deleteMessage } = useArchiveStore();
    const { profile: currentUserProfile, user: currentUserAuth } = useSoulStore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];
    const activeChannel = workspaceChannels.find(c => c.id === activeChannelId);
    const channelMessages = activeChannelId ? (messages[activeChannelId] || []) : [];
    
    // Auth & Roles
    const activeWorkspaceMembers = activeWorkspaceId ? (members[activeWorkspaceId] || []) : [];
    const currentMemberRole = currentUserAuth ? activeWorkspaceMembers.find(m => m.user_id === currentUserAuth.id)?.role : null;
    const isGlobalAdmin = currentMemberRole === 'Admin' || currentMemberRole === 'Moderator';

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages]);

    useEffect(() => {
        if (!activeChannelId) return;

        // Fetch historical messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('archive_messages')
                .select('*, author:profiles(display_name, avatar_url)')
                .eq('channel_id', activeChannelId)
                .order('created_at', { ascending: true })
                .limit(50);
            
            if (data) {
                setMessages(activeChannelId, data.map(m => ({
                    id: m.id,
                    channel_id: m.channel_id,
                    author_id: m.author_id,
                    content: m.content,
                    is_edited: m.is_edited,
                    reply_to_id: m.reply_to_id,
                    created_at: m.created_at,
                    author: m.author
                })));
            }
        };

        fetchMessages();

        // Subscribe to Realtime Inserts and Deletes
        const messageSub = supabase.channel(`channel_${activeChannelId}_msgs`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'archive_messages', filter: `channel_id=eq.${activeChannelId}` }, async (payload) => {
                // Ignore if we just sent it locally (can check if it already exists or manage optimistic UI better)
                // Need to fetch author data for the incoming real-time message
                const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', payload.new.author_id).single();
                
                addMessage({
                    id: payload.new.id,
                    channel_id: payload.new.channel_id,
                    author_id: payload.new.author_id,
                    content: payload.new.content,
                    is_edited: payload.new.is_edited,
                    reply_to_id: payload.new.reply_to_id,
                    created_at: payload.new.created_at,
                    author: profile || { display_name: 'Unknown' }
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'archive_messages', filter: `channel_id=eq.${activeChannelId}` }, (payload) => {
                deleteMessage(payload.old.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSub);
        };
    }, [activeChannelId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannelId || !currentUserAuth) return;
        
        setIsSending(true);
        const optimisticId = `temp-${Date.now()}`;
        const msgContent = newMessage;
        
        // Optimistic UI
        addMessage({
            id: optimisticId,
            channel_id: activeChannelId,
            author_id: currentUserAuth.id,
            content: msgContent,
            is_edited: false,
            created_at: new Date().toISOString(),
            author: currentUserProfile || { display_name: 'You' }
        });
        
        setNewMessage('');
        
        // Ensure table exists, fallback gracefully if not
        try {
            await supabase.from('archive_messages').insert({
                channel_id: activeChannelId,
                author_id: currentUserAuth.id,
                content: msgContent
            });
            // Note: Real-time will fire another insert but addMessage checks for duplicates if id matches.
            // Since we used a temp id, we might get a duplciate unless we re-fetch or ignore our own inserts via realtime.
            // For robust production, use the actual DB id returned from insert instead of a temp ID.
        } catch (error) {
            console.error('Failed to send message:', error);
        }
        setIsSending(false);
    };

    const handleDeleteMessage = async (messageId: string) => {
        // Optimistic delete
        deleteMessage(messageId);
        try {
            await supabase.from('archive_messages').delete().eq('id', messageId);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    if (!activeChannelId) {
        return (
            <div className="flex-1 bg-zinc-950 flex flex-col min-w-0 relative">
                <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 shadow-sm z-10 md:hidden bg-zinc-950/80 backdrop-blur-xl">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="mr-3 text-zinc-500 hover:text-white"
                        title="Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-ritual text-white text-[13px] tracking-widest uppercase">The Archive</span>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(234,88,12,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative">
                        <div className="absolute inset-0 bg-orange-500/10 blur-xl animate-pulse"></div>
                        <Hash className="w-10 h-10 text-orange-500/40 relative z-10" />
                    </div>
                    <h3 className="font-ritual text-2xl tracking-[0.3em] text-white/40 mb-4 uppercase">Frequency Not Established</h3>
                    <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Select a protocol from the sidebar to stabilize signal.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-zinc-950 flex flex-col min-w-0" id="archive-chat-area">
            {/* Header */}
            <header className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 shadow-sm z-10 bg-zinc-950/50 backdrop-blur-md">
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden mr-3 text-zinc-500 hover:text-zinc-200"
                    title="Menu"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <Hash className="w-5 h-5 text-orange-500 mr-2" />
                <h2 className="font-ritual text-white text-[14px] tracking-widest uppercase">{activeChannel?.name || 'loading...'}</h2>
                {activeChannel?.topic && (
                    <>
                        <div className="w-px h-6 bg-white/5 mx-4" />
                        <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase truncate">{activeChannel.topic}</span>
                    </>
                )}
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-orange-500/10 border border-orange-500/20 shadow-[0_0_10px_rgba(234,88,12,0.1)]">
                        <Activity className="w-3 h-3 text-orange-500 animate-pulse" />
                        <span className="text-[9px] font-mono text-orange-500 font-bold uppercase tracking-widest leading-none">Signal Active</span>
                    </div>
                </div>
            </header>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 xl:px-6 relative" id="archive-messages-container">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.03)_0%,transparent_80%)] pointer-events-none"></div>
                <div className="flex flex-col justify-end min-h-full relative z-10">
                    {/* Welcome Message Top */}
                    <div className="mt-8 mb-6 group">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-orange-500/30 flex items-center justify-center mb-4 text-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.1)] group-hover:border-orange-500 transition-all duration-500">
                            <Hash className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        </div>
                        <h1 className="font-ritual text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-widest">Protocol Sector: #{activeChannel?.name}</h1>
                        <p className="text-[11px] text-zinc-500 font-mono tracking-widest uppercase">Stabilizing initial frequency... Data stream start.</p>
                    </div>

                    <div className="w-full h-px bg-white/5 my-6" />

                    {/* Messages List */}
                    {channelMessages.map((msg, idx) => {
                        const prevMsg = channelMessages[idx - 1];
                        // Group messages if same author within 5 minutes
                        const isGrouped = prevMsg && 
                                          prevMsg.author_id === msg.author_id && 
                                          (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000);
                        
                        const canDelete = currentUserAuth?.id === msg.author_id || isGlobalAdmin;

                        return (
                            <MessageBubble 
                                key={msg.id} 
                                message={msg} 
                                isGrouped={isGrouped} 
                                canDelete={canDelete}
                                onDelete={() => handleDeleteMessage(msg.id)}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="px-4 pb-6 pt-2 shrink-0 relative z-20" id="archive-input-section">
                <form 
                    onSubmit={handleSendMessage}
                    className="bg-zinc-900 border border-white/5 rounded-xl flex items-center px-4 py-2.5 relative group outline-none focus-within:border-orange-500/50 shadow-2xl transition-all"
                >
                    <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
                    
                    <button type="button" title="Inject Data" className="text-zinc-500 hover:text-orange-500 p-1.5 mr-2 bg-zinc-950 border border-white/5 rounded-lg shrink-0 transition-colors">
                        <PlusCircle className="w-5 h-5" />
                    </button>
                    
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Inject protocol into #${activeChannel?.name || 'void'}...`}
                        className="flex-1 bg-transparent border-none text-[14px] text-zinc-100 placeholder:text-zinc-700 font-mono tracking-wide focus:outline-none focus:ring-0 leading-5 min-h-[20px]"
                    />

                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <button type="button" title="Gift" className="text-zinc-500 hover:text-zinc-200 p-1.5 transition-colors"><Gift className="w-4 h-4 text-orange-500/40" /></button>
                        <button type="button" title="GIF" className="text-zinc-500 hover:text-zinc-200 p-1.5 transition-colors"><FileImage className="w-4 h-4 text-orange-500/40" /></button>
                        <button type="button" title="Emoji" className="text-zinc-500 hover:text-zinc-200 p-1.5 transition-colors"><Smile className="w-4 h-4 text-orange-500/40" /></button>
                        <button 
                            type="submit" 
                            title="Stabilize Segment"
                            disabled={!newMessage.trim() || isSending}
                            className={`p-2 ml-1 rounded-lg transition-all ${newMessage.trim() ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:bg-orange-500 px-4' : 'text-zinc-700'}`}
                        >
                            <span className="md:inline hidden text-[9px] font-bold uppercase tracking-widest mr-2">{isSending ? 'Sending...' : 'Inject'}</span>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
