'use client';

import { useState, useMemo, useCallback } from 'react';
import type { MinigameDef } from '@/lib/game/minigames';

const SYMBOLS = ['🌿', '💧', '🌸', '✦', '🍃', '☀', '🌙', '⚡', '🔥', '📜'];

interface Props {
    game: MinigameDef;
    accent: string;
    onWin: () => void;
}

export default function MatchGame({ game, accent, onWin }: Props) {
    const pairs = game.config?.pairs ?? 6;
    const target = game.targetScore;

    const deck = useMemo(() => {
        const syms = SYMBOLS.slice(0, pairs);
        const cards = [...syms, ...syms].map((s, i) => ({ id: i, sym: s, matched: false }));
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    }, [pairs]);

    const [cards, setCards] = useState(deck);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [lock, setLock] = useState(false);

    const checkWin = useCallback((nextScore: number) => {
        if (nextScore >= target) setTimeout(onWin, 400);
    }, [target, onWin]);

    const tap = (idx: number) => {
        if (lock || flipped.includes(idx) || cards[idx].matched) return;
        const next = [...flipped, idx];
        setFlipped(next);
        if (next.length === 2) {
            setLock(true);
            const [a, b] = next;
            if (cards[a].sym === cards[b].sym) {
                setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
                setScore((s) => {
                    const ns = s + 1;
                    checkWin(ns);
                    return ns;
                });
                setFlipped([]);
                setLock(false);
            } else {
                setTimeout(() => { setFlipped([]); setLock(false); }, 650);
            }
        }
    };

    const cols = pairs <= 6 ? 4 : 4;

    return (
        <div>
            <div className="flex justify-between items-center mb-4 text-[10px] uppercase tracking-widest">
                <span style={{ color: accent }}>Pairs · {score} / {target}</span>
                <span className="text-zinc-500">Tap two cards</span>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {cards.map((c, i) => {
                    const show = c.matched || flipped.includes(i);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => tap(i)}
                            disabled={c.matched || lock}
                            className="aspect-square rounded-xl border text-2xl flex items-center justify-center transition-all active:scale-95"
                            style={{
                                borderColor: c.matched ? accent + '66' : 'rgba(255,255,255,0.12)',
                                background: show ? accent + '18' : 'rgba(0,0,0,0.35)',
                                opacity: c.matched ? 0.45 : 1,
                            }}
                        >
                            {show ? c.sym : '?'}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}