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
            <div className="flex flex-col mt-0.5 hover:bg-[#2e3035] -mx-4 px-4 py-0.5 group relative">
                <div className="flex">
                    <div className="w-[50px] shrink-0 text-center select-none pt-0.5">
                        <span className="text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 font-mono">
                            {timeString}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0 pr-4 break-words text-[15px] leading-[1.375rem] text-[#dbdee1]">
                        {message.content}
                        {message.is_edited && (
                            <span className="text-[10px] text-[#949ba4] ml-1 select-none">(edited)</span>
                        )}
                    </div>
                </div>
                {canDelete && (
                    <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-[#313338] border border-[#2b2d31] shadow-sm rounded overflow-hidden z-10">
                        <button onClick={onDelete} title="Delete Message" className="p-1.5 text-[#b5bac1] hover:text-[#da373c] hover:bg-[#2b2d31] transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col mt-4 hover:bg-[#2e3035] -mx-4 px-4 py-1 group relative">
            <div className="flex items-start">
                <div className="w-[50px] shrink-0 pt-0.5 cursor-pointer">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-500 hover:shadow-lg transition-shadow">
                        <img 
                            src={message.author?.avatar_url || "https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png"} 
                            alt={message.author?.display_name || "User"} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="flex items-end gap-2 mb-1">
                        <span className="font-medium text-[15px] tracking-wide text-indigo-400 hover:underline cursor-pointer">
                            {message.author?.display_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-[#949ba4] hover:underline cursor-pointer" title={fullDateString}>
                            {timeString}
                        </span>
                    </h3>
                    <div className="break-words text-[15px] leading-[1.375rem] text-[#dbdee1]">
                        {message.content}
                        {message.is_edited && (
                            <span className="text-[10px] text-[#949ba4] ml-1 select-none">(edited)</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Hover Action Menu */}
            {canDelete && (
                <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-[#313338] border border-[#2b2d31] shadow-sm rounded overflow-hidden z-10">
                    <button onClick={onDelete} title="Delete Message" className="p-1.5 text-[#b5bac1] hover:text-[#da373c] hover:bg-[#2b2d31] transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
