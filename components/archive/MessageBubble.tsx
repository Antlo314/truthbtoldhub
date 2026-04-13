'use client';

import { ArchiveMessage } from '@/lib/store/useArchiveStore';
import { Trash2 } from 'lucide-react';

interface MessageBubbleProps {
    message: ArchiveMessage;
    isGrouped?: boolean;
    canDelete?: boolean;
    onDelete?: () => void;
}

export default function MessageBubble({ message, isGrouped = false, canDelete = false, onDelete }: MessageBubbleProps) {
    const timestamp = new Date(message.created_at);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDateString = timestamp.toLocaleDateString([], { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    if (isGrouped) {
        return (
            <div className="flex flex-col mt-0.5 hover:bg-white/5 -mx-4 px-4 py-0.5 group relative transition-colors">
                <div className="flex">
                    <div className="w-[50px] shrink-0 text-center select-none pt-0.5">
                        <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 font-mono tracking-tighter transition-opacity">
                            {timeString}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0 pr-4 break-words text-[14px] leading-relaxed text-zinc-300 font-mono tracking-tight">
                        {message.content}
                        {message.is_edited && (
                            <span className="text-[9px] text-zinc-600 ml-1 select-none font-mono italic">(edited)</span>
                        )}
                    </div>
                </div>
                {canDelete && (
                    <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-zinc-900 border border-white/10 shadow-2xl rounded-lg overflow-hidden z-10">
                        <button onClick={onDelete} title="Purge Record" className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col mt-5 hover:bg-white/5 -mx-4 px-4 py-1.5 group relative transition-colors">
            <div className="flex items-start">
                <div className="w-[50px] shrink-0 pt-0.5 cursor-pointer">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shadow-inner group-hover:border-orange-500/30 transition-all">
                        <img 
                            src={message.author?.avatar_url || "https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png"} 
                            alt={message.author?.display_name || "Initiate"} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[13px] tracking-widest text-orange-500 hover:text-orange-400 font-mono uppercase cursor-pointer transition-colors">
                            {message.author?.display_name || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono tracking-tighter opacity-70" title={fullDateString}>
                            {timeString}
                        </span>
                    </h3>
                    <div className="break-words text-[14px] leading-relaxed text-zinc-300 font-mono tracking-tight">
                        {message.content}
                        {message.is_edited && (
                            <span className="text-[9px] text-zinc-600 ml-1 select-none font-mono italic">(edited)</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Hover Action Menu */}
            {canDelete && (
                <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-zinc-900 border border-white/10 shadow-2xl rounded-lg overflow-hidden z-10">
                    <button onClick={onDelete} title="Purge Record" className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
