'use client';

import { useState } from 'react';
import {
    TRUTH_QUESTIONS,
    truthDiscId,
    truthDepth,
    truthTrustLabel,
    isTruthQuestionUnlocked,
    truthQuestionsAsked,
} from '@/lib/game/truthLore';
import { useGameStore } from '@/lib/store/useGameStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function TruthPanel({ onClose }: { onClose: () => void }) {
    const character = useGameStore((s) => s.character);
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [activeId, setActiveId] = useState<string | null>(null);

    const asked = new Set(truthQuestionsAsked(character));
    const depth = truthDepth(character);
    const trust = truthTrustLabel(character);
    const active = activeId ? TRUTH_QUESTIONS.find((q) => q.id === activeId) : null;

    const openThread = (id: string) => {
        const q = TRUTH_QUESTIONS.find((x) => x.id === id);
        if (!q || !isTruthQuestionUnlocked(q, character)) return;
        if (!asked.has(id)) {
            markDiscovered(truthDiscId(id));
            saveToCloud();
            sacredUi.click();
        } else {
            sacredUi.hover();
        }
        setActiveId(id);
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <header className="shrink-0 px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-orange-400/80 font-bold">Ask Truth</p>
                <h2 className="font-ritual text-2xl text-white mt-1">The Brother Behind the Hood</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                        Threads {depth}/{TRUTH_QUESTIONS.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-400/25 text-orange-200/90">
                        {trust}
                    </span>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2">
                {active ? (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setActiveId(null)}
                            className="text-[11px] uppercase tracking-[0.25em] text-white/45 hover:text-aether-gold"
                        >
                            ← All threads
                        </button>
                        <p className="text-sm text-aether-gold/90 font-medium leading-snug">{active.prompt}</p>
                        <p className="text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">
                            {active.answer}
                        </p>
                    </div>
                ) : (
                    TRUTH_QUESTIONS.map((q) => {
                        const opened = asked.has(q.id);
                        const unlocked = isTruthQuestionUnlocked(q, character);
                        return (
                            <button
                                key={q.id}
                                type="button"
                                disabled={!unlocked && !opened}
                                onClick={() => openThread(q.id)}
                                className={[
                                    'w-full text-left rounded-xl px-3.5 py-3 border transition-colors',
                                    opened
                                        ? 'bg-aether-gold/10 border-aether-gold/30 text-white'
                                        : unlocked
                                            ? 'bg-white/[0.04] border-white/10 hover:border-orange-400/40 text-white/90'
                                            : 'bg-black/30 border-white/5 text-white/30 cursor-not-allowed',
                                ].join(' ')}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-orange-400/80 text-xs mt-0.5 shrink-0">
                                        {opened ? '●' : unlocked ? '?' : '◌'}
                                    </span>
                                    <span className="text-sm leading-snug">{q.prompt}</span>
                                </div>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/35 pl-5">
                                    {opened ? 'Opened' : unlocked ? 'Ask now' : 'Sealed'}
                                </p>
                            </button>
                        );
                    })
                )}
            </div>

            <footer className="shrink-0 p-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/15 text-sm uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-aether-gold/40"
                >
                    Close
                </button>
            </footer>
        </div>
    );
}
