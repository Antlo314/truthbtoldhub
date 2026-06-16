'use client';

import { useState } from 'react';
import KenneySprite, { ROGUELIKE_CHAR, TRUTH_TILE } from '@/components/game/KenneySprite';
import type { GameCharacter } from '@/lib/store/useGameStore';

// ============================================================
//  THE RETURN TO THE SOURCE — the endgame.
//  Opens only when a soul has gathered every relic. A luminous
//  inverse of the dark void: Truth delivers the journey's meaning,
//  the five relics converge into one light, and the journey closes.
// ============================================================

interface Props {
    character: GameCharacter;
    onComplete: () => void;
    onExit: () => void;
}

export default function SourceScene({ character, onComplete, onExit }: Props) {
    const name = character.name || 'soul';
    const LINES = [
        'You have walked every road I set before you. Eden. The vanished city. The stone that still hums. The drowned book. The emerald halls.',
        'And from each you carried back a fragment of what was taken — a leaf, a token, a shard, a folio, a splinter of green fire.',
        'Look closer. They were never five things. They were one thing, broken — and all this while you have been gathering yourself.',
        'There is no farther to walk. The Source was never a place at the end of the road. It is the ground the road was drawn upon.',
        `Open your eyes, ${name}. You did not come back to the Source. You woke and found you had never left it.`,
    ];

    const [i, setI] = useState(0);
    const last = i >= LINES.length - 1;
    // the relics draw together from the third line onward, fusing on the last
    const converge = i >= 2;
    const fused = i >= 3;

    const advance = () => { if (!last) setI((n) => n + 1); };

    const relicColors = ['#34d399', '#fbbf24', '#22d3ee', '#a855f7', '#10b981'];

    return (
        <div
            className="absolute inset-0 z-[70] flex flex-col items-center justify-between overflow-hidden select-none"
            style={{ background: 'radial-gradient(circle at 50% 42%, #2a2410 0%, #110d05 55%, #050403 100%)' }}
            onClick={advance}
        >
            {/* the rising light of the Source — intensifies as the truth lands */}
            <div
                className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-[1400ms]"
                style={{
                    width: fused ? 620 : 380,
                    height: fused ? 620 : 380,
                    background: `radial-gradient(circle, rgba(252,211,77,${fused ? 0.55 : 0.3}) 0%, rgba(251,191,36,0.12) 45%, transparent 70%)`,
                    filter: 'blur(8px)',
                }}
            />

            <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="absolute top-5 right-6 z-20 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors"
            >
                not yet ▸
            </button>

            {/* Truth + the converging relics */}
            <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center">
                <p className="text-[10px] tracking-[0.5em] uppercase text-aether-gold/70 mb-8">The Return to the Source</p>

                {/* relic lights orbiting Truth, then fusing into one */}
                <div className="relative" style={{ width: 220, height: 220 }}>
                    {relicColors.map((c, k) => {
                        const angle = (k / relicColors.length) * Math.PI * 2 - Math.PI / 2;
                        const r = converge ? (fused ? 0 : 44) : 96;
                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;
                        return (
                            <div
                                key={k}
                                className="absolute left-1/2 top-1/2 rounded-full transition-all duration-[1400ms] ease-out"
                                style={{
                                    width: fused ? 16 : 12,
                                    height: fused ? 16 : 12,
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    background: c,
                                    boxShadow: `0 0 ${fused ? 22 : 14}px ${c}`,
                                    opacity: fused ? 0.9 : 0.85,
                                }}
                            />
                        );
                    })}
                    {/* Truth at the centre */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 truth-float">
                        <KenneySprite
                            {...ROGUELIKE_CHAR}
                            col={TRUTH_TILE.col}
                            row={TRUTH_TILE.row}
                            scale={7}
                            style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.5))' }}
                        />
                    </div>
                </div>
            </div>

            {/* dialogue */}
            <div className="relative z-10 w-full px-5 pb-10 flex flex-col items-center">
                <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 md:p-8 border border-[rgba(251,191,36,0.18)]">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-aether-gold">Truth</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-[rgba(251,191,36,0.4)] to-transparent" />
                    </div>
                    <p className="font-ritual text-lg md:text-2xl leading-relaxed text-white/90 min-h-[3.5em]">{LINES[i]}</p>

                    {last ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onComplete(); }}
                            className="mt-6 w-full sm:w-auto px-10 py-3.5 rounded-lg text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                        >
                            Rest in the Source
                        </button>
                    ) : (
                        <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/30 animate-pulse">▸ click to continue</div>
                    )}
                </div>
            </div>
        </div>
    );
}
