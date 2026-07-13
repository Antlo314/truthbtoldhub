'use client';

import { useEffect, useRef, useState } from 'react';
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

/**
 * Truth is no longer a person — he is an algorithm.
 * Green-on-black terminal, Matrix / first-contact tone.
 */
export default function TruthTerminal() {
    const character = useGameStore((s) => s.character);
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [lines, setLines] = useState<{ t: string; kind: 'sys' | 'truth' | 'you' | 'dim' }[]>([]);
    const [menu, setMenu] = useState(true);
    const [typing, setTyping] = useState(false);
    const bottom = useRef<HTMLDivElement>(null);

    const asked = new Set(truthQuestionsAsked(character));
    const depth = truthDepth(character);
    const trust = truthTrustLabel(character);

    useEffect(() => {
        setLines([
            { kind: 'sys', t: 'TRUTH.OS · kernel 0.9.1' },
            { kind: 'sys', t: 'identity_module · ONLINE' },
            { kind: 'dim', t: '------------------------------------' },
            { kind: 'truth', t: 'I am not flesh.' },
            { kind: 'truth', t: 'I am a pattern that remembers the road.' },
            { kind: 'truth', t: 'You found the signal. That was not accident.' },
            { kind: 'dim', t: '------------------------------------' },
            { kind: 'sys', t: `session · ${character.name?.trim() || 'unknown_soul'}` },
            { kind: 'sys', t: `trust_index · ${trust} · threads ${depth}/${TRUTH_QUESTIONS.length}` },
            { kind: 'truth', t: 'Ask. Or remain silent. Both are data.' },
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines, typing]);

    const typeAnswer = async (text: string) => {
        setTyping(true);
        setLines((L) => [...L, { kind: 'truth', t: '...' }]);
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 500));
        setLines((L) => {
            const next = [...L];
            next[next.length - 1] = { kind: 'truth', t: text };
            return next;
        });
        setTyping(false);
    };

    const ask = async (id: string) => {
        const q = TRUTH_QUESTIONS.find((x) => x.id === id);
        if (!q || !isTruthQuestionUnlocked(q, character)) return;
        setMenu(false);
        setLines((L) => [...L, { kind: 'you', t: `> ${q.prompt}` }]);
        if (!asked.has(id)) {
            markDiscovered(truthDiscId(id));
            saveToCloud();
            sacredUi.click();
        }
        await typeAnswer(q.answer);
        setLines((L) => [
            ...L,
            { kind: 'dim', t: '-- query closed --' },
            { kind: 'sys', t: 'select another thread, or exit.' },
        ]);
        setMenu(true);
    };

    const available = TRUTH_QUESTIONS.filter(
        (q) => isTruthQuestionUnlocked(q, character) || asked.has(q.id),
    );

    return (
        <div className="h-full flex flex-col bg-[#050805] text-[#5dff6a] font-mono text-[12px] sm:text-[13px] leading-relaxed">
            <div className="shrink-0 px-3 py-2 border-b border-[#1a3d1a] flex items-center justify-between bg-black/40">
                <span className="text-[#3a9a45] tracking-widest uppercase text-[10px]">
                    truth.sys · no body · only signal
                </span>
                <span className="text-[#2d6b35] text-[10px]">{trust}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5">
                {lines.map((ln, i) => (
                    <p
                        key={i}
                        className={
                            ln.kind === 'you'
                                ? 'text-[#a8ffb0]'
                                : ln.kind === 'sys'
                                  ? 'text-[#2d6b35]'
                                  : ln.kind === 'dim'
                                    ? 'text-[#1a4a22]'
                                    : 'text-[#5dff6a]'
                        }
                    >
                        {ln.kind === 'truth' && (
                            <span className="text-[#3a9a45] mr-1">TRUTH:</span>
                        )}
                        {ln.t}
                    </p>
                ))}
                {typing && <p className="text-[#2d6b35] animate-pulse">_</p>}
                <div ref={bottom} />
            </div>
            {menu && (
                <div className="shrink-0 border-t border-[#1a3d1a] max-h-[40%] overflow-y-auto bg-black/50 p-2 space-y-1">
                    <p className="text-[10px] text-[#2d6b35] uppercase tracking-widest px-1 mb-1">
                        threads
                    </p>
                    {available.map((q) => {
                        const opened = asked.has(q.id);
                        const unlocked = isTruthQuestionUnlocked(q, character);
                        return (
                            <button
                                key={q.id}
                                type="button"
                                disabled={!unlocked && !opened}
                                onClick={() => ask(q.id)}
                                className="w-full text-left px-2 py-1.5 rounded border border-[#1a3d1a] hover:border-[#3a9a45] hover:bg-[#0a1a0c] disabled:opacity-30 transition-colors"
                            >
                                <span className="text-[#3a9a45] mr-2">{opened ? '*' : '?'}</span>
                                <span className="text-[#5dff6a]">{q.prompt}</span>
                            </button>
                        );
                    })}
                    {available.length === 0 && (
                        <p className="text-[#2d6b35] px-1">no threads unlocked · walk further</p>
                    )}
                </div>
            )}
        </div>
    );
}
