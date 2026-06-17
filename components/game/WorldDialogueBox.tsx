'use client';

import { X } from 'lucide-react';
import { useInputProfile, useIsDesktopLayout } from '@/components/game/controls/useInputProfile';
import { WORLD_SPEECH_BOTTOM_DESKTOP, WORLD_SPEECH_BOTTOM_MOBILE } from '@/lib/game/controls';

interface Props {
    speaker: string;
    text: string;
    color?: string;
    onClose: () => void;
    /** Mobile: controls hidden while speech is open — dialogue sits lower */
    controlsHidden?: boolean;
}

export default function WorldDialogueBox({ speaker, text, color = '#fbbf24', onClose, controlsHidden = false }: Props) {
    const profile = useInputProfile();
    const isDesktop = useIsDesktopLayout();
    const accent = color;
    const dialogueKey = `${speaker}::${text.slice(0, 48)}`;

    let bottom: string;
    if (isDesktop) {
        bottom = WORLD_SPEECH_BOTTOM_DESKTOP;
    } else if (controlsHidden) {
        bottom = 'calc(0.75rem + env(safe-area-inset-bottom))';
    } else {
        bottom = profile === 'keyboard' ? WORLD_SPEECH_BOTTOM_DESKTOP : WORLD_SPEECH_BOTTOM_MOBILE;
    }

    const speakerLen = speaker.length;
    const speakerTracking = speakerLen > 28 ? '0.12em' : speakerLen > 18 ? '0.18em' : '0.28em';
    const speakerSize = speakerLen > 32 ? '8px' : speakerLen > 22 ? '9px' : isDesktop ? '10px' : '9px';

    return (
        <>
            {!isDesktop && (
                <div
                    className="absolute inset-0 z-[19] pointer-events-none eden-animate-in"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 50%, transparent 78%)' }}
                />
            )}

            <div
                key={dialogueKey}
                className="eden-dialogue-in absolute z-20 pointer-events-none px-3 sm:px-4
                    inset-x-0 flex justify-center
                    lg:inset-x-auto lg:left-6 xl:left-8 lg:justify-start lg:max-w-[min(28rem,40vw)]"
                style={{ bottom }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="pointer-events-auto w-full lg:w-full glass-panel rounded-2xl border p-3.5 sm:p-5 text-left cursor-pointer relative overflow-hidden
                        shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md
                        max-h-[min(38dvh,280px)] sm:max-h-[min(42dvh,320px)] lg:max-h-[min(44dvh,340px)]
                        overflow-y-auto custom-scrollbar"
                    style={{ borderColor: `${accent}40` }}
                >
                    <div
                        className="absolute inset-x-0 top-0 h-px eden-shimmer-border opacity-60 pointer-events-none"
                        aria-hidden
                    />

                    <div className="flex items-start gap-2 mb-2">
                        <span
                            className="flex-1 min-w-0 font-black uppercase leading-snug break-words hyphens-auto"
                            style={{ color: accent, fontSize: speakerSize, letterSpacing: speakerTracking }}
                        >
                            {speaker}
                        </span>
                        <span
                            className="shrink-0 p-1 rounded-full border border-white/10 bg-white/5 text-white/40 mt-0.5"
                            aria-hidden
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <p className="font-ritual text-sm sm:text-base lg:text-[15px] text-white/90 leading-relaxed break-words text-pretty">
                        {text}
                    </p>
                    <p className="text-[8px] uppercase tracking-[0.28em] text-white/30 mt-3">
                        {isDesktop ? 'click to close' : 'tap to close'}
                    </p>
                </button>
            </div>
        </>
    );
}