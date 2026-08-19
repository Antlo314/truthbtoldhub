'use client';

/**
 * The small chip that shows Truth is speaking, and lets you silence him.
 *
 * A voice that plays with no visible source is startling, and a voice
 * you cannot turn off is a bug. So: a pill in the HUD that lights and
 * captions while a line plays, and a single tap to mute — remembered
 * across sessions, so nobody has to mute Truth twice.
 */
import { useEffect, useState } from 'react';
import { subscribe, setMuted, textOf, type VoiceState } from '@/lib/truthVoice';

export function TruthVoiceChip({ compact = false }: { compact?: boolean }) {
    const [state, setState] = useState<VoiceState>({ speaking: null, muted: true, unlocked: false, ready: false });
    useEffect(() => subscribe(setState), []);

    const speaking = !!state.speaking;
    const caption = state.speaking ? textOf(state.speaking) : '';

    return (
        <div className="pointer-events-auto flex flex-col items-end gap-1 max-w-[min(70vw,340px)]">
            <button
                type="button"
                onClick={() => setMuted(!state.muted)}
                aria-pressed={state.muted}
                aria-label={state.muted ? 'Unmute Truth' : 'Mute Truth'}
                title={state.muted ? 'Truth is muted — tap to hear him' : 'Tap to mute Truth'}
                className={[
                    'rounded-full border backdrop-blur-md px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] min-h-[32px] flex items-center gap-1.5 transition-colors',
                    state.muted
                        ? 'border-white/12 bg-black/55 text-white/45'
                        : speaking
                            ? 'border-amber-300/60 bg-amber-950/60 text-amber-100'
                            : 'border-white/15 bg-black/55 text-white/70',
                ].join(' ')}
            >
                <span
                    aria-hidden
                    className={[
                        'inline-block w-1.5 h-1.5 rounded-full',
                        state.muted ? 'bg-white/30' : speaking ? 'bg-amber-300 animate-pulse' : 'bg-emerald-400/70',
                    ].join(' ')}
                />
                {compact ? 'Truth' : state.muted ? 'Truth · muted' : speaking ? 'Truth' : 'Truth · voice'}
            </button>
            {speaking && !state.muted && caption && !compact && (
                <p className="rounded-xl border border-amber-300/25 bg-black/70 backdrop-blur-md px-3 py-1.5 text-[11px] leading-snug text-amber-50/90 text-right shadow-lg">
                    {caption.length > 140 ? caption.slice(0, 137).trimEnd() + '…' : caption}
                </p>
            )}
        </div>
    );
}
