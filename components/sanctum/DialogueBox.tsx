'use client';

import TruthSprite from '@/components/game/TruthSprite';
import VeilPanel from '@/components/sanctum/VeilPanel';
import Typewriter from '@/components/sanctum/Typewriter';
import { cn } from '@/lib/design/cn';
import type { ReactNode } from 'react';

interface DialogueBoxProps {
    speaker?: string;
    accent?: string;
    /** Static line — no typewriter */
    line?: string;
    /** Typewriter mode */
    typewriter?: {
        text: string;
        reveal?: boolean;
        onDone?: () => void;
        speed?: number;
    };
    children?: ReactNode;
    onClick?: () => void;
    className?: string;
    spriteScale?: number;
    /** Hint under the line */
    hint?: string;
}

/**
 * Truth's dialogue vessel — one component for awakening, guides, re-entry.
 */
export default function DialogueBox({
    speaker = 'Truth',
    accent = '#fbbf24',
    line,
    typewriter,
    children,
    onClick,
    className,
    spriteScale = 3,
    hint,
}: DialogueBoxProps) {
    return (
        <VeilPanel
            accent={`${accent}30`}
            density="medium"
            onClick={onClick}
            className={cn('p-5 md:p-7 w-full max-w-2xl mx-auto', onClick && 'cursor-pointer', className)}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative shrink-0 truth-float" style={{ width: spriteScale * 16, height: spriteScale * 24 }}>
                    <div
                        className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
                        style={{
                            width: 56,
                            height: 56,
                            transform: 'translate(-50%,-45%)',
                            background: `radial-gradient(circle, ${accent}40 0%, transparent 68%)`,
                        }}
                    />
                    <TruthSprite scale={spriteScale} style={{ position: 'relative', margin: '0 auto', display: 'block' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: accent }}>
                            {speaker}
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: `linear-gradient(to right, ${accent}66, transparent)` }}
                        />
                    </div>
                    <p className="font-ritual text-lg md:text-2xl leading-relaxed text-white/90 min-h-[2.8em]">
                        {typewriter ? (
                            <Typewriter
                                text={typewriter.text}
                                reveal={typewriter.reveal}
                                onDone={typewriter.onDone}
                                speed={typewriter.speed}
                            />
                        ) : (
                            line
                        )}
                    </p>
                    {hint && (
                        <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/30 animate-pulse">
                            {hint}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </VeilPanel>
    );
}
