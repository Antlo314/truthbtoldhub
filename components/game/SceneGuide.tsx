'use client';

import KenneySprite, { ROGUELIKE_CHAR, TRUTH_TILE } from '@/components/game/KenneySprite';

// ============================================================
//  SCENE GUIDE — Truth (or any guide) present in a scene, speaking
//  through the game's dialogue box. Reused across the creator and
//  path-selection scenes so they read as the 2D game, not web forms.
// ============================================================

export function SceneGuide({
    line,
    speaker = 'Truth',
    accent = '#fbbf24',
    tile = TRUTH_TILE,
}: {
    line: string;
    speaker?: string;
    accent?: string;
    tile?: { col: number; row: number };
}) {
    return (
        <div className="flex items-start gap-3 sm:gap-4 max-w-xl mx-auto">
            <div className="relative shrink-0 truth-float">
                <div
                    className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
                    style={{
                        width: 120,
                        height: 120,
                        transform: 'translate(-50%,-50%)',
                        background: `radial-gradient(circle, ${accent}2e 0%, ${accent}0d 45%, transparent 68%)`,
                        filter: 'blur(3px)',
                    }}
                />
                <KenneySprite
                    {...ROGUELIKE_CHAR}
                    col={tile.col}
                    row={tile.row}
                    scale={5}
                    style={{ position: 'relative', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))' }}
                />
            </div>
            <div className="flex-1 glass-panel rounded-2xl p-4 md:p-5 border" style={{ borderColor: `${accent}24` }}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: accent }}>{speaker}</span>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${accent}66, transparent)` }} />
                </div>
                <p className="font-ritual text-base md:text-lg leading-relaxed text-white/90">{line}</p>
            </div>
        </div>
    );
}
