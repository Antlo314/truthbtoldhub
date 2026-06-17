'use client';

import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { puzzleHintFor } from '@/lib/game/pathPowers';
import { hasAbility } from '@/lib/game/abilities';

interface Props {
    character: GameCharacter;
    puzzleId?: string;
    baseHint?: string;
    accent?: string;
    isSolved: boolean;
}

function insightLabel(character: GameCharacter): string {
    if (hasAbility(character, 'abl_scr_seal')) return 'Open Seal';
    if (hasAbility(character, 'abl_scr_cipher')) return 'Cipher Sense';
    return 'Scribe insight';
}

export default function MiniWorldInsight({ character, puzzleId, baseHint, accent = '#fbbf24', isSolved }: Props) {
    const [revealed, setRevealed] = useState(false);
    const label = insightLabel(character);

    const insight = useMemo(() => {
        if (isSolved || !puzzleId || !baseHint) return null;
        return puzzleHintFor(character, puzzleId, baseHint);
    }, [character, puzzleId, baseHint, isSolved]);

    if (isSolved || !puzzleId) return null;

    return (
        <div className="w-full max-w-[480px] mt-2 flex flex-col items-center gap-2">
            {revealed && insight && (
                <div
                    className="w-full px-4 py-3 rounded-xl border text-center text-[11px] font-mono leading-relaxed"
                    style={{ borderColor: accent + '44', background: accent + '12', color: accent }}
                >
                    <span className="block text-[8px] uppercase tracking-[0.35em] mb-1 opacity-80">{label}</span>
                    {insight}
                </div>
            )}
            <button
                type="button"
                onClick={() => insight && setRevealed(true)}
                disabled={!insight}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-opacity disabled:opacity-35 pointer-events-auto"
                style={{
                    background: insight ? accent + '22' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${accent}44`,
                    color: insight ? accent : '#71717a',
                }}
            >
                <Eye className="w-3.5 h-3.5" />
                {insight ? (revealed ? 'Insight shown' : 'Reveal insight') : 'Insight locked'}
            </button>
            {!insight && (
                <p className="text-[9px] text-zinc-500 text-center">Cipher Sense, Open Seal, or a matching scroll can illuminate this riddle.</p>
            )}
        </div>
    );
}