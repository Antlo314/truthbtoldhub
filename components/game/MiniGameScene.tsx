'use client';

import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { MinigameDef } from '@/lib/game/minigames';
import MatchGame from '@/components/game/minigames/MatchGame';
import SnakeGame from '@/components/game/minigames/SnakeGame';
import StackGame from '@/components/game/minigames/StackGame';

interface Props {
    game: MinigameDef;
    accent?: string;
    onWin: () => void;
    onExit: () => void;
}

export default function MiniGameScene({ game, accent = '#fbbf24', onWin, onExit }: Props) {
    const [won, setWon] = useState(false);

    const handleWin = () => setWon(true);

    return (
        <div className="absolute inset-0 z-[65] overflow-y-auto custom-scrollbar" style={{ background: `radial-gradient(circle at 50% -5%, ${accent}22, transparent 55%), #05060a` }}>
            <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
                <button onClick={onExit} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white mb-5">
                    <ArrowLeft className="w-4 h-4" /> Leave trial
                </button>
                <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: accent }}>
                    Trial · Tier {game.tier}
                </p>
                <h1 className="font-ritual text-2xl md:text-3xl font-black text-white mb-3">{game.title}</h1>
                <p className="text-sm text-zinc-300 leading-relaxed mb-6">{game.prompt}</p>

                {won ? (
                    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: accent + '55', background: accent + '12' }}>
                        <Check className="w-8 h-8 mx-auto mb-3" style={{ color: accent }} />
                        <p className="font-ritual italic text-white/90 leading-relaxed mb-5">{game.winText}</p>
                        <button
                            onClick={onWin}
                            className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black"
                            style={{ background: accent }}
                        >
                            Continue →
                        </button>
                    </div>
                ) : game.kind === 'match' ? (
                    <MatchGame game={game} accent={accent} onWin={handleWin} />
                ) : game.kind === 'snake' ? (
                    <SnakeGame game={game} accent={accent} onWin={handleWin} />
                ) : (
                    <StackGame game={game} accent={accent} onWin={handleWin} />
                )}
            </div>
        </div>
    );
}