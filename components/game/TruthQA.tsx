'use client';

import { useState } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { Lock, MessageCircle, Check } from 'lucide-react';
import {
    TRUTH_QUESTIONS,
    truthDiscId,
    truthQuestionsAsked,
    truthDepth,
    availableTruthQuestions,
    lockedTruthQuestions,
    truthQuestionById,
    truthDeflection,
    truthQAIntro,
    truthAccountForQuestion,
    truthTrustLabel,
} from '@/lib/game/truthLore';

interface Props {
    character: GameCharacter;
    onAsked?: () => void;
    onJournalUnlock?: (title: string) => void;
}

export default function TruthQA({ character, onAsked, onJournalUnlock }: Props) {
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const asked = new Set(truthQuestionsAsked(character));
    const available = availableTruthQuestions(character).filter((q) => !asked.has(q.id));
    const locked = lockedTruthQuestions(character);
    const depth = truthDepth(character);
    const total = TRUTH_QUESTIONS.length;

    const [activeId, setActiveId] = useState<string | null>(null);
    const [reply, setReply] = useState<string | null>(null);

    const ask = (id: string) => {
        const q = truthQuestionById(id);
        if (!q || asked.has(id)) return;
        const disc = truthDiscId(id);
        if (!character.discovered.includes(disc)) {
            markDiscovered(disc);
            saveToCloud();
            onAsked?.();
            const account = truthAccountForQuestion(id);
            if (account) onJournalUnlock?.(account.title);
        }
        setActiveId(id);
        setReply(q.answer);
    };

    const pokeLocked = (questionId?: string) => {
        setActiveId(null);
        setReply(truthDeflection(character, questionId));
    };

    const revisit = (id: string) => {
        const q = truthQuestionById(id);
        if (!q) return;
        setActiveId(id);
        setReply(q.answer);
    };

    const answeredList = TRUTH_QUESTIONS.filter((q) => asked.has(q.id));

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-orange-500/20 bg-orange-950/20 px-4 py-3">
                <p className="text-[10px] leading-relaxed text-white/75 italic">{truthQAIntro(character)}</p>
                <p className="mt-2 flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-orange-400/70">
                    <span>His trust · {truthTrustLabel(character)}</span>
                    <span className="text-zinc-500">{depth} / {total} threads</span>
                </p>
            </div>

            {reply && (
                <div className="rounded-2xl border border-orange-500/30 bg-black/50 px-4 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-400 mb-2">Truth</p>
                    <p className="font-ritual text-sm leading-relaxed text-white/90">{reply}</p>
                </div>
            )}

            {available.length > 0 && (
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Ask him</p>
                    <div className="space-y-2">
                        {available.map((q) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => ask(q.id)}
                                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                                    activeId === q.id
                                        ? 'border-orange-500/40 bg-orange-500/10'
                                        : 'border-white/10 bg-white/[0.03] hover:border-orange-500/25'
                                }`}
                            >
                                <span className="flex items-center gap-2 text-[11px] text-white/90">
                                    <MessageCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                    {q.prompt}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {locked.length > 0 && (
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Deeper threads (locked)</p>
                    <div className="space-y-1.5">
                        {locked.slice(0, 4).map((q) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => pokeLocked(q.id)}
                                className="w-full text-left rounded-xl border border-white/5 bg-white/[0.01] px-3 py-2 opacity-50 hover:opacity-70 transition-opacity"
                            >
                                <span className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Lock className="w-3 h-3 shrink-0" />
                                    {q.prompt}
                                </span>
                            </button>
                        ))}
                        <p className="text-[8px] text-zinc-600 text-center pt-1 leading-relaxed">
                            {locked.length > 4 && <>+{locked.length - 4} more sealed. </>}
                            His deepest wounds open only as you <span className="text-orange-400/60">walk with him</span> — gather relics, fell guardians, return.
                        </p>
                    </div>
                </div>
            )}

            {answeredList.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-orange-400/80 list-none">
                        ▸ Words already spoken ({answeredList.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                        {answeredList.map((q) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => revisit(q.id)}
                                className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white hover:bg-white/5"
                            >
                                <Check className="w-3 h-3 text-orange-500/60 shrink-0" />
                                {q.prompt}
                            </button>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}