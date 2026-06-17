'use client';

import { X, BookOpen } from 'lucide-react';
import { buildJournal, type JournalEntry } from '@/lib/game/journal';
import type { GameCharacter } from '@/lib/store/useGameStore';

const CAT_COLOR: Record<JournalEntry['category'], string> = {
    lore: '#22d3ee',
    quest: '#a855f7',
    relic: '#fbbf24',
    path: '#10b981',
    truth: '#f97316',
};

interface Props {
    character: GameCharacter;
    initiated: boolean;
    onClose: () => void;
}

export default function JournalPanel({ character, initiated, onClose }: Props) {
    const entries = buildJournal(character, initiated);

    return (
        <div className="absolute inset-0 z-35 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg max-h-[80dvh] overflow-hidden rounded-2xl border border-aether-gold/20 bg-black/90 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-aether-gold" />
                        <h2 className="font-ritual text-lg text-white">The Codex Journal</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {entries.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">Your journey has not yet been written.</p>
                    ) : entries.map((e) => (
                        <div key={e.id} className="rounded-xl border border-white/8 p-3 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: CAT_COLOR[e.category] }}>{e.category}</span>
                                <span className="font-ritual text-sm text-white">{e.title}</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{e.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}