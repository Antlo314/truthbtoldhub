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
 * Truth — hooded brother in the house; OS surface for his threads.
 * Warm terminal voice: presence + signal, not a cold bot.
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
            { kind: 'sys', t: 'TRUTH.OS · identity_module' },
            { kind: 'dim', t: '------------------------------------' },
            { kind: 'truth', t: 'I am Truth.' },
            { kind: 'truth', t: 'Hood up. Feet on the floor of this house with you.' },
            { kind: 'truth', t: 'Not a ghost player. Not a leftover process.' },
            { kind: 'truth', t: 'Ask me what you came for — or walk the rooms and find me on the dais.' },
            { kind: 'dim', t: '------------------------------------' },
            { kind: 'sys', t: `soul · ${character.name?.trim() || 'unknown'}` },
            { kind: 'sys', t: `trust · ${trust} · threads ${depth}/${TRUTH_QUESTIONS.length}` },
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines, typing]);

    const typeAnswer = async (text: string) => {
        setTyping(true);
        setLines((L) => [...L, { kind: 'truth', t: '...' }]);
        await new Promise((r) => setTimeout(r, 320 + Math.random() * 380));
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
            { kind: 'dim', t: '-- thread closed --' },
            { kind: 'sys', t: 'another question, or return to the house.' },
        ]);
        setMenu(true);
    };

    const available = TRUTH_QUESTIONS.filter(
        (q) => isTruthQuestionUnlocked(q, character) || asked.has(q.id),
    );

    return (
        <div className="h-full flex flex-col bg-[#08060a] text-[#e8c48a] font-mono text-[12px] sm:text-[13px] leading-relaxed">
            <div className="shrink-0 px-3 py-2.5 border-b border-amber-900/40 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-black/60">
                <div>
                    <p className="text-amber-400/90 tracking-[0.2em] uppercase text-[10px] font-semibold">
                        Truth · hooded presence
                    </p>
                    <p className="text-[10px] text-amber-700/80 mt-0.5">Brother in the house · not a fake peer</p>
                </div>
                <span className="text-[10px] text-amber-600/90 px-2 py-1 rounded-full border border-amber-700/40">
                    {trust}
                </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5">
                {lines.map((ln, i) => (
                    <p
                        key={i}
                        className={
                            ln.kind === 'you'
                                ? 'text-cyan-300/90'
                                : ln.kind === 'sys'
                                  ? 'text-amber-700/80 text-[11px]'
                                  : ln.kind === 'dim'
                                    ? 'text-amber-900/50 text-[11px]'
                                    : 'text-amber-100/90'
                        }
                    >
                        {ln.t}
                    </p>
                ))}
                {typing && <p className="text-amber-600/70 animate-pulse">speaking…</p>}
                <div ref={bottom} />
            </div>
            {menu && (
                <div className="shrink-0 border-t border-amber-900/30 bg-black/50 max-h-[42%] overflow-y-auto">
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-amber-700/70">
                        Threads · {depth}/{TRUTH_QUESTIONS.length}
                    </p>
                    <div className="px-2 pb-2 space-y-1">
                        {available.map((q) => {
                            const opened = asked.has(q.id);
                            return (
                                <button
                                    key={q.id}
                                    type="button"
                                    disabled={typing}
                                    onClick={() => ask(q.id)}
                                    className={[
                                        'w-full text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors',
                                        opened
                                            ? 'border-amber-800/40 bg-amber-950/20 text-amber-200/70'
                                            : 'border-amber-600/30 bg-amber-500/5 text-amber-50 hover:bg-amber-500/10',
                                    ].join(' ')}
                                >
                                    {opened ? '· ' : '▸ '}
                                    {q.prompt}
                                </button>
                            );
                        })}
                        {available.length === 0 && (
                            <p className="px-2 py-3 text-amber-800 text-xs">No threads open yet. Walk with me.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
