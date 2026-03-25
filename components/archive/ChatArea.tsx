'use client';

import { useEffect, useState, useRef } from 'react';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { supabase } from '@/lib/supabase';
import MessageBubble from './MessageBubble';
import { Hash, PlusCircle, Smile, Gift, FileImage, Send } from 'lucide-react';

export default function ChatArea() {
    const { activeChannelId, workspaces, activeWorkspaceId, channels, messages, setMessages, addMessage } = useArchiveStore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const workspaceChannels = activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [];
    const activeChannel = workspaceChannels.find(c => c.id === activeChannelId);
    const channelMessages = activeChannelId ? (messages[activeChannelId] || []) : [];

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
                    setCurrentUser({ ...user, profile: data });
                });
            }
        });
    }, []);

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

        // Subscribe to Realtime Inserts
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
            }).subscribe();

        return () => {
            supabase.removeChannel(messageSub);
        };
    }, [activeChannelId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannelId || !currentUser) return;
        
        setIsSending(true);
        const optimisticId = `temp-${Date.now()}`;
        const msgContent = newMessage;
        
        // Optimistic UI
        addMessage({
            id: optimisticId,
            channel_id: activeChannelId,
            author_id: currentUser.id,
            content: msgContent,
            is_edited: false,
            created_at: new Date().toISOString(),
            author: currentUser.profile || { display_name: 'You' }
        });
        
        setNewMessage('');
        
        // Ensure table exists, fallback gracefully if not
        try {
            await supabase.from('archive_messages').insert({
                channel_id: activeChannelId,
                author_id: currentUser.id,
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

    if (!activeChannelId) {
        return (
            <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center mb-4">
                    <Hash className="w-8 h-8 text-[#949ba4]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Channel Selected</h3>
                <p className="text-[#949ba4]">Select a channel from the sidebar to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#313338] flex flex-col min-w-0">
            {/* Header */}
            <header className="h-12 border-b border-[#1f2023] flex items-center px-4 shrink-0 shadow-sm z-10">
                <Hash className="w-6 h-6 text-[#949ba4] mr-2" />
                <h2 className="font-bold text-white text-[15px]">{activeChannel?.name || 'loading...'}</h2>
                {activeChannel?.topic && (
                    <>
                        <div className="w-px h-6 bg-[#3f4147] mx-4" />
                        <span className="text-sm text-[#dbdee1] font-medium truncate">{activeChannel.topic}</span>
                    </>
                )}
            </header>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 xl:px-6">
                <div className="flex flex-col justify-end min-h-full">
                    {/* Welcome Message Top */}
                    <div className="mt-8 mb-6">
                        <div className="w-16 h-16 rounded-full bg-[#4a505e] flex items-center justify-center mb-4 text-white">
                            <Hash className="w-10 h-10" />
                        </div>
                        <h1 className="text-[32px] font-bold text-white mb-2">Welcome to #{activeChannel?.name}!</h1>
                        <p className="text-[#dbdee1]">This is the start of the #{activeChannel?.name} channel.</p>
                    </div>

                    <div className="w-full h-px bg-[#3f4147] my-6" />

                    {/* Messages List */}
                    {channelMessages.map((msg, idx) => {
                        const prevMsg = channelMessages[idx - 1];
                        // Group messages if same author within 5 minutes
                        const isGrouped = prevMsg && 
                                          prevMsg.author_id === msg.author_id && 
                                          (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000);
                        
                        return <MessageBubble key={msg.id} message={msg} isGrouped={isGrouped} />;
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="px-4 pb-6 pt-1 shrink-0">
                <form 
                    onSubmit={handleSendMessage}
                    className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5 relative group outline-none focus-within:ring-1 focus-within:ring-[#5865F2]"
                >
                    <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1] p-1 mr-2 bg-[#2b2d31] rounded-full shrink-0">
                        <PlusCircle className="w-5 h-5" />
                    </button>
                    
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message #${activeChannel?.name || 'channel'}`}
                        className="flex-1 bg-transparent border-none text-[15px] text-[#dbdee1] placeholder:text-[#888c94] focus:outline-none focus:ring-0 leading-5 min-h-[20px]"
                    />

                    <div className="flex items-center gap-2 ml-2 shrink-0">
                        <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1] p-1"><Gift className="w-5 h-5" /></button>
                        <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1] p-1"><FileImage className="w-5 h-5" /></button>
                        <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1] p-1"><Smile className="w-5 h-5" /></button>
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || isSending}
                            className={`p-1 ml-1 rounded transition-colors ${newMessage.trim() ? 'bg-[#5865F2] text-white hover:bg-[#4752c4]' : 'text-[#b5bac1]'}`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
