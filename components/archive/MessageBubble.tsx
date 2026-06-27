'use client';

import { useState } from 'react';
import { ArchiveMessage, ArchiveReaction } from '@/lib/store/useArchiveStore';
import { QUICK_EMOJI, groupReactions, tierColor, DEFAULT_AVATAR, relativeTime } from '@/lib/archive/access';
import { Trash2, Pencil, Reply, Pin, PinOff, SmilePlus, Check, X, CornerDownRight } from 'lucide-react';

interface MessageBubbleProps {
    message: ArchiveMessage;
    isGrouped?: boolean;
    reactions?: ArchiveReaction[];
    myId?: string;
    canModerate?: boolean;   // delete any (Architect or Moderator)
    canPin?: boolean;        // staff (Architects + Moderators) pin power
    onDelete?: () => void;
    onSaveEdit?: (content: string) => void;
    onReact?: (emoji: string) => void;
    onUnreact?: (emoji: string) => void;
    onReply?: () => void;
    onPinToggle?: () => void;
    onOpenProfile?: (userId: string) => void;
}

export default function MessageBubble({
    message, isGrouped = false, reactions = [], myId,
    canModerate = false, canPin = false,
    onDelete, onSaveEdit, onReact, onUnreact, onReply, onPinToggle, onOpenProfile,
}: MessageBubbleProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(message.content);
    const [showEmoji, setShowEmoji] = useState(false);

    const isMine = myId && message.author_id === myId;
    const grouped = groupReactions(reactions, myId);
    const timestamp = new Date(message.created_at);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDate = timestamp.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const nameColor = tierColor(message.author?.tier);

    const toggleEmoji = (emoji: string, mine: boolean) => {
        if (mine) onUnreact?.(emoji); else onReact?.(emoji);
    };

    const saveEdit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== message.content) onSaveEdit?.(trimmed);
        setEditing(false);
    };

    // Hover action bar (shared by grouped + full layouts)
    const ActionBar = (
        <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-aether-surface border border-white/10 shadow-2xl rounded-lg overflow-visible z-20">
            <div className="relative">
                <button onClick={() => setShowEmoji((v) => !v)} title="React" className="p-1.5 text-zinc-400 hover:text-aether-gold hover:bg-white/5 transition-colors">
                    <SmilePlus className="w-4 h-4" />
                </button>
                {showEmoji && (
                    <div className="absolute bottom-full right-0 mb-1 flex items-center gap-0.5 bg-aether-surface border border-white/10 rounded-xl p-1.5 shadow-2xl z-30">
                        {QUICK_EMOJI.map((e) => (
                            <button
                                key={e}
                                onClick={() => { onReact?.(e); setShowEmoji(false); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-base transition-colors"
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {onReply && (
                <button onClick={onReply} title="Reply" className="p-1.5 text-zinc-400 hover:text-aether-gold hover:bg-white/5 transition-colors">
                    <Reply className="w-4 h-4" />
                </button>
            )}
            {isMine && (
                <button onClick={() => { setDraft(message.content); setEditing(true); }} title="Edit" className="p-1.5 text-zinc-400 hover:text-aether-gold hover:bg-white/5 transition-colors">
                    <Pencil className="w-4 h-4" />
                </button>
            )}
            {canPin && (
                <button onClick={onPinToggle} title={message.pinned ? 'Unpin' : 'Pin'} className="p-1.5 text-zinc-400 hover:text-aether-gold hover:bg-white/5 transition-colors">
                    {message.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
            )}
            {(isMine || canModerate) && (
                <button onClick={onDelete} title="Purge" className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    const ReactionRow = grouped.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {grouped.map((g) => (
                <button
                    key={g.emoji}
                    onClick={() => toggleEmoji(g.emoji, g.mine)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-colors ${g.mine ? 'bg-aether-gold/15 border-aether-gold/40 text-aether-gold' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/25'}`}
                >
                    <span>{g.emoji}</span>
                    <span className="font-mono text-[10px]">{g.count}</span>
                </button>
            ))}
            <button onClick={() => onReact && setShowEmoji(true)} className="hidden" aria-hidden />
        </div>
    );

    const ReplyPreview = message.reply_to && (
        <div className="flex items-center gap-1.5 mb-1 ml-[2px] text-[10px] text-zinc-500 font-mono">
            <CornerDownRight className="w-3 h-3 shrink-0" />
            <span className="text-aether-gold/70 font-bold">{message.reply_to.author_name || 'soul'}</span>
            <span className="truncate max-w-[280px] opacity-80">{message.reply_to.content}</span>
        </div>
    );

    const Body = editing ? (
        <div className="pr-4">
            <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                    if (e.key === 'Escape') setEditing(false);
                }}
                rows={Math.min(6, draft.split('\n').length)}
                autoFocus
                className="w-full bg-black/40 border border-aether-gold/30 rounded-lg px-3 py-2 text-[14px] text-zinc-100 font-mono focus:outline-none focus:border-aether-gold/60 resize-none"
            />
            <div className="flex items-center gap-2 mt-1.5">
                <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1 rounded bg-aether-gold text-black text-[9px] font-black uppercase tracking-widest">
                    <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-zinc-400 text-[9px] font-black uppercase tracking-widest hover:text-white">
                    <X className="w-3 h-3" /> Cancel
                </button>
            </div>
        </div>
    ) : (
        <div className="break-words text-[14px] leading-relaxed text-zinc-200 font-mono tracking-tight whitespace-pre-wrap pr-4">
            {message.content}
            {message.is_edited && <span className="text-[9px] text-zinc-600 ml-1 select-none font-mono italic">(edited)</span>}
        </div>
    );

    const pinnedRing = message.pinned ? 'bg-aether-gold/[0.04] border-l-2 border-aether-gold/40' : '';

    if (isGrouped) {
        return (
            <div className={`flex flex-col mt-0.5 hover:bg-white/[0.03] -mx-4 px-4 py-0.5 group relative transition-colors ${pinnedRing}`}>
                {ReplyPreview}
                <div className="flex">
                    <div className="w-[50px] shrink-0 text-center select-none pt-0.5">
                        <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 font-mono tracking-tighter transition-opacity" title={fullDate}>
                            {timeString}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        {Body}
                        {ReactionRow}
                    </div>
                </div>
                {ActionBar}
            </div>
        );
    }

    return (
        <div className={`flex flex-col mt-5 hover:bg-white/[0.03] -mx-4 px-4 py-1.5 group relative transition-colors ${pinnedRing}`}>
            {message.pinned && (
                <div className="flex items-center gap-1 ml-[50px] mb-0.5 text-[8px] font-mono uppercase tracking-widest text-aether-gold/70">
                    <Pin className="w-2.5 h-2.5" /> Pinned by an Architect
                </div>
            )}
            {ReplyPreview}
            <div className="flex items-start">
                <button
                    onClick={() => message.author_id && onOpenProfile?.(message.author_id)}
                    className="w-[50px] shrink-0 pt-0.5"
                >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shadow-inner group-hover:border-aether-gold/30 transition-all">
                        <img
                            src={message.author?.avatar_url || DEFAULT_AVATAR}
                            alt={message.author?.display_name || 'Soul'}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className="flex items-center gap-2 mb-1">
                        <button
                            onClick={() => message.author_id && onOpenProfile?.(message.author_id)}
                            className={`font-bold text-[13px] tracking-wide ${nameColor} hover:underline font-mono uppercase`}
                        >
                            {message.author?.display_name || 'Anonymous'}
                        </button>
                        <span className="text-[9px] text-zinc-600 font-mono tracking-tighter opacity-70" title={fullDate}>{relativeTime(message.created_at)}</span>
                    </h3>
                    {Body}
                    {ReactionRow}
                </div>
            </div>
            {ActionBar}
        </div>
    );
}
